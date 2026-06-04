import {
  dayOfWeekOf,
  timeToMinutes,
  isRamadanActive,
  resolveScheduleType,
  resolveDay,
  findCurrentAndNext,
  type SlotInput,
  type ExceptionInput,
} from './timetable-engine';

const slot = (over: Partial<SlotInput> = {}): SlotInput => ({
  scheduleType: 'REGULAR',
  dayOfWeek: 'SUN',
  periodIndex: 1,
  startTime: '08:00',
  endTime: '08:45',
  subject: 'Math',
  teacherId: 'teacher-1',
  classroomId: 'room-1',
  ...over,
});

const exception = (over: Partial<ExceptionInput> = {}): ExceptionInput => ({
  periodIndex: 1,
  type: 'CANCELLATION',
  subject: null,
  teacherId: null,
  substituteTeacherId: null,
  classroomId: null,
  note: null,
  ...over,
});

describe('timetable engine — helpers', () => {
  it('parses HH:MM to minutes and rejects bad input', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(() => timeToMinutes('24:00')).toThrow();
    expect(() => timeToMinutes('8:5')).toThrow();
  });

  it('maps dates to the day-of-week enum', () => {
    expect(dayOfWeekOf(new Date('2025-09-07T00:00:00Z'))).toBe('SUN');
    expect(dayOfWeekOf(new Date('2025-09-11T00:00:00Z'))).toBe('THU');
  });
});

describe('timetable engine — Ramadan window', () => {
  const config = {
    ramadanModeEnabled: true,
    ramadanStartDate: new Date('2026-02-18'),
    ramadanEndDate: new Date('2026-03-19'),
  };

  it('is active within the window (inclusive)', () => {
    expect(isRamadanActive(config, new Date('2026-02-18T10:00:00Z'))).toBe(true);
    expect(isRamadanActive(config, new Date('2026-03-19T10:00:00Z'))).toBe(true);
    expect(resolveScheduleType(config, new Date('2026-03-01T10:00:00Z'))).toBe('RAMADAN');
  });

  it('is inactive outside the window or when disabled', () => {
    expect(isRamadanActive(config, new Date('2026-02-17T10:00:00Z'))).toBe(false);
    expect(isRamadanActive(config, new Date('2026-03-20T10:00:00Z'))).toBe(false);
    expect(isRamadanActive({ ...config, ramadanModeEnabled: false }, new Date('2026-03-01'))).toBe(
      false,
    );
    expect(resolveScheduleType(null, new Date('2026-03-01'))).toBe('REGULAR');
  });
});

describe('timetable engine — resolveDay', () => {
  const slots: SlotInput[] = [
    slot({ periodIndex: 1, startTime: '08:00', endTime: '08:45', subject: 'Math' }),
    slot({ periodIndex: 2, startTime: '08:50', endTime: '09:35', subject: 'Science' }),
    slot({ periodIndex: 3, startTime: '09:40', endTime: '10:25', subject: 'Arabic' }),
    // RAMADAN variant (shorter) for period 1
    slot({ scheduleType: 'RAMADAN', periodIndex: 1, startTime: '09:00', endTime: '09:30' }),
  ];

  it('returns the regular master schedule when there are no exceptions', () => {
    const day = resolveDay({ slots, exceptions: [], scheduleType: 'REGULAR', dayOfWeek: 'SUN' });
    expect(day.periods).toHaveLength(3);
    expect(day.periods.map((p) => p.status)).toEqual(['SCHEDULED', 'SCHEDULED', 'SCHEDULED']);
  });

  it('uses the Ramadan master set when scheduleType is RAMADAN', () => {
    const day = resolveDay({ slots, exceptions: [], scheduleType: 'RAMADAN', dayOfWeek: 'SUN' });
    expect(day.periods).toHaveLength(1);
    expect(day.periods[0]?.startTime).toBe('09:00');
  });

  it('cancels a period via a CANCELLATION exception', () => {
    const day = resolveDay({
      slots,
      exceptions: [exception({ periodIndex: 2, type: 'CANCELLATION' })],
      scheduleType: 'REGULAR',
      dayOfWeek: 'SUN',
    });
    expect(day.periods[1]?.status).toBe('CANCELLED');
  });

  it('applies a substitute teacher', () => {
    const day = resolveDay({
      slots,
      exceptions: [
        exception({ periodIndex: 1, type: 'SUBSTITUTION', substituteTeacherId: 'sub-9' }),
      ],
      scheduleType: 'REGULAR',
      dayOfWeek: 'SUN',
    });
    expect(day.periods[0]?.status).toBe('SUBSTITUTED');
    expect(day.periods[0]?.substituteTeacherId).toBe('sub-9');
  });

  it('replaces subject/teacher/classroom', () => {
    const day = resolveDay({
      slots,
      exceptions: [
        exception({
          periodIndex: 3,
          type: 'REPLACEMENT',
          subject: 'Exam',
          teacherId: 'teacher-x',
          classroomId: 'hall-1',
        }),
      ],
      scheduleType: 'REGULAR',
      dayOfWeek: 'SUN',
    });
    expect(day.periods[2]?.status).toBe('REPLACED');
    expect(day.periods[2]?.subject).toBe('Exam');
    expect(day.periods[2]?.teacherId).toBe('teacher-x');
    expect(day.periods[2]?.classroomId).toBe('hall-1');
  });

  it('treats a whole-day HOLIDAY exception as no classes', () => {
    const day = resolveDay({
      slots,
      exceptions: [exception({ periodIndex: null, type: 'HOLIDAY' })],
      scheduleType: 'REGULAR',
      dayOfWeek: 'SUN',
    });
    expect(day.isHoliday).toBe(true);
    expect(day.periods).toHaveLength(0);
  });
});

describe('timetable engine — findCurrentAndNext', () => {
  const periods = resolveDay({
    slots: [
      slot({ periodIndex: 1, startTime: '08:00', endTime: '08:45' }),
      slot({ periodIndex: 2, startTime: '08:50', endTime: '09:35' }),
      slot({ periodIndex: 3, startTime: '09:40', endTime: '10:25' }),
    ],
    exceptions: [],
    scheduleType: 'REGULAR',
    dayOfWeek: 'SUN',
  }).periods;

  it('finds the current class and the next one', () => {
    const res = findCurrentAndNext(periods, timeToMinutes('09:00')); // within period 2
    expect(res.current?.periodIndex).toBe(2);
    expect(res.next?.periodIndex).toBe(3);
  });

  it('returns only next before the first class', () => {
    const res = findCurrentAndNext(periods, timeToMinutes('07:30'));
    expect(res.current).toBeNull();
    expect(res.next?.periodIndex).toBe(1);
  });

  it('returns nothing after the last class', () => {
    const res = findCurrentAndNext(periods, timeToMinutes('11:00'));
    expect(res.current).toBeNull();
    expect(res.next).toBeNull();
  });

  it('skips a cancelled current period', () => {
    const withCancel = resolveDay({
      slots: [
        slot({ periodIndex: 1, startTime: '08:00', endTime: '08:45' }),
        slot({ periodIndex: 2, startTime: '08:50', endTime: '09:35' }),
      ],
      exceptions: [exception({ periodIndex: 1, type: 'CANCELLATION' })],
      scheduleType: 'REGULAR',
      dayOfWeek: 'SUN',
    }).periods;
    const res = findCurrentAndNext(withCancel, timeToMinutes('08:20'));
    expect(res.current).toBeNull();
    expect(res.next?.periodIndex).toBe(2);
  });
});
