'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { StatusBadge } from '@/components/status-badge';
import {
  EMPLOYMENT_STATUSES,
  teachersApi,
  type CreateTeacherInput,
  type Teacher,
} from '@/lib/people';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const EMPTY: CreateTeacherInput = {
  firstNameEn: '',
  lastNameEn: '',
  firstNameAr: '',
  lastNameAr: '',
  employeeNumber: '',
  specialization: '',
  status: 'ACTIVE',
};

export default function TeachersPage() {
  const { t } = useI18n();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setTeachers(await teachersApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await teachersApi.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.teachers')}</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Add a teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTeacher onCreated={load} onError={setError} />
          </CardContent>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Arabic name</TH>
              <TH>Employee #</TH>
              <TH>Specialization</TH>
              <TH>Status</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {teachers.map((tch) => (
              <TR key={tch.id}>
                <TD>
                  {tch.firstNameEn} {tch.lastNameEn}
                </TD>
                <TD dir="rtl">
                  {tch.firstNameAr} {tch.lastNameAr}
                </TD>
                <TD className="font-mono text-xs text-muted-foreground">
                  {tch.employeeNumber || '—'}
                </TD>
                <TD>{tch.specialization || '—'}</TD>
                <TD>
                  <StatusBadge status={tch.status} />
                </TD>
                <TD className="text-end">
                  <Button variant="ghost" size="sm" onClick={() => void remove(tch.id)}>
                    Delete
                  </Button>
                </TD>
              </TR>
            ))}
            {teachers.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-muted-foreground">
                  No teachers yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </Shell>
  );
}

function CreateTeacher({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState<CreateTeacherInput>(EMPTY);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof CreateTeacherInput>(key: K, value: CreateTeacherInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: CreateTeacherInput = {
        firstNameEn: form.firstNameEn,
        lastNameEn: form.lastNameEn,
        firstNameAr: form.firstNameAr,
        lastNameAr: form.lastNameAr,
        status: form.status ?? 'ACTIVE',
      };
      if (form.employeeNumber) payload.employeeNumber = form.employeeNumber;
      if (form.specialization) payload.specialization = form.specialization;
      await teachersApi.create(payload);
      setForm(EMPTY);
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-2">
      <Input
        placeholder="First name (EN)"
        value={form.firstNameEn}
        onChange={(e) => set('firstNameEn', e.target.value)}
        required
      />
      <Input
        placeholder="Last name (EN)"
        value={form.lastNameEn}
        onChange={(e) => set('lastNameEn', e.target.value)}
        required
      />
      <Input
        placeholder="الاسم (AR)"
        value={form.firstNameAr}
        onChange={(e) => set('firstNameAr', e.target.value)}
        required
        dir="rtl"
      />
      <Input
        placeholder="العائلة (AR)"
        value={form.lastNameAr}
        onChange={(e) => set('lastNameAr', e.target.value)}
        required
        dir="rtl"
      />
      <Input
        placeholder="Employee number"
        value={form.employeeNumber ?? ''}
        onChange={(e) => set('employeeNumber', e.target.value)}
      />
      <Input
        placeholder="Specialization (e.g. Mathematics)"
        value={form.specialization ?? ''}
        onChange={(e) => set('specialization', e.target.value)}
      />
      <Select
        value={form.status ?? 'ACTIVE'}
        onChange={(e) => set('status', e.target.value as CreateTeacherInput['status'])}
      >
        {EMPLOYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Button type="submit" className="sm:col-span-2" disabled={busy}>
        {busy ? 'Adding…' : 'Add teacher'}
      </Button>
    </form>
  );
}
