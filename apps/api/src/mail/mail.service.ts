import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Transactional email via Resend's HTTP API. Deliberately dependency-free (global fetch).
 *
 * No-op safe: when RESEND_API_KEY is unset (local dev, CI), sends are skipped and reported as
 * `{ sent: false }` so callers can fall back (e.g. show a temp password on screen instead).
 * Bodies and secrets are NEVER logged — only recipient + subject metadata.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  get enabled(): boolean {
    return Boolean(this.config.get('RESEND_API_KEY', { infer: true }));
  }

  async send(input: SendMailInput): Promise<{ sent: boolean }> {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    if (!apiKey) return { sent: false };

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: this.config.get('EMAIL_FROM', { infer: true }),
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Resend rejected mail to ${input.to} (${res.status})`);
        return { sent: false };
      }
      this.logger.log(`Sent "${input.subject}" to ${input.to}`);
      return { sent: true };
    } catch (err) {
      this.logger.warn(
        `Failed to send mail to ${input.to}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return { sent: false };
    }
  }

  /** Account-provisioned / password-reset email carrying a one-time temporary password. */
  async sendTemporaryPassword(params: {
    to: string;
    schoolName?: string;
    temporaryPassword: string;
    isReset: boolean;
  }): Promise<{ sent: boolean }> {
    const title = params.isReset ? 'Your password was reset' : 'Your Munaxa account is ready';
    return this.send({
      to: params.to,
      subject: `${title}${params.schoolName ? ` — ${params.schoolName}` : ''}`,
      html: [
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto">`,
        `<h2 style="color:#7A3FFF">${title}</h2>`,
        params.schoolName ? `<p>School: <strong>${escapeHtml(params.schoolName)}</strong></p>` : '',
        `<p>Sign in with your email or username and this temporary password:</p>`,
        `<p style="font-size:20px;font-family:monospace;background:#f4f0ff;padding:12px 16px;` +
          `border-radius:8px;letter-spacing:1px">${escapeHtml(params.temporaryPassword)}</p>`,
        `<p>You will be asked to choose a new password at first sign-in.</p>`,
        `<p style="color:#888;font-size:12px">If you did not expect this email, contact your school administrator.</p>`,
        `</div>`,
      ].join(''),
    });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
