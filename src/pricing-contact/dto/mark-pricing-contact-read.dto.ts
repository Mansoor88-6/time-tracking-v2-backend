import { IsBoolean, IsOptional } from 'class-validator';

export class MarkPricingContactReadDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
