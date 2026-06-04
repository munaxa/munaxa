/**
 * Munaxa timetable resolution engine (pure, framework-free — fully unit-testable).
 *
 * Current-class algorithm (Phase 6 spec):
 *   1. Check ScheduleExceptions for the date.
 *   2. If an exception applies to a period, use it (cancel / substitute / replace);
 *      a whole-day HOLIDAY exception means no classes.
 *   3. Otherwise use the MasterTimetable slot.
 *   4. If Ramadan mode is active for the date, use the RAMADAN master set (else REGULAR).
 *
 * Implementation order: resolve the schedule type first (step 4 selects REGULAR vs RAMADAN
 * master slots), build the day from those slots (step 3), then overlay exceptions (steps 1-2).
 */

export type DayOfWeek = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export type ScheduleType = 'REGULAR' | 'RAMADAN';
export type ExceptionType = 'CANCELLATION' | 'SUBSTITUTION' | 'REPLACEMENT' | 'HOLIDAY';
export type PeriodStatus = 'SCHEDULED' | 'CANCELLED' | 'SUBSTITUTED' | 'REPLACED';

export interface SlotInput {
  scheduleType: ScheduleType;
  dayOfWeek: DayOfWeek;
  periodIndex: number;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  subject: string;
  teacherId: string | null;
  classroomId: string | null;
}

export interface ExceptionInput {
  periodIndex: number | null; // null => whole-day (with HOLIDAY)
  type: ExceptionType;
  subject: string | null;
  teacherId: string | null; // replacement teacher
  substituteTeacherId: string | null;
  classroomId: string | null;
  note: string | null;
}

export interface RamadanConfig {
  ramadanModeEnabled: boolean;
  ramadanStartDate: Date | null;
  ramadanEndDate: Date | null;
}

export interface ResolvedPeriod {
  periodIndex: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string | null;
  classroomId: string | null;
  status: PeriodStatus;
  substituteTeacherId: string | null;
  note: string | null;
}

export interface ResolvedDay {
  scheduleType: ScheduleType;
  dayOfWeek: DayOfWeek;
  isHoliday: boolean;
  periods: ResolvedPeriod[];
}

const DAY_INDEX: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Map a JS Date (interpreted in UTC) to the day-of-week enum. */
export function dayOfWeekOf(date: Date): DayOfWeek {
  return DAY_INDEX[date.getUTCDay()]!;
}

/** Parse "HH:MM" into minutes-since-midnight. Throws on malformed input. */
export function timeToMinutes(hhmm: string): number {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) throw new Error(`Invalid time "${hhmm}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** True when `date` falls within an active Ramadan window. Dates compared by calendar day (UTC). */
export function isRamadanActive(config: RamadanConfig | null, date: Date): boolean {
  if (!config?.ramadanModeEnabled || !config.ramadanStartDate || !config.ramadanEndDate) {
    return false;
  }
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const start = atUtcMidnight(config.ramadanStartDate);
  const end = atUtcMidnight(config.ramadanEndDate);
  return day >= start && day <= end;
}

export function resolveScheduleType(config: RamadanConfig | null, date: Date): ScheduleType {
  return isRamadanActive(config, date) ? 'RAMADAN' : 'REGULAR';
}

/**
 * Resolve a section's schedule for a given day, applying exceptions over the master slots.
 */
export function resolveDay(params: {
  slots: SlotInput[];
  exceptions: ExceptionInput[];
  scheduleType: ScheduleType;
  dayOfWeek: DayOfWeek;
}): ResolvedDay {
  const { slots, exceptions, scheduleType, dayOfWeek } = params;

  // Step 1/2 (whole-day): a HOLIDAY with no specific period cancels the entire day.
  const holiday = exceptions.find((e) => e.type === 'HOLIDAY' && e.periodIndex === null);
  if (holiday) {
    return { scheduleType, dayOfWeek, isHoliday: true, periods: [] };
  }

  const exceptionByPeriod = new Map<number, ExceptionInput>();
  for (const exception of exceptions) {
    if (exception.periodIndex !== null) exceptionByPeriod.set(exception.periodIndex, exception);
  }

  const periods = slots
    .filter((slot) => slot.scheduleType === scheduleType && slot.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.periodIndex - b.periodIndex)
    .map((slot) => applyException(slot, exceptionByPeriod.get(slot.periodIndex)));

  return { scheduleType, dayOfWeek, isHoliday: false, periods };
}

/** Given resolved periods and a wall-clock time (minutes), return current and next class. */
export function findCurrentAndNext(
  periods: ResolvedPeriod[],
  nowMinutes: number,
): { current: ResolvedPeriod | null; next: ResolvedPeriod | null } {
  const active = periods.filter((p) => p.status !== 'CANCELLED');
  let current: ResolvedPeriod | null = null;
  let next: ResolvedPeriod | null = null;

  for (const period of active) {
    const start = timeToMinutes(period.startTime);
    const end = timeToMinutes(period.endTime);
    if (nowMinutes >= start && nowMinutes < end) {
      current = period;
    } else if (start > nowMinutes && (next === null || start < timeToMinutes(next.startTime))) {
      next = period;
    }
  }
  return { current, next };
}

// ----- internals -----------------------------------------------------------

function applyException(slot: SlotInput, exception: ExceptionInput | undefined): ResolvedPeriod {
  const base: ResolvedPeriod = {
    periodIndex: slot.periodIndex,
    startTime: slot.startTime,
    endTime: slot.endTime,
    subject: slot.subject,
    teacherId: slot.teacherId,
    classroomId: slot.classroomId,
    status: 'SCHEDULED',
    substituteTeacherId: null,
    note: null,
  };
  if (!exception) return base;

  switch (exception.type) {
    case 'CANCELLATION':
    case 'HOLIDAY':
      return { ...base, status: 'CANCELLED', note: exception.note };
    case 'SUBSTITUTION':
      return {
        ...base,
        status: 'SUBSTITUTED',
        substituteTeacherId: exception.substituteTeacherId,
        note: exception.note,
      };
    case 'REPLACEMENT':
      return {
        ...base,
        status: 'REPLACED',
        subject: exception.subject ?? base.subject,
        teacherId: exception.teacherId ?? base.teacherId,
        classroomId: exception.classroomId ?? base.classroomId,
        note: exception.note,
      };
    default:
      return base;
  }
}

function atUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
