'use client';

import { useState } from 'react';
import { Shell } from '@/components/shell';
import { attendanceApi, type AttendanceSummary } from '@/lib/attendance';
import { Button, Card, CardContent, Field, Input } from '@/components/ui';

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
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">Attendance</h1>

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Section ID" className="flex-1">
            <Input
              placeholder="uuid"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button onClick={() => void refresh()}>Load summary</Button>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STATUSES.map((s) => (
              <Card key={s}>
                <CardContent className="p-4 text-center">
                  <div className="font-display text-xl">{summary.counts[s]}</div>
                  <div className="font-mono text-xs text-muted-foreground">{s}</div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="p-4 text-center">
                <div className="font-display text-xl">{summary.total}</div>
                <div className="font-mono text-xs text-muted-foreground">TOTAL</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="font-display font-medium">Mark a student (period 1)</h2>
            <Field label="Student ID">
              <Input
                placeholder="uuid"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button key={s} variant="secondary" size="sm" onClick={() => void mark(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-aqua">{message}</p> : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Shell>
  );
}
