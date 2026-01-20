import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Roles } from '../common/enums/roles.enum';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
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
}

