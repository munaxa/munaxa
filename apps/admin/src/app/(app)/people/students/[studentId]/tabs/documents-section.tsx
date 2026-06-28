'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import {
  documentsApi,
  type AcademicYearOption,
  type DocumentMeta,
  type DocumentType,
  type DocumentLanguage,
  type FeeItemKind,
  type RegistrationAgreementRow,
} from '@/lib/documents';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Field,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const LANGUAGES: DocumentLanguage[] = ['EN', 'AR', 'BILINGUAL'];

/** Finance document types the registrar/finance officer can generate on demand from this screen. */
const GENERATABLE: DocumentType[] = [
  'ACCOUNT_STATEMENT',
  'PAYMENT_HISTORY',
  'FEE_BREAKDOWN',
  'STUDENT_FINANCIAL_SUMMARY',
  'OUTSTANDING_BALANCE_CERTIFICATE',
  'CLEARANCE_CERTIFICATE',
  'ANNUAL_TUITION_CERTIFICATE',
];

/** Optional categories the Annual Tuition Certificate can include alongside tuition. */
const OPTIONAL_KINDS: FeeItemKind[] = [
  'TRANSPORT',
  'REGISTRATION',
  'BOOKS',
  'ACTIVITY',
  'UNIFORM',
  'INSURANCE',
];

const dateStr = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');
const docNo = (n: number) => String(n).padStart(6, '0');

/**
 * Student Finance Card → Documents (Part 5). Lists the immutable document archive and the
 * registration agreement(s), and lets staff generate the finance documents on demand. Every action
 * goes through the Document Engine API (which renders from the ledger, archives, and audits) — this
 * screen never computes or stores any financial figure itself.
 */
export function DocumentsSection({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [agreements, setAgreements] = useState<RegistrationAgreementRow[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [language, setLanguage] = useState<DocumentLanguage>('EN');
  const [yearId, setYearId] = useState('');
  const [includeKinds, setIncludeKinds] = useState<Set<FeeItemKind>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, a, y] = await Promise.all([
        documentsApi.list(studentId),
        documentsApi.listAgreements(studentId).catch(() => []),
        documentsApi.academicYears().catch(() => []),
      ]);
      setDocs(d);
      setAgreements(a);
      setYears(y);
      if (!yearId) setYearId(y.find((yy) => yy.isCurrent)?.id ?? y[0]?.id ?? '');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [studentId, yearId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeLabel = (type: DocumentType) =>
    t(`studentProfile.docTypes.${type}`) || type.replace(/_/g, ' ');

  async function generate(type: DocumentType) {
    if (type === 'ANNUAL_TUITION_CERTIFICATE' && !yearId) {
      toast.error(t('studentProfile.selectYear'));
      return;
    }
    setBusy(type);
    try {
      await documentsApi.generate({
        type,
        studentId,
        language,
        ...(type === 'ANNUAL_TUITION_CERTIFICATE'
          ? { academicYearId: yearId, includeKinds: [...includeKinds] }
          : {}),
      });
      toast.success(t('studentProfile.documentGenerated'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(null);
    }
  }

  async function regenerateAgreement(enrollmentId: string) {
    setBusy('agreement');
    try {
      await documentsApi.generateAgreement(enrollmentId, language);
      toast.success(t('studentProfile.documentGenerated'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(null);
    }
  }

  async function withBusy(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  async function emailDoc(id: string) {
    const to = window.prompt(t('studentProfile.emailPrompt') || 'Recipient email');
    if (!to) return;
    await withBusy(`email-${id}`, async () => {
      await documentsApi.email(id, to);
      toast.success(t('studentProfile.documentEmailed'));
      await load();
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const toggleKind = (k: FeeItemKind) =>
    setIncludeKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* Registration Agreement (legal commitment, auto-generated at registration) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.docTypes.REGISTRATION_AGREEMENT')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {agreements.length === 0 ? (
            <div className="p-4">
              <EmptyState title={t('studentProfile.noAgreements')} />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{t('studentProfile.agreementNo')}</TH>
                  <TH>{t('studentProfile.version')}</TH>
                  <TH>{t('common.status')}</TH>
                  <TH className="text-end">{t('finance.amount')}</TH>
                  <TH>{t('studentProfile.generatedAt')}</TH>
                  <TH className="text-end">{t('common.actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {agreements.map((a) => (
                  <TR key={a.id}>
                    <TD className="font-mono text-xs">AGR-{docNo(a.agreementNo)}</TD>
                    <TD className="font-mono text-xs">v{a.version}</TD>
                    <TD>
                      <Badge tone={a.status === 'COMMITTED' || a.status === 'SIGNED' ? 'success' : 'muted'}>
                        {a.status}
                      </Badge>
                    </TD>
                    <TD className="text-end font-mono">{Number(a.grandTotal).toFixed(3)}</TD>
                    <TD className="whitespace-nowrap font-mono text-xs">{dateStr(a.createdAt)}</TD>
                    <TD className="text-end">
                      <div className="flex justify-end gap-1">
                        {a.documentId ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy !== null}
                              onClick={() =>
                                void withBusy(`dl-${a.documentId}`, () =>
                                  documentsApi.download(a.documentId!),
                                )
                              }
                            >
                              {t('studentProfile.download')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy !== null}
                              onClick={() =>
                                void withBusy(`pr-${a.documentId}`, () =>
                                  documentsApi.print(a.documentId!),
                                )
                              }
                            >
                              {t('studentProfile.printReceipt')}
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy !== null}
                          onClick={() => void regenerateAgreement(a.enrollmentId)}
                        >
                          {t('studentProfile.newVersion')}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate finance documents */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.generateDocument')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('studentProfile.language')}>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as DocumentLanguage)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('studentProfile.academicYear')}>
              <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
                <option value="">—</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Annual Tuition Certificate optional categories */}
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('studentProfile.includeCategories')}
            </div>
            <div className="flex flex-wrap gap-3">
              {OPTIONAL_KINDS.map((k) => (
                <Checkbox
                  key={k}
                  label={k}
                  checked={includeKinds.has(k)}
                  onChange={() => toggleKind(k)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {GENERATABLE.map((type) => (
              <Button
                key={type}
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void generate(type)}
              >
                {busy === type ? t('common.recording') : typeLabel(type)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document archive */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentProfile.documentsArchive')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>{t('studentProfile.documentType')}</TH>
                <TH>{t('studentProfile.receiptNo')}</TH>
                <TH>{t('studentProfile.language')}</TH>
                <TH className="text-end">{t('studentProfile.printed')}</TH>
                <TH>{t('studentProfile.generatedAt')}</TH>
                <TH className="text-end">{t('common.actions')}</TH>
              </TR>
            </THead>
            <TBody>
              {docs.map((d) => (
                <TR key={d.id}>
                  <TD>
                    {typeLabel(d.type)}
                    {d.status !== 'ARCHIVED' ? (
                      <Badge tone="muted" className="ms-2">
                        {d.status}
                      </Badge>
                    ) : null}
                  </TD>
                  <TD className="font-mono text-xs">DOC-{docNo(d.documentNo)}</TD>
                  <TD className="font-mono text-xs">{d.language}</TD>
                  <TD className="text-end font-mono">{d.printedCount}</TD>
                  <TD className="whitespace-nowrap font-mono text-xs">{dateStr(d.generatedAt)}</TD>
                  <TD className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => void withBusy(`dl-${d.id}`, () => documentsApi.download(d.id))}
                      >
                        {t('studentProfile.download')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => void withBusy(`pr-${d.id}`, () => documentsApi.print(d.id))}
                      >
                        {t('studentProfile.printReceipt')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => void emailDoc(d.id)}
                      >
                        {t('studentProfile.emailDocument')}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {docs.length === 0 ? (
                <TR>
                  <TD colSpan={6}>
                    <EmptyState title={t('studentProfile.noDocuments')} />
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
