import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SessionClientType } from '../../sessions/entities/user-session.entity';

export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsEnum(SessionClientType)
  clientType?: SessionClientType;
}

