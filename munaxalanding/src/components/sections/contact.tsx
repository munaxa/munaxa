'use client';

import { useState, type FormEvent } from 'react';
import Script from 'next/script';
import { Mail, Phone, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTACT_EMAIL } from '@/lib/constants';

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

export function Contact({ nonce }: { nonce?: string | undefined }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

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

      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setStatus('error');
        setError(result.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
      setError('Network error. Please check your connection and try again.');
    }
  }

  return (
    <section id="contact" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Let&apos;s talk about your school
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Tell us about your school and our team will get back to you to schedule a demo and
              answer any questions.
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
                Our team typically responds within one business day.
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                Serving schools and education groups across Jordan and the wider region.
              </div>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8"
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" autoComplete="name" required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  autoComplete="organization"
                  required
                  maxLength={150}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="message">Message</Label>
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
                every field will populate it, which the API uses to silently drop the submission. */}
            <div
              className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
              aria-hidden="true"
            >
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
                  Sending...
                </>
              ) : (
                'Send Message'
              )}
            </Button>

            {status === 'success' ? (
              <p
                className="mt-4 flex items-center gap-2 text-sm font-medium text-aqua"
                role="status"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Thank you! We&apos;ve received your message and will be in touch shortly.
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
              By submitting this form, you agree to be contacted by Munaxa about your inquiry. See
              our{' '}
              <a href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </a>
              .
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
