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
  teachersApi,
  type CreateEmployeeInput,
  type Employee,
  type EmploymentStatus,
  type Teacher,
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
import { TeacherProfileDialog } from '../teachers/teacher-profile-dialog';

const EMPTY: CreateEmployeeInput = {
  firstNameEn: '',
  lastNameEn: '',
  firstNameAr: '',
  lastNameAr: '',
  jobTitle: '',
  department: '',
  status: 'ACTIVE',
};

type StaffRow =
  | { kind: 'employee'; id: string; employee: Employee }
  | { kind: 'teacher'; id: string; teacher: Teacher };

export default function EmployeesPage() {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'teacher' | 'employee'>('all');
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    try {
      // Teachers and general employees are stored separately, but staff want to see them in one
      // directory — merge both here. Teachers stay managed (assignments) on the Teachers tab.
      const [emps, tchs] = await Promise.all([
        employeesApi.list(),
        teachersApi.list().catch(() => [] as Teacher[]),
      ]);
      setEmployees(emps);
      setTeachers(tchs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff');
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

  const rows = useMemo<StaffRow[]>(() => {
    const all: StaffRow[] = [
      ...teachers.map((teacher) => ({ kind: 'teacher' as const, id: teacher.id, teacher })),
      ...employees.map((employee) => ({ kind: 'employee' as const, id: employee.id, employee })),
    ];
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (typeFilter !== 'all' && r.kind !== typeFilter) return false;
      if (!q) return true;
      const p = r.kind === 'teacher' ? r.teacher : r.employee;
      const role = r.kind === 'teacher' ? (r.teacher.specialization ?? '') : r.employee.jobTitle;
      return (
        `${p.firstNameEn} ${p.lastNameEn}`.toLowerCase().includes(q) ||
        `${p.firstNameAr} ${p.lastNameAr}`.includes(query) ||
        role.toLowerCase().includes(q)
      );
    });
  }, [teachers, employees, query, typeFilter]);

  const activeCount =
    employees.filter((e) => e.status === 'ACTIVE').length +
    teachers.filter((tc) => tc.status === 'ACTIVE').length;

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
          <Kpi label={t('people.kpiStaff')} value={employees.length + teachers.length} />
          <Kpi label={t('people.kpiTeachers')} value={teachers.length} />
          <Kpi label={t('people.kpiEmployees')} value={employees.length} />
          <Kpi label={t('people.kpiActive')} value={activeCount} tone="text-aqua" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t('people.addEmployee')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateEmployee onCreated={load} onError={setError} />
            <p className="mt-2 text-xs text-muted-foreground">{t('people.addTeacherHint')}</p>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('common.search')} className="flex-1">
            <Input
              value={query}
              placeholder={t('people.searchStaffPlaceholder')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label={t('people.type')}>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            >
              <option value="all">{t('common.all')}</option>
              <option value="teacher">{t('people.typeTeacher')}</option>
              <option value="employee">{t('people.typeStaff')}</option>
            </Select>
          </Field>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>{t('common.name')}</TH>
              <TH>{t('common.arabicName')}</TH>
              <TH>{t('people.type')}</TH>
              <TH>{t('people.role')}</TH>
              <TH>{t('common.status')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) =>
              r.kind === 'teacher' ? (
                <TR key={`t-${r.id}`}>
                  <TD>
                    <button
                      type="button"
                      className="text-start font-medium text-foreground hover:text-primary hover:underline"
                      onClick={() => setViewingTeacher(r.teacher)}
                    >
                      {r.teacher.firstNameEn} {r.teacher.lastNameEn}
                    </button>
                  </TD>
                  <TD dir="rtl">
                    {r.teacher.firstNameAr} {r.teacher.lastNameAr}
                  </TD>
                  <TD>{t('people.typeTeacher')}</TD>
                  <TD>{r.teacher.specialization || '—'}</TD>
                  <TD>
                    <StatusBadge status={r.teacher.status} />
                  </TD>
                  <TD className="text-end text-xs text-muted-foreground">
                    {t('people.teachersTab')}
                  </TD>
                </TR>
              ) : (
                <TR key={`e-${r.id}`}>
                  <TD>
                    <button
                      type="button"
                      className="text-start font-medium text-foreground hover:text-primary hover:underline"
                      onClick={() => setViewing(r.employee)}
                    >
                      {r.employee.firstNameEn} {r.employee.lastNameEn}
                    </button>
                  </TD>
                  <TD dir="rtl">
                    {r.employee.firstNameAr} {r.employee.lastNameAr}
                  </TD>
                  <TD>{t('people.typeStaff')}</TD>
                  <TD>
                    {r.employee.jobTitle}
                    {r.employee.department ? (
                      <span className="text-muted-foreground"> · {r.employee.department}</span>
                    ) : null}
                  </TD>
                  <TD>
                    <StatusBadge status={r.employee.status} />
                  </TD>
                  <TD className="text-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(r.employee)}>
                      {t('people.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void remove(r.employee.id)}
                    >
                      {t('common.delete')}
                    </Button>
                  </TD>
                </TR>
              ),
            )}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-muted-foreground">
                  {t('people.noStaff')}
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

      {viewingTeacher ? (
        <TeacherProfileDialog teacher={viewingTeacher} onClose={() => setViewingTeacher(null)} />
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
