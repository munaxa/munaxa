import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { withTenant } from '../prisma/tenant.helpers';

/**
 * Resolves whether a per-tenant feature flag is enabled. Used by the {@link FeatureFlagGuard},
 * which runs before the tenant context is bound, so the tenant id is passed explicitly and the
 * query runs under RLS via `withTenant`.
 *
 * Absence of a flag row means **disabled** — every advanced module is off until a tenant opts in.
 */
@Injectable()
export class FeatureGate {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(tenantId: string, key: string): Promise<boolean> {
    return withTenant(this.prisma, tenantId, async (tx) => {
      const flag = await tx.featureFlag.findFirst({ where: { key }, select: { enabled: true } });
      return flag?.enabled ?? false;
    });
  }
}
