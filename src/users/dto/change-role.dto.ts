import { IsEnum } from 'class-validator';
import { Roles } from '../../common/enums/roles.enum';

export class ChangeRoleDto {
  @IsEnum(Roles)
  role: Roles;
}
