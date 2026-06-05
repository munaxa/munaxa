'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { studentsApi, type ImportResult, type Student } from '@/lib/people';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setStudents(await studentsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="font-display text-2xl font-semibold">Students</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <CreateStudent onCreated={load} onError={setError} />
        <ImportStudents onImported={load} onResult={setImportResult} onError={setError} />
        {importResult ? (
          <p className="text-sm text-muted-foreground">
            Imported {importResult.created}; {importResult.failed.length} row(s) failed.
          </p>
        ) : null}

        <ul className="divide-y divide-border rounded-xl border border-border">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3">
              <span>
                {s.firstNameEn} {s.lastNameEn} · {s.firstNameAr} {s.lastNameAr}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{s.qrCode}</span>
            </li>
          ))}
          {students.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">No students yet.</li>
          ) : null}
        </ul>
      </div>
    </Shell>
  );
}

function CreateStudent({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState({
    firstNameEn: '',
    lastNameEn: '',
    firstNameAr: '',
    lastNameAr: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await studentsApi.create(form);
      setForm({ firstNameEn: '', lastNameEn: '', firstNameAr: '', lastNameAr: '' });
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap gap-2">
      <input
        className={inputClass}
        placeholder="First (EN)"
        value={form.firstNameEn}
        onChange={(e) => setForm({ ...form, firstNameEn: e.target.value })}
        required
      />
      <input
        className={inputClass}
        placeholder="Last (EN)"
        value={form.lastNameEn}
        onChange={(e) => setForm({ ...form, lastNameEn: e.target.value })}
        required
      />
      <input
        className={inputClass}
        placeholder="الاسم (AR)"
        value={form.firstNameAr}
        onChange={(e) => setForm({ ...form, firstNameAr: e.target.value })}
        required
        dir="rtl"
      />
      <input
        className={inputClass}
        placeholder="العائلة (AR)"
        value={form.lastNameAr}
        onChange={(e) => setForm({ ...form, lastNameAr: e.target.value })}
        required
        dir="rtl"
      />
      <button type="submit" className={btnClass}>
        Add student
      </button>
    </form>
  );
}

function ImportStudents({
  onImported,
  onResult,
  onError,
}: {
  onImported: () => Promise<void>;
  onResult: (r: ImportResult) => void;
  onError: (m: string) => void;
}) {
  const [csv, setCsv] = useState(
    'firstNameEn,lastNameEn,firstNameAr,lastNameAr,moeStudentNumber\n',
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      onResult(await studentsApi.import(csv));
      await onImported();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2">
      <label className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        Bulk import (CSV)
      </label>
      <textarea
        className={cn(inputClass, 'h-28 w-full font-mono text-xs')}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <button type="submit" className={btnClass}>
        Import CSV
      </button>
    </form>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground';
