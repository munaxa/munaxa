'use client';

import { useState } from 'react';
import {
  reportingApi,
  type ReportFilters,
  type ReportFormat,
  type ReportKind,
  type ReportTable,
} from '@/lib/reporting';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';

const KINDS: Array<{ key: ReportKind; labelKey: string }> = [
  { key: 'attendance', labelKey: 'reports.kindAttendance' },
  { key: 'academic', labelKey: 'reports.kindAcademic' },
  { key: 'financial', labelKey: 'reports.kindFinancial' },
  { key: 'behavior', labelKey: 'reports.kindBehavior' },
];

const FORMATS: ReportFormat[] = ['csv', 'xlsx', 'pdf'];

export default function ReportsPage() {
  const { t } = useI18n();
  const [kind, setKind] = useState<ReportKind>('attendance');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [table, setTable] = useState<ReportTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setField(key: keyof ReportFilters, value: string) {
    setFilters((f) => {
      const next = { ...f };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  async function run() {
    setError(null);
    setBusy(true);
    try {
      setTable(await reportingApi.view(kind, filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function download(format: ReportFormat) {
    setError(null);
    try {
      await reportingApi.download(kind, format, filters);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">{t('nav.reports')}</h1>
          <p className="text-sm text-muted-foreground">{t('reports.subtitle')}</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Button
              key={k.key}
              size="sm"
              variant={kind === k.key ? 'default' : 'outline'}
              onClick={() => {
                setKind(k.key);
                setTable(null);
              }}
            >
              {t(k.labelKey)}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <Field label="Section ID (optional)" className="min-w-48 flex-1">
              <Input
                value={filters.sectionId ?? ''}
                onChange={(e) => setField('sectionId', e.target.value)}
                placeholder="uuid"
              />
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={filters.from ?? ''}
                onChange={(e) => setField('from', e.target.value)}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={filters.to ?? ''}
                onChange={(e) => setField('to', e.target.value)}
              />
            </Field>
            <Button disabled={busy} onClick={() => void run()}>
              {busy ? t('common.loading') : t('reports.run')}
            </Button>
          </CardContent>
        </Card>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {table ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-medium">{table.title}</h2>
                {table.subtitle ? (
                  <Badge tone="muted" className="mt-1">
                    {table.subtitle}
                  </Badge>
                ) : null}
              </div>
              <div className="flex gap-2">
                {FORMATS.map((f) => (
                  <Button key={f} size="sm" variant="outline" onClick={() => void download(f)}>
                    {f.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <Table>
              <THead>
                <TR>
                  {table.columns.map((c) => (
                    <TH key={c.key}>{c.header}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {table.rows.map((row, i) => (
                  <TR key={i}>
                    {table.columns.map((c) => (
                      <TD key={c.key}>{String(row[c.key] ?? '')}</TD>
                    ))}
                  </TR>
                ))}
                {table.rows.length === 0 ? (
                  <TR>
                    <TD className="text-muted-foreground" colSpan={table.columns.length}>
                      No data for the selected filters.
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
