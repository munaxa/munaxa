import { Injectable } from '@nestjs/common';
import { Prisma, type Transaction } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

/** A payment row enriched for the statement: who recorded it + its linked JoFotara document. */
export interface DetailedTransaction extends Transaction {
  /** Display name of the cashier who recorded the payment (null when unknown). */
  recordedByName: string | null;
  /** The linked e-invoice (JoFotara) document, if one was issued. */
  einvoice: { invoiceNumber: string; status: string; docType: string } | null;
}

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
      // A receipt = confirmed money, so allocate the gapless per-tenant receipt number only on
      // VERIFY. Row-lock the counter (lazily created) in this same transaction — identical to the
      // JoFotara ICV allocation — so numbers are sequential with no gaps or duplicates.
      let receiptNo: number | undefined;
      if (status === 'VERIFIED') {
        await tx.$executeRaw`INSERT INTO "FinanceReceiptCounter" ("id","tenantId") VALUES (gen_random_uuid(), ${tenantId}::uuid) ON CONFLICT ("tenantId") DO NOTHING`;
        const rows = await tx.$queryRaw<{ next: number }[]>`
          UPDATE "FinanceReceiptCounter" SET "nextReceiptNo" = "nextReceiptNo" + 1
          WHERE "tenantId" = ${tenantId}::uuid
          RETURNING "nextReceiptNo" - 1 AS "next"`;
        receiptNo = rows[0]!.next;
      }
      const txn = await tx.transaction.update({
        where: { id },
        data: {
          status,
          verifiedById: actor,
          verifiedAt: new Date(),
          ...(receiptNo !== undefined ? { receiptNo } : {}),
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

  /**
   * Payments for the statement, enriched with the cashier's display name and the linked JoFotara
   * document. Cashier names are batch-resolved (recordedById is a plain ref, not a FK relation).
   */
  findDetailedByStudent(studentId: string): Promise<DetailedTransaction[]> {
    return this.run(async (tx) => {
      const txns = await tx.transaction.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        include: {
          einvoiceDocuments: {
            select: { invoiceNumber: true, status: true, docType: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      const recordedIds = [...new Set(txns.map((t) => t.recordedById).filter(Boolean))] as string[];
      const users = recordedIds.length
        ? await tx.user.findMany({
            where: { id: { in: recordedIds } },
            select: { id: true, firstNameEn: true, lastNameEn: true, email: true },
          })
        : [];
      const nameById = new Map(
        users.map((u) => [
          u.id,
          [u.firstNameEn, u.lastNameEn].filter(Boolean).join(' ').trim() || u.email,
        ]),
      );
      return txns.map(({ einvoiceDocuments, ...t }) => ({
        ...t,
        recordedByName: t.recordedById ? (nameById.get(t.recordedById) ?? null) : null,
        einvoice: einvoiceDocuments[0]
          ? {
              invoiceNumber: einvoiceDocuments[0].invoiceNumber,
              status: einvoiceDocuments[0].status,
              docType: einvoiceDocuments[0].docType,
            }
          : null,
      }));
    });
  }

  findById(id: string): Promise<Transaction | null> {
    return this.run((tx) => tx.transaction.findFirst({ where: { id } }));
  }

  /** Student display name + the best parent email (primary first) for settlement notifications. */
  studentNotifyContact(
    studentId: string,
  ): Promise<{ studentNameEn: string; parentEmail: string | null }> {
    return this.run(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: studentId },
        select: {
          firstNameEn: true,
          lastNameEn: true,
          parentLinks: {
            orderBy: { isPrimary: 'desc' },
            select: { parent: { select: { email: true } } },
          },
        },
      });
      const studentNameEn = student ? `${student.firstNameEn} ${student.lastNameEn}`.trim() : '';
      const parentEmail = student?.parentLinks.map((l) => l.parent.email).find(Boolean) ?? null;
      return { studentNameEn, parentEmail };
    });
  }

  /** The tenant's display name, for email subject/signature. */
  tenantName(): Promise<string> {
    return this.run(async (tx, tenantId) => {
      const t = await tx.tenant.findFirst({ where: { id: tenantId }, select: { name: true } });
      return t?.name ?? 'School';
    });
  }

  /**
   * Resolve THIS school's parent-notification sender identity:
   *  - if the school customised its sender in Notification Settings, use that ("Name <email>");
   *  - otherwise auto-derive a per-school address on the shared verified domain
   *    (`<tenant-slug>@<domain>`), so every school sends as itself with no per-school DNS.
   * `fallbackFrom` is used only when the tenant record is missing.
   */
  financeSender(
    domain: string,
    fallbackFrom: string,
  ): Promise<{ from: string; replyTo: string | null }> {
    return this.run(async (tx, tenantId) => {
      const [tenant, settings] = await Promise.all([
        tx.tenant.findFirst({ where: { id: tenantId }, select: { name: true, slug: true } }),
        tx.notificationSettings.findUnique({ where: { tenantId } }),
      ]);
      if (!tenant) return { from: fallbackFrom, replyTo: settings?.replyToEmail ?? null };

      // "Customised" = the admin changed the sender away from the built-in defaults.
      const emailOverridden = Boolean(
        settings && settings.senderEmail && settings.senderEmail !== 'notification@munaxa.com',
      );
      const nameCustom = Boolean(
        settings && settings.senderName && settings.senderName !== 'Munaxa Notifications',
      );

      const name = nameCustom ? settings!.senderName : tenant.name;
      const email = emailOverridden ? settings!.senderEmail : `${tenant.slug}@${domain}`;
      return { from: `${name} <${email}>`, replyTo: settings?.replyToEmail ?? null };
    });
  }

  /** Mark that the parent was emailed about this settled payment (audited). */
  setParentNotified(id: string): Promise<Transaction> {
    return this.run(async (tx, tenantId) => {
      const txn = await tx.transaction.update({
        where: { id },
        data: { parentNotifiedAt: new Date() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.transaction.notifyParent',
        entityType: 'Transaction',
        entityId: txn.id,
        metadata: { studentId: txn.studentId },
      });
      return txn;
    });
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
