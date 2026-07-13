'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';
import { EntityPicker } from '@/components/entity-picker';
import { FeeModifiedBadge } from '@/components/fee-modified-badge';
import { loadStudentOptions, loadParentOptions } from '@/lib/pickers';
import {
  admissionsApi,
  type ComputedQuote,
  type QuotePaymentMode,
  type ReturningStudent,
  type TransportDirection,
} from '@/lib/admissions';
import { schoolsApi, campusesApi, gradesApi, academicYearsApi, sectionsApi } from '@/lib/structure';
import type { AcademicYear, Campus, Grade, Section } from '@/lib/structure';
import { feeConfigApi, type TransportFare } from '@/lib/finance';
import { areasApi, type Area } from '@/lib/areas';
import {
  Badge,
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
  cn,
} from '@/components/ui';

const DIRECTIONS: TransportDirection[] = ['NONE', 'ONE_WAY', 'TWO_WAY'];
const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;
type Mode = 'NEW' | 'RETURNING';

// Quotation comes BEFORE the student/guardian details: the parent sees the fees first and may
// decline, so we don't collect personal information until they've agreed to the quote.
const STEPS = [
  { key: 'enrollment', label: 'Enrollment' },
  { key: 'transport', label: 'Transport' },
  { key: 'quote', label: 'Quotation' },
  { key: 'student', label: 'Student information' },
  { key: 'guardian', label: 'Parent / guardian' },
  { key: 'review', label: 'Review & confirm' },
] as const;

/**
 * Admissions wizard (Phase 22): registration & re-enrollment with a persisted quotation, payment
 * planning (full vs installments), and an atomic commit. New students are NOT created until the
 * parent agrees and the registrar commits. Returning students reuse their existing profile.
 *
 * The form is presented as a guided, step-by-step flow with a live registration summary. The order
 * is deliberately fees-first — placement → transport → quotation → details — so the parent reviews
 * the fees before any personal information is collected. The underlying logic is unchanged: nothing
 * is persisted until the registrar reaches Review & confirm and commits.
 */
export default function AdmissionsPage() {
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState(0);

  const [mode, setMode] = useState<Mode>('NEW');
  const [returningId, setReturningId] = useState('');
  const [returning, setReturning] = useState<ReturningStudent | null>(null);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState('');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [transportDirection, setTransportDirection] = useState<TransportDirection>('NONE');
  const [transportTrip, setTransportTrip] = useState('');
  const [transportAreaId, setTransportAreaId] = useState('');
  const [fares, setFares] = useState<TransportFare[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [paymentMode, setPaymentMode] = useState<QuotePaymentMode>('INSTALLMENTS');
  const [installments, setInstallments] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));
  // The registration fee is normally paid at registration (its own one-off charge); unchecking folds
  // it into the installment plan instead.
  const [registrationFeePaid, setRegistrationFeePaid] = useState(true);

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
  // Parent: either link an EXISTING parent (search) or enter a NEW one.
  const [parentMode, setParentMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [existingParentId, setExistingParentId] = useState('');
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

  // Active, transport-enabled areas registrars can offer (master data shared with Fleet).
  useEffect(() => {
    areasApi
      .list({ active: true, transportAvailable: true })
      .then(setAreas)
      .catch(() => setAreas([]));
  }, []);

  // Transport fares for the year drive the available route groups (only configured fares are priced).
  useEffect(() => {
    if (!academicYearId) return setFares([]);
    feeConfigApi
      .transportFares(academicYearId)
      .then(setFares)
      .catch(() => setFares([]));
  }, [academicYearId]);

  // Sections belong to a grade; reload (and reset the choice) whenever the grade changes.
  useEffect(() => {
    setSectionId('');
    if (!gradeId) return setSections([]);
    sectionsApi
      .list(gradeId)
      .then(setSections)
      .catch(() => setSections([]));
  }, [gradeId]);

  // The registrar picks the AREA; the route is resolved from the Area → Route mapping.
  const selectedArea = useMemo(
    () => areas.find((a) => a.id === transportAreaId) ?? null,
    [areas, transportAreaId],
  );
  const resolvedRouteId = selectedArea?.routeId ?? null;
  const resolvedRouteName = selectedArea?.route?.name ?? null;

  // The fare the quote is priced against = the active fare for the resolved route (by name,
  // within the selected year). Pricing still flows through TransportFare (billing unchanged).
  const selectedFare = useMemo(() => {
    if (transportDirection === 'NONE' || !resolvedRouteName) return null;
    return (
      fares.find(
        (f) => f.isActive && f.route && !f.route.disabledAt && f.route.name === resolvedRouteName,
      ) ?? null
    );
  }, [fares, transportDirection, resolvedRouteName]);

  useEffect(
    () => setQuote(null),
    [
      gradeId,
      academicYearId,
      transportDirection,
      transportAreaId,
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

  async function getQuote(ovList?: ReturnType<typeof buildOverrides>) {
    if (!canQuote) return;
    const ov = ovList ?? buildOverrides();
    setBusy(true);
    try {
      const q = await admissionsApi.quote({
        gradeId,
        academicYearId,
        ...(mode === 'RETURNING' && returningId ? { studentId: returningId } : {}),
        transportDirection,
        ...(transportDirection !== 'NONE' && resolvedRouteName
          ? { transportRouteGroup: resolvedRouteName }
          : {}),
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

  // Clear all registrar overrides and recompute the quote at the original (catalog) amounts.
  function resetOverrides() {
    setOverrides({});
    void getQuote([]);
  }

  // A new student needs their own details AND a mandatory guardian (name + primary mobile).
  // The guardian is ready when an existing parent is chosen, or a new one has name + primary mobile.
  const parentReady =
    parentMode === 'EXISTING'
      ? Boolean(existingParentId)
      : Boolean(pFirstEn && pLastEn && pPhone.trim());
  const newStudentReady =
    mode === 'NEW'
      ? Boolean(sFirstEn && sLastEn && sNationalId.trim()) && parentReady
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
    // The area is mandatory whenever transport is requested — it drives the route and the fee.
    if (transportDirection !== 'NONE' && !transportAreaId) {
      toast.error('Select the transport area — it drives the route and the fee.');
      return;
    }
    if (dobError) {
      toast.error(dobError);
      return;
    }
    setBusy(true);
    try {
      const res = await admissionsApi.commit({
        quoteId: quote.quoteId,
        idempotencyKey: crypto.randomUUID(),
        ...(mode === 'RETURNING' ? { existingStudentId: returningId } : {}),
        ...(sectionId ? { sectionId } : {}),
        // Whether the one-time registration fee was collected at registration. Only meaningful for
        // an installment plan with a registration fee; harmless (defaults true) otherwise.
        ...(paymentMode === 'INSTALLMENTS' && registrationFee != null
          ? { registrationFeePaid }
          : {}),
        // Transportation demand: "Yes" = any direction other than NONE. This records the
        // request + home area on the student so Fleet's Unassigned queue and Area Planning
        // use real data; it does not change billing (charges still come from TransportFare).
        transportRequested: transportDirection !== 'NONE',
        ...(transportDirection !== 'NONE' && transportAreaId ? { areaId: transportAreaId } : {}),
        // Route is resolved from the Area → Route mapping (no manual selection). When the area
        // has no mapped route, no assignment is created and the student lands in the Unassigned
        // queue for the coordinator. Trip stays a per-student choice. Billing unchanged.
        ...(transportDirection !== 'NONE' && resolvedRouteId
          ? {
              busRouteId: resolvedRouteId,
              ...(transportTrip ? { busTripRound: Number(transportTrip) } : {}),
            }
          : {}),
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
              // Link an existing parent, or create a new one from the entered details.
              ...(parentMode === 'EXISTING'
                ? { existingParentId }
                : {
                    parent: {
                      firstNameEn: pFirstEn,
                      lastNameEn: pLastEn,
                      phone: pPhone,
                      relation: pRelation,
                      ...(pPhoneAlt ? { phoneAlt: pPhoneAlt } : {}),
                      ...(pEmail ? { email: pEmail } : {}),
                    },
                  }),
            }
          : {}),
      });
      toast.success(
        res.status === 'PENDING_APPROVAL'
          ? 'Registration committed — pending finance approval.'
          : 'Registration committed. Collect the fees in Finance.',
      );
      // Open Finance on this very student to collect the fees.
      router.push(`/finance?studentId=${encodeURIComponent(res.studentId)}`);
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

  // A registration fee only needs the "paid at registration" choice when there is one to bill.
  const registrationFee = useMemo(() => {
    const line = (quote?.lines ?? []).find((l) => l.kind === 'REGISTRATION');
    if (!line) return null;
    const net = Number(line.amount) - Number(line.discountAmount);
    return net > 0 ? net : null;
  }, [quote]);

  // Age/grade guard: children start Grade 1 (level 1) at age 6, so a student is expected to be
  // (5 + grade level) years old at the start of the academic year. We validate the entered date of
  // birth against that expected birth year (with a ±1-year tolerance for early/late starters), so an
  // out-of-range birthday — e.g. an adult date on Grade 1 — is caught before the student is created.
  const academicYearStartYear = useMemo(() => {
    const y = years.find((x) => x.id === academicYearId);
    return y ? new Date(y.startDate).getFullYear() : null;
  }, [years, academicYearId]);
  const gradeLevel = useMemo(
    () => grades.find((g) => g.id === gradeId)?.level ?? null,
    [grades, gradeId],
  );
  const gradeName = useMemo(
    () => grades.find((g) => g.id === gradeId)?.nameEn ?? 'this grade',
    [grades, gradeId],
  );
  const expectedBirthYear =
    academicYearStartYear != null && gradeLevel != null
      ? academicYearStartYear - (5 + gradeLevel)
      : null;
  const dobYear = sDob ? new Date(sDob).getFullYear() : null;
  const dobError =
    mode === 'NEW' &&
    dobYear != null &&
    expectedBirthYear != null &&
    Math.abs(dobYear - expectedBirthYear) > 1
      ? `A ${gradeName} student is expected to be born around ${expectedBirthYear} (based on the academic year). Please verify the date of birth.`
      : null;

  // Step-completion signals — derived from existing state, purely for the progress summary.
  // Order matches STEPS: enrollment, transport, quotation, student, guardian, review.
  const enrollmentDone = Boolean(gradeId && academicYearId);
  const transportDone = transportDirection === 'NONE' ? true : Boolean(transportAreaId);
  const quoteDone = Boolean(quote);
  const studentDone =
    mode === 'NEW'
      ? Boolean(sFirstEn && sLastEn && sNationalId.trim()) && !dobError
      : Boolean(returningId);
  const guardianDone = mode === 'NEW' ? parentReady : Boolean(returningId);
  const confirmDone = Boolean(quote && newStudentReady);
  const stepComplete = [
    enrollmentDone,
    transportDone,
    quoteDone,
    studentDone,
    guardianDone,
    confirmDone,
  ];

  const studentName =
    mode === 'RETURNING' && returning
      ? `${returning.firstNameEn} ${returning.lastNameEn}`
      : [sFirstEn, sLastEn].filter(Boolean).join(' ');

  const isLast = step === STEPS.length - 1;
  // Gate "Next": can't price without placement, and can't collect details before a quote exists.
  const nextDisabled =
    (step === 0 && !canQuote) ||
    // Transport requires an area — the area drives the route and the fee, so it cannot be skipped.
    (step === 1 && !transportDone) ||
    (step === 2 && !quote) ||
    (step === 3 && !studentDone) ||
    (step === 4 && !guardianDone);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">
            {mode === 'NEW' ? 'Register new student' : 'Re-enrollment'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Price the enrollment first, then capture the student profile and confirm — for new and
            returning students.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/people/students')}>
          Cancel
        </Button>
      </header>

      <Card>
        <CardContent className="p-4">
          <Stepper current={step} complete={stepComplete} onJump={(i) => setStep(i)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* ---------------------------------------------------------------- */}
          {/* Step 1 — Enrollment (registration type + placement + payment) */}
          {/* ---------------------------------------------------------------- */}
          {step === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
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

                {mode === 'RETURNING' && returning ? (
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

                <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
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
                    <Select
                      value={academicYearId}
                      onChange={(e) => setAcademicYearId(e.target.value)}
                    >
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
                  <Field label="Section" {...(gradeId ? {} : { hint: 'Pick a grade first' })}>
                    <Select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      disabled={!gradeId || sections.length === 0}
                    >
                      <option value="">{sections.length ? '—' : 'No sections'}</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-sm font-medium">Payment plan</p>
                  <div className="flex flex-wrap gap-2">
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
                      {registrationFee != null ? (
                        <div className="sm:col-span-2">
                          <Checkbox
                            checked={registrationFeePaid}
                            onChange={(e) => setRegistrationFeePaid(e.target.checked)}
                            label={`Registration fee (${jod(registrationFee)}) paid at registration`}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {registrationFeePaid
                              ? 'Billed as a one-off charge due now; only the remaining fees are split into installments.'
                              : 'Not paid up front — the registration fee is folded into the monthly installments.'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Full payment applies the school’s full-payment discount to discountable fees
                      only.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* Step 2 — Transport */}
          {/* ---------------------------------------------------------------- */}
          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Transport</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Field label="Transportation">
                  <Select
                    value={transportDirection}
                    onChange={(e) => {
                      setTransportDirection(e.target.value as TransportDirection);
                      if (e.target.value === 'NONE') setTransportAreaId('');
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
                  <>
                    <Field
                      label="Area *"
                      hint={
                        areas.length
                          ? 'Required — the area drives the route and the fee'
                          : 'No active areas configured yet (add them under Fleet → Setup)'
                      }
                    >
                      <Select
                        value={transportAreaId}
                        onChange={(e) => setTransportAreaId(e.target.value)}
                      >
                        <option value="">—</option>
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Trip">
                      <Select
                        value={transportTrip}
                        onChange={(e) => setTransportTrip(e.target.value)}
                      >
                        <option value="">No trip</option>
                        <option value="1">1st trip</option>
                        <option value="2">2nd trip</option>
                      </Select>
                    </Field>
                    {/* Route is resolved from the Area → Route mapping — not chosen manually. */}
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm sm:col-span-2">
                      {!transportAreaId ? (
                        <span className="text-muted-foreground">
                          Select an area to resolve the route.
                        </span>
                      ) : resolvedRouteName ? (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                          <span>
                            Route: <span className="font-medium">{resolvedRouteName}</span>
                          </span>
                          <span>
                            Fee:{' '}
                            <span className="font-medium">
                              {selectedArea?.transportFee != null
                                ? jod(selectedArea.transportFee)
                                : selectedFare
                                  ? jod(selectedFare.amount)
                                  : 'set under Transport fares'}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-warning">
                          No route is mapped to this area yet — the student will be added to the
                          Unassigned queue in Fleet. Map the area to a route under Fleet → Setup.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    No school transport for this student.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* Step 3 — Quotation (price the enrollment before collecting details) */}
          {/* ---------------------------------------------------------------- */}
          {step === 2 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Quotation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Compute the fees and review them with the parent. The student record is only
                    created later, on commit — so you can stop here if they decline.
                  </p>
                  <Button onClick={() => void getQuote()} disabled={!canQuote || busy}>
                    {busy ? 'Computing…' : quote ? 'Recompute quotation' : 'Compute quotation'}
                  </Button>
                  {!canQuote ? (
                    <p className="text-xs text-muted-foreground">
                      Choose a grade and academic year on the Enrollment step to compute a
                      quotation.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {quote ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>Fees</CardTitle>
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
                            <TD className="text-end font-mono">
                              {l.overridden && l.originalAmount ? (
                                <span className="me-2 text-xs text-muted-foreground line-through">
                                  {jod(l.originalAmount)}
                                </span>
                              ) : null}
                              {jod(l.amount)}
                            </TD>
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
                          Enter a new amount to override a fee. Overrides are tracked and flag the
                          student as “Fee Modified”; a reason is required.
                        </p>
                        {quote.lines.map((l) => (
                          <div
                            key={`ov-${l.kind}`}
                            className="grid items-center gap-2 sm:grid-cols-3"
                          >
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
                                  [l.kind]: {
                                    amount: e.target.value,
                                    reason: p[l.kind]?.reason ?? '',
                                  },
                                }))
                              }
                            />
                            <Input
                              placeholder="Reason"
                              value={overrides[l.kind]?.reason ?? ''}
                              onChange={(e) =>
                                setOverrides((p) => ({
                                  ...p,
                                  [l.kind]: {
                                    amount: p[l.kind]?.amount ?? '',
                                    reason: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void getQuote()}
                            disabled={busy}
                          >
                            {busy ? 'Recomputing…' : 'Recompute with overrides'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={resetOverrides}
                            disabled={busy || Object.keys(overrides).length === 0}
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </details>

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <Row label="Total fees" value={jod(quote.totalFees)} />
                      <Row label="Discount-eligible" value={jod(quote.discountEligible)} />
                      <Row label="Non-discount-eligible" value={jod(quote.nonDiscountEligible)} />
                      {Number(quote.discountAmount) > 0 ? (
                        <Row
                          label="Discount"
                          value={`− ${jod(quote.discountAmount)}`}
                          tone="text-aqua"
                        />
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
                        First installment: {jod(tuitionInstallment)}. Any over-payment at the desk
                        is applied to the last installments first (handled automatically in
                        Finance).
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* Step 4 — Student information (only after the parent agrees) */}
          {/* ---------------------------------------------------------------- */}
          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>Student information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'RETURNING' ? (
                  <p className="text-sm text-muted-foreground">
                    Returning student — the existing profile on file is reused. No changes needed
                    here.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="First name (EN)">
                      <Input value={sFirstEn} onChange={(e) => setSFirstEn(e.target.value)} />
                    </Field>
                    <Field label="Last name (EN)">
                      <Input value={sLastEn} onChange={(e) => setSLastEn(e.target.value)} />
                    </Field>
                    <Field label="First name (AR)">
                      <Input
                        value={sFirstAr}
                        onChange={(e) => setSFirstAr(e.target.value)}
                        dir="rtl"
                      />
                    </Field>
                    <Field label="Last name (AR)">
                      <Input
                        value={sLastAr}
                        onChange={(e) => setSLastAr(e.target.value)}
                        dir="rtl"
                      />
                    </Field>
                    <Field label="Gender">
                      <Select value={sGender} onChange={(e) => setSGender(e.target.value)}>
                        <option value="">—</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </Select>
                    </Field>
                    <Field
                      label="Date of birth"
                      {...(expectedBirthYear != null
                        ? { hint: `Expected birth year for ${gradeName}: ~${expectedBirthYear}` }
                        : {})}
                    >
                      <Input
                        type="date"
                        value={sDob}
                        onChange={(e) => setSDob(e.target.value)}
                        dir="ltr"
                        aria-invalid={dobError ? true : undefined}
                      />
                      {dobError ? <p className="mt-1 text-xs text-danger">{dobError}</p> : null}
                    </Field>
                    <Field label="National ID *" className="sm:col-span-2">
                      <Input
                        value={sNationalId}
                        onChange={(e) => setSNationalId(e.target.value)}
                        required
                        aria-invalid={!sNationalId.trim() ? true : undefined}
                      />
                    </Field>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* Step 5 — Parent / guardian */}
          {/* ---------------------------------------------------------------- */}
          {step === 4 ? (
            <Card>
              <CardHeader>
                <CardTitle>Parent / guardian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'RETURNING' ? (
                  <p className="text-sm text-muted-foreground">
                    The student’s existing parent / guardian on file is retained. Manage guardians
                    from the student’s profile.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Link an existing parent / guardian, or add a new one with a primary mobile
                      number.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={parentMode === 'EXISTING' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setParentMode('EXISTING')}
                      >
                        Existing parent
                      </Button>
                      <Button
                        variant={parentMode === 'NEW' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setParentMode('NEW')}
                      >
                        New parent
                      </Button>
                    </div>

                    {parentMode === 'EXISTING' ? (
                      <Field
                        label="Find parent *"
                        hint="Search an existing parent / guardian by name or mobile"
                      >
                        <EntityPicker
                          value={existingParentId}
                          onChange={setExistingParentId}
                          load={loadParentOptions}
                        />
                      </Field>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Relation to student *" className="sm:col-span-2">
                          <Select
                            value={pRelation}
                            onChange={(e) =>
                              setPRelation(
                                e.target.value as 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER',
                              )
                            }
                          >
                            <option value="FATHER">Father</option>
                            <option value="MOTHER">Mother</option>
                            <option value="GUARDIAN">Guardian</option>
                            <option value="OTHER">Other</option>
                          </Select>
                        </Field>
                        <Field label="Parent / guardian first name (EN) *">
                          <Input
                            value={pFirstEn}
                            onChange={(e) => setPFirstEn(e.target.value)}
                            required
                          />
                        </Field>
                        <Field label="Parent / guardian last name (EN) *">
                          <Input
                            value={pLastEn}
                            onChange={(e) => setPLastEn(e.target.value)}
                            required
                          />
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
                          <Input
                            value={pPhoneAlt}
                            onChange={(e) => setPPhoneAlt(e.target.value)}
                            dir="ltr"
                          />
                        </Field>
                        <Field label="Email" className="sm:col-span-2">
                          <Input
                            type="email"
                            value={pEmail}
                            onChange={(e) => setPEmail(e.target.value)}
                            dir="ltr"
                          />
                        </Field>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* Step 6 — Review & confirm */}
          {/* ---------------------------------------------------------------- */}
          {step === 5 ? (
            <Card>
              <CardHeader>
                <CardTitle>Review &amp; confirm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Recap label="Student" value={studentName || '—'} />
                  <Recap
                    label="Registration"
                    value={mode === 'NEW' ? 'New student' : 'Returning student'}
                  />
                  <Recap
                    label="Grade"
                    value={grades.find((g) => g.id === gradeId)?.nameEn ?? '—'}
                  />
                  <Recap
                    label="Academic year"
                    value={years.find((y) => y.id === academicYearId)?.name ?? '—'}
                  />
                  <Recap
                    label="Section"
                    value={sections.find((s) => s.id === sectionId)?.name ?? '—'}
                  />
                  <Recap
                    label="Transport"
                    value={
                      transportDirection === 'NONE'
                        ? 'None'
                        : `${transportDirection.replace('_', ' ')}${
                            resolvedRouteName ? ` · ${resolvedRouteName}` : ''
                          }`
                    }
                  />
                  {mode === 'NEW' ? (
                    <Recap
                      label="Guardian"
                      value={
                        parentMode === 'EXISTING'
                          ? existingParentId
                            ? 'Existing parent (linked)'
                            : '—'
                          : [pFirstEn, pLastEn].filter(Boolean).join(' ')
                            ? `${[pFirstEn, pLastEn].filter(Boolean).join(' ')}${
                                pPhone ? ` · ${pPhone}` : ''
                              }`
                            : '—'
                      }
                    />
                  ) : null}
                  <Recap
                    label="Payment"
                    value={
                      paymentMode === 'FULL' ? 'Full payment' : `${installments} installment(s)`
                    }
                  />
                </dl>
                {quote ? (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Grand total
                    </span>
                    <span className="font-display text-lg font-semibold">
                      {jod(quote.grandTotal)}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-warning">
                    No quotation yet — go back to the Quotation step and compute the fees.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The student record is created only when you commit.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Step navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {isLast ? (
              <Button onClick={() => void commit()} disabled={busy || !quote || !newStudentReady}>
                {busy ? 'Committing…' : 'Commit registration'}
              </Button>
            ) : (
              <Button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={nextDisabled}
              >
                Next step
              </Button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Registration summary sidebar */}
        {/* ------------------------------------------------------------------ */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Registration summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary"
                >
                  {(studentName.trim()[0] ?? '?').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{studentName || 'New student'}</p>
                  <p className="text-xs text-muted-foreground">
                    {mode === 'NEW' ? 'New student' : 'Returning student'}
                  </p>
                </div>
              </div>

              {quote ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <span className="text-xs text-muted-foreground">Grand total</span>
                  <span className="font-display text-base font-semibold tabular-nums">
                    {jod(quote.grandTotal)}
                  </span>
                </div>
              ) : null}

              <ProgressMeter steps={stepComplete} />

              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Checklist
                </p>
                <ul className="space-y-2">
                  {STEPS.map((s, i) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => setStep(i)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-start text-sm transition-colors',
                          i === step
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border hover:bg-accent',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                            stepComplete[i]
                              ? 'bg-aqua/15 text-aqua'
                              : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {stepComplete[i] ? <CheckIcon /> : i + 1}
                        </span>
                        <span className="flex-1 truncate">{s.label}</span>
                        {!stepComplete[i] ? (
                          <span className="text-[10px] text-muted-foreground">Pending</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                The student record is created only when you commit on the final step.
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard chrome
// ---------------------------------------------------------------------------
function Stepper({
  current,
  complete,
  onJump,
}: {
  current: number;
  complete: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const active = i === current;
        const done = complete[i];
        return (
          <li key={s.key} className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(i)}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : done
                      ? 'border-aqua/40 bg-aqua/10 text-aqua'
                      : 'border-border text-muted-foreground',
                )}
              >
                {done && !active ? <CheckIcon /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden whitespace-nowrap text-sm sm:inline',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 ? (
              <span className="h-px w-6 shrink-0 bg-border sm:w-8" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ProgressMeter({ steps }: { steps: boolean[] }) {
  const done = steps.filter(Boolean).length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Completion</span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
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
