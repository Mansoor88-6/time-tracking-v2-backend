import { IsNotEmpty, IsInt, IsString, IsEnum } from 'class-validator';
import { AppType, AppCategory } from '../entities/team-productivity-rule.entity';

export class CreateRuleDto {
  @IsInt()
  @IsNotEmpty()
  teamId: number;

  @IsString()
  @IsNotEmpty()
  appName: string;

  @IsEnum(AppType)
  @IsNotEmpty()
  appType: AppType;

  @IsEnum(AppCategory)
  @IsNotEmpty()
  category: AppCategory;
}
