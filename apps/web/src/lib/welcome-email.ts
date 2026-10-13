import { productBrands, themes, type BrandedProductId } from '@munaxa/ui';
import type { DemoProduct, DemoRequest } from './demo-request';
import { productCopy } from './product-copy';
import { site } from './site';

/**
 * The welcome email a visitor receives after asking for a demo (or joining a waitlist), in the
 * colours and logo of the product they asked about.
 *
 * HTML email cannot read CSS custom properties, so colours come from the theme registry's static
 * brand values (`themes.<id>.brand`), which exist for exactly this. Layout is table-based with
 * inline styles, the one form email clients render consistently.
 */

const productId: Record<DemoProduct, BrandedProductId> = {
  School: 'school',
  Work: 'work',
  Docs: 'docs',
};

const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface WelcomeEmail {
  subject: string;
  html: string;
  text: string;
  /** The hosted product logo, to attach inline under `LOGO_CID`. */
  logo: { url: string; filename: string };
}

/** The Content-ID the HTML references the logo by when it is attached inline. */
export const LOGO_CID = 'product-logo';

/**
 * `logoSrc` is `cid:` by default: an inline attachment shows without the "download pictures"
 * prompt clients such as Outlook put in front of remote images. Pass `remote` to point at the
 * hosted file instead, for when the attachment can't be sent.
 */
export function renderWelcomeEmail(
  lead: DemoRequest,
  logoSrc: 'cid' | 'remote' = 'cid',
): WelcomeEmail {
  const id = productId[lead.product];
  const { color, neutral } = themes[id].brand;
  const copy = productCopy[id];
  const name = `Munaxa ${lead.product}`;
  const first = lead.name.trim().split(/\s+/)[0] ?? lead.name;
  const waitlist = lead.kind === 'waitlist';
  const productUrl = new URL(`/${id}`, site.url).toString();
  const logo = productBrands[id].assets.horizontal.onDark;
  const logoUrl = new URL(logo.src, site.url).toString();
  const logoImg = logoSrc === 'cid' ? `cid:${LOGO_CID}` : logoUrl;
  const logoHeight = 34;
  const logoWidth = Math.round((logo.width / logo.height) * logoHeight);

  const subject = waitlist
    ? `You're on the ${name} waitlist`
    : `We've received your ${name} enquiry`;
  const opening = waitlist
    ? `Thank you for joining the waitlist for <strong>${name}</strong> on behalf of <strong>${esc(lead.organization)}</strong>. We'll be in touch before launch to plan your onboarding.`
    : `Thank you for your interest in <strong>${name}</strong> on behalf of <strong>${esc(lead.organization)}</strong>. A member of our team will be in touch shortly.`;
  const steps = waitlist
    ? [
        `A ${name} specialist reviews your sign-up.`,
        'We contact you before launch to plan your onboarding.',
        'Your setup is shaped around how your organization already works.',
      ]
    : [
        `A ${name} specialist reviews your request.`,
        'We get back to you shortly.',
        'Our answer is shaped around how your organization already works.',
      ];

  const summary: [string, string][] = [
    ['Product', name],
    ['Name', lead.name],
    ['Organization', lead.organization],
    ['Phone', lead.phone],
  ];
  if (lead.detailLabel && lead.detail) summary.push([lead.detailLabel, lead.detail]);
  if (lead.message) summary.push(['Message', lead.message]);

  const label = `font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${neutral.mutedText};margin-bottom:8px`;

  const pointsHtml = copy.points
    .map(
      (p) =>
        `<tr><td style="width:22px;vertical-align:top;padding:0 0 14px;color:${color.DEFAULT};font-weight:700;font-size:15px">&#10003;</td>` +
        `<td style="padding:0 0 14px"><div style="font-size:14px;font-weight:600;color:${neutral.ink}">${esc(p.t)}</div>` +
        `<div style="font-size:13px;line-height:1.5;color:${neutral.mutedText};margin-top:2px">${esc(p.d)}</div></td></tr>`,
    )
    .join('');

  const stepsHtml = steps
    .map(
      (s, i) =>
        `<tr><td style="width:26px;vertical-align:top;padding:0 0 10px"><div style="width:20px;height:20px;border-radius:10px;background:${color.dark};color:${neutral[0]};font-size:11px;font-weight:700;text-align:center;line-height:20px">${i + 1}</div></td>` +
        `<td style="padding:1px 0 10px;font-size:14px;color:${neutral.ink}">${esc(s)}</td></tr>`,
    )
    .join('');

  const summaryHtml = summary
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 14px;color:${neutral.mutedText};font-size:13px;width:120px;vertical-align:top;border-top:1px solid ${neutral.border}">${esc(k)}</td>` +
        `<td style="padding:8px 14px;color:${neutral.ink};font-size:13px;white-space:pre-wrap;border-top:1px solid ${neutral.border}">${esc(v)}</td></tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${neutral.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${neutral.bg};padding:24px 12px;font-family:${FONT}">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${neutral[0]};border:1px solid ${neutral.border};border-radius:14px;overflow:hidden">
  <tr><td style="background:${color.dark};padding:26px 32px">
    <img src="${logoImg}" alt="${name}" width="${logoWidth}" height="${logoHeight}" style="display:block;height:${logoHeight}px;width:auto;border:0">
  </td></tr>
  <tr><td style="height:4px;background:${color.DEFAULT};font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:32px 32px 8px">
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:${neutral.ink}">Thanks, ${esc(first)}. We&rsquo;ve received your request.</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${neutral.ink}">${opening}</p>
  </td></tr>
  <tr><td style="padding:8px 32px 4px">
    <div style="${label}">About ${name} &middot; ${esc(copy.tagline)}</div>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${neutral.ink}">${esc(copy.summary)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${pointsHtml}</table>
  </td></tr>
  <tr><td style="padding:10px 32px 6px">
    <div style="${label};margin-bottom:12px">What happens next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepsHtml}</table>
  </td></tr>
  <tr><td style="padding:14px 32px 8px">
    <div style="${label}">Your request</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${neutral.surface};border-radius:10px;border-collapse:separate;overflow:hidden">${summaryHtml}</table>
  </td></tr>
  <tr><td style="padding:22px 32px 30px">
    <a href="${productUrl}" style="display:inline-block;background:${color.dark};color:${neutral[0]};text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px">Explore ${name} &rarr;</a>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${neutral.mutedText}">Have something to add? Just reply to this email; it goes straight to our team at ${esc(site.contactEmail)}.</p>
  </td></tr>
  <tr><td style="background:${neutral.surface};padding:18px 32px;font-size:12px;line-height:1.6;color:${neutral.mutedText};text-align:center">
    ${name} &middot; ${esc(copy.tagline)}<br>
    You&rsquo;re receiving this because you ${waitlist ? 'joined a waitlist' : 'contacted us'} at <a href="${site.url}" style="color:${neutral.mutedText}">${esc(new URL(site.url).host)}</a>.
  </td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    `Thanks, ${first}. We've received your request.`,
    '',
    waitlist
      ? `Thank you for joining the waitlist for ${name} on behalf of ${lead.organization}. We'll be in touch before launch to plan your onboarding.`
      : `Thank you for your interest in ${name} on behalf of ${lead.organization}. A member of our team will be in touch shortly.`,
    '',
    `ABOUT ${name.toUpperCase()} · ${copy.tagline.toUpperCase()}`,
    copy.summary,
    '',
    ...copy.points.map((p) => `- ${p.t}: ${p.d}`),
    '',
    'WHAT HAPPENS NEXT',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    'YOUR REQUEST',
    ...summary.map(([k, v]) => `${k}: ${v}`),
    '',
    `Explore ${name}: ${productUrl}`,
    '',
    `Have something to add? Just reply to this email; it goes straight to our team at ${site.contactEmail}.`,
  ].join('\n');

  return { subject, html, text, logo: { url: logoUrl, filename: `munaxa-${id}.png` } };
}
