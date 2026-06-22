'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { Logo } from '@/components/logo';

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
    <main className="login-bg flex min-h-screen items-center justify-center p-4">
      <div className="login-card relative w-full max-w-sm overflow-hidden rounded-[2rem]">
        {/* Content sits above the wave (z-10); pb leaves room for the wave + legal text. */}
        <div className="relative z-10 flex flex-col px-8 pb-32 pt-12">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo size={56} priority />
            <div className="space-y-1">
              <h1 className="login-heading font-display text-xl font-semibold">
                {t('auth.welcome')}
              </h1>
              <p className="login-sub text-sm">{t('auth.signInToSchool')}</p>
            </div>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-2">
            <FloatingField
              label={t('auth.identifier')}
              value={identifier}
              onChange={setIdentifier}
              type="text"
              autoComplete="username"
              icon={<UserIcon />}
            />

            <FloatingField
              label={t('auth.password')}
              value={password}
              onChange={setPassword}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              icon={<LockIcon />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                  title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="login-eye"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            {showSchool ? (
              <FloatingField
                label={t('auth.school')}
                value={tenantSlug}
                onChange={setTenantSlug}
                type="text"
                autoComplete="organization"
                icon={<SchoolIcon />}
              />
            ) : null}

            {error ? (
              <p className="login-error pt-1 text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="login-button font-display text-base"
            >
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            <Link href={forgotPasswordHref} className="login-link font-medium hover:underline">
              {t('auth.forgotPassword')}
            </Link>
            {!showSchool ? (
              <button type="button" onClick={() => setShowSchool(true)} className="login-muted">
                {t('auth.specificSchool')}
              </button>
            ) : null}
          </div>
        </div>

        {/* Animated brand wave + legal footer, clipped to the card's rounded corners. */}
        <BrandWave />
        <p className="login-legal absolute inset-x-0 bottom-4 z-10 px-8 text-center text-[11px] leading-relaxed">
          {t('auth.heroFooter')}
        </p>
      </div>
    </main>
  );
}

/**
 * Underline input with a floating label and a leading brand icon. The label rides on the baseline
 * as a placeholder and animates up + turns violet on focus or once a value is present — driven by
 * the input's :focus / :placeholder-shown state (see .login-input rules in globals.css). The input
 * is rendered before the label/icon so the CSS general-sibling selectors can target them.
 */
function FloatingField({
  label,
  value,
  onChange,
  type,
  autoComplete,
  icon,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="login-field">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        placeholder=" "
        className="login-input"
      />
      <label htmlFor={id} className="login-field-label">
        {label}
      </label>
      <span className="login-field-icon">{icon}</span>
      {trailing}
    </div>
  );
}

/** Three stacked, horizontally-flowing waves in the Munaxa gradient (aqua → violet). */
function BrandWave() {
  return (
    <div className="login-wave" aria-hidden="true">
      <WaveSvg className="w1" id="login-grad-1" mid={80} amp={30} />
      <WaveSvg className="w2" id="login-grad-2" mid={68} amp={38} />
      <WaveSvg className="w3" id="login-grad-3" mid={96} amp={26} />
    </div>
  );
}

function WaveSvg({
  className,
  id,
  mid,
  amp,
}: {
  className: string;
  id: string;
  mid: number;
  amp: number;
}) {
  // A periodic wave 2880 units wide (6 humps of period 480). Translating the <svg> by -50%
  // (one 1440-unit block of 3 humps) lands on an identical phase, so the loop is seamless.
  // Stop colours are set per-wave in globals.css (keeps raw hex out of the JSX).
  const width = 2880;
  const period = 480;
  let d = `M 0 ${mid}`;
  for (let x = 0; x < width; x += period) {
    d += ` Q ${x + period * 0.25} ${mid - amp} ${x + period * 0.5} ${mid}`;
    d += ` Q ${x + period * 0.75} ${mid + amp} ${x + period} ${mid}`;
  }
  d += ` L ${width} 200 L 0 200 Z`;
  return (
    <svg className={className} viewBox="0 0 2880 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" />
          <stop offset="50%" />
          <stop offset="100%" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-3.31-3.58-6-8-6Z" />
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
