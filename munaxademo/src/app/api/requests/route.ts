import { NextResponse, type NextRequest } from 'next/server';
import { createRequest } from '@/lib/requests';
import { rateLimited } from '@/lib/auth/session';

export const runtime = 'nodejs';

function ipOf(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

/** Public "Book a Demo" submission. No auth; rate-limited. Never issues credentials. */
export async function POST(req: NextRequest) {
  if (rateLimited(`req:${ipOf(req)}`)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const str = (k: string) => String(body[k] ?? '').trim();
  const schoolName = str('schoolName');
  const contactPerson = str('contactPerson');
  const email = str('email');

  if (!schoolName || !contactPerson || !email) {
    return NextResponse.json(
      { error: 'School name, contact person and email are required.' },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  createRequest({
    schoolName,
    contactPerson,
    jobTitle: str('jobTitle'),
    country: str('country'),
    numStudents: Math.max(0, Number(body.numStudents) || 0),
    numCampuses: Math.max(0, Number(body.numCampuses) || 0),
    email,
    phone: str('phone'),
    notes: str('notes'),
  });

  // The team reviews and contacts the prospect; no account is created here.
  return NextResponse.json({ ok: true });
}
