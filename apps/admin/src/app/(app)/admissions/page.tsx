'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';
import { EntityPicker } from '@/components/entity-picker';
import { FeeModifiedBadge } from '@/components/fee-modified-badge';
import { loadStudentOptions } from '@/lib/pickers';
import {
  admissionsApi,
  type ComputedQuote,
  type QuotePaymentMode,
  type ReturningStudent,
  type TransportDirection,
} from '@/lib/admissions';
import { schoolsApi, campusesApi, gradesApi, academicYearsApi } from '@/lib/structure';
import type { AcademicYear, Campus, Grade } from '@/lib/structure';
import { feeConfigApi, type TransportFare } from '@/lib/finance';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
type Mode = 'NEW' | 'RETURNING';

/**
 * Admissions wizard (Phase 22): registration & re-enrollment with a persisted quotation, payment
 * planning (full vs installments), and an atomic commit. New students are NOT created until the
 * parent agrees and the registrar commits. Returning students reuse their existing profile.
 */
export default function AdmissionsPage() {
  const toast = useToast();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('NEW');
  const [returningId, setReturningId] = useState('');
  const [returning, setReturning] = useState<ReturningStudent | null>(null);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState('');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [transportDirection, setTransportDirection] = useState<TransportDirection>('NONE');
  const [transportRouteGroup, setTransportRouteGroup] = useState('');
  const [fares, setFares] = useState<TransportFare[]>([]);
  const [paymentMode, setPaymentMode] = useState<QuotePaymentMode>('INSTALLMENTS');
  const [installments, setInstallments] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));

  const [quote, setQuote] = useState<ComputedQuote | null>(null);
  const [busy, setBusy] = useState(false);

  // Registrar fee overrides, keyed by fee kind: { amount, reason }.
  const [overrides, setOverrides] = useState<Record<string, { amount: string; reason: string }>>(
    {},
  );

  // New-student + parent info (collected only at commit, after the parent agrees).
  const [sFirstEn, setSFirstEn] = useState('');
  const [sLastEn, setSLastEn] = useState('');
  const [sFirstAr, setSFirstAr] = useState('');
  const [sLastAr, setSLastAr] = useState('');
  const [sGender, setSGender] = useState('');
  const [sDob, setSDob] = useState('');
  const [sNationalId, setSNationalId] = useState('');
  const [pFirstEn, setPFirstEn] = useState('');
  const [pLastEn, setPLastEn] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pPhoneAlt, setPPhoneAlt] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pRelation, setPRelation] = useState<'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER'>('FATHER');

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

  // Transport fares for the year drive the available route groups (only configured fares are priced).
  useEffect(() => {
    if (!academicYearId) return setFares([]);
    feeConfigApi
      .transportFares(academicYearId)
      .then(setFares)
      .catch(() => setFares([]));
  }, [academicYearId]);

  // Route groups configured (active) for the chosen direction.
  const routeGroupOptions = useMemo(() => {
    if (transportDirection === 'NONE') return [] as string[];
    const groups = fares
      .filter((f) => f.direction === transportDirection && f.isActive)
      .map((f) => f.routeGroup);
    return Array.from(new Set(groups));
  }, [fares, transportDirection]);

  useEffect(
    () => setQuote(null),
    [
      gradeId,
      academicYearId,
      transportDirection,
      transportRouteGroup,
      paymentMode,
      installments,
      firstDueDate,
      mode,
      returningId,
    ],
  );

  async function loadReturning(id: string) {
    setReturningId(id);
    setReturning(null);
    if (!id) return;
    try {
      setReturning(await admissionsApi.loadReturning(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load student');
    }
  }

  const canQuote = Boolean(gradeId && academicYearId && (mode === 'NEW' || returningId));

  function buildOverrides() {
    return Object.entries(overrides)
      .filter(([, v]) => v.amount.trim() !== '' && !Number.isNaN(Number(v.amount)))
      .map(([kind, v]) => ({
        kind: kind as ComputedQuote['lines'][number]['kind'],
        amount: Number(v.amount),
        reason: v.reason.trim() || 'Registrar override',
      }));
  }

  async function getQuote() {
    if (!canQuote) return;
    setBusy(true);
    try {
      const ov = buildOverrides();
      const q = await admissionsApi.quote({
        gradeId,
        academicYearId,
        ...(mode === 'RETURNING' && returningId ? { studentId: returningId } : {}),
        transportDirection,
        ...(transportDirection !== 'NONE' && transportRouteGroup ? { transportRouteGroup } : {}),
        paymentMode,
        installments: Number(installments) || 1,
        firstDueDate,
        ...(ov.length ? { overrides: ov } : {}),
        persist: true,
      });
      setQuote(q);
      q.warnings.forEach((w) => toast.error(w));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Quote failed');
    } finally {
      setBusy(false);
    }
  }

  // A new student needs their own details AND a mandatory guardian (name + primary mobile).
  const newStudentReady =
    mode === 'NEW'
      ? Boolean(sFirstEn && sLastEn && pFirstEn && pLastEn && pPhone.trim())
      : Boolean(returningId);

  async function commit() {
    if (!quote?.quoteId) {
      toast.error('Compute a quote first.');
      return;
    }
    if (!newStudentReady) {
      toast.error('Enter the student details first.');
      return;
    }
    setBusy(true);
    try {
      const res = await admissionsApi.commit({
        quoteId: quote.quoteId,
        idempotencyKey: crypto.randomUUID(),
        ...(mode === 'RETURNING' ? { existingStudentId: returningId } : {}),
        ...(mode === 'NEW'
          ? {
              student: {
                firstNameEn: sFirstEn,
                lastNameEn: sLastEn,
                ...(sFirstAr ? { firstNameAr: sFirstAr } : {}),
                ...(sLastAr ? { lastNameAr: sLastAr } : {}),
                ...(sGender ? { gender: sGender as 'MALE' | 'FEMALE' } : {}),
                ...(sDob ? { dateOfBirth: sDob } : {}),
                ...(sNationalId ? { nationalId: sNationalId } : {}),
              },
              parent: {
                firstNameEn: pFirstEn,
                lastNameEn: pLastEn,
                phone: pPhone,
                relation: pRelation,
                ...(pPhoneAlt ? { phoneAlt: pPhoneAlt } : {}),
                ...(pEmail ? { email: pEmail } : {}),
              },
            }
          : {}),
      });
      toast.success(
        res.status === 'PENDING_APPROVAL'
          ? 'Registration committed — pending finance approval.'
          : 'Registration committed. Take the down payment in Finance.',
      );
      router.push('/finance');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Commit failed');
    } finally {
      setBusy(false);
    }
  }

  const tuitionInstallment = useMemo(
    () => (quote && quote.schedule[0] ? quote.schedule[0].amount : null),
    [quote],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">Admissions</h1>
        <p className="text-sm text-muted-foreground">
          Quotation, payment planning and registration — for new and returning students.
        </p>
      </header>

      {/* Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Registration type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={mode === 'NEW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('NEW')}
            >
              New student
            </Button>
            <Button
              variant={mode === 'RETURNING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('RETURNING')}
            >
              Returning student
            </Button>
          </div>
          {mode === 'RETURNING' ? (
            <Field label="Find student">
              <EntityPicker
                value={returningId}
                onChange={(id) => void loadReturning(id)}
                load={loadStudentOptions}
              />
            </Field>
          ) : null}
          {returning ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {returning.firstNameEn} {returning.lastNameEn}
                </span>
                <FeeModifiedBadge
                  feeModified={!!returning.billingProfile?.feeModified}
                  customArrangement={!!returning.billingProfile?.customArrangement}
                />
              </div>
              {returning.enrollments[0] ? (
                <p className="text-muted-foreground">
                  Last: {returning.enrollments[0].grade.nameEn} ·{' '}
                  {returning.enrollments[0].academicYear.name} · transport{' '}
                  {returning.enrollments[0].transportDirection.replace('_', ' ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Placement */}
      <Card>
        <CardHeader>
          <CardTitle>Placement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
              onChange={(e) => {
                setTransportDirection(e.target.value as TransportDirection);
                setTransportRouteGroup('');
              }}
            >
              {DIRECTIONS.map((dirn) => (
                <option key={dirn} value={dirn}>
                  {dirn.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          {transportDirection !== 'NONE' ? (
            <Field
              label="Route group"
              hint={
                routeGroupOptions.length
                  ? 'Configured under Fee configuration → Transport fares'
                  : 'No route fares configured for this direction yet'
              }
            >
              <Select
                value={transportRouteGroup}
                onChange={(e) => setTransportRouteGroup(e.target.value)}
              >
                <option value="">Default (first configured)</option>
                {routeGroupOptions.map((g) => (
                  <option key={g} value={g}>
                    {g || '—'}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </CardContent>
      </Card>

      {/* Payment plan */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={paymentMode === 'FULL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMode('FULL')}
            >
              Full payment
            </Button>
            <Button
              variant={paymentMode === 'INSTALLMENTS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMode('INSTALLMENTS')}
            >
              Installments
            </Button>
          </div>
          {paymentMode === 'INSTALLMENTS' ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              Full payment applies the school’s full-payment discount to discountable fees only.
            </p>
          )}
          <Button onClick={() => void getQuote()} disabled={!canQuote || busy}>
            {busy ? 'Computing…' : 'Compute quotation'}
          </Button>
        </CardContent>
      </Card>

      {/* Quotation */}
      {quote ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Quotation</CardTitle>
              {quote.feeModified ? <Badge tone="warning">Fee Modified</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <THead>
                <TR>
                  <TH>Fee item</TH>
                  <TH className="text-end">Amount</TH>
                  <TH className="text-center">Discountable</TH>
                </TR>
              </THead>
              <TBody>
                {quote.lines.map((l) => (
                  <TR key={`${l.kind}-${l.label}`}>
                    <TD>
                      {l.label}
                      {l.overridden ? (
                        <span className="ms-2 text-xs text-warning">(overridden)</span>
                      ) : null}
                    </TD>
                    <TD className="text-end font-mono">{jod(l.amount)}</TD>
                    <TD className="text-center text-xs">{l.discountable ? 'Yes' : 'No'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Adjust fees (registrar override)
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Enter a new amount to override a fee. Overrides are tracked and flag the student
                  as “Fee Modified”; a reason is required.
                </p>
                {quote.lines.map((l) => (
                  <div key={`ov-${l.kind}`} className="grid items-center gap-2 sm:grid-cols-3">
                    <span className="text-sm">{l.label}</span>
                    <Input
                      type="number"
                      step="0.001"
                      dir="ltr"
                      placeholder={l.amount}
                      value={overrides[l.kind]?.amount ?? ''}
                      onChange={(e) =>
                        setOverrides((p) => ({
                          ...p,
                          [l.kind]: { amount: e.target.value, reason: p[l.kind]?.reason ?? '' },
                        }))
                      }
                    />
                    <Input
                      placeholder="Reason"
                      value={overrides[l.kind]?.reason ?? ''}
                      onChange={(e) =>
                        setOverrides((p) => ({
                          ...p,
                          [l.kind]: { amount: p[l.kind]?.amount ?? '', reason: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => void getQuote()} disabled={busy}>
                  {busy ? 'Recomputing…' : 'Recompute with overrides'}
                </Button>
              </div>
            </details>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Row label="Total fees" value={jod(quote.totalFees)} />
              <Row label="Discount-eligible" value={jod(quote.discountEligible)} />
              <Row label="Non-discount-eligible" value={jod(quote.nonDiscountEligible)} />
              {Number(quote.discountAmount) > 0 ? (
                <Row label="Discount" value={`− ${jod(quote.discountAmount)}`} tone="text-aqua" />
              ) : null}
              <Row label="Grand total" value={jod(quote.grandTotal)} strong />
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
            {tuitionInstallment ? (
              <p className="text-xs text-muted-foreground">
                First installment: {jod(tuitionInstallment)}. Any over-payment at the desk is
                applied to the last installments first (handled automatically in Finance).
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Student / parent info (new students only) */}
      {quote && mode === 'NEW' ? (
        <Card>
          <CardHeader>
            <CardTitle>Student & parent / guardian information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name (EN)">
                <Input value={sFirstEn} onChange={(e) => setSFirstEn(e.target.value)} />
              </Field>
              <Field label="Last name (EN)">
                <Input value={sLastEn} onChange={(e) => setSLastEn(e.target.value)} />
              </Field>
              <Field label="First name (AR)">
                <Input value={sFirstAr} onChange={(e) => setSFirstAr(e.target.value)} dir="rtl" />
              </Field>
              <Field label="Last name (AR)">
                <Input value={sLastAr} onChange={(e) => setSLastAr(e.target.value)} dir="rtl" />
              </Field>
              <Field label="Gender">
                <Select value={sGender} onChange={(e) => setSGender(e.target.value)}>
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </Select>
              </Field>
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={sDob}
                  onChange={(e) => setSDob(e.target.value)}
                  dir="ltr"
                />
              </Field>
              <Field label="National ID">
                <Input value={sNationalId} onChange={(e) => setSNationalId(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              A parent / guardian with a primary mobile number is required for every new student.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Relation to student *" className="sm:col-span-2">
                <Select
                  value={pRelation}
                  onChange={(e) =>
                    setPRelation(e.target.value as 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER')
                  }
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Parent / guardian first name (EN) *">
                <Input value={pFirstEn} onChange={(e) => setPFirstEn(e.target.value)} required />
              </Field>
              <Field label="Parent / guardian last name (EN) *">
                <Input value={pLastEn} onChange={(e) => setPLastEn(e.target.value)} required />
              </Field>
              <Field label="Mobile *">
                <Input
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                  dir="ltr"
                  required
                />
              </Field>
              <Field label="Alternate mobile">
                <Input value={pPhoneAlt} onChange={(e) => setPPhoneAlt(e.target.value)} dir="ltr" />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={pEmail}
                  onChange={(e) => setPEmail(e.target.value)}
                  dir="ltr"
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Commit */}
      {quote ? (
        <div className="flex items-center gap-3">
          <Button onClick={() => void commit()} disabled={busy || !newStudentReady}>
            {busy ? 'Committing…' : 'Commit registration'}
          </Button>
          <span className="text-xs text-muted-foreground">
            The student record is created only on commit.
          </span>
        </div>
      ) : null}
    </div>
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
