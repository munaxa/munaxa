import { Injectable } from '@nestjs/common';
import { Prisma, type Transaction } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

@Injectable()
export class TransactionRepository extends TenantRepository {
  create(data: Omit<Prisma.TransactionUncheckedCreateInput, 'tenantId'>): Promise<Transaction> {
    return this.run(async (tx, tenantId) => {
      const txn = await tx.transaction.create({
        data: { ...data, tenantId, recordedById: TenantContextStore.get()?.actorUserId ?? null },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.transaction.create',
        entityType: 'Transaction',
        entityId: txn.id,
        metadata: {
          studentId: txn.studentId,
          amount: txn.amount.toString(),
          method: txn.method,
        },
      });
      return txn;
    });
  }

  /** Set a PENDING transaction to VERIFIED or REJECTED, with an audit entry. */
  setStatus(id: string, status: 'VERIFIED' | 'REJECTED', note?: string): Promise<Transaction> {
    return this.run(async (tx, tenantId) => {
      const actor = TenantContextStore.get()?.actorUserId ?? null;
      const txn = await tx.transaction.update({
        where: { id },
        data: {
          status,
          verifiedById: actor,
          verifiedAt: new Date(),
          ...(note !== undefined ? { note } : {}),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: status === 'VERIFIED' ? 'finance.transaction.verify' : 'finance.transaction.reject',
        entityType: 'Transaction',
        entityId: txn.id,
        metadata: { amount: txn.amount.toString(), status },
      });
      return txn;
    });
  }

  findByStudent(studentId: string): Promise<Transaction[]> {
    return this.run((tx) =>
      tx.transaction.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  findById(id: string): Promise<Transaction | null> {
    return this.run((tx) => tx.transaction.findFirst({ where: { id } }));
  }

  sumVerifiedForStudent(studentId: string): Promise<Prisma.Decimal> {
    return this.run(async (tx) => {
      const result = await tx.transaction.aggregate({
        where: { studentId, status: 'VERIFIED' },
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
}
