'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { ChargeStatusBadge, TransactionStatusBadge } from '@/components/domain';
import { FeeModifiedBadge } from '@/components/fee-modified-badge';
import { DocumentsSection } from './documents-section';
import { documentsApi } from '@/lib/documents';
import {
  financeApi,
  type ChargeView,
  type CollectionsProfile,
  type Installment,
  type Statement,
} from '@/lib/finance';
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
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const PAYMENT_METHODS = ['CASH', 'CLIQ', 'EWALLET', 'BANK_TRANSFER'] as const;
const CADENCES = ['MONTHLY', 'WEEKLY', 'QUARTERLY'] as const;
const ADJUSTMENT_TYPES = [
  'DISCOUNT',
  'SCHOLARSHIP',
  'SIBLING_DISCOUNT',
  'STAFF_DISCOUNT',
  'WAIVER',
  'WRITE_OFF',
] as const;

const num = (v: string | number) => Number(v).toFixed(3);
const dateStr = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');
const receiptLabel = (n: number) => `RCPT-${String(n).padStart(6, '0')}`;

function installmentTone(inst: Installment): 'success' | 'warning' | 'danger' | 'muted' {
  if (inst.status === 'PAID' || inst.status === 'WAIVED') return 'success';
  if (inst.overdue) return 'danger';
  if (inst.status === 'PARTIAL') return 'warning';
  return 'muted';
}

/**
 * Student Financial Account workspace — the hierarchical AR view (Finance Domain Spec v1.0 §16):
 *
 *   Student Financial Account (Outstanding · Paid · Credits · Refunds · Collections)
 *     ▼ Charge (obligation)  gross · discount · net · outstanding
 *         Payment Plan (cadence × N)
 *           Installment 1..N (due · amount · paid · balance · status)
 *     ▶ Charge …
 *   Payments · Credits · Refunds · Adjustments · Documents
 *
 * Every figure comes from the ledger (single source of truth). No duplicated charges, no flat
 * installment list — installments live only inside their plan. Munaxa Design System only.
 */
export function FinanceTab({ studentId }: { studentId: string }) {
  useI18n();
  const toast = useToast();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [collections, setCollections] = useState<CollectionsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  // Inline forms.
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', reference: '' });
  const [planForm, setPlanForm] = useState<{
    chargeId: string;
    cadence: string;
    installments: string;
    firstDueDate: string;
  } | null>(null);
  const [adjForm, setAdjForm] = useState<{
    chargeId: string;
    type: string;
    amount: string;
    reason: string;
  } | null>(null);
  const [refundForm, setRefundForm] = useState({ amount: '', method: 'CASH', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        financeApi.statement(studentId),
        financeApi.collections(studentId).catch(() => null),
      ]);
      setStatement(s);
      setCollections(c);
      setExpanded((prev) => {
        const next = { ...prev };
        for (const cv of s.charges)
          if (next[cv.charge.id] === undefined) next[cv.charge.id] = Number(cv.balance) > 0;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load finance');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = statement?.totals;
  const activeCharges = useMemo(
    () => (statement?.charges ?? []).filter((c) => c.charge.status !== 'CANCELLED'),
    [statement],
  );

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await action();
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitPayment() {
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter an amount in JOD');
    await run(async () => {
      const p = await financeApi.recordPayment({
        studentId,
        amount,
        method: payForm.method,
        ...(payForm.reference ? { reference: payForm.reference } : {}),
      });
      await financeApi.verify(p.id); // record + verify (auto-allocates FIFO to installments)
      setPayForm({ amount: '', method: 'CASH', reference: '' });
    }, 'Payment recorded and allocated');
  }

  async function submitPlan() {
    if (!planForm) return;
    const installments = Number(planForm.installments);
    if (!installments || installments < 1) return toast.error('Enter a number of installments');
    if (!planForm.firstDueDate) return toast.error('Choose a first due date');
    await run(async () => {
      await financeApi.createPlan(planForm.chargeId, {
        cadence: planForm.cadence as 'MONTHLY',
        installments,
        firstDueDate: planForm.firstDueDate,
      });
      setPlanForm(null);
    }, 'Payment plan created');
  }

  async function submitAdjustment() {
    if (!adjForm) return;
    const amount = Number(adjForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a discount amount');
    if (!adjForm.reason.trim()) return toast.error('A reason is required');
    await run(async () => {
      await financeApi.applyAdjustment({
        studentId,
        chargeId: adjForm.chargeId,
        type: adjForm.type,
        amount,
        reason: adjForm.reason,
      });
      setAdjForm(null);
    }, 'Adjustment applied');
  }

  async function submitRefund() {
    const amount = Number(refundForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a refund amount');
    if (!refundForm.reason.trim()) return toast.error('A reason is required');
    await run(async () => {
      await financeApi.createRefund({
        studentId,
        amount,
        method: refundForm.method,
        reason: refundForm.reason,
      });
      setRefundForm({ amount: '', method: 'CASH', reason: '' });
    }, 'Refund requested (pending verification)');
  }

  async function downloadReceipt(paymentId: string) {
    try {
      const doc = await documentsApi.generate({ type: 'PAYMENT_RECEIPT', studentId, paymentId });
      await documentsApi.download(doc.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate the receipt');
    }
  }

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Finance unavailable" description={error} />;
  if (!statement || !totals) return <EmptyState title="No financial account" />;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Student Financial Account header ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Financial Account</CardTitle>
          <div className="flex items-center gap-2">
            <FeeModifiedBadge
              feeModified={collections?.feeModified ?? false}
              customArrangement={collections?.customArrangement ?? false}
            />
            {collections && collections.collectionsStatus !== 'NONE' && (
              <Badge tone={collections.collectionsStatus === 'LEGAL' ? 'danger' : 'warning'}>
                {collections.collectionsStatus === 'LEGAL'
                  ? 'Legal Collections'
                  : 'Financial Issue'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat
              label="Outstanding"
              value={num(totals.outstanding)}
              tone={Number(totals.outstanding) > 0 ? 'text-coral' : ''}
            />
            <Stat label="Paid" value={num(totals.paid)} />
            <Stat label="Discounts" value={num(totals.discounts)} />
            <Stat label="Credits" value={num(totals.creditBalance)} />
            <Stat label="Refunded" value={num(totals.refunded)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Charges → Plans → Installments hierarchy ── */}
      <Card>
        <CardHeader>
          <CardTitle>Charges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activeCharges.length === 0 && (
            <EmptyState title="No charges" description="This student has no charges yet." />
          )}
          {activeCharges.map((cv) => (
            <ChargeNode
              key={cv.charge.id}
              cv={cv}
              open={!!expanded[cv.charge.id]}
              busy={busy}
              onToggle={() => setExpanded((p) => ({ ...p, [cv.charge.id]: !p[cv.charge.id] }))}
              onPlan={() =>
                setPlanForm({
                  chargeId: cv.charge.id,
                  cadence: 'MONTHLY',
                  installments: '9',
                  firstDueDate: '',
                })
              }
              onDiscount={() =>
                setAdjForm({ chargeId: cv.charge.id, type: 'DISCOUNT', amount: '', reason: '' })
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Create-plan inline form */}
      {planForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create / replace payment plan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Cadence">
              <Select
                value={planForm.cadence}
                onChange={(e) => setPlanForm({ ...planForm, cadence: e.target.value })}
              >
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Installments">
              <Input
                type="number"
                min={1}
                value={planForm.installments}
                onChange={(e) => setPlanForm({ ...planForm, installments: e.target.value })}
              />
            </Field>
            <Field label="First due date">
              <Input
                type="date"
                value={planForm.firstDueDate}
                onChange={(e) => setPlanForm({ ...planForm, firstDueDate: e.target.value })}
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button onClick={() => void submitPlan()} disabled={busy}>
                Create plan
              </Button>
              <Button variant="ghost" onClick={() => setPlanForm(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply-adjustment inline form */}
      {adjForm && (
        <Card>
          <CardHeader>
            <CardTitle>Apply adjustment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Type">
              <Select
                value={adjForm.type}
                onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
              >
                {ADJUSTMENT_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {ty.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (JOD)">
              <Input
                type="number"
                value={adjForm.amount}
                onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
              />
            </Field>
            <Field label="Reason">
              <Input
                value={adjForm.reason}
                onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button onClick={() => void submitAdjustment()} disabled={busy}>
                Apply
              </Button>
              <Button variant="ghost" onClick={() => setAdjForm(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Record payment ── */}
      <Card>
        <CardHeader>
          <CardTitle>Record payment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Amount (JOD)">
            <Input
              type="number"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            />
          </Field>
          <Field label="Method">
            <Select
              value={payForm.method}
              onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference">
            <Input
              value={payForm.reference}
              onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <Button onClick={() => void submitPayment()} disabled={busy}>
              Record &amp; verify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Payments ── */}
      <SectionTable title="Payments">
        {statement.payments.length === 0 ? (
          <EmptyState title="No payments" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Receipt</TH>
                <TH>Date</TH>
                <TH>Method</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Invoice</TH>
                <TH> </TH>
              </TR>
            </THead>
            <TBody>
              {statement.payments.map((p) => (
                <TR key={p.id}>
                  <TD>{p.receiptNo != null ? receiptLabel(p.receiptNo) : '—'}</TD>
                  <TD>{dateStr(p.createdAt)}</TD>
                  <TD>{p.method}</TD>
                  <TD>{num(p.amount)}</TD>
                  <TD>
                    <TransactionStatusBadge status={p.status} />
                  </TD>
                  <TD>{p.einvoice ? p.einvoice.invoiceNumber : '—'}</TD>
                  <TD className="flex gap-2">
                    {p.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            void run(() => financeApi.verify(p.id), 'Payment verified')
                          }
                          disabled={busy}
                        >
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void run(() => financeApi.reject(p.id), 'Payment rejected')
                          }
                          disabled={busy}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {p.status === 'VERIFIED' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void downloadReceipt(p.id)}
                        >
                          Receipt
                        </Button>
                        {!p.parentNotifiedAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void run(() => financeApi.notifyParent(p.id), 'Parent notified')
                            }
                            disabled={busy}
                          >
                            Notify parent
                          </Button>
                        )}
                      </>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </SectionTable>

      {/* ── Credits ── */}
      {statement.credits.length > 0 && (
        <SectionTable title="Credits">
          <Table>
            <THead>
              <TR>
                <TH>Source</TH>
                <TH>Amount</TH>
                <TH>Remaining</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {statement.credits.map((c) => (
                <TR key={c.id}>
                  <TD>{c.source.replace(/_/g, ' ')}</TD>
                  <TD>{num(c.amount)}</TD>
                  <TD>{num(c.remaining)}</TD>
                  <TD>{dateStr(c.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </SectionTable>
      )}

      {/* ── Refunds ── */}
      <SectionTable
        title="Refunds"
        action={
          <div className="flex items-end gap-2">
            <Input
              className="w-28"
              type="number"
              placeholder="Amount"
              value={refundForm.amount}
              onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
            />
            <Input
              className="w-40"
              placeholder="Reason"
              value={refundForm.reason}
              onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
            />
            <Button size="sm" onClick={() => void submitRefund()} disabled={busy}>
              Refund credit
            </Button>
          </div>
        }
      >
        {statement.refunds.length === 0 ? (
          <EmptyState title="No refunds" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Amount</TH>
                <TH>Method</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH> </TH>
              </TR>
            </THead>
            <TBody>
              {statement.refunds.map((r) => (
                <TR key={r.id}>
                  <TD>{dateStr(r.createdAt)}</TD>
                  <TD>{num(r.amount)}</TD>
                  <TD>{r.method}</TD>
                  <TD>{r.reason}</TD>
                  <TD>
                    <TransactionStatusBadge status={r.status} />
                  </TD>
                  <TD>
                    {r.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() =>
                          void run(() => financeApi.verifyRefund(r.id), 'Refund verified')
                        }
                        disabled={busy}
                      >
                        Verify
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </SectionTable>

      {/* ── Adjustments ── */}
      {statement.adjustments.length > 0 && (
        <SectionTable title="Adjustments">
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>Amount</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH> </TH>
              </TR>
            </THead>
            <TBody>
              {statement.adjustments.map((a) => (
                <TR key={a.id}>
                  <TD>{a.type.replace(/_/g, ' ')}</TD>
                  <TD>{num(a.amount)}</TD>
                  <TD>{a.reason}</TD>
                  <TD>
                    <Badge tone={a.status === 'APPLIED' ? 'success' : 'muted'}>{a.status}</Badge>
                  </TD>
                  <TD>
                    {a.status === 'APPLIED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void run(() => financeApi.reverseAdjustment(a.id), 'Adjustment reversed')
                        }
                        disabled={busy}
                      >
                        Reverse
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </SectionTable>
      )}

      {/* ── Documents ── */}
      <DocumentsSection studentId={studentId} />
    </div>
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function SectionTable({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A single charge (obligation) node: header + expandable plan/installments. */
function ChargeNode({
  cv,
  open,
  busy,
  onToggle,
  onPlan,
  onDiscount,
}: {
  cv: ChargeView;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onPlan: () => void;
  onDiscount: () => void;
}) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{open ? '▼' : '▶'}</span>
          <span className="font-medium">{cv.charge.description}</span>
          <ChargeStatusBadge status={cv.charge.status} />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Net {num(cv.net)}</span>
          <span className={Number(cv.balance) > 0 ? 'font-semibold text-coral' : 'font-semibold'}>
            Out {num(cv.balance)}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Gross" value={num(cv.gross)} />
            <Stat label="Discount" value={num(cv.discount)} />
            <Stat label="Net" value={num(cv.net)} />
            <Stat label="Paid" value={num(cv.paid)} />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              {cv.plan
                ? `Payment Plan · ${cv.plan.cadence} × ${cv.plan.installments}`
                : 'No payment plan'}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onDiscount} disabled={busy}>
                Adjust
              </Button>
              <Button size="sm" variant="ghost" onClick={onPlan} disabled={busy}>
                {cv.plan ? 'Replace plan' : 'Create plan'}
              </Button>
            </div>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>#</TH>
                <TH>Due</TH>
                <TH>Amount</TH>
                <TH>Paid</TH>
                <TH>Balance</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {cv.installments.map((inst) => (
                <TR key={inst.id}>
                  <TD>{inst.seq}</TD>
                  <TD>{dateStr(inst.dueDate)}</TD>
                  <TD>{num(inst.amount)}</TD>
                  <TD>{num(inst.paid)}</TD>
                  <TD>{num(inst.balance)}</TD>
                  <TD>
                    <Badge tone={installmentTone(inst)}>
                      {inst.overdue ? 'OVERDUE' : inst.status}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
