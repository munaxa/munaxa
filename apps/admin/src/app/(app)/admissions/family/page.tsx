'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import { EntityPicker } from '@/components/entity-picker';
import { loadParentOptions } from '@/lib/pickers';
import {
  admissionsApi,
  type ComputedQuote,
  type FinancialAccountOwnerType,
  type QuotePaymentMode,
  type TransportDirection,
} from '@/lib/admissions';
import { schoolsApi, campusesApi, gradesApi, academicYearsApi, sectionsApi } from '@/lib/structure';
import type { AcademicYear, Campus, Grade, Section } from '@/lib/structure';
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

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;
const DIRECTIONS: TransportDirection[] = ['NONE', 'ONE_WAY', 'TWO_WAY'];
const OWNER_TYPES: FinancialAccountOwnerType[] = [
  'GUARDIAN',
  'GRANDPARENT',
  'COMPANY',
  'CHARITY',
  'SPONSOR',
  'GOVERNMENT',
  'SCHOLARSHIP_ORG',
  'COURT_ORDER',
  'RELATIVE',
  'OTHER',
];

const STEPS = ['Family & plan', 'Add students', 'Review & confirm'] as const;

interface StudentRow {
  key: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  nationalId: string;
  gradeId: string;
  sectionId: string;
  transportDirection: TransportDirection;
  quote: (ComputedQuote & { quoteId?: string }) | null;
  quoting: boolean;
}

function blankStudent(): StudentRow {
  return {
    key: Math.random().toString(36).slice(2),
    firstNameEn: '',
    lastNameEn: '',
    firstNameAr: '',
    lastNameAr: '',
    nationalId: '',
    gradeId: '',
    sectionId: '',
    transportDirection: 'NONE',
    quote: null,
    quoting: false,
  };
}

/**
 * Family Admission — one guardian/customer, one family payment plan, unlimited students. The
 * financial customer is the family; a chosen installment count yields exactly that many FAMILY
 * installments. Each student carries its own fee quote; the review shows ONE financial summary and
 * ONE agreement is generated on commit. Munaxa Design System only; RTL/LTR + dark/light inherited.
 */
export default function FamilyAdmissionPage() {
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState(0);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState('');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sectionsByGrade, setSectionsByGrade] = useState<Record<string, Section[]>>({});

  // Family payment plan
  const [paymentMode, setPaymentMode] = useState<QuotePaymentMode>('INSTALLMENTS');
  const [installments, setInstallments] = useState('9');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [registrationFeePaid, setRegistrationFeePaid] = useState(true);

  // Guardian
  const [ownerType, setOwnerType] = useState<FinancialAccountOwnerType>('GUARDIAN');
  const [parentMode, setParentMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [existingParentId, setExistingParentId] = useState('');
  const [pFirstEn, setPFirstEn] = useState('');
  const [pLastEn, setPLastEn] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([blankStudent()]);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const schools = await schoolsApi.list();
        if (schools[0]) {
          const cs = await campusesApi.list(schools[0].id);
          setCampuses(cs);
          if (cs[0]) setCampusId(cs[0].id);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load campuses');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!campusId) return;
    void (async () => {
      try {
        const [ys, gs] = await Promise.all([
          academicYearsApi.list(campusId),
          gradesApi.list(campusId),
        ]);
        setYears(ys);
        setGrades(gs);
        const current = ys.find((y) => y.isCurrent) ?? ys[0];
        if (current) setAcademicYearId(current.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load year/grades');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  const loadSections = async (gradeId: string) => {
    if (!gradeId || sectionsByGrade[gradeId]) return;
    try {
      const secs = await sectionsApi.list(gradeId);
      setSectionsByGrade((m) => ({ ...m, [gradeId]: secs }));
    } catch {
      /* sections are optional */
    }
  };

  const updateStudent = (key: string, patch: Partial<StudentRow>) =>
    setStudents((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, ...patch, quote: patch.gradeId || patch.transportDirection ? null : r.quote }
          : r,
      ),
    );

  const quoteStudent = async (row: StudentRow) => {
    if (!row.gradeId) {
      toast.error('Choose a grade for this student first');
      return;
    }
    updateStudent(row.key, { quoting: true });
    try {
      const quote = await admissionsApi.quote({
        gradeId: row.gradeId,
        academicYearId,
        transportDirection: row.transportDirection,
        paymentMode,
        installments: paymentMode === 'INSTALLMENTS' ? Number(installments) : 1,
        firstDueDate,
        persist: true,
      });
      setStudents((rows) =>
        rows.map((r) => (r.key === row.key ? { ...r, quote, quoting: false } : r)),
      );
    } catch (e) {
      updateStudent(row.key, { quoting: false });
      toast.error(e instanceof Error ? e.message : 'Failed to price this student');
    }
  };

  const grandTotal = useMemo(
    () => students.reduce((sum, s) => sum + (s.quote ? Number(s.quote.grandTotal) : 0), 0),
    [students],
  );
  const allQuoted = students.length > 0 && students.every((s) => s.quote?.quoteId);

  const canProceedFamily =
    !!academicYearId &&
    (parentMode === 'EXISTING' ? !!existingParentId : pFirstEn && pLastEn && pPhone);

  const commit = async () => {
    if (!allQuoted) {
      toast.error('Price every student before committing');
      return;
    }
    setCommitting(true);
    try {
      const res = await admissionsApi.familyCommit({
        idempotencyKey: `fam-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        academicYearId,
        ...(parentMode === 'EXISTING'
          ? { existingParentId }
          : {
              parent: {
                firstNameEn: pFirstEn,
                lastNameEn: pLastEn,
                phone: pPhone,
                ...(pEmail ? { email: pEmail } : {}),
                relation: 'GUARDIAN',
              },
            }),
        ownerType,
        paymentMode,
        installments: paymentMode === 'INSTALLMENTS' ? Number(installments) : 1,
        firstDueDate,
        registrationFeePaid,
        students: students.map((s) => ({
          quoteId: s.quote!.quoteId!,
          student: {
            firstNameEn: s.firstNameEn,
            lastNameEn: s.lastNameEn,
            firstNameAr: s.firstNameAr || s.firstNameEn,
            lastNameAr: s.lastNameAr || s.lastNameEn,
            ...(s.nationalId ? { nationalId: s.nationalId } : {}),
          },
          ...(s.sectionId ? { sectionId: s.sectionId } : {}),
          transportRequested: s.transportDirection !== 'NONE',
        })),
      });
      toast.success(`Family registered — ${res.enrollmentIds.length} student(s)`);
      if (res.financialAccount) router.push(`/finance/families`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Family registration failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Family admission</h1>
          <p className="text-sm text-muted-foreground">
            One guardian, one payment plan, all the children — a single financial summary and one
            agreement.
          </p>
        </header>

        {/* Stepper */}
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <Badge key={label} tone={i === step ? 'default' : i < step ? 'success' : 'muted'}>
              {i + 1}. {label}
            </Badge>
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Family & payment plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Payment plan">
                  <Select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as QuotePaymentMode)}
                  >
                    <option value="INSTALLMENTS">Installments</option>
                    <option value="FULL">Pay in full</option>
                  </Select>
                </Field>
                {paymentMode === 'INSTALLMENTS' && (
                  <Field label="Number of installments">
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                    />
                  </Field>
                )}
                <Field label="First due date">
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Financial customer type">
                  <Select
                    value={ownerType}
                    onChange={(e) => setOwnerType(e.target.value as FinancialAccountOwnerType)}
                  >
                    {OWNER_TYPES.map((o) => (
                      <option key={o} value={o}>
                        {o.replace('_', ' ')}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Guardian">
                  <Select
                    value={parentMode}
                    onChange={(e) => setParentMode(e.target.value as 'NEW' | 'EXISTING')}
                  >
                    <option value="NEW">New guardian</option>
                    <option value="EXISTING">Existing guardian</option>
                  </Select>
                </Field>
              </div>

              {parentMode === 'EXISTING' ? (
                <Field label="Select guardian">
                  <EntityPicker
                    value={existingParentId}
                    onChange={setExistingParentId}
                    load={loadParentOptions}
                    placeholder="Search guardians…"
                  />
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input value={pFirstEn} onChange={(e) => setPFirstEn(e.target.value)} />
                  </Field>
                  <Field label="Last name">
                    <Input value={pLastEn} onChange={(e) => setPLastEn(e.target.value)} />
                  </Field>
                  <Field label="Mobile number">
                    <Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
                  </Field>
                  <Field label="Email (optional)">
                    <Input value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
                  </Field>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={registrationFeePaid}
                  onChange={(e) => setRegistrationFeePaid(e.target.checked)}
                />
                Registration fee paid at registration (billed as a one-off, not spread over the
                plan)
              </label>

              <div className="flex justify-end">
                <Button disabled={!canProceedFamily} onClick={() => setStep(1)}>
                  Next: add students
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {students.map((row, idx) => (
              <Card key={row.key}>
                <CardHeader>
                  <CardTitle>
                    Student {idx + 1}
                    {students.length > 1 && (
                      <Button
                        variant="ghost"
                        className="ml-2"
                        onClick={() => setStudents((rows) => rows.filter((r) => r.key !== row.key))}
                      >
                        Remove
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name (EN)">
                      <Input
                        value={row.firstNameEn}
                        onChange={(e) => updateStudent(row.key, { firstNameEn: e.target.value })}
                      />
                    </Field>
                    <Field label="Last name (EN)">
                      <Input
                        value={row.lastNameEn}
                        onChange={(e) => updateStudent(row.key, { lastNameEn: e.target.value })}
                      />
                    </Field>
                    <Field label="National ID">
                      <Input
                        value={row.nationalId}
                        onChange={(e) => updateStudent(row.key, { nationalId: e.target.value })}
                      />
                    </Field>
                    <Field label="Grade">
                      <Select
                        value={row.gradeId}
                        onChange={(e) => {
                          updateStudent(row.key, { gradeId: e.target.value, sectionId: '' });
                          void loadSections(e.target.value);
                        }}
                      >
                        <option value="">Select grade…</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nameEn}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Section (optional)">
                      <Select
                        value={row.sectionId}
                        onChange={(e) => updateStudent(row.key, { sectionId: e.target.value })}
                      >
                        <option value="">—</option>
                        {(sectionsByGrade[row.gradeId] ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Transportation">
                      <Select
                        value={row.transportDirection}
                        onChange={(e) =>
                          updateStudent(row.key, {
                            transportDirection: e.target.value as TransportDirection,
                          })
                        }
                      >
                        {DIRECTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d.replace('_', ' ')}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {row.quote ? (
                        <span className="font-semibold">{jod(row.quote.grandTotal)}</span>
                      ) : (
                        <span className="text-muted-foreground">Not priced yet</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      disabled={row.quoting}
                      onClick={() => void quoteStudent(row)}
                    >
                      {row.quoting ? 'Pricing…' : row.quote ? 'Re-price' : 'Price this student'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setStudents((rows) => [...rows, blankStudent()])}
              >
                + Add student
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button disabled={!allQuoted} onClick={() => setStep(2)}>
                  Next: review
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Family financial summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Student</TH>
                    <TH>Grade</TH>
                    <TH>Transport</TH>
                    <TH>Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {students.map((s) => (
                    <TR key={s.key}>
                      <TD>
                        {s.firstNameEn} {s.lastNameEn}
                      </TD>
                      <TD>{grades.find((g) => g.id === s.gradeId)?.nameEn ?? '—'}</TD>
                      <TD>{s.transportDirection.replace('_', ' ')}</TD>
                      <TD>{s.quote ? jod(s.quote.grandTotal) : '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <div className="flex items-center justify-between rounded-md bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">
                  {paymentMode === 'INSTALLMENTS'
                    ? `${installments} family installments from ${firstDueDate}`
                    : 'Pay in full'}
                </div>
                <div className="text-lg font-semibold">Grand total: {jod(grandTotal)}</div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button disabled={committing || !allQuoted} onClick={() => void commit()}>
                  {committing ? 'Registering…' : 'Confirm family registration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  );
}
