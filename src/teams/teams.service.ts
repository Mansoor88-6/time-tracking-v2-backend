import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Roles } from '../common/enums/roles.enum';
import { User } from '../users/entities/user.entity';
import { RuleCollectionsService } from '../rule-collections/rule-collections.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @Inject(forwardRef(() => RuleCollectionsService))
    private readonly ruleCollectionsService: RuleCollectionsService,
  ) {}

  async create(
    tenantId: number,
    dto: CreateTeamDto,
    currentUserId: number,
    currentUserRole: Roles,
  ): Promise<Team> {
    if (
      currentUserRole !== Roles.ORG_ADMIN &&
      currentUserRole !== Roles.TEAM_MANAGER
    ) {
      throw new ForbiddenException('Insufficient permissions to create team');
    }

    const team = this.teamsRepository.create({
      name: dto.name,
      tenantId,
      managerId: dto.managerId,
    });
    const saved = await this.teamsRepository.save(team);

    // Ensure creator is a member
    const existingMembership = await this.teamMembersRepository.findOne({
      where: { teamId: saved.id, userId: currentUserId },
    });
    if (!existingMembership) {
      const membership = this.teamMembersRepository.create({
        teamId: saved.id,
        userId: currentUserId,
        teamRole: 'MANAGER',
      });
      await this.teamMembersRepository.save(membership);
    }

    return saved;
  }

  async findAll(tenantId: number): Promise<Team[]> {
    return this.teamsRepository.find({
      where: { tenantId },
    });
  }

  async findOne(tenantId: number, id: number): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id, tenantId },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async update(
    tenantId: number,
    id: number,
    dto: UpdateTeamDto,
  ): Promise<Team> {
    const team = await this.findOne(tenantId, id);
    Object.assign(team, dto);
    return this.teamsRepository.save(team);
  }

  async remove(tenantId: number, id: number): Promise<void> {
    const team = await this.findOne(tenantId, id);
    await this.teamMembersRepository.delete({ teamId: team.id });
    await this.teamsRepository.delete(team.id);
  }

  async getTeamMembers(tenantId: number, teamId: number): Promise<TeamMember[]> {
    const team = await this.findOne(tenantId, teamId);
    return this.teamMembersRepository.find({
      where: { teamId: team.id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async addTeamMember(
    tenantId: number,
    teamId: number,
    userId: number,
  ): Promise<TeamMember> {
    const team = await this.findOne(tenantId, teamId);

    // Verify user belongs to the same tenant
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${userId} not found in this organization`,
      );
    }

    // Check if membership already exists
    const existing = await this.teamMembersRepository.findOne({
      where: { teamId: team.id, userId },
    });
    if (existing) {
      throw new ForbiddenException('User is already a member of this team');
    }

    const membership = this.teamMembersRepository.create({
      teamId: team.id,
      userId,
    });
    return this.teamMembersRepository.save(membership);
  }

  async removeTeamMember(
    tenantId: number,
    teamId: number,
    userId: number,
  ): Promise<void> {
    const team = await this.findOne(tenantId, teamId);

    const membership = await this.teamMembersRepository.findOne({
      where: { teamId: team.id, userId },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this team');
    }

    await this.teamMembersRepository.remove(membership);
  }

  async getUserTeams(tenantId: number, userId: number): Promise<Team[]> {
    // Verify user belongs to tenant
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${userId} not found in this organization`,
      );
    }

    // Get all team memberships for this user
    const memberships = await this.teamMembersRepository.find({
      where: { userId },
      relations: ['team'],
    });

    // Filter teams that belong to the tenant
    const teams = memberships
      .map((membership) => membership.team)
      .filter((team) => team.tenantId === tenantId);

    return teams;
  }

  async getTeamCollections(tenantId: number, teamId: number) {
    await this.findOne(tenantId, teamId);
    return this.ruleCollectionsService.getTeamCollections(tenantId, teamId);
  }
}

