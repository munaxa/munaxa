import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AcademicYear } from '@prisma/client';
import { AcademicYearRepository } from './academic-year.repository';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './academic-year.dto';

@Injectable()
export class AcademicYearService {
  constructor(private readonly repo: AcademicYearRepository) {}

  async create(dto: CreateAcademicYearDto): Promise<AcademicYear> {
    if (!(await this.repo.campusExists(dto.campusId))) {
      throw new BadRequestException('Campus not found in this tenant');
    }
    this.assertDateOrder(dto.startDate, dto.endDate);
    if (dto.isCurrent) await this.repo.clearCurrent(dto.campusId);
    return this.repo.create({
      campusId: dto.campusId,
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isCurrent: dto.isCurrent ?? false,
    });
  }

  list(campusId?: string): Promise<AcademicYear[]> {
    return this.repo.findMany(campusId);
  }

  async get(id: string): Promise<AcademicYear> {
    const year = await this.repo.findById(id);
    if (!year) throw new NotFoundException('Academic year not found');
    return year;
  }

  async update(id: string, dto: UpdateAcademicYearDto): Promise<AcademicYear> {
    const existing = await this.get(id);
    const start = dto.startDate ?? existing.startDate.toISOString();
    const end = dto.endDate ?? existing.endDate.toISOString();
    this.assertDateOrder(start, end);
    if (dto.isCurrent) await this.repo.clearCurrent(existing.campusId);
    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
    });
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.delete(id);
  }

  private assertDateOrder(start: string, end: string): void {
    if (new Date(start).getTime() >= new Date(end).getTime()) {
      throw new BadRequestException('startDate must be before endDate');
    }
  }
}
