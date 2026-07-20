import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE } from '@/lib/i18n/config';

/**
 * Edge middleware:
 *  - Issues a per-response CSP nonce (used for any inline scripts/styles Next.js injects).
 *  - Sets a strict, nonce-based Content-Security-Policy header.
 *  - Issues a double-submit CSRF cookie consumed by the contact form (see lib/csrf.ts).
 *  - Sets Content-Language and Vary: Cookie so caches and crawlers know this URL's
 *    response varies by the locale cookie (no separate /en, /ar URLs).
 *
 * Cloudflare Turnstile (optional CAPTCHA) origins are allow-listed so the widget keeps
 * working when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.clarity.ms;
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: blob: https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://c.clarity.ms;
    font-src 'self' data:;
    connect-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.clarity.ms https://*.clarity.ms https://us.i.posthog.com https://eu.i.posthog.com;
    frame-src https://challenges.cloudflare.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  response.headers.set('Content-Language', locale);
  response.headers.append('Vary', 'Cookie');

  if (!request.cookies.get('csrf_token')) {
    const token = crypto.randomUUID();
    response.cookies.set('csrf_token', token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 4,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image optimization files.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
