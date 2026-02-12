import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRuleDto } from './create-rule.dto';

export class BulkCreateRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRuleDto)
  rules: CreateRuleDto[];
}
