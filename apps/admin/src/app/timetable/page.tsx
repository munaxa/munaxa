'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { timetableApi, type ResolvedDay } from '@/lib/timetable';

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'text-foreground',
  CANCELLED: 'text-destructive line-through',
  SUBSTITUTED: 'text-aqua',
  REPLACED: 'text-coral',
};

export default function TimetablePage() {
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState<ResolvedDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setDay(await timetableApi.day(sectionId, date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve timetable');
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-2xl font-semibold">Timetable</h1>
      <form onSubmit={(e) => void load(e)} className="flex flex-wrap items-end gap-2">
        <input
          className={inputClass}
          placeholder="Section ID"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="submit" className={btnClass}>
          Resolve day
        </button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {day ? (
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {day.dayOfWeek} · {day.scheduleType}
            {day.isHoliday ? ' · Holiday (no classes)' : ''}
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {day.periods.map((p) => (
              <li key={p.periodIndex} className="flex items-center justify-between p-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {p.startTime}–{p.endTime}
                </span>
                <span className={cn('font-medium', STATUS_COLOR[p.status])}>{p.subject}</span>
                <span className="text-xs text-muted-foreground">{p.status}</span>
              </li>
            ))}
            {day.periods.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">No classes.</li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground';
