'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import { financeApi, type AgingReport } from '@/lib/finance';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;

/**
 * Collections dashboard (Phases 5–6): aging of outstanding balances by 30/60/90-day buckets,
 * collection effectiveness, and a one-click transport-suspension sweep (suspend overdue accounts,
 * restore the ones that have caught up) driven by the tenant billing policy.
 */
export default function CollectionsPage() {
  const toast = useToast();
  const [report, setReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setReport(await financeApi.aging());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load aging report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSweep() {
    setSweeping(true);
    try {
      const r = await financeApi.evaluateTransportAll();
      toast.success(`Evaluated ${r.evaluated} — suspended ${r.suspended}, restored ${r.restored}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transport sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  const t = report?.totals;

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold">Collections</h1>
            <p className="text-sm text-muted-foreground">
              Outstanding balances by age, collection effectiveness, and transport suspension.
            </p>
          </div>
          <Button variant="outline" onClick={() => void runSweep()} disabled={sweeping}>
            {sweeping ? 'Running…' : 'Run transport sweep'}
          </Button>
        </header>

        {report ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total outstanding" value={jod(t!.total)} />
            <Stat label="Overdue 90+ days" value={jod(t!.d90plus)} tone="text-warning" />
            <Stat label="Collected" value={`${report.collectedPct}%`} tone="text-success" />
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Aging by account</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !report || report.rows.length === 0 ? (
              <EmptyState title="No outstanding balances" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Student</TH>
                    <TH className="text-end">Current</TH>
                    <TH className="text-end">1–30</TH>
                    <TH className="text-end">31–60</TH>
                    <TH className="text-end">61–90</TH>
                    <TH className="text-end">90+</TH>
                    <TH className="text-end">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {report.rows.map((r) => (
                    <TR key={r.studentId}>
                      <TD className="font-mono text-xs">{r.studentId.slice(0, 8)}</TD>
                      <TD className="text-end font-mono">{Number(r.current).toFixed(3)}</TD>
                      <TD className="text-end font-mono">{Number(r.d1_30).toFixed(3)}</TD>
                      <TD className="text-end font-mono">{Number(r.d31_60).toFixed(3)}</TD>
                      <TD className="text-end font-mono">{Number(r.d61_90).toFixed(3)}</TD>
                      <TD className="text-end font-mono text-warning">
                        {Number(r.d90plus).toFixed(3)}
                      </TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(r.total).toFixed(3)}
                      </TD>
                    </TR>
                  ))}
                  {t ? (
                    <TR>
                      <TD className="font-semibold">Total</TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(t.current).toFixed(3)}
                      </TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(t.d1_30).toFixed(3)}
                      </TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(t.d31_60).toFixed(3)}
                      </TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(t.d61_90).toFixed(3)}
                      </TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(t.d90plus).toFixed(3)}
                      </TD>
                      <TD className="text-end font-mono font-semibold">
                        {Number(t.total).toFixed(3)}
                      </TD>
                    </TR>
                  ) : null}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`font-display text-2xl font-semibold ${tone ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
