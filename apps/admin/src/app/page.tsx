'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@munaxa/ui';
import { getMe, logout, tokenStore, type Principal } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace('/login');
      return;
    }
    getMe()
      .then(setPrincipal)
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl font-semibold">Munaxa</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/structure/schools"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            School structure
          </Link>
          <Link
            href="/people/students"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Students
          </Link>
          <Link
            href="/timetable"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Timetable
          </Link>
          <Link
            href="/attendance"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Attendance
          </Link>
          <Link
            href="/academics"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Academics
          </Link>
          <Link
            href="/finance"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Finance
          </Link>
          <Link
            href="/communication"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Communication
          </Link>
          <button
            onClick={() => void onLogout()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Sign out
          </button>
        </nav>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 font-medium">Your access</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Tenant" value={principal?.tenantId ?? '—'} />
          <Row label="Roles" value={principal?.roles.join(', ') || '—'} />
          <Row label="Plane" value={principal?.isPlatform ? 'Platform' : 'School'} />
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 font-medium">Permissions ({principal?.permissions.length ?? 0})</h2>
        <div className="flex flex-wrap gap-1.5">
          {principal?.permissions.map((p) => (
            <span
              key={p}
              className={cn(
                'rounded-md border border-border px-2 py-0.5 font-mono text-xs',
                'text-muted-foreground',
              )}
            >
              {p}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
