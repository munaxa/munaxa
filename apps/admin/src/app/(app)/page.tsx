'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell, usePrincipal } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { dashboardApi, type DashboardOverview } from '@/lib/dashboard';
import { NavIcon, type NavIconKey } from '@/components/nav-icons';
import type { Locale } from '@/lib/i18n';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Timeline,
  TimelineItem,
  cn,
} from '@/components/ui';

export default function Home() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}

/** Accent tone shared by KPI icon chips and insight markers — all sourced from DS tokens. */
type Tone = 'primary' | 'aqua' | 'coral' | 'danger';

const chipTone: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  aqua: 'bg-aqua/10 text-aqua',
  coral: 'bg-coral/10 text-coral',
  danger: 'bg-destructive/10 text-destructive',
};

const valueTone: Record<Tone, string> = {
  primary: 'text-foreground',
  aqua: 'text-aqua',
  coral: 'text-coral',
  danger: 'text-destructive',
};

/** Quick actions, ordered by everyday frequency. Permission-filtered like the sidebar. */
const QUICK_ACTIONS: Array<{ href: string; labelKey: string; icon: NavIconKey; perm?: string }> = [
  {
    href: '/attendance',
    labelKey: 'dashboard.action.markAttendance',
    icon: 'attendance',
    perm: 'attendance:read',
  },
  {
    href: '/finance/collections',
    labelKey: 'dashboard.action.collectPayment',
    icon: 'collections',
    perm: 'finance:read',
  },
  {
    href: '/admissions',
    labelKey: 'dashboard.action.registerStudent',
    icon: 'enrollment',
    perm: 'enrollment:manage',
  },
  {
    href: '/people/students',
    labelKey: 'dashboard.action.students',
    icon: 'students',
    perm: 'student:manage',
  },
  {
    href: '/people/teachers',
    labelKey: 'dashboard.action.addTeacher',
    icon: 'teachers',
    perm: 'teacher:manage',
  },
  {
    href: '/communication',
    labelKey: 'dashboard.action.sendNotice',
    icon: 'communication',
    perm: 'announcement:manage',
  },
  {
    href: '/people/cards',
    labelKey: 'dashboard.action.manageCards',
    icon: 'cards',
    perm: 'card:read',
  },
  { href: '/reports', labelKey: 'dashboard.action.reports', icon: 'reports', perm: 'report:read' },
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
    <div className="mx-auto max-w-7xl space-y-8">
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
          <DashboardContent data={data} locale={locale} t={t} />
        ) : (
          <DashboardSkeleton />
        )
      ) : null}

      <QuickActions actions={actions} t={t} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function DashboardHeader({ locale, t }: { locale: Locale; t: (k: string) => string }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);
  // School year rolls over in autumn (month index 7 = August).
  const y = today.getFullYear();
  const academicYear = today.getMonth() >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">{t('dashboard.welcome')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <span className="text-sm font-medium text-foreground">{formattedDate}</span>
        <Badge tone="muted">
          {t('dashboard.academicYear')} · {academicYear}
        </Badge>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Content (KPIs + operational + activity + insights)
// ---------------------------------------------------------------------------
function DashboardContent({
  data,
  locale,
  t,
}: {
  data: DashboardOverview;
  locale: Locale;
  t: (k: string) => string;
}) {
  const att = data.attendanceToday;
  const rate = att.total > 0 ? Math.round(((att.present + att.late) / att.total) * 100) : null;

  return (
    <>
      {/* KPI row — six identical cards. */}
      <section
        aria-label={t('dashboard.title')}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6"
      >
        <Kpi
          icon="students"
          label={t('dashboard.students')}
          value={formatNumber(data.students, locale)}
        />
        <Kpi
          icon="employees"
          label={t('dashboard.staff')}
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
          icon="finance"
          tone="aqua"
          label={t('dashboard.collectedMonth')}
          value={formatMoney(data.finance.collectedThisMonth, locale)}
        />
        <Kpi
          icon="integrations"
          label={t('dashboard.einvoicePending')}
          value={formatNumber(data.einvoice.pending, locale)}
        />
      </section>

      {/* Operational insights — attendance breakdown beside the financial overview. */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label={t('dashboard.todayOverview')}>
        <AttendanceCard att={att} rate={rate} t={t} />
        <FinancialOverview data={data} locale={locale} t={t} />
      </section>

      {/* Activity + what needs attention. */}
      <section className="grid gap-4 lg:grid-cols-3">
        <ActivityCard activity={data.recentActivity} locale={locale} t={t} />
        <InsightsCard data={data} rate={rate} t={t} />
      </section>
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
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              chipTone[tone],
            )}
          >
            <NavIcon name={icon} className="h-[18px] w-[18px]" />
          </span>
        </div>
        <div
          className={cn(
            'mt-auto font-display text-2xl font-semibold tabular-nums',
            valueTone[tone],
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Attendance breakdown
// ---------------------------------------------------------------------------
function AttendanceCard({
  att,
  rate,
  t,
}: {
  att: DashboardOverview['attendanceToday'];
  rate: number | null;
  t: (k: string) => string;
}) {
  return (
    <Card className="flex flex-col lg:col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.attendanceToday')}</CardTitle>
        <CardDescription>
          {t('dashboard.ofMarked').replace('{n}', String(att.total))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {att.total > 0 ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold tabular-nums text-aqua">
                {rate}%
              </span>
              <span className="text-xs text-muted-foreground">{t('dashboard.attendanceRate')}</span>
            </div>
            <div className="space-y-2.5">
              <Bar
                label={t('dashboard.present')}
                n={att.present}
                total={att.total}
                className="bg-aqua"
              />
              <Bar
                label={t('dashboard.late')}
                n={att.late}
                total={att.total}
                className="bg-coral"
              />
              <Bar
                label={t('dashboard.absent')}
                n={att.absent}
                total={att.total}
                className="bg-destructive"
              />
              <Bar
                label={t('dashboard.excused')}
                n={att.excused}
                total={att.total}
                className="bg-primary"
              />
            </div>
          </>
        ) : (
          <EmptyState
            className="flex-1 justify-center py-6"
            icon={<NavIcon name="attendance" className="h-6 w-6" />}
            title={t('dashboard.noAttendanceToday')}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Bar({
  label,
  n,
  total,
  className,
}: {
  label: string;
  n: number;
  total: number;
  className: string;
}) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{n}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', className)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financial overview
// ---------------------------------------------------------------------------
function FinancialOverview({
  data,
  locale,
  t,
}: {
  data: DashboardOverview;
  locale: Locale;
  t: (k: string) => string;
}) {
  const { finance, einvoice } = data;
  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader>
        <CardTitle>{t('dashboard.financialOverview')}</CardTitle>
        <CardDescription>{t('dashboard.financeDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Stat
            label={t('dashboard.collected')}
            value={formatMoney(finance.collectedThisMonth, locale)}
            tone="aqua"
          />
          <Stat
            label={t('dashboard.outstandingBalance')}
            value={formatMoney(finance.outstanding, locale)}
            tone="coral"
          />
          <Stat label={t('dashboard.billed')} value={formatMoney(finance.billed, locale)} />
          <Stat label={t('dashboard.paid')} value={formatMoney(finance.paid, locale)} />
          <Stat label={t('dashboard.discounts')} value={formatMoney(finance.discounts, locale)} />
        </dl>
        <div className="mt-auto border-t border-border pt-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('dashboard.einvoicing')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">
              {t('dashboard.accepted')} · {formatNumber(einvoice.accepted, locale)}
            </Badge>
            <Badge tone="warning">
              {t('dashboard.pending')} · {formatNumber(einvoice.pending, locale)}
            </Badge>
            <Badge tone="danger">
              {t('dashboard.rejected')} · {formatNumber(einvoice.rejected, locale)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = 'primary' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-display text-lg font-semibold tabular-nums', valueTone[tone])}>
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------
const ACTIVITY_LIMIT = 8;

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
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<NavIcon name="reports" className="h-6 w-6" />}
            title={t('dashboard.noRecentActivity')}
          />
        ) : (
          <Timeline>
            {items.map((a, i) => {
              const who = a.actorName ?? a.actorUsername ?? t('dashboard.systemActor');
              return (
                <TimelineItem
                  key={i}
                  title={
                    <>
                      <span className="font-semibold">{who}</span>
                      {a.actorName && a.actorUsername ? (
                        <span className="text-muted-foreground"> @{a.actorUsername}</span>
                      ) : null}
                      <span className="text-muted-foreground"> — {a.action}</span>
                    </>
                  }
                  meta={
                    <span className="inline-flex items-center gap-1.5">
                      <Badge tone="muted" className="font-mono text-[10px]">
                        {a.entityType}
                        {a.entityId ? ` #${a.entityId.slice(0, 8)}` : ''}
                      </Badge>
                      {a.actorRole ? <span>{a.actorRole}</span> : null}
                    </span>
                  }
                  timestamp={fmt.format(new Date(a.at))}
                />
              );
            })}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Needs attention / insights
// ---------------------------------------------------------------------------
const ATTENDANCE_TARGET = 90;

function InsightsCard({
  data,
  rate,
  t,
}: {
  data: DashboardOverview;
  rate: number | null;
  t: (k: string) => string;
}) {
  const insights: Array<{ icon: NavIconKey; tone: Tone; href: string; text: string }> = [];

  if (rate !== null && rate < ATTENDANCE_TARGET) {
    insights.push({
      icon: 'attendance',
      tone: 'coral',
      href: '/attendance',
      text: `${t('dashboard.insightLowAttendance')} · ${rate}%`,
    });
  }
  if (Number(data.finance.outstanding) > 0) {
    insights.push({
      icon: 'collections',
      tone: 'coral',
      href: '/finance',
      text: t('dashboard.insightOutstanding'),
    });
  }
  if (data.einvoice.rejected > 0) {
    insights.push({
      icon: 'integrations',
      tone: 'danger',
      href: '/finance',
      text: `${t('dashboard.insightRejectedInvoices')} · ${data.einvoice.rejected}`,
    });
  }
  if (data.einvoice.pending > 0) {
    insights.push({
      icon: 'integrations',
      tone: 'primary',
      href: '/finance',
      text: `${t('dashboard.insightPendingInvoices')} · ${data.einvoice.pending}`,
    });
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>{t('dashboard.needsAttention')}</CardTitle>
        <CardDescription>{t('dashboard.needsAttentionDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <EmptyState
            icon={<NavIcon name="roles" className="h-6 w-6" />}
            title={t('dashboard.allClear')}
            description={t('dashboard.allClearDesc')}
          />
        ) : (
          <ul className="space-y-2">
            {insights.map((ins, i) => (
              <li key={i}>
                <Link
                  href={ins.href as never}
                  className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      chipTone[ins.tone],
                    )}
                  >
                    <NavIcon name={ins.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-sm text-foreground">{ins.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------
function QuickActions({ actions, t }: { actions: typeof QUICK_ACTIONS; t: (k: string) => string }) {
  if (actions.length === 0) return null;
  return (
    <section aria-label={t('dashboard.quickActions')} className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-display text-lg font-semibold">{t('dashboard.quickActions')}</h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.quickActionsDesc')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href as never} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent">
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <NavIcon name={a.icon} />
                </span>
                <span className="text-sm font-medium">{t(a.labelKey)}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton (mirrors the content layout to avoid layout shift)
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl bg-secondary/60" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-secondary/60 lg:col-span-1" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary/60 lg:col-span-2" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl bg-secondary/60 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl bg-secondary/60 lg:col-span-1" />
      </div>
    </div>
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
