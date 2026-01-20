import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '../services/tenant-context.service';

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  tenantId?: number;
  role: string;
  type: 'user' | 'superadmin';
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private tenantContextService: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from JWT payload if available
    // The JWT guard will attach user info to req.user
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (user && user.tenantId) {
      this.tenantContextService.setTenantId(user.tenantId);
    }
    // SuperAdmin requests don't have tenant context
    next();
  }
}
