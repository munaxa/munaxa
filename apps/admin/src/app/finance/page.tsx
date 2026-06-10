'use client';

import { useCallback, useState } from 'react';
import { Shell } from '@/components/shell';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { loadStudentOptions } from '@/lib/pickers';
import {
  financeApi,
  type CollectionsProfile,
  type CollectionsStatus,
  type Statement,
} from '@/lib/finance';
import { einvoicingApi } from '@/lib/einvoicing';
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
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

const CHARGE_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'default'> = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'default',
  WAIVED: 'muted',
  CANCELLED: 'muted',
};
const TXN_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
};
const COLLECTIONS: {
  value: CollectionsStatus;
  label: string;
  tone: 'muted' | 'warning' | 'danger';
}[] = [
  { value: 'NONE', label: 'No flag', tone: 'muted' },
  { value: 'FINANCIAL_ISSUE', label: 'Financial issue', tone: 'warning' },
  { value: 'LEGAL', label: 'Contact lawyer (legal)', tone: 'danger' },
];

export default function FinancePage() {
  const toast = useToast();
  const { t } = useI18n();
  const [studentId, setStudentId] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [collections, setCollections] = useState<CollectionsProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState({ description: '', amount: '', dueDate: '' });
  const [refund, setRefund] = useState({ amount: '', reason: '' });
  const [legalNote, setLegalNote] = useState('');
  const [rowAction, setRowAction] = useState<{ id: string; kind: 'discount' | 'credit' } | null>(
    null,
  );
  const [rowForm, setRowForm] = useState({ amount: '', percent: '', reason: '' });

  const load = useCallback(
    async (id = studentId) => {
      if (!id) return;
      setLoading(true);
      try {
        const [s, c] = await Promise.all([financeApi.statement(id), financeApi.collections(id)]);
        setStatement(s);
        setCollections(c);
        setLegalNote(c.legalNote ?? '');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [studentId, toast],
  );

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  async function submitRowAction() {
    if (!rowAction) return;
    const { id, kind } = rowAction;
    const amount = rowForm.amount ? Number(rowForm.amount) : undefined;
    const percent = rowForm.percent ? Number(rowForm.percent) : undefined;
    if (kind === 'discount') {
      const base = {
        studentId,
        chargeId: id,
        type: 'DISCOUNT',
        reason: rowForm.reason || 'Discount',
      };
      await run(
        () =>
          financeApi.applyAdjustment(
            percent !== undefined ? { ...base, percent } : { ...base, amount: amount ?? 0 },
          ),
        'Discount applied',
      );
    } else {
      await run(
        () => einvoicingApi.creditFromCharge(id, amount ?? 0, rowForm.reason || 'Credit note'),
        'Credit note issued',
      );
    }
    setRowAction(null);
    setRowForm({ amount: '', percent: '', reason: '' });
  }

  const tag =
    COLLECTIONS.find((c) => c.value === collections?.collectionsStatus) ?? COLLECTIONS[0]!;
  const isLegal = collections?.collectionsStatus === 'LEGAL';

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.finance')}</h1>

        <div className="flex items-end gap-2">
          <Field label="Student" className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={(v) => {
                setStudentId(v);
                void load(v);
              }}
              load={loadStudentOptions}
              placeholder="Search by student / father / family name…"
            />
          </Field>
          <Button onClick={() => void load()}>Load</Button>
        </div>

        {loading ? <Spinner /> : null}

        {statement && collections ? (
          <>
            {/* Collections banner */}
            <Card className={isLegal ? 'border-destructive/40' : ''}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge tone={tag.tone}>{tag.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Outstanding{' '}
                      <strong className="font-mono">{jod(collections.snapshot.outstanding)}</strong>
                      {Number(collections.snapshot.overdue) > 0 ? (
                        <>
                          {' · '}overdue{' '}
                          <strong className="font-mono text-destructive">
                            {jod(collections.snapshot.overdue)}
                          </strong>
                        </>
                      ) : null}
                      {Number(collections.snapshot.dueThisMonth) > 0 ? (
                        <>
                          {' · '}this month{' '}
                          <strong className="font-mono text-coral">
                            {jod(collections.snapshot.dueThisMonth)}
                          </strong>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLegal || !collections.snapshot.eligible}
                      onClick={() =>
                        void run(
                          () => financeApi.remind(studentId, ['IN_APP']),
                          'Reminder sent (in-app)',
                        )
                      }
                    >
                      Remind (app)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLegal || !collections.snapshot.eligible}
                      onClick={() =>
                        void run(
                          () => financeApi.remind(studentId, ['IN_APP', 'SMS']),
                          'Reminder sent (app + SMS)',
                        )
                      }
                    >
                      Remind (app + SMS)
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Collections flag">
                    <Select
                      value={collections.collectionsStatus}
                      onChange={(e) =>
                        void run(
                          () =>
                            financeApi.setCollections(studentId, {
                              status: e.target.value as CollectionsStatus,
                              note: legalNote,
                            }),
                          'Collections flag updated',
                        )
                      }
                    >
                      {COLLECTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Legal / collections note" className="flex-1">
                    <Input
                      value={legalNote}
                      placeholder="Lawyer contact, case reference…"
                      onChange={(e) => setLegalNote(e.target.value)}
                    />
                  </Field>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void run(
                        () =>
                          financeApi.setCollections(studentId, {
                            status: collections.collectionsStatus,
                            note: legalNote,
                          }),
                        'Note saved',
                      )
                    }
                  >
                    Save note
                  </Button>
                </div>
                {collections.lastReminderAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last reminder: {new Date(collections.lastReminderAt).toLocaleString()} ·{' '}
                    {collections.reminders.length} sent
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ['Charged', statement.totals.charged, ''],
                  ['Paid', statement.totals.paid, 'text-aqua'],
                  ['Discounts', statement.totals.discounts, ''],
                  ['Outstanding', statement.totals.outstanding, 'text-coral'],
                  ['Credit', statement.totals.creditBalance, 'text-aqua'],
                  ['Refunded', statement.totals.refunded, ''],
                ] as const
              ).map(([label, value, cls]) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </div>
                    <div className={`font-display text-xl font-semibold ${cls}`}>
                      {Number(value).toFixed(3)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charges with per-charge balances + actions */}
            <Card>
              <CardHeader>
                <CardTitle>Charges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <THead>
                    <TR>
                      <TH>Description</TH>
                      <TH className="text-end">Gross</TH>
                      <TH className="text-end">Discount</TH>
                      <TH className="text-end">Net</TH>
                      <TH className="text-end">Balance</TH>
                      <TH>Status</TH>
                      <TH className="text-end">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {statement.chargeBalances.map((b) => (
                      <TR key={b.charge.id}>
                        <TD>
                          {b.charge.description}
                          {b.charge.dueDate ? (
                            <span className="block font-mono text-[11px] text-muted-foreground">
                              due {new Date(b.charge.dueDate).toLocaleDateString()}
                            </span>
                          ) : null}
                        </TD>
                        <TD className="text-end font-mono">{Number(b.gross).toFixed(3)}</TD>
                        <TD className="text-end font-mono">{Number(b.discount).toFixed(3)}</TD>
                        <TD className="text-end font-mono">{Number(b.net).toFixed(3)}</TD>
                        <TD className="text-end font-mono">{Number(b.balance).toFixed(3)}</TD>
                        <TD>
                          <Badge tone={CHARGE_TONE[b.charge.status] ?? 'default'}>
                            {b.charge.status}
                          </Badge>
                        </TD>
                        <TD className="text-end">
                          <span className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRowAction({ id: b.charge.id, kind: 'discount' });
                                setRowForm({ amount: '', percent: '', reason: '' });
                              }}
                            >
                              Discount
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void run(
                                  () => einvoicingApi.issueFromCharge(b.charge.id),
                                  'E-invoice issued',
                                )
                              }
                            >
                              e-Invoice
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRowAction({ id: b.charge.id, kind: 'credit' });
                                setRowForm({ amount: '', percent: '', reason: '' });
                              }}
                            >
                              Credit
                            </Button>
                          </span>
                        </TD>
                      </TR>
                    ))}
                    {statement.chargeBalances.length === 0 ? (
                      <TR>
                        <TD colSpan={7} className="text-muted-foreground">
                          No charges.
                        </TD>
                      </TR>
                    ) : null}
                  </TBody>
                </Table>

                {rowAction ? (
                  <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
                    <span className="font-mono text-xs uppercase text-muted-foreground">
                      {rowAction.kind === 'discount' ? 'Apply discount' : 'Credit note'}
                    </span>
                    <Field label="Amount (JOD)">
                      <Input
                        type="number"
                        step="0.001"
                        value={rowForm.amount}
                        onChange={(e) =>
                          setRowForm({ ...rowForm, amount: e.target.value, percent: '' })
                        }
                      />
                    </Field>
                    {rowAction.kind === 'discount' ? (
                      <Field label="or Percent">
                        <Input
                          type="number"
                          step="0.01"
                          value={rowForm.percent}
                          onChange={(e) =>
                            setRowForm({ ...rowForm, percent: e.target.value, amount: '' })
                          }
                        />
                      </Field>
                    ) : null}
                    <Field label="Reason" className="flex-1">
                      <Input
                        value={rowForm.reason}
                        onChange={(e) => setRowForm({ ...rowForm, reason: e.target.value })}
                      />
                    </Field>
                    <Button size="sm" onClick={() => void submitRowAction()}>
                      Apply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRowAction(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : null}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      () =>
                        financeApi.createCharge({
                          studentId,
                          description: charge.description,
                          amount: Number(charge.amount),
                          ...(charge.dueDate ? { dueDate: charge.dueDate } : {}),
                        }),
                      'Charge added',
                    ).then(() => setCharge({ description: '', amount: '', dueDate: '' }));
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <Field label="New charge" className="flex-1">
                    <Input
                      placeholder="Tuition — Term 1"
                      value={charge.description}
                      onChange={(e) => setCharge({ ...charge, description: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Amount (JOD)">
                    <Input
                      type="number"
                      step="0.001"
                      value={charge.amount}
                      onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Due date">
                    <Input
                      type="date"
                      value={charge.dueDate}
                      onChange={(e) => setCharge({ ...charge, dueDate: e.target.value })}
                    />
                  </Field>
                  <Button type="submit">Add charge</Button>
                </form>
              </CardContent>
            </Card>

            {/* Deductions */}
            {statement.adjustments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Type</TH>
                        <TH>Reason</TH>
                        <TH className="text-end">Amount</TH>
                        <TH>Status</TH>
                        <TH className="text-end" />
                      </TR>
                    </THead>
                    <TBody>
                      {statement.adjustments.map((a) => (
                        <TR key={a.id}>
                          <TD>{a.type.replace(/_/g, ' ')}</TD>
                          <TD className="text-muted-foreground">{a.reason}</TD>
                          <TD className="text-end font-mono">{Number(a.amount).toFixed(3)}</TD>
                          <TD>
                            <Badge tone={a.status === 'APPLIED' ? 'success' : 'muted'}>
                              {a.status}
                            </Badge>
                          </TD>
                          <TD className="text-end">
                            {a.status === 'APPLIED' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  void run(() => financeApi.reverseAdjustment(a.id), 'Reversed')
                                }
                              >
                                Reverse
                              </Button>
                            ) : null}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH className="text-end">Amount</TH>
                      <TH>Method</TH>
                      <TH>Status</TH>
                      <TH className="text-end">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {statement.transactions.map((tx) => (
                      <TR key={tx.id}>
                        <TD className="text-end font-mono">{Number(tx.amount).toFixed(3)}</TD>
                        <TD>{tx.method}</TD>
                        <TD>
                          <Badge tone={TXN_TONE[tx.status] ?? 'muted'}>{tx.status}</Badge>
                        </TD>
                        <TD className="text-end">
                          {tx.status === 'PENDING' ? (
                            <span className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void run(() => financeApi.verify(tx.id), 'Verified')}
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => void run(() => financeApi.reject(tx.id), 'Rejected')}
                              >
                                Reject
                              </Button>
                            </span>
                          ) : null}
                        </TD>
                      </TR>
                    ))}
                    {statement.transactions.length === 0 ? (
                      <TR>
                        <TD colSpan={4} className="text-muted-foreground">
                          No payments.
                        </TD>
                      </TR>
                    ) : null}
                  </TBody>
                </Table>
              </CardContent>
            </Card>

            {/* Refunds */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Refunds{' '}
                  <span className="text-sm text-muted-foreground">
                    · credit {jod(statement.totals.creditBalance)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      () =>
                        financeApi.createRefund({
                          studentId,
                          amount: Number(refund.amount),
                          method: 'CASH',
                          reason: refund.reason || 'Refund',
                        }),
                      'Refund requested',
                    ).then(() => setRefund({ amount: '', reason: '' }));
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <Field label="Refund amount (JOD)">
                    <Input
                      type="number"
                      step="0.001"
                      value={refund.amount}
                      onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Reason" className="flex-1">
                    <Input
                      value={refund.reason}
                      onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
                    />
                  </Field>
                  <Button type="submit" disabled={Number(statement.totals.creditBalance) <= 0}>
                    Request refund
                  </Button>
                </form>
                {statement.refunds.length > 0 ? (
                  <Table>
                    <THead>
                      <TR>
                        <TH className="text-end">Amount</TH>
                        <TH>Reason</TH>
                        <TH>Status</TH>
                        <TH className="text-end" />
                      </TR>
                    </THead>
                    <TBody>
                      {statement.refunds.map((r) => (
                        <TR key={r.id}>
                          <TD className="text-end font-mono">{Number(r.amount).toFixed(3)}</TD>
                          <TD className="text-muted-foreground">{r.reason}</TD>
                          <TD>
                            <Badge tone={TXN_TONE[r.status] ?? 'muted'}>{r.status}</Badge>
                          </TD>
                          <TD className="text-end">
                            {r.status === 'PENDING' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  void run(() => financeApi.verifyRefund(r.id), 'Refund verified')
                                }
                              >
                                Verify
                              </Button>
                            ) : null}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
