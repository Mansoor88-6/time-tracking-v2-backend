import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeclineOfflineTimeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
