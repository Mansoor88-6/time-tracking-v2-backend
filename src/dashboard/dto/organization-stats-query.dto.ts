import { IsString, IsOptional, Matches } from 'class-validator';

/**
 * Organization Dashboard Stats Query DTO
 *
 * Validates query parameters for organization dashboard stats endpoint.
 */
export class OrganizationStatsQueryDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string; // YYYY-MM-DD, for single date queries

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate?: string; // YYYY-MM-DD, for date range queries

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string; // YYYY-MM-DD, for date range queries

  @IsString()
  @IsOptional()
  tz?: string; // IANA timezone, e.g., 'Asia/Karachi'

  @IsOptional()
  userId?: number | number[]; // Single user ID or array of user IDs to filter by

  @IsOptional()
  teamId?: number | number[]; // Single team ID or array of team IDs to filter by
}
