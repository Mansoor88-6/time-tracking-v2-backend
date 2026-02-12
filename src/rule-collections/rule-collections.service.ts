import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RuleCollection } from './entities/rule-collection.entity';
import { RuleCollectionTeam } from './entities/rule-collection-team.entity';
import { TeamProductivityRule, AppType, AppCategory, RuleType } from '../productivity-rules/entities/team-productivity-rule.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddRulesToCollectionDto } from './dto/add-rules-to-collection.dto';
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
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) {}

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

    // Create rules for each team
    const rules: TeamProductivityRule[] = [];
    for (const teamId of dto.teamIds) {
      for (const rule of dto.rules) {
        const normalizedAppName = rule.appName.toLowerCase().trim();
        
        // Check if rule already exists
        const existing = await this.rulesRepository.findOne({
          where: {
            teamId,
            appName: normalizedAppName,
            appType: rule.appType,
          },
        });

        if (!existing) {
          // Determine rule type and pattern
          const ruleType = rule.ruleType || this.determineRuleType(rule.appName, rule.appType, rule.pattern);
          const pattern = rule.pattern || undefined;
          const isDomainRule = ruleType === RuleType.DOMAIN;

          // Validate pattern if provided
          if (pattern && (ruleType === RuleType.URL_EXACT || ruleType === RuleType.URL_PATTERN)) {
            this.validateURLPattern(pattern);
          }

          // For domain/URL rules, extract domain from appName if it's a URL
          let finalAppName = normalizedAppName;
          if (ruleType === RuleType.DOMAIN && this.isURL(normalizedAppName)) {
            finalAppName = this.extractDomainFromURL(normalizedAppName);
          }

          rules.push(
            this.rulesRepository.create({
              teamId,
              collectionId: savedCollection.id,
              appName: finalAppName,
              appType: rule.appType,
              category: rule.category,
              ruleType,
              pattern: pattern || undefined,
              isDomainRule,
            }),
          );
        }
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

    if (dto.name) collection.name = dto.name;
    if (dto.description !== undefined) collection.description = dto.description;

    return this.collectionsRepository.save(collection);
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
    const rules: TeamProductivityRule[] = [];

    for (const teamId of teamIds) {
      for (const rule of dto.rules) {
        const normalizedAppName = rule.appName.toLowerCase().trim();

        // Check if rule already exists
        const existing = await this.rulesRepository.findOne({
          where: {
            teamId,
            appName: normalizedAppName,
            appType: rule.appType,
          },
        });

        if (!existing) {
          // Determine rule type and pattern
          const ruleType = rule.ruleType || this.determineRuleType(rule.appName, rule.appType, rule.pattern);
          const pattern = rule.pattern || undefined;
          const isDomainRule = ruleType === RuleType.DOMAIN;

          // Validate pattern if provided
          if (pattern && (ruleType === RuleType.URL_EXACT || ruleType === RuleType.URL_PATTERN)) {
            this.validateURLPattern(pattern);
          }

          // For domain/URL rules, extract domain from appName if it's a URL
          let finalAppName = normalizedAppName;
          if (ruleType === RuleType.DOMAIN && this.isURL(normalizedAppName)) {
            finalAppName = this.extractDomainFromURL(normalizedAppName);
          }

          rules.push(
            this.rulesRepository.create({
              teamId,
              collectionId: collection.id,
              appName: finalAppName,
              appType: rule.appType,
              category: rule.category,
              ruleType,
              pattern: pattern || undefined,
              isDomainRule,
            }),
          );
        }
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
