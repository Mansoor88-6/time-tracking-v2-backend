import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { UsersModule } from '../users/users.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { User } from '../users/entities/user.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, SuperAdmin]),
    forwardRef(() => UsersModule),
    forwardRef(() => SuperAdminModule),
    SessionsModule,
    PasswordResetModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('jwt.expiresIn') || '24h';
        return {
          secret:
            configService.get<string>('jwt.secret') ||
            'your-secret-key-change-in-production',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, TokenBlacklistService],
  exports: [AuthService, TokenBlacklistService],
})
export class AuthModule {}
