import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
  ChargeStatus,
  EnrollmentStatus,
  ParentRelation,
  Prisma,
  QuotePaymentMode,
  StudentStatus,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import type { TxClient } from '../../prisma/tenant.helpers';
import { TenantContextStore } from '../../prisma/tenant-context';
import { generateStudentQrCode } from '../../people/people.util';
import type { ComputedQuote } from './quote.service';
import type {
  CommitDto,
  CreateArrangementDto,
  CreateFeeItemDto,
  FeeOverrideDto,
  UpdateFeeItemDto,
  UpsertGradeFeeItemDto,
} from './admissions.dto';

const toFils = (n: number | string): number => Math.round(Number(n) * 1000);
function addMonths(base: Date, n: number): Date {
  const dt = new Date(base);
  const day = dt.getDate();
  dt.setDate(1);
  dt.setMonth(dt.getMonth() + n);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(day, last));
  return dt;
}

/**
 * Admissions data layer (Phase 22). Tenant-scoped, RLS-enforced, audited. The registration commit
 * runs as a single transaction creating Student → Parent → link → Enrollment → Charges/installments
 * → fee-modification tracking → StudentBillingProfile badge → RegistrationCommitment (idempotent).
 * Reuses the existing ledger tables; never duplicates Charge/Transaction logic.
 */
@Injectable()
export class AdmissionsRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  // ── Fee-item catalog ──
  listFeeItems() {
    return this.run((tx) => tx.feeItem.findMany({ orderBy: [{ kind: 'asc' }, { nameEn: 'asc' }] }));
  }

  createFeeItem(dto: CreateFeeItemDto) {
    return this.run(async (tx, tenantId) => {
      const row = await tx.feeItem.create({
        data: {
          tenantId,
          kind: dto.kind,
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          mandatory: dto.mandatory ?? false,
          discountable: dto.discountable ?? false,
          createdById: this.actor(),
          updatedById: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.feeItem.create',
        entityType: 'FeeItem',
        entityId: row.id,
        metadata: { kind: row.kind, nameEn: row.nameEn },
      });
      return row;
    });
  }

  updateFeeItem(id: string, dto: UpdateFeeItemDto) {
    return this.run(async (tx, tenantId) => {
      const row = await tx.feeItem.update({
        where: { id },
        data: {
          ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
          ...(dto.nameAr !== undefined ? { nameAr: dto.nameAr } : {}),
          ...(dto.mandatory !== undefined ? { mandatory: dto.mandatory } : {}),
          ...(dto.discountable !== undefined ? { discountable: dto.discountable } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          updatedById: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.feeItem.update',
        entityType: 'FeeItem',
        entityId: id,
      });
      return row;
    });
  }

  listGradeFeeItems(academicYearId: string, gradeId?: string) {
    return this.run((tx) =>
      tx.gradeFeeItem.findMany({
        where: { academicYearId, ...(gradeId ? { gradeId } : {}) },
        include: { feeItem: true },
        orderBy: [{ effectiveFrom: 'desc' }],
      }),
    );
  }

  /** Active grade-fee lines effective today (one current line per fee item). */
  async listActiveGradeFeeItems(academicYearId: string, gradeId: string) {
    const rows = await this.run((tx) =>
      tx.gradeFeeItem.findMany({
        where: { academicYearId, gradeId, isActive: true },
        include: { feeItem: true },
        orderBy: [{ effectiveFrom: 'desc' }],
      }),
    );
    const today = new Date();
    const current = rows.filter(
      (r) => r.effectiveFrom <= today && (r.effectiveTo === null || r.effectiveTo >= today),
    );
    const seen = new Set<string>();
    const out: typeof current = [];
    for (const r of current) {
      if (seen.has(r.feeItemId)) continue;
      seen.add(r.feeItemId);
      out.push(r);
    }
    return out;
  }

  upsertGradeFeeItem(dto: UpsertGradeFeeItemDto) {
    return this.run(async (tx, tenantId) => {
      const item = await tx.feeItem.findFirst({
        where: { id: dto.feeItemId },
        select: { id: true },
      });
      if (!item) throw new BadRequestException('Fee item not found in this tenant');
      // Supersede any current active line for this item/grade/year (effective dating).
      await tx.gradeFeeItem.updateMany({
        where: {
          feeItemId: dto.feeItemId,
          gradeId: dto.gradeId,
          academicYearId: dto.academicYearId,
          isActive: true,
        },
        data: { isActive: false, effectiveTo: new Date(), updatedById: this.actor() },
      });
      const row = await tx.gradeFeeItem.create({
        data: {
          tenantId,
          feeItemId: dto.feeItemId,
          gradeId: dto.gradeId,
          academicYearId: dto.academicYearId,
          amount: new Prisma.Decimal(dto.amount),
          mandatory: dto.mandatory ?? false,
          discountable: dto.discountable ?? false,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
          createdById: this.actor(),
          updatedById: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.gradeFeeItem.upsert',
        entityType: 'GradeFeeItem',
        entityId: row.id,
        metadata: { amount: row.amount.toString() },
      });
      return row;
    });
  }

  findAcademicYear(id: string) {
    return this.run((tx) =>
      tx.academicYear.findFirst({ where: { id }, select: { id: true, endDate: true } }),
    );
  }

  // ── Quotes ──
  createQuote(computed: ComputedQuote, overrides: FeeOverrideDto[]) {
    return this.run(async (tx, tenantId) => {
      const quote = await tx.enrollmentQuote.create({
        data: {
          tenantId,
          academicYearId: computed.academicYearId,
          gradeId: computed.gradeId,
          studentId: computed.studentId,
          transportDirection: computed.transportDirection,
          paymentMode: computed.paymentMode,
          installments: computed.installments,
          firstDueDate: computed.firstDueDate ? new Date(computed.firstDueDate) : null,
          totalFees: new Prisma.Decimal(computed.totalFees),
          discountEligible: new Prisma.Decimal(computed.discountEligible),
          discountAmount: new Prisma.Decimal(computed.discountAmount),
          nonDiscountEligible: new Prisma.Decimal(computed.nonDiscountEligible),
          grandTotal: new Prisma.Decimal(computed.grandTotal),
          feeModified: computed.feeModified,
          createdById: this.actor(),
          items: {
            create: computed.lines.map((l) => ({
              tenantId,
              feeItemId: l.feeItemId,
              kind: l.kind,
              label: l.label,
              amount: new Prisma.Decimal(l.amount),
              discountable: l.discountable,
              discountAmount: new Prisma.Decimal(l.discountAmount),
              overridden: l.overridden,
              originalAmount: l.originalAmount ? new Prisma.Decimal(l.originalAmount) : null,
              overrideReason: l.overridden
                ? (overrides.find((o) => o.kind === l.kind)?.reason ?? 'Registrar override')
                : null,
            })),
          },
        },
        include: { items: true },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.quote.create',
        entityType: 'EnrollmentQuote',
        entityId: quote.id,
        metadata: { grandTotal: quote.grandTotal.toString(), feeModified: quote.feeModified },
      });
      return quote;
    });
  }

  getQuote(id: string) {
    return this.run((tx) =>
      tx.enrollmentQuote.findFirst({ where: { id }, include: { items: true } }),
    );
  }

  // ── Atomic registration commit ──
  // Creates the ledger charges for a committed enrollment. Full payment = one charge per fee
  // line (net of discount); installments = the grand total split into N monthly charges sharing
  // one plan group. Called at commit time for unmodified fees, or at approval time once a held
  // (fee-modified) enrollment is approved.
  private async createEnrollmentCharges(
    tx: TxClient,
    tenantId: string,
    studentId: string,
    planId: string | null,
    quote: Prisma.EnrollmentQuoteGetPayload<{ include: { items: true } }>,
  ) {
    if (quote.paymentMode === QuotePaymentMode.FULL) {
      for (const item of quote.items) {
        const net = item.amount.minus(item.discountAmount);
        if (net.lessThanOrEqualTo(0)) continue;
        await tx.charge.create({
          data: {
            tenantId,
            studentId,
            description: item.label,
            amount: net,
            dueDate: quote.firstDueDate ?? null,
            status: ChargeStatus.PENDING,
            createdById: this.actor(),
          },
        });
      }
    } else {
      const months = quote.installments;
      const totalFils = toFils(quote.grandTotal.toString());
      const per = Math.floor(totalFils / months);
      const base = quote.firstDueDate ?? new Date();
      for (let i = 0; i < months; i += 1) {
        const fils = i === months - 1 ? totalFils - per * (months - 1) : per;
        await tx.charge.create({
          data: {
            tenantId,
            studentId,
            installmentPlanId: planId,
            description: `Tuition & fees — ${i + 1}/${months}`,
            amount: new Prisma.Decimal(fils).div(1000),
            dueDate: addMonths(base, i),
            status: ChargeStatus.PENDING,
            createdById: this.actor(),
          },
        });
      }
    }
  }

  async commit(dto: CommitDto) {
    return this.run(async (tx, tenantId) => {
      // Idempotency: a prior commit with the same key returns the same enrollment.
      const existing = await tx.registrationCommitment.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } },
        include: { enrollment: true },
      });
      if (existing) return existing.enrollment;

      const quote = await tx.enrollmentQuote.findFirst({
        where: { id: dto.quoteId },
        include: { items: true },
      });
      if (!quote) throw new BadRequestException('Quote not found');
      if (quote.items.length === 0) throw new BadRequestException('Quote has no fee lines');

      // 1) Student — reuse (returning) or create (new).
      let studentId = dto.existingStudentId ?? null;
      if (!studentId) {
        if (!dto.student)
          throw new BadRequestException('Student information is required for a new registration');
        // A guardian (with a primary mobile) is mandatory for every new student.
        if (!dto.parent)
          throw new BadRequestException('A parent/guardian is required for a new registration');
        if (!dto.parent.phone?.trim())
          throw new BadRequestException('A parent mobile number is required');
        const s = dto.student;
        const created = await tx.student.create({
          data: {
            tenantId,
            firstNameEn: s.firstNameEn,
            lastNameEn: s.lastNameEn,
            firstNameAr: s.firstNameAr || s.firstNameEn,
            lastNameAr: s.lastNameAr || s.lastNameEn,
            ...(s.gender ? { gender: s.gender } : {}),
            ...(s.dateOfBirth ? { dateOfBirth: new Date(s.dateOfBirth) } : {}),
            ...(s.nationalId ? { nationalId: s.nationalId } : {}),
            ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
            status: StudentStatus.ACTIVE,
            qrCode: generateStudentQrCode(),
          },
        });
        studentId = created.id;

        // 2) Parent — reuse an existing guardian by mobile (de-dup), else create. Then link.
        // `dto.parent` is guaranteed present for a new student (validated above).
        const p = dto.parent;
        const relation = p.relation ?? ParentRelation.GUARDIAN;
        const existingParent = p.phone
          ? await tx.parent.findFirst({ where: { tenantId, phone: p.phone, deletedAt: null } })
          : null;
        const parent =
          existingParent ??
          (await tx.parent.create({
            data: {
              tenantId,
              firstNameEn: p.firstNameEn,
              lastNameEn: p.lastNameEn,
              firstNameAr: p.firstNameAr || p.firstNameEn,
              lastNameAr: p.lastNameAr || p.lastNameEn,
              ...(p.phone ? { phone: p.phone } : {}),
              ...(p.phoneAlt ? { phoneAlt: p.phoneAlt } : {}),
              ...(p.email ? { email: p.email } : {}),
            },
          }));
        // Link the guardian to the new student (skip if reusing a parent already linked).
        const existingLink = await tx.parentStudent.findFirst({
          where: { tenantId, parentId: parent.id, studentId },
        });
        if (!existingLink) {
          await tx.parentStudent.create({
            data: { tenantId, parentId: parent.id, studentId, relation, isPrimary: true },
          });
        }
      } else if (dto.sectionId) {
        await tx.student.update({ where: { id: studentId }, data: { sectionId: dto.sectionId } });
      }

      // 3) Enrollment (one per student+year). Any fee change holds the enrollment in
      //    PENDING_APPROVAL until finance decides — nothing is committed (charges) before then.
      const held = quote.feeModified;
      const planId = quote.paymentMode === QuotePaymentMode.INSTALLMENTS ? randomUUID() : null;
      const enrollment = await tx.enrollment.create({
        data: {
          tenantId,
          studentId,
          academicYearId: quote.academicYearId,
          gradeId: quote.gradeId,
          ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
          quoteId: quote.id,
          transportDirection: quote.transportDirection,
          status: held ? EnrollmentStatus.PENDING_APPROVAL : EnrollmentStatus.COMMITTED,
          paymentMode: quote.paymentMode,
          installmentPlanId: planId,
          feeModified: quote.feeModified,
          createdById: this.actor(),
        },
      });

      // 4) Charges (reuse the existing ledger). When a fee change holds the enrollment for
      //    finance approval, we defer charge creation until approval so nothing financial is
      //    committed before the decision — see decideModification().
      if (!held) {
        await this.createEnrollmentCharges(tx, tenantId, studentId, planId, quote);
      }

      // 5) Fee-modification tracking. Every change records a PENDING approval (step 3 holds
      //    the enrollment) so it surfaces in the finance approval inbox.
      for (const item of quote.items) {
        if (!item.overridden || item.originalAmount === null) continue;
        const diff = item.amount.minus(item.originalAmount);
        const mod = await tx.feeModification.create({
          data: {
            tenantId,
            enrollmentId: enrollment.id,
            studentId,
            field: item.kind,
            originalValue: item.originalAmount.toFixed(3),
            newValue: item.amount.toFixed(3),
            difference: diff.toFixed(3),
            reason: item.overrideReason ?? 'Registrar override',
            modifiedById: this.actor(),
          },
        });
        await tx.feeModificationApproval.create({
          data: { tenantId, modificationId: mod.id, status: ApprovalStatus.PENDING },
        });
      }

      // 6) Permanent "Fee Modified" badge on the student's billing profile.
      if (quote.feeModified) {
        await tx.studentBillingProfile.upsert({
          where: { studentId },
          create: { tenantId, studentId, feeModified: true },
          update: { feeModified: true },
        });
      }

      // 6b) Bus route + trip assignment (one per student): mirror the admission choice into the
      //     fleet so it shows under Fleet → Route detail and on the student's profile.
      if (dto.busRouteId) {
        const route = await tx.busRoute.findFirst({
          where: { id: dto.busRouteId, deletedAt: null },
          select: { id: true },
        });
        if (!route) throw new BadRequestException('Bus route not found in this tenant');
        const existingAssignment = await tx.studentBusAssignment.findFirst({
          where: { studentId },
        });
        if (existingAssignment) {
          await tx.studentBusAssignment.update({
            where: { id: existingAssignment.id },
            data: { routeId: dto.busRouteId, stopId: null, tripRound: dto.busTripRound ?? null },
          });
        } else {
          await tx.studentBusAssignment.create({
            data: {
              tenantId,
              studentId,
              routeId: dto.busRouteId,
              tripRound: dto.busTripRound ?? null,
            },
          });
        }
      }

      // 7) Idempotent commitment record + audit.
      await tx.registrationCommitment.create({
        data: {
          tenantId,
          enrollmentId: enrollment.id,
          studentId,
          idempotencyKey: dto.idempotencyKey,
          committedById: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.registration.commit',
        entityType: 'Enrollment',
        entityId: enrollment.id,
        metadata: {
          studentId,
          academicYearId: quote.academicYearId,
          grandTotal: quote.grandTotal.toString(),
          feeModified: quote.feeModified,
          returning: Boolean(dto.existingStudentId),
        },
      });
      return enrollment;
    });
  }

  // ── Returning-student lookup ──
  async loadReturning(studentId: string) {
    return this.run(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: studentId, deletedAt: null },
        include: {
          parentLinks: { include: { parent: true } },
          enrollments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { grade: true, academicYear: true },
          },
          billingProfile: true,
        },
      });
      if (!student) throw new BadRequestException('Student not found');
      return student;
    });
  }

  // ── Enrollments / reporting ──
  listEnrollments(filter: {
    academicYearId?: string;
    gradeId?: string;
    status?: EnrollmentStatus;
  }) {
    return this.run((tx) =>
      tx.enrollment.findMany({
        where: {
          ...(filter.academicYearId ? { academicYearId: filter.academicYearId } : {}),
          ...(filter.gradeId ? { gradeId: filter.gradeId } : {}),
          ...(filter.status ? { status: filter.status } : {}),
        },
        include: {
          student: { select: { id: true, firstNameEn: true, lastNameEn: true } },
          grade: { select: { nameEn: true } },
          academicYear: { select: { name: true } },
          commitment: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    );
  }

  listModifications(status?: ApprovalStatus) {
    return this.run((tx) =>
      tx.feeModification.findMany({
        where: status ? { approval: { status } } : {},
        include: {
          approval: true,
          enrollment: { include: { student: { select: { firstNameEn: true, lastNameEn: true } } } },
        },
        orderBy: { modifiedAt: 'desc' },
        take: 500,
      }),
    );
  }

  decideModification(modificationId: string, approve: boolean, note?: string) {
    return this.run(async (tx, tenantId) => {
      const approval = await tx.feeModificationApproval.findUnique({
        where: { modificationId },
        include: { modification: true },
      });
      if (!approval) throw new BadRequestException('No pending approval for this modification');

      // Separation of duties: by default the user who applied the fee modification cannot
      // approve/reject it. Schools with a single finance person can opt out via the
      // allowSelfFeeApproval billing-policy flag.
      const actor = this.actor();
      if (actor && approval.modification.modifiedById === actor) {
        const policy = await tx.billingPolicy.findUnique({ where: { tenantId } });
        if (!policy?.allowSelfFeeApproval) {
          throw new ForbiddenException(
            'You cannot approve a fee modification you created. A different user must decide it.',
          );
        }
      }

      const status = approve ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
      const row = await tx.feeModificationApproval.update({
        where: { modificationId },
        data: {
          status,
          approverId: this.actor(),
          decidedAt: new Date(),
          ...(note ? { note } : {}),
        },
      });
      // Apply the decision to the held enrollment. Approval activates it and creates the
      // charges that were deferred at commit time; rejection cancels it (no charges exist).
      // Both are scoped to PENDING_APPROVAL so a decision on one of several modifications for
      // an already-decided enrollment is a safe no-op (charges are never created twice).
      const enrollmentId = approval.modification.enrollmentId;
      if (enrollmentId) {
        const { count } = await tx.enrollment.updateMany({
          where: { id: enrollmentId, status: EnrollmentStatus.PENDING_APPROVAL },
          data: {
            status: approve ? EnrollmentStatus.COMMITTED : EnrollmentStatus.CANCELLED,
          },
        });
        if (approve && count > 0) {
          const enrollment = await tx.enrollment.findFirstOrThrow({
            where: { id: enrollmentId },
            include: { quote: { include: { items: true } } },
          });
          if (enrollment.quote) {
            await this.createEnrollmentCharges(
              tx,
              tenantId,
              enrollment.studentId,
              enrollment.installmentPlanId,
              enrollment.quote,
            );
          }
        }
      }
      await this.writeAudit(tx, tenantId, {
        action: approve ? 'admissions.feeMod.approve' : 'admissions.feeMod.reject',
        entityType: 'FeeModificationApproval',
        entityId: row.id,
        metadata: { modificationId },
      });
      return row;
    });
  }

  createArrangement(dto: CreateArrangementDto) {
    return this.run(async (tx, tenantId) => {
      const row = await tx.financialArrangement.create({
        data: {
          tenantId,
          studentId: dto.studentId,
          ...(dto.enrollmentId ? { enrollmentId: dto.enrollmentId } : {}),
          description: dto.description,
          createdById: this.actor(),
        },
      });
      await tx.studentBillingProfile.upsert({
        where: { studentId: dto.studentId },
        create: { tenantId, studentId: dto.studentId, customArrangement: true },
        update: { customArrangement: true },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.arrangement.create',
        entityType: 'FinancialArrangement',
        entityId: row.id,
        metadata: { studentId: dto.studentId },
      });
      return row;
    });
  }
}
