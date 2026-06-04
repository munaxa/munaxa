import { Injectable, NotFoundException } from '@nestjs/common';
import type { FeePlan } from '@prisma/client';
import { FeePlanRepository } from './fee-plan.repository';
import type { CreateFeePlanDto, UpdateFeePlanDto } from './fee-plan.dto';

@Injectable()
export class FeePlanService {
  constructor(private readonly repo: FeePlanRepository) {}

  create(dto: CreateFeePlanDto): Promise<FeePlan> {
    return this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      amount: dto.amount,
      recurrence: dto.recurrence ?? 'ONE_TIME',
      isActive: dto.isActive ?? true,
    });
  }

  list(): Promise<FeePlan[]> {
    return this.repo.findMany();
  }

  async get(id: string): Promise<FeePlan> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundException('Fee plan not found');
    return plan;
  }

  async update(id: string, dto: UpdateFeePlanDto): Promise<FeePlan> {
    await this.get(id);
    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(dto.recurrence !== undefined ? { recurrence: dto.recurrence } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
  }
}
