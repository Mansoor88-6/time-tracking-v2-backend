import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { TeamProductivityRule, AppType, AppCategory } from './entities/team-productivity-rule.entity';
import { UnclassifiedApp, UnclassifiedAppStatus } from './entities/unclassified-app.entity';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { BulkCreateRulesDto } from './dto/bulk-create-rules.dto';
import { ClassifyUnclassifiedDto } from './dto/classify-unclassified.dto';
import { TeamsService } from '../teams/teams.service';
import { RuleCollectionTeam } from '../rule-collections/entities/rule-collection-team.entity';

@Injectable()
export class ProductivityRulesService {
  constructor(
    @InjectRepository(TeamProductivityRule)
    private readonly rulesRepository: Repository<TeamProductivityRule>,
    @InjectRepository(UnclassifiedApp)
    private readonly unclassifiedRepository: Repository<UnclassifiedApp>,
    @InjectRepository(RuleCollectionTeam)
    private readonly collectionTeamsRepository: Repository<RuleCollectionTeam>,
    private readonly teamsService: TeamsService,
  ) {}

  async createRule(
    tenantId: number,
    dto: CreateRuleDto,
  ): Promise<TeamProductivityRule> {
    // Verify team belongs to tenant
    await this.teamsService.findOne(tenantId, dto.teamId);

    // Normalize app name
    const normalizedAppName = dto.appName.toLowerCase().trim();

    // Check if rule already exists
    const existing = await this.rulesRepository.findOne({
      where: {
        teamId: dto.teamId,
        appName: normalizedAppName,
        appType: dto.appType,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Rule already exists for this team, app, and type',
      );
    }

    const rule = this.rulesRepository.create({
      teamId: dto.teamId,
      appName: normalizedAppName,
      appType: dto.appType,
      category: dto.category,
    });

    return this.rulesRepository.save(rule);
  }

  async bulkCreateRules(
    tenantId: number,
    dto: BulkCreateRulesDto,
  ): Promise<TeamProductivityRule[]> {
    const results: TeamProductivityRule[] = [];
    const errors: string[] = [];

    for (const ruleDto of dto.rules) {
      try {
        // Verify team belongs to tenant
        await this.teamsService.findOne(tenantId, ruleDto.teamId);

        const normalizedAppName = ruleDto.appName.toLowerCase().trim();

        // Check if rule already exists
        const existing = await this.rulesRepository.findOne({
          where: {
            teamId: ruleDto.teamId,
            appName: normalizedAppName,
            appType: ruleDto.appType,
          },
        });

        if (existing) {
          errors.push(
            `Rule already exists for team ${ruleDto.teamId}, app ${normalizedAppName}, type ${ruleDto.appType}`,
          );
          continue;
        }

        const rule = this.rulesRepository.create({
          teamId: ruleDto.teamId,
          appName: normalizedAppName,
          appType: ruleDto.appType,
          category: ruleDto.category,
        });

        results.push(await this.rulesRepository.save(rule));
      } catch (error) {
        errors.push(
          `Failed to create rule for ${ruleDto.appName}: ${error.message}`,
        );
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new BadRequestException(
        `Failed to create any rules: ${errors.join('; ')}`,
      );
    }

    return results;
  }

  async getTeamRules(
    tenantId: number,
    teamId: number,
  ): Promise<TeamProductivityRule[]> {
    // Verify team belongs to tenant
    await this.teamsService.findOne(tenantId, teamId);

    return this.rulesRepository.find({
      where: { teamId },
      order: { appName: 'ASC' },
    });
  }

  async updateRule(
    tenantId: number,
    ruleId: number,
    dto: UpdateRuleDto,
  ): Promise<TeamProductivityRule> {
    const rule = await this.rulesRepository.findOne({
      where: { id: ruleId },
      relations: ['team'],
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    if (rule.team.tenantId !== tenantId) {
      throw new NotFoundException('Rule not found');
    }

    rule.category = dto.category;
    return this.rulesRepository.save(rule);
  }

  async deleteRule(tenantId: number, ruleId: number): Promise<void> {
    const rule = await this.rulesRepository.findOne({
      where: { id: ruleId },
      relations: ['team'],
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    if (rule.team.tenantId !== tenantId) {
      throw new NotFoundException('Rule not found');
    }

    await this.rulesRepository.remove(rule);
  }

  async getUnclassifiedApps(
    tenantId: number,
    filters?: {
      teamId?: number;
      appType?: AppType;
      status?: UnclassifiedAppStatus;
    },
  ): Promise<UnclassifiedApp[]> {
    const where: any = { tenantId };

    if (filters?.teamId !== undefined) {
      where.teamId = filters.teamId;
    }

    if (filters?.appType) {
      where.appType = filters.appType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.unclassifiedRepository.find({
      where,
      relations: ['team'],
      order: { lastSeen: 'DESC' },
    });
  }

  async classifyUnclassified(
    tenantId: number,
    dto: ClassifyUnclassifiedDto,
  ): Promise<{ rule: TeamProductivityRule; unclassified: UnclassifiedApp }> {
    const normalizedAppName = dto.appName.toLowerCase().trim();

    // Find unclassified app
    const unclassified = await this.unclassifiedRepository.findOne({
      where: {
        tenantId,
        appName: normalizedAppName,
        appType: dto.appType,
        status: UnclassifiedAppStatus.PENDING,
      },
    });

    if (!unclassified) {
      throw new NotFoundException('Unclassified app not found');
    }

    // Determine which team to apply rule to
    const teamId = dto.applyToTeamId || unclassified.teamId;

    if (!teamId) {
      throw new BadRequestException(
        'Team ID is required (either from unclassified app or provided)',
      );
    }

    // Verify team belongs to tenant
    await this.teamsService.findOne(tenantId, teamId);

    // Create or update rule
    let rule = await this.rulesRepository.findOne({
      where: {
        teamId,
        appName: normalizedAppName,
        appType: dto.appType,
      },
    });

    if (rule) {
      rule.category = dto.category;
      rule = await this.rulesRepository.save(rule);
    } else {
      rule = this.rulesRepository.create({
        teamId,
        appName: normalizedAppName,
        appType: dto.appType,
        category: dto.category,
      });
      rule = await this.rulesRepository.save(rule);
    }

    // Update unclassified app status
    unclassified.status = UnclassifiedAppStatus.CLASSIFIED;
    await this.unclassifiedRepository.save(unclassified);

    return { rule, unclassified };
  }

  // Helper method for worker service to get rules for user's teams
  // Now queries via collections: gets all collections assigned to user's teams, then gets all rules from those collections
  async getUserTeamRules(
    tenantId: number,
    userId: number,
  ): Promise<TeamProductivityRule[]> {
    // Get user's teams
    const teams = await this.teamsService.getUserTeams(tenantId, userId);

    if (teams.length === 0) {
      return [];
    }

    const teamIds = teams.map((team) => team.id);

    // Get all collections assigned to user's teams
    const collectionAssignments = await this.collectionTeamsRepository.find({
      where: {
        teamId: In(teamIds),
      },
      relations: ['collection'],
    });

    // Filter collections that belong to the tenant
    const collectionIds = collectionAssignments
      .map((ca) => ca.collection)
      .filter((c) => c.tenantId === tenantId)
      .map((c) => c.id);

    // Get all rules from collections AND legacy rules (without collectionId)
    const rules = await this.rulesRepository.find({
      where: [
        // Rules from collections
        {
          collectionId: In(collectionIds),
        },
        // Legacy rules (without collectionId) for backward compatibility
        {
          teamId: In(teamIds),
          collectionId: IsNull(),
        },
      ],
    });

    return rules;
  }
}
