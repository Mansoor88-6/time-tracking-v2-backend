import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAdmin } from './entities/super-admin.entity';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { hashPassword } from '../common/utils/password.util';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
  ) {}

  async create(createSuperAdminDto: CreateSuperAdminDto): Promise<SuperAdmin> {
    const hashedPassword = await hashPassword(createSuperAdminDto.password);
    const superAdmin = this.superAdminRepository.create({
      ...createSuperAdminDto,
      password: hashedPassword,
    });
    return this.superAdminRepository.save(superAdmin);
  }

  async findAll(): Promise<SuperAdmin[]> {
    return this.superAdminRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<SuperAdmin> {
    const superAdmin = await this.superAdminRepository.findOne({
      where: { id },
    });
    if (!superAdmin) {
      throw new NotFoundException(`SuperAdmin with ID ${id} not found`);
    }
    return superAdmin;
  }

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.superAdminRepository.findOne({ where: { email } });
  }

  async update(
    id: number,
    updateSuperAdminDto: UpdateSuperAdminDto,
  ): Promise<SuperAdmin> {
    const superAdmin = await this.findOne(id);

    if (updateSuperAdminDto.password) {
      updateSuperAdminDto.password = await hashPassword(
        updateSuperAdminDto.password,
      );
    }

    Object.assign(superAdmin, updateSuperAdminDto);
    return this.superAdminRepository.save(superAdmin);
  }

  async remove(id: number): Promise<void> {
    const superAdmin = await this.findOne(id);
    await this.superAdminRepository.remove(superAdmin);
  }
}
