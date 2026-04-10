import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { UserSession } from '../sessions/entities/user-session.entity';
import { PasswordResetToken } from '../password-reset/entities/password-reset-token.entity';
import { Device } from '../devices/entities/device.entity';
import { DeviceAuthorizationCode } from '../devices/entities/device-authorization-code.entity';
import { OfflineTimeRequest } from '../offline-time-requests/entities/offline-time-request.entity';
import { RuleCollection } from '../rule-collections/entities/rule-collection.entity';
import { Invitation } from '../invitations/entities/invitation.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { TenantContextService } from '../tenants/services/tenant-context.service';
import { TeamsService } from '../teams/teams.service';
import { hashPassword } from '../common/utils/password.util';
import { Roles } from '../common/enums/roles.enum';

export interface UserListEntry {
  id: number;
  email: string;
  name: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  timezone?: string | null;
  tenantId: number;
  role: Roles;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  teams: { id: number; name: string }[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tenantContextService: TenantContextService,
    private teamsService: TeamsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: number): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email, tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists in your organization.',
      );
    }
    const hashedPassword = await hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      tenantId,
      role: createUserDto.role || Roles.EMPLOYEE,
    });
    return this.userRepository.save(user);
  }

  async findAll(tenantId: number): Promise<UserListEntry[]> {
    const users = await this.userRepository.find({
      where: { tenantId },
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
    });

    const userIds = users.map((u) => u.id);
    const teamsByUserId = await this.teamsService.getTeamsByUserIds(
      tenantId,
      userIds,
    );

    return users.map((user) => {
      const { password: _password, tenant, ...rest } = user;
      const teams = teamsByUserId.get(user.id) ?? [];
      return {
        ...rest,
        teams,
      } as UserListEntry;
    });
  }

  async findOne(id: number, tenantId?: number): Promise<User> {
    const where: any = { id };
    if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where,
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['tenant'],
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    tenantId: number,
  ): Promise<User> {
    const user = await this.findOne(id, tenantId);

    if (updateUserDto.password) {
      updateUserDto.password = await hashPassword(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    await this.findOne(id, tenantId);

    await this.dataSource.transaction(async (manager: EntityManager) => {
      await this.deleteUserRelatedRows(manager, id, tenantId);
      const res = await manager.delete(User, { id, tenantId });
      if (!res.affected) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    });
  }

  /**
   * Remove or null out FK references so DELETE FROM "user" does not violate constraints.
   */
  private async deleteUserRelatedRows(
    manager: EntityManager,
    userId: number,
    tenantId: number,
  ): Promise<void> {
    await manager.getRepository(TeamMember).delete({ userId });

    await manager
      .createQueryBuilder()
      .update(Team)
      .set({ managerId: null })
      .where('managerId = :userId', { userId })
      .andWhere('tenantId = :tenantId', { tenantId })
      .execute();

    await manager.getRepository(UserSession).delete({ userId });
    await manager.getRepository(PasswordResetToken).delete({ userId });
    await manager.getRepository(Device).delete({ userId, tenantId });
    await manager.getRepository(DeviceAuthorizationCode).delete({ userId });

    await manager
      .createQueryBuilder()
      .update(OfflineTimeRequest)
      .set({ reviewedByUserId: null })
      .where('reviewedByUserId = :userId', { userId })
      .andWhere('tenantId = :tenantId', { tenantId })
      .execute();

    await manager.getRepository(OfflineTimeRequest).delete({
      userId,
      tenantId,
    });

    await manager
      .createQueryBuilder()
      .update(RuleCollection)
      .set({ createdBy: null })
      .where('createdBy = :userId', { userId })
      .andWhere('tenantId = :tenantId', { tenantId })
      .execute();

    await manager
      .createQueryBuilder()
      .update(Invitation)
      .set({ invitedByUserId: null })
      .where('invitedByUserId = :userId', { userId })
      .andWhere('tenantId = :tenantId', { tenantId })
      .execute();
  }

  async changeRole(
    id: number,
    changeRoleDto: ChangeRoleDto,
    tenantId: number,
  ): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.role = changeRoleDto.role;
    return this.userRepository.save(user);
  }

  async findMe(id: number, tenantId: number): Promise<User> {
    return this.findOne(id, tenantId);
  }
}
