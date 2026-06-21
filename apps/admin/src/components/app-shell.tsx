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
import { NavIcon, type NavIconKey } from './nav-icons';

interface NavItem {
  href: string;
  labelKey: string;
  /** Sidebar icon (see nav-icons.tsx). */
  icon: NavIconKey;
  /** Permission required to see this item; omitted = always visible. */
  perm?: string;
  /** Feature flag gating this item; when set, the item is hidden unless the flag is enabled. */
  flag?: string;
}

/** Enterprise grouped navigation (Munaxa DS ENTERPRISE_NAVIGATION): items organised by domain
 *  under section headers. A section is hidden entirely when none of its items are permitted. */
interface NavGroup {
  titleKey?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: '/', labelKey: 'nav.dashboard', icon: 'dashboard' }] },
  {
    titleKey: 'nav.section.people',
    items: [
      {
        href: '/enrollment',
        labelKey: 'nav.enrollment',
        icon: 'enrollment',
        perm: 'finance:manage',
      },
      {
        href: '/people/students',
        labelKey: 'nav.people',
        icon: 'students',
        perm: 'student:manage',
      },
      {
        href: '/people/teachers',
        labelKey: 'nav.teachers',
        icon: 'teachers',
        perm: 'teacher:manage',
      },
      { href: '/people/parents', labelKey: 'nav.parents', icon: 'parents', perm: 'parent:manage' },
      { href: '/people/employees', labelKey: 'nav.hr', icon: 'employees', perm: 'employee:manage' },
      { href: '/people/cards', labelKey: 'nav.cards', icon: 'cards', perm: 'card:read' },
    ],
  },
  {
    titleKey: 'nav.section.academics',
    items: [
      { href: '/timetable', labelKey: 'nav.timetable', icon: 'timetable', perm: 'timetable:read' },
      {
        href: '/attendance',
        labelKey: 'nav.attendance',
        icon: 'attendance',
        perm: 'attendance:read',
      },
      { href: '/presence', labelKey: 'nav.presence', icon: 'presence', perm: 'presence:read' },
      { href: '/academics', labelKey: 'nav.academics', icon: 'academics', perm: 'grade:read' },
    ],
  },
  {
    titleKey: 'nav.section.finance',
    items: [
      { href: '/finance', labelKey: 'nav.finance', icon: 'finance', perm: 'finance:read' },
      {
        href: '/finance/collections',
        labelKey: 'nav.collections',
        icon: 'collections',
        perm: 'finance:read',
      },
      {
        href: '/finance/fee-plans',
        labelKey: 'nav.feePlans',
        icon: 'feePlans',
        perm: 'finance:read',
      },
      {
        href: '/finance/fee-config',
        labelKey: 'nav.feeConfig',
        icon: 'feeConfig',
        perm: 'finance:manage',
      },
    ],
  },
  {
    titleKey: 'nav.section.operations',
    items: [
      {
        href: '/communication',
        labelKey: 'nav.communication',
        icon: 'communication',
        perm: 'announcement:manage',
      },
      {
        href: '/fleet',
        labelKey: 'nav.fleet',
        icon: 'fleet',
        perm: 'bus:read',
        flag: 'bus_tracking',
      },
      {
        href: '/library',
        labelKey: 'nav.library',
        icon: 'library',
        perm: 'library:read',
        flag: 'library_management',
      },
      {
        href: '/inventory',
        labelKey: 'nav.inventory',
        icon: 'inventory',
        perm: 'inventory:read',
        flag: 'inventory_management',
      },
      {
        href: '/clinic',
        labelKey: 'nav.clinic',
        icon: 'clinic',
        perm: 'clinic:read',
        flag: 'school_clinic',
      },
    ],
  },
  {
    titleKey: 'nav.section.reports',
    items: [{ href: '/reports', labelKey: 'nav.reports', icon: 'reports', perm: 'report:read' }],
  },
  {
    titleKey: 'nav.section.settings',
    items: [
      {
        href: '/structure/schools',
        labelKey: 'nav.structure',
        icon: 'structure',
        perm: 'school:manage',
      },
      {
        href: '/structure/academic',
        labelKey: 'nav.academicStructure',
        icon: 'academicStructure',
        perm: 'school:manage',
      },
      { href: '/modules', labelKey: 'nav.modules', icon: 'modules', perm: 'featureflag:manage' },
      {
        href: '/settings/integrations/jofotara',
        labelKey: 'nav.integrations',
        icon: 'integrations',
        perm: 'finance:manage',
      },
      {
        href: '/settings/attendance',
        labelKey: 'nav.attendanceSettings',
        icon: 'settings',
        perm: 'attendance:read',
      },
      { href: '/settings/users', labelKey: 'nav.users', icon: 'users', perm: 'user:manage' },
      { href: '/settings/roles', labelKey: 'nav.roles', icon: 'roles', perm: 'role:manage' },
      {
        href: '/platform/databases',
        labelKey: 'nav.tenantDatabases',
        icon: 'databases',
        perm: 'platform:tenant:manage',
      },
    ],
  },
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
  // Collapsed (icon-rail) vs. expanded sidebar; persisted across sessions.
  const [collapsed, setCollapsed] = useState(false);
  // Enabled feature flags; `null` while loading so flagged items stay hidden until known.
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem('munaxa.nav.collapsed') === '1');
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      localStorage.setItem('munaxa.nav.collapsed', c ? '0' : '1');
      return !c;
    });

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
  // Fail closed: an item is visible only when the user actually holds its permission (platform
  // super-admins see everything). A user with no permissions sees no permissioned items — the
  // API enforces the same permissions server-side, so this just keeps the nav honest.
  const canSee = (i: NavItem) =>
    (!i.perm || held.has(i.perm) || principal.isPlatform) && (!i.flag || flags?.[i.flag] === true);

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

  // `mini` renders the icon-only rail (desktop collapsed); the mobile drawer always passes false.
  const renderNav = (mini: boolean) => (
    <nav className={cn('flex flex-1 flex-col', mini ? 'gap-2' : 'gap-5')}>
      {NAV_GROUPS.map((group, gi) => {
        const groupItems = group.items.filter(canSee);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.titleKey ?? gi} className="flex flex-col gap-1">
            {group.titleKey ? (
              mini ? (
                <div className="mx-auto my-1 h-px w-6 bg-border" aria-hidden="true" />
              ) : (
                <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {t(group.titleKey)}
                </p>
              )
            ) : null}
            {groupItems.map((item) => {
              const active = isActive(item.href);
              // next typedRoutes: hrefs come from this static nav table rather than literal route
              // types, so the cast is required by `next build` even though local tooling can't see it.
              const href = item.href as never;
              return (
                <Link
                  key={item.href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  title={mini ? t(item.labelKey) : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg text-sm transition-colors',
                    mini ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                    active
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <NavIcon name={item.icon} className="shrink-0" />
                  {!mini ? <span className="truncate">{t(item.labelKey)}</span> : null}
                </Link>
              );
            })}
          </div>
        );
      })}
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
      {/* Desktop sidebar — floating, collapsible icon rail ⇄ labelled panel. */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 self-start p-3 transition-[width] duration-300 ease-in-out md:block',
          collapsed ? 'w-[84px]' : 'w-64',
        )}
      >
        <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card/80 p-3 shadow-card backdrop-blur">
          {/* Brand */}
          <div
            className={cn(
              'flex items-center gap-2 py-2',
              collapsed ? 'justify-center px-0' : 'px-2',
            )}
          >
            <Logo size={32} priority />
            {!collapsed ? <span className="font-display text-lg font-semibold">Munaxa</span> : null}
          </div>

          {/* Collapse / expand toggle on the rail edge */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('shell.expandNav') : t('shell.collapseNav')}
            aria-pressed={!collapsed}
            title={collapsed ? t('shell.expandNav') : t('shell.collapseNav')}
            className="absolute -end-2.5 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-colors hover:text-foreground"
          >
            <ChevronIcon expanded={!collapsed} />
          </button>

          <div className="scrollbar-none mt-3 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {renderNav(collapsed)}
          </div>
          {!collapsed ? sessionFooter : null}
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="scrollbar-none absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-e border-border bg-card p-4 shadow-xl">
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
            <div className="mt-4 flex flex-1 flex-col">{renderNav(false)}</div>
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

/** Rail toggle chevron — points "in" when expanded, "out" when collapsed. RTL-safe via flip. */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('transition-transform rtl:-scale-x-100', expanded ? '' : 'rotate-180')}
    >
      <path d="m14 6-6 6 6 6" />
    </svg>
  );
}
