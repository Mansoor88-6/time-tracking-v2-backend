import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class ColleaguesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(600)
  windowSec?: number;
}
