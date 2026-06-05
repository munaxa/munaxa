'use client';

import Link from 'next/link';
import { Shell, usePrincipal } from '@/components/shell';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

const QUICK_LINKS: Array<{ href: string; label: string; desc: string; perm?: string }> = [
  {
    href: '/people/students',
    label: 'People',
    desc: 'Students, parents, staff',
    perm: 'student:manage',
  },
  {
    href: '/attendance',
    label: 'Attendance',
    desc: 'Daily marking & history',
    perm: 'attendance:read',
  },
  {
    href: '/academics',
    label: 'Academics',
    desc: 'Homework, grades, behavior',
    perm: 'grade:read',
  },
  { href: '/finance', label: 'Finance', desc: 'Charges, receipts, balances', perm: 'finance:read' },
  {
    href: '/reports',
    label: 'Reports',
    desc: 'Attendance, academic, financial',
    perm: 'report:read',
  },
  {
    href: '/modules',
    label: 'Modules',
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
  const held = new Set(principal.permissions);
  const links = QUICK_LINKS.filter((l) => !l.perm || held.has(l.perm));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back. Here&apos;s quick access to the areas you can manage.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href as never} className="group">
            <Card className="h-full transition group-hover:border-primary/40 group-hover:shadow-glow">
              <CardHeader>
                <CardTitle>{l.label}</CardTitle>
                <CardDescription>{l.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your access</CardTitle>
            <CardDescription>Roles and plane for this session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Roles" value={principal.roles.join(', ') || '—'} />
            <Row label="Plane" value={principal.isPlatform ? 'Platform' : 'School'} />
            <Row label="Tenant" value={principal.tenantId} mono />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>{principal.permissions.length} granted</CardDescription>
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
