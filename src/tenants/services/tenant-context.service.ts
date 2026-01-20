import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantId: number | null = null;

  setTenantId(tenantId: number): void {
    this.tenantId = tenantId;
  }

  getTenantId(): number | null {
    return this.tenantId;
  }

  clearTenantId(): void {
    this.tenantId = null;
  }

  hasTenantContext(): boolean {
    return this.tenantId !== null;
  }
}
