import { Injectable, NotFoundException } from '@nestjs/common';
import { SlotRepository } from '../slots/slot.repository';
import { ExceptionRepository } from '../exceptions/exception.repository';
import { TimetableConfigRepository } from '../config/config.repository';
import {
  dayOfWeekOf,
  findCurrentAndNext,
  resolveDay,
  resolveScheduleType,
  type ExceptionInput,
  type RamadanConfig,
  type ResolvedDay,
  type ResolvedPeriod,
  type SlotInput,
} from '../engine/timetable-engine';

export interface CurrentClass {
  scheduleType: ResolvedDay['scheduleType'];
  isHoliday: boolean;
  current: ResolvedPeriod | null;
  next: ResolvedPeriod | null;
}

/**
 * Loads the master timetable, exceptions and config for a section/date and runs the pure
 * timetable engine to resolve the day's schedule and the current/next class.
 */
@Injectable()
export class ResolverService {
  constructor(
    private readonly slots: SlotRepository,
    private readonly exceptions: ExceptionRepository,
    private readonly config: TimetableConfigRepository,
  ) {}

  async resolveDay(sectionId: string, dateInput: Date): Promise<ResolvedDay> {
    const campusId = await this.config.sectionCampusId(sectionId);
    if (!campusId) throw new NotFoundException('Section not found');

    const date = atUtcMidnight(dateInput);
    const [slotRows, exceptionRows, configRow] = await Promise.all([
      this.slots.findBySection(sectionId),
      this.exceptions.findForSectionDate(sectionId, date),
      this.config.findByCampus(campusId),
    ]);

    const ramadan: RamadanConfig | null = configRow
      ? {
          ramadanModeEnabled: configRow.ramadanModeEnabled,
          ramadanStartDate: configRow.ramadanStartDate,
          ramadanEndDate: configRow.ramadanEndDate,
        }
      : null;

    const scheduleType = resolveScheduleType(ramadan, date);
    const slots: SlotInput[] = slotRows.map((s) => ({
      scheduleType: s.scheduleType,
      dayOfWeek: s.dayOfWeek,
      periodIndex: s.periodIndex,
      startTime: s.startTime,
      endTime: s.endTime,
      subject: s.subject,
      teacherId: s.teacherId,
      classroomId: s.classroomId,
    }));
    const exceptions: ExceptionInput[] = exceptionRows.map((e) => ({
      periodIndex: e.periodIndex,
      type: e.type,
      subject: e.subject,
      teacherId: e.teacherId,
      substituteTeacherId: e.substituteTeacherId,
      classroomId: e.classroomId,
      note: e.note,
    }));

    return resolveDay({ slots, exceptions, scheduleType, dayOfWeek: dayOfWeekOf(date) });
  }

  async currentClass(sectionId: string, at: Date): Promise<CurrentClass> {
    const day = await this.resolveDay(sectionId, at);
    const nowMinutes = at.getUTCHours() * 60 + at.getUTCMinutes();
    const { current, next } = findCurrentAndNext(day.periods, nowMinutes);
    return { scheduleType: day.scheduleType, isHoliday: day.isHoliday, current, next };
  }
}

function atUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
