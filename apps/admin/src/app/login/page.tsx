'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { Button, Card, CardContent, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({
        email,
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-grad-primary font-display text-xl font-bold text-primary-foreground shadow-glow">
            M
          </span>
          <h1 className="font-display text-2xl font-semibold">{t('auth.welcome')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.signInToSchool')}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <Field label={t('auth.school')} htmlFor="tenant">
                <Input
                  id="tenant"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="green-valley"
                  autoComplete="organization"
                />
              </Field>

              <Field label={t('auth.email')} htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field label={t('auth.password')} htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? `${t('common.loading')}` : t('auth.signIn')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
