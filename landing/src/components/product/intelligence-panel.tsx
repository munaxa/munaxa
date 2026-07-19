import { cn } from '@/lib/cn';

/**
 * School intelligence — a leadership view that reads across modules: attendance trend, collection
 * rate, and grade-level performance, all derived from the same operational data in real time.
 */

const TREND = [86, 88, 91, 89, 93, 95, 96];
const GRADES = [
  { g: 'KG', v: 72 },
  { g: 'G1–3', v: 84 },
  { g: 'G4–6', v: 88 },
  { g: 'G7–9', v: 82 },
  { g: 'G10–12', v: 90 },
];

export function IntelligencePanel() {
  const max = Math.max(...TREND);
  const min = Math.min(...TREND) - 3;
  const pts = TREND.map((v, i) => {
    const x = (i / (TREND.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min)) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="@container bg-background p-4 text-foreground">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold">School intelligence</p>
          <p className="text-[11px] text-muted-foreground">Live · across all modules</p>
        </div>
        <div className="flex gap-1.5">
          {['Term', 'Year'].map((t, i) => (
            <span
              key={t}
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px]',
                i === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-3">
        {[
          { k: 'Attendance', v: '96.4%', d: '+2.1', tone: 'aqua' as const },
          { k: 'Collection rate', v: '91.5%', d: '+4.3', tone: 'aqua' as const },
          { k: 'Avg. GPA', v: '3.41', d: '-0.04', tone: 'coral' as const },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{s.k}</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="mono font-display text-xl font-bold">{s.v}</span>
              <span className={cn('mono text-[11px]', s.tone === 'aqua' ? 'text-aqua' : 'text-coral')}>
                {s.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 @2xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3 @2xl:col-span-3">
          <p className="mb-2 text-xs font-semibold">Attendance trend</p>
          <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="h-24 w-full" aria-hidden>
            <polyline
              points={pts}
              fill="none"
              stroke="var(--aqua)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={`0,44 ${pts} 100,44`}
              fill="var(--aqua)"
              opacity="0.08"
              stroke="none"
            />
          </svg>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 @2xl:col-span-2">
          <p className="mb-2 text-xs font-semibold">Performance by grade band</p>
          <div className="flex h-24 items-end gap-1.5">
            {GRADES.map((b) => (
              <div key={b.g} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${b.v}%` }}
                />
                <span className="text-[8px] text-muted-foreground">{b.g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
