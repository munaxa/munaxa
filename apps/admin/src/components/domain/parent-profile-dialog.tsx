'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { financeApi, type HouseholdMember } from '@/lib/finance';
import { fullNameEn, type Parent, type Student } from '@/lib/people';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { RecordHeader } from './record-header';

type Child = { id: string; name: string; outstanding: string | null; isCurrent?: boolean };

/**
 * Parent profile — the "related records" drill-down opened by clicking a parent name.
 * Shows the guardian's contact details and their children with each child's outstanding
 * ("requested") amount. Children + balances come from the existing finance household endpoint
 * (siblings sharing a guardian), keyed by a known child (`contextStudent`); when no child context
 * is available (e.g. the global Parents list) the children section is omitted.
 */
export function ParentProfileDialog({
  parent,
  contextStudent,
  onClose,
  onEdit,
}: {
  parent: Parent;
  contextStudent?: Student | undefined;
  onClose: () => void;
  onEdit?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  const initials = `${parent.firstNameEn[0] ?? ''}${parent.lastNameEn[0] ?? ''}`.toUpperCase();
  const [children, setChildren] = useState<Child[] | null>(contextStudent ? null : []);

  useEffect(() => {
    if (!contextStudent) return;
    let active = true;
    void Promise.all([
      financeApi
        .statement(contextStudent.id)
        .then((s) => s.totals.outstanding)
        .catch(() => null),
      financeApi.household(contextStudent.id).catch(() => [] as HouseholdMember[]),
    ]).then(([own, siblings]) => {
      if (!active) return;
      setChildren([
        {
          id: contextStudent.id,
          name: fullNameEn(contextStudent),
          outstanding: own,
          isCurrent: true,
        },
        ...siblings.map((s) => ({
          id: s.studentId,
          name: `${s.firstNameEn} ${s.lastNameEn}`,
          outstanding: s.outstanding,
        })),
      ]);
    });
    return () => {
      active = false;
    };
  }, [contextStudent]);

  const money = (v: string | null) => (v == null ? '—' : `${Number(v).toFixed(3)} JOD`);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 bg-foreground/40" aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-2xl space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('people.parentProfile')}
      >
        <RecordHeader
          initials={initials}
          title={`${parent.firstNameEn} ${parent.lastNameEn}`}
          subtitle={
            <span dir="rtl" className="text-muted-foreground">
              {parent.firstNameAr} {parent.lastNameAr}
            </span>
          }
          badges={parent.occupation ? <Badge tone="muted">{parent.occupation}</Badge> : null}
          actions={
            <>
              {onEdit ? (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  {t('people.edit')}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
                ✕
              </Button>
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>{t('people.parentProfile')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Detail label={t('people.phone')} value={parent.phone} mono />
            <Detail label={t('people.nationalId')} value={parent.nationalId} mono />
            <Detail label={t('people.occupation')} value={parent.occupation} />
          </CardContent>
        </Card>

        {contextStudent ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('people.children')}</CardTitle>
            </CardHeader>
            <CardContent>
              {children === null ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Spinner /> {t('common.loading')}
                </div>
              ) : children.length === 0 ? (
                <EmptyState title={t('people.noStudents')} />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>{t('common.name')}</TH>
                      <TH className="text-end">{t('people.requestedAmount')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {children.map((c) => (
                      <TR key={c.id}>
                        <TD>
                          {c.name}
                          {c.isCurrent ? (
                            <Badge tone="muted" className="ms-2">
                              {t('people.primary')}
                            </Badge>
                          ) : null}
                        </TD>
                        <TD
                          className={`text-end font-mono ${
                            c.outstanding && Number(c.outstanding) > 0 ? 'text-coral' : ''
                          }`}
                        >
                          {money(c.outstanding)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null | undefined;
  mono?: boolean | undefined;
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
