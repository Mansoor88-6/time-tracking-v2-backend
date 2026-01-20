import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import { UsersService } from '../users/users.service';
import { Roles } from '../common/enums/roles.enum';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const slug = this.generateSlug(createTenantDto.name);

    // Ensure slug is unique
    let uniqueSlug = slug;
    let counter = 1;
    while (
      await this.tenantRepository.findOne({ where: { slug: uniqueSlug } })
    ) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      slug: uniqueSlug,
      status: TenantStatus.PENDING,
    });

    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async update(id: number, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const slug = this.generateSlug(updateTenantDto.name);
      let uniqueSlug = slug;
      let counter = 1;
      while (
        (await this.tenantRepository.findOne({
          where: { slug: uniqueSlug },
        })) &&
        uniqueSlug !== tenant.slug
      ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      updateTenantDto['slug'] = uniqueSlug;
    }

    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async approve(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.ACTIVE;
    return this.tenantRepository.save(tenant);
  }

  async suspend(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.SUSPENDED;
    return this.tenantRepository.save(tenant);
  }

  async activate(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.ACTIVE;
    return this.tenantRepository.save(tenant);
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { email } });
  }

  async checkStatusByEmail(email: string): Promise<{
    status: TenantStatus;
    tenantId: number;
    tenantName: string;
    canSetupPassword: boolean;
    message: string;
  }> {
    const tenant = await this.findByEmail(email);
    if (!tenant) {
      throw new NotFoundException('Tenant not found with this email');
    }

    // Check if user already exists for this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email, tenantId: tenant.id },
    });

    const canSetupPassword =
      tenant.status === TenantStatus.ACTIVE && !existingUser;

    let message: string;
    if (tenant.status === TenantStatus.PENDING) {
      message = 'Your registration is pending approval.';
    } else if (tenant.status === TenantStatus.SUSPENDED) {
      message = 'Your account has been suspended. Please contact support.';
    } else if (existingUser) {
      message = 'Account already set up. Please login instead.';
    } else {
      message = 'Your account is approved. Please set up your password.';
    }

    return {
      status: tenant.status,
      tenantId: tenant.id,
      tenantName: tenant.name,
      canSetupPassword,
      message,
    };
  }

  async setupPassword(setupPasswordDto: SetupPasswordDto): Promise<User> {
    const tenant = await this.findByEmail(setupPasswordDto.email);
    if (!tenant) {
      throw new NotFoundException('Tenant not found with this email');
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException(
        'Tenant account is not approved yet. Please wait for approval.',
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: setupPasswordDto.email, tenantId: tenant.id },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Account already set up. Please login instead.',
      );
    }

    // Create first admin user
    const user = await this.usersService.create(
      {
        email: setupPasswordDto.email,
        password: setupPasswordDto.password,
        name: setupPasswordDto.name || tenant.name || 'Admin',
        role: Roles.ORG_ADMIN, // First user is always admin
      },
      tenant.id,
    );

    return user;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
