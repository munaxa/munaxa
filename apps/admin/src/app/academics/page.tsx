'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { academicsApi, type GradeReport, type Homework } from '@/lib/academics';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { loadSectionOptions, loadStudentOptions } from '@/lib/pickers';
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
  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">Academics</h1>
        <HomeworkSection />
        <GradesSection />
      </div>
    </Shell>
  );
}

function HomeworkSection() {
  const toast = useToast();
  const [sectionId, setSectionId] = useState('');
  const [list, setList] = useState<Homework[]>([]);
  const [form, setForm] = useState({ subject: '', title: '', dueDate: '' });

  async function load() {
    if (!sectionId) return;
    try {
      setList(await academicsApi.homeworkBySection(sectionId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load homework');
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await academicsApi.createHomework({ sectionId, ...form });
      setForm({ subject: '', title: '', dueDate: '' });
      toast.success('Homework added');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add homework');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homework</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <Field label="Section" className="flex-1">
            <EntityPicker
              value={sectionId}
              onChange={setSectionId}
              load={loadSectionOptions}
              placeholder="Search sections…"
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
          <Button type="submit" disabled={!sectionId}>
            Add
          </Button>
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

function GradesSection() {
  const toast = useToast();
  const [csv, setCsv] = useState('studentId,subject,assessment,score,maxScore\n');
  const [studentId, setStudentId] = useState('');
  const [report, setReport] = useState<GradeReport | null>(null);

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await academicsApi.importGrades(csv);
      toast.success(`Imported ${r.imported}; ${r.failed.length} failed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
  }
  async function loadReport() {
    if (!studentId) return;
    try {
      setReport(await academicsApi.gradeReport(studentId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load report');
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
          <Field label="Student" className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={setStudentId}
              load={loadStudentOptions}
              placeholder="Search students…"
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
