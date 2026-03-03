import { IsNotEmpty, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { AppCategory } from '../entities/team-productivity-rule.entity';

export class ClassifyUnclassifiedDto {
  @IsInt()
  @Type(() => Number)
  unclassifiedId: number;

  @IsEnum(AppCategory)
  @IsNotEmpty()
  category: AppCategory;

  @IsInt()
  @Type(() => Number)
  collectionId: number;
}
