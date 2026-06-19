import { Injectable } from '@nestjs/common';
import type {
  BillingPolicy,
  DiscountRule,
  GradeFeeSchedule,
  Prisma,
  TransportFare,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

/**
 * Enrollment & billing configuration store (Phase 1): grade fee schedules, transport fares,
 * discount rules, and the per-tenant billing policy. Pure tenant-scoped CRUD; every write is
 * audited in the same transaction. Stamps createdBy/updatedBy from the request actor.
 */
@Injectable()
export class FeeConfigRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  // ── Grade fee schedules ──
  listGradeFees(academicYearId?: string): Promise<GradeFeeSchedule[]> {
    return this.run((tx) =>
      tx.gradeFeeSchedule.findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: [{ effectiveFrom: 'desc' }],
      }),
    );
  }

  createGradeFee(
    data: Omit<Prisma.GradeFeeScheduleUncheckedCreateInput, 'tenantId' | 'createdById'>,
  ): Promise<GradeFeeSchedule> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.gradeFeeSchedule.create({
        data: { ...data, tenantId, createdById: this.actor(), updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.gradeFee.create',
        entityType: 'GradeFeeSchedule',
        entityId: row.id,
        metadata: { gradeId: row.gradeId, tuitionFee: row.tuitionFee.toString() },
      });
      return row;
    });
  }

  updateGradeFee(id: string, data: Prisma.GradeFeeScheduleUpdateInput): Promise<GradeFeeSchedule> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.gradeFeeSchedule.update({
        where: { id },
        data: { ...data, updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.gradeFee.update',
        entityType: 'GradeFeeSchedule',
        entityId: id,
      });
      return row;
    });
  }

  // ── Transport fares ──
  listTransportFares(academicYearId?: string): Promise<TransportFare[]> {
    return this.run((tx) =>
      tx.transportFare.findMany({
        where: academicYearId ? { academicYearId } : {},
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
  }

  createTransportFare(
    data: Omit<Prisma.TransportFareUncheckedCreateInput, 'tenantId' | 'createdById'>,
  ): Promise<TransportFare> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.transportFare.create({
        data: { ...data, tenantId, createdById: this.actor(), updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.transportFare.create',
        entityType: 'TransportFare',
        entityId: row.id,
        metadata: { direction: row.direction, amount: row.amount.toString() },
      });
      return row;
    });
  }

  updateTransportFare(id: string, data: Prisma.TransportFareUpdateInput): Promise<TransportFare> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.transportFare.update({
        where: { id },
        data: { ...data, updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.transportFare.update',
        entityType: 'TransportFare',
        entityId: id,
      });
      return row;
    });
  }

  // ── Discount rules ──
  listDiscountRules(): Promise<DiscountRule[]> {
    return this.run((tx) => tx.discountRule.findMany({ orderBy: { createdAt: 'desc' } }));
  }

  findDiscountRule(id: string): Promise<DiscountRule | null> {
    return this.run((tx) => tx.discountRule.findFirst({ where: { id } }));
  }

  createDiscountRule(
    data: Omit<Prisma.DiscountRuleUncheckedCreateInput, 'tenantId' | 'createdById'>,
  ): Promise<DiscountRule> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.discountRule.create({
        data: { ...data, tenantId, createdById: this.actor(), updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.discountRule.create',
        entityType: 'DiscountRule',
        entityId: row.id,
        metadata: { name: row.name, type: row.type },
      });
      return row;
    });
  }

  updateDiscountRule(id: string, data: Prisma.DiscountRuleUpdateInput): Promise<DiscountRule> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.discountRule.update({
        where: { id },
        data: { ...data, updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.discountRule.update',
        entityType: 'DiscountRule',
        entityId: id,
      });
      return row;
    });
  }

  // ── Billing policy (singleton per tenant) ──
  getPolicy(): Promise<BillingPolicy | null> {
    return this.run((tx, tenantId) => tx.billingPolicy.findUnique({ where: { tenantId } }));
  }

  upsertPolicy(
    data: Omit<Prisma.BillingPolicyUncheckedCreateInput, 'tenantId' | 'id' | 'createdById'>,
  ): Promise<BillingPolicy> {
    return this.run(async (tx, tenantId) => {
      const row = await tx.billingPolicy.upsert({
        where: { tenantId },
        create: { ...data, tenantId, createdById: this.actor(), updatedById: this.actor() },
        update: { ...data, updatedById: this.actor() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.feeconfig.policy.upsert',
        entityType: 'BillingPolicy',
        entityId: row.id,
      });
      return row;
    });
  }
}
