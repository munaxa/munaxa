'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { TransactionStatusBadge } from '@/components/domain';
import {
  financeApi,
  type AgingBuckets,
  type CollectionsProfile,
  type InstallmentPlan,
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

const num = (v: string | number) => Number(v).toFixed(3);
const dateStr = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

/** Whole days `due` is in the past relative to today (0 if not yet due). */
function daysOverdue(due?: string | null): number {
  if (!due) return 0;
  const ms = Date.now() - new Date(due).getTime();
  return ms > 0 ? Math.floor(ms / 86_400_000) : 0;
}

type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UPCOMING';

/** Derive a richer schedule status than the raw charge status (adds OVERDUE / PARTIAL). */
function installmentStatus(paid: number, balance: number, due?: string | null): InstallmentStatus {
  if (balance <= 0) return 'PAID';
  if (due && new Date(due).getTime() < Date.now()) return 'OVERDUE';
  if (paid > 0) return 'PARTIAL';
  return 'UPCOMING';
}

const STATUS_TONE: Record<InstallmentStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  PAID: 'success',
  PARTIAL: 'warning',
  OVERDUE: 'danger',
  UPCOMING: 'muted',
};

/**
 * Premium per-student finance workspace. Read-first: it composes the existing finance APIs
 * (statement, installment plan, collections snapshot, aging) into a KPI summary, fee-category
 * breakdown, fee plan, installment schedule, payment history and a derived statement of account.
 *
 * Write operations stay with the canonical Finance logic: a lightweight Record Payment reuses
 * `recordPayment` + `verify` (identical to the Finance page), and advanced operations (discounts,
 * credit notes, refunds, collections flags, plan management) deep-link to /finance to avoid
 * duplicating that logic here.
 */
export function FinanceTab({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);
  const [collections, setCollections] = useState<CollectionsProfile | null>(null);
  const [aging, setAging] = useState<AgingBuckets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Installment schedule controls.
  const [statusFilter, setStatusFilter] = useState<'' | InstallmentStatus>('');
  const [sortAsc, setSortAsc] = useState(true);

  // Inline Record Payment.
  const [paying, setPaying] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', reference: '', chargeId: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, c, a] = await Promise.all([
        financeApi.statement(studentId),
        financeApi.installmentPlan(studentId).catch(() => null),
        financeApi.collections(studentId).catch(() => null),
        financeApi.studentAging(studentId).catch(() => null),
      ]);
      setStatement(s);
      setPlan(p);
      setCollections(c);
      setAging(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load finance');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Next upcoming installment (earliest unpaid by due date) for the KPI strip.
  const nextInstallment = useMemo(() => {
    const open = (plan?.charges ?? [])
      .filter((c) => Number(c.balance) > 0 && c.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    return open[0] ?? null;
  }, [plan]);

  // Derived statement of account (running ledger) from charges + payments + ledger movements.
  const ledger = useMemo(() => {
    if (!statement) return [];
    type Entry = { date: string | null; description: string; debit: number; credit: number };
    const entries: Entry[] = [];
    for (const b of statement.chargeBalances) {
      entries.push({
        date: b.charge.dueDate ?? null,
        description: b.charge.description,
        debit: Number(b.net),
        credit: 0,
      });
    }
    for (const tx of statement.transactions) {
      if (tx.status === 'REJECTED') continue;
      entries.push({
        date: null,
        description: `${t('finance.payments')} · ${tx.method}`,
        debit: 0,
        credit: Number(tx.amount),
      });
    }
    for (const a of statement.adjustments) {
      if (a.status !== 'APPLIED') continue;
      entries.push({
        date: a.createdAt,
        description: `${a.type.replace(/_/g, ' ')}${a.reason ? ` · ${a.reason}` : ''}`,
        debit: 0,
        credit: Number(a.amount),
      });
    }
    for (const r of statement.refunds) {
      entries.push({
        date: r.createdAt,
        description: `${t('finance.refunds')}${r.reason ? ` · ${r.reason}` : ''}`,
        debit: Number(r.amount),
        credit: 0,
      });
    }
    // Dated entries first (chronological), then undated; compute the running balance.
    entries.sort((a, b) => {
      if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });
    let running = 0;
    return entries.map((e) => {
      running += e.debit - e.credit;
      return { ...e, running };
    });
  }, [statement, t]);

  const schedule = useMemo(() => {
    const rows = (plan?.charges ?? []).map((c) => {
      const paid = Number(c.paid);
      const balance = Number(c.balance);
      return {
        id: c.id,
        dueDate: c.dueDate ?? null,
        amount: Number(c.amount),
        paid,
        balance,
        status: installmentStatus(paid, balance, c.dueDate),
        overdue: balance > 0 ? daysOverdue(c.dueDate) : 0,
      };
    });
    const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;
    return filtered.sort((a, b) => {
      const av = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bv = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return sortAsc ? av - bv : bv - av;
    });
  }, [plan, statusFilter, sortAsc]);

  async function submitPayment() {
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) {
      toast.error(t('finance.amountJod'));
      return;
    }
    setSubmitting(true);
    try {
      // Same flow as the Finance page: record the payment then verify so it allocates immediately.
      const isInstallment = plan?.charges.some((c) => c.id === payForm.chargeId) ?? false;
      if (isInstallment && payForm.chargeId) {
        await financeApi.payInstallment({
          studentId,
          chargeId: payForm.chargeId,
          amount,
          method: payForm.method,
          ...(payForm.reference ? { reference: payForm.reference } : {}),
        });
      } else {
        const txn = await financeApi.recordPayment({
          studentId,
          ...(payForm.chargeId ? { chargeId: payForm.chargeId } : {}),
          amount,
          method: payForm.method,
          ...(payForm.reference ? { reference: payForm.reference } : {}),
        });
        await financeApi.verify(txn.id);
      }
      toast.success(t('finance.recordPayment'));
      setPaying(false);
      setPayForm({ amount: '', method: 'CASH', reference: '', chargeId: '' });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  function exportLedgerCsv() {
    const header = [
      t('finance.date'),
      t('common.description'),
      t('finance.debit'),
      t('finance.credit'),
      t('finance.runningBalance'),
    ];
    const rows = ledger.map((e) => [
      e.date ? new Date(e.date).toISOString().slice(0, 10) : '',
      e.description,
      e.debit ? num(e.debit) : '',
      e.credit ? num(e.credit) : '',
      num(e.running),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${studentId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!statement) {
    return <EmptyState title={t('finance.noCharges')} />;
  }

  const outstanding = Number(statement.totals.outstanding);
  const overdue = Number(collections?.snapshot.overdue ?? 0);
  const credit = Number(statement.totals.creditBalance);

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{t('nav.finance')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPaying((p) => !p)}>
            {t('finance.recordPayment')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            {t('studentProfile.printStatement')}
          </Button>
          <Button size="sm" variant="outline" onClick={exportLedgerCsv}>
            {t('common.export')}
          </Button>
          <Link href={{ pathname: '/finance', query: { studentId } }}>
            <Button size="sm" variant="ghost">
              {t('studentProfile.openInFinance')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Inline Record Payment (reuses the canonical recordPayment + verify flow) */}
      {paying ? (
        <Card className="border-primary/30">
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <Field label={t('finance.amountJod')}>
              <Input
                type="number"
                step="0.001"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </Field>
            <Field label={t('finance.method')}>
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
            <Field label={t('studentProfile.allocateToCharge')}>
              <Select
                value={payForm.chargeId}
                onChange={(e) => setPayForm({ ...payForm, chargeId: e.target.value })}
              >
                <option value="">{t('studentProfile.unallocated')}</option>
                {statement.chargeBalances
                  .filter((b) => Number(b.balance) > 0)
                  .map((b) => (
                    <option key={b.charge.id} value={b.charge.id}>
                      {b.charge.description} · {num(b.balance)}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={t('finance.reference')} className="flex-1">
              <Input
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
              />
            </Field>
            <Button size="sm" onClick={() => void submitPayment()} disabled={submitting}>
              {submitting ? t('common.recording') : t('finance.pay')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPaying(false)}>
              {t('common.cancel')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Financial summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t('studentProfile.totalFees')} value={num(statement.totals.charged)} />
        <Kpi label={t('finance.paid')} value={num(statement.totals.paid)} tone="text-aqua" />
        <Kpi
          label={t('finance.outstanding')}
          value={num(statement.totals.outstanding)}
          tone={outstanding > 0 ? 'text-coral' : undefined}
          sub={
            overdue > 0 ? (
              <span className="text-destructive">
                {t('finance.overdue')} {num(overdue)}
              </span>
            ) : null
          }
        />
        <Kpi
          label={t('finance.credit')}
          value={num(statement.totals.creditBalance)}
          tone={credit > 0 ? 'text-aqua' : undefined}
        />
        <Kpi
          label={t('studentProfile.nextInstallment')}
          value={nextInstallment ? num(nextInstallment.amount) : '—'}
          sub={
            nextInstallment ? (
              <span className="text-muted-foreground">{dateStr(nextInstallment.dueDate)}</span>
            ) : null
          }
        />
        <Kpi
          label={t('studentProfile.oldestOverdue')}
          value={
            collections && collections.snapshot.oldestOverdueDays > 0
              ? `${collections.snapshot.oldestOverdueDays}d`
              : '—'
          }
          tone={
            collections && collections.snapshot.oldestOverdueDays > 0 ? 'text-coral' : undefined
          }
        />
      </div>

      {/* Fee categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.feeCategories')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>{t('studentProfile.category')}</TH>
                <TH className="text-end">{t('studentProfile.originalAmount')}</TH>
                <TH className="text-end">{t('finance.discount')}</TH>
                <TH className="text-end">{t('finance.paid')}</TH>
                <TH className="text-end">{t('finance.outstanding')}</TH>
                <TH className="w-40">{t('studentProfile.progress')}</TH>
              </TR>
            </THead>
            <TBody>
              {statement.chargeBalances.map((b) => {
                const net = Number(b.net);
                const paid = Number(b.allocated);
                const pct = net > 0 ? Math.min(100, Math.round((paid / net) * 100)) : 100;
                return (
                  <TR key={b.charge.id}>
                    <TD>
                      {b.charge.description}
                      {b.charge.dueDate ? (
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {dateStr(b.charge.dueDate)}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="text-end font-mono">{num(b.gross)}</TD>
                    <TD className="text-end font-mono">{num(b.discount)}</TD>
                    <TD className="text-end font-mono text-aqua">{num(b.allocated)}</TD>
                    <TD className="text-end font-mono">{num(b.balance)}</TD>
                    <TD>
                      <Progress pct={pct} />
                    </TD>
                  </TR>
                );
              })}
              {statement.chargeBalances.length === 0 ? (
                <TR>
                  <TD colSpan={6}>
                    <EmptyState title={t('finance.noCharges')} />
                  </TD>
                </TR>
              ) : (
                <TR className="font-medium">
                  <TD>{t('studentProfile.total')}</TD>
                  <TD className="text-end font-mono">{num(statement.totals.charged)}</TD>
                  <TD className="text-end font-mono">{num(statement.totals.discounts)}</TD>
                  <TD className="text-end font-mono text-aqua">{num(statement.totals.paid)}</TD>
                  <TD className="text-end font-mono text-coral">
                    {num(statement.totals.outstanding)}
                  </TD>
                  <TD />
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fee plan + aging */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('studentProfile.feePlan')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Detail
              label={t('studentProfile.planName')}
              value={plan ? t('finance.installmentPlan') : t('studentProfile.oneTime')}
            />
            <Detail
              label={t('studentProfile.installments')}
              value={plan ? String(plan.charges.length) : '—'}
            />
            <Detail label={t('finance.discounts')} value={num(statement.totals.discounts)} mono />
            <Detail label={t('finance.credit')} value={num(statement.totals.creditBalance)} mono />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('studentProfile.aging')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aging ? (
              <Table>
                <THead>
                  <TR>
                    <TH>{t('studentProfile.current')}</TH>
                    <TH>1–30</TH>
                    <TH>31–60</TH>
                    <TH>61–90</TH>
                    <TH>90+</TH>
                  </TR>
                </THead>
                <TBody>
                  <TR className="font-mono">
                    <TD>{num(aging.current)}</TD>
                    <TD>{num(aging.d1_30)}</TD>
                    <TD>{num(aging.d31_60)}</TD>
                    <TD className="text-coral">{num(aging.d61_90)}</TD>
                    <TD className="text-destructive">{num(aging.d90plus)}</TD>
                  </TR>
                </TBody>
              </Table>
            ) : (
              <div className="p-4">
                <EmptyState title="—" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installment schedule */}
      {plan && plan.charges.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <CardTitle>{t('studentProfile.installmentSchedule')}</CardTitle>
              <div className="flex items-end gap-2">
              <Field label={t('common.status')}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as '' | InstallmentStatus)}
                >
                  <option value="">{t('common.all')}</option>
                  {(['PAID', 'PARTIAL', 'OVERDUE', 'UPCOMING'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button size="sm" variant="ghost" onClick={() => setSortAsc((v) => !v)}>
                {t('finance.dueDate')} {sortAsc ? '↑' : '↓'}
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>{t('finance.dueDate')}</TH>
                  <TH className="text-end">{t('studentProfile.originalAmount')}</TH>
                  <TH className="text-end">{t('studentProfile.amountPaid')}</TH>
                  <TH className="text-end">{t('finance.outstanding')}</TH>
                  <TH className="text-end">{t('studentProfile.daysOverdue')}</TH>
                  <TH>{t('common.status')}</TH>
                  <TH className="text-end">{t('common.actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {schedule.map((r, i) => (
                  <TR key={r.id}>
                    <TD className="font-mono text-muted-foreground">{i + 1}</TD>
                    <TD className="whitespace-nowrap font-mono text-xs">{dateStr(r.dueDate)}</TD>
                    <TD className="text-end font-mono">{num(r.amount)}</TD>
                    <TD className="text-end font-mono text-aqua">
                      {r.paid > 0 ? num(r.paid) : '—'}
                    </TD>
                    <TD className="text-end font-mono">{num(r.balance)}</TD>
                    <TD className="text-end font-mono">
                      {r.overdue > 0 ? (
                        <span className="text-destructive">{r.overdue}</span>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD>
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    </TD>
                    <TD className="text-end">
                      {r.balance > 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPaying(true);
                            setPayForm({
                              amount: num(r.balance),
                              method: 'CASH',
                              reference: '',
                              chargeId: r.id,
                            });
                          }}
                        >
                          {t('finance.pay')}
                        </Button>
                      ) : null}
                    </TD>
                  </TR>
                ))}
                {schedule.length === 0 ? (
                  <TR>
                    <TD colSpan={8}>
                      <EmptyState title={t('finance.noCharges')} />
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.paymentHistory')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH className="text-end">{t('finance.amount')}</TH>
                <TH>{t('finance.method')}</TH>
                <TH>{t('studentProfile.receiptNo')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="text-end">{t('common.actions')}</TH>
              </TR>
            </THead>
            <TBody>
              {statement.transactions.map((tx) => (
                <TR key={tx.id}>
                  <TD className="text-end font-mono">{num(tx.amount)}</TD>
                  <TD>{tx.method}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{tx.reference ?? '—'}</TD>
                  <TD>
                    <TransactionStatusBadge status={tx.status} />
                  </TD>
                  <TD className="text-end">
                    <Button size="sm" variant="ghost" onClick={() => window.print()}>
                      {t('studentProfile.printReceipt')}
                    </Button>
                  </TD>
                </TR>
              ))}
              {statement.transactions.length === 0 ? (
                <TR>
                  <TD colSpan={5}>
                    <EmptyState title={t('finance.noPayments')} />
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Statement of account (running ledger) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('studentProfile.statementOfAccount')}</CardTitle>
            <Button size="sm" variant="ghost" onClick={exportLedgerCsv}>
              {t('common.export')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>{t('finance.date')}</TH>
                <TH>{t('common.description')}</TH>
                <TH className="text-end">{t('finance.debit')}</TH>
                <TH className="text-end">{t('finance.credit')}</TH>
                <TH className="text-end">{t('finance.runningBalance')}</TH>
              </TR>
            </THead>
            <TBody>
              {ledger.map((e, i) => (
                <TR key={i}>
                  <TD className="whitespace-nowrap font-mono text-xs">{dateStr(e.date)}</TD>
                  <TD>{e.description}</TD>
                  <TD className="text-end font-mono">{e.debit ? num(e.debit) : '—'}</TD>
                  <TD className="text-end font-mono text-aqua">{e.credit ? num(e.credit) : '—'}</TD>
                  <TD className="text-end font-mono">{num(e.running)}</TD>
                </TR>
              ))}
              {ledger.length === 0 ? (
                <TR>
                  <TD colSpan={5}>
                    <EmptyState title={t('finance.noCharges')} />
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.documents')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t('studentProfile.documentsHint')} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
  sub?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`font-display text-xl font-semibold tabular-nums ${tone ?? ''}`}>
          {value}
        </div>
        {sub ? <div className="mt-0.5 font-mono text-[11px]">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

/** Slim progress bar built from DS tokens (no progress primitive in the design system). */
function Progress({ pct }: { pct: number }) {
  const tone = pct >= 100 ? 'bg-aqua' : pct > 0 ? 'bg-primary' : 'bg-muted-foreground/30';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-end font-mono text-[11px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );
}
