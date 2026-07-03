import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentLanguage, EnrollmentStatus, Prisma, QuotePaymentMode } from '@prisma/client';
import { DocumentEngineService } from './document-engine.service';
import { DocumentRepository } from './document.repository';
import {
  buildAgreementLayout,
  DEFAULT_AGREEMENT_LEGAL_TEXT,
  type AgreementSnapshot,
} from './templates/agreement-template';
import { fullNameAr, fullNameEn } from './templates/util';
import { splitFils, toFils } from '../finance/shared/money';

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
 * Registration Agreement generator (Part 1 + Versioning). Builds a permanent financial snapshot
 * from the committed enrollment's immutable quote, renders the legal agreement PDF, and archives it
 * as a versioned RegistrationAgreement. Called automatically right after a successful commit (and on
 * approval of a held enrollment). Re-running it after a fee change creates a NEW version and archives
 * the prior one — the agreement is never overwritten, and the PDF is never re-derived from live data.
 */
@Injectable()
export class RegistrationAgreementService {
  private readonly logger = new Logger(RegistrationAgreementService.name);

  constructor(
    private readonly engine: DocumentEngineService,
    private readonly repo: DocumentRepository,
  ) {}

  /**
   * Best-effort auto-generation hook used by Admissions after commit/approval. Only generates for a
   * COMMITTED enrollment, and never throws into the caller — a registration must succeed even if the
   * (regenerable-from-snapshot) document could not be produced.
   */
  async tryAutoGenerate(enrollmentId: string): Promise<void> {
    try {
      const enrollment = await this.repo.enrollmentContext(enrollmentId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.COMMITTED) return;
      await this.generate(enrollmentId, DocumentLanguage.EN);
    } catch (err) {
      this.logger.error(`auto-generation of registration agreement failed: ${String(err)}`);
    }
  }

  /** Generate (or version up) the registration agreement for an enrollment. */
  async generate(enrollmentId: string, language: DocumentLanguage) {
    const enrollment = await this.repo.enrollmentContext(enrollmentId);
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (!enrollment.quote) throw new NotFoundException('Enrollment has no quote to snapshot');

    const snapshot = this.buildSnapshot(enrollment, language);
    const branding = await this.engine.resolveBranding();
    const layout = buildAgreementLayout(snapshot, language);
    const rendered = await this.engine.render(layout, branding);

    const primaryParent = enrollment.student.parentLinks[0]?.parent ?? null;
    const result = await this.repo.persistAgreementVersion({
      enrollmentId,
      studentId: enrollment.studentId,
      parentId: primaryParent?.id ?? null,
      academicYearId: enrollment.academicYearId,
      campusId: enrollment.academicYear?.campusId ?? null,
      gradeId: enrollment.gradeId,
      sectionId: enrollment.student.section?.id ?? null,
      registrationDate: enrollment.createdAt,
      paymentMode: enrollment.paymentMode,
      installments: snapshot.installments,
      feeBreakdown: snapshot.lines,
      installmentSchedule: snapshot.schedule,
      grandTotal: new Prisma.Decimal(snapshot.grandTotal),
      title: layout.title,
      language,
      dataSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      pdf: rendered.buffer,
      checksum: rendered.checksum,
      byteSize: rendered.byteSize,
    });
    return result;
  }

  private buildSnapshot(
    enrollment: NonNullable<Awaited<ReturnType<DocumentRepository['enrollmentContext']>>>,
    language: DocumentLanguage,
  ): AgreementSnapshot {
    const quote = enrollment.quote!;
    const student = enrollment.student;
    const parent = student.parentLinks[0]?.parent ?? null;

    const lines = quote.items.map((it) => {
      const gross = it.amount;
      const discount = it.discountAmount;
      const net = gross.minus(discount);
      return {
        label: it.label,
        gross: gross.toFixed(3),
        discount: discount.toFixed(3),
        net: net.toFixed(3),
      };
    });
    const subtotal = lines.reduce((s, l) => s + Number(l.gross), 0);
    const totalDiscount = lines.reduce((s, l) => s + Number(l.discount), 0);
    const grandTotal = quote.grandTotal.toFixed(3);

    // Deterministically reproduce the committed payment schedule from the immutable quote (same
    // algorithm AdmissionsRepository.createEnrollmentCharges used), so the snapshot is permanent.
    const schedule: AgreementSnapshot['schedule'] = [];
    const base = quote.firstDueDate ?? enrollment.createdAt;
    if (quote.paymentMode === QuotePaymentMode.FULL) {
      schedule.push({ index: 1, dueDate: this.iso(quote.firstDueDate), amount: grandTotal });
    } else {
      const months = quote.installments;
      const parts = splitFils(toFils(grandTotal), months); // shared single source
      for (let i = 0; i < months; i += 1) {
        schedule.push({
          index: i + 1,
          dueDate: this.iso(addMonths(base, i)),
          amount: (parts[i]! / 1000).toFixed(3),
        });
      }
    }

    return {
      agreementNo: 0, // assigned at persist time
      version: 0, // assigned at persist time
      academicYearName: enrollment.academicYear?.name ?? '—',
      registrationDate: this.iso(enrollment.createdAt) ?? '',
      studentNameEn: fullNameEn(student),
      studentNameAr: fullNameAr(student),
      studentNationalId: student.nationalId,
      parentNameEn: parent ? fullNameEn(parent) : null,
      parentNameAr: parent ? fullNameAr(parent) : null,
      parentPhone: parent?.phone ?? null,
      gradeName:
        language === DocumentLanguage.AR
          ? (enrollment.grade?.nameAr ?? '—')
          : (enrollment.grade?.nameEn ?? '—'),
      sectionName: student.section?.name ?? null,
      paymentMode: quote.paymentMode,
      installments: quote.paymentMode === QuotePaymentMode.FULL ? 1 : quote.installments,
      lines,
      subtotal: subtotal.toFixed(3),
      totalDiscount: totalDiscount.toFixed(3),
      grandTotal,
      schedule,
      legalText: DEFAULT_AGREEMENT_LEGAL_TEXT,
      registrarName: null,
    };
  }

  private iso(d: Date | null | undefined): string | null {
    return d ? new Date(d).toISOString().slice(0, 10) : null;
  }
}
