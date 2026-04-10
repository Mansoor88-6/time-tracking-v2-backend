import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { RuleCollection } from './entities/rule-collection.entity';
import { RuleCollectionTeam } from './entities/rule-collection-team.entity';
import { TeamProductivityRule, AppType, AppCategory, RuleType } from '../productivity-rules/entities/team-productivity-rule.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddRulesToCollectionDto, RuleDto } from './dto/add-rules-to-collection.dto';
import { AssignCollectionToTeamsDto } from './dto/assign-collection-to-teams.dto';
import { TeamsService } from '../teams/teams.service';

export interface SuggestedApp {
  appName: string;
  appType: AppType;
  suggestedCategory: AppCategory;
}

@Injectable()
export class RuleCollectionsService {
  constructor(
    @InjectRepository(RuleCollection)
    private readonly collectionsRepository: Repository<RuleCollection>,
    @InjectRepository(RuleCollectionTeam)
    private readonly collectionTeamsRepository: Repository<RuleCollectionTeam>,
    @InjectRepository(TeamProductivityRule)
    private readonly rulesRepository: Repository<TeamProductivityRule>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * One team may only appear in one rule collection. Throws if any team is already assigned elsewhere.
   */
  private async assertTeamsExclusiveForNewCollection(
    teamIds: number[],
  ): Promise<void> {
    for (const teamId of teamIds) {
      const rows = await this.collectionTeamsRepository.find({
        where: { teamId },
        relations: ['collection'],
      });
      if (rows.length > 0) {
        const row = rows[0];
        const name = row.collection?.name ?? row.collectionId;
        throw new BadRequestException(
          `Team is already assigned to rule collection "${name}" (id ${row.collectionId}). Each team may only belong to one rule collection.`,
        );
      }
    }
  }

  /**
   * When assigning teams to an existing collection, each team must not belong to another collection.
   */
  private async assertTeamsExclusiveForCollection(
    teamIds: number[],
    collectionId: number,
  ): Promise<void> {
    for (const teamId of teamIds) {
      const rows = await this.collectionTeamsRepository.find({
        where: { teamId },
        relations: ['collection'],
      });
      for (const row of rows) {
        if (row.collectionId !== collectionId) {
          const name = row.collection?.name ?? row.collectionId;
          throw new BadRequestException(
            `Team is already assigned to rule collection "${name}" (id ${row.collectionId}). Each team may only belong to one rule collection.`,
          );
        }
      }
    }
  }

  /**
   * Remove rows that would block insert for this collection: same team+app+type within this
   * collection, legacy rows (collectionId null), but not rules owned by another collection
   * (impossible when one team ↔ one collection holds).
   */
  private async deleteRuleSlotForTeamAndCollection(
    teamId: number,
    appName: string,
    appType: AppType,
    collectionId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(TeamProductivityRule)
      : this.rulesRepository;
    await repo
      .createQueryBuilder()
      .delete()
      .from(TeamProductivityRule)
      .where('teamId = :teamId', { teamId })
      .andWhere('appName = :appName', { appName })
      .andWhere('appType = :appType', { appType })
      .andWhere('(collectionId = :cid OR collectionId IS NULL)', { cid: collectionId })
      .execute();
  }

  /**
   * Normalize a rule the same way as persistence (domain extraction, etc.).
   * Used for deduping and for scoped deletes before insert.
   */
  private resolveRuleFields(rule: RuleDto): {
    finalAppName: string;
    appType: AppType;
    category: AppCategory;
    ruleType: RuleType;
    pattern: string | undefined;
    isDomainRule: boolean;
  } {
    const normalizedAppName = rule.appName.toLowerCase().trim();
    const ruleType =
      rule.ruleType ??
      this.determineRuleType(rule.appName, rule.appType, rule.pattern);
    const pattern = rule.pattern ?? undefined;
    const isDomainRule = ruleType === RuleType.DOMAIN;

    if (
      pattern &&
      (ruleType === RuleType.URL_EXACT || ruleType === RuleType.URL_PATTERN)
    ) {
      this.validateURLPattern(pattern);
    }

    let finalAppName = normalizedAppName;
    if (ruleType === RuleType.DOMAIN && this.isURL(normalizedAppName)) {
      finalAppName = this.extractDomainFromURL(normalizedAppName);
    }

    return {
      finalAppName,
      appType: rule.appType,
      category: rule.category,
      ruleType,
      pattern,
      isDomainRule,
    };
  }

  /**
   * DB unique is (teamId, appName, appType). Collapse duplicate app keys in one
   * payload to one row per (finalAppName, appType). Last rule wins.
   */
  private dedupeRulesByAppKey(rules: RuleDto[]): RuleDto[] {
    const byKey = new Map<string, RuleDto>();
    for (const rule of rules) {
      const p = this.resolveRuleFields(rule);
      const key = `${p.finalAppName}\0${p.appType}`;
      byKey.set(key, rule);
    }
    return [...byKey.values()];
  }

  /**
   * Dedupe persisted rules into template RuleDto rows. Key includes rule type and pattern
   * so URL rules do not collapse incorrectly.
   */
  private dedupeRuleEntitiesToTemplates(rules: TeamProductivityRule[]): RuleDto[] {
    const byKey = new Map<string, RuleDto>();
    for (const r of rules) {
      const dto: RuleDto = {
        appName: r.appName,
        appType: r.appType,
        category: r.category,
        ruleType: r.ruleType,
        pattern: r.pattern ?? undefined,
      };
      const p = this.resolveRuleFields(dto);
      const key = `${p.finalAppName}\0${p.appType}\0${p.ruleType}\0${p.pattern ?? ''}`;
      if (!byKey.has(key)) {
        byKey.set(key, dto);
      }
    }
    return [...byKey.values()];
  }

  /**
   * Copy rule definitions from another collection: applies deduplicated templates to every
   * team assigned to the target collection. Overwrites matching (team, app, type) slots.
   */
  async copyRulesFromCollection(
    tenantId: number,
    targetCollectionId: number,
    sourceCollectionId: number,
  ): Promise<{ templateCount: number; rulesWritten: number }> {
    if (targetCollectionId === sourceCollectionId) {
      throw new BadRequestException(
        'Source and target collection must be different.',
      );
    }

    await this.findOne(tenantId, targetCollectionId);
    await this.findOne(tenantId, sourceCollectionId);

    const sourceRules = await this.rulesRepository.find({
      where: { collectionId: sourceCollectionId },
    });

    const teamAssignments = await this.collectionTeamsRepository.find({
      where: { collectionId: targetCollectionId },
    });

    if (teamAssignments.length === 0) {
      throw new BadRequestException(
        'Target collection must be assigned to at least one team before importing rules.',
      );
    }

    const templates = this.dedupeRuleEntitiesToTemplates(sourceRules);
    if (templates.length === 0) {
      return { templateCount: 0, rulesWritten: 0 };
    }

    const deduped = this.dedupeRulesByAppKey(templates);
    const teamIds = teamAssignments.map((ta) => ta.teamId);
    const rules: TeamProductivityRule[] = [];

    for (const teamId of teamIds) {
      for (const rule of deduped) {
        const resolved = this.resolveRuleFields(rule);
        await this.deleteRuleSlotForTeamAndCollection(
          teamId,
          resolved.finalAppName,
          resolved.appType,
          targetCollectionId,
        );

        rules.push(
          this.rulesRepository.create({
            teamId,
            collectionId: targetCollectionId,
            appName: resolved.finalAppName,
            appType: resolved.appType,
            category: resolved.category,
            ruleType: resolved.ruleType,
            pattern: resolved.pattern ?? undefined,
            isDomainRule: resolved.isDomainRule,
          }),
        );
      }
    }

    if (rules.length > 0) {
      await this.rulesRepository.save(rules);
    }

    return {
      templateCount: deduped.length,
      rulesWritten: rules.length,
    };
  }

  /**
   * Get suggested apps/domains from hardcoded list
   */
  getSuggestedApps(): {
    desktop: SuggestedApp[];
    web: SuggestedApp[];
  } {
    const productiveDesktopApps = [
      'cursor', 'code', 'visual studio code', 'vscode', 'intellij', 'idea',
      'webstorm', 'pycharm', 'android studio', 'xcode', 'sublime text', 'atom',
      'vim', 'neovim', 'emacs', 'terminal', 'windows terminal', 'windowsterminal',
      'powershell', 'cmd', 'iterm', 'dbeaver', 'datagrip', 'postman', 'insomnia',
      'fiddler', 'wireshark', 'docker', 'kubernetes', 'git', 'github desktop',
      'sourcetree', 'tortoisegit',
    ];

    const unproductiveDesktopApps = [
      'steam', 'epic games launcher', 'discord', 'slack', 'telegram', 'whatsapp',
      'spotify', 'itunes', 'netflix', 'vlc', 'media player',
    ];

    const neutralDesktopApps = [
      'explorer', 'windows explorer', 'file explorer', 'finder', 'settings',
      'control panel', 'task manager', 'system', 'windows', 'microsoft edge',
      'edge', 'chrome', 'firefox', 'safari', 'opera', 'brave', 'outlook',
      'thunderbird', 'mail', 'calendar', 'notes', 'notepad', 'textedit',
    ];

    const productiveWebDomains = [
      'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
      'stackexchange.com', 'dev.to', 'medium.com', 'docs.google.com',
      'confluence', 'jira', 'notion.so', 'atlassian.com', 'azure.com',
      'aws.amazon.com', 'cloud.google.com', 'digitalocean.com', 'heroku.com',
      'vercel.com', 'netlify.com', 'npmjs.com', 'pypi.org', 'maven.apache.org',
      'nuget.org', 'docker.com', 'kubernetes.io', 'terraform.io', 'ansible.com',
      'redhat.com', 'microsoft.com', 'developer.mozilla.org', 'w3.org', 'mdn.io',
      'react.dev', 'angular.io', 'vuejs.org', 'nodejs.org', 'python.org',
      'golang.org', 'rust-lang.org', 'typescriptlang.org',
    ];

    const unproductiveWebDomains = [
      'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
      'tiktok.com', 'snapchat.com', 'reddit.com', 'youtube.com', 'netflix.com',
      'hulu.com', 'disney.com', 'amazon.com', 'ebay.com', 'etsy.com',
      'pinterest.com', 'tumblr.com', 'twitch.tv', 'discord.com', 'messenger.com',
    ];

    const desktop: SuggestedApp[] = [
      ...productiveDesktopApps.map((app) => ({
        appName: app,
        appType: AppType.DESKTOP,
        suggestedCategory: AppCategory.PRODUCTIVE,
      })),
      ...unproductiveDesktopApps.map((app) => ({
        appName: app,
        appType: AppType.DESKTOP,
        suggestedCategory: AppCategory.UNPRODUCTIVE,
      })),
      ...neutralDesktopApps.map((app) => ({
        appName: app,
        appType: AppType.DESKTOP,
        suggestedCategory: AppCategory.NEUTRAL,
      })),
    ];

    const web: SuggestedApp[] = [
      ...productiveWebDomains.map((domain) => ({
        appName: domain,
        appType: AppType.WEB,
        suggestedCategory: AppCategory.PRODUCTIVE,
      })),
      ...unproductiveWebDomains.map((domain) => ({
        appName: domain,
        appType: AppType.WEB,
        suggestedCategory: AppCategory.UNPRODUCTIVE,
      })),
    ];

    return { desktop, web };
  }

  async createCollection(
    tenantId: number,
    userId: number,
    dto: CreateCollectionDto,
  ): Promise<RuleCollection> {
    // Verify all teams belong to tenant
    for (const teamId of dto.teamIds) {
      await this.teamsService.findOne(tenantId, teamId);
    }

    await this.assertTeamsExclusiveForNewCollection(dto.teamIds);

    // Create collection
    const collection = this.collectionsRepository.create({
      name: dto.name,
      description: dto.description,
      tenantId,
      createdBy: userId,
    });
    const savedCollection = await this.collectionsRepository.save(collection);

    // Assign to teams
    const teamAssignments = dto.teamIds.map((teamId) =>
      this.collectionTeamsRepository.create({
        collectionId: savedCollection.id,
        teamId,
      }),
    );
    await this.collectionTeamsRepository.save(teamAssignments);

    const dedupedRules = this.dedupeRulesByAppKey(dto.rules);

    // Scoped delete: this collection + legacy (null collectionId) only — never another collection’s rows
    const rules: TeamProductivityRule[] = [];
    for (const teamId of dto.teamIds) {
      for (const rule of dedupedRules) {
        const resolved = this.resolveRuleFields(rule);
        await this.deleteRuleSlotForTeamAndCollection(
          teamId,
          resolved.finalAppName,
          resolved.appType,
          savedCollection.id,
        );

        rules.push(
          this.rulesRepository.create({
            teamId,
            collectionId: savedCollection.id,
            appName: resolved.finalAppName,
            appType: resolved.appType,
            category: resolved.category,
            ruleType: resolved.ruleType,
            pattern: resolved.pattern ?? undefined,
            isDomainRule: resolved.isDomainRule,
          }),
        );
      }
    }

    if (rules.length > 0) {
      await this.rulesRepository.save(rules);
    }

    return this.findOne(tenantId, savedCollection.id);
  }

  async getCollections(
    tenantId: number,
    filters?: { teamId?: number },
  ): Promise<RuleCollection[]> {
    const query = this.collectionsRepository
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.teamAssignments', 'teamAssignments')
      .leftJoinAndSelect('teamAssignments.team', 'team')
      .where('collection.tenantId = :tenantId', { tenantId });

    if (filters?.teamId) {
      query.andWhere('teamAssignments.teamId = :teamId', {
        teamId: filters.teamId,
      });
    }

    return query.getMany();
  }

  async findOne(tenantId: number, id: number): Promise<RuleCollection> {
    const collection = await this.collectionsRepository.findOne({
      where: { id, tenantId },
      relations: ['teamAssignments', 'teamAssignments.team', 'creator'],
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async updateCollection(
    tenantId: number,
    id: number,
    dto: UpdateCollectionDto,
  ): Promise<RuleCollection> {
    const collection = await this.findOne(tenantId, id);

    if (dto.teamIds !== undefined) {
      for (const teamId of dto.teamIds) {
        await this.teamsService.findOne(tenantId, teamId);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.name !== undefined) collection.name = dto.name;
      if (dto.description !== undefined) collection.description = dto.description;
      await manager.save(RuleCollection, collection);

      if (dto.teamIds !== undefined) {
        await this.assertTeamsExclusiveForCollection(dto.teamIds, id);
        await manager.delete(RuleCollectionTeam, { collectionId: id });
        const teamAssignments = dto.teamIds.map((teamId) =>
          manager.create(RuleCollectionTeam, {
            collectionId: id,
            teamId,
          }),
        );
        if (teamAssignments.length > 0) {
          await manager.save(RuleCollectionTeam, teamAssignments);
        }
      }

      if (dto.rules !== undefined) {
        await manager.delete(TeamProductivityRule, { collectionId: id });

        const teamAssignments = await manager.find(RuleCollectionTeam, {
          where: { collectionId: id },
        });
        const teamIds = teamAssignments.map((ta) => ta.teamId);

        if (teamIds.length > 0 && dto.rules.length > 0) {
          const dedupedRules = this.dedupeRulesByAppKey(dto.rules);
          const rulesToInsert: TeamProductivityRule[] = [];

          for (const teamId of teamIds) {
            for (const rule of dedupedRules) {
              const resolved = this.resolveRuleFields(rule);
              await this.deleteRuleSlotForTeamAndCollection(
                teamId,
                resolved.finalAppName,
                resolved.appType,
                id,
                manager,
              );

              rulesToInsert.push(
                manager.create(TeamProductivityRule, {
                  teamId,
                  collectionId: id,
                  appName: resolved.finalAppName,
                  appType: resolved.appType,
                  category: resolved.category,
                  ruleType: resolved.ruleType,
                  pattern: resolved.pattern ?? undefined,
                  isDomainRule: resolved.isDomainRule,
                }),
              );
            }
          }
          if (rulesToInsert.length > 0) {
            await manager.save(TeamProductivityRule, rulesToInsert);
          }
        }
      }
    });

    return this.findOne(tenantId, id);
  }

  async deleteCollection(tenantId: number, id: number): Promise<void> {
    const collection = await this.findOne(tenantId, id);
    // Cascade delete will handle rules and team assignments
    await this.collectionsRepository.remove(collection);
  }

  async addRulesToCollection(
    tenantId: number,
    collectionId: number,
    dto: AddRulesToCollectionDto,
  ): Promise<TeamProductivityRule[]> {
    const collection = await this.findOne(tenantId, collectionId);

    // Get all teams assigned to this collection
    const teamAssignments = await this.collectionTeamsRepository.find({
      where: { collectionId: collection.id },
    });

    if (teamAssignments.length === 0) {
      throw new BadRequestException(
        'Collection must be assigned to at least one team',
      );
    }

    const teamIds = teamAssignments.map((ta) => ta.teamId);
    const dedupedRules = this.dedupeRulesByAppKey(dto.rules);
    const rules: TeamProductivityRule[] = [];

    for (const teamId of teamIds) {
      for (const rule of dedupedRules) {
        const resolved = this.resolveRuleFields(rule);
        await this.deleteRuleSlotForTeamAndCollection(
          teamId,
          resolved.finalAppName,
          resolved.appType,
          collection.id,
        );

        rules.push(
          this.rulesRepository.create({
            teamId,
            collectionId: collection.id,
            appName: resolved.finalAppName,
            appType: resolved.appType,
            category: resolved.category,
            ruleType: resolved.ruleType,
            pattern: resolved.pattern ?? undefined,
            isDomainRule: resolved.isDomainRule,
          }),
        );
      }
    }

    if (rules.length > 0) {
      return this.rulesRepository.save(rules);
    }

    return [];
  }

  async removeRuleFromCollection(
    tenantId: number,
    ruleId: number,
  ): Promise<void> {
    const rule = await this.rulesRepository.findOne({
      where: { id: ruleId },
      relations: ['collection'],
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    if (rule.collection && rule.collection.tenantId !== tenantId) {
      throw new NotFoundException('Rule not found');
    }

    await this.rulesRepository.remove(rule);
  }

  async assignToTeams(
    tenantId: number,
    collectionId: number,
    dto: AssignCollectionToTeamsDto,
  ): Promise<RuleCollectionTeam[]> {
    const collection = await this.findOne(tenantId, collectionId);

    // Verify all teams belong to tenant
    for (const teamId of dto.teamIds) {
      await this.teamsService.findOne(tenantId, teamId);
    }

    await this.assertTeamsExclusiveForCollection(dto.teamIds, collection.id);

    const assignments: RuleCollectionTeam[] = [];

    for (const teamId of dto.teamIds) {
      // Check if assignment already exists
      const existing = await this.collectionTeamsRepository.findOne({
        where: { collectionId: collection.id, teamId },
      });

      if (!existing) {
        assignments.push(
          this.collectionTeamsRepository.create({
            collectionId: collection.id,
            teamId,
          }),
        );
      }
    }

    if (assignments.length > 0) {
      return this.collectionTeamsRepository.save(assignments);
    }

    return [];
  }

  async unassignFromTeam(
    tenantId: number,
    collectionId: number,
    teamId: number,
  ): Promise<void> {
    const collection = await this.findOne(tenantId, collectionId);
    await this.teamsService.findOne(tenantId, teamId);

    const assignment = await this.collectionTeamsRepository.findOne({
      where: { collectionId: collection.id, teamId },
    });

    if (!assignment) {
      throw new NotFoundException('Collection is not assigned to this team');
    }

    await this.collectionTeamsRepository.remove(assignment);
  }

  /**
   * Get all rules for a collection
   */
  async getCollectionRules(
    tenantId: number,
    collectionId: number,
  ): Promise<TeamProductivityRule[]> {
    // Verify collection exists and belongs to tenant
    const collection = await this.findOne(tenantId, collectionId);

    // Get all rules for this collection
    return this.rulesRepository.find({
      where: {
        collectionId: collection.id,
      },
      order: {
        appType: 'ASC',
        appName: 'ASC',
      },
    });
  }

  /**
   * Get collections assigned to a team
   */
  async getTeamCollections(
    tenantId: number,
    teamId: number,
  ): Promise<RuleCollection[]> {
    await this.teamsService.findOne(tenantId, teamId);

    const assignments = await this.collectionTeamsRepository.find({
      where: { teamId },
      relations: ['collection', 'collection.teamAssignments'],
    });

    // Filter collections that belong to the tenant
    return assignments
      .map((a) => a.collection)
      .filter((c) => c.tenantId === tenantId);
  }

  /**
   * Determine rule type from app name, app type, and optional pattern
   */
  private determineRuleType(appName: string, appType: AppType, pattern?: string): RuleType {
    // If pattern is provided, it's a URL rule
    if (pattern) {
      // Check if pattern contains wildcards
      if (pattern.includes('*')) {
        return RuleType.URL_PATTERN;
      }
      return RuleType.URL_EXACT;
    }

    // For web apps, check if appName is a URL or domain
    if (appType === AppType.WEB) {
      if (this.isURL(appName)) {
        // If it's a full URL, suggest URL_EXACT
        return RuleType.URL_EXACT;
      }
      // If it looks like a domain, use DOMAIN
      if (this.isDomain(appName)) {
        return RuleType.DOMAIN;
      }
    }

    // Default to app_name for backward compatibility
    return RuleType.APP_NAME;
  }

  /**
   * Check if a string is a URL
   */
  private isURL(str: string): boolean {
    return str.includes('://') || (str.startsWith('http://') || str.startsWith('https://'));
  }

  /**
   * Check if a string looks like a domain
   */
  private isDomain(str: string): boolean {
    // Simple domain pattern check
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(str);
  }

  /**
   * Extract domain from URL
   */
  private extractDomainFromURL(url: string): string {
    try {
      let urlToParse = url.trim();
      if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
        urlToParse = 'https://' + urlToParse;
      }
      const urlObj = new URL(urlToParse);
      let domain = urlObj.hostname.toLowerCase();
      // Remove www. prefix
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      return domain;
    } catch {
      // If URL parsing fails, try simple extraction
      const parts = url.replace(/^https?:\/\//, '').split('/');
      let domain = parts[0].toLowerCase();
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      return domain;
    }
  }

  /**
   * Validate URL pattern
   */
  private validateURLPattern(pattern: string): void {
    if (!pattern || pattern.trim() === '') {
      throw new BadRequestException('Pattern cannot be empty');
    }

    // Check for invalid characters (basic validation)
    const invalidChars = /[<>"{}|\\^`\[\]]/;
    if (invalidChars.test(pattern)) {
      throw new BadRequestException('Pattern contains invalid characters');
    }

    // Pattern should not be too long
    if (pattern.length > 500) {
      throw new BadRequestException('Pattern is too long (max 500 characters)');
    }
  }

  /**
   * Suggest domain from URL
   */
  suggestDomainFromURL(url: string): string {
    return this.extractDomainFromURL(url);
  }
}
