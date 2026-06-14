'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session-context';
import { useDemo } from '@/lib/demo-store/context';
import type { PersonaId } from '@/lib/rbac';
import { Button } from './ui';
import { Logo } from './logo';
import { ThemeLocaleToggle } from './theme-locale-toggle';
import { RoleSwitcher } from './role-switcher';
import { useOnboarding } from './onboarding-tour';

interface NavItem {
  href: string;
  labelKey: string;
  perm?: string;
  personas?: PersonaId[];
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard' },
  { href: '/admissions', labelKey: 'nav.admissions', perm: 'student:manage' },
  { href: '/students', labelKey: 'nav.students', perm: 'student:manage' },
  { href: '/attendance', labelKey: 'nav.attendance', perm: 'attendance:read' },
  { href: '/academics', labelKey: 'nav.academics', perm: 'grade:read' },
  { href: '/finance', labelKey: 'nav.finance', perm: 'finance:read' },
  { href: '/hr', labelKey: 'nav.hr', perm: 'employee:manage' },
  { href: '/transport', labelKey: 'nav.transport', perm: 'bus:read' },
  { href: '/library', labelKey: 'nav.library', perm: 'library:read' },
  { href: '/communication', labelKey: 'nav.communication', perm: 'announcement:read' },
  { href: '/events', labelKey: 'nav.events' },
  { href: '/reports', labelKey: 'nav.reports', perm: 'report:read' },
  { href: '/analytics', labelKey: 'nav.analytics', perm: 'report:read' },
  { href: '/portal/parent', labelKey: 'nav.parentPortal', personas: ['parent'] },
  { href: '/portal/student', labelKey: 'nav.studentPortal', personas: ['student'] },
  { href: '/portal/teacher', labelKey: 'nav.teacherPortal', personas: ['teacher'] },
  { href: '/admin/requests', labelKey: 'nav.requests', adminOnly: true },
  { href: '/admin/accounts', labelKey: 'nav.accounts', adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, can, persona, org, isAdmin, locked, locale, logout } = useSession();
  const { data } = useDemo();
  const onboarding = useOnboarding();

  const items = NAV.filter((i) => {
    if (i.adminOnly && !isAdmin) return false;
    if (i.personas && !i.personas.includes(persona.id)) return false;
    return can(i.perm);
  });

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <div className="flex min-h-[calc(100vh-2.25rem)]">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-card/40 p-4 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <Logo size={32} priority />
          <span className="font-display text-lg font-semibold">{data.school.nameEn}</span>
        </Link>

        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
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
          <p className="font-medium text-foreground">{persona.displayName}</p>
          <p className="truncate text-muted-foreground">
            {locale === 'ar' ? persona.nameAr : persona.nameEn}
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">{org}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <span className="font-display text-sm font-medium text-muted-foreground md:hidden">
            {data.school.nameEn}
          </span>
          <div className="ms-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">Viewing as</span>
            {locked ? (
              <span className="rounded-lg border border-border px-2.5 py-1.5 text-sm">
                {locale === 'ar' ? persona.nameAr : persona.nameEn}
              </span>
            ) : (
              <RoleSwitcher />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onboarding.open}
              aria-label="Open guided walkthrough"
            >
              Guide
            </Button>
            <ThemeLocaleToggle />
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              {t('common.signOut')}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
