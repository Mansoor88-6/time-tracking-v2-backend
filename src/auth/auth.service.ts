import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { comparePassword } from '../common/utils/password.util';
import { JwtPayload } from './strategies/jwt.strategy';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { SessionsService } from '../sessions/sessions.service';
import { SessionClientType } from '../sessions/entities/user-session.entity';
import { User } from '../users/entities/user.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { TenantStatus } from '../common/enums/tenant-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private superAdminService: SuperAdminService,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
    private sessionsService: SessionsService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive || user.tenant.status !== TenantStatus.ACTIVE) {
      return null;
    }

    const { password: _password, ...rest } = user;
    void _password;
    return rest as User;
  }

  async validateSuperAdmin(
    email: string,
    password: string,
  ): Promise<SuperAdmin | null> {
    const superAdmin = await this.superAdminService.findByEmail(email);
    if (!superAdmin) {
      return null;
    }

    const isPasswordValid = await comparePassword(
      password,
      superAdmin.password,
    );
    if (!isPasswordValid) {
      return null;
    }

    const { password: _password, ...rest } = superAdmin;
    void _password;
    return rest as SuperAdmin;
  }

  async login(
    user: User,
    options?: {
      deviceId?: string;
      deviceName?: string;
      userAgent?: string;
      ipAddress?: string;
      clientType?: SessionClientType;
    },
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      type: 'user',
    };

    const accessToken = this.jwtService.sign(payload);

    // Default refresh token validity to 7 days
    const refreshTokenOptions: JwtSignOptions = {
      expiresIn: '7d',
    };
    const refreshToken = this.jwtService.sign(payload, refreshTokenOptions);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.sessionsService.createSession({
      userId: user.id,
      tenantId: user.tenantId,
      refreshToken,
      expiresAt: refreshExpiresAt,
      deviceId: options?.deviceId,
      deviceName: options?.deviceName,
      userAgent: options?.userAgent,
      ipAddress: options?.ipAddress,
      clientType: options?.clientType ?? SessionClientType.WEB,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
      },
    };
  }

  async loginSuperAdmin(superAdmin: SuperAdmin) {
    const payload: JwtPayload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
      type: 'superadmin',
    };

    const accessToken = this.jwtService.sign(payload);

    // Super-admins can also use refresh tokens for long-lived sessions
    const refreshTokenOptions: JwtSignOptions = {
      expiresIn: '7d',
    };
    const refreshToken = this.jwtService.sign(payload, refreshTokenOptions);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.sessionsService.createSession({
      userId: superAdmin.id,
      tenantId: 0,
      refreshToken,
      expiresAt: refreshExpiresAt,
      clientType: SessionClientType.WEB,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'SUPER_ADMIN',
      },
    };
  }

  generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(refreshToken);

      const session = await this.sessionsService.findValidSessionByToken(
        decoded.sub,
        refreshToken,
      );

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload: JwtPayload = {
        sub: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        role: decoded.role,
        type: decoded.type,
      };

      const newAccessToken = this.jwtService.sign(newPayload);

      return {
        accessToken: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // Decode token to get expiration time and user id
      const decodedRaw = this.jwtService.decode(token);
      const decoded =
        decodedRaw && typeof decodedRaw === 'object' ? decodedRaw : null;

      if (decoded && typeof decoded.exp === 'number') {
        // Convert expiration time from seconds to milliseconds
        const expiresAt = decoded.exp * 1000;
        // Add token to blacklist
        this.tokenBlacklistService.addToken(token, expiresAt);

        // Also revoke all sessions for this user for now (can be refined later
        // to a single session when sessionId is embedded in the JWT).
        if (decoded.sub) {
          await this.sessionsService.revokeAllUserSessions(decoded.sub);
        }
      } else {
        // If we can't decode, add with a default expiration (24 hours from now)
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        this.tokenBlacklistService.addToken(token, expiresAt);
      }
    } catch {
      // Even if decoding fails, add token to blacklist with default expiration
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      this.tokenBlacklistService.addToken(token, expiresAt);
    }
  }
}
