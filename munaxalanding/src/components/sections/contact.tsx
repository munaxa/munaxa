'use client';

import { useState, type FormEvent } from 'react';
import Script from 'next/script';
import { Mail, Phone, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTACT_EMAIL } from '@/lib/constants';
import type { Dictionary } from '@/lib/i18n/types';

type Status = 'idle' | 'submitting' | 'success' | 'error';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : '';
}

/** Reads a form field as a string, treating non-string entries (e.g. File) as empty. */
function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Contact({ dict, nonce }: { dict: Dictionary; nonce?: string | undefined }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const form = dict.contact.form;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);

    const payload = {
      name: getFormString(formData, 'name'),
      schoolName: getFormString(formData, 'schoolName'),
      email: getFormString(formData, 'email'),
      phone: getFormString(formData, 'phone'),
      message: getFormString(formData, 'message'),
      website: getFormString(formData, 'website'), // honeypot
      csrfToken: getCookie('csrf_token'),
      turnstileToken: getFormString(formData, 'cf-turnstile-response'),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result: { ok: boolean; error?: string } = await response.json();

      if (!response.ok || !result.ok) {
        setStatus('error');
        setError(result.error ?? form.errorDefault);
        return;
      }

      setStatus('success');
      formEl.reset();
    } catch {
      setStatus('error');
      setError(form.networkError);
    }
  }

  return (
    <section id="contact" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {dict.contact.heading}
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              {dict.contact.description}
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <Mail className="h-5 w-5" aria-hidden />
                </span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:text-primary">
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <Phone className="h-5 w-5" aria-hidden />
                </span>
                {dict.contact.responseTime}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                {dict.contact.servingArea}
              </div>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{form.name}</Label>
                <Input id="name" name="name" autoComplete="name" required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="schoolName">{form.schoolName}</Label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  autoComplete="organization"
                  required
                  maxLength={150}
                />
              </div>
              <div>
                <Label htmlFor="email">{form.email}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </div>
              <div>
                <Label htmlFor="phone">{form.phone}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                  className="mono"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="message">{form.message}</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                />
              </div>
            </div>

            {/* Honeypot field — hidden from real users, left empty by them. Bots that auto-fill
                every field will populate it, which the API uses to silently drop the submission.
                Uses sr-only (not a large negative offset) to avoid expanding the document's
                scrollable width in RTL, which would force mobile browsers to zoom out. */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {TURNSTILE_SITE_KEY ? (
              <div className="mt-5 cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {form.sending}
                </>
              ) : (
                form.submit
              )}
            </Button>

            {status === 'success' ? (
              <p
                className="mt-4 flex items-center gap-2 text-sm font-medium text-aqua"
                role="status"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {form.success}
              </p>
            ) : null}

            {status === 'error' ? (
              <p
                className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" aria-hidden />
                {error}
              </p>
            ) : null}

            <p className="mt-4 text-xs text-muted-foreground">
              {form.consentBefore}{' '}
              <a href="/privacy" className="underline hover:text-foreground">
                {form.privacyLink}
              </a>
              {form.consentAfter}
            </p>
          </form>
        </div>
      </div>

      {TURNSTILE_SITE_KEY ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      ) : null}
    </section>
  );
}
