import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateSuperAdminDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  @IsString()
  password: string;
}
