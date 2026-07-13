'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import {
  familiesApi,
  type FamilyDashboard,
  type FamilySearchHit,
  type PaymentMethod,
} from '@/lib/families';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;
const dateStr = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

const METHODS: PaymentMethod[] = ['CASH', 'CLIQ', 'EWALLET', 'BANK_TRANSFER', 'CHEQUE', 'CARD'];

const COLLECTION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  NONE: 'success',
  FINANCIAL_ISSUE: 'warning',
  LEGAL: 'danger',
};

/**
 * Family Finance Dashboard — finance is family-first. Search by guardian / father / mother / family
 * name / phone / national id / student, select a family to see its totals (KPIs) and children, record
 * a single family payment (auto-allocated across the children), and drill into a child. Munaxa Design
 * System components only; RTL/LTR + dark/light inherited.
 */
export default function FamilyFinancePage() {
  const toast = useToast();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<FamilySearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const [payOpen, setPayOpen] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) {
      toast.error('Type at least 2 characters to search');
      return;
    }
    setSearching(true);
    try {
      setHits(await familiesApi.search(q.trim()));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const openFamily = async (hit: FamilySearchHit) => {
    if (!hit.financialAccountId) {
      toast.error('This guardian has no family account yet — register them via Family Admission');
      return;
    }
    setLoading(true);
    setHits(null);
    try {
      setDashboard(await familiesApi.dashboard(hit.financialAccountId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load the family');
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    if (!dashboard) return;
    setDashboard(await familiesApi.dashboard(dashboard.account.id));
  };

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Family finance</h1>
          <p className="text-sm text-muted-foreground">
            Search a family and manage its finances — one account pays for all the children.
          </p>
        </header>

        <Card>
          <CardContent className="p-4">
            <form onSubmit={(e) => void search(e)} className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Guardian, father, mother, family name, phone, national ID or student…"
                aria-label="Search families"
              />
              <Button type="submit" disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {hits && (
          <Card>
            <CardHeader>
              <CardTitle>Results ({hits.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {hits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No families matched your search.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Guardian</TH>
                      <TH>Phone</TH>
                      <TH>National ID</TH>
                      <TH>Students</TH>
                      <TH>Account</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {hits.map((h) => (
                      <TR
                        key={h.parentId ?? h.financialAccountId ?? h.nameEn}
                        className="cursor-pointer"
                        onClick={() => void openFamily(h)}
                      >
                        <TD>{h.nameEn}</TD>
                        <TD>{h.phone ?? '—'}</TD>
                        <TD>{h.nationalId ?? '—'}</TD>
                        <TD>{h.studentCount}</TD>
                        <TD>
                          {h.financialAccountId ? (
                            <Badge tone="success">Family account</Badge>
                          ) : (
                            <Badge tone="muted">No account</Badge>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {loading && <Spinner />}

        {!loading && dashboard && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">{dashboard.account.nameEn}</h2>
                <p className="text-sm text-muted-foreground">
                  {dashboard.account.ownerType.replace('_', ' ')} ·{' '}
                  {dashboard.account.phone ?? 'no phone'}
                </p>
              </div>
              <Button onClick={() => setPayOpen(true)}>Record payment</Button>
            </div>

            {/* Family totals — the default view */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Total charges" value={jod(dashboard.summary.netCharged)} />
              <Metric label="Total paid" value={jod(dashboard.summary.paid)} />
              <Metric label="Outstanding" value={jod(dashboard.summary.outstanding)} />
              <Metric label="Credit balance" value={jod(dashboard.summary.creditBalance)} />
              <Metric
                label="Next due"
                value={
                  dashboard.summary.nextDue
                    ? `${jod(dashboard.summary.nextDue.amount)} · ${dateStr(dashboard.summary.nextDue.dueDate)}`
                    : '—'
                }
              />
              <Metric
                label="Last payment"
                value={
                  dashboard.summary.lastPayment
                    ? `${jod(dashboard.summary.lastPayment.amount)} · ${dateStr(dashboard.summary.lastPayment.date)}`
                    : '—'
                }
              />
              <MetricNode label="Collection status">
                <Badge tone={COLLECTION_TONE[dashboard.summary.collectionStatus] ?? 'muted'}>
                  {dashboard.summary.collectionStatus.replace('_', ' ')}
                </Badge>
              </MetricNode>
              <Metric label="Children" value={String(dashboard.summary.childrenCount)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Children ({dashboard.students.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students on this account.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Student</TH>
                        <TH>Grade</TH>
                        <TH> </TH>
                      </TR>
                    </THead>
                    <TBody>
                      {dashboard.students.map((s) => (
                        <TR key={s.studentId}>
                          <TD>
                            {s.firstNameEn} {s.lastNameEn}
                          </TD>
                          <TD>{s.gradeNameEn ?? '—'}</TD>
                          <TD>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                router.push(`/people/students/${s.studentId}?tab=finance`)
                              }
                            >
                              Open student
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!loading && !dashboard && !hits && <EmptyState title="Search for a family to begin" />}
      </div>

      {dashboard && (
        <RecordPaymentDialog
          open={payOpen}
          onClose={() => setPayOpen(false)}
          accountName={dashboard.account.nameEn}
          onSubmit={async (amount, method, reference, note) => {
            await familiesApi.recordPayment(dashboard.account.id, {
              amount,
              method,
              ...(reference ? { reference } : {}),
              ...(note ? { note } : {}),
            });
            toast.success('Payment recorded (pending verification)');
            setPayOpen(false);
            await reload();
          }}
        />
      )}
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <MetricNode label={label}>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </MetricNode>
  );
}

function MetricNode({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {children}
      </CardContent>
    </Card>
  );
}

function RecordPaymentDialog({
  open,
  onClose,
  accountName,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  accountName: string;
  onSubmit: (
    amount: number,
    method: PaymentMethod,
    reference: string,
    note: string,
  ) => Promise<void>;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(value, method, reference.trim(), note.trim());
      setAmount('');
      setReference('');
      setNote('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record the payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Record a family payment — ${accountName}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The payment is recorded once and automatically allocated across the family’s installments.
        </p>
        <Field label="Amount (JOD)">
          <Input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference (optional)">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? 'Recording…' : 'Record payment'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
