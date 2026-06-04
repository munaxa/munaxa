import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TimetableSlot } from '@prisma/client';
import { SlotRepository } from './slot.repository';
import { timeToMinutes } from '../engine/timetable-engine';
import type { CreateSlotDto, UpdateSlotDto } from './slot.dto';

@Injectable()
export class SlotService {
  constructor(private readonly repo: SlotRepository) {}

  async create(dto: CreateSlotDto): Promise<TimetableSlot> {
    if (!(await this.repo.sectionExists(dto.sectionId))) {
      throw new BadRequestException('Section not found in this tenant');
    }
    this.assertTimeOrder(dto.startTime, dto.endTime);
    return this.repo.create({
      sectionId: dto.sectionId,
      scheduleType: dto.scheduleType ?? 'REGULAR',
      dayOfWeek: dto.dayOfWeek,
      periodIndex: dto.periodIndex,
      startTime: dto.startTime,
      endTime: dto.endTime,
      subject: dto.subject,
      teacherId: dto.teacherId ?? null,
      classroomId: dto.classroomId ?? null,
    });
  }

  listBySection(sectionId: string): Promise<TimetableSlot[]> {
    return this.repo.findBySection(sectionId);
  }

  async get(id: string): Promise<TimetableSlot> {
    const slot = await this.repo.findById(id);
    if (!slot) throw new NotFoundException('Timetable slot not found');
    return slot;
  }

  async update(id: string, dto: UpdateSlotDto): Promise<TimetableSlot> {
    const existing = await this.get(id);
    const start = dto.startTime ?? existing.startTime;
    const end = dto.endTime ?? existing.endTime;
    this.assertTimeOrder(start, end);
    return this.repo.update(id, {
      ...(dto.scheduleType !== undefined ? { scheduleType: dto.scheduleType } : {}),
      ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
      ...(dto.periodIndex !== undefined ? { periodIndex: dto.periodIndex } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
      ...(dto.classroomId !== undefined ? { classroomId: dto.classroomId } : {}),
    });
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.delete(id);
  }

  private assertTimeOrder(start: string, end: string): void {
    if (timeToMinutes(start) >= timeToMinutes(end)) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }
}
