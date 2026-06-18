import { Injectable } from '@nestjs/common';
import { Prisma, type Charge } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

@Injectable()
export class ChargeRepository extends TenantRepository {
  create(data: Omit<Prisma.ChargeUncheckedCreateInput, 'tenantId'>): Promise<Charge> {
    return this.run(async (tx, tenantId) => {
      const charge = await tx.charge.create({
        data: { ...data, tenantId, createdById: TenantContextStore.get()?.actorUserId ?? null },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.charge.create',
        entityType: 'Charge',
        entityId: charge.id,
        metadata: { studentId: charge.studentId, amount: charge.amount.toString() },
      });
      return charge;
    });
  }

  findByStudent(studentId: string): Promise<Charge[]> {
    return this.run((tx) =>
      tx.charge.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  /** Active (non-cancelled) installment charges for a student, earliest due first. */
  installmentCharges(studentId: string): Promise<Charge[]> {
    return this.run((tx) =>
      tx.charge.findMany({
        where: { studentId, installmentPlanId: { not: null }, status: { not: 'CANCELLED' } },
        orderBy: { dueDate: 'asc' },
      }),
    );
  }

  /** Cancel a pending installment and detach it from its plan (no payments to preserve). */
  cancelInstallment(id: string): Promise<Charge> {
    return this.run(async (tx, tenantId) => {
      const charge = await tx.charge.update({
        where: { id },
        data: { status: 'CANCELLED', installmentPlanId: null },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.installment.cancel',
        entityType: 'Charge',
        entityId: id,
      });
      return charge;
    });
  }

  /** Detach a paid/partly-paid installment from its plan, keeping the charge & its payments. */
  detachInstallment(id: string): Promise<Charge> {
    return this.run((tx) => tx.charge.update({ where: { id }, data: { installmentPlanId: null } }));
  }

  /** Resize an installment charge (used when rebalancing a plan after an over/under payment). */
  updateAmount(id: string, amount: number): Promise<Charge> {
    return this.run(async (tx, tenantId) => {
      const charge = await tx.charge.update({
        where: { id },
        data: { amount: new Prisma.Decimal(amount.toFixed(3)) },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.installment.resize',
        entityType: 'Charge',
        entityId: id,
        metadata: { amount: charge.amount.toString() },
      });
      return charge;
    });
  }

  sumForStudent(studentId: string): Promise<Prisma.Decimal> {
    return this.run(async (tx) => {
      const result = await tx.charge.aggregate({
        where: { studentId, status: { notIn: ['CANCELLED', 'WAIVED'] } },
        _sum: { amount: true },
      });
      return result._sum.amount ?? new Prisma.Decimal(0);
    });
  }

  studentExists(studentId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.student.findFirst({ where: { id: studentId, deletedAt: null } })) !== null,
    );
  }

  feePlanExists(feePlanId: string): Promise<boolean> {
    return this.run(
      async (tx) => (await tx.feePlan.findFirst({ where: { id: feePlanId } })) !== null,
    );
  }
}
