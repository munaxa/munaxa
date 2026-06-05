'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { timetableApi, type ResolvedDay } from '@/lib/timetable';
import { Badge, Button, Card, CardContent, Field, Input } from '@/components/ui';

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
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">Timetable</h1>

        <form onSubmit={(e) => void load(e)} className="flex flex-wrap items-end gap-2">
          <Field label="Section ID" className="flex-1">
            <Input
              placeholder="uuid"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              required
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button type="submit">Resolve day</Button>
        </form>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {day ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="muted">{day.dayOfWeek}</Badge>
              <Badge tone="muted">{day.scheduleType}</Badge>
              {day.isHoliday ? <Badge tone="warning">Holiday — no classes</Badge> : null}
            </div>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {day.periods.map((p) => (
                  <div key={p.periodIndex} className="flex items-center justify-between gap-3 p-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.startTime}–{p.endTime}
                    </span>
                    <span className={cn('font-medium', STATUS_COLOR[p.status])}>{p.subject}</span>
                    <span className="text-xs text-muted-foreground">{p.status}</span>
                  </div>
                ))}
                {day.periods.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No classes.</p>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
