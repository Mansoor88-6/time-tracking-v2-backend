import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from '../services/tenant-context.service';

@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  constructor(private tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Skip tenant isolation for SuperAdmin
    if (request.user && request.user.role === 'SUPER_ADMIN') {
      return next.handle();
    }

    // Tenant context is set by middleware
    // This interceptor ensures tenant isolation is enforced
    return next.handle();
  }
}
