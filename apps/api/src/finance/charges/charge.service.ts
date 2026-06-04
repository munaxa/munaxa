import { BadRequestException, Injectable } from '@nestjs/common';
import type { Charge } from '@prisma/client';
import { ChargeRepository } from './charge.repository';
import type { CreateChargeDto } from './charge.dto';

@Injectable()
export class ChargeService {
  constructor(private readonly repo: ChargeRepository) {}

  async create(dto: CreateChargeDto): Promise<Charge> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    if (dto.feePlanId && !(await this.repo.feePlanExists(dto.feePlanId))) {
      throw new BadRequestException('Fee plan not found in this tenant');
    }
    return this.repo.create({
      studentId: dto.studentId,
      feePlanId: dto.feePlanId ?? null,
      description: dto.description,
      amount: dto.amount,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
  }

  listForStudent(studentId: string): Promise<Charge[]> {
    return this.repo.findByStudent(studentId);
  }
}
