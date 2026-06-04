'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { attendanceApi, type AttendanceSummary } from '@/lib/attendance';

const STATUSES: Array<'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
];

export default function AttendancePage() {
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [studentId, setStudentId] = useState('');
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      setSummary(await attendanceApi.summary(sectionId, date, 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary');
    }
  }

  async function mark(status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') {
    setError(null);
    setMessage(null);
    try {
      await attendanceApi.mark(sectionId, date, 1, [{ studentId, status }]);
      setMessage(`Marked ${status}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark');
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-2xl font-semibold">Attendance</h1>

      <div className="flex flex-wrap items-end gap-2">
        <input
          className={inputClass}
          placeholder="Section ID"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        />
        <input
          className={inputClass}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className={btnClass} onClick={() => void refresh()}>
          Load summary
        </button>
      </div>

      {summary ? (
        <div className="flex gap-3">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-border px-4 py-2 text-center">
              <div className="font-display text-xl">{summary.counts[s]}</div>
              <div className="font-mono text-xs text-muted-foreground">{s}</div>
            </div>
          ))}
          <div className="rounded-xl border border-border px-4 py-2 text-center">
            <div className="font-display text-xl">{summary.total}</div>
            <div className="font-mono text-xs text-muted-foreground">TOTAL</div>
          </div>
        </div>
      ) : null}

      <section className="space-y-2 rounded-xl border border-border p-4">
        <h2 className="font-medium">Mark a student (period 1)</h2>
        <input
          className={cn(inputClass, 'w-full')}
          placeholder="Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button key={s} className={btnClass} onClick={() => void mark(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm text-aqua">{message}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground';
