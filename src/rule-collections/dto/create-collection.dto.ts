import { IsNotEmpty, IsString, IsOptional, IsArray, IsInt, ValidateNested, IsEnum, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { AppType, AppCategory, RuleType } from '../../productivity-rules/entities/team-productivity-rule.entity';

class RuleDto {
  @IsString()
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

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  teamIds: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules: RuleDto[];
}
