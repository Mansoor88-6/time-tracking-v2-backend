import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { TenantContextService } from '../tenants/services/tenant-context.service';
import { hashPassword } from '../common/utils/password.util';
import { Roles } from '../common/enums/roles.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tenantContextService: TenantContextService,
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: number): Promise<User> {
    const hashedPassword = await hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      tenantId,
      role: createUserDto.role || Roles.EMPLOYEE,
    });
    return this.userRepository.save(user);
  }

  async findAll(tenantId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId },
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
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
    const user = await this.findOne(id, tenantId);
    await this.userRepository.remove(user);
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
