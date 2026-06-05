'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { academicsApi, type GradeReport, type Homework } from '@/lib/academics';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

export default function AcademicsPage() {
  const [error, setError] = useState<string | null>(null);
  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">Academics</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <HomeworkSection onError={setError} />
        <GradesSection onError={setError} />
      </div>
    </Shell>
  );
}

function HomeworkSection({ onError }: { onError: (m: string) => void }) {
  const [sectionId, setSectionId] = useState('');
  const [list, setList] = useState<Homework[]>([]);
  const [form, setForm] = useState({ subject: '', title: '', dueDate: '' });

  async function load() {
    try {
      setList(await academicsApi.homeworkBySection(sectionId));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed');
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await academicsApi.createHomework({ sectionId, ...form });
      setForm({ subject: '', title: '', dueDate: '' });
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homework</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <Field label="Section ID" className="flex-1">
            <Input
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              placeholder="uuid"
            />
          </Field>
          <Button variant="secondary" onClick={() => void load()}>
            Load
          </Button>
        </div>
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-2">
          <Field label="Subject" className="flex-1">
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </Field>
          <Field label="Title" className="flex-1">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Due">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </Field>
          <Button type="submit">Add</Button>
        </form>
        <Table>
          <THead>
            <TR>
              <TH>Subject</TH>
              <TH>Title</TH>
              <TH className="text-end">Due</TH>
            </TR>
          </THead>
          <TBody>
            {list.map((h) => (
              <TR key={h.id}>
                <TD>{h.subject}</TD>
                <TD>{h.title}</TD>
                <TD className="text-end font-mono text-xs text-muted-foreground">
                  {h.dueDate.slice(0, 10)}
                </TD>
              </TR>
            ))}
            {list.length === 0 ? (
              <TR>
                <TD colSpan={3} className="text-muted-foreground">
                  No homework loaded.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GradesSection({ onError }: { onError: (m: string) => void }) {
  const [csv, setCsv] = useState('studentId,subject,assessment,score,maxScore\n');
  const [studentId, setStudentId] = useState('');
  const [report, setReport] = useState<GradeReport | null>(null);

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await academicsApi.importGrades(csv);
      onError(`Imported ${r.imported}; ${r.failed.length} failed.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed');
    }
  }
  async function loadReport() {
    try {
      setReport(await academicsApi.gradeReport(studentId));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={(e) => void importCsv(e)} className="space-y-2">
          <Field label="Import (CSV)">
            <textarea
              className={cn(
                'h-24 w-full rounded-lg border border-input bg-background/60 px-3 py-2 font-mono text-xs',
                'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
              )}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="secondary">
            Import grades CSV
          </Button>
        </form>
        <div className="flex items-end gap-2">
          <Field label="Student ID" className="flex-1">
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="uuid"
            />
          </Field>
          <Button onClick={() => void loadReport()}>Report</Button>
        </div>
        {report ? (
          <div className="space-y-2">
            <Badge tone="default">Overall {report.overallPercent}%</Badge>
            <div className="space-y-1 text-sm text-muted-foreground">
              {report.subjects.map((s) => (
                <p key={s.subject}>
                  {s.subject}: {s.averagePercent}% ({s.count})
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
