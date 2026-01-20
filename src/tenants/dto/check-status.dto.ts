import { IsEmail } from 'class-validator';

export class CheckStatusDto {
  @IsEmail()
  email: string;
}

