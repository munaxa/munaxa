import { cn } from '@munaxa/ui';
import { MockPanel } from '../product-sections';
import { Bar, CardHead, Dot, Pill, Ring, SmallButton, TwoLine, rowRule } from './ui';

/* Munaxa Work feature mock-ups. Rendered on the Work page, inside the Work theme. */

const solid = 'bg-primary-800 text-background';

function Initials({ children }: { children: string }) {
  return <Dot className="size-8.5 bg-primary-50 font-semibold text-primary-800">{children}</Dot>;
}

/* 01 · Hiring and onboarding */

const tasks = [
  { label: 'Contract signed electronically', owner: 'HR', done: true },
  { label: 'Bank and payroll details captured', owner: 'Finance', done: true },
  { label: 'First-week plan shared', owner: 'Manager', done: true },
  { label: 'Laptop and system access', owner: 'Due Thursday', done: false },
];

export function OnboardingMock() {
  return (
    <MockPanel product="work" className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <Dot className={cn('size-10 text-sm font-semibold', solid)}>NH</Dot>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-sm font-semibold">Noor Hijazi</span>
          <span className="block text-xs text-muted-foreground">
            Product Designer · starts Sunday
          </span>
        </span>
        <Pill>82%</Pill>
      </div>
      <Bar pct={82} className="bg-primary-800" />
      <div className="flex flex-col">
        {tasks.map((t, i) => (
          <div
            key={t.label}
            className={cn('flex items-center gap-3 py-2.5', i < tasks.length - 1 && rowRule)}
          >
            {t.done ? <Dot className={cn('size-5', solid)}>✓</Dot> : <Ring className="size-5" />}
            <span className={cn('flex-1 text-sm', !t.done && 'text-neutral-600')}>{t.label}</span>
            {t.done ? (
              <span className="text-xs text-muted-foreground">{t.owner}</span>
            ) : (
              <Pill tone="warning">{t.owner}</Pill>
            )}
          </div>
        ))}
      </div>
    </MockPanel>
  );
}

/* 02 · Time and leave */

export function LeaveMock() {
  return (
    <MockPanel product="work">
      <CardHead title="Needs your approval" className="mb-1.5">
        <Pill tone="warning">3 pending</Pill>
      </CardHead>
      <div className={cn('flex items-center gap-3 py-3', rowRule)}>
        <Initials>LN</Initials>
        <TwoLine title="Lina Nasser · Annual leave" sub="Oct 12 to Oct 19 · 8 days left after" />
        <span className="flex gap-1.5">
          <SmallButton solid={solid}>Approve</SmallButton>
          <SmallButton>Decline</SmallButton>
        </span>
      </div>
      <div className={cn('flex items-center gap-3 py-3', rowRule)}>
        <Initials>MT</Initials>
        <TwoLine
          title="Mohammad Tarawneh · Overtime"
          sub="September · 14 hours · matches attendance"
        />
        <Pill>Verified</Pill>
      </div>
      <div className="flex items-center gap-3 py-3">
        <Initials>RD</Initials>
        <TwoLine title="Rami Dajani · Sick leave" sub="Today · medical note attached" />
        <Pill tone="muted">Auto-approved</Pill>
      </div>
    </MockPanel>
  );
}

/* 03 · Payroll */

const progress = [
  { label: 'Attendance confirmed', count: '342 / 342', pct: 100, fill: 'bg-primary-900' },
  { label: 'Leave reconciled', count: '318 / 342', pct: 93, fill: 'bg-primary-800' },
  { label: 'Variable pay approved', count: '240 / 342', pct: 70, fill: 'bg-primary-500' },
];

export function PayrollMock() {
  return (
    <MockPanel product="work" className="flex flex-col gap-3.5">
      <CardHead title="Payroll run · October">
        <Pill>On track · 4 days to cutoff</Pill>
      </CardHead>
      {progress.map((p) => (
        <div key={p.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-xs">
            <span className="font-semibold">{p.label}</span>
            <span className="text-muted-foreground">{p.count}</span>
          </div>
          <Bar pct={p.pct} className={p.fill} />
        </div>
      ))}
      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-warning text-sm font-bold text-background">
          !
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">2 exceptions to review</span>
          <span className="block text-xs text-neutral-600">
            Unpaid leave overlaps a public holiday for 2 employees.
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs text-neutral-600">Net total</span>
        {/* Privacy mode: amounts are masked on shared screens. */}
        <span className="text-base font-semibold tracking-widest text-warning-strong">••• •••</span>
      </div>
    </MockPanel>
  );
}

/* 04 · Performance */

const cycle = [
  { label: 'Self review', pct: '86%' },
  { label: 'Manager', pct: '54%' },
  { label: 'Calibrated', pct: '12%' },
];

export function ReviewMock() {
  return (
    <MockPanel product="work" className="flex flex-col gap-3.5">
      <CardHead title="Review cycle · H2 2026">
        <Pill>Week 2 of 4</Pill>
      </CardHead>
      <div className="grid grid-cols-3 gap-2.5">
        {cycle.map((c) => (
          <div key={c.label} className="rounded-lg bg-primary-50 p-3">
            <div className="text-xs font-semibold text-muted-foreground">{c.label}</div>
            <div className="font-display mt-1 text-2xl font-semibold text-primary-900">{c.pct}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <Initials>KA</Initials>
        <TwoLine title="Khaled Abbadi updated a goal" sub="Launch customer portal v2 · 70% → 85%" />
        <span className="text-xs text-muted-foreground">2h ago</span>
      </div>
    </MockPanel>
  );
}
