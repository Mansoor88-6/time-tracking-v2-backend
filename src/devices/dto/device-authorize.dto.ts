import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class DeviceAuthorizeDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false }) // Allow localhost
  redirectUri?: string;

  @IsString()
  @IsOptional()
  token?: string; // JWT token for authentication (passed from login redirect)
}
