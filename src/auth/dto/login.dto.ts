import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export enum UserType {
  USER = 'user',
  SUPERADMIN = 'superadmin',
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserType)
  userType: UserType;
}
