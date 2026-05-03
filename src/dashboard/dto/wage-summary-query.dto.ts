import { IsOptional, IsString, Matches, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class WageSummaryQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;

  @IsOptional()
  @IsString()
  tz?: string;

  /** Org/super admins: compute wage summary for this user instead of self. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}
