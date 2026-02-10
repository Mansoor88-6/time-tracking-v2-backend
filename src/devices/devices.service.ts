import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { Roles } from '../common/enums/roles.enum';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly devicesRepository: Repository<Device>,
  ) {}

  async registerOrAuthorizeDevice(
    userId: number,
    tenantId: number,
    deviceId: string,
    name?: string,
  ): Promise<Device> {
    let device = await this.devicesRepository.findOne({
      where: { tenantId, userId, deviceId },
    });

    if (!device) {
      device = this.devicesRepository.create({
        tenantId,
        userId,
        deviceId,
        name,
        isAuthorized: true,
        lastSeenAt: new Date(),
      });
    } else {
      device.isAuthorized = true;
      device.lastSeenAt = new Date();
      if (name) {
        device.name = name;
      }
    }

    return this.devicesRepository.save(device);
  }

  async listUserDevices(userId: number, tenantId: number): Promise<Device[]> {
    return this.devicesRepository.find({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeDevice(
    id: number,
    userId: number,
    tenantId: number,
    role: Roles,
  ): Promise<void> {
    const device = await this.devicesRepository.findOne({
      where: { id, tenantId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const isOwner = device.userId === userId;
    const isOrgAdmin = role === Roles.ORG_ADMIN || role === Roles.SUPER_ADMIN;

    if (!isOwner && !isOrgAdmin) {
      throw new ForbiddenException('Not allowed to revoke this device');
    }

    device.isAuthorized = false;
    await this.devicesRepository.save(device);
  }

  async listTenantDevices(tenantId: number): Promise<Device[]> {
    return this.devicesRepository.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}

