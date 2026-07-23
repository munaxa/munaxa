import { isWeekend, workingDaysBetween } from './leave-days.logic';

describe('leave working-day arithmetic', () => {
  it('flags Fri/Sat as weekend', () => {
    expect(isWeekend(new Date('2026-03-06'))).toBe(true); // Friday
    expect(isWeekend(new Date('2026-03-07'))).toBe(true); // Saturday
    expect(isWeekend(new Date('2026-03-08'))).toBe(false); // Sunday (a working day)
  });

  it('counts a single working day inclusively', () => {
    expect(workingDaysBetween(new Date('2026-03-08'), new Date('2026-03-08'))).toBe(1);
  });

  it('excludes the weekend across a span', () => {
    // Sun 2026-03-08 → Thu 2026-03-12 = 5 working days (no weekend inside).
    expect(workingDaysBetween(new Date('2026-03-08'), new Date('2026-03-12'))).toBe(5);
    // Sun 2026-03-08 → Sun 2026-03-15 spans one Fri+Sat → 8 calendar, 6 working.
    expect(workingDaysBetween(new Date('2026-03-08'), new Date('2026-03-15'))).toBe(6);
  });

  it('returns 0 when end precedes start', () => {
    expect(workingDaysBetween(new Date('2026-03-10'), new Date('2026-03-01'))).toBe(0);
  });

  it('counts a weekend-only span as zero', () => {
    // Fri + Sat only.
    expect(workingDaysBetween(new Date('2026-03-06'), new Date('2026-03-07'))).toBe(0);
  });
});
