import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withTenant, type TxClient } from '../prisma/tenant.helpers';
import { TenantContextStore } from '../prisma/tenant-context';
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

  /**
   * Write an audit log entry inside the SAME transaction as a state change, so the action and
   * its audit commit together (mandatory for financial actions — see Phase 9 / doc 10).
   */
  protected writeAudit(
    tx: TxClient,
    tenantId: string,
    params: {
      action: string;
      entityType: string;
      entityId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<unknown> {
    return tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: TenantContextStore.get()?.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      },
    });
  }
}
