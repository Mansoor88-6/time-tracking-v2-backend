import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateSuperAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  @IsString()
  password?: string;
}
