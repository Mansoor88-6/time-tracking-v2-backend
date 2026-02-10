import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Device } from './entities/device.entity';
import { DeviceAuthorizationCode } from './entities/device-authorization-code.entity';
import { User } from '../users/entities/user.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DeviceAuthorizationController } from './device-authorization.controller';
import { DeviceAuthorizationService } from './device-authorization.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceAuthorizationCode, User, SuperAdmin]),
    TenantsModule,
    ConfigModule,
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
  controllers: [DevicesController, DeviceAuthorizationController],
  providers: [DevicesService, DeviceAuthorizationService],
  exports: [DevicesService, DeviceAuthorizationService],
})
export class DevicesModule {}

