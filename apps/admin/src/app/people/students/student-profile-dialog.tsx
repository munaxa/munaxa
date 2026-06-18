'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm';
import { EntityPicker } from '@/components/entity-picker';
import { loadParentOptions } from '@/lib/pickers';
import {
  fullNameAr,
  fullNameEn,
  studentsApi,
  type Parent,
  type Student,
  type StudentParentLink,
  type StudentVaccine,
} from '@/lib/people';
import { financeApi, type Statement } from '@/lib/finance';
import { ParentEditDialog } from './parent-edit-dialog';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
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
import { ChargeStatusBadge, TransactionStatusBadge } from '@/components/domain';

const PARENT_RELATIONS = ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'];

const money = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

/**
 * Read-only student profile shown in a modal when a student name is clicked on the Students list.
 * Surfaces identity details, government vaccines, and the full financial statement for the student.
 */
export function StudentProfileDialog({
  student,
  sectionLabel,
  onClose,
  onEdit,
}: {
  student: Student;
  sectionLabel?: string | undefined;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [vaccines, setVaccines] = useState<StudentVaccine[]>([]);
  const [parents, setParents] = useState<StudentParentLink[]>([]);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadParents() {
    studentsApi
      .parents(student.id)
      .then(setParents)
      .catch(() => undefined);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      financeApi.statement(student.id).catch(() => null),
      studentsApi.vaccines(student.id).catch(() => [] as StudentVaccine[]),
      studentsApi.parents(student.id).catch(() => [] as StudentParentLink[]),
    ])
      .then(([s, v, p]) => {
        if (!active) return;
        setStatement(s);
        setVaccines(v);
        setParents(p);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [student.id]);

  const initials = `${student.firstNameEn[0] ?? ''}${student.lastNameEn[0] ?? ''}`.toUpperCase();
  const [tab, setTab] = useState('overview');

  return (
    <div className="fixed inset-0 z-modal flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} aria-hidden="true" />
      <div
        className="relative my-8 w-full max-w-3xl space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
        role="dialog"
        aria-modal="true"
      >
        {/* Identity header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-xl font-semibold">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-3">
                <h2 className="font-display text-xl font-semibold">{fullNameEn(student)}</h2>
                <span className="text-muted-foreground" dir="rtl">
                  {fullNameAr(student)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={student.status === 'ACTIVE' ? 'success' : 'muted'}>
                  {student.status}
                </Badge>
                {sectionLabel ? <Badge tone="muted">{sectionLabel}</Badge> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              {t('people.edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
              ✕
            </Button>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t('people.details')}</TabsTrigger>
            <TabsTrigger value="relationships">{t('people.parents')}</TabsTrigger>
            <TabsTrigger value="health">{t('people.vaccines')}</TabsTrigger>
            <TabsTrigger value="finance">{t('nav.finance')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Identity details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('people.details')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Detail label={t('people.nationalId')} value={student.nationalId} mono />
                <Detail label={t('people.moeNumber')} value={student.moeStudentNumber} mono />
                <Detail label={t('people.qr')} value={student.qrCode} mono />
                <Detail label={t('common.status')} value={student.status} />
                <Detail label="Section" value={sectionLabel ?? null} />
                <Detail
                  label="Enrolled"
                  value={student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : null}
                  mono
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships">
            {/* Parents / guardians */}
            <ParentsSection
              studentId={student.id}
              parents={parents}
              onChanged={loadParents}
              onEditParent={setEditingParent}
            />
          </TabsContent>

          <TabsContent value="health">
            {/* Vaccines */}
            <Card>
              <CardHeader>
                <CardTitle>{t('people.vaccines')}</CardTitle>
              </CardHeader>
              <CardContent>
                {vaccines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('people.noVaccines')}</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {vaccines.map((v) => (
                      <li key={v.id}>
                        <Badge tone={v.received ? 'success' : 'muted'}>
                          {v.name}
                          {v.grade ? ` · ${v.grade}` : ''}
                          {v.received ? '' : ` · ${t('people.notReceived')}`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            {/* Finance */}
            <Card
              className={
                statement && Number(statement.totals.outstanding) > 0 ? 'border-coral/40' : ''
              }
            >
              <CardHeader>
                <CardTitle>{t('nav.finance')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : !statement ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {(
                        [
                          [t('finance.charged'), statement.totals.charged, ''],
                          [t('finance.paid'), statement.totals.paid, 'text-aqua'],
                          [t('finance.discounts'), statement.totals.discounts, ''],
                          [t('finance.outstanding'), statement.totals.outstanding, 'text-coral'],
                          [t('finance.credit'), statement.totals.creditBalance, 'text-aqua'],
                          [t('finance.refunded'), statement.totals.refunded, ''],
                        ] as const
                      ).map(([label, value, tone]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-border bg-background/40 p-3"
                        >
                          <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                            {label}
                          </div>
                          <div className={`font-display text-lg font-semibold ${tone}`}>
                            {Number(value).toFixed(3)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Table>
                      <THead>
                        <TR>
                          <TH>{t('finance.description')}</TH>
                          <TH className="text-end">{t('finance.net')}</TH>
                          <TH className="text-end">{t('finance.balance')}</TH>
                          <TH>{t('common.status')}</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {statement.chargeBalances.map((b) => (
                          <TR key={b.charge.id}>
                            <TD>
                              {b.charge.description}
                              {b.charge.dueDate ? (
                                <span className="block font-mono text-[11px] text-muted-foreground">
                                  {b.charge.dueDate.slice(0, 10)}
                                </span>
                              ) : null}
                            </TD>
                            <TD className="text-end font-mono">{Number(b.net).toFixed(3)}</TD>
                            <TD className="text-end font-mono">{Number(b.balance).toFixed(3)}</TD>
                            <TD>
                              <ChargeStatusBadge status={b.charge.status} />
                            </TD>
                          </TR>
                        ))}
                        {statement.chargeBalances.length === 0 ? (
                          <TR>
                            <TD colSpan={4} className="text-muted-foreground">
                              {t('finance.noCharges')}
                            </TD>
                          </TR>
                        ) : null}
                      </TBody>
                    </Table>

                    {statement.transactions.length > 0 ? (
                      <Table>
                        <THead>
                          <TR>
                            <TH className="text-end">{t('finance.amount')}</TH>
                            <TH>{t('finance.method')}</TH>
                            <TH>{t('finance.reference')}</TH>
                            <TH>{t('common.status')}</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {statement.transactions.map((tx) => (
                            <TR key={tx.id}>
                              <TD className="text-end font-mono">{Number(tx.amount).toFixed(3)}</TD>
                              <TD>{tx.method}</TD>
                              <TD className="font-mono text-xs text-muted-foreground">
                                {tx.reference ?? '—'}
                              </TD>
                              <TD>
                                <TransactionStatusBadge status={tx.status} />
                              </TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    ) : null}

                    <p className="text-end font-mono text-xs text-muted-foreground">
                      {t('finance.outstanding')}: {money(statement.totals.outstanding)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {editingParent ? (
        <ParentEditDialog
          parent={editingParent}
          onClose={() => setEditingParent(null)}
          onSaved={() => {
            setEditingParent(null);
            loadParents();
          }}
        />
      ) : null}
    </div>
  );
}

function ParentsSection({
  studentId,
  parents,
  onChanged,
  onEditParent,
}: {
  studentId: string;
  parents: StudentParentLink[];
  onChanged: () => void;
  onEditParent: (p: Parent) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [parentId, setParentId] = useState('');
  const [relation, setRelation] = useState('FATHER');
  const [busy, setBusy] = useState(false);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId) return;
    setBusy(true);
    try {
      await studentsApi.linkParent(studentId, { parentId, relation });
      setParentId('');
      setRelation('FATHER');
      toast.success(t('people.parentAssigned'));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      setBusy(false);
    }
  }

  async function unlink(pId: string) {
    if (!(await confirm())) return;
    try {
      await studentsApi.unlinkParent(studentId, pId);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Remove failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('people.parents')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('people.noParents')}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {parents.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="text-start font-medium text-foreground hover:text-primary hover:underline"
                    onClick={() => onEditParent(link.parent)}
                  >
                    {link.parent.firstNameEn} {link.parent.lastNameEn}
                  </button>
                  <span className="text-muted-foreground"> · {link.relation}</span>
                  {link.isPrimary ? (
                    <Badge tone="success" className="ms-2">
                      {t('people.primary')}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={link.parent.phone ? `tel:${link.parent.phone}` : undefined}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {link.parent.phone || '—'}
                  </a>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void unlink(link.parent.id)}
                    aria-label={`${t('common.delete')} ${link.parent.firstNameEn}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Assign an existing guardian */}
        <form onSubmit={(e) => void assign(e)} className="flex flex-wrap items-end gap-2 pt-1">
          <Field label={t('people.assignParent')} className="min-w-[12rem] flex-1">
            <EntityPicker
              value={parentId}
              onChange={setParentId}
              load={loadParentOptions}
              placeholder={t('people.searchParents')}
            />
          </Field>
          <Field label={t('people.relation')}>
            <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {PARENT_RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" size="sm" disabled={!parentId || busy}>
            {busy ? t('common.adding') : t('people.assign')}
          </Button>
        </form>
      </CardContent>
    </Card>
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
