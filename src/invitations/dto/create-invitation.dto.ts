import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { Roles } from '../../common/enums/roles.enum';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(Roles)
  role: Roles;

  @IsOptional()
  @IsArray()
  teamIds?: number[];
}

