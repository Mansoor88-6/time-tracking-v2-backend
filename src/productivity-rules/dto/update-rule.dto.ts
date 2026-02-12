import { IsNotEmpty, IsEnum } from 'class-validator';
import { AppCategory } from '../entities/team-productivity-rule.entity';

export class UpdateRuleDto {
  @IsEnum(AppCategory)
  @IsNotEmpty()
  category: AppCategory;
}
