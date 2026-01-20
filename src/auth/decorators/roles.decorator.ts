import { SetMetadata } from '@nestjs/common';
import { Roles } from '../../common/enums/roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Use this decorator to restrict a route to the given roles.
 *
 * Example:
 *   @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN)
 */
export const RolesDecorator = (...roles: Roles[]) =>
  SetMetadata(ROLES_KEY, roles);
