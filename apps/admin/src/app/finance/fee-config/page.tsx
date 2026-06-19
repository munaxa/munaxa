'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import {
  feeConfigApi,
  type BillingPolicy,
  type DiscountRule,
  type GradeFeeSchedule,
  type TransportDirection,
  type TransportFare,
} from '@/lib/finance';
import { schoolsApi, campusesApi, gradesApi, academicYearsApi } from '@/lib/structure';
import type { AcademicYear, Campus, Grade } from '@/lib/structure';
import {
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';

const DIRECTIONS: TransportDirection[] = ['NONE', 'ONE_WAY', 'TWO_WAY'];
const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

export default function FeeConfigPage() {
  const toast = useToast();
  const [tab, setTab] = useState('grade');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState('');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [yearId, setYearId] = useState('');

  // Load campuses (across all schools) once.
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

  // When campus changes, load its academic years + grades.
  useEffect(() => {
    if (!campusId) return;
    void Promise.all([academicYearsApi.list(campusId), gradesApi.list(campusId)])
      .then(([y, g]) => {
        setYears(y);
        setGrades(g);
        setYearId((cur) => cur || y.find((x) => x.isCurrent)?.id || y[0]?.id || '');
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load structure'));
  }, [campusId, toast]);

  const gradeName = useMemo(() => {
    const m = new Map(grades.map((g) => [g.id, g.nameEn]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [grades]);

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Fee configuration</h1>
          <p className="text-sm text-muted-foreground">
            Grade fees, transport fares, discount rules and the billing policy that drive enrollment
            quotes. No values are hardcoded.
          </p>
        </header>

        {/* Campus + academic-year context for the fee/transport tabs */}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Campus" className="min-w-[12rem]">
            <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Academic year" className="min-w-[12rem]">
            <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
              <option value="">—</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="grade">Grade fees</TabsTrigger>
            <TabsTrigger value="transport">Transport fares</TabsTrigger>
            <TabsTrigger value="discounts">Discount rules</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="grade">
            <GradeFees yearId={yearId} grades={grades} gradeName={gradeName} />
          </TabsContent>
          <TabsContent value="transport">
            <TransportFares yearId={yearId} />
          </TabsContent>
          <TabsContent value="discounts">
            <DiscountRules />
          </TabsContent>
          <TabsContent value="policy">
            <PolicyForm />
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function GradeFees({
  yearId,
  grades,
  gradeName,
}: {
  yearId: string;
  grades: Grade[];
  gradeName: (id: string) => string;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<GradeFeeSchedule[]>([]);
  const [form, setForm] = useState({
    gradeId: '',
    registrationFee: '',
    tuitionFee: '',
    effectiveFrom: '',
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!yearId) return setRows([]);
    feeConfigApi
      .gradeFees(yearId)
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Load failed'));
  }, [yearId, toast]);
  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!yearId || !form.gradeId) return;
    setBusy(true);
    try {
      await feeConfigApi.createGradeFee({
        gradeId: form.gradeId,
        academicYearId: yearId,
        registrationFee: Number(form.registrationFee) || 0,
        tuitionFee: Number(form.tuitionFee) || 0,
        effectiveFrom: form.effectiveFrom || new Date().toISOString().slice(0, 10),
      });
      setForm({ gradeId: '', registrationFee: '', tuitionFee: '', effectiveFrom: '' });
      toast.success('Saved');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade fees</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-5">
          <Field label="Grade">
            <Select
              value={form.gradeId}
              onChange={(e) => setForm({ ...form, gradeId: e.target.value })}
              required
            >
              <option value="">—</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nameEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Registration">
            <Input
              type="number"
              step="0.001"
              value={form.registrationFee}
              onChange={(e) => setForm({ ...form, registrationFee: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="Tuition">
            <Input
              type="number"
              step="0.001"
              value={form.tuitionFee}
              onChange={(e) => setForm({ ...form, tuitionFee: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="Effective from">
            <Input
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              dir="ltr"
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={!yearId || !form.gradeId || busy}>
              {busy ? '…' : 'Add'}
            </Button>
          </div>
        </form>

        <Table>
          <THead>
            <TR>
              <TH>Grade</TH>
              <TH className="text-end">Registration</TH>
              <TH className="text-end">Tuition</TH>
              <TH>Effective from</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>{gradeName(r.gradeId)}</TD>
                <TD className="text-end font-mono">{jod(r.registrationFee)}</TD>
                <TD className="text-end font-mono">{jod(r.tuitionFee)}</TD>
                <TD className="font-mono text-xs">{r.effectiveFrom.slice(0, 10)}</TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={4}>
                  <EmptyState title={yearId ? 'No grade fees yet' : 'Select an academic year'} />
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TransportFares({ yearId }: { yearId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<TransportFare[]>([]);
  const [form, setForm] = useState<{ direction: TransportDirection; amount: string }>({
    direction: 'ONE_WAY',
    amount: '',
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!yearId) return setRows([]);
    feeConfigApi
      .transportFares(yearId)
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Load failed'));
  }, [yearId, toast]);
  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!yearId) return;
    setBusy(true);
    try {
      await feeConfigApi.createTransportFare({
        academicYearId: yearId,
        direction: form.direction,
        amount: Number(form.amount) || 0,
      });
      setForm({ direction: 'ONE_WAY', amount: '' });
      toast.success('Saved');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transport fares</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-3">
          <Field label="Direction">
            <Select
              value={form.direction}
              onChange={(e) =>
                setForm({ ...form, direction: e.target.value as TransportDirection })
              }
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (annual)">
            <Input
              type="number"
              step="0.001"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              dir="ltr"
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={!yearId || busy}>
              {busy ? '…' : 'Add'}
            </Button>
          </div>
        </form>
        <Table>
          <THead>
            <TR>
              <TH>Direction</TH>
              <TH className="text-end">Amount</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>{r.direction.replace('_', ' ')}</TD>
                <TD className="text-end font-mono">{jod(r.amount)}</TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={2}>
                  <EmptyState
                    title={yearId ? 'No transport fares yet' : 'Select an academic year'}
                  />
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DiscountRules() {
  const toast = useToast();
  const [rows, setRows] = useState<DiscountRule[]>([]);
  const [form, setForm] = useState({
    name: '',
    type: 'FULL_PAYMENT' as DiscountRule['type'],
    calc: 'PERCENT' as DiscountRule['calc'],
    value: '',
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    feeConfigApi
      .discountRules()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Load failed'));
  }, [toast]);
  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setBusy(true);
    try {
      await feeConfigApi.createDiscountRule({
        name: form.name,
        type: form.type,
        calc: form.calc,
        value: Number(form.value) || 0,
      });
      setForm({ name: '', type: 'FULL_PAYMENT', calc: 'PERCENT', value: '' });
      toast.success('Saved');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discount rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-5">
          <Field label="Name" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as DiscountRule['type'] })}
            >
              {['FULL_PAYMENT', 'SIBLING', 'SCHOLARSHIP', 'PROMOTIONAL', 'MANUAL'].map((x) => (
                <option key={x} value={x}>
                  {x.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Calc">
            <Select
              value={form.calc}
              onChange={(e) => setForm({ ...form, calc: e.target.value as DiscountRule['calc'] })}
            >
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </Select>
          </Field>
          <Field label="Value">
            <Input
              type="number"
              step="0.001"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              dir="ltr"
            />
          </Field>
          <div className="flex items-end sm:col-span-5">
            <Button type="submit" disabled={!form.name || busy}>
              {busy ? '…' : 'Add rule'}
            </Button>
          </div>
        </form>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH>Calc</TH>
              <TH className="text-end">Value</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>{r.name}</TD>
                <TD>{r.type.replace('_', ' ')}</TD>
                <TD>{r.calc}</TD>
                <TD className="text-end font-mono">
                  {r.calc === 'PERCENT' ? `${Number(r.value)}%` : jod(r.value)}
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={4}>
                  <EmptyState title="No discount rules yet" />
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PolicyForm() {
  const toast = useToast();
  const [policy, setPolicy] = useState<BillingPolicy | null>(null);
  const [form, setForm] = useState({
    minInstallments: '1',
    maxInstallments: '9',
    fullPaymentDiscountPct: '0',
    suspendTransportAfterOverdue: '2',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void feeConfigApi
      .policy()
      .then((p) => {
        if (!p) return;
        setPolicy(p);
        setForm({
          minInstallments: String(p.minInstallments),
          maxInstallments: String(p.maxInstallments),
          fullPaymentDiscountPct: String(Number(p.fullPaymentDiscountPct)),
          suspendTransportAfterOverdue: String(p.suspendTransportAfterOverdue),
        });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Load failed'));
  }, [toast]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await feeConfigApi.upsertPolicy({
        minInstallments: Number(form.minInstallments) || 1,
        maxInstallments: Number(form.maxInstallments) || 9,
        fullPaymentDiscountPct: Number(form.fullPaymentDiscountPct) || 0,
        suspendTransportAfterOverdue: Number(form.suspendTransportAfterOverdue) || 2,
      });
      setPolicy(saved);
      toast.success('Policy saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing policy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-3 sm:grid-cols-2">
          <Field label="Min installments" hint="Lower bound for installment plans">
            <Input
              type="number"
              value={form.minInstallments}
              onChange={(e) => setForm({ ...form, minInstallments: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="Max installments" hint="Upper bound (spec: 9)">
            <Input
              type="number"
              value={form.maxInstallments}
              onChange={(e) => setForm({ ...form, maxInstallments: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="Full-payment discount (%)">
            <Input
              type="number"
              step="0.01"
              value={form.fullPaymentDiscountPct}
              onChange={(e) => setForm({ ...form, fullPaymentDiscountPct: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="Suspend transport after N overdue">
            <Input
              type="number"
              value={form.suspendTransportAfterOverdue}
              onChange={(e) => setForm({ ...form, suspendTransportAfterOverdue: e.target.value })}
              dir="ltr"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : policy ? 'Update policy' : 'Create policy'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
