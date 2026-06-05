'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { academicsApi, type GradeReport, type Homework } from '@/lib/academics';

export default function AcademicsPage() {
  const [error, setError] = useState<string | null>(null);
  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-8">
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
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h2 className="font-medium">Homework</h2>
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Section ID"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        />
        <button className={btnClass} onClick={() => void load()}>
          Load
        </button>
      </div>
      <form onSubmit={(e) => void create(e)} className="flex flex-wrap gap-2">
        <input
          className={inputClass}
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
        <input
          className={inputClass}
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <input
          className={inputClass}
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          required
        />
        <button type="submit" className={btnClass}>
          Add
        </button>
      </form>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {list.map((h) => (
          <li key={h.id} className="flex justify-between p-2 text-sm">
            <span>
              {h.subject} · {h.title}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {h.dueDate.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>
    </section>
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
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h2 className="font-medium">Grades</h2>
      <form onSubmit={(e) => void importCsv(e)} className="space-y-2">
        <textarea
          className={cn(inputClass, 'h-24 w-full font-mono text-xs')}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <button type="submit" className={btnClass}>
          Import grades CSV
        </button>
      </form>
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <button className={btnClass} onClick={() => void loadReport()}>
          Report
        </button>
      </div>
      {report ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Overall: {report.overallPercent}%</p>
          {report.subjects.map((s) => (
            <p key={s.subject} className="text-muted-foreground">
              {s.subject}: {s.averagePercent}% ({s.count})
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground';
