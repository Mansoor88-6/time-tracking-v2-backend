import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '../../tenants/services/tenant-context.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private tenantContextService: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip tenant validation for SuperAdmin
    if (user && user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Ensure user belongs to the tenant they're accessing
    let tenantId = this.tenantContextService.getTenantId();

    // If tenant context is not set (middleware ran before auth), try to set it from user
    if (!tenantId && user && user.tenantId) {
      this.tenantContextService.setTenantId(user.tenantId);
      tenantId = user.tenantId;
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant context not found');
    }

    if (user && user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: tenant mismatch');
    }

    return true;
  }
}
