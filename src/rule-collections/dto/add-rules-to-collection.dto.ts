import { IsArray, IsNotEmpty, ValidateNested, IsOptional, IsString, IsEnum, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { AppType, AppCategory, RuleType } from '../../productivity-rules/entities/team-productivity-rule.entity';

class RuleDto {
  @IsNotEmpty()
  appName: string;

  @IsNotEmpty()
  appType: AppType;

  @IsNotEmpty()
  category: AppCategory;

  @IsOptional()
  @IsEnum(RuleType)
  ruleType?: RuleType;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9.\-*\/:]+$/, {
    message: 'Pattern contains invalid characters. Use alphanumeric, dots, dashes, slashes, colons, and wildcards (*) only.',
  })
  pattern?: string;
}

export class AddRulesToCollectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  @IsNotEmpty()
  rules: RuleDto[];
}
