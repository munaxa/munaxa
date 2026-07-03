'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { EntityPicker } from '@/components/entity-picker';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { FeeModifiedBadge } from '@/components/fee-modified-badge';
import { loadStudentOptions } from '@/lib/pickers';
import { FinanceTab } from '@/app/(app)/people/students/[studentId]/tabs/finance-tab';
import { financeApi, type CollectionsProfile, type HouseholdMember } from '@/lib/finance';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

/**
 * Finance console (school-wide): pick a student and manage their Student Financial Account via the
 * shared, hierarchical {@link FinanceTab} (Account → Charges → Plans → Installments → Payments →
 * Credits → Refunds), plus a collections banner (reminders / legal flag) and the household view.
 * All per-student logic lives in FinanceTab — this page never duplicates it (single source).
 */
export default function FinancePage() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();

  const [studentId, setStudentId] = useState('');
  const [collections, setCollections] = useState<CollectionsProfile | null>(null);
  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadMeta = useCallback(
    async (id = studentId) => {
      if (!id) return;
      setLoading(true);
      try {
        const [c, h] = await Promise.all([
          financeApi.collections(id).catch(() => null),
          financeApi.household(id).catch(() => [] as HouseholdMember[]),
        ]);
        setCollections(c);
        setHousehold(h);
      } finally {
        setLoading(false);
      }
    },
    [studentId],
  );

  // Deep link from Admissions: ?studentId=<id> opens that student's account.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('studentId');
    if (id) {
      setStudentId(id);
      void loadMeta(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await loadMeta();
      setReloadKey((k) => k + 1); // refresh the embedded FinanceTab
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const isLegal = collections?.collectionsStatus === 'LEGAL';
  const tagTone = isLegal
    ? 'danger'
    : collections?.collectionsStatus === 'FINANCIAL_ISSUE'
      ? 'warning'
      : 'success';
  const tagLabel = isLegal
    ? 'Legal Collections'
    : collections?.collectionsStatus === 'FINANCIAL_ISSUE'
      ? 'Financial Issue'
      : 'Account OK';

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
              onClick={() => router.push(`/people/students/${studentId}`)}
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
                void loadMeta(v);
                setReloadKey((k) => k + 1);
              }}
              load={loadStudentOptions}
              placeholder={t('finance.searchStudent')}
            />
          </Field>
        </div>

        {loading ? <Spinner /> : null}

        {studentId && collections ? (
          <>
            {/* Collections banner + quick actions */}
            <Card className={isLegal ? 'border-destructive/40' : ''}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Badge tone={tagTone}>{tagLabel}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Outstanding{' '}
                    <strong className="font-mono">{jod(collections.snapshot.outstanding)}</strong>
                    {Number(collections.snapshot.overdue) > 0 ? (
                      <>
                        {' · '}Overdue{' '}
                        <strong className="font-mono text-destructive">
                          {jod(collections.snapshot.overdue)}
                        </strong>
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || isLegal || !collections.snapshot.eligible}
                    onClick={() =>
                      void run(() => financeApi.remind(studentId, ['IN_APP']), 'Reminder sent')
                    }
                  >
                    Send reminder
                  </Button>
                  {isLegal ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => financeApi.setCollections(studentId, { status: 'NONE' }),
                          'Collections flag cleared',
                        )
                      }
                    >
                      Clear legal flag
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => financeApi.setCollections(studentId, { status: 'LEGAL' }),
                          'Escalated to legal',
                        )
                      }
                    >
                      Escalate to legal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* The hierarchical Student Financial Account (shared component — no duplication). */}
            <FinanceTab key={`${studentId}-${reloadKey}`} studentId={studentId} />

            {/* Household (siblings sharing a guardian) */}
            {household.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('finance.family')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Student</TH>
                        <TH>Outstanding</TH>
                        <TH> </TH>
                      </TR>
                    </THead>
                    <TBody>
                      {household.map((m) => (
                        <TR key={m.studentId}>
                          <TD>
                            {m.firstNameEn} {m.lastNameEn}
                          </TD>
                          <TD>{jod(m.outstanding)}</TD>
                          <TD>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setStudentId(m.studentId);
                                void loadMeta(m.studentId);
                                setReloadKey((k) => k + 1);
                              }}
                            >
                              Open
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </Shell>
  );
}
