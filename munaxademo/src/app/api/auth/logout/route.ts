import { NextResponse } from 'next/server';
import { COOKIE_NAME, cookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Clearing the cookie ends the access session; the client wipes session data too.
  res.cookies.set(COOKIE_NAME, '', { ...cookieOptions(process.env.NODE_ENV === 'production'), maxAge: 0 });
  return res;
}
