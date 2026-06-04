import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Transaction } from '@prisma/client';
import { TransactionRepository } from './transaction.repository';
import { StorageService, type PresignedUpload } from '../../common/storage.service';
import { requireTenantId } from '../../common/tenant.util';
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
  ) {}

  presignReceipt(dto: PresignReceiptDto): Promise<PresignedUpload> {
    const key = this.storage.buildKey(requireTenantId(), 'receipts', dto.fileName);
    return this.storage.presignUpload(key, dto.contentType);
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    // CliQ / e-wallet payments require a receipt or reference for verification.
    if ((dto.method === 'CLIQ' || dto.method === 'EWALLET') && !dto.receiptKey && !dto.reference) {
      throw new BadRequestException('CliQ/e-wallet payments require a receipt or a reference');
    }
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
    return this.repo.setStatus(txn.id, 'VERIFIED');
  }

  async reject(id: string, dto: RejectTransactionDto): Promise<Transaction> {
    const txn = await this.requirePending(id);
    return this.repo.setStatus(txn.id, 'REJECTED', dto.note);
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
