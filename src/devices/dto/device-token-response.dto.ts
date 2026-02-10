import { Device } from '../entities/device.entity';

export class DeviceTokenResponseDto {
  accessToken: string;
  deviceId: string;
  expiresIn: number; // seconds
  device: Device;
}
