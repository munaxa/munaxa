/**
 * Working-day arithmetic for staff leave (HR Phase 4).
 *
 * Leave is counted in working days, excluding the Friday/Saturday weekend (the Jordanian working
 * week). Kept pure + dependency-free so it is unit-testable and reusable by payroll prep (Phase 5).
 * Full public-holiday-calendar awareness is layered on later; the weekend rule is applied here.
 */

/** Day-of-week indices treated as the weekend (Fri = 5, Sat = 6 in JS getUTCDay()). */
const WEEKEND_DAYS = new Set([5, 6]);

/** Whether a date falls on the (Fri/Sat) weekend. */
export function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.has(date.getUTCDay());
}

/**
 * Count working days between two inclusive dates, excluding weekends. Returns 0 when `end` is
 * before `start`. Dates are compared by UTC calendar day, so time components are ignored.
 */
export function workingDaysBetween(start: Date, end: Date): number {
  const from = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const to = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (to < from) return 0;
  let count = 0;
  for (let ms = from; ms <= to; ms += 24 * 60 * 60 * 1000) {
    if (!isWeekend(new Date(ms))) count += 1;
  }
  return count;
}
