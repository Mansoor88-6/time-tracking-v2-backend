import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  managerId?: number | null;
}

