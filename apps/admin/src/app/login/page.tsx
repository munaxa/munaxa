'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { Logo } from '@/components/logo';

// Typed as a plain string so the cast below is required under Next's typedRoutes (the route
// registry isn't generated during standalone typecheck) — matching the app's href convention.
const forgotPasswordHref = '/forgot-password' as never;

const REMEMBER_KEY = 'munaxa.remember';
const IDENTIFIER_KEY = 'munaxa.identifier';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');
  const [showSchool, setShowSchool] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore a remembered email so returning users only type their password.
  useEffect(() => {
    try {
      if (localStorage.getItem(REMEMBER_KEY) === '1') {
        setRemember(true);
        setIdentifier(localStorage.getItem(IDENTIFIER_KEY) ?? '');
      }
    } catch {
      /* ignore storage access errors */
    }
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({
        identifier,
        password,
        ...(tenantSlug ? { tenantSlug } : {}),
      });
      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, '1');
          localStorage.setItem(IDENTIFIER_KEY, identifier);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
          localStorage.removeItem(IDENTIFIER_KEY);
        }
      } catch {
        /* ignore storage access errors */
      }
      router.push(result.mustChangePassword ? '/change-password' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-grad-hero relative min-h-screen bg-background text-foreground">
      {/* Ambient violet bloom on the right, echoing the reference's studio light. */}
      <div className="login-glow pointer-events-none absolute end-0 top-1/4 h-[480px] w-[480px] opacity-60 blur-2xl" />

      <ThemeToggle />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 lg:px-10">
        {/* Brand lockup. */}
        <header className="flex items-center gap-3">
          <Logo size={40} priority />
          <div className="leading-tight">
            <p className="font-display text-2xl font-bold lowercase tracking-tight">munaxa</p>
            <p className="text-xs text-muted-foreground">School OS</p>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-2 lg:gap-16">
          <BrandPanel t={t} />

          {/* Sign-in card. */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
              <h1 className="font-display text-3xl font-bold">{t('auth.welcomeBack')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInContinue')}</p>

              <form onSubmit={(e) => void onSubmit(e)} className="mt-7 space-y-5">
                <Field label={t('auth.emailAddress')}>
                  {(id) => (
                    <InputWithIcon icon={<MailIcon />}>
                      <input
                        id={id}
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        autoComplete="username"
                        placeholder={t('auth.emailPlaceholder')}
                        className="w-full bg-transparent py-3 pe-3 ps-11 text-sm outline-none placeholder:text-muted-foreground/70"
                      />
                    </InputWithIcon>
                  )}
                </Field>

                <Field label={t('auth.password')}>
                  {(id) => (
                    <InputWithIcon icon={<LockIcon />}>
                      <input
                        id={id}
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        placeholder="••••••••••"
                        className="w-full bg-transparent py-3 pe-11 ps-11 text-sm outline-none placeholder:text-muted-foreground/70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </InputWithIcon>
                  )}
                </Field>

                {showSchool ? (
                  <Field label={t('auth.school')}>
                    {(id) => (
                      <InputWithIcon icon={<SchoolIcon />}>
                        <input
                          id={id}
                          value={tenantSlug}
                          onChange={(e) => setTenantSlug(e.target.value)}
                          autoComplete="organization"
                          placeholder="green-valley"
                          className="w-full bg-transparent py-3 pe-3 ps-11 text-sm outline-none placeholder:text-muted-foreground/70"
                        />
                      </InputWithIcon>
                    )}
                  </Field>
                ) : null}

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {t('auth.rememberMe')}
                  </label>
                  <Link
                    href={forgotPasswordHref}
                    className="font-medium text-primary hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-grad-primary w-full rounded-xl py-3 font-display font-semibold text-white shadow-glow transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? t('common.loading') : t('auth.signIn')}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-muted-foreground">
                {t('auth.needHelp')}{' '}
                {!showSchool ? (
                  <button
                    type="button"
                    onClick={() => setShowSchool(true)}
                    className="font-medium text-primary hover:underline"
                  >
                    {t('auth.specificSchool')}
                  </button>
                ) : (
                  <span className="font-medium text-primary">{t('auth.contactAdmin')}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <footer className="pb-2 pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Munaxa School OS. {t('auth.rightsReserved')}
        </footer>
      </div>
    </main>
  );
}

/** Left marketing column: headline, blurb, a dashboard preview, and compliance badges. */
function BrandPanel({ t }: { t: (k: string) => string }) {
  return (
    <section className="hidden flex-col lg:flex">
      <h2 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
        {t('auth.marketingTitle1')}
        <br />
        <span className="text-primary">{t('auth.marketingTitle2')}</span>
      </h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        {t('auth.marketingSubtitle')}
      </p>

      <DashboardPreview />

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Badge icon={<ShieldIcon />} title="ISO 27001" sub={t('auth.badgeCertified')} />
        <Badge icon={<CheckBadgeIcon />} title="GDPR" sub={t('auth.badgeReady')} />
        <Badge icon={<JordanFlag />} title={t('auth.badgeEinvoice')} sub={t('auth.badgeReady')} />
      </div>
    </section>
  );
}

/** A compact, non-interactive mock of the admin dashboard for marketing flavour. */
function DashboardPreview() {
  const nav = [
    'Dashboard',
    'Students',
    'Teachers',
    'Classes',
    'Attendance',
    'Exams',
    'Finance',
    'Library',
    'Reports',
    'Settings',
  ];
  const stats = [
    { label: 'Students', value: '1,248', delta: '+12%' },
    { label: 'Teachers', value: '96', delta: '+8%' },
    { label: 'Attendance', value: '92.6%', delta: '+5%' },
    { label: 'Revenue', value: '$24,860', delta: '+7%' },
  ];
  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* Violet wash suggesting the building photo in the reference. */}
      <div className="login-glow pointer-events-none absolute -end-10 -top-10 h-56 w-56 opacity-40 blur-2xl" />
      <div className="relative flex">
        {/* Mini sidebar. */}
        <aside className="hidden w-28 shrink-0 border-e border-border bg-background/40 p-2.5 sm:block">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <Logo size={14} />
            <span className="font-display text-[10px] font-bold lowercase">munaxa</span>
          </div>
          <ul className="space-y-0.5">
            {nav.map((item, i) => (
              <li
                key={item}
                className={`rounded-md px-2 py-1 text-[9px] ${
                  i === 0 ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground'
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main panel. */}
        <div className="flex-1 p-3">
          <p className="mb-2 text-[11px] font-semibold">Dashboard</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-background/50 p-2">
                <p className="text-[8px] text-muted-foreground">{s.label}</p>
                <p className="text-[12px] font-bold leading-tight">{s.value}</p>
                <p className="text-[8px] font-medium text-success">{s.delta} vs last month</p>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-lg border border-border bg-background/50 p-2.5">
            <p className="mb-1 text-[9px] font-medium text-muted-foreground">Attendance Overview</p>
            <AreaChart />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniList
              title="Recent Activities"
              rows={['New student enrolled', 'Exam scheduled', 'Fee payment received']}
            />
            <MiniList
              title="Calendar"
              rows={['Staff Meeting', 'Parent Teacher Meeting', 'Midterm Exams Start']}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2">
      <p className="mb-1 text-[9px] font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span className="truncate text-[8px] text-foreground/80">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tiny area chart drawn with the brand violet. */
function AreaChart() {
  const id = useId();
  const pts = [18, 12, 22, 16, 26, 20, 30, 24, 34, 28, 38, 30];
  const w = 240;
  const h = 44;
  const step = w / (pts.length - 1);
  const max = Math.max(...pts) + 6;
  const coords: Array<[number, number]> = pts.map((p, i) => [i * step, h - (p / max) * h]);
  const line = coords
    .map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-11 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.35" />
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" className="stroke-primary" strokeWidth="1.5" />
    </svg>
  );
}

function Badge({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-semibold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/** Label + input wrapper that supplies a stable id to its child render-prop. */
function Field({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function InputWithIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border border-input bg-background/50 transition-colors focus-within:border-primary">
      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
        {icon}
      </span>
      {children}
    </div>
  );
}

const THEME_KEY = 'munaxa.theme';
type Theme = 'light' | 'dark';

/**
 * Segmented light/dark switch. Persists to the shared `munaxa.theme` key and toggles `.dark` on
 * <html> (the root layout reads the same key before paint, so the choice carries into the app).
 * Renders the active state only after mount to avoid a hydration mismatch with the light default.
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
    setMounted(true);
  }, []);

  function set(next: Theme) {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  const active = mounted ? theme : 'light';
  return (
    <div className="absolute end-5 top-6 z-10 flex items-center gap-1 rounded-full border border-border bg-card p-1 lg:end-10">
      <button
        type="button"
        onClick={() => set('light')}
        aria-label="Light theme"
        aria-pressed={active === 'light'}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          active === 'light'
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <SunIcon />
      </button>
      <button
        type="button"
        onClick={() => set('dark')}
        aria-label="Dark theme"
        aria-pressed={active === 'dark'}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          active === 'dark'
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <MoonIcon />
      </button>
    </div>
  );
}

/* ---- icons (currentColor, inherit size unless noted) ---- */

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17 9V7a5 5 0 0 0-10 0v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3Zm-8-2a3 3 0 0 1 6 0v2H9V7Zm4 9.73V18a1 1 0 0 1-2 0v-1.27a2 2 0 1 1 2 0Z" />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 1 8l11 6 9-4.91V17h2V8L12 2Zm0 13.5L5 11.7V14c0 2.21 3.13 4 7 4s7-1.79 7-4v-2.3l-7 3.8Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.44M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 5.4-1.6" />
      <path d="m2 2 20 20" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckBadgeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3Z" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

/** Simplified Jordanian flag mark — colours via CSS classes keep raw hex out of the JSX. */
function JordanFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 30 20" aria-hidden="true" className="rounded-[2px]">
      <rect width="30" height="6.67" className="jo-black" />
      <rect y="6.67" width="30" height="6.67" className="jo-white" />
      <rect y="13.33" width="30" height="6.67" className="jo-green" />
      <path d="M0 0 13 10 0 20Z" className="jo-red" />
    </svg>
  );
}
