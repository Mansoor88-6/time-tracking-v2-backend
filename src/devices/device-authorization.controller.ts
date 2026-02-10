import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { DeviceAuthorizationService } from './device-authorization.service';
import { DeviceAuthorizeDto } from './dto/device-authorize.dto';
import { DeviceTokenDto } from './dto/device-token.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';

@Controller('auth/device')
export class DeviceAuthorizationController {
  constructor(
    private readonly deviceAuthService: DeviceAuthorizationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepository: Repository<SuperAdmin>,
  ) {}

  /**
   * Device authorization endpoint
   * Opens in browser, user logs in, then redirects to callback with code
   */
  @Get('authorize')
  @Public() // Public endpoint, but requires login (handled by guard check)
  async authorize(
    @Query() query: DeviceAuthorizeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { deviceId, deviceName, redirectUri = 'http://localhost:8080/callback', token } = query;

    if (!deviceId) {
      throw new UnauthorizedException('Device ID is required');
    }

    // Validate redirect URI (must be localhost for security)
    if (!redirectUri.startsWith('http://localhost:') && 
        !redirectUri.startsWith('https://localhost:')) {
      throw new UnauthorizedException('Invalid redirect URI. Only localhost is allowed.');
    }

    // Check if user is authenticated
    // First try to get from request (set by JWT guard)
    let user = (req as any).user;
    
    // If not set, try to get from query parameter (token passed from login redirect)
    if (!user && token) {
      try {
        const secret = this.configService.get<string>('jwt.secret') ||
          'your-secret-key-change-in-production';
        const payload = this.jwtService.verify(token, { secret }) as any;
        
        if (payload.type === 'superadmin') {
          const superAdmin = await this.superAdminRepository.findOne({
            where: { id: payload.sub },
          });
          if (superAdmin) {
            user = {
              id: superAdmin.id,
              email: superAdmin.email,
              name: superAdmin.name,
              tenantId: undefined,
              role: 'SUPER_ADMIN',
              type: 'superadmin',
            };
          }
        } else {
          const userEntity = await this.userRepository.findOne({
            where: { id: payload.sub },
            relations: ['tenant'],
          });
          if (userEntity && userEntity.isActive && userEntity.tenant.status === 'active') {
            user = {
              id: userEntity.id,
              email: userEntity.email,
              name: userEntity.name,
              tenantId: userEntity.tenantId,
              role: userEntity.role,
              type: 'user',
            };
          }
        }
        } catch {
          // Token invalid, continue to login redirect
        }
    }
    
    if (!user) {
      // Not authenticated - redirect to login with return URL
      const loginUrl = `/auth/login?returnUrl=${encodeURIComponent(
        `/auth/device/authorize?deviceId=${deviceId}&redirectUri=${encodeURIComponent(redirectUri)}${deviceName ? `&deviceName=${encodeURIComponent(deviceName)}` : ''}`
      )}`;
      return res.redirect(loginUrl);
    }

    // User is authenticated - create authorization code
    try {
      const code = await this.deviceAuthService.createAuthorizationCode(
        deviceId,
        user.id,
        user.tenantId,
        redirectUri,
        deviceName,
      );

      // Redirect to callback with code
      const callbackUrl = `${redirectUri}?code=${code}`;
      return res.redirect(callbackUrl);
    } catch {
      throw new UnauthorizedException('Failed to create authorization code');
    }
  }

  /**
   * Exchange authorization code for device token
   * Called by agent after receiving code from callback
   */
  @Post('token')
  @Public()
  async exchangeToken(@Body() dto: DeviceTokenDto) {
    return this.deviceAuthService.validateAndExchangeCode(dto.code, dto.deviceId);
  }
}
