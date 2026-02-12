import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { AppType, AppCategory } from '../entities/team-productivity-rule.entity';

export class ClassifyUnclassifiedDto {
  @IsString()
  @IsNotEmpty()
  appName: string;

  @IsEnum(AppType)
  @IsNotEmpty()
  appType: AppType;

  @IsEnum(AppCategory)
  @IsNotEmpty()
  category: AppCategory;

  @IsOptional()
  @IsInt()
  applyToTeamId?: number;
}
