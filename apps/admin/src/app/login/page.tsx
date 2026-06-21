'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { Logo } from '@/components/logo';
import { Button, Field, Input } from '@/components/ui';

// Typed as a plain string so the cast below is required under Next's typedRoutes (the route
// registry isn't generated during standalone typecheck) — matching the app's href convention.
const forgotPasswordHref = '/forgot-password' as never;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');
  const [showSchool, setShowSchool] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      router.push(result.mustChangePassword ? '/change-password' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Left: brand hero (hidden on small screens). */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-grad-primary p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <Logo size={36} priority />
          <span className="font-display text-xl font-semibold">Munaxa</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="font-display text-4xl font-bold leading-tight">{t('auth.heroTitle')}</h2>
          <p className="text-base leading-relaxed text-white/80">{t('auth.heroSubtitle')}</p>
        </div>
        <p className="text-sm text-white/60">{t('auth.heroFooter')}</p>
      </section>

      {/* Right: sign-in form. */}
      <section className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Brand for small screens where the hero is hidden. */}
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={32} priority />
            <span className="font-display text-lg font-semibold">Munaxa</span>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold">{t('auth.signIn')}</h1>
            <p className="text-sm text-muted-foreground">{t('auth.signInToSchool')}</p>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <Field label={t('auth.identifier')} htmlFor="identifier">
              <Input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="name@school.edu.jo"
              />
            </Field>

            <Field label={t('auth.password')} htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                  title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            {showSchool ? (
              <Field label={t('auth.school')} htmlFor="tenant">
                <Input
                  id="tenant"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="green-valley"
                  autoComplete="organization"
                />
              </Field>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? `${t('common.loading')}` : t('auth.signIn')}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            {!showSchool ? (
              <button
                type="button"
                onClick={() => setShowSchool(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('auth.specificSchool')}
              </button>
            ) : (
              <span />
            )}
            <Link href={forgotPasswordHref} className="font-medium text-primary hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>
      </section>
    </main>
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
