'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { EntityPicker, type PickerOption } from '@/components/entity-picker';
import { loadStudentOptions } from '@/lib/pickers';
import {
  CLINIC_OUTCOMES,
  clinicApi,
  type ClinicOutcome,
  type ClinicVisit,
  type CreateVisitInput,
  type MedicalRecord,
} from '@/lib/advanced';
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

const OUTCOME_TONE: Record<ClinicOutcome, 'success' | 'warning' | 'danger' | 'muted'> = {
  RESOLVED: 'success',
  SENT_HOME: 'warning',
  REFERRED: 'warning',
  HOSPITALIZED: 'danger',
};

export default function ClinicPage() {
  const { t } = useI18n();
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [students, setStudents] = useState<PickerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setVisits(await clinicApi.visits());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clinic visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Student names are best-effort: clinic staff may lack the student:list permission.
    loadStudentOptions()
      .then(setStudents)
      .catch(() => undefined);
  }, [load]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) map.set(s.id, s.label);
    return map;
  }, [students]);

  if (loading) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.clinic')}</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Record a visit</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateVisit onDone={load} onError={setError} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Medical record</CardTitle>
            </CardHeader>
            <CardContent>
              <RecordEditor onError={setError} />
            </CardContent>
          </Card>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-medium">Recent visits</h2>
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Reason</TH>
                <TH>Temp</TH>
                <TH>Outcome</TH>
                <TH>Date</TH>
              </TR>
            </THead>
            <TBody>
              {visits.map((v) => (
                <TR key={v.id}>
                  <TD>{nameById.get(v.studentId) ?? `${v.studentId.slice(0, 8)}…`}</TD>
                  <TD>{v.reason}</TD>
                  <TD className="font-mono text-xs">
                    {v.temperature != null ? `${String(v.temperature)}°` : '—'}
                  </TD>
                  <TD>
                    <Badge tone={OUTCOME_TONE[v.outcome]}>{v.outcome.replace('_', ' ')}</Badge>
                  </TD>
                  <TD className="font-mono text-xs">{v.visitedAt.slice(0, 10)}</TD>
                </TR>
              ))}
              {visits.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-muted-foreground">
                    No visits recorded yet.
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </section>
      </div>
    </Shell>
  );
}

function CreateVisit({
  onDone,
  onError,
}: {
  onDone: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  const [temperature, setTemperature] = useState('');
  const [outcome, setOutcome] = useState<ClinicOutcome>('RESOLVED');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      onError('Select a student first');
      return;
    }
    setBusy(true);
    try {
      const payload: CreateVisitInput = { studentId, reason, outcome };
      if (symptoms) payload.symptoms = symptoms;
      if (treatment) payload.treatment = treatment;
      if (temperature) payload.temperature = Number(temperature);
      await clinicApi.createVisit(payload);
      setStudentId('');
      setReason('');
      setSymptoms('');
      setTreatment('');
      setTemperature('');
      setOutcome('RESOLVED');
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Record failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-2">
      <Field label="Student">
        <EntityPicker value={studentId} onChange={setStudentId} load={loadStudentOptions} />
      </Field>
      <Input
        placeholder="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      <Input
        placeholder="Symptoms (optional)"
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
      />
      <Input
        placeholder="Treatment (optional)"
        value={treatment}
        onChange={(e) => setTreatment(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          step="0.1"
          min={30}
          max={45}
          placeholder="Temp °C"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          dir="ltr"
        />
        <Select value={outcome} onChange={(e) => setOutcome(e.target.value as ClinicOutcome)}>
          {CLINIC_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? 'Recording…' : 'Record visit'}
      </Button>
    </form>
  );
}

const EMPTY_RECORD: MedicalRecord = {
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  medications: '',
  emergencyContact: '',
  notes: '',
};

function RecordEditor({ onError }: { onError: (m: string) => void }) {
  const [studentId, setStudentId] = useState('');
  const [record, setRecord] = useState<MedicalRecord>(EMPTY_RECORD);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadRecord(id: string) {
    setStudentId(id);
    setLoaded(false);
    if (!id) return;
    try {
      const rec = await clinicApi.getRecord(id);
      setRecord(rec ?? EMPTY_RECORD);
      setLoaded(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load record');
    }
  }

  function set<K extends keyof MedicalRecord>(key: K, value: string) {
    setRecord((r) => ({ ...r, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      onError('Select a student first');
      return;
    }
    setBusy(true);
    try {
      await clinicApi.upsertRecord(studentId, record);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="grid gap-2">
      <Field label="Student">
        <EntityPicker
          value={studentId}
          onChange={(id) => void loadRecord(id)}
          load={loadStudentOptions}
        />
      </Field>
      {loaded ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Blood type"
              value={record.bloodType ?? ''}
              onChange={(e) => set('bloodType', e.target.value)}
            />
            <Input
              placeholder="Emergency contact"
              value={record.emergencyContact ?? ''}
              onChange={(e) => set('emergencyContact', e.target.value)}
            />
          </div>
          <Input
            placeholder="Allergies"
            value={record.allergies ?? ''}
            onChange={(e) => set('allergies', e.target.value)}
          />
          <Input
            placeholder="Chronic conditions"
            value={record.chronicConditions ?? ''}
            onChange={(e) => set('chronicConditions', e.target.value)}
          />
          <Input
            placeholder="Medications"
            value={record.medications ?? ''}
            onChange={(e) => set('medications', e.target.value)}
          />
          <Input
            placeholder="Notes"
            value={record.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save record'}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a student to view or edit their record.
        </p>
      )}
    </form>
  );
}
