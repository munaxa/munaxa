'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { studentsApi, type Student, type EnrollmentHistoryRow } from '@/lib/people';
import { financeApi, type Statement } from '@/lib/finance';
import { busApi, type StudentTransport } from '@/lib/bus';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

const num = (v: string | number) => Number(v).toFixed(3);

/**
 * Overview tab: identity details plus a light, at-a-glance finance + transport snapshot.
 * Fetches only the small summaries it shows (statement totals, transport) — the heavy finance
 * workspace lives in its own lazy tab.
 */
export function OverviewTab({
  student,
  sectionLabel,
}: {
  student: Student;
  sectionLabel?: string | undefined;
}) {
  const { t } = useI18n();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [transport, setTransport] = useState<StudentTransport | null>(null);
  const [history, setHistory] = useState<EnrollmentHistoryRow[]>([]);

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
    studentsApi
      .enrollmentHistory(student.id)
      .then((rows) => active && setHistory(rows))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [student.id]);

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
                  <Badge tone={statusTone(row.status)}>{row.status.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
