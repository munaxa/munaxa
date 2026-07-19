'use client';

import { useState, type FormEvent } from 'react';
import { Mail, Clock, MapPin, Loader2, CheckCircle2, AlertCircle, Send } from '@munaxa/icons';
import { Button, Input, Textarea, Label } from '@munaxa/ui';
import { CONTACT_EMAIL } from '@/lib/site';
import { Reveal } from '@/components/motion/reveal';

type Status = 'idle' | 'submitting' | 'success' | 'error';

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * Contact us. A functional message form posts to /api/contact (zod-validated, rate-limited,
 * honeypot-protected), which sends the designed Munaxa welcome email to the visitor and an
 * internal notification to the sales inbox. To book a demo, visitors use the demo CTA, which
 * opens the standalone demo app.
 */
export function Contact() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const payload = {
      name: field(formData, 'name'),
      schoolName: field(formData, 'schoolName'),
      email: field(formData, 'email'),
      phone: field(formData, 'phone'),
      message: field(formData, 'message'),
      website: field(formData, 'website'), // honeypot
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
      formEl.reset();
    } catch {
      setStatus('error');
      setError('Network error. Please check your connection and try again.');
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden border-t border-border py-24 sm:py-32">
      <div className="brand-glow pointer-events-none absolute -top-20 left-1/2 -z-10 h-[420px] w-[820px] max-w-[92vw] -translate-x-1/2" aria-hidden />

      <div className="shell grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Left — invitation + contact rail */}
        <Reveal>
          <p className="eyebrow">09 — Contact us</p>
          <h2 className="display mt-4 text-4xl sm:text-5xl">
            Let&apos;s talk about
            <br />
            your school.
          </h2>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Have a question or want to learn more? Tell us about your school and our team will get
            back to you. Ready to see Munaxa in action? Book a demo instead.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: Mail, label: 'Email us', value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
              { icon: Clock, label: 'Response time', value: 'Within one business day' },
              {
                icon: MapPin,
                label: 'Where we work',
                value: 'Schools & groups across Jordan and the region',
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.label} className="flex items-center gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {c.label}
                    </span>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="mono text-sm font-medium text-foreground transition hover:text-primary"
                      >
                        {c.value}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-foreground">{c.value}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {/* Right — the form */}
        <Reveal delay={100}>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="panel p-6 sm:p-8"
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" autoComplete="name" required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="schoolName">School / group</Label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  autoComplete="organization"
                  required
                  maxLength={150}
                />
              </div>
              <div>
                <Label htmlFor="email">Work email</Label>
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
                  className="mono"
                  dir="ltr"
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
                  rows={4}
                  placeholder="Tell us about your school — campuses, grade levels, and what you're looking for."
                />
              </div>
            </div>

            {/* Honeypot — hidden from real users; bots that fill every field are silently dropped. */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                <>
                  Send message
                  <Send className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>

            {status === 'success' && (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-aqua" role="status">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Thank you! We&apos;ve received your message and will be in touch shortly.
              </p>
            )}
            {status === 'error' && (
              <p
                className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" aria-hidden />
                {error}
              </p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              By submitting this form you agree to be contacted by Munaxa about your inquiry.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
