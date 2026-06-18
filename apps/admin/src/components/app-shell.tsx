'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { logout, type Principal } from '@/lib/auth';
import { clearPrincipalCache } from '@/lib/session';
import { advancedApi } from '@/lib/advanced';
import { Button } from '@munaxa/ui';
import { Logo } from './logo';
import { ThemeLocaleToggle } from './theme-locale-toggle';
import { GlobalSearch } from './global-search';
import { useI18n } from './i18n-provider';

interface NavItem {
  href: string;
  labelKey: string;
  /** Permission required to see this item; omitted = always visible. */
  perm?: string;
  /** Feature flag gating this item; when set, the item is hidden unless the flag is enabled. */
  flag?: string;
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
  { href: '/presence', labelKey: 'nav.presence', perm: 'presence:read' },
  { href: '/academics', labelKey: 'nav.academics', perm: 'grade:read' },
  { href: '/finance', labelKey: 'nav.finance', perm: 'finance:read' },
  { href: '/finance/fee-plans', labelKey: 'nav.feePlans', perm: 'finance:read' },
  { href: '/communication', labelKey: 'nav.communication', perm: 'announcement:manage' },
  { href: '/fleet', labelKey: 'nav.fleet', perm: 'bus:read', flag: 'bus_tracking' },
  { href: '/library', labelKey: 'nav.library', perm: 'library:read', flag: 'library_management' },
  {
    href: '/inventory',
    labelKey: 'nav.inventory',
    perm: 'inventory:read',
    flag: 'inventory_management',
  },
  { href: '/clinic', labelKey: 'nav.clinic', perm: 'clinic:read', flag: 'school_clinic' },
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
 * top bar. On small screens the sidebar collapses behind a hamburger toggle that opens the same
 * navigation as a slide-in drawer. RTL-safe (logical properties). Pages render inside `children`.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Enabled feature flags; `null` while loading so flagged items stay hidden until known.
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);

  // Global search keyboard shortcut: ⌘K / Ctrl-K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const held = new Set(principal.permissions);
  const items = NAV.filter(
    (i) =>
      (!i.perm || held.has(i.perm) || principal.permissions.length === 0) &&
      (!i.flag || flags?.[i.flag] === true),
  );

  // Load feature flags so disabled modules drop out of the navigation entirely.
  useEffect(() => {
    advancedApi
      .flags()
      .then((list) => setFlags(Object.fromEntries(list.map((f) => [f.key, f.enabled]))))
      .catch(() => setFlags({}));
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function onLogout() {
    await logout();
    clearPrincipalCache();
    router.replace('/login');
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const navLinks = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as never}
          className={cn(
            'rounded-md px-3 py-2 text-sm transition-colors',
            isActive(item.href)
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {t(item.labelKey)}
        </Link>
      ))}
    </nav>
  );

  const sessionFooter = (
    <div
      className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-xs"
      aria-label={`${principal.roles.join(', ') || '—'} · ${principal.tenantId}`}
    >
      <p className="truncate text-muted-foreground">{principal.roles.join(', ') || '—'}</p>
      <p
        className="truncate font-mono text-[10px] text-muted-foreground/70"
        title={principal.tenantId}
      >
        {principal.tenantId}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Skip link — first focusable element; jumps keyboard/SR users past the nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-toast focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-card"
      >
        {t('shell.skipToContent')}
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start overflow-y-auto border-e border-border bg-card p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-3">
          <Logo size={32} priority />
          <span className="font-display text-lg font-semibold">Munaxa</span>
        </div>
        <div className="mt-4 flex flex-1 flex-col">{navLinks}</div>
        {sessionFooter}
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-e border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between px-2 py-3">
              <div className="flex items-center gap-2">
                <Logo size={32} priority />
                <span className="font-display text-lg font-semibold">Munaxa</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMenuOpen(false)}
                aria-label={t('shell.closeMenu')}
              >
                ✕
              </Button>
            </div>
            <div className="mt-4 flex flex-1 flex-col">{navLinks}</div>
            {sessionFooter}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen(true)}
              aria-label={t('shell.openMenu')}
            >
              ☰
            </Button>
            <span className="font-display text-sm font-medium text-muted-foreground">Munaxa</span>
          </div>
          <div className="ms-auto flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              aria-label={t('search.title')}
              aria-keyshortcuts="Control+K Meta+K"
            >
              <span aria-hidden="true">⌕</span>
              <span className="hidden sm:inline">{t('search.title')}</span>
              <kbd className="hidden rounded border border-border px-1 font-mono text-[10px] text-muted-foreground sm:inline">
                ⌘K
              </kbd>
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {principal.isPlatform ? t('shell.platformPlane') : t('shell.schoolPlane')}
            </span>
            <ThemeLocaleToggle />
            <Button variant="outline" size="sm" onClick={() => void onLogout()}>
              {t('auth.signOut')}
            </Button>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} principal={principal} />
    </div>
  );
}
