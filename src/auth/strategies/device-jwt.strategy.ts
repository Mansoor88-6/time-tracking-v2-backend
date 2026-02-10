import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

export interface DeviceJwtPayload {
  sub: string; // deviceId
  userId: number;
  tenantId: number;
  type: 'device';
  iat?: number;
  exp?: number;
}

@Injectable()
export class DeviceJwtStrategy extends PassportStrategy(Strategy, 'device-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {
    const secret =
      configService.get<string>('jwt.secret') ||
      'your-secret-key-change-in-production';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: DeviceJwtPayload) {
    // Verify payload type
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
      throw new UnauthorizedException('Device not found or not authorized');
    }

    // Verify device is still linked to the same user/tenant
    if (device.userId !== payload.userId || device.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('Device authorization mismatch');
    }

    // Update last seen
    device.lastSeenAt = new Date();
    await this.deviceRepository.save(device);

    return {
      deviceId: payload.sub,
      userId: payload.userId,
      tenantId: payload.tenantId,
      device,
      user: device.user,
      tenant: device.tenant,
    };
  }
}
