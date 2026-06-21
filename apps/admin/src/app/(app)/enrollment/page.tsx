'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import { EntityPicker } from '@/components/entity-picker';
import { loadStudentOptions } from '@/lib/pickers';
import {
  enrollmentApi,
  financeApi,
  type EnrollmentQuote,
  type TransportDirection,
} from '@/lib/finance';
import { schoolsApi, campusesApi, gradesApi, academicYearsApi } from '@/lib/structure';
import type { AcademicYear, Campus, Grade } from '@/lib/structure';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
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

const DIRECTIONS: TransportDirection[] = ['NONE', 'ONE_WAY', 'TWO_WAY'];
const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

/**
 * Enrollment wizard (Phase 2): pick a student + grade/year/transport, compute a fee quote
 * (registration + tuition − discount + transport, with installment schedule), then create the
 * charges via the existing finance endpoints. Down payment is taken afterward in Finance.
 */
export default function EnrollmentPage() {
  const toast = useToast();
  const router = useRouter();

  const [studentId, setStudentId] = useState('');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState('');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [transportDirection, setTransportDirection] = useState<TransportDirection>('NONE');
  const [fullPayment, setFullPayment] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));

  const [quote, setQuote] = useState<EnrollmentQuote | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const schools = await schoolsApi.list();
        const lists = await Promise.all(schools.map((s) => campusesApi.list(s.id).catch(() => [])));
        const flat = lists.flat();
        setCampuses(flat);
        if (flat[0]) setCampusId(flat[0].id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load campuses');
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!campusId) return;
    void Promise.all([academicYearsApi.list(campusId), gradesApi.list(campusId)])
      .then(([y, g]) => {
        setYears(y);
        setGrades(g);
        setAcademicYearId((cur) => cur || y.find((x) => x.isCurrent)?.id || y[0]?.id || '');
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load structure'));
  }, [campusId, toast]);

  // Quote becomes stale when inputs change.
  useEffect(
    () => setQuote(null),
    [gradeId, academicYearId, transportDirection, fullPayment, installments, firstDueDate],
  );

  const canQuote = Boolean(gradeId && academicYearId);
  const tuitionNet = useMemo(
    () => (quote ? Number(quote.tuitionFee) - Number(quote.tuitionDiscount) : 0),
    [quote],
  );

  async function getQuote() {
    if (!canQuote) return;
    setBusy(true);
    try {
      const q = await enrollmentApi.quote({
        gradeId,
        academicYearId,
        transportDirection,
        fullPayment,
        installments: Number(installments) || 1,
        firstDueDate,
      });
      setQuote(q);
      q.warnings.forEach((w) => toast.error(w));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Quote failed');
    } finally {
      setBusy(false);
    }
  }

  async function enroll() {
    if (!quote || !studentId) {
      toast.error('Select a student and compute a quote first.');
      return;
    }
    setBusy(true);
    try {
      const due = firstDueDate || undefined;
      if (Number(quote.registrationFee) > 0) {
        await financeApi.createCharge({
          studentId,
          description: 'Registration fee',
          amount: Number(quote.registrationFee),
          ...(due ? { dueDate: due } : {}),
        });
      }
      if (Number(quote.transportFee) > 0) {
        await financeApi.createCharge({
          studentId,
          description: `Transportation fee (${transportDirection.replace('_', ' ')})`,
          amount: Number(quote.transportFee),
          ...(due ? { dueDate: due } : {}),
        });
      }
      if (quote.fullPayment || quote.installments <= 1) {
        await financeApi.createCharge({
          studentId,
          description: 'Annual tuition',
          amount: tuitionNet,
          ...(due ? { dueDate: due } : {}),
        });
      } else {
        await financeApi.createInstallments({
          studentId,
          description: 'Tuition installment',
          totalAmount: tuitionNet,
          months: quote.installments,
          firstDueDate: firstDueDate,
        });
      }
      toast.success('Enrollment charges created. Take the down payment in Finance.');
      router.push('/finance');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enrollment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">New enrollment</h1>
          <p className="text-sm text-muted-foreground">
            Compute the fee quote from the configured grade/transport fees, then create the charges.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Student & placement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Student" className="sm:col-span-2">
              <EntityPicker value={studentId} onChange={setStudentId} load={loadStudentOptions} />
            </Field>
            <Field label="Campus">
              <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Academic year">
              <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                <option value="">—</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Grade">
              <Select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                <option value="">—</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Transportation">
              <Select
                value={transportDirection}
                onChange={(e) => setTransportDirection(e.target.value as TransportDirection)}
              >
                {DIRECTIONS.map((dirn) => (
                  <option key={dirn} value={dirn}>
                    {dirn.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={fullPayment} onChange={(e) => setFullPayment(e.target.checked)} />
              Pay annual tuition in full (apply full-payment discount)
            </label>
            {!fullPayment ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Installments (1–9)">
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    dir="ltr"
                  />
                </Field>
                <Field label="First due date">
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    dir="ltr"
                  />
                </Field>
              </div>
            ) : null}
            <Button onClick={() => void getQuote()} disabled={!canQuote || busy}>
              {busy ? 'Computing…' : 'Compute quote'}
            </Button>
          </CardContent>
        </Card>

        {quote ? (
          <Card>
            <CardHeader>
              <CardTitle>Financial summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Row label="Registration" value={jod(quote.registrationFee)} />
                <Row label="Tuition" value={jod(quote.tuitionFee)} />
                {Number(quote.tuitionDiscount) > 0 ? (
                  <Row
                    label="Full-payment discount"
                    value={`− ${jod(quote.tuitionDiscount)}`}
                    tone="text-aqua"
                  />
                ) : null}
                <Row label="Transportation" value={jod(quote.transportFee)} />
                <Row label="Total" value={jod(quote.total)} strong />
              </dl>

              {quote.schedule.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>#</TH>
                      <TH>Due date</TH>
                      <TH className="text-end">Amount</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {quote.schedule.map((s) => (
                      <TR key={s.index}>
                        <TD>{s.index}</TD>
                        <TD className="font-mono text-xs">{s.dueDate}</TD>
                        <TD className="text-end font-mono">{jod(s.amount)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <EmptyState title="Paid in full — no installment schedule" />
              )}

              <div className="flex items-center gap-3">
                <Button onClick={() => void enroll()} disabled={!studentId || busy}>
                  {busy ? 'Creating…' : 'Create enrollment charges'}
                </Button>
                {!studentId ? (
                  <span className="text-xs text-muted-foreground">Select a student to enroll.</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`${strong ? 'font-display text-lg font-semibold' : 'text-sm'} ${tone ?? ''}`}>
        {value}
      </dd>
    </div>
  );
}
