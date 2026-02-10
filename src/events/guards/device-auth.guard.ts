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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DeviceJwtPayload } from '../../auth/strategies/device-jwt.strategy';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check if Authorization header with Bearer token exists
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        // Verify and decode JWT token
        const secret = this.configService.get<string>('jwt.secret') ||
          'your-secret-key-change-in-production';
        const payload = this.jwtService.verify<DeviceJwtPayload>(token, { secret });
        
        if (payload.type !== 'device') {
          throw new UnauthorizedException('Invalid token type');
        }

        // Verify device exists and is authorized
        const device = await this.deviceRepository.findOne({
          where: {
            deviceId: payload.sub,
            isAuthorized: true,
          },
          relations: ['user', 'tenant'],
        });

        if (!device) {
          throw new ForbiddenException('Device not found or not authorized');
        }

        // Verify device is still linked to the same user/tenant
        if (device.userId !== payload.userId || device.tenantId !== payload.tenantId) {
          throw new UnauthorizedException('Device authorization mismatch');
        }

        // Update last seen
        device.lastSeenAt = new Date();
        await this.deviceRepository.save(device);

        // Attach device, user, and tenant info to request
        request.device = device;
        request.user = device.user;
        request.tenantId = device.tenantId;

        return true;
      } catch (error) {
        // JWT validation failed, fall through to deviceId lookup
        if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
          throw error;
        }
        // For other errors (expired token, invalid signature, etc.), fall through
      }
    }

    // Fallback to deviceId in body (backward compatibility)
    const deviceId = request.body?.deviceId;

    if (!deviceId) {
      throw new UnauthorizedException('Device ID or token is required');
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
