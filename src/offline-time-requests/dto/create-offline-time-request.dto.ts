import {
  IsString,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
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
}
