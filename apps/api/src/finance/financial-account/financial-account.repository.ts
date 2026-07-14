import { BadRequestException, Injectable } from '@nestjs/common';
import { type Payer, type FinancialAccountOwnerType } from '@prisma/client';
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

/** A financial account matched by the multi-key search. */
export interface FamilySearchHit {
  financialAccountId: string | null; // the Payer id — null when the guardian has no account yet
  parentId: string | null;
  studentId: string | null; // set for a guardian-less student hit (no account/guardian yet)
  ownerType: FinancialAccountOwnerType | 'GUARDIAN';
  nameEn: string;
  nameAr: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  studentCount: number;
}

/**
 * Financial Account data access. The Financial Account IS the {@link Payer} (the customer that pays
 * for one or more students — usually a guardian, but the payer is not hard-coded: ownerType supports
 * company/government/sponsor/…). It owns the payment plans / payments / credits / refunds; students
 * remain the owners of their charges. `Payer` already groups a guardian's students (siblings share
 * one Payer, and StudentFinancialAccount.payerId links them), so there is no separate account table.
 * Tenant-scoped, RLS-enforced, audited — mirrors {@link AccountRepository} for the student side.
 */
@Injectable()
export class FinancialAccountRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  findById(id: string): Promise<Payer | null> {
    return this.run((tx) => tx.payer.findFirst({ where: { id } }));
  }

  /** The active financial account (Payer) for a guardian, if one exists (most-recent first). */
  findByParent(parentId: string): Promise<Payer | null> {
    return this.run((tx) =>
      tx.payer.findFirst({
        where: { parentId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /**
   * Find-or-create the financial account (Payer) owned by a guardian. The same Payer is created by the
   * student-side ledger (`AccountRepository.ensurePayerForStudentTx`), so this is idempotent per
   * guardian. Composable in a larger transaction (the unified admission commit).
   */
  async ensureForParentTx(
    tx: TxClient,
    tenantId: string,
    parentId: string,
    ownerType: FinancialAccountOwnerType = 'GUARDIAN',
  ): Promise<Payer> {
    const existing = await tx.payer.findFirst({ where: { parentId } });
    if (existing) return existing;

    const parent = await tx.parent.findFirst({ where: { id: parentId, deletedAt: null } });
    if (!parent) throw new BadRequestException('Guardian not found in this tenant');

    const account = await tx.payer.create({
      data: {
        tenantId,
        parentId,
        ownerType,
        nameEn: `${parent.firstNameEn} ${parent.lastNameEn}`.trim(),
        nameAr: `${parent.firstNameAr} ${parent.lastNameAr}`.trim(),
        phone: parent.phone,
        email: parent.email,
        nationalId: parent.nationalId,
        createdById: this.actor(),
      },
    });
    await this.writeAudit(tx, tenantId, {
      action: 'finance.financialAccount.open',
      entityType: 'Payer',
      entityId: account.id,
      metadata: { parentId, ownerType },
    });
    return account;
  }

  ensureForParent(
    parentId: string,
    ownerType: FinancialAccountOwnerType = 'GUARDIAN',
  ): Promise<Payer> {
    return this.run((tx, tenantId) => this.ensureForParentTx(tx, tenantId, parentId, ownerType));
  }

  /**
   * Link a student's AR account to a financial account (Payer). The student's charges stay
   * student-owned; this only records who the paying customer is (sets StudentFinancialAccount.payerId).
   */
  async linkStudentAccountTx(
    tx: TxClient,
    studentAccountId: string,
    payerId: string,
  ): Promise<void> {
    await tx.studentFinancialAccount.update({
      where: { id: studentAccountId },
      data: { payerId },
    });
  }

  /** The students billed through a financial account (dashboard children section). */
  studentsOf(payerId: string): Promise<AccountStudent[]> {
    return this.run(async (tx) => {
      const accounts = await tx.studentFinancialAccount.findMany({
        where: { payerId, student: { deletedAt: null } },
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
  studentIdsOf(payerId: string): Promise<string[]> {
    return this.run(async (tx) => {
      const rows = await tx.studentFinancialAccount.findMany({
        where: { payerId },
        select: { studentId: true },
      });
      return rows.map((r) => r.studentId);
    });
  }

  /**
   * Account-first search. Matches guardians by name / phone / national id, and by any linked
   * student's name / national id, then projects each onto its financial account (Payer). Deduped by
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
          payers: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, ownerType: true },
          },
        },
        take: 25,
        orderBy: [{ firstNameEn: 'asc' }],
      });
      const parentHits: FamilySearchHit[] = parents.map((p) => ({
        financialAccountId: p.payers[0]?.id ?? null,
        parentId: p.id,
        studentId: null,
        ownerType: p.payers[0]?.ownerType ?? 'GUARDIAN',
        nameEn: `${p.firstNameEn} ${p.lastNameEn}`.trim(),
        nameAr: `${p.firstNameAr} ${p.lastNameAr}`.trim(),
        phone: p.phone,
        email: p.email,
        nationalId: p.nationalId,
        studentCount: p._count.studentLinks,
      }));

      // Also surface students who have NO guardian on file — an account search would otherwise never
      // find them. Returned as guardian-less hits (studentId set, no account); the UI routes the user
      // to assign a guardian, which places the student under that guardian's Financial Account.
      const orphanStudents = await tx.student.findMany({
        where: {
          deletedAt: null,
          parentLinks: { none: {} },
          OR: [
            { firstNameEn: like },
            { lastNameEn: like },
            { firstNameAr: like },
            { lastNameAr: like },
            { nationalId: like },
          ],
        },
        select: {
          id: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
          nationalId: true,
        },
        take: 25,
        orderBy: [{ firstNameEn: 'asc' }],
      });
      const studentHits: FamilySearchHit[] = orphanStudents.map((s) => ({
        financialAccountId: null,
        parentId: null,
        studentId: s.id,
        ownerType: 'GUARDIAN',
        nameEn: `${s.firstNameEn} ${s.lastNameEn}`.trim(),
        nameAr: `${s.firstNameAr} ${s.lastNameAr}`.trim(),
        phone: null,
        email: null,
        nationalId: s.nationalId,
        studentCount: 1,
      }));

      return [...parentHits, ...studentHits];
    });
  }

  /** The active account payment plan for an account (Payer) + year (if any). */
  activePlanFor(payerId: string, academicYearId?: string) {
    return this.run((tx) =>
      tx.financialAccountPlan.findFirst({
        where: {
          payerId,
          status: 'ACTIVE',
          ...(academicYearId ? { academicYearId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }
}
