'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { Logo } from '@/components/logo';
import { Button, Card, CardContent, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Logo size={72} priority className="mx-auto" />
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
