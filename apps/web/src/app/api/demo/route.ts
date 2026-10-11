import { NextResponse } from 'next/server';
import { parseDemoRequest } from '@/lib/demo-request';
import { emailConfigured, leadsInbox, sendLeadEmail } from '@/lib/email';

/**
 * Demo and waitlist requests from every page. Each one is validated and emailed to
 * info@munaxa.com, with Reply-To set to the visitor so sales can answer from the inbox.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  // Honeypot: a field people never see. Accept quietly so bots don't learn they were caught.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseDemoRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const lead = { ...parsed.value, submittedAt: new Date().toISOString() };

  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[demo] RESEND_API_KEY not set; request not emailed:', lead);
      return NextResponse.json({ ok: true, sent: false });
    }
    console.error('[demo] RESEND_API_KEY is not configured');
    return NextResponse.json(
      { error: `We couldn't send your request right now. Please email ${leadsInbox()}.` },
      { status: 503 },
    );
  }

  try {
    await sendLeadEmail(lead);
  } catch (error) {
    console.error('[demo] sending failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        error: `We couldn't send your request right now. Please try again or email ${leadsInbox()}.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sent: true });
}
