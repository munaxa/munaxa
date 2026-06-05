'use client';

import Link from 'next/link';
import { Shell, usePrincipal } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

const QUICK_LINKS: Array<{ href: string; labelKey: string; desc: string; perm?: string }> = [
  {
    href: '/people/students',
    labelKey: 'nav.people',
    desc: 'Students, parents, staff',
    perm: 'student:manage',
  },
  {
    href: '/attendance',
    labelKey: 'nav.attendance',
    desc: 'Daily marking & history',
    perm: 'attendance:read',
  },
  {
    href: '/academics',
    labelKey: 'nav.academics',
    desc: 'Homework, grades, behavior',
    perm: 'grade:read',
  },
  {
    href: '/finance',
    labelKey: 'nav.finance',
    desc: 'Charges, receipts, balances',
    perm: 'finance:read',
  },
  {
    href: '/reports',
    labelKey: 'nav.reports',
    desc: 'Attendance, academic, financial',
    perm: 'report:read',
  },
  {
    href: '/modules',
    labelKey: 'nav.modules',
    desc: 'Enable optional features',
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href as never} className="group">
            <Card className="h-full transition group-hover:border-primary/40 group-hover:shadow-glow">
              <CardHeader>
                <CardTitle>{t(l.labelKey)}</CardTitle>
                <CardDescription>{l.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('dashboard.yourAccess')}</CardTitle>
            <CardDescription>{t('dashboard.yourAccessDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('dashboard.roles')} value={principal.roles.join(', ') || '—'} />
            <Row
              label={t('dashboard.plane')}
              value={principal.isPlatform ? t('shell.platformPlane') : t('shell.schoolPlane')}
            />
            <Row label={t('dashboard.tenant')} value={principal.tenantId} mono />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.permissions')}</CardTitle>
            <CardDescription>{principal.permissions.length}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {principal.permissions.map((p) => (
              <Badge key={p} tone="muted" className="font-mono">
                {p}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'truncate font-mono text-xs' : 'text-end'}>{value}</span>
    </div>
  );
}
