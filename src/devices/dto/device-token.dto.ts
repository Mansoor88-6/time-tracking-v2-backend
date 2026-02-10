import { IsString, IsNotEmpty } from 'class-validator';

export class DeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
