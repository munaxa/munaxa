'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { studentsApi, type ImportResult, type Student } from '@/lib/people';
import {
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
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">Students</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add a student</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateStudent onCreated={load} onError={setError} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bulk import</CardTitle>
            </CardHeader>
            <CardContent>
              <ImportStudents onImported={load} onResult={setImportResult} onError={setError} />
              {importResult ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Imported {importResult.created}; {importResult.failed.length} row(s) failed.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Arabic name</TH>
              <TH className="text-end">QR</TH>
            </TR>
          </THead>
          <TBody>
            {students.map((s) => (
              <TR key={s.id}>
                <TD>
                  {s.firstNameEn} {s.lastNameEn}
                </TD>
                <TD dir="rtl">
                  {s.firstNameAr} {s.lastNameAr}
                </TD>
                <TD className="text-end font-mono text-xs text-muted-foreground">{s.qrCode}</TD>
              </TR>
            ))}
            {students.length === 0 ? (
              <TR>
                <TD colSpan={3} className="text-muted-foreground">
                  No students yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
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
    <form onSubmit={(e) => void submit(e)} className="grid grid-cols-2 gap-2">
      <Input
        placeholder="First (EN)"
        value={form.firstNameEn}
        onChange={(e) => setForm({ ...form, firstNameEn: e.target.value })}
        required
      />
      <Input
        placeholder="Last (EN)"
        value={form.lastNameEn}
        onChange={(e) => setForm({ ...form, lastNameEn: e.target.value })}
        required
      />
      <Input
        placeholder="الاسم (AR)"
        value={form.firstNameAr}
        onChange={(e) => setForm({ ...form, firstNameAr: e.target.value })}
        required
        dir="rtl"
      />
      <Input
        placeholder="العائلة (AR)"
        value={form.lastNameAr}
        onChange={(e) => setForm({ ...form, lastNameAr: e.target.value })}
        required
        dir="rtl"
      />
      <Button type="submit" className="col-span-2">
        Add student
      </Button>
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
      <Field label="CSV">
        <textarea
          className={cn(
            'h-28 w-full rounded-lg border border-input bg-background/60 px-3 py-2 font-mono text-xs',
            'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
          )}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
      </Field>
      <Button type="submit" variant="secondary">
        Import CSV
      </Button>
    </form>
  );
}
