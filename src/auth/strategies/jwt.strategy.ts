import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SuperAdmin } from '../../super-admin/entities/super-admin.entity';
import { TokenBlacklistService } from '../services/token-blacklist.service';

export interface JwtPayload {
  sub: number;
  email: string;
  tenantId?: number;
  role: string;
  type: 'user' | 'superadmin';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepository: Repository<SuperAdmin>,
    private readonly tokenBlacklistService: TokenBlacklistService,
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

  async validate(request: any, payload: JwtPayload) {
    // Extract token from request to check blacklist
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    
    // Check if token is blacklisted
    if (token && this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    if (payload.type === 'superadmin') {
      const superAdmin = await this.superAdminRepository.findOne({
        where: { id: payload.sub },
      });
      if (!superAdmin) {
        throw new UnauthorizedException();
      }
      return {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'SUPER_ADMIN',
        type: 'superadmin',
      };
    } else {
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenant'],
      });
      if (!user || !user.isActive || user.tenant.status !== 'active') {
        throw new UnauthorizedException();
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
        type: 'user',
      };
    }
  }
}
