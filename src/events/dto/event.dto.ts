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

  @IsString()
  @IsOptional()
  source?: 'browser' | 'app';

  @IsNumber()
  @IsOptional()
  tabId?: number;

  @IsNumber()
  @IsOptional()
  windowId?: number;

  @IsNumber()
  @IsOptional()
  sequence?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  startTime?: number; // Unix timestamp in milliseconds

  @IsNumber()
  @Min(0)
  @IsOptional()
  endTime?: number; // Unix timestamp in milliseconds

  @IsNumber()
  @Min(0)
  @IsOptional()
  activeDuration?: number; // milliseconds

  @IsNumber()
  @Min(0)
  @IsOptional()
  idleDuration?: number; // milliseconds
}
