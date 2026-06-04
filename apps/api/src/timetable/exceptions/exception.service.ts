import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ScheduleException } from '@prisma/client';
import { ExceptionRepository } from './exception.repository';
import type { CreateExceptionDto, UpdateExceptionDto } from './exception.dto';

@Injectable()
export class ExceptionService {
  constructor(private readonly repo: ExceptionRepository) {}

  async create(dto: CreateExceptionDto): Promise<ScheduleException> {
    if (dto.sectionId && !(await this.repo.sectionExists(dto.sectionId))) {
      throw new BadRequestException('Section not found in this tenant');
    }
    return this.repo.create({
      date: new Date(dto.date),
      sectionId: dto.sectionId ?? null,
      periodIndex: dto.periodIndex ?? null,
      type: dto.type,
      subject: dto.subject ?? null,
      teacherId: dto.teacherId ?? null,
      substituteTeacherId: dto.substituteTeacherId ?? null,
      classroomId: dto.classroomId ?? null,
      note: dto.note ?? null,
    });
  }

  list(sectionId?: string, date?: string): Promise<ScheduleException[]> {
    return this.repo.list({ sectionId, date: date ? new Date(date) : undefined });
  }

  async get(id: string): Promise<ScheduleException> {
    const exception = await this.repo.findById(id);
    if (!exception) throw new NotFoundException('Schedule exception not found');
    return exception;
  }

  async update(id: string, dto: UpdateExceptionDto): Promise<ScheduleException> {
    await this.get(id);
    const data: Prisma.ScheduleExceptionUpdateInput = {
      ...(dto.date ? { date: new Date(dto.date) } : {}),
      ...(dto.periodIndex !== undefined ? { periodIndex: dto.periodIndex } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
    return this.repo.update(id, data);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.delete(id);
  }
}
