'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { StatusBadge } from '@/components/status-badge';
import {
  EMPLOYMENT_STATUSES,
  employeesApi,
  type CreateEmployeeInput,
  type Employee,
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

const EMPTY: CreateEmployeeInput = {
  firstNameEn: '',
  lastNameEn: '',
  firstNameAr: '',
  lastNameAr: '',
  jobTitle: '',
  department: '',
  status: 'ACTIVE',
};

export default function EmployeesPage() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setEmployees(await employeesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await employeesApi.remove(id);
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
        <h1 className="font-display text-2xl font-semibold">{t('nav.hr')}</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Add an employee</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateEmployee onCreated={load} onError={setError} />
          </CardContent>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Arabic name</TH>
              <TH>Job title</TH>
              <TH>Department</TH>
              <TH>Status</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {employees.map((emp) => (
              <TR key={emp.id}>
                <TD>
                  {emp.firstNameEn} {emp.lastNameEn}
                </TD>
                <TD dir="rtl">
                  {emp.firstNameAr} {emp.lastNameAr}
                </TD>
                <TD>{emp.jobTitle}</TD>
                <TD>{emp.department || '—'}</TD>
                <TD>
                  <StatusBadge status={emp.status} />
                </TD>
                <TD className="text-end">
                  <Button variant="ghost" size="sm" onClick={() => void remove(emp.id)}>
                    Delete
                  </Button>
                </TD>
              </TR>
            ))}
            {employees.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-muted-foreground">
                  No employees yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </Shell>
  );
}

function CreateEmployee({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState<CreateEmployeeInput>(EMPTY);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof CreateEmployeeInput>(key: K, value: CreateEmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: CreateEmployeeInput = {
        firstNameEn: form.firstNameEn,
        lastNameEn: form.lastNameEn,
        firstNameAr: form.firstNameAr,
        lastNameAr: form.lastNameAr,
        jobTitle: form.jobTitle,
        status: form.status ?? 'ACTIVE',
      };
      if (form.department) payload.department = form.department;
      await employeesApi.create(payload);
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
        placeholder="Job title (e.g. Secretary)"
        value={form.jobTitle}
        onChange={(e) => set('jobTitle', e.target.value)}
        required
      />
      <Input
        placeholder="Department"
        value={form.department ?? ''}
        onChange={(e) => set('department', e.target.value)}
      />
      <Select
        value={form.status ?? 'ACTIVE'}
        onChange={(e) => set('status', e.target.value as CreateEmployeeInput['status'])}
      >
        {EMPLOYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Button type="submit" className="sm:col-span-2" disabled={busy}>
        {busy ? 'Adding…' : 'Add employee'}
      </Button>
    </form>
  );
}
