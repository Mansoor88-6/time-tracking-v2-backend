import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId = request.body?.deviceId;

    if (!deviceId) {
      throw new UnauthorizedException('Device ID is required');
    }

    // Find device and verify it's authorized
    const device = await this.deviceRepository.findOne({
      where: { deviceId, isAuthorized: true },
      relations: ['user', 'tenant'],
    });

    if (!device) {
      throw new ForbiddenException('Device not found or not authorized');
    }

    // Attach device, user, and tenant info to request for use in service
    request.device = device;
    request.user = device.user;
    request.tenantId = device.tenantId;

    return true;
  }
}
