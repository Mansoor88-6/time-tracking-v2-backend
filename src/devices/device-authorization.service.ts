import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceAuthorizationCode } from './entities/device-authorization-code.entity';
import { DevicesService } from './devices.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class DeviceAuthorizationService {
  constructor(
    @InjectRepository(DeviceAuthorizationCode)
    private readonly authCodeRepository: Repository<DeviceAuthorizationCode>,
    private readonly devicesService: DevicesService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Creates an authorization code for device registration
   */
  async createAuthorizationCode(
    deviceId: string,
    userId: number,
    tenantId: number,
    redirectUri: string = 'http://localhost:8080/callback',
    deviceName?: string,
  ): Promise<string> {
    // Generate random authorization code (32 bytes = 64 hex characters)
    const code = crypto.randomBytes(32).toString('hex');

    // Code expires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const authCode = this.authCodeRepository.create({
      code,
      deviceId,
      userId,
      tenantId,
      redirectUri,
      deviceName,
      expiresAt,
    });

    await this.authCodeRepository.save(authCode);

    return code;
  }

  /**
   * Validates and exchanges authorization code for device token
   */
  async validateAndExchangeCode(
    code: string,
    deviceId: string,
  ): Promise<{
    accessToken: string;
    deviceId: string;
    expiresIn: number;
    device: any;
  }> {
    // Find the authorization code
    const authCode = await this.authCodeRepository.findOne({
      where: { code, deviceId },
      relations: ['user', 'tenant'],
    });

    if (!authCode) {
      throw new NotFoundException('Invalid authorization code');
    }

    // Check if code is expired
    if (new Date() > authCode.expiresAt) {
      throw new BadRequestException('Authorization code has expired');
    }

    // Check if code was already used
    if (authCode.usedAt) {
      throw new BadRequestException('Authorization code has already been used');
    }

    // Check if user and tenant are set
    if (!authCode.userId || !authCode.tenantId) {
      throw new BadRequestException('Authorization code is not associated with a user');
    }

    // Register or authorize the device
    const device = await this.devicesService.registerOrAuthorizeDevice(
      authCode.userId,
      authCode.tenantId,
      deviceId,
      authCode.deviceName || undefined,
    );

    // Mark code as used
    authCode.usedAt = new Date();
    await this.authCodeRepository.save(authCode);

    // Generate device JWT token
    const tokenPayload = {
      sub: deviceId,
      userId: authCode.userId,
      tenantId: authCode.tenantId,
      type: 'device',
    };

    // Token expires in 30 days
    const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: `${expiresIn}s`,
    });

    return {
      accessToken,
      deviceId,
      expiresIn,
      device,
    };
  }

  /**
   * Cleanup expired authorization codes (background job)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.authCodeRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
