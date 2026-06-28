import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentLanguage, DocumentType } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { MailService } from '../mail/mail.service';
import { DocumentRepository, type DocumentMeta } from './document.repository';
import { FinanceDocumentsService } from './finance-documents.service';
import { RegistrationAgreementService } from './registration-agreement.service';
import type { EmailDocumentDto, GenerateAgreementDto, GenerateDocumentDto } from './documents.dto';
import { docNumber } from './templates/util';

/**
 * Document Engine orchestrator: the single entry point the API/UI talk to. Dispatches generation by
 * type, lists the archive, and serves stored snapshots for print/download/email — each of which is
 * audited (Part 8). Reprints always return the exact stored PDF, never a re-render.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly finance: FinanceDocumentsService,
    private readonly agreements: RegistrationAgreementService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  generate(dto: GenerateDocumentDto): Promise<DocumentMeta> {
    const language = dto.language ?? DocumentLanguage.EN;
    switch (dto.type) {
      case DocumentType.PAYMENT_RECEIPT:
        if (!dto.transactionId) throw new BadRequestException('transactionId is required for a receipt');
        return this.finance.paymentReceipt(dto.transactionId, language);
      case DocumentType.ANNUAL_TUITION_CERTIFICATE:
        if (!dto.academicYearId)
          throw new BadRequestException('academicYearId is required for a tuition certificate');
        return this.finance.annualTuitionCertificate(
          dto.studentId,
          { academicYearId: dto.academicYearId, ...(dto.includeKinds ? { includeKinds: dto.includeKinds } : {}) },
          language,
        );
      case DocumentType.OUTSTANDING_BALANCE_CERTIFICATE:
        return this.finance.outstandingBalanceCertificate(dto.studentId, language);
      case DocumentType.CLEARANCE_CERTIFICATE:
        return this.finance.clearanceCertificate(dto.studentId, language);
      case DocumentType.ACCOUNT_STATEMENT:
        return this.finance.accountStatement(dto.studentId, language);
      case DocumentType.PAYMENT_HISTORY:
        return this.finance.paymentHistory(dto.studentId, language);
      case DocumentType.FEE_BREAKDOWN:
        return this.finance.feeBreakdown(dto.studentId, language);
      case DocumentType.STUDENT_FINANCIAL_SUMMARY:
        return this.finance.studentFinancialSummary(dto.studentId, language);
      case DocumentType.REGISTRATION_AGREEMENT:
        throw new BadRequestException(
          'Use POST /documents/agreements to (re)generate a registration agreement',
        );
      default:
        throw new BadRequestException('Unsupported document type');
    }
  }

  async generateAgreement(dto: GenerateAgreementDto) {
    const { agreement, document } = await this.agreements.generate(
      dto.enrollmentId,
      dto.language ?? DocumentLanguage.EN,
    );
    return { agreement, document };
  }

  list(filter: { studentId?: string; type?: DocumentType; enrollmentId?: string }) {
    return this.repo.listDocuments(filter);
  }

  async getMeta(id: string): Promise<DocumentMeta> {
    const meta = await this.repo.getMeta(id);
    if (!meta) throw new NotFoundException('Document not found');
    return meta;
  }

  listAgreements(filter: { studentId?: string; enrollmentId?: string }) {
    return this.repo.listAgreements(filter);
  }

  academicYears() {
    return this.repo.academicYears();
  }

  download(id: string) {
    return this.repo.download(id);
  }

  print(id: string) {
    return this.repo.print(id);
  }

  /** Email the stored PDF as an attachment, then audit the send. */
  async email(id: string, dto: EmailDocumentDto): Promise<{ sent: boolean }> {
    const { meta, pdf } = await this.repo.pdfFor(id);
    const filename = `${meta.type.toLowerCase()}-${docNumber('DOC', meta.documentNo)}.pdf`;
    const subject = meta.title;
    const html =
      `<p>Dear parent,</p><p>Please find attached your document: <strong>${meta.title}</strong>.</p>` +
      `${dto.message ? `<p>${dto.message}</p>` : ''}<p>Thank you.</p>`;
    const from = this.config.get('EMAIL_FROM_FINANCE', { infer: true });
    const { sent } = await this.mail.send({
      to: dto.to,
      subject,
      html,
      ...(from ? { from } : {}),
      attachments: [{ filename, content: pdf }],
    });
    if (!sent) {
      throw new ServiceUnavailableException('Email could not be sent (mail service unavailable)');
    }
    await this.repo.logEmail(id, dto.to);
    return { sent };
  }
}
