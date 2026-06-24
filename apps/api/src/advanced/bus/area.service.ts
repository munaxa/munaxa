import { Injectable, NotFoundException } from '@nestjs/common';
import type { Area } from '@prisma/client';
import { AreaRepository } from './area.repository';
import type { CreateAreaDto, UpdateAreaDto } from './area.dto';

@Injectable()
export class AreaService {
  constructor(private readonly repo: AreaRepository) {}

  list(filter: { active?: boolean; transportationAvailable?: boolean }): Promise<Area[]> {
    return this.repo.list(filter);
  }

  create(dto: CreateAreaDto): Promise<Area> {
    return this.repo.create({
      name: dto.name,
      ...(dto.transportationAvailable !== undefined
        ? { transportationAvailable: dto.transportationAvailable }
        : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      notes: dto.notes ?? null,
    });
  }

  async update(id: string, dto: UpdateAreaDto): Promise<Area> {
    const area = await this.repo.find(id);
    if (!area) throw new NotFoundException('Area not found');
    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.transportationAvailable !== undefined
        ? { transportationAvailable: dto.transportationAvailable }
        : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
    });
  }
}
