import { Resend } from 'resend';
import { CONTACT_EMAIL } from './constants';
import { escapeHtml } from './validation';
import { logger } from './logger';

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Munaxa <no-reply@munaxa.com>';

export interface InquiryEmailData {
  name: string;
  schoolName: string;
  email: string;
  phone: string;
  message: string;
  ipAddress: string | null;
  userAgent: string | null;
  submittedAt: Date;
}

/**
 * Sends the visitor-facing acknowledgment email.
 * Subject and body follow the exact copy specified for the Munaxa landing page.
 */
export async function sendAcknowledgmentEmail(data: InquiryEmailData): Promise<void> {
  const resend = getClient();
  if (!resend) {
    logger.warn('email.not_configured', { reason: 'RESEND_API_KEY not set', kind: 'ack' });
    return;
  }

  const text = [
    'Thank you for contacting Munaxa.',
    '',
    'We have received your inquiry and our team will contact you shortly.',
  ].join('\n');

  const html = `
    <p>Thank you for contacting Munaxa.</p>
    <p>We have received your inquiry and our team will contact you shortly.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.email,
      subject: 'Thank You for Contacting Munaxa',
      text,
      html,
    });
  } catch (error) {
    logger.error('email.send_failed', {
      kind: 'ack',
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}

/** Sends the internal notification email to the Munaxa sales/info inbox. */
export async function sendInternalNotification(data: InquiryEmailData): Promise<void> {
  const resend = getClient();
  if (!resend) {
    logger.warn('email.not_configured', { reason: 'RESEND_API_KEY not set', kind: 'internal' });
    return;
  }

  const rows: Array<[string, string]> = [
    ['Name', data.name],
    ['School Name', data.schoolName],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Submission Time', data.submittedAt.toISOString()],
    ['IP Address', data.ipAddress ?? 'unknown'],
    ['User Agent', data.userAgent ?? 'unknown'],
  ];

  const html = `
    <h2>New Munaxa landing page inquiry</h2>
    <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
        )
        .join('')}
      <tr><td><strong>Message</strong></td><td>${escapeHtml(data.message).replace(/\n/g, '<br/>')}</td></tr>
    </table>
  `;

  const text = [
    'New Munaxa landing page inquiry',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    `Message: ${data.message}`,
  ].join('\n');

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_EMAIL,
      replyTo: data.email,
      subject: `New inquiry from ${data.schoolName}`,
      text,
      html,
    });
  } catch (error) {
    logger.error('email.send_failed', {
      kind: 'internal',
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
