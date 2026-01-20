import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SetupPasswordDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
