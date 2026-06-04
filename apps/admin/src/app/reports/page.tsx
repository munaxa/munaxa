'use client';

import { useState } from 'react';
import { cn } from '@munaxa/ui';
import {
  reportingApi,
  type ReportFilters,
  type ReportFormat,
  type ReportKind,
  type ReportTable,
} from '@/lib/reporting';

const KINDS: Array<{ key: ReportKind; label: string }> = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'academic', label: 'Academic' },
  { key: 'financial', label: 'Financial' },
  { key: 'behavior', label: 'Behavior' },
];

const FORMATS: ReportFormat[] = ['csv', 'xlsx', 'pdf'];

export default function ReportsPage() {
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
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="font-display text-2xl font-semibold">Reports</h1>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => {
              setKind(k.key);
              setTable(null);
            }}
            className={cn(
              'rounded-lg border border-border px-3 py-1.5 text-sm',
              kind === k.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Section ID (optional)">
          <input
            className={inputClass}
            value={filters.sectionId ?? ''}
            onChange={(e) => setField('sectionId', e.target.value)}
          />
        </Field>
        <Field label="From">
          <input
            type="date"
            className={inputClass}
            value={filters.from ?? ''}
            onChange={(e) => setField('from', e.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            className={inputClass}
            value={filters.to ?? ''}
            onChange={(e) => setField('to', e.target.value)}
          />
        </Field>
        <button className={btnClass} disabled={busy} onClick={() => void run()}>
          {busy ? 'Loading…' : 'Run report'}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {table ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">{table.title}</h2>
              {table.subtitle ? (
                <p className="text-xs text-muted-foreground">{table.subtitle}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => void download(f)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 text-left font-medium">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {table.columns.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {String(row[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={table.columns.length}>
                      No data for the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground';
