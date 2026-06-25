'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell, usePrincipal } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { dashboardApi, type DashboardOverview } from '@/lib/dashboard';
import { NavIcon, type NavIconKey } from '@/components/nav-icons';
import type { Locale } from '@/lib/i18n';
import { Badge, Button, Card, CardContent, EmptyState, cn } from '@/components/ui';

export default function Home() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}

/** Accent tone — all sourced from existing DS tokens. */
type Tone = 'primary' | 'aqua' | 'coral' | 'danger';

const chipTone: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  aqua: 'bg-aqua/10 text-aqua',
  coral: 'bg-coral/10 text-coral',
  danger: 'bg-destructive/10 text-destructive',
};

const dotTone: Record<Tone, string> = {
  primary: 'bg-primary',
  aqua: 'bg-aqua',
  coral: 'bg-coral',
  danger: 'bg-destructive',
};

const strokeTone: Record<Tone, string> = {
  primary: 'stroke-primary',
  aqua: 'stroke-aqua',
  coral: 'stroke-coral',
  danger: 'stroke-destructive',
};

/** Quick actions, ordered by everyday frequency (mirrors the mockup). Permission-filtered. */
const QUICK_ACTIONS: Array<{
  href: string;
  labelKey: string;
  icon: NavIconKey;
  tone: Tone;
  perm?: string;
}> = [
  {
    href: '/people/students',
    labelKey: 'dashboard.action.addStudent',
    icon: 'students',
    tone: 'primary',
    perm: 'student:manage',
  },
  {
    href: '/attendance',
    labelKey: 'dashboard.action.takeAttendance',
    icon: 'attendance',
    tone: 'primary',
    perm: 'attendance:read',
  },
  {
    href: '/finance/collections',
    labelKey: 'dashboard.action.feeCollection',
    icon: 'collections',
    tone: 'aqua',
    perm: 'finance:read',
  },
  {
    href: '/finance',
    labelKey: 'dashboard.action.createInvoice',
    icon: 'finance',
    tone: 'coral',
    perm: 'finance:read',
  },
  {
    href: '/people/teachers',
    labelKey: 'dashboard.action.addTeacher',
    icon: 'teachers',
    tone: 'primary',
    perm: 'teacher:manage',
  },
  {
    href: '/academics',
    labelKey: 'dashboard.action.examinations',
    icon: 'academics',
    tone: 'primary',
    perm: 'grade:read',
  },
  {
    href: '/communication',
    labelKey: 'dashboard.action.sendNotice',
    icon: 'communication',
    tone: 'primary',
    perm: 'announcement:manage',
  },
  {
    href: '/reports',
    labelKey: 'dashboard.action.reports',
    icon: 'reports',
    tone: 'primary',
    perm: 'report:read',
  },
  {
    href: '/timetable',
    labelKey: 'dashboard.action.timetable',
    icon: 'timetable',
    tone: 'coral',
    perm: 'timetable:read',
  },
];

function Dashboard() {
  const principal = usePrincipal();
  const { t, locale } = useI18n();
  const held = useMemo(() => new Set(principal.permissions), [principal.permissions]);
  const actions = QUICK_ACTIONS.filter((a) => !a.perm || held.has(a.perm) || principal.isPlatform);
  const canSeeKpis = held.has('report:read') || held.has('*') || principal.isPlatform;

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setData(await dashboardApi.overview());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (canSeeKpis) void load();
  }, [canSeeKpis, load]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader locale={locale} t={t} />

      {canSeeKpis ? (
        error && !data ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                title={t('dashboard.overviewUnavailable')}
                action={
                  <Button variant="outline" size="sm" onClick={() => void load()}>
                    {t('common.retry')}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : data ? (
          <DashboardContent data={data} actions={actions} locale={locale} t={t} />
        ) : (
          <DashboardSkeleton />
        )
      ) : (
        <QuickActionsCard actions={actions} t={t} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function DashboardHeader({ locale, t }: { locale: Locale; t: (k: string) => string }) {
  const now = new Date();
  const intlLocale = locale === 'ar' ? 'ar-JO' : 'en-US';
  const hour = now.getHours();
  const greetingKey =
    hour < 12
      ? 'dashboard.greetingMorning'
      : hour < 18
        ? 'dashboard.greetingAfternoon'
        : 'dashboard.greetingEvening';
  const date = new Intl.DateTimeFormat(intlLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(now);
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(now);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          {t(greetingKey)}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.welcomeLine')}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
          <CalendarIcon />
          {date} ({weekday})
        </span>
        <Button>
          <SlidersIcon />
          {t('dashboard.customize')}
        </Button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
function DashboardContent({
  data,
  actions,
  locale,
  t,
}: {
  data: DashboardOverview;
  actions: typeof QUICK_ACTIONS;
  locale: Locale;
  t: (k: string) => string;
}) {
  const att = data.attendanceToday;
  const rate = att.total > 0 ? Math.round(((att.present + att.late) / att.total) * 100) : null;

  return (
    <>
      {/* KPI row — five identical cards. */}
      <section
        aria-label={t('dashboard.title')}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      >
        <Kpi
          icon="students"
          label={t('dashboard.students')}
          value={formatNumber(data.students, locale)}
        />
        <Kpi
          icon="teachers"
          label={t('dashboard.teachers')}
          value={formatNumber(data.staff, locale)}
        />
        <Kpi
          icon="attendance"
          tone="aqua"
          label={t('dashboard.attendanceToday')}
          value={rate !== null ? `${rate}%` : '—'}
        />
        <Kpi
          icon="collections"
          tone="coral"
          label={t('dashboard.outstanding')}
          value={formatMoney(data.finance.outstanding, locale)}
        />
        <Kpi
          icon="feePlans"
          label={t('dashboard.invoicePending')}
          value={formatNumber(data.einvoice.pending, locale)}
        />
      </section>

      {/* Operational row — attendance breakdown · trend · activity. */}
      <section className="grid gap-4 lg:grid-cols-3">
        <AttendanceCard att={att} rate={rate} locale={locale} t={t} />
        <AttendanceTrendCard t={t} />
        <ActivityCard activity={data.recentActivity} locale={locale} t={t} />
      </section>

      {/* Academic + financial row — grade distribution · fee collection · quick actions. */}
      <section className="grid gap-4 lg:grid-cols-3">
        <StudentsByGradeCard t={t} />
        <FeeCollectionCard finance={data.finance} locale={locale} t={t} />
        <QuickActionsCard actions={actions} t={t} />
      </section>

      <AiInsightBanner data={data} rate={rate} t={t} />
    </>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------
function Kpi({
  icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: NavIconKey;
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full items-start gap-3 p-5">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            chipTone[tone],
          )}
        >
          <NavIcon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section card header (title + optional badge / action)
// ---------------------------------------------------------------------------
function SectionHeader({
  title,
  badge,
  action,
}: {
  title: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-6 pb-3">
      <h3 className="font-display text-lg font-semibold leading-none">{title}</h3>
      {action ?? (badge ? <Badge tone="muted">{badge}</Badge> : null)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Donut chart
// ---------------------------------------------------------------------------
function DonutChart({
  segments,
  size = 168,
  thickness = 16,
  center,
}: {
  segments: Array<{ value: number; tone: Tone }>;
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          className="stroke-secondary"
          pathLength={100}
        />
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => {
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={thickness}
                className={strokeTone[s.tone]}
                pathLength={100}
                strokeDasharray={`${s.value} ${100 - s.value}`}
                strokeDashoffset={-acc}
              />
            );
            acc += s.value;
            return el;
          })}
      </svg>
      {center ? (
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      ) : null}
    </div>
  );
}

function Legend({
  items,
}: {
  items: Array<{ tone: Tone; label: string; value: string; pct: string }>;
}) {
  return (
    <ul className="flex-1 space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2.5 text-sm">
          <span
            aria-hidden="true"
            className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotTone[it.tone])}
          />
          <span className="flex-1 text-muted-foreground">{it.label}</span>
          <span className="font-medium tabular-nums">{it.value}</span>
          <span className="w-12 text-end font-mono text-xs text-muted-foreground tabular-nums">
            {it.pct}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Attendance breakdown
// ---------------------------------------------------------------------------
function AttendanceCard({
  att,
  rate,
  locale,
  t,
}: {
  att: DashboardOverview['attendanceToday'];
  rate: number | null;
  locale: Locale;
  t: (k: string) => string;
}) {
  const pct = (n: number) => (att.total > 0 ? `${Math.round((n / att.total) * 100)}%` : '0%');
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.attendanceToday')} badge={t('dashboard.today')} />
      <CardContent className="flex flex-1 flex-col">
        {att.total > 0 ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart
              segments={[
                { value: (att.present / att.total) * 100, tone: 'aqua' },
                { value: (att.late / att.total) * 100, tone: 'coral' },
                { value: (att.absent / att.total) * 100, tone: 'danger' },
                { value: (att.excused / att.total) * 100, tone: 'primary' },
              ]}
              center={
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.present')}</p>
                  <p className="font-display text-2xl font-semibold tabular-nums">
                    {formatNumber(att.present, locale)}
                  </p>
                  <p className="text-xs font-medium text-aqua tabular-nums">
                    {rate !== null ? `${rate}%` : '—'}
                  </p>
                </div>
              }
            />
            <Legend
              items={[
                {
                  tone: 'aqua',
                  label: t('dashboard.present'),
                  value: formatNumber(att.present, locale),
                  pct: pct(att.present),
                },
                {
                  tone: 'coral',
                  label: t('dashboard.late'),
                  value: formatNumber(att.late, locale),
                  pct: pct(att.late),
                },
                {
                  tone: 'danger',
                  label: t('dashboard.absent'),
                  value: formatNumber(att.absent, locale),
                  pct: pct(att.absent),
                },
                {
                  tone: 'primary',
                  label: t('dashboard.excused'),
                  value: formatNumber(att.excused, locale),
                  pct: pct(att.excused),
                },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            className="flex-1 justify-center"
            icon={<NavIcon name="attendance" className="h-6 w-6" />}
            title={t('dashboard.noAttendanceToday')}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Attendance trend (no backing data — honest empty state)
// ---------------------------------------------------------------------------
function AttendanceTrendCard({ t }: { t: (k: string) => string }) {
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.attendanceTrend')} badge={t('dashboard.thisWeek')} />
      <CardContent className="flex flex-1 flex-col">
        <EmptyState
          className="flex-1 justify-center"
          icon={<NavIcon name="reports" className="h-6 w-6" />}
          title={t('dashboard.noTrendData')}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------
const ACTIVITY_LIMIT = 6;

function ActivityCard({
  activity,
  locale,
  t,
}: {
  activity: DashboardOverview['recentActivity'];
  locale: Locale;
  t: (k: string) => string;
}) {
  const items = activity.slice(0, ACTIVITY_LIMIT);
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [locale],
  );

  return (
    <Card className="flex flex-col">
      <SectionHeader
        title={t('dashboard.recentActivity')}
        action={
          <Link href="/reports" className="text-xs font-medium text-primary hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        }
      />
      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState
            className="justify-center"
            icon={<NavIcon name="reports" className="h-6 w-6" />}
            title={t('dashboard.noRecentActivity')}
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((a, i) => {
              const who = a.actorName ?? a.actorUsername ?? t('dashboard.systemActor');
              const detail = [
                a.action,
                a.entityType + (a.entityId ? ` #${a.entityId.slice(0, 8)}` : ''),
                a.ip ?? undefined,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={i} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{who}</span>
                      {a.actorName && a.actorUsername ? (
                        <span className="text-muted-foreground"> @{a.actorUsername}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{detail}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {fmt.format(new Date(a.at))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Students by grade (no backing data — honest empty state)
// ---------------------------------------------------------------------------
function StudentsByGradeCard({ t }: { t: (k: string) => string }) {
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.studentsByGrade')} badge={t('dashboard.thisSession')} />
      <CardContent className="flex flex-1 flex-col">
        <EmptyState
          className="flex-1 justify-center"
          icon={<NavIcon name="academics" className="h-6 w-6" />}
          title={t('dashboard.noGradeData')}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fee collection
// ---------------------------------------------------------------------------
function FeeCollectionCard({
  finance,
  locale,
  t,
}: {
  finance: DashboardOverview['finance'];
  locale: Locale;
  t: (k: string) => string;
}) {
  const paid = Number(finance.paid);
  const outstanding = Number(finance.outstanding);
  const total = paid + outstanding;
  const collectedPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '0%');

  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.feeCollection')} badge={t('dashboard.thisMonth')} />
      <CardContent className="flex flex-1 flex-col">
        {total > 0 ? (
          <>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <DonutChart
                segments={[
                  { value: collectedPct, tone: 'aqua' },
                  { value: 100 - collectedPct, tone: 'coral' },
                ]}
                center={
                  <div>
                    <p className="font-display text-2xl font-semibold tabular-nums">
                      {collectedPct}%
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatMoney(finance.paid, locale)}
                    </p>
                  </div>
                }
              />
              <Legend
                items={[
                  {
                    tone: 'aqua',
                    label: t('dashboard.collectedShort'),
                    value: formatMoney(finance.paid, locale),
                    pct: pct(paid),
                  },
                  {
                    tone: 'coral',
                    label: t('dashboard.pending'),
                    value: formatMoney(finance.outstanding, locale),
                    pct: pct(outstanding),
                  },
                ]}
              />
            </div>
            <Link
              href="/finance"
              className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t('dashboard.viewFinancialReport')}
              <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <EmptyState
            className="flex-1 justify-center"
            icon={<NavIcon name="finance" className="h-6 w-6" />}
            title={t('dashboard.noRecentActivity')}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------
function QuickActionsCard({
  actions,
  t,
}: {
  actions: typeof QUICK_ACTIONS;
  t: (k: string) => string;
}) {
  if (actions.length === 0) return null;
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.quickActions')} />
      <CardContent className="flex-1">
        <div className="grid grid-cols-3 gap-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href as never}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  chipTone[a.tone],
                )}
              >
                <NavIcon name={a.icon} />
              </span>
              <span className="text-xs font-medium leading-tight">{t(a.labelKey)}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AI insight banner (computed from real data)
// ---------------------------------------------------------------------------
function AiInsightBanner({
  data,
  rate,
  t,
}: {
  data: DashboardOverview;
  rate: number | null;
  t: (k: string) => string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const message =
    rate !== null
      ? t('dashboard.aiInsightAttendance').replace('{rate}', String(rate))
      : Number(data.finance.outstanding) > 0
        ? t('dashboard.aiInsightOutstanding')
        : t('dashboard.aiInsightAllClear');

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
        >
          <SparkleIcon />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold text-primary">{t('dashboard.aiInsight')}</span>
          <span className="text-muted-foreground"> — {message}</span>
        </p>
        <div className="flex items-center gap-1">
          <Link href="/reports">
            <Button variant="outline" size="sm">
              {t('dashboard.viewInsights')}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('common.dismiss')}
            onClick={() => setDismissed(true)}
          >
            <span aria-hidden="true">✕</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton (mirrors the content layout to avoid layout shift)
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-xl bg-secondary/60" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, row) => (
        <div key={row} className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-secondary/60" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline glyphs (decorative; same hand-rolled SVG convention as nav-icons)
// ---------------------------------------------------------------------------
function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-muted-foreground"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.6 4.9a3 3 0 0 0 1.9 1.9l4.9 1.6-4.9 1.6a3 3 0 0 0-1.9 1.9L12 19.3l-1.6-4.9a3 3 0 0 0-1.9-1.9L3.6 10.9l4.9-1.6a3 3 0 0 0 1.9-1.9L12 2.5z" />
      <path d="M19 3l.7 2 2 .7-2 .7L19 8.4l-.7-2-2-.7 2-.7L19 3z" opacity="0.7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers (display-only; mirrors @munaxa/utils money formatting)
// ---------------------------------------------------------------------------
function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-US').format(n);
}

function formatMoney(value: string, locale: Locale): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-JO', {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n);
}
