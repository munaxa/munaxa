'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm';
import { StatusBadge } from '@/components/status-badge';
import {
  EMPLOYMENT_STATUSES,
  employeesApi,
  type CreateEmployeeInput,
  type Employee,
  type EmploymentStatus,
  type UpdateEmployeeInput,
} from '@/lib/people';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { EmployeeProfileDialog } from './employee-profile-dialog';

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
  const confirm = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);

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
    if (!(await confirm())) return;
    try {
      await employeesApi.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const departments = useMemo(
    () =>
      [
        ...new Set(employees.map((e) => e.department).filter((d): d is string => Boolean(d))),
      ].sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (dept && e.department !== dept) return false;
      if (!q) return true;
      return (
        `${e.firstNameEn} ${e.lastNameEn}`.toLowerCase().includes(q) ||
        `${e.firstNameAr} ${e.lastNameAr}`.includes(query) ||
        e.jobTitle.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q)
      );
    });
  }, [employees, query, dept]);

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const onLeaveCount = employees.filter((e) => e.status === 'ON_LEAVE').length;

  if (loading) {
    return (
      <Shell>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.hr')}</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={t('people.kpiEmployees')} value={employees.length} />
          <Kpi label={t('people.kpiActive')} value={activeCount} tone="text-aqua" />
          <Kpi label={t('people.kpiOnLeave')} value={onLeaveCount} tone="text-coral" />
          <Kpi label={t('people.kpiDepartments')} value={departments.length} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t('people.addEmployee')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateEmployee onCreated={load} onError={setError} />
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('common.search')} className="flex-1">
            <Input
              value={query}
              placeholder={t('people.searchEmployeePlaceholder')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label={t('people.department')}>
            <Select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>{t('common.name')}</TH>
              <TH>{t('common.arabicName')}</TH>
              <TH>{t('people.jobTitle')}</TH>
              <TH>{t('people.department')}</TH>
              <TH>{t('common.status')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((emp) => (
              <TR key={emp.id}>
                <TD>
                  <button
                    type="button"
                    className="text-start font-medium text-foreground hover:text-primary hover:underline"
                    onClick={() => setViewing(emp)}
                  >
                    {emp.firstNameEn} {emp.lastNameEn}
                  </button>
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
                  <Button variant="ghost" size="sm" onClick={() => setEditing(emp)}>
                    {t('people.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void remove(emp.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </TD>
              </TR>
            ))}
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-muted-foreground">
                  {t('people.noEmployees')}
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

      {viewing ? (
        <EmployeeProfileDialog
          employee={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      ) : null}

      {editing ? (
        <EmployeeEditor
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}
    </Shell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-xl font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

function CreateEmployee({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useI18n();
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
        placeholder={t('common.firstNameEn')}
        value={form.firstNameEn}
        onChange={(e) => set('firstNameEn', e.target.value)}
        required
      />
      <Input
        placeholder={t('common.lastNameEn')}
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
        placeholder={t('people.jobTitlePlaceholder')}
        value={form.jobTitle}
        onChange={(e) => set('jobTitle', e.target.value)}
        required
      />
      <Input
        placeholder={t('people.department')}
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
        {busy ? t('common.adding') : t('people.addEmployeeButton')}
      </Button>
    </form>
  );
}

// --------------------------------------------------------------------------- Employee editor (modal)

function EmployeeEditor({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<UpdateEmployeeInput>({
    firstNameEn: employee.firstNameEn,
    lastNameEn: employee.lastNameEn,
    firstNameAr: employee.firstNameAr,
    lastNameAr: employee.lastNameAr,
    jobTitle: employee.jobTitle,
    department: employee.department ?? '',
    status: employee.status,
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<UpdateEmployeeInput>) => setForm((f) => ({ ...f, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await employeesApi.update(employee.id, form);
      toast.success(t('people.employeeUpdated'));
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t('people.editEmployee')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
            ✕
          </Button>
        </div>

        <form onSubmit={(e) => void save(e)} className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.firstNameEn')}>
            <Input
              value={form.firstNameEn ?? ''}
              onChange={(e) => set({ firstNameEn: e.target.value })}
              required
            />
          </Field>
          <Field label={t('common.lastNameEn')}>
            <Input
              value={form.lastNameEn ?? ''}
              onChange={(e) => set({ lastNameEn: e.target.value })}
              required
            />
          </Field>
          <Field label="الاسم (AR)">
            <Input
              dir="rtl"
              value={form.firstNameAr ?? ''}
              onChange={(e) => set({ firstNameAr: e.target.value })}
              required
            />
          </Field>
          <Field label="العائلة (AR)">
            <Input
              dir="rtl"
              value={form.lastNameAr ?? ''}
              onChange={(e) => set({ lastNameAr: e.target.value })}
              required
            />
          </Field>
          <Field label={t('people.jobTitle')}>
            <Input
              value={form.jobTitle ?? ''}
              onChange={(e) => set({ jobTitle: e.target.value })}
              required
            />
          </Field>
          <Field label={t('people.department')}>
            <Input
              value={form.department ?? ''}
              onChange={(e) => set({ department: e.target.value })}
            />
          </Field>
          <Field label={t('common.status')}>
            <Select
              value={form.status ?? 'ACTIVE'}
              onChange={(e) => set({ status: e.target.value as EmploymentStatus })}
            >
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-full flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
