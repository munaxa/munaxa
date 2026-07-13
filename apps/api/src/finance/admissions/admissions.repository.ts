import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
  ChargeStatus,
  EnrollmentStatus,
  FeeItemKind,
  ParentRelation,
  Prisma,
  QuotePaymentMode,
  StudentStatus,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantConnectionManager } from '../../prisma/tenant-connection.service';
import type { TxClient } from '../../prisma/tenant.helpers';
import { TenantContextStore } from '../../prisma/tenant-context';
import { generateStudentQrCode } from '../../people/people.util';
import { AccountRepository } from '../account/account.repository';
import { FinancialAccountRepository } from '../financial-account/financial-account.repository';
import { addMonths, InstallmentScheduleService } from '../charges/installment-schedule.service';
import { fromFils, toFils } from '../shared/money';
import type { ComputedQuote } from './quote.service';
import {
  AddFamilyStudentMode,
  type AddFamilyStudentDto,
  type CommitDto,
  type CreateArrangementDto,
  type CreateFeeItemDto,
  type FamilyCommitDto,
  type FeeOverrideDto,
  type UpdateFeeItemDto,
  type UpsertGradeFeeItemDto,
} from './admissions.dto';

/** Family-plan alignment for a per-student charge schedule (shared cadence + due dates). */
interface FamilyPlanOverride {
  financialPlanId: string;
  installments: number;
  firstDueDate: Date;
}

/**
 * Admissions data layer (Phase 22). Tenant-scoped, RLS-enforced, audited. The registration commit
 * runs as a single transaction creating Student → Parent → link → Enrollment → Charges/installments
 * → fee-modification tracking → StudentBillingProfile badge → RegistrationCommitment (idempotent).
 * Reuses the existing ledger tables; never duplicates Charge/Transaction logic.
 */
@Injectable()
export class AdmissionsRepository extends TenantRepository {
  constructor(
    prisma: PrismaService,
    connections: TenantConnectionManager,
    private readonly accounts: AccountRepository,
    private readonly financialAccounts: FinancialAccountRepository,
    private readonly schedule: InstallmentScheduleService,
  ) {
    super(prisma, connections);
  }

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
  /**
   * Materialise the AR ledger for a committed enrollment on the new model (ADR-001):
   *   FULL  → one Charge per fee line (net of discount), each with an implicit single installment.
   *   INSTALLMENTS → a one-time "Registration fee" Charge (due at registration, never spread), plus
   *                  one "Tuition & fees" Charge for the REMAINING net + a PaymentPlan whose N
   *                  monthly installments sum exactly to that remainder (shared schedule generator).
   * The registration fee is a one-off obligation payable when the student registers, so it is carved
   * out of the amount that gets divided into monthly installments (BR: registration is paid once).
   * Every charge is linked to the account + enrollment + academic-year/grade dimensions (RR-2).
   */
  private async createEnrollmentCharges(
    tx: TxClient,
    tenantId: string,
    studentId: string,
    enrollmentId: string,
    quote: Prisma.EnrollmentQuoteGetPayload<{ include: { items: true } }>,
    registrationFeePaid = true,
    // When the enrollment is billed through a FinancialAccount, its tuition plan is aligned to the
    // FAMILY plan (shared cadence + installment count + first due date) and linked via financialPlanId,
    // so every child's schedule lands on the same due dates → exactly N family installments.
    familyPlan?: FamilyPlanOverride,
  ) {
    const account = await this.accounts.ensureAccountTx(tx, tenantId, studentId);
    const dims = {
      accountId: account.id,
      academicYearId: quote.academicYearId,
      gradeId: quote.gradeId,
      enrollmentId,
    };
    const dueDate = familyPlan ? familyPlan.firstDueDate : (quote.firstDueDate ?? null);

    if (quote.paymentMode === QuotePaymentMode.FULL) {
      for (const item of quote.items) {
        const net = item.amount.minus(item.discountAmount);
        if (net.lessThanOrEqualTo(0)) continue;
        const charge = await tx.charge.create({
          data: {
            tenantId,
            studentId,
            ...dims,
            feeItemId: item.feeItemId ?? null,
            description: item.label,
            amount: net,
            dueDate,
            status: ChargeStatus.PENDING,
            createdById: this.actor(),
          },
        });
        await tx.installment.create({
          data: { tenantId, chargeId: charge.id, seq: 1, dueDate, amount: net },
        });
      }
      return;
    }

    // INSTALLMENTS. When the registration fee was paid at registration (the usual case), carve it out
    // as its own one-off charge due at registration — it is never divided across the monthly plan, so
    // only the remaining fees are scheduled. When it was NOT paid up front, it stays folded into the
    // grand total and is spread across the installments like any other fee (registrationNet = 0 here).
    const registrationNet = registrationFeePaid
      ? quote.items
          .filter((it) => it.kind === FeeItemKind.REGISTRATION)
          .reduce((sum, it) => sum.plus(it.amount.minus(it.discountAmount)), new Prisma.Decimal(0))
      : new Prisma.Decimal(0);
    if (registrationNet.greaterThan(0)) {
      const regDue = new Date(); // payable once, at the moment of registration
      const regCharge = await tx.charge.create({
        data: {
          tenantId,
          studentId,
          ...dims,
          description: 'Registration fee',
          amount: registrationNet,
          dueDate: regDue,
          status: ChargeStatus.PENDING,
          createdById: this.actor(),
        },
      });
      await tx.installment.create({
        data: {
          tenantId,
          chargeId: regCharge.id,
          seq: 1,
          dueDate: regDue,
          amount: registrationNet,
        },
      });
    }

    // The remaining net (grand total minus the registration fee) is what gets spread over the plan.
    const remainder = quote.grandTotal.minus(registrationNet);
    if (remainder.lessThanOrEqualTo(0)) return; // registration-only quote — nothing left to schedule

    const charge = await tx.charge.create({
      data: {
        tenantId,
        studentId,
        ...dims,
        description: 'Tuition & fees',
        amount: remainder,
        dueDate,
        status: ChargeStatus.PENDING,
        createdById: this.actor(),
      },
    });
    // Family-billed charges follow the FAMILY plan's count + first due date so every child's schedule
    // aligns; standalone charges use the quote's own values (unchanged legacy behaviour).
    const planInstallments = familyPlan ? familyPlan.installments : quote.installments;
    const planFirstDue = familyPlan ? familyPlan.firstDueDate : (quote.firstDueDate ?? new Date());
    const first = planFirstDue.toISOString().slice(0, 10);
    const lines = this.schedule.generate(toFils(remainder.toFixed(3)), {
      cadence: 'MONTHLY',
      installments: planInstallments,
      firstDueDate: first,
    });
    const plan = await tx.paymentPlan.create({
      data: {
        tenantId,
        chargeId: charge.id,
        ...(familyPlan ? { financialPlanId: familyPlan.financialPlanId } : {}),
        cadence: 'MONTHLY',
        installments: planInstallments,
        firstDueDate: planFirstDue,
        createdById: this.actor(),
      },
    });
    for (const line of lines) {
      await tx.installment.create({
        data: {
          tenantId,
          chargeId: charge.id,
          planId: plan.id,
          seq: line.seq,
          dueDate: line.dueDate,
          amount: fromFils(line.amountFils),
        },
      });
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
        // A guardian is mandatory for every new student — either an existing parent (chosen by id)
        // or a brand-new one (which requires a primary mobile).
        if (!dto.existingParentId && !dto.parent)
          throw new BadRequestException('A parent/guardian is required for a new registration');
        if (!dto.existingParentId && !dto.parent?.phone?.trim())
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
            // Transportation demand captured at registration (additive; Fleet stays the
            // operational source of truth via the StudentBusAssignment created in step 6).
            ...(dto.areaId ? { areaId: dto.areaId } : {}),
            ...(dto.transportRequested !== undefined
              ? { transportRequested: dto.transportRequested }
              : {}),
            status: StudentStatus.ACTIVE,
            qrCode: generateStudentQrCode(),
          },
        });
        studentId = created.id;

        // 2) Parent — the registrar either chose an EXISTING guardian (by id) or entered a new one
        //    (de-duped by mobile). Then link the guardian to the student.
        const relation = dto.parent?.relation ?? ParentRelation.GUARDIAN;
        let parent: { id: string };
        if (dto.existingParentId) {
          const chosen = await tx.parent.findFirst({
            where: { id: dto.existingParentId, tenantId, deletedAt: null },
          });
          if (!chosen)
            throw new BadRequestException('The selected parent was not found in this tenant');
          parent = chosen;
        } else {
          const p = dto.parent!;
          const existingParent = p.phone
            ? await tx.parent.findFirst({ where: { tenantId, phone: p.phone, deletedAt: null } })
            : null;
          parent =
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
        }
        // Link the guardian to the new student (skip if reusing a parent already linked).
        const existingLink = await tx.parentStudent.findFirst({
          where: { tenantId, parentId: parent.id, studentId },
        });
        if (!existingLink) {
          await tx.parentStudent.create({
            data: { tenantId, parentId: parent.id, studentId, relation, isPrimary: true },
          });
        }
      } else {
        // Returning student: keep their profile but refresh placement + transport demand
        // from this registration (all additive/optional).
        const data: Prisma.StudentUpdateInput = {
          ...(dto.sectionId ? { section: { connect: { id: dto.sectionId } } } : {}),
          ...(dto.areaId ? { area: { connect: { id: dto.areaId } } } : {}),
          ...(dto.transportRequested !== undefined
            ? { transportRequested: dto.transportRequested }
            : {}),
        };
        if (Object.keys(data).length > 0) {
          await tx.student.update({ where: { id: studentId }, data });
        }
      }

      // 3) Enrollment (one per student+year). A fee change only holds the enrollment in
      //    PENDING_APPROVAL when the tenant has opted into the finance-approval workflow
      //    (BillingPolicy.requireFinanceApprovalForFeeChanges). By default that flag is false:
      //    the person admitting the student — typically the finance officer, who already holds
      //    fee authority (FEE_OVERRIDE) — commits in a single step with no pending state. The
      //    modification is still recorded and auto-approved for the audit trail (step 5). Schools
      //    that want separation of duties flip the toggle on to require a separate approval.
      const policy = await tx.billingPolicy.findUnique({
        where: { tenantId },
        select: { requireFinanceApprovalForFeeChanges: true },
      });
      const requireApproval = policy?.requireFinanceApprovalForFeeChanges ?? false;
      const held = quote.feeModified && requireApproval;
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
          feeModified: quote.feeModified,
          // Usual case: the registration fee is paid at registration (its own one-off charge). If the
          // registrar marks it unpaid it is folded into the installment plan instead.
          registrationFeePaid: dto.registrationFeePaid ?? true,
          createdById: this.actor(),
        },
      });

      // 4) AR ledger (Account + Charge + Plan + Installments). When a fee change holds the
      //    enrollment for finance approval, charge creation is deferred until approval so nothing
      //    financial is committed before the decision — see decideModification().
      if (!held) {
        await this.createEnrollmentCharges(
          tx,
          tenantId,
          studentId,
          enrollment.id,
          quote,
          dto.registrationFeePaid ?? true,
        );
      }

      // 5) Fee-modification tracking. Every change is recorded for the audit trail. When the
      //    enrollment is held (step 3) the approval is PENDING so it surfaces in the finance
      //    approval inbox; otherwise it is auto-approved (decided now by the committing actor)
      //    so there is no pending item but the who/original/new history is preserved.
      const decidedNow = new Date();
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
          data: held
            ? { tenantId, modificationId: mod.id, status: ApprovalStatus.PENDING }
            : {
                tenantId,
                modificationId: mod.id,
                status: ApprovalStatus.APPROVED,
                approverId: this.actor(),
                decidedAt: decidedNow,
                note: 'Auto-approved: tenant does not require finance approval for fee changes',
              },
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

  // ── Atomic FAMILY registration commit ──
  /**
   * Register a whole family in one transaction: one guardian/customer (FinancialAccount) pays for one
   * or more students. Creates — for each student — Student → guardian link → Enrollment → per-student
   * Charges, all aligned to ONE family FinancialAccountPlan (shared cadence + installment count + first
   * due date), so a chosen "9 installments" yields exactly 9 FAMILY installments. Students remain the
   * owners of their charges; the FinancialAccount owns the plan/payments. Idempotent per student
   * (keyed `<idempotencyKey>:<index>`). Fee overrides are recorded + auto-approved (family v1 always
   * commits; the finance-approval hold workflow stays on the single-student path).
   */
  async familyCommit(dto: FamilyCommitDto) {
    return this.run(async (tx, tenantId) => {
      if (!dto.students || dto.students.length === 0) {
        throw new BadRequestException('At least one student is required');
      }

      // Idempotency: a prior family commit with the same key returns the same account + enrollments.
      const firstKey = `${dto.idempotencyKey}:0`;
      const prior = await tx.registrationCommitment.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: firstKey } },
      });
      if (prior) return this.loadFamilyResult(tx, dto.idempotencyKey);

      // 1) Guardian — link an existing parent or create a new one (dedup by mobile).
      const relation = dto.parent?.relation ?? ParentRelation.GUARDIAN;
      let parentId: string;
      if (dto.existingParentId) {
        const chosen = await tx.parent.findFirst({
          where: { id: dto.existingParentId, tenantId, deletedAt: null },
          select: { id: true },
        });
        if (!chosen)
          throw new BadRequestException('The selected guardian was not found in this tenant');
        parentId = chosen.id;
      } else {
        if (!dto.parent) throw new BadRequestException('A guardian is required');
        if (!dto.parent.phone?.trim())
          throw new BadRequestException('A guardian mobile number is required');
        const p = dto.parent;
        const existingParent = await tx.parent.findFirst({
          where: { tenantId, phone: p.phone, deletedAt: null },
          select: { id: true },
        });
        parentId =
          existingParent?.id ??
          (
            await tx.parent.create({
              data: {
                tenantId,
                firstNameEn: p.firstNameEn,
                lastNameEn: p.lastNameEn,
                firstNameAr: p.firstNameAr || p.firstNameEn,
                lastNameAr: p.lastNameAr || p.lastNameEn,
                phone: p.phone,
                ...(p.phoneAlt ? { phoneAlt: p.phoneAlt } : {}),
                ...(p.email ? { email: p.email } : {}),
              },
              select: { id: true },
            })
          ).id;
      }

      // 2) The financial customer (find-or-create) + 3) the ONE family payment plan.
      const financialAccount = await this.financialAccounts.ensureForParentTx(
        tx,
        tenantId,
        parentId,
        dto.ownerType ?? 'GUARDIAN',
      );
      const firstDue = dto.firstDueDate ? new Date(dto.firstDueDate) : new Date();
      const installments = dto.paymentMode === QuotePaymentMode.FULL ? 1 : (dto.installments ?? 1);
      const familyPlan = await tx.financialAccountPlan.create({
        data: {
          tenantId,
          financialAccountId: financialAccount.id,
          academicYearId: dto.academicYearId,
          cadence: 'MONTHLY',
          installments,
          firstDueDate: firstDue,
          createdById: this.actor(),
        },
      });
      const planOverride: FamilyPlanOverride = {
        financialPlanId: familyPlan.id,
        installments,
        firstDueDate: firstDue,
      };

      // 4) Each student: resolve/create, link the guardian, enroll, and bill through the family plan.
      const enrollmentIds: string[] = [];
      for (const [i, entry] of dto.students.entries()) {
        const quote = await tx.enrollmentQuote.findFirst({
          where: { id: entry.quoteId },
          include: { items: true },
        });
        if (!quote) throw new BadRequestException(`Quote not found for student #${i + 1}`);
        if (quote.items.length === 0)
          throw new BadRequestException(`Quote #${i + 1} has no fee lines`);
        if (quote.academicYearId !== dto.academicYearId) {
          throw new BadRequestException(`Quote #${i + 1} is for a different academic year`);
        }

        let studentId = entry.existingStudentId ?? null;
        if (!studentId) {
          if (!entry.student)
            throw new BadRequestException(`Student #${i + 1} information is required`);
          const s = entry.student;
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
              ...(entry.sectionId ? { sectionId: entry.sectionId } : {}),
              ...(entry.areaId ? { areaId: entry.areaId } : {}),
              ...(entry.transportRequested !== undefined
                ? { transportRequested: entry.transportRequested }
                : {}),
              status: StudentStatus.ACTIVE,
              qrCode: generateStudentQrCode(),
            },
            select: { id: true },
          });
          studentId = created.id;
        } else {
          const data: Prisma.StudentUpdateInput = {
            ...(entry.sectionId ? { section: { connect: { id: entry.sectionId } } } : {}),
            ...(entry.areaId ? { area: { connect: { id: entry.areaId } } } : {}),
            ...(entry.transportRequested !== undefined
              ? { transportRequested: entry.transportRequested }
              : {}),
          };
          if (Object.keys(data).length > 0)
            await tx.student.update({ where: { id: studentId }, data });
        }

        // Link the guardian (skip if already linked). The first student's guardian is primary.
        const existingLink = await tx.parentStudent.findFirst({
          where: { tenantId, parentId, studentId },
          select: { id: true },
        });
        if (!existingLink) {
          await tx.parentStudent.create({
            data: { tenantId, parentId, studentId, relation, isPrimary: true },
          });
        }

        const enrollment = await tx.enrollment.create({
          data: {
            tenantId,
            studentId,
            academicYearId: quote.academicYearId,
            gradeId: quote.gradeId,
            ...(entry.sectionId ? { sectionId: entry.sectionId } : {}),
            quoteId: quote.id,
            transportDirection: quote.transportDirection,
            status: EnrollmentStatus.COMMITTED,
            paymentMode: dto.paymentMode,
            feeModified: quote.feeModified,
            registrationFeePaid: dto.registrationFeePaid ?? true,
            createdById: this.actor(),
          },
        });

        // Link the student's AR account to the family account, then bill it through the family plan.
        const account = await this.accounts.ensureAccountTx(tx, tenantId, studentId);
        await this.financialAccounts.linkStudentAccountTx(tx, account.id, financialAccount.id);
        await this.createEnrollmentCharges(
          tx,
          tenantId,
          studentId,
          enrollment.id,
          quote,
          dto.registrationFeePaid ?? true,
          planOverride,
        );

        // Fee-modification tracking (recorded + auto-approved on the family path).
        const decidedNow = new Date();
        for (const item of quote.items) {
          if (!item.overridden || item.originalAmount === null) continue;
          const mod = await tx.feeModification.create({
            data: {
              tenantId,
              enrollmentId: enrollment.id,
              studentId,
              field: item.kind,
              originalValue: item.originalAmount.toFixed(3),
              newValue: item.amount.toFixed(3),
              difference: item.amount.minus(item.originalAmount).toFixed(3),
              reason: item.overrideReason ?? 'Registrar override',
              modifiedById: this.actor(),
            },
          });
          await tx.feeModificationApproval.create({
            data: {
              tenantId,
              modificationId: mod.id,
              status: ApprovalStatus.APPROVED,
              approverId: this.actor(),
              decidedAt: decidedNow,
              note: 'Auto-approved: family admission',
            },
          });
        }
        if (quote.feeModified) {
          await tx.studentBillingProfile.upsert({
            where: { studentId },
            create: { tenantId, studentId, feeModified: true },
            update: { feeModified: true },
          });
        }

        // Bus route assignment (mirror the admission choice into the fleet).
        if (entry.busRouteId) {
          const route = await tx.busRoute.findFirst({
            where: { id: entry.busRouteId, deletedAt: null },
            select: { id: true },
          });
          if (!route) throw new BadRequestException('Bus route not found in this tenant');
          const existingAssignment = await tx.studentBusAssignment.findFirst({
            where: { studentId },
          });
          if (existingAssignment) {
            await tx.studentBusAssignment.update({
              where: { id: existingAssignment.id },
              data: {
                routeId: entry.busRouteId,
                stopId: null,
                tripRound: entry.busTripRound ?? null,
              },
            });
          } else {
            await tx.studentBusAssignment.create({
              data: {
                tenantId,
                studentId,
                routeId: entry.busRouteId,
                tripRound: entry.busTripRound ?? null,
              },
            });
          }
        }

        await tx.registrationCommitment.create({
          data: {
            tenantId,
            enrollmentId: enrollment.id,
            studentId,
            idempotencyKey: `${dto.idempotencyKey}:${i}`,
            committedById: this.actor(),
          },
        });
        enrollmentIds.push(enrollment.id);
      }

      await this.writeAudit(tx, tenantId, {
        action: 'admissions.familyRegistration.commit',
        entityType: 'FinancialAccount',
        entityId: financialAccount.id,
        metadata: {
          parentId,
          academicYearId: dto.academicYearId,
          studentCount: dto.students.length,
          installments,
          paymentMode: dto.paymentMode,
        },
      });

      return { financialAccount, plan: familyPlan, enrollmentIds };
    });
  }

  /** Reconstruct a family commit result from a prior idempotent commit (returns the same account). */
  private async loadFamilyResult(tx: TxClient, idempotencyKey: string) {
    const commitments = await tx.registrationCommitment.findMany({
      where: { idempotencyKey: { startsWith: `${idempotencyKey}:` } },
      orderBy: { idempotencyKey: 'asc' },
      select: { enrollmentId: true, studentId: true },
    });
    const enrollmentIds = commitments.map((c) => c.enrollmentId);
    const firstStudent = commitments[0]?.studentId;
    const account = firstStudent
      ? await tx.studentFinancialAccount.findFirst({
          where: { studentId: firstStudent },
          select: { financialAccountId: true },
        })
      : null;
    const financialAccount = account?.financialAccountId
      ? await tx.financialAccount.findFirst({ where: { id: account.financialAccountId } })
      : null;
    const plan = financialAccount
      ? await tx.financialAccountPlan.findFirst({
          where: { financialAccountId: financialAccount.id },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    return { financialAccount, plan, enrollmentIds };
  }

  // ── Add a student to an EXISTING family (the existing-family wizard) ──
  /**
   * Add another child to an existing FinancialAccount. Three modes, none of which ever modify paid
   * history:
   *   MERGE     — fold the new student into the existing active family plan, spreading their tuition
   *               over only the REMAINING (future) family installment dates; already-paid installments
   *               are untouched.
   *   SEPARATE  — bill the new student through the family account but on their own independent plan.
   *   NEW_PLAN  — start a brand-new family plan (requires confirm=true; affects accounting).
   */
  async addStudentToFamily(financialAccountId: string, dto: AddFamilyStudentDto) {
    return this.run(async (tx, tenantId) => {
      const key = `${dto.idempotencyKey}:add`;
      const prior = await tx.registrationCommitment.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: key } },
        select: { enrollmentId: true },
      });
      if (prior) return { enrollmentId: prior.enrollmentId, mode: dto.mode, reused: true };

      const fa = await tx.financialAccount.findFirst({
        where: { id: financialAccountId },
        select: { id: true, parentId: true },
      });
      if (!fa) throw new BadRequestException('Financial account not found');
      if (!fa.parentId) {
        throw new BadRequestException('Financial account has no guardian to link the student to');
      }
      const parentId = fa.parentId;

      const quote = await tx.enrollmentQuote.findFirst({
        where: { id: dto.quoteId },
        include: { items: true },
      });
      if (!quote) throw new BadRequestException('Quote not found');
      if (quote.items.length === 0) throw new BadRequestException('Quote has no fee lines');

      // Resolve/create the student and link the family's guardian.
      let studentId = dto.existingStudentId ?? null;
      if (!studentId) {
        if (!dto.student) throw new BadRequestException('Student information is required');
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
            ...(dto.areaId ? { areaId: dto.areaId } : {}),
            ...(dto.transportRequested !== undefined
              ? { transportRequested: dto.transportRequested }
              : {}),
            status: StudentStatus.ACTIVE,
            qrCode: generateStudentQrCode(),
          },
          select: { id: true },
        });
        studentId = created.id;
      }
      const existingLink = await tx.parentStudent.findFirst({
        where: { tenantId, parentId, studentId },
        select: { id: true },
      });
      if (!existingLink) {
        await tx.parentStudent.create({
          data: {
            tenantId,
            parentId,
            studentId,
            relation: ParentRelation.GUARDIAN,
            isPrimary: true,
          },
        });
      }

      // Decide the plan alignment from the mode.
      let override: FamilyPlanOverride | undefined;
      let planId: string | null = null;
      if (dto.mode === AddFamilyStudentMode.MERGE) {
        if (quote.paymentMode !== QuotePaymentMode.INSTALLMENTS) {
          throw new BadRequestException(
            'MERGE requires the new student to be quoted in installments',
          );
        }
        const plan = await tx.financialAccountPlan.findFirst({
          where: {
            financialAccountId,
            academicYearId: quote.academicYearId,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
        });
        if (!plan) {
          throw new BadRequestException(
            'No active family plan to merge into — use NEW_PLAN or SEPARATE instead',
          );
        }
        // Only the REMAINING (today-or-later) family installment dates get the new student's tuition;
        // earlier (already-billed/paid) dates are never touched.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const remaining: Date[] = [];
        for (let i = 0; i < plan.installments; i += 1) {
          const due = addMonths(plan.firstDueDate, i);
          if (due >= startOfToday) remaining.push(due);
        }
        const firstRemaining = remaining[0] ?? new Date();
        override = {
          financialPlanId: plan.id,
          installments: remaining.length > 0 ? remaining.length : 1,
          firstDueDate: firstRemaining,
        };
        planId = plan.id;
      } else if (dto.mode === AddFamilyStudentMode.NEW_PLAN) {
        if (!dto.confirm) {
          throw new BadRequestException(
            'Creating a new family plan requires confirmation (confirm=true)',
          );
        }
        const paymentMode = dto.paymentMode ?? quote.paymentMode;
        const installments =
          paymentMode === QuotePaymentMode.FULL ? 1 : (dto.installments ?? quote.installments);
        const firstDue = dto.firstDueDate
          ? new Date(dto.firstDueDate)
          : (quote.firstDueDate ?? new Date());
        const plan = await tx.financialAccountPlan.create({
          data: {
            tenantId,
            financialAccountId,
            academicYearId: quote.academicYearId,
            cadence: 'MONTHLY',
            installments,
            firstDueDate: firstDue,
            createdById: this.actor(),
          },
        });
        override =
          paymentMode === QuotePaymentMode.INSTALLMENTS
            ? { financialPlanId: plan.id, installments, firstDueDate: firstDue }
            : undefined; // FULL new plan: per-line charges, still under the family account
        planId = plan.id;
      }
      // SEPARATE: no override — the student keeps their own plan (from their quote), still billed
      // through the family account so family payments can settle them.

      const enrollment = await tx.enrollment.create({
        data: {
          tenantId,
          studentId,
          academicYearId: quote.academicYearId,
          gradeId: quote.gradeId,
          ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
          quoteId: quote.id,
          transportDirection: quote.transportDirection,
          status: EnrollmentStatus.COMMITTED,
          paymentMode: quote.paymentMode,
          feeModified: quote.feeModified,
          registrationFeePaid: dto.registrationFeePaid ?? true,
          createdById: this.actor(),
        },
      });

      const account = await this.accounts.ensureAccountTx(tx, tenantId, studentId);
      await this.financialAccounts.linkStudentAccountTx(tx, account.id, financialAccountId);
      await this.createEnrollmentCharges(
        tx,
        tenantId,
        studentId,
        enrollment.id,
        quote,
        dto.registrationFeePaid ?? true,
        override,
      );

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

      await tx.registrationCommitment.create({
        data: {
          tenantId,
          enrollmentId: enrollment.id,
          studentId,
          idempotencyKey: key,
          committedById: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'admissions.family.addStudent',
        entityType: 'Enrollment',
        entityId: enrollment.id,
        metadata: { financialAccountId, studentId, mode: dto.mode, planId },
      });

      return { enrollmentId: enrollment.id, mode: dto.mode, financialAccountId, planId };
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
              enrollment.id,
              enrollment.quote,
              enrollment.registrationFeePaid,
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

  /** The enrollment a fee modification belongs to (used to (re)generate its registration agreement). */
  enrollmentIdForModification(modificationId: string): Promise<string | null> {
    return this.run(async (tx) => {
      const mod = await tx.feeModification.findFirst({
        where: { id: modificationId },
        select: { enrollmentId: true },
      });
      return mod?.enrollmentId ?? null;
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
