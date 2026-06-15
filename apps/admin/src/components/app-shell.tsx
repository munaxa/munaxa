'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { logout, type Principal } from '@/lib/auth';
import { clearPrincipalCache } from '@/lib/session';
import { Button } from './ui/button';
import { Logo } from './logo';
import { ThemeLocaleToggle } from './theme-locale-toggle';
import { useI18n } from './i18n-provider';

interface NavItem {
  href: string;
  labelKey: string;
  /** Permission required to see this item; omitted = always visible. */
  perm?: string;
}

const NAV: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard' },
  { href: '/structure/schools', labelKey: 'nav.structure', perm: 'school:manage' },
  { href: '/structure/academic', labelKey: 'nav.academicStructure', perm: 'school:manage' },
  { href: '/people/students', labelKey: 'nav.people', perm: 'student:manage' },
  { href: '/people/teachers', labelKey: 'nav.teachers', perm: 'teacher:manage' },
  { href: '/people/parents', labelKey: 'nav.parents', perm: 'parent:manage' },
  { href: '/people/employees', labelKey: 'nav.hr', perm: 'employee:manage' },
  { href: '/people/cards', labelKey: 'nav.cards', perm: 'card:read' },
  { href: '/timetable', labelKey: 'nav.timetable', perm: 'timetable:read' },
  { href: '/attendance', labelKey: 'nav.attendance', perm: 'attendance:read' },
  { href: '/academics', labelKey: 'nav.academics', perm: 'grade:read' },
  { href: '/finance', labelKey: 'nav.finance', perm: 'finance:read' },
  { href: '/communication', labelKey: 'nav.communication', perm: 'announcement:manage' },
  { href: '/fleet', labelKey: 'nav.fleet', perm: 'bus:read' },
  { href: '/library', labelKey: 'nav.library', perm: 'library:read' },
  { href: '/inventory', labelKey: 'nav.inventory', perm: 'inventory:read' },
  { href: '/clinic', labelKey: 'nav.clinic', perm: 'clinic:read' },
  { href: '/reports', labelKey: 'nav.reports', perm: 'report:read' },
  { href: '/modules', labelKey: 'nav.modules', perm: 'featureflag:manage' },
  { href: '/settings/integrations/jofotara', labelKey: 'nav.integrations', perm: 'finance:manage' },
  { href: '/settings/attendance', labelKey: 'nav.attendanceSettings', perm: 'attendance:read' },
  { href: '/settings/users', labelKey: 'nav.users', perm: 'user:manage' },
  { href: '/settings/roles', labelKey: 'nav.roles', perm: 'role:manage' },
  { href: '/platform/databases', labelKey: 'nav.tenantDatabases', perm: 'platform:tenant:manage' },
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
  const { t } = useI18n();
  const held = new Set(principal.permissions);
  const items = NAV.filter(
    (i) => !i.perm || held.has(i.perm) || principal.permissions.length === 0,
  );

  async function onLogout() {
    await logout();
    clearPrincipalCache();
    router.replace('/login');
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-card/40 p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-3">
          <Logo size={32} priority />
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
              {t(item.labelKey)}
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
              {principal.isPlatform ? t('shell.platformPlane') : t('shell.schoolPlane')}
            </span>
            <ThemeLocaleToggle />
            <Button variant="outline" size="sm" onClick={() => void onLogout()}>
              {t('auth.signOut')}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
