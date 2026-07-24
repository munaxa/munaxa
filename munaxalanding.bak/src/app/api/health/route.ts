import { NextResponse } from 'next/server';

/** Lightweight health endpoint for the landing page (used by uptime checks / orchestration). */
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'landing', ts: new Date().toISOString() });
}
