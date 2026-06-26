'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { useConfirm } from '@/components/confirm';
import { ChargeStatusBadge, TransactionStatusBadge } from '@/components/domain';
import { FeeModifiedBadge } from '@/components/fee-modified-badge';
import { loadStudentOptions } from '@/lib/pickers';
import {
  financeApi,
  type CollectionsProfile,
  type CollectionsStatus,
  type HouseholdMember,
  type InstallmentPlan,
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
  EmptyState,
} from '@/components/ui';

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

/** Preset fee categories for new charges; `OTHER` reveals a free-text description. */
const FEE_TYPES: { value: string; labelKey: string }[] = [
  { value: 'REGISTRATION', labelKey: 'finance.feeRegistration' },
  { value: 'GRADE', labelKey: 'finance.feeGrade' },
  { value: 'TRANSPORT', labelKey: 'finance.feeTransport' },
  { value: 'INSURANCE', labelKey: 'finance.feeInsurance' },
  { value: 'OTHER', labelKey: 'finance.feeOther' },
];

const COLLECTIONS: {
  value: CollectionsStatus;
  labelKey: string;
  tone: 'muted' | 'warning' | 'danger';
}[] = [
  { value: 'NONE', labelKey: 'finance.noFlag', tone: 'muted' },
  { value: 'FINANCIAL_ISSUE', labelKey: 'finance.financialIssue', tone: 'warning' },
  { value: 'LEGAL', labelKey: 'finance.legal', tone: 'danger' },
];

export default function FinancePage() {
  const toast = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const confirm = useConfirm();
  const [studentId, setStudentId] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [collections, setCollections] = useState<CollectionsProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState({
    feeType: 'REGISTRATION',
    description: '',
    amount: '',
    dueDate: '',
  });
  const [refund, setRefund] = useState({ amount: '', reason: '' });
  const [legalNote, setLegalNote] = useState('');
  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [installPlan, setInstallPlan] = useState<InstallmentPlan | null>(null);
  const [plan, setPlan] = useState({
    description: '',
    totalAmount: '',
    months: '10',
    firstDueDate: '',
  });
  const [rowAction, setRowAction] = useState<{
    id: string;
    kind: 'discount' | 'credit' | 'pay';
  } | null>(null);
  const [rowForm, setRowForm] = useState({ amount: '', percent: '', reason: '', method: 'CASH' });

  const load = useCallback(
    async (id = studentId) => {
      if (!id) return;
      setLoading(true);
      try {
        const [s, c, h, p] = await Promise.all([
          financeApi.statement(id),
          financeApi.collections(id),
          financeApi.household(id).catch(() => [] as HouseholdMember[]),
          financeApi.installmentPlan(id).catch(() => null),
        ]);
        setStatement(s);
        setCollections(c);
        setLegalNote(c.legalNote ?? '');
        setHousehold(h);
        setInstallPlan(p);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [studentId, toast],
  );

  // Open the full-page Student Profile (shared across modules) for this student.
  const openProfile = useCallback(
    (id: string) => {
      if (id) router.push(`/people/students/${id}`);
    },
    [router],
  );

  // Deep link from Admissions: ?studentId=<id> opens that student's statement to collect fees.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('studentId');
    if (id) {
      setStudentId(id);
      void load(id);
    }
    // Run once on mount; `load` is stable enough for this deep-link entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  /** Verify a payment, then offer to email the parent that it settled. */
  async function verifyPayment(txId: string) {
    try {
      await financeApi.verify(txId);
      toast.success(t('finance.verified'));
      if (
        await confirm({
          title: t('finance.notifyParentTitle'),
          description: t('finance.notifyParentPrompt'),
          confirmLabel: t('finance.notifyParent'),
          destructive: false,
        })
      ) {
        try {
          await financeApi.notifyParent(txId);
          toast.success(t('finance.parentNotified'));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Notify failed');
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      await load();
    }
  }

  async function submitRowAction() {
    if (!rowAction) return;
    const { id, kind } = rowAction;
    const amount = rowForm.amount ? Number(rowForm.amount) : undefined;
    const percent = rowForm.percent ? Number(rowForm.percent) : undefined;
    if (kind === 'pay') {
      const isInstallment = installPlan?.charges.some((c) => c.id === id) ?? false;
      await run(async () => {
        if (isInstallment) {
          // Installment payment rebalances the remaining installments to keep the plan total.
          await financeApi.payInstallment({
            studentId,
            chargeId: id,
            amount: amount ?? 0,
            method: rowForm.method || 'CASH',
            ...(rowForm.reason ? { reference: rowForm.reason } : {}),
          });
        } else {
          // Record the payment against the charge and verify it so it allocates immediately.
          const txn = await financeApi.recordPayment({
            studentId,
            chargeId: id,
            amount: amount ?? 0,
            method: rowForm.method || 'CASH',
            ...(rowForm.reason ? { reference: rowForm.reason } : {}),
          });
          await financeApi.verify(txn.id);
        }
      }, 'Payment recorded');
    } else if (kind === 'discount') {
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
      // Credit note = an account-level credit memo via the finance ledger. This is intentionally
      // NOT the e-invoicing (JoFotara) credit document, so it works without that module enabled.
      await run(
        () =>
          financeApi.applyAdjustment({
            studentId,
            chargeId: id,
            type: 'CREDIT_MEMO',
            amount: amount ?? 0,
            reason: rowForm.reason || 'Credit note',
          }),
        'Credit note issued',
      );
    }
    setRowAction(null);
    setRowForm({ amount: '', percent: '', reason: '', method: 'CASH' });
  }

  const tag =
    COLLECTIONS.find((c) => c.value === collections?.collectionsStatus) ?? COLLECTIONS[0]!;
  const isLegal = collections?.collectionsStatus === 'LEGAL';

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{t('nav.finance')}</h1>
          {collections ? (
            <FeeModifiedBadge
              feeModified={collections.feeModified}
              customArrangement={collections.customArrangement}
            />
          ) : null}
          {studentId ? (
            <Button
              variant="outline"
              size="sm"
              className="ms-auto"
              onClick={() => openProfile(studentId)}
            >
              {t('finance.viewProfile')}
            </Button>
          ) : null}
        </div>

        <div className="flex items-end gap-2">
          <Field label={t('finance.student')} className="flex-1">
            <EntityPicker
              value={studentId}
              onChange={(v) => {
                setStudentId(v);
                void load(v);
              }}
              load={loadStudentOptions}
              placeholder={t('finance.searchStudent')}
            />
          </Field>
          <Button onClick={() => void load()}>{t('common.load')}</Button>
        </div>

        {loading ? <Spinner /> : null}

        {statement && collections ? (
          <>
            {/* Collections banner */}
            <Card className={isLegal ? 'border-destructive/40' : ''}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge tone={tag.tone}>{t(tag.labelKey)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {t('finance.outstanding')}{' '}
                      <strong className="font-mono">{jod(collections.snapshot.outstanding)}</strong>
                      {Number(collections.snapshot.overdue) > 0 ? (
                        <>
                          {' · '}
                          {t('finance.overdue')}{' '}
                          <strong className="font-mono text-destructive">
                            {jod(collections.snapshot.overdue)}
                          </strong>
                        </>
                      ) : null}
                      {Number(collections.snapshot.dueThisMonth) > 0 ? (
                        <>
                          {' · '}
                          {t('finance.thisMonth')}{' '}
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
                      {t('finance.remindApp')}
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
                      {t('finance.remindAppSms')}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label={t('finance.collectionsFlag')}>
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
                          {t(c.labelKey)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('finance.legalNote')} className="flex-1">
                    <Input
                      value={legalNote}
                      placeholder={t('finance.legalNotePlaceholder')}
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
                    {t('finance.saveNote')}
                  </Button>
                </div>
                {collections.lastReminderAt ? (
                  <p className="text-xs text-muted-foreground">
                    {t('finance.lastReminder')}:{' '}
                    {new Date(collections.lastReminderAt).toLocaleString()} ·{' '}
                    {collections.reminders.length} {t('finance.sentSuffix')}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ['finance.charged', statement.totals.charged, ''],
                  ['finance.paid', statement.totals.paid, 'text-aqua'],
                  ['finance.discounts', statement.totals.discounts, ''],
                  ['finance.outstanding', statement.totals.outstanding, 'text-coral'],
                  ['finance.credit', statement.totals.creditBalance, 'text-aqua'],
                  ['finance.refunded', statement.totals.refunded, ''],
                ] as const
              ).map(([labelKey, value, cls]) => (
                <Card key={labelKey}>
                  <CardContent className="p-4">
                    <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t(labelKey)}
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
                <CardTitle>{t('finance.charges')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <THead>
                    <TR>
                      <TH>{t('common.description')}</TH>
                      <TH className="text-end">{t('finance.gross')}</TH>
                      <TH className="text-end">{t('finance.discount')}</TH>
                      <TH className="text-end">{t('finance.net')}</TH>
                      <TH className="text-end">{t('finance.balance')}</TH>
                      <TH>{t('common.status')}</TH>
                      <TH className="text-end">{t('common.actions')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {statement.chargeBalances.map((b) => (
                      <TR key={b.charge.id}>
                        <TD>
                          {b.charge.description}
                          {b.charge.dueDate ? (
                            <span className="block font-mono text-[11px] text-muted-foreground">
                              {t('finance.dueSuffix')}{' '}
                              {new Date(b.charge.dueDate).toLocaleDateString()}
                            </span>
                          ) : null}
                        </TD>
                        <TD className="text-end font-mono">{Number(b.gross).toFixed(3)}</TD>
                        <TD className="text-end font-mono">{Number(b.discount).toFixed(3)}</TD>
                        <TD className="text-end font-mono">{Number(b.net).toFixed(3)}</TD>
                        <TD className="text-end font-mono">{Number(b.balance).toFixed(3)}</TD>
                        <TD>
                          <ChargeStatusBadge status={b.charge.status} />
                        </TD>
                        <TD className="text-end">
                          <span className="flex justify-end gap-1">
                            {Number(b.balance) > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setRowAction({ id: b.charge.id, kind: 'pay' });
                                  setRowForm({
                                    amount: Number(b.balance).toFixed(3),
                                    percent: '',
                                    reason: '',
                                    method: 'CASH',
                                  });
                                }}
                              >
                                {t('finance.pay')}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRowAction({ id: b.charge.id, kind: 'discount' });
                                setRowForm({ amount: '', percent: '', reason: '', method: 'CASH' });
                              }}
                            >
                              {t('finance.discount')}
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
                              {t('finance.eInvoice')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRowAction({ id: b.charge.id, kind: 'credit' });
                                setRowForm({ amount: '', percent: '', reason: '', method: 'CASH' });
                              }}
                            >
                              {t('finance.credit')}
                            </Button>
                          </span>
                        </TD>
                      </TR>
                    ))}
                    {statement.chargeBalances.length === 0 ? (
                      <TR>
                        <TD colSpan={7}>
                          <EmptyState title={t('finance.noCharges')} />
                        </TD>
                      </TR>
                    ) : null}
                  </TBody>
                </Table>

                {rowAction ? (
                  <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
                    <span className="font-mono text-xs uppercase text-muted-foreground">
                      {rowAction.kind === 'discount'
                        ? t('finance.applyDiscount')
                        : rowAction.kind === 'pay'
                          ? t('finance.recordPayment')
                          : t('finance.creditNote')}
                    </span>
                    <Field label={t('finance.amountJod')}>
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
                      <Field label={t('finance.orPercent')}>
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
                    {rowAction.kind === 'pay' ? (
                      <Field label={t('finance.method')}>
                        <Select
                          value={rowForm.method}
                          onChange={(e) => setRowForm({ ...rowForm, method: e.target.value })}
                        >
                          {['CASH', 'CLIQ', 'EWALLET', 'BANK_TRANSFER'].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    <Field
                      label={rowAction.kind === 'pay' ? t('finance.reference') : t('common.reason')}
                      className="flex-1"
                    >
                      <Input
                        value={rowForm.reason}
                        onChange={(e) => setRowForm({ ...rowForm, reason: e.target.value })}
                      />
                    </Field>
                    <Button size="sm" onClick={() => void submitRowAction()}>
                      {rowAction.kind === 'pay' ? t('finance.pay') : t('finance.apply')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRowAction(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : null}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const preset = FEE_TYPES.find((f) => f.value === charge.feeType);
                    const description =
                      charge.feeType === 'OTHER'
                        ? charge.description
                        : preset
                          ? t(preset.labelKey)
                          : charge.description;
                    void run(
                      () =>
                        financeApi.createCharge({
                          studentId,
                          description,
                          amount: Number(charge.amount),
                          ...(charge.dueDate ? { dueDate: charge.dueDate } : {}),
                        }),
                      'Charge added',
                    ).then(() =>
                      setCharge({
                        feeType: 'REGISTRATION',
                        description: '',
                        amount: '',
                        dueDate: '',
                      }),
                    );
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <Field label={t('finance.feeType')}>
                    <Select
                      value={charge.feeType}
                      onChange={(e) => setCharge({ ...charge, feeType: e.target.value })}
                    >
                      {FEE_TYPES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {t(f.labelKey)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {charge.feeType === 'OTHER' ? (
                    <Field label={t('finance.newCharge')} className="flex-1">
                      <Input
                        placeholder={t('finance.tuitionPlaceholder')}
                        value={charge.description}
                        onChange={(e) => setCharge({ ...charge, description: e.target.value })}
                        required
                      />
                    </Field>
                  ) : null}
                  <Field label={t('finance.amountJod')}>
                    <Input
                      type="number"
                      step="0.001"
                      value={charge.amount}
                      onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label={t('finance.dueDate')}>
                    <Input
                      type="date"
                      value={charge.dueDate}
                      onChange={(e) => setCharge({ ...charge, dueDate: e.target.value })}
                    />
                  </Field>
                  <Button type="submit">{t('finance.addCharge')}</Button>
                </form>

                {/* Installment plan — split an amount across monthly payments */}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-sm font-medium">{t('finance.installmentPlan')}</p>
                  {installPlan ? (
                    <div className="space-y-2">
                      <Table>
                        <THead>
                          <TR>
                            <TH>{t('finance.dueDate')}</TH>
                            <TH>{t('common.description')}</TH>
                            <TH className="text-end">{t('finance.scheduled')}</TH>
                            <TH className="text-end">{t('finance.paid')}</TH>
                            <TH className="text-end">{t('finance.balance')}</TH>
                            <TH>{t('common.status')}</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {installPlan.charges.map((c) => (
                            <TR key={c.id}>
                              <TD className="whitespace-nowrap font-mono text-xs">
                                {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : '—'}
                              </TD>
                              <TD>{c.description}</TD>
                              <TD className="text-end font-mono">{Number(c.amount).toFixed(3)}</TD>
                              <TD className="text-end font-mono text-aqua">
                                {Number(c.paid) > 0 ? Number(c.paid).toFixed(3) : '—'}
                              </TD>
                              <TD className="text-end font-mono">{Number(c.balance).toFixed(3)}</TD>
                              <TD>
                                <ChargeStatusBadge status={c.status} />
                              </TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {t('finance.outstanding')}:{' '}
                          {installPlan.charges
                            .reduce((s, c) => s + Number(c.balance), 0)
                            .toFixed(3)}{' '}
                          JOD
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            void confirm({ description: t('finance.deletePlanConfirm') }).then(
                              (ok) => {
                                if (ok)
                                  void run(
                                    () => financeApi.deleteInstallmentPlan(studentId),
                                    t('finance.planDeleted'),
                                  );
                              },
                            )
                          }
                        >
                          {t('finance.deletePlan')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(
                            () =>
                              financeApi.createInstallments({
                                studentId,
                                description: plan.description || t('finance.installmentDefault'),
                                totalAmount: Number(plan.totalAmount),
                                months: Number(plan.months),
                                firstDueDate: plan.firstDueDate,
                              }),
                            t('finance.installmentsCreated'),
                          ).then(() =>
                            setPlan({
                              description: '',
                              totalAmount: '',
                              months: '10',
                              firstDueDate: '',
                            }),
                          );
                        }}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <Field label={t('finance.newCharge')} className="flex-1">
                          <Input
                            placeholder={t('finance.installmentDefault')}
                            value={plan.description}
                            onChange={(e) => setPlan({ ...plan, description: e.target.value })}
                          />
                        </Field>
                        <Field label={t('finance.totalAmountJod')}>
                          <Input
                            type="number"
                            step="0.001"
                            className="w-28"
                            value={plan.totalAmount}
                            onChange={(e) => setPlan({ ...plan, totalAmount: e.target.value })}
                            required
                          />
                        </Field>
                        <Field label={t('finance.months')}>
                          <Input
                            type="number"
                            min="2"
                            max="60"
                            className="w-20"
                            value={plan.months}
                            onChange={(e) => setPlan({ ...plan, months: e.target.value })}
                            required
                          />
                        </Field>
                        <Field label={t('finance.firstDueDate')}>
                          <Input
                            type="date"
                            value={plan.firstDueDate}
                            onChange={(e) => setPlan({ ...plan, firstDueDate: e.target.value })}
                            required
                          />
                        </Field>
                        <Button type="submit" variant="secondary">
                          {t('finance.createPlan')}
                        </Button>
                      </form>
                      {plan.totalAmount && Number(plan.months) > 0 ? (
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          {Number(plan.months)} ×{' '}
                          {(Number(plan.totalAmount) / Number(plan.months)).toFixed(3)} JOD
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Family — siblings & their balances */}
            {household.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('finance.family')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <THead>
                      <TR>
                        <TH>{t('common.name')}</TH>
                        <TH className="text-end">{t('finance.outstanding')}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {household.map((m) => (
                        <TR key={m.studentId}>
                          <TD>
                            <button
                              type="button"
                              className="text-start font-medium text-foreground hover:text-primary hover:underline"
                              onClick={() => openProfile(m.studentId)}
                            >
                              {m.firstNameEn} {m.lastNameEn}
                            </button>
                            <span className="block text-xs text-muted-foreground" dir="rtl">
                              {m.firstNameAr} {m.lastNameAr}
                            </span>
                          </TD>
                          <TD
                            className={`text-end font-mono ${
                              Number(m.outstanding) > 0 ? 'text-coral' : 'text-muted-foreground'
                            }`}
                          >
                            {jod(m.outstanding)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Deductions */}
            {statement.adjustments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('finance.deductions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{t('common.type')}</TH>
                        <TH>{t('common.reason')}</TH>
                        <TH className="text-end">{t('common.amount')}</TH>
                        <TH>{t('common.status')}</TH>
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
                                {t('finance.reverse')}
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
                <CardTitle>{t('finance.payments')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH className="text-end">{t('common.amount')}</TH>
                      <TH>{t('finance.method')}</TH>
                      <TH>{t('common.status')}</TH>
                      <TH className="text-end">{t('common.actions')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {statement.transactions.map((tx) => (
                      <TR key={tx.id}>
                        <TD className="text-end font-mono">{Number(tx.amount).toFixed(3)}</TD>
                        <TD>{tx.method}</TD>
                        <TD>
                          <TransactionStatusBadge status={tx.status} />
                        </TD>
                        <TD className="text-end">
                          {tx.status === 'PENDING' ? (
                            <span className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void verifyPayment(tx.id)}
                              >
                                {t('finance.verify')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => void run(() => financeApi.reject(tx.id), 'Rejected')}
                              >
                                {t('finance.reject')}
                              </Button>
                            </span>
                          ) : tx.status === 'VERIFIED' ? (
                            tx.parentNotifiedAt ? (
                              <Badge tone="success">{t('finance.parentNotified')}</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  void run(
                                    () => financeApi.notifyParent(tx.id),
                                    t('finance.parentNotified'),
                                  )
                                }
                              >
                                {t('finance.notifyParent')}
                              </Button>
                            )
                          ) : null}
                        </TD>
                      </TR>
                    ))}
                    {statement.transactions.length === 0 ? (
                      <TR>
                        <TD colSpan={4}>
                          <EmptyState title={t('finance.noPayments')} />
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
                  {t('finance.refunds')}{' '}
                  <span className="text-sm text-muted-foreground">
                    · {t('finance.creditLabel')} {jod(statement.totals.creditBalance)}
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
                  <Field label={t('finance.refundAmountJod')}>
                    <Input
                      type="number"
                      step="0.001"
                      value={refund.amount}
                      onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label={t('common.reason')} className="flex-1">
                    <Input
                      value={refund.reason}
                      onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
                    />
                  </Field>
                  <Button type="submit" disabled={Number(statement.totals.creditBalance) <= 0}>
                    {t('finance.requestRefund')}
                  </Button>
                </form>
                {statement.refunds.length > 0 ? (
                  <Table>
                    <THead>
                      <TR>
                        <TH className="text-end">{t('common.amount')}</TH>
                        <TH>{t('common.reason')}</TH>
                        <TH>{t('common.status')}</TH>
                        <TH className="text-end" />
                      </TR>
                    </THead>
                    <TBody>
                      {statement.refunds.map((r) => (
                        <TR key={r.id}>
                          <TD className="text-end font-mono">{Number(r.amount).toFixed(3)}</TD>
                          <TD className="text-muted-foreground">{r.reason}</TD>
                          <TD>
                            <TransactionStatusBadge status={r.status} />
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
                                {t('finance.verify')}
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
