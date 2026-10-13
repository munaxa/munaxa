import { themes } from '@munaxa/ui';
import type { DemoRequest } from './demo-request';
import { site } from './site';
import { LOGO_CID, renderWelcomeEmail } from './welcome-email';

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
 *   EMAIL_WELCOME_FROM_ADDRESS
 *                   optional var; the address the visitor's welcome email comes from, defaults
 *                   to no-reply@mail.munaxa.com (replies still reach EMAIL_TO via Reply-To)
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
  const what = lead.kind === 'waitlist' ? 'Waitlist sign-up' : 'Contact request';
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

  await sendResend({
    from: process.env.EMAIL_FROM || 'Munaxa Website <contactus@mail.munaxa.com>',
    to: [leadsInbox()],
    reply_to: `${lead.name} <${lead.email}>`,
    subject: `${what}: Munaxa ${lead.product} · ${lead.organization}`,
    text,
    html,
  });
}

/**
 * The visitor's confirmation, in the theme of the product they asked about. The logo goes inline
 * (Resend fetches it from munaxa.com); if that send is refused, it goes again with the logo linked.
 */
export async function sendWelcomeEmail(lead: DemoRequest): Promise<void> {
  const address = process.env.EMAIL_WELCOME_FROM_ADDRESS || 'no-reply@mail.munaxa.com';
  const envelope = {
    from: `Munaxa ${lead.product} <${address}>`,
    to: [lead.email],
    reply_to: leadsInbox(),
  };
  const inline = renderWelcomeEmail(lead);
  try {
    await sendResend({
      ...envelope,
      subject: inline.subject,
      text: inline.text,
      html: inline.html,
      attachments: [
        { path: inline.logo.url, filename: inline.logo.filename, content_id: LOGO_CID },
      ],
    });
  } catch (error) {
    console.warn(
      '[demo] welcome email with inline logo failed, retrying with a linked logo:',
      error instanceof Error ? error.message : error,
    );
    const linked = renderWelcomeEmail(lead, 'remote');
    await sendResend({
      ...envelope,
      subject: linked.subject,
      text: linked.text,
      html: linked.html,
    });
  }
}

interface ResendEmail {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { path: string; filename: string; content_id: string }[];
}

async function sendResend(email: ResendEmail): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
