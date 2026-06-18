'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Shell, usePrincipal } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { dashboardApi, type DashboardOverview } from '@/lib/dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Timeline,
  TimelineItem,
} from '@/components/ui';

const QUICK_LINKS: Array<{ href: string; labelKey: string; descKey: string; perm?: string }> = [
  {
    href: '/people/students',
    labelKey: 'nav.people',
    descKey: 'dashboard.peopleDesc',
    perm: 'student:manage',
  },
  {
    href: '/attendance',
    labelKey: 'nav.attendance',
    descKey: 'dashboard.attendanceDesc',
    perm: 'attendance:read',
  },
  {
    href: '/finance',
    labelKey: 'nav.finance',
    descKey: 'dashboard.financeDesc',
    perm: 'finance:read',
  },
  {
    href: '/people/cards',
    labelKey: 'nav.cards',
    descKey: 'dashboard.cardsDesc',
    perm: 'card:read',
  },
  {
    href: '/reports',
    labelKey: 'nav.reports',
    descKey: 'dashboard.reportsDesc',
    perm: 'report:read',
  },
  {
    href: '/modules',
    labelKey: 'nav.modules',
    descKey: 'dashboard.modulesDesc',
    perm: 'featureflag:manage',
  },
];

export default function Home() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}

function Dashboard() {
  const principal = usePrincipal();
  const { t } = useI18n();
  const held = new Set(principal.permissions);
  const links = QUICK_LINKS.filter((l) => !l.perm || held.has(l.perm));
  const canSeeKpis = held.has('report:read') || held.has('*');

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await dashboardApi.overview());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (canSeeKpis) void load();
  }, [canSeeKpis, load]);

  const att = data?.attendanceToday;
  const rate =
    att && att.total > 0 ? Math.round(((att.present + att.late) / att.total) * 100) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </header>

      {canSeeKpis && data ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label={t('dashboard.students')} value={String(data.students)} />
            <Kpi label={t('dashboard.staff')} value={String(data.staff)} />
            <Kpi
              label={t('dashboard.attendanceToday')}
              value={rate !== null ? `${rate}%` : '—'}
              tone="aqua"
            />
            <Kpi
              label={t('dashboard.outstanding')}
              value={Number(data.finance.outstanding).toFixed(3)}
              tone="coral"
            />
            <Kpi
              label={t('dashboard.collectedMonth')}
              value={Number(data.finance.collectedThisMonth).toFixed(3)}
              tone="aqua"
            />
            <Kpi label={t('dashboard.einvoicePending')} value={String(data.einvoice.pending)} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{t('dashboard.attendanceToday')}</CardTitle>
                <CardDescription>
                  {att?.total ?? 0} {t('dashboard.markedSuffix')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {att ? (
                  <>
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
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('dashboard.noRecentActivity')}</p>
                ) : (
                  <Timeline>
                    {data.recentActivity.map((a, i) => (
                      <TimelineItem
                        key={i}
                        title={a.action}
                        meta={a.entityType}
                        timestamp={new Date(a.at).toLocaleString()}
                      />
                    ))}
                  </Timeline>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
      {canSeeKpis && error && !data ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.overviewUnavailable')}</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href as never} className="group">
            <Card className="h-full transition group-hover:border-primary/40 group-hover:shadow-glow">
              <CardHeader>
                <CardTitle>{t(l.labelKey)}</CardTitle>
                <CardDescription>{t(l.descKey)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'aqua' | 'coral' }) {
  const cls = tone === 'aqua' ? 'text-aqua' : tone === 'coral' ? 'text-coral' : '';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`font-display text-2xl font-semibold ${cls}`}>{value}</div>
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
        <span className="font-mono">{n}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
