import {
  IsString,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { OfflineTimeCategory } from '../enums/offline-time-category.enum';

export class CreateOfflineTimeRequestDto {
  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;

  @IsEnum(OfflineTimeCategory)
  category: OfflineTimeCategory;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  @Matches(/^[0-9a-f-]{36}$/i, {
    message: 'submitBatchId must be a UUID when provided',
  })
  submitBatchId?: string;
}
