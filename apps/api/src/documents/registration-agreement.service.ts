import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { StorageService, type PresignedUpload } from '../common/storage.service';
import { requireTenantId } from '../common/tenant.util';
import type { AccessContext } from './document.types';
import type { ConfirmSignedAgreementDto, PresignSignedAgreementDto } from './documents.dto';

/** The signed countersigned copy may only be a PDF or a photo of the paper agreement (JPG/PNG). */
const SIGNED_UPLOAD_MIME: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

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
 * Registration Agreement generator. Builds a permanent financial snapshot from the committed
 * enrollment's immutable quote, renders the legal agreement PDF, and stores it as THE (single,
 * immutable) RegistrationAgreement for that enrollment. Called automatically right after a successful
 * commit (and on approval of a held enrollment). Generation is **idempotent**: once an agreement
 * exists for the enrollment it is never regenerated or versioned — later financial changes live in
 * the billing ledger, not on the agreement. It also manages the parent's countersigned copy (upload
 * / replace / view / delete), stored in object storage and referenced by key.
 */
@Injectable()
export class RegistrationAgreementService {
  private readonly logger = new Logger(RegistrationAgreementService.name);

  constructor(
    private readonly engine: DocumentEngineService,
    private readonly repo: DocumentRepository,
    private readonly storage: StorageService,
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

  /**
   * Generate THE registration agreement for an enrollment. Idempotent: if a (non-cancelled)
   * agreement already exists for the enrollment it is returned unchanged — the agreement is
   * immutable and one-per-enrollment, never versioned or regenerated from later financial data.
   */
  async generate(enrollmentId: string, language: DocumentLanguage) {
    const enrollment = await this.repo.enrollmentContext(enrollmentId);
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (!enrollment.quote) throw new NotFoundException('Enrollment has no quote to snapshot');

    const existing = await this.repo.agreementByEnrollment(enrollmentId);
    if (existing) {
      const { document, ...agreement } = existing;
      return { agreement, document };
    }

    const snapshot = this.buildSnapshot(enrollment, language);
    const branding = await this.engine.resolveBranding();
    const layout = buildAgreementLayout(snapshot, language);
    const rendered = await this.engine.render(layout, branding);

    const primaryParent = enrollment.student.parentLinks[0]?.parent ?? null;
    const result = await this.repo.persistAgreement({
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

  // ── Signed (countersigned) copy ────────────────────────────────────────────

  private assertSignedType(contentType: string): void {
    const type = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
    if (!SIGNED_UPLOAD_MIME.has(type)) {
      throw new BadRequestException('Signed agreement must be a PDF, JPG or PNG file');
    }
  }

  /** Pre-sign a direct-to-bucket upload for the parent's countersigned copy (PDF/JPG/PNG only). */
  async presignSigned(
    agreementId: string,
    dto: PresignSignedAgreementDto,
  ): Promise<PresignedUpload> {
    this.assertSignedType(dto.contentType);
    const agreement = await this.repo.agreementById(agreementId);
    if (!agreement) throw new NotFoundException('Registration agreement not found');
    const key = this.storage.buildKey(requireTenantId(), 'agreements-signed', dto.fileName);
    return this.storage.presignUpload(key, dto.contentType, dto.size);
  }

  /**
   * Confirm an uploaded signed copy. `mode` distinguishes the first upload (DOCUMENT_UPLOAD_SIGNED)
   * from a replacement (DOCUMENT_REPLACE_SIGNED, enforced by the controller). A first upload over an
   * already-signed agreement is rejected — the caller must use the replace endpoint. On replace, the
   * previously stored object is deleted so the bucket never keeps an orphaned copy.
   */
  async confirmSigned(
    agreementId: string,
    dto: ConfirmSignedAgreementDto,
    mode: 'upload' | 'replace',
    ctx?: AccessContext,
  ) {
    this.assertSignedType(dto.contentType);
    this.storage.assertKeyInTenant(dto.fileKey);
    const agreement = await this.repo.agreementById(agreementId);
    if (!agreement) throw new NotFoundException('Registration agreement not found');
    if (mode === 'upload' && agreement.signedFileKey) {
      throw new ConflictException(
        'A signed agreement already exists — use replace to overwrite it',
      );
    }
    const { priorKey } = await this.repo.attachSignedAgreement({
      agreementId,
      fileKey: dto.fileKey,
      fileName: dto.fileName,
      contentType: dto.contentType,
      size: dto.size ?? null,
      signedBy: dto.signedBy ?? null,
      signedAt: dto.signedAt ? new Date(dto.signedAt) : null,
      mode,
      ...(ctx ? { ctx } : {}),
    });
    if (priorKey && priorKey !== dto.fileKey) {
      await this.storage.deleteObject(priorKey).catch((err) => {
        this.logger.error(`failed to delete superseded signed copy: ${String(err)}`);
      });
    }
    return { signed: true };
  }

  /** Issue a short-lived presigned download URL for the signed copy (audited as a VIEW). */
  async viewSigned(agreementId: string, ctx?: AccessContext): Promise<{ url: string }> {
    const agreement = await this.repo.agreementById(agreementId);
    if (!agreement) throw new NotFoundException('Registration agreement not found');
    if (!agreement.signedFileKey) {
      throw new NotFoundException('No signed agreement has been uploaded');
    }
    this.storage.assertKeyInTenant(agreement.signedFileKey);
    const url = await this.storage.presignDownload(agreement.signedFileKey);
    await this.repo.auditSignedView(agreementId, ctx);
    return { url };
  }

  /** Delete the uploaded signed copy (reference + stored object). Audited. */
  async deleteSigned(agreementId: string, ctx?: AccessContext): Promise<{ deleted: boolean }> {
    const agreement = await this.repo.agreementById(agreementId);
    if (!agreement) throw new NotFoundException('Registration agreement not found');
    if (!agreement.signedFileKey) {
      throw new NotFoundException('No signed agreement has been uploaded');
    }
    const { priorKey } = await this.repo.clearSignedAgreement(agreementId, ctx);
    if (priorKey) {
      await this.storage.deleteObject(priorKey).catch((err) => {
        this.logger.error(`failed to delete signed copy object: ${String(err)}`);
      });
    }
    return { deleted: true };
  }
}
