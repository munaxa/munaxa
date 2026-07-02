import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transaction } from '@prisma/client';
import { TransactionRepository } from './transaction.repository';
import { StorageService, type PresignedUpload } from '../../common/storage.service';
import { MailService } from '../../mail/mail.service';
import type { Env } from '../../config/env.validation';
import { requireTenantId } from '../../common/tenant.util';
import { LedgerService } from '../ledger/ledger.service';
import type {
  CreateTransactionDto,
  PresignReceiptDto,
  RejectTransactionDto,
} from './transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly storage: StorageService,
    private readonly ledger: LedgerService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  presignReceipt(dto: PresignReceiptDto): Promise<PresignedUpload> {
    const key = this.storage.buildKey(requireTenantId(), 'receipts', dto.fileName);
    return this.storage.presignUpload(key, dto.contentType, dto.size);
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    // CliQ / e-wallet payments require a receipt or reference for verification.
    if ((dto.method === 'CLIQ' || dto.method === 'EWALLET') && !dto.receiptKey && !dto.reference) {
      throw new BadRequestException('CliQ/e-wallet payments require a receipt or a reference');
    }
    // Reject a receiptKey pointing at another tenant's S3 object.
    if (dto.receiptKey) this.storage.assertKeyInTenant(dto.receiptKey);
    return this.repo.create({
      studentId: dto.studentId,
      chargeId: dto.chargeId ?? null,
      amount: dto.amount,
      method: dto.method,
      reference: dto.reference ?? null,
      receiptKey: dto.receiptKey ?? null,
      note: dto.note ?? null,
      status: 'PENDING',
    });
  }

  async verify(id: string): Promise<Transaction> {
    const txn = await this.requirePending(id);
    const verified = await this.repo.setStatus(txn.id, 'VERIFIED');
    // If the payment targeted a specific charge, apply it there automatically so the
    // per-charge status (PARTIAL/PAID) reflects reality. Unallocated payments become credit.
    if (verified.chargeId) {
      await this.ledger.autoAllocateOnVerify(verified.id, verified.chargeId);
    }
    return verified;
  }

  async reject(id: string, dto: RejectTransactionDto): Promise<Transaction> {
    const txn = await this.requirePending(id);
    return this.repo.setStatus(txn.id, 'REJECTED', dto.note);
  }

  /**
   * Email the student's parent that a settled (verified) payment was received, and record on the
   * transaction that the notification was sent. Staff trigger this from Finance after verifying.
   */
  async notifyParent(id: string): Promise<Transaction> {
    const txn = await this.repo.findById(id);
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== 'VERIFIED') {
      throw new ConflictException('Only a settled (verified) payment can be notified');
    }
    const { studentNameEn, parentEmail } = await this.repo.studentNotifyContact(txn.studentId);
    if (!parentEmail) {
      throw new BadRequestException('No parent email on file for this student');
    }
    const schoolName = await this.repo.tenantName();
    const amount = `${txn.amount.toFixed(3)} JOD`;
    const subject = `${schoolName}: payment received`;
    const html =
      `<p>Dear parent,</p>` +
      `<p>We confirm we have received a payment of <strong>${amount}</strong>` +
      `${studentNameEn ? ` for <strong>${studentNameEn}</strong>` : ''}.</p>` +
      `<p>Thank you,<br/>${schoolName}</p>`;
    const text =
      `Dear parent,\n\nWe confirm we have received a payment of ${amount}` +
      `${studentNameEn ? ` for ${studentNameEn}` : ''}.\n\nThank you,\n${schoolName}`;
    // Send as THIS school (auto-derived <slug>@<verified-domain>, or the school's own override
    // from Notification Settings) rather than a single global finance address.
    const domain = this.config.get('EMAIL_SENDER_DOMAIN', { infer: true });
    const fallbackFrom = this.config.get('EMAIL_FROM_FINANCE', { infer: true });
    const { from, replyTo } = await this.repo.financeSender(domain, fallbackFrom);
    const { sent } = await this.mail.send({
      to: parentEmail,
      subject,
      html,
      text,
      from,
      ...(replyTo ? { replyTo } : {}),
    });
    if (!sent) {
      throw new ServiceUnavailableException('Email could not be sent (mail service unavailable)');
    }
    return this.repo.setParentNotified(id);
  }

  listForStudent(studentId: string): Promise<Transaction[]> {
    return this.repo.findByStudent(studentId);
  }

  private async requirePending(id: string): Promise<Transaction> {
    const txn = await this.repo.findById(id);
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== 'PENDING') {
      throw new ConflictException(`Transaction is already ${txn.status}`);
    }
    return txn;
  }
}
