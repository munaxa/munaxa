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
