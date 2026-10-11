import { cn } from '@munaxa/ui';
import { MockPanel } from '../product-sections';
import { CardHead, Pill, TwoLine, rowRule } from './ui';

/*
 * Munaxa School feature mock-ups. Rendered on the School page inside the School theme, and the
 * attendance pair also on the hub inside a School `ProductScope`.
 */

const solid = 'bg-primary-800 text-background';

/* 01 · Timetable */

const subject: Record<string, string> = {
  Math: 'bg-primary-50 text-primary-900',
  Arabic: 'bg-info/10 text-info-strong',
  English: 'bg-info/10 text-info-strong',
  Science: 'bg-warning/15 text-warning-strong',
  PE: 'bg-muted text-neutral-600',
};

const week = [
  { time: '8:00', slots: ['Math', 'Arabic', 'Math', 'Science', 'Arabic'] },
  { time: '8:50', slots: ['English', 'Science', 'History', 'Math', 'English'] },
  { time: '9:40', slots: ['Science', 'Math', 'English', 'PE', 'Math'] },
];

export function TimetableMock() {
  return (
    <MockPanel product="school" className="overflow-hidden">
      <CardHead title="Grade 7 · Section B" className="mb-4">
        <Pill>Published</Pill>
      </CardHead>
      <div className="grid grid-cols-[3.25rem_repeat(5,minmax(0,1fr))] gap-1.5 text-xs">
        <span />
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((d) => (
          <span key={d} className="text-center font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
        {week.map((row) => (
          <Row key={row.time} {...row} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary-500/30 bg-primary-50 px-3.5 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-background">
          ✓
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Conflict resolved</span>
          <span className="block text-xs text-neutral-600">
            Ms. Haddad was double-booked on Tuesday 8:50. History moved to Room 204.
          </span>
        </span>
      </div>
    </MockPanel>
  );
}

function Row({ time, slots }: { time: string; slots: string[] }) {
  return (
    <>
      <span className="pt-2 text-neutral-400">{time}</span>
      {slots.map((s, i) =>
        s === 'History' ? (
          // The lesson the conflict resolver just moved.
          <span
            key={i}
            className="rounded-md border-2 border-primary-500 bg-background px-1.5 py-1.5 font-semibold text-primary-900 ring-4 ring-primary-400/15"
          >
            {s}
          </span>
        ) : (
          <span key={i} className={cn('rounded-md px-1.5 py-2 font-semibold', subject[s])}>
            {s}
          </span>
        ),
      )}
    </>
  );
}

/* 02 · Attendance and academics */

const grades = [
  { name: 'Omar Tamimi', q: 18, m: 27, f: 44, avg: 89 },
  { name: 'Layan Haddad', q: 19, m: 29, f: 47, avg: 95 },
  { name: 'Kareem Nasser', q: 15, m: 22, f: 38, avg: 75 },
  { name: 'Sara Odeh', q: 17, m: 26, f: 42, avg: 85 },
];

const gradeCols = 'grid grid-cols-[1fr_repeat(3,3.25rem)_3.75rem] gap-2';

export function GradebookMock() {
  return (
    <MockPanel product="school">
      <CardHead title="Mathematics · Term 1 grades" className="mb-3">
        <Pill tone="warning">Ready to publish</Pill>
      </CardHead>
      <div
        className={cn(
          gradeCols,
          'border-b border-border py-2 text-xs font-bold tracking-wide text-muted-foreground uppercase',
        )}
      >
        <span>Student</span>
        <span className="text-center">Quiz</span>
        <span className="text-center">Mid</span>
        <span className="text-center">Final</span>
        <span className="text-end">Avg</span>
      </div>
      {grades.map((g, i) => (
        <div
          key={g.name}
          className={cn(gradeCols, 'items-center py-2.5 text-sm', i < grades.length - 1 && rowRule)}
        >
          <span className="font-medium">{g.name}</span>
          <span className="text-center text-neutral-600">{g.q}</span>
          <span className="text-center text-neutral-600">{g.m}</span>
          <span className="text-center text-neutral-600">{g.f}</span>
          <span className="text-end font-semibold">{g.avg}</span>
        </div>
      ))}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Class average 86 · 29 students</span>
        <span className={cn('rounded-md px-4 py-2 text-sm font-semibold', solid)}>
          Publish report cards
        </span>
      </div>
    </MockPanel>
  );
}

/* 03 · Fees and finance */

const invoices = [
  {
    title: 'INV-2026-0412 · Rania Khalil',
    sub: 'Term 1 tuition · 2 children',
    amount: 'JOD 2,400',
    status: 'Paid',
    tone: 'default',
  },
  {
    title: 'INV-2026-0413 · Ahmad Saleh',
    sub: 'Installment 2 of 3',
    amount: 'JOD 650',
    status: 'Due Sep 30',
    tone: 'warning',
  },
  {
    title: 'INV-2026-0398 · Lina Barakat',
    sub: 'Transport · reminder sent',
    amount: 'JOD 180',
    status: 'Overdue',
    tone: 'danger',
  },
] as const;

export function FeesMock() {
  return (
    <MockPanel product="school">
      <CardHead title="Collections · September">
        <span className="text-xs text-muted-foreground">78% collected</span>
      </CardHead>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-md bg-muted">
        <span className="bg-primary-500" style={{ width: '78%' }} />
        <span className="bg-warning" style={{ width: '4%' }} />
      </div>
      <div className="mt-4.5 flex flex-col">
        {invoices.map((inv, i) => (
          <div
            key={inv.title}
            className={cn('flex items-center gap-3 py-2.5', i < invoices.length - 1 && rowRule)}
          >
            <TwoLine title={inv.title} sub={inv.sub} />
            <span className="text-sm font-semibold whitespace-nowrap">{inv.amount}</span>
            <Pill tone={inv.tone}>{inv.status}</Pill>
          </div>
        ))}
      </div>
    </MockPanel>
  );
}

/* 04 · Families: the parent app on a phone */

export function ParentAppMock() {
  const tile = 'rounded-xl bg-card p-3';
  return (
    <div
      aria-hidden="true"
      className="flex justify-center overflow-hidden rounded-2xl bg-primary-50 px-6 pt-9"
    >
      <div className="h-110 w-70 max-w-full rounded-t-4xl bg-neutral-950 px-2.5 pt-2.5 shadow-card">
        <div className="flex h-full flex-col overflow-hidden rounded-t-3xl bg-neutral-50">
          <div className={cn('px-4.5 pt-7.5 pb-4.5', solid)}>
            <div className="text-xs opacity-75">Good morning</div>
            <div className="font-display text-lg font-semibold">Rania</div>
            <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-background/10 px-3 py-2.5">
              <span className="flex size-7.5 items-center justify-center rounded-full bg-primary-400 text-xs font-bold text-primary-900">
                O
              </span>
              <span>
                <span className="block text-sm font-semibold">Omar</span>
                <span className="block text-xs opacity-80">Grade 7 · Section B</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 p-3.5">
            <div className={cn(tile, 'flex items-center gap-2.5')}>
              <span className="size-2 rounded-full bg-primary-500" />
              <span className="flex-1 text-xs font-semibold">Arrived at school</span>
              <span className="text-xs text-muted-foreground">7:42</span>
            </div>
            <div className={tile}>
              <div className="text-xs text-muted-foreground">Message from Ms. Haddad</div>
              <div className="mt-1 text-xs leading-snug">
                Omar&apos;s history project is due Thursday. Great progress this week.
              </div>
            </div>
            <div className={cn(tile, 'flex items-center gap-2.5')}>
              <span className="flex-1">
                <span className="block text-xs text-muted-foreground">Installment 2 of 3</span>
                <span className="block text-sm font-semibold">JOD 650 · due Sep 30</span>
              </span>
              <span className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', solid)}>Pay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The same attendance card in English and in Arabic */

interface AttendanceCopy {
  title: string;
  section: string;
  badge: string;
  pct: string;
  counts: [string, string][];
  button: string;
}

const en: AttendanceCopy = {
  title: 'Attendance today',
  section: 'Grade 7 · Section B',
  badge: 'EN',
  pct: '93%',
  counts: [
    ['Present', '27'],
    ['Late', '1'],
    ['Absent', '1'],
  ],
  button: 'Mark all present',
};

// The design assistant's translation. Needs a native speaker's review before launch.
const ar: AttendanceCopy = {
  title: 'الحضور اليوم',
  section: 'الصف السابع · الشعبة ب',
  badge: 'ع',
  pct: '٩٣٪',
  counts: [
    ['حاضر', '٢٧'],
    ['متأخر', '١'],
    ['غائب', '١'],
  ],
  button: 'تسجيل الجميع حاضرين',
};

function AttendanceCard({ c, rtl }: { c: AttendanceCopy; rtl?: boolean }) {
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={rtl ? 'ar' : 'en'}
      className={cn(
        'rounded-2xl border border-border bg-card p-6 shadow-card',
        rtl && 'font-arabic',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn('text-base font-semibold', !rtl && 'font-display')}>{c.title}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{c.section}</div>
        </div>
        <Pill>{c.badge}</Pill>
      </div>
      <div className={cn('mt-5 text-5xl font-semibold', !rtl && 'font-display tracking-tight')}>
        {c.pct}
      </div>
      <div className="mt-3.5 flex h-2 gap-1">
        <span className="rounded bg-primary-400" style={{ width: '93%' }} />
        <span className="rounded bg-warning" style={{ width: '3.5%' }} />
        <span className="rounded bg-neutral-400" style={{ width: '3.5%' }} />
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-4.5 gap-y-1.5 text-sm text-neutral-600">
        {c.counts.map(([label, n]) => (
          <span key={label}>
            {label} <b className="text-foreground">{n}</b>
          </span>
        ))}
      </div>
      <div className={cn('mt-5 rounded-lg py-3 text-center text-sm font-semibold', solid)}>
        {c.button}
      </div>
    </div>
  );
}

export function AttendancePair({ className }: { className?: string }) {
  return (
    <div
      role="group"
      aria-label="The same attendance card in English and in Arabic"
      className={className}
    >
      <AttendanceCard c={en} />
      <AttendanceCard c={ar} rtl />
    </div>
  );
}
