import { Injectable } from '@nestjs/common';
import type { FeePlan, Prisma } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class FeePlanRepository extends TenantRepository {
  create(data: Omit<Prisma.FeePlanUncheckedCreateInput, 'tenantId'>): Promise<FeePlan> {
    return this.run(async (tx, tenantId) => {
      const plan = await tx.feePlan.create({ data: { ...data, tenantId } });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeplan.create',
        entityType: 'FeePlan',
        entityId: plan.id,
        metadata: { name: plan.name, amount: plan.amount.toString() },
      });
      return plan;
    });
  }

  findMany(): Promise<FeePlan[]> {
    return this.run((tx) => tx.feePlan.findMany({ orderBy: { createdAt: 'desc' } }));
  }

  findById(id: string): Promise<FeePlan | null> {
    return this.run((tx) => tx.feePlan.findFirst({ where: { id } }));
  }

  update(id: string, data: Prisma.FeePlanUpdateInput): Promise<FeePlan> {
    return this.run((tx) => tx.feePlan.update({ where: { id }, data }));
  }
}
