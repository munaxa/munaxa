'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm';
import {
  studentsApi,
  type ImportResult,
  type Student,
  type StudentVaccine,
  type UpdateStudentInput,
  type UpsertVaccineInput,
} from '@/lib/people';
import { sectionsApi, type Section } from '@/lib/structure';
import { StudentProfileDialog } from './student-profile-dialog';
import {
  Badge,
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

const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN'];

export default function StudentsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Student | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async (query?: string) => {
    try {
      setStudents(await studentsApi.list(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sections (with their grade) let us label a student's class in the profile dialog.
    sectionsApi
      .list()
      .then(setSections)
      .catch(() => undefined);
  }, []);

  // Load students on mount and whenever the search term changes (debounced server-side search).
  useEffect(() => {
    const id = setTimeout(() => void load(search.trim() || undefined), 300);
    return () => clearTimeout(id);
  }, [search, load]);

  const sectionLabel = useCallback(
    (sectionId?: string | null): string | undefined => {
      if (!sectionId) return undefined;
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec) return undefined;
      return sec.grade ? `${sec.grade.nameEn} · ${sec.name}` : sec.name;
    },
    [sections],
  );

  const gradeName = useCallback(
    (sectionId?: string | null): string =>
      sections.find((s) => s.id === sectionId)?.grade?.nameEn ?? '—',
    [sections],
  );

  const sectionName = useCallback(
    (sectionId?: string | null): string => sections.find((s) => s.id === sectionId)?.name ?? '—',
    [sections],
  );

  async function remove(student: Student) {
    if (!(await confirm())) return;
    try {
      await studentsApi.remove(student.id);
      toast.success(t('people.studentDeleted'));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.people')}</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('people.addStudent')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateStudent onCreated={load} onError={setError} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('people.bulkImport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ImportStudents onImported={load} onResult={setImportResult} onError={setError} />
              {importResult ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('people.importedSummary')
                    .replace('{created}', String(importResult.created))
                    .replace('{failed}', String(importResult.failed.length))}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Field label={t('common.search')}>
          <Input
            value={search}
            placeholder={t('people.searchPlaceholder')}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>

        <Table>
          <THead>
            <TR>
              <TH>{t('people.studentNo')}</TH>
              <TH>{t('common.name')}</TH>
              <TH>{t('structure.grade')}</TH>
              <TH>{t('structure.section')}</TH>
              <TH>{t('people.admitted')}</TH>
              <TH>{t('common.status')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {students.map((s) => (
              <TR key={s.id}>
                <TD className="font-mono text-xs text-muted-foreground">
                  {s.moeStudentNumber || '—'}
                </TD>
                <TD>
                  <button
                    type="button"
                    className="text-start font-medium text-foreground hover:text-primary hover:underline"
                    onClick={() => setViewing(s)}
                  >
                    {s.firstNameEn} {s.lastNameEn}
                  </button>
                  <span className="block text-xs text-muted-foreground" dir="rtl">
                    {s.firstNameAr} {s.lastNameAr}
                  </span>
                </TD>
                <TD>{gradeName(s.sectionId)}</TD>
                <TD>{sectionName(s.sectionId)}</TD>
                <TD className="font-mono text-xs">
                  {s.enrollmentDate ? s.enrollmentDate.slice(0, 10) : '—'}
                </TD>
                <TD>
                  <Badge tone={s.status === 'ACTIVE' ? 'success' : 'muted'}>{s.status}</Badge>
                </TD>
                <TD className="text-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                    {t('people.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void remove(s)}
                  >
                    {t('common.delete')}
                  </Button>
                </TD>
              </TR>
            ))}
            {students.length === 0 ? (
              <TR>
                <TD colSpan={7} className="text-muted-foreground">
                  {t('people.noStudents')}
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

      {viewing ? (
        <StudentProfileDialog
          student={viewing}
          sectionLabel={sectionLabel(viewing.sectionId)}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      ) : null}

      {editing ? (
        <StudentEditor
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load(search.trim() || undefined);
          }}
        />
      ) : null}
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
  const { t } = useI18n();
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
        placeholder={t('common.firstNameEn')}
        value={form.firstNameEn}
        onChange={(e) => setForm({ ...form, firstNameEn: e.target.value })}
        required
      />
      <Input
        placeholder={t('common.lastNameEn')}
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
        {t('people.addStudentButton')}
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
  const { t } = useI18n();
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
        {t('people.importCsv')}
      </Button>
    </form>
  );
}

// --------------------------------------------------------------------------- Student editor (modal)

function StudentEditor({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<UpdateStudentInput>({
    firstNameEn: student.firstNameEn,
    lastNameEn: student.lastNameEn,
    firstNameAr: student.firstNameAr,
    lastNameAr: student.lastNameAr,
    fatherNameEn: student.fatherNameEn ?? '',
    fatherNameAr: student.fatherNameAr ?? '',
    thirdNameEn: student.thirdNameEn ?? '',
    thirdNameAr: student.thirdNameAr ?? '',
    nationalId: student.nationalId ?? '',
    moeStudentNumber: student.moeStudentNumber ?? '',
    status: student.status,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await studentsApi.update(student.id, form);
      toast.success(t('people.studentUpdated'));
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const set = (patch: Partial<UpdateStudentInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t('people.editStudent')}</h2>
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
          <Field label={t('people.nationalId')}>
            <Input
              value={form.nationalId ?? ''}
              onChange={(e) => set({ nationalId: e.target.value })}
            />
          </Field>
          <Field label={t('people.moeNumber')}>
            <Input
              value={form.moeStudentNumber ?? ''}
              onChange={(e) => set({ moeStudentNumber: e.target.value })}
            />
          </Field>
          <Field label={t('common.status')}>
            <Select
              value={form.status ?? 'ACTIVE'}
              onChange={(e) => set({ status: e.target.value })}
            >
              {STUDENT_STATUSES.map((s) => (
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

        <div className="mt-6 border-t border-border pt-4">
          <Vaccines studentId={student.id} />
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- Vaccines

const EMPTY_VACCINE: UpsertVaccineInput = { name: '', grade: '', received: true };

function Vaccines({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<StudentVaccine[]>([]);
  const [form, setForm] = useState<UpsertVaccineInput>(EMPTY_VACCINE);

  const load = useCallback(async () => {
    try {
      setRows(await studentsApi.vaccines(studentId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load vaccines');
    }
  }, [studentId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const payload: UpsertVaccineInput = { name: form.name, received: form.received ?? true };
      if (form.grade) payload.grade = form.grade;
      await studentsApi.addVaccine(studentId, payload);
      setForm(EMPTY_VACCINE);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add vaccine');
    }
  }

  async function toggleReceived(v: StudentVaccine) {
    try {
      await studentsApi.updateVaccine(studentId, v.id, { received: !v.received });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function remove(v: StudentVaccine) {
    if (!(await confirm())) return;
    try {
      await studentsApi.removeVaccine(studentId, v.id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold">{t('people.vaccines')}</h3>

      <ul className="divide-y divide-border text-sm">
        {rows.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-2 py-1.5">
            <div className="min-w-0">
              <span className="font-medium">{v.name}</span>
              {v.grade ? <span className="text-muted-foreground"> · {v.grade}</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void toggleReceived(v)}>
                <Badge tone={v.received ? 'success' : 'muted'}>
                  {v.received ? t('people.received') : t('people.notReceived')}
                </Badge>
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => void remove(v)}
                aria-label={`${t('common.delete')} ${v.name}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="py-1.5 text-muted-foreground">{t('people.noVaccines')}</li>
        ) : null}
      </ul>

      <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-2">
        <Input
          className="h-9 flex-1"
          placeholder={t('people.vaccineName')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          className="h-9 w-32"
          placeholder={t('people.vaccineGrade')}
          value={form.grade ?? ''}
          onChange={(e) => setForm({ ...form, grade: e.target.value })}
        />
        <label className="flex items-center gap-1.5 pb-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={form.received ?? true}
            onChange={(e) => setForm({ ...form, received: e.target.checked })}
          />
          {t('people.received')}
        </label>
        <Button type="submit" size="sm">
          {t('people.addVaccine')}
        </Button>
      </form>
    </div>
  );
}
