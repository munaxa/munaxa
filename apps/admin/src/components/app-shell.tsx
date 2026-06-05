'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { logout, type Principal } from '@/lib/auth';
import { Button } from './ui/button';

interface NavItem {
  href: string;
  label: string;
  /** Permission required to see this item; omitted = always visible. */
  perm?: string;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/structure/schools', label: 'School structure', perm: 'school:manage' },
  { href: '/people/students', label: 'People', perm: 'student:manage' },
  { href: '/timetable', label: 'Timetable', perm: 'timetable:read' },
  { href: '/attendance', label: 'Attendance', perm: 'attendance:read' },
  { href: '/academics', label: 'Academics', perm: 'grade:read' },
  { href: '/finance', label: 'Finance', perm: 'finance:read' },
  { href: '/communication', label: 'Communication', perm: 'announcement:manage' },
  { href: '/reports', label: 'Reports', perm: 'report:read' },
  { href: '/modules', label: 'Modules', perm: 'featureflag:manage' },
];

/**
 * Authenticated application shell: a brand sidebar with permission-filtered navigation and a
 * top bar. RTL-safe (logical properties). Pages render inside `children`.
 */
export function AppShell({
  principal,
  children,
}: {
  principal: Principal;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const held = new Set(principal.permissions);
  const items = NAV.filter(
    (i) => !i.perm || held.has(i.perm) || principal.permissions.length === 0,
  );

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-card/40 p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary font-display text-sm font-bold text-primary-foreground shadow-glow">
            M
          </span>
          <span className="font-display text-lg font-semibold">Munaxa</span>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href as never}
              className={cn(
                'rounded-lg px-3 py-2 text-sm transition',
                isActive(item.href)
                  ? 'bg-secondary/80 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-xs">
          <p className="truncate text-muted-foreground">{principal.roles.join(', ') || '—'}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground/70">
            {principal.tenantId}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <span className="font-display text-sm font-medium text-muted-foreground md:hidden">
            Munaxa
          </span>
          <div className="ms-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {principal.isPlatform ? 'Platform' : 'School'} plane
            </span>
            <Button variant="outline" size="sm" onClick={() => void onLogout()}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
