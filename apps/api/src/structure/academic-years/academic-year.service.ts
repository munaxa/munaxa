import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearStatus, type AcademicYear } from '@prisma/client';
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

    const schoolId = await this.repo.campusSchoolId(dto.campusId);
    const status = this.resolveStatus(dto.status, dto.isCurrent);

    // One ACTIVE per School (Decision 1): supersede any other active year before activating this one.
    if (status === AcademicYearStatus.ACTIVE) {
      await this.repo.clearActiveForSchool(schoolId, dto.campusId);
    }

    return this.repo.create({
      campusId: dto.campusId,
      schoolId,
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status,
      isCurrent: status === AcademicYearStatus.ACTIVE,
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

    // Resolve the requested status (explicit `status` wins; else map the deprecated `isCurrent`).
    const nextStatus =
      dto.status ??
      (dto.isCurrent === undefined ? undefined : this.resolveStatus(undefined, dto.isCurrent));

    if (nextStatus === AcademicYearStatus.ACTIVE) {
      await this.repo.clearActiveForSchool(existing.schoolId, existing.campusId, id);
    }

    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      ...(nextStatus !== undefined
        ? { status: nextStatus, isCurrent: nextStatus === AcademicYearStatus.ACTIVE }
        : {}),
    });
  }

  /**
   * Close an Academic Year (Decision 8). Administrative event only: flips status to CLOSED and clears
   * the legacy current flag. Does NOT touch Student or Enrollment rows (the Year-End Processing wizard
   * owns promotion). Idempotent.
   */
  async close(id: string): Promise<AcademicYear> {
    const existing = await this.get(id);
    if (existing.status === AcademicYearStatus.CLOSED) return existing;
    return this.repo.update(id, { status: AcademicYearStatus.CLOSED, isCurrent: false });
  }

  /**
   * Deletion is NOT permitted (Decision 8). Academic Years anchor immutable historical data
   * (attendance, grades, finance, …) and are only ever closed. Callers must use `close` instead.
   */
  remove(_id: string): Promise<never> {
    return Promise.reject(
      new BadRequestException(
        'Academic years cannot be deleted. Close the year instead (POST /academic-years/:id/close).',
      ),
    );
  }

  /** Map the explicit `status` (preferred) or the deprecated `isCurrent` flag to a lifecycle status. */
  private resolveStatus(
    status: AcademicYearStatus | undefined,
    isCurrent: boolean | undefined,
  ): AcademicYearStatus {
    if (status) return status;
    if (isCurrent) return AcademicYearStatus.ACTIVE;
    return AcademicYearStatus.UPCOMING;
  }

  private assertDateOrder(start: string, end: string): void {
    if (new Date(start).getTime() >= new Date(end).getTime()) {
      throw new BadRequestException('startDate must be before endDate');
    }
  }
}
