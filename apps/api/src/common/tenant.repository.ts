import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { withTenant, type TxClient } from '../prisma/tenant.helpers';
import { requireTenantId } from './tenant.util';

/**
 * Base repository for tenant-scoped data access. Every operation runs inside a
 * `withTenant` transaction so PostgreSQL RLS physically scopes it to the active tenant
 * (resolved from the request-scoped TenantContext). The explicit `tenantId` is also
 * available to stamp on writes.
 */
@Injectable()
export abstract class TenantRepository {
  constructor(protected readonly prisma: PrismaService) {}

  /** Run a unit of work scoped to the current tenant. */
  protected run<T>(fn: (tx: TxClient, tenantId: string) => Promise<T>): Promise<T> {
    const tenantId = requireTenantId();
    return withTenant(this.prisma, tenantId, (tx) => fn(tx, tenantId));
  }
}
