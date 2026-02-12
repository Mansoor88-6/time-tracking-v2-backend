import { IsString, IsOptional, Matches, ValidateIf } from 'class-validator';

/**
 * Dashboard Stats Query DTO
 *
 * Validates query parameters for dashboard stats endpoint.
 */
export class DashboardStatsQueryDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string; // YYYY-MM-DD, defaults to today

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  @ValidateIf((o) => o.endDate !== undefined)
  startDate?: string; // YYYY-MM-DD, for date range queries

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  @ValidateIf((o) => o.startDate !== undefined)
  endDate?: string; // YYYY-MM-DD, for date range queries

  @IsString()
  @IsOptional()
  tz?: string; // IANA timezone, e.g., 'Asia/Karachi'
}
