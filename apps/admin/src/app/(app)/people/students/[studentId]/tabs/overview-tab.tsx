'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { studentsApi, type Student, type EnrollmentHistoryRow } from '@/lib/people';
import { financeApi, type Statement } from '@/lib/finance';
import { busApi, type StudentTransport } from '@/lib/bus';
import { enrollmentExitApi } from '@/lib/enrollment-exit';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
} from '@/components/ui';

const num = (v: string | number) => Number(v).toFixed(3);

/**
 * Overview tab: identity details plus a light, at-a-glance finance + transport snapshot.
 * Fetches only the small summaries it shows (statement totals, transport) — the heavy finance
 * workspace lives in its own lazy tab.
 */
export function OverviewTab({
  student,
  sectionLabel,
  onChanged,
}: {
  student: Student;
  sectionLabel?: string | undefined;
  onChanged?: (() => void | Promise<void>) | undefined;
}) {
  const { t } = useI18n();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [transport, setTransport] = useState<StudentTransport | null>(null);
  const [history, setHistory] = useState<EnrollmentHistoryRow[]>([]);
  const [withdrawRow, setWithdrawRow] = useState<EnrollmentHistoryRow | null>(null);

  const loadHistory = useCallback(
    () => studentsApi.enrollmentHistory(student.id).then(setHistory),
    [student.id],
  );

  useEffect(() => {
    let active = true;
    financeApi
      .statement(student.id)
      .then((s) => active && setStatement(s))
      .catch(() => undefined);
    busApi
      .studentTransport(student.id)
      .then((tr) => active && setTransport(tr))
      .catch(() => undefined);
    void loadHistory().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [student.id, loadHistory]);

  // The student's CURRENTLY-PARTICIPATING enrollment (active academic year, ACTIVE participation).
  // Only this row can be withdrawn; closed/terminal years are immutable history (Decision 12).
  const currentEnrollment = history.find(
    (r) => r.academicYear?.status === 'ACTIVE' && r.status === 'ACTIVE',
  );

  const tripLabel = transport?.tripRound
    ? transport.tripRound === 1
      ? t('fleet.trip1')
      : transport.tripRound === 2
        ? t('fleet.trip2')
        : t('transport.trip.both')
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('people.details')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Detail label={t('people.nationalId')} value={student.nationalId} mono />
          <Detail label={t('people.moeNumber')} value={student.moeStudentNumber} mono />
          <Detail label={t('people.qr')} value={student.qrCode} mono />
          <Detail label={t('common.status')} value={student.status} />
          <Detail label={t('structure.section')} value={sectionLabel ?? null} />
          <Detail
            label={t('people.gender')}
            value={student.gender ? t(`people.${student.gender.toLowerCase()}`) : null}
          />
          <Detail
            label={t('people.admitted')}
            value={student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : null}
            mono
          />
          <Detail
            label={t('fleet.route')}
            value={
              transport?.routeName
                ? tripLabel
                  ? `${transport.routeName} · ${tripLabel}`
                  : transport.routeName
                : null
            }
          />
          <Detail
            label={t('fleet.busNumber')}
            value={transport?.busNumber ?? transport?.busPlate ?? null}
          />
        </CardContent>
      </Card>

      {statement ? (
        <Card className={Number(statement.totals.outstanding) > 0 ? 'border-coral/40' : ''}>
          <CardHeader>
            <CardTitle>{t('nav.finance')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Snapshot label={t('studentProfile.totalFees')} value={num(statement.totals.charged)} />
            <Snapshot
              label={t('finance.paid')}
              value={num(statement.totals.paid)}
              tone="text-aqua"
            />
            <Snapshot
              label={t('finance.outstanding')}
              value={num(statement.totals.outstanding)}
              tone={Number(statement.totals.outstanding) > 0 ? 'text-coral' : undefined}
            />
            <Snapshot
              label={t('finance.credit')}
              value={num(statement.totals.creditBalance)}
              tone={Number(statement.totals.creditBalance) > 0 ? 'text-aqua' : undefined}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Immutable per-year Enrollment History (Decisions 12 & 13). */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.enrollmentHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('studentProfile.noEnrollments')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {row.academicYear?.name ?? '—'}
                      <span className="text-muted-foreground">
                        {row.grade ? ` · ${row.grade.nameEn}` : ''}
                        {row.section ? ` · ${row.section.name}` : ''}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {(row.graduationDate ?? row.withdrawalDate ?? row.admissionDate ?? '').slice(
                        0,
                        10,
                      )}
                      {row.reason ? ` · ${row.reason}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={statusTone(row.status)}>{row.status.toLowerCase()}</Badge>
                    {currentEnrollment && row.id === currentEnrollment.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawRow(row)}
                        className="text-destructive"
                      >
                        {t('studentProfile.withdraw')}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {withdrawRow ? (
        <WithdrawDialog
          row={withdrawRow}
          onClose={() => setWithdrawRow(null)}
          onDone={async () => {
            setWithdrawRow(null);
            await loadHistory().catch(() => undefined);
            await onChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Withdraw the student's current enrollment via the enrollment-exit endpoint (Decision 11): an
 * academic event (→ WITHDRAWN) plus a financial settlement. Nothing is deleted; the registration fee
 * and unpaid non-registration charges are settled per the two toggles.
 */
function WithdrawDialog({
  row,
  onClose,
  onDone,
}: {
  row: EnrollmentHistoryRow;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [keepRegistrationFee, setKeepRegistrationFee] = useState(true);
  const [cancelUnpaidCharges, setCancelUnpaidCharges] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await enrollmentExitApi.withdraw(row.id, {
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        cancelUnpaidCharges,
        keepRegistrationFee,
      });
      toast.success(t('studentProfile.withdrawn'));
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Withdraw failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="font-display text-lg font-semibold">{t('studentProfile.withdrawTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.academicYear?.name ?? ''}
          {row.grade ? ` · ${row.grade.nameEn}` : ''}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('studentProfile.withdrawDescription')}
        </p>

        <div className="mt-4 space-y-3">
          <Field label={t('studentProfile.withdrawReason')}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Checkbox
            label={t('studentProfile.keepRegistrationFee')}
            checked={keepRegistrationFee}
            onChange={(e) => setKeepRegistrationFee(e.target.checked)}
          />
          <Checkbox
            label={t('studentProfile.cancelUnpaidCharges')}
            checked={cancelUnpaidCharges}
            onChange={(e) => setCancelUnpaidCharges(e.target.checked)}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? t('common.saving') : t('studentProfile.withdrawConfirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Badge tone for a participation status (Active green, terminal-negative coral, else muted). */
function statusTone(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'GRADUATED':
    case 'PROMOTED':
    case 'COMPLETED':
      return 'muted';
    case 'WITHDRAWN':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'muted';
  }
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );
}

function Snapshot({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-lg font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}
