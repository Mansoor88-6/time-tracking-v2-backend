import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Invitation } from './entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UsersService } from '../users/users.service';
import { Roles } from '../common/enums/roles.enum';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationsRepository: Repository<Invitation>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    private readonly usersService: UsersService,
  ) {}

  async createInvitation(
    tenantId: number,
    invitedByUserId: number,
    dto: CreateInvitationDto,
  ): Promise<Invitation> {
    if (dto.role === Roles.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot invite Super Admin via this flow');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationsRepository.create({
      tenantId,
      email: dto.email,
      role: dto.role,
      teamIds: dto.teamIds ?? [],
      token,
      expiresAt,
      invitedByUserId,
    });

    const saved = await this.invitationsRepository.save(invitation);

    // In a real system, you would send an email here. For now we simply log:
    // console.log(`Invitation token for ${dto.email}: ${token}`);

    return saved;
  }

  async getInvitationByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { token },
      relations: ['tenant'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ForbiddenException('Invitation has expired');
    }

    if (invitation.acceptedAt) {
      throw new ForbiddenException('Invitation already accepted');
    }

    return invitation;
  }

  async acceptInvitation(
    token: string,
    dto: AcceptInvitationDto,
  ): Promise<void> {
    const invitation = await this.getInvitationByToken(token);

    // Create or reuse user for this email in the tenant
    let user = await this.usersService.findByEmail(invitation.email);
    if (!user) {
      user = await this.usersService.create(
        {
          email: invitation.email,
          password: dto.password,
          name: dto.name,
          role: invitation.role,
        },
        invitation.tenantId,
      );
    }

    // Assign teams if provided
    if (Array.isArray(invitation.teamIds) && invitation.teamIds.length > 0) {
      for (const teamId of invitation.teamIds) {
        // Validate that the team exists and belongs to the same tenant
        const team = await this.teamsRepository.findOne({
          where: { id: teamId, tenantId: invitation.tenantId },
        });
        if (!team) {
          // Skip invalid teams instead of failing the entire invitation
          // In production, you might want to log this or notify the admin
          continue;
        }

        // Check if membership already exists
        const existing = await this.teamMembersRepository.findOne({
          where: { teamId, userId: user.id },
        });
        if (!existing) {
          const membership = this.teamMembersRepository.create({
            teamId,
            userId: user.id,
          });
          await this.teamMembersRepository.save(membership);
        }
      }
    }

    invitation.acceptedAt = new Date();
    await this.invitationsRepository.save(invitation);
  }
}

