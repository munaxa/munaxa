import { themes } from '@munaxa/ui';
import type { DemoRequest } from './demo-request';
import { site } from './site';

/**
 * Lead notifications, sent through Resend's HTTP API.
 *
 * The same Resend account and verified `mail.munaxa.com` domain the School landing already uses.
 * Calling the API with `fetch` rather than the SDK keeps this runnable on Cloudflare Workers with
 * no extra dependency.
 *
 * Configuration (Cloudflare Worker):
 *   RESEND_API_KEY  secret, set with `wrangler secret put RESEND_API_KEY`
 *   EMAIL_FROM      var in wrangler.jsonc, an address on the verified domain
 *   EMAIL_TO        optional var; defaults to info@munaxa.com
 */

/** Email HTML cannot read CSS custom properties, so it renders the registry's static neutrals. */
const { neutral } = themes.group.brand;

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function leadsInbox(): string {
  return process.env.EMAIL_TO || site.contactEmail;
}

const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function sendLeadEmail(lead: DemoRequest & { submittedAt: string }): Promise<void> {
  const what = lead.kind === 'waitlist' ? 'Waitlist sign-up' : 'Demo request';
  const rows: [string, string | undefined][] = [
    ['Product', `Munaxa ${lead.product}`],
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Organization', lead.organization],
    [lead.detailLabel ?? 'Detail', lead.detail],
    ['Page', lead.page],
    ['Submitted', lead.submittedAt],
  ];
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1]));
  const message = lead.message ?? '';

  const text = [...filled.map(([k, v]) => `${k}: ${v}`), '', 'Message:', message || '(none)'].join(
    '\n',
  );

  const cell = `padding:8px 12px;border-bottom:1px solid ${neutral.border};vertical-align:top;`;
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:${neutral.ink};font-size:14px;line-height:1.5">
      <h2 style="margin:0 0 12px;font-size:18px">${what}: Munaxa ${escapeHtml(lead.product)}</h2>
      <table cellpadding="0" cellspacing="0" style="border:1px solid ${neutral.border};border-collapse:collapse">
        ${filled
          .map(
            ([k, v]) =>
              `<tr><td style="${cell}background:${neutral.surface};color:${neutral.mutedText};font-weight:600">${escapeHtml(k)}</td><td style="${cell}">${escapeHtml(v)}</td></tr>`,
          )
          .join('')}
      </table>
      <h3 style="margin:20px 0 6px;font-size:15px">Message</h3>
      <p style="margin:0;white-space:pre-wrap">${message ? escapeHtml(message) : '<em>(none)</em>'}</p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Munaxa Website <contactus@mail.munaxa.com>',
      to: [leadsInbox()],
      reply_to: `${lead.name} <${lead.email}>`,
      subject: `${what}: Munaxa ${lead.product} · ${lead.organization}`,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
