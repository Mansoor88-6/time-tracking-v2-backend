import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export enum EventStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  AWAY = 'away',
  OFFLINE = 'offline',
}

export class EventDto {
  @IsString()
  deviceId: string;

  @IsNumber()
  @Min(0)
  timestamp: number; // Unix timestamp in milliseconds

  @IsEnum(EventStatus)
  status: EventStatus;

  @IsString()
  @IsOptional()
  application?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number; // milliseconds

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  projectId?: string;
}
