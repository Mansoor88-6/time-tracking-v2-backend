import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, UserType } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DeviceInfoDto } from './dto/device-info.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { ExtractJwt } from 'passport-jwt';
import { PasswordResetService } from '../password-reset/password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto & { device?: DeviceInfoDto }) {
    if (loginDto.userType === UserType.SUPERADMIN) {
      const superAdmin = await this.authService.validateSuperAdmin(
        loginDto.email,
        loginDto.password,
      );
      if (!superAdmin) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return this.authService.loginSuperAdmin(superAdmin);
    } else {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return this.authService.login(user, {
        deviceId: loginDto.device?.deviceId,
        deviceName: loginDto.device?.deviceName,
        userAgent: loginDto.device?.userAgent,
        ipAddress: loginDto.device?.ipAddress,
        clientType: loginDto.device?.clientType,
      });
    }
  }

  @Public()
  @Post('login/superadmin')
  async loginSuperAdmin(@Body() loginDto: LoginDto) {
    const superAdmin = await this.authService.validateSuperAdmin(
      loginDto.email,
      loginDto.password,
    );
    if (!superAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.loginSuperAdmin(superAdmin);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const token = await this.passwordResetService.createResetToken(dto.email);
    // In production you would not return the token; here it's useful for dev.
    return {
      message: 'If an account exists, a reset email has been sent.',
      token,
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: ExpressRequest & { user?: unknown }) {
    // `req.user` is populated by JwtAuthGuard
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: ExpressRequest) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    await this.authService.logout(token);

    return {
      message: 'Logged out successfully',
    };
  }
}
