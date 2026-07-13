import { BadRequestException, Injectable } from '@nestjs/common';
import { type FinancialAccount, type FinancialAccountOwnerType } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';
import type { TxClient } from '../../prisma/tenant.helpers';

/** A student billed through a financial account (for the dashboard children section). */
export interface AccountStudent {
  studentId: string;
  studentAccountId: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  gradeNameEn: string | null;
  gradeNameAr: string | null;
}

/** A financial account matched by the multi-key family search. */
export interface FamilySearchHit {
  financialAccountId: string | null; // null when the guardian has no account yet (legacy family)
  parentId: string | null;
  ownerType: FinancialAccountOwnerType | 'GUARDIAN';
  nameEn: string;
  nameAr: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  studentCount: number;
}

/**
 * FinancialAccount data access — the financial customer that pays for one or more students. The
 * account is the owner of payment plans / payments / credits / refunds; students remain the owners
 * of their charges. `ensureForParentTx` is the single entry point that lazily creates the account
 * (reusing the existing Payer) so every family receivable has a payer home. Tenant-scoped, RLS-
 * enforced, audited — mirrors {@link AccountRepository} for the student side.
 */
@Injectable()
export class FinancialAccountRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  findById(id: string): Promise<FinancialAccount | null> {
    return this.run((tx) => tx.financialAccount.findFirst({ where: { id } }));
  }

  /** The active financial account for a guardian, if one exists (most-recent first). */
  findByParent(parentId: string): Promise<FinancialAccount | null> {
    return this.run((tx) =>
      tx.financialAccount.findFirst({
        where: { parentId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /**
   * Find-or-create the financial account owned by a guardian, reusing the guardian's Payer (created
   * if missing) as the billing identity. Composable in a larger transaction (family commit).
   */
  async ensureForParentTx(
    tx: TxClient,
    tenantId: string,
    parentId: string,
    ownerType: FinancialAccountOwnerType = 'GUARDIAN',
  ): Promise<FinancialAccount> {
    const existing = await tx.financialAccount.findFirst({
      where: { parentId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const parent = await tx.parent.findFirst({ where: { id: parentId, deletedAt: null } });
    if (!parent) throw new BadRequestException('Guardian not found in this tenant');

    // Reuse the guardian's Payer (the student-side ledger creates the same one), or create it.
    let payer = await tx.payer.findFirst({ where: { parentId } });
    if (!payer) {
      payer = await tx.payer.create({
        data: {
          tenantId,
          parentId,
          nameEn: `${parent.firstNameEn} ${parent.lastNameEn}`.trim(),
          nameAr: `${parent.firstNameAr} ${parent.lastNameAr}`.trim(),
          phone: parent.phone,
          email: parent.email,
          createdById: this.actor(),
        },
      });
    }

    const account = await tx.financialAccount.create({
      data: {
        tenantId,
        ownerType,
        parentId,
        payerId: payer.id,
        nameEn: `${parent.firstNameEn} ${parent.lastNameEn}`.trim(),
        nameAr: `${parent.firstNameAr} ${parent.lastNameAr}`.trim(),
        phone: parent.phone,
        email: parent.email,
        createdById: this.actor(),
      },
    });
    await this.writeAudit(tx, tenantId, {
      action: 'finance.financialAccount.open',
      entityType: 'FinancialAccount',
      entityId: account.id,
      metadata: { parentId, ownerType },
    });
    return account;
  }

  ensureForParent(
    parentId: string,
    ownerType: FinancialAccountOwnerType = 'GUARDIAN',
  ): Promise<FinancialAccount> {
    return this.run((tx, tenantId) => this.ensureForParentTx(tx, tenantId, parentId, ownerType));
  }

  /**
   * Link a student's AR account to a financial account (idempotent). The student's charges stay
   * student-owned; this only records who the paying customer is.
   */
  async linkStudentAccountTx(
    tx: TxClient,
    studentAccountId: string,
    financialAccountId: string,
  ): Promise<void> {
    await tx.studentFinancialAccount.update({
      where: { id: studentAccountId },
      data: { financialAccountId },
    });
  }

  /** The students billed through a financial account (dashboard children section). */
  studentsOf(financialAccountId: string): Promise<AccountStudent[]> {
    return this.run(async (tx) => {
      const accounts = await tx.studentFinancialAccount.findMany({
        where: { financialAccountId },
        select: {
          id: true,
          student: {
            select: {
              id: true,
              firstNameEn: true,
              lastNameEn: true,
              firstNameAr: true,
              lastNameAr: true,
              section: { select: { grade: { select: { nameEn: true, nameAr: true } } } },
            },
          },
        },
      });
      return accounts
        .filter((a) => a.student)
        .map((a) => ({
          studentId: a.student.id,
          studentAccountId: a.id,
          firstNameEn: a.student.firstNameEn,
          lastNameEn: a.student.lastNameEn,
          firstNameAr: a.student.firstNameAr,
          lastNameAr: a.student.lastNameAr,
          gradeNameEn: a.student.section?.grade?.nameEn ?? null,
          gradeNameAr: a.student.section?.grade?.nameAr ?? null,
        }));
    });
  }

  /** Student ids billed through a financial account (allocation / summary scope). */
  studentIdsOf(financialAccountId: string): Promise<string[]> {
    return this.run(async (tx) => {
      const rows = await tx.studentFinancialAccount.findMany({
        where: { financialAccountId },
        select: { studentId: true },
      });
      return rows.map((r) => r.studentId);
    });
  }

  /**
   * Family-first search. Matches guardians by name / phone / national id, and by any linked
   * student's name / national id, then projects each onto its financial account (or the guardian
   * when no account exists yet — a legacy family that can still be opened into one). Deduped by
   * guardian, capped for the picker.
   */
  search(query: string): Promise<FamilySearchHit[]> {
    const q = query.trim();
    return this.run(async (tx) => {
      if (q.length < 2) return [];
      const like = { contains: q, mode: 'insensitive' as const };
      const parents = await tx.parent.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstNameEn: like },
            { lastNameEn: like },
            { firstNameAr: like },
            { lastNameAr: like },
            { phone: like },
            { phoneAlt: like },
            { nationalId: like },
            {
              studentLinks: {
                some: {
                  student: {
                    deletedAt: null,
                    OR: [
                      { firstNameEn: like },
                      { lastNameEn: like },
                      { firstNameAr: like },
                      { lastNameAr: like },
                      { nationalId: like },
                    ],
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
          phone: true,
          email: true,
          nationalId: true,
          _count: { select: { studentLinks: true } },
          financialAccounts: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, ownerType: true },
          },
        },
        take: 25,
        orderBy: [{ firstNameEn: 'asc' }],
      });
      return parents.map((p) => ({
        financialAccountId: p.financialAccounts[0]?.id ?? null,
        parentId: p.id,
        ownerType: p.financialAccounts[0]?.ownerType ?? 'GUARDIAN',
        nameEn: `${p.firstNameEn} ${p.lastNameEn}`.trim(),
        nameAr: `${p.firstNameAr} ${p.lastNameAr}`.trim(),
        phone: p.phone,
        email: p.email,
        nationalId: p.nationalId,
        studentCount: p._count.studentLinks,
      }));
    });
  }

  /** The active family payment plan for an account + year (if any). */
  activePlanFor(financialAccountId: string, academicYearId?: string) {
    return this.run((tx) =>
      tx.financialAccountPlan.findFirst({
        where: {
          financialAccountId,
          status: 'ACTIVE',
          ...(academicYearId ? { academicYearId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }
}
