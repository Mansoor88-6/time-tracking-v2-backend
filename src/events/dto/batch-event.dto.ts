import {
  IsArray,
  IsString,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventDto } from './event.dto';

export class BatchEventDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000) // Limit batch size for safety
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events: EventDto[];

  @IsString()
  deviceId: string;

  @IsNumber()
  @Min(0)
  batchTimestamp: number; // Unix timestamp in milliseconds
}
