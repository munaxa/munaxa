'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import {
  academicYearsApi,
  campusesApi,
  classroomsApi,
  gradesApi,
  schoolsApi,
  sectionsApi,
  semestersApi,
  type AcademicYear,
  type Campus,
  type Classroom,
  type Grade,
  type School,
  type Section,
  type Semester,
} from '@/lib/structure';
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

export default function AcademicStructurePage() {
  const { t } = useI18n();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState('');
  const toast = useToast();

  useEffect(() => {
    schoolsApi
      .list()
      .then(setSchools)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load schools'));
  }, [toast]);

  useEffect(() => {
    setCampusId('');
    setCampuses([]);
    if (!schoolId) return;
    campusesApi
      .list(schoolId)
      .then(setCampuses)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load campuses'));
  }, [schoolId, toast]);

  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.academicStructure')}</h1>

        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <Field label="School">
              <Select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">Select a school…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Campus">
              <Select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                disabled={!schoolId}
              >
                <option value="">Select a campus…</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        {campusId ? (
          <>
            <Grades campusId={campusId} />
            <Classrooms campusId={campusId} />
            <AcademicYears campusId={campusId} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a school and campus to manage its grades, classrooms, and academic years.
          </p>
        )}
      </div>
    </Shell>
  );
}

function useError() {
  const toast = useToast();
  return (e: unknown, fallback: string) => toast.error(e instanceof Error ? e.message : fallback);
}

// --------------------------------------------------------------------------- Grades + Sections

function Grades({ campusId }: { campusId: string }) {
  const onErr = useError();
  const toast = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [form, setForm] = useState({ nameEn: '', nameAr: '', level: '' });
  const [openGrade, setOpenGrade] = useState<string | null>(null);

  const load = useCallback(() => {
    gradesApi
      .list(campusId)
      .then(setGrades)
      .catch((e) => onErr(e, 'Failed to load grades'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  useEffect(() => load(), [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await gradesApi.create({
        campusId,
        nameEn: form.nameEn,
        nameAr: form.nameAr,
        level: Number(form.level) || 0,
      });
      setForm({ nameEn: '', nameAr: '', level: '' });
      toast.success('Grade added');
      load();
    } catch (e) {
      onErr(e, 'Create failed');
    }
  }

  async function remove(id: string) {
    try {
      await gradesApi.remove(id);
      load();
    } catch (e) {
      onErr(e, 'Delete failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-2">
          <Field label="Name (EN)" className="flex-1">
            <Input
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              required
            />
          </Field>
          <Field label="Name (AR)" className="flex-1">
            <Input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              required
              dir="rtl"
            />
          </Field>
          <Field label="Level">
            <Input
              type="number"
              className="w-20"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              required
            />
          </Field>
          <Button type="submit">Add</Button>
        </form>

        <Table>
          <THead>
            <TR>
              <TH className="w-16">Level</TH>
              <TH>Name</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {grades.map((g) => (
              <TR key={g.id}>
                <TD className="font-mono text-xs">{g.level}</TD>
                <TD>
                  {g.nameEn}{' '}
                  <span className="text-muted-foreground" dir="rtl">
                    · {g.nameAr}
                  </span>
                  {openGrade === g.id ? <Sections gradeId={g.id} /> : null}
                </TD>
                <TD className="text-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenGrade(openGrade === g.id ? null : g.id)}
                  >
                    {openGrade === g.id ? 'Hide sections' : 'Sections'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void remove(g.id)}>
                    Delete
                  </Button>
                </TD>
              </TR>
            ))}
            {grades.length === 0 ? (
              <TR>
                <TD colSpan={3} className="text-muted-foreground">
                  No grades yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Sections({ gradeId }: { gradeId: string }) {
  const onErr = useError();
  const [sections, setSections] = useState<Section[]>([]);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  const load = useCallback(() => {
    sectionsApi
      .list(gradeId)
      .then(setSections)
      .catch((e) => onErr(e, 'Failed to load sections'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  useEffect(() => load(), [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: { gradeId: string; name: string; capacity?: number } = { gradeId, name };
      if (capacity) payload.capacity = Number(capacity);
      await sectionsApi.create(payload);
      setName('');
      setCapacity('');
      load();
    } catch (e) {
      onErr(e, 'Create failed');
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {sections.map((s) => (
          <Badge key={s.id} tone="muted">
            {s.name}
            {s.capacity ? ` · ${s.capacity}` : ''}
            <button
              type="button"
              className="ms-1 text-muted-foreground hover:text-destructive"
              onClick={() =>
                void sectionsApi
                  .remove(s.id)
                  .then(load)
                  .catch((e) => onErr(e, 'Delete failed'))
              }
              aria-label={`Delete section ${s.name}`}
            >
              ✕
            </button>
          </Badge>
        ))}
        {sections.length === 0 ? (
          <span className="text-xs text-muted-foreground">No sections.</span>
        ) : null}
      </div>
      <form onSubmit={(e) => void create(e)} className="flex items-end gap-2">
        <Input
          className="h-8 w-28"
          placeholder="Section (e.g. A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          className="h-8 w-24"
          type="number"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <Button type="submit" size="sm">
          Add section
        </Button>
      </form>
    </div>
  );
}

// --------------------------------------------------------------------------- Classrooms

function Classrooms({ campusId }: { campusId: string }) {
  const onErr = useError();
  const toast = useToast();
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [form, setForm] = useState({ name: '', capacity: '', building: '', floor: '' });

  const load = useCallback(() => {
    classroomsApi
      .list(campusId)
      .then(setRooms)
      .catch((e) => onErr(e, 'Failed to load classrooms'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  useEffect(() => load(), [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: {
        campusId: string;
        name: string;
        capacity?: number;
        building?: string;
        floor?: string;
      } = {
        campusId,
        name: form.name,
      };
      if (form.capacity) payload.capacity = Number(form.capacity);
      if (form.building) payload.building = form.building;
      if (form.floor) payload.floor = form.floor;
      await classroomsApi.create(payload);
      setForm({ name: '', capacity: '', building: '', floor: '' });
      toast.success('Classroom added');
      load();
    } catch (e) {
      onErr(e, 'Create failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classrooms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-2">
          <Field label="Name" className="flex-1">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Capacity">
            <Input
              type="number"
              className="w-24"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>
          <Field label="Building">
            <Input
              className="w-28"
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value })}
            />
          </Field>
          <Field label="Floor">
            <Input
              className="w-20"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
            />
          </Field>
          <Button type="submit">Add</Button>
        </form>

        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Building</TH>
              <TH>Floor</TH>
              <TH className="text-end">Capacity</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {rooms.map((r) => (
              <TR key={r.id}>
                <TD>{r.name}</TD>
                <TD>{r.building || '—'}</TD>
                <TD>{r.floor || '—'}</TD>
                <TD className="text-end font-mono text-xs">{r.capacity ?? '—'}</TD>
                <TD className="text-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void classroomsApi
                        .remove(r.id)
                        .then(load)
                        .catch((e) => onErr(e, 'Delete failed'))
                    }
                  >
                    Delete
                  </Button>
                </TD>
              </TR>
            ))}
            {rooms.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-muted-foreground">
                  No classrooms yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------- Academic years + Semesters

function AcademicYears({ campusId }: { campusId: string }) {
  const onErr = useError();
  const toast = useToast();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [openYear, setOpenYear] = useState<string | null>(null);

  const load = useCallback(() => {
    academicYearsApi
      .list(campusId)
      .then(setYears)
      .catch((e) => onErr(e, 'Failed to load academic years'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  useEffect(() => load(), [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await academicYearsApi.create({
        campusId,
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        isCurrent: form.isCurrent,
      });
      setForm({ name: '', startDate: '', endDate: '', isCurrent: false });
      toast.success('Academic year added');
      load();
    } catch (e) {
      onErr(e, 'Create failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic years</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-2">
          <Field label="Name" className="flex-1">
            <Input
              placeholder="2025–2026"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Start">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </Field>
          <Field label="End">
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </Field>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
            />
            Current
          </label>
          <Button type="submit">Add</Button>
        </form>

        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Start</TH>
              <TH>End</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {years.map((y) => (
              <TR key={y.id}>
                <TD>
                  {y.name} {y.isCurrent ? <Badge tone="success">Current</Badge> : null}
                  {openYear === y.id ? <Semesters academicYearId={y.id} /> : null}
                </TD>
                <TD className="font-mono text-xs">{y.startDate.slice(0, 10)}</TD>
                <TD className="font-mono text-xs">{y.endDate.slice(0, 10)}</TD>
                <TD className="text-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenYear(openYear === y.id ? null : y.id)}
                  >
                    {openYear === y.id ? 'Hide terms' : 'Terms'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void academicYearsApi
                        .remove(y.id)
                        .then(load)
                        .catch((e) => onErr(e, 'Delete failed'))
                    }
                  >
                    Delete
                  </Button>
                </TD>
              </TR>
            ))}
            {years.length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-muted-foreground">
                  No academic years yet.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Semesters({ academicYearId }: { academicYearId: string }) {
  const onErr = useError();
  const [terms, setTerms] = useState<Semester[]>([]);
  const [form, setForm] = useState({ name: '', sequence: '', startDate: '', endDate: '' });

  const load = useCallback(() => {
    semestersApi
      .list(academicYearId)
      .then(setTerms)
      .catch((e) => onErr(e, 'Failed to load terms'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId]);

  useEffect(() => load(), [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await semestersApi.create({
        academicYearId,
        name: form.name,
        sequence: Number(form.sequence) || 1,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setForm({ name: '', sequence: '', startDate: '', endDate: '' });
      load();
    } catch (e) {
      onErr(e, 'Create failed');
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {terms.map((s) => (
          <Badge key={s.id} tone="muted">
            {s.sequence}. {s.name}
            <button
              type="button"
              className="ms-1 text-muted-foreground hover:text-destructive"
              onClick={() =>
                void semestersApi
                  .remove(s.id)
                  .then(load)
                  .catch((e) => onErr(e, 'Delete failed'))
              }
              aria-label={`Delete term ${s.name}`}
            >
              ✕
            </button>
          </Badge>
        ))}
        {terms.length === 0 ? (
          <span className="text-xs text-muted-foreground">No terms.</span>
        ) : null}
      </div>
      <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-2">
        <Input
          className="h-8 w-16"
          type="number"
          placeholder="#"
          value={form.sequence}
          onChange={(e) => setForm({ ...form, sequence: e.target.value })}
          required
        />
        <Input
          className="h-8 w-32"
          placeholder="Term name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          className="h-8"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          required
        />
        <Input
          className="h-8"
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          required
        />
        <Button type="submit" size="sm">
          Add term
        </Button>
      </form>
    </div>
  );
}
