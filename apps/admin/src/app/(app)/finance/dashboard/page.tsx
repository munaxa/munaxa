'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import { financeApi, type FinanceDashboard } from '@/lib/finance';
import {
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

const jod = (v: string | number) => `${Number(v).toFixed(3)} JOD`;
const dateStr = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

/**
 * Operational finance dashboard — the collection workload a finance officer opens their day with:
 * promises due today, recently missed promises, transport suspensions, the largest outstanding
 * balances, and headline workload counts. All figures come from the ledger + collections feeds.
 */
export default function FinanceDashboardPage() {
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const d = await financeApi.financeDashboard();
        if (active) setData(d);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load the finance dashboard');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goto = (studentId: string) => router.push(`/people/students/${studentId}?tab=finance`);
  const w = data?.workload;

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Finance dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Today’s collection workload — promises, overdue balances and transport suspensions.
          </p>
        </header>

        {loading && <Spinner />}
        {!loading && data && (
          <>
            {/* Workload headline */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Metric label="Outstanding" value={jod(data.totalOutstanding)} />
              <Metric label="Collected" value={`${data.collectedPct}%`} />
              <Metric label="Overdue students" value={String(w?.overdueStudents ?? 0)} />
              <Metric label="Open promises" value={String(w?.promisesOpen ?? 0)} />
              <Metric label="Transport suspended" value={String(w?.transportSuspended ?? 0)} />
            </div>

            <DashPanel
              title="Promises due today"
              rows={data.promisesDueToday}
              empty="No promises fall due today."
              onRow={goto}
              render={(p) => [p.studentName, jod(p.amount), dateStr(p.promiseBy)]}
              headers={['Student', 'Amount', 'By']}
            />

            <DashPanel
              title="Recently missed promises"
              rows={data.promisesMissed}
              empty="No missed promises."
              onRow={goto}
              render={(p) => [p.studentName, jod(p.amount), dateStr(p.promiseBy)]}
              headers={['Student', 'Amount', 'By']}
            />

            <DashPanel
              title="Largest outstanding balances"
              rows={data.topOutstanding}
              empty="No outstanding balances."
              onRow={goto}
              render={(r) => [r.studentName, jod(r.outstanding), jod(r.overdue)]}
              headers={['Student', 'Outstanding', 'Overdue']}
            />

            <DashPanel
              title="Transport suspensions"
              rows={data.transportSuspensions}
              empty="No transport suspensions."
              onRow={goto}
              render={(s) => [s.studentName, dateStr(s.suspendedAt)]}
              headers={['Student', 'Suspended']}
            />
          </>
        )}
        {!loading && !data && <EmptyState title="Dashboard unavailable" />}
      </div>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DashPanel<T extends { studentId: string }>({
  title,
  rows,
  empty,
  headers,
  render,
  onRow,
}: {
  title: string;
  rows: T[];
  empty: string;
  headers: string[];
  render: (row: T) => string[];
  onRow: (studentId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <THead>
              <TR>
                {headers.map((h) => (
                  <TH key={h}>{h}</TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR
                  key={row.studentId + JSON.stringify(render(row))}
                  className="cursor-pointer"
                  onClick={() => onRow(row.studentId)}
                >
                  {render(row).map((cell, i) => (
                    <TD key={i}>{cell}</TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
