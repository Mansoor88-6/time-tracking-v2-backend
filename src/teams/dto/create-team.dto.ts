import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  managerId?: number;
}

