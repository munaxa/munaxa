'use client';

import { useState } from 'react';
import { Shell } from '@/components/shell';
import { attendanceApi, type AttendanceSummary } from '@/lib/attendance';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { loadSectionOptions, loadStudentOptions } from '@/lib/pickers';
import { Button, Card, CardContent, Field, Input } from '@/components/ui';

const STATUSES: Array<'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
];

export default function AttendancePage() {
  const toast = useToast();
  const { t } = useI18n();
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [studentId, setStudentId] = useState('');
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  async function refresh() {
    if (!sectionId) return;
    try {
      setSummary(await attendanceApi.summary(sectionId, date, 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load summary');
    }
  }

  async function mark(status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') {
    try {
      await attendanceApi.mark(sectionId, date, 1, [{ studentId, status }]);
      toast.success(`Marked ${status}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.attendance')}</h1>

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Section" className="flex-1">
            <EntityPicker
              value={sectionId}
              onChange={setSectionId}
              load={loadSectionOptions}
              placeholder="Search sections…"
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
            <Field label="Student">
              <EntityPicker
                value={studentId}
                onChange={setStudentId}
                load={loadStudentOptions}
                placeholder="Search students…"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant="secondary"
                  size="sm"
                  disabled={!studentId || !sectionId}
                  onClick={() => void mark(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
