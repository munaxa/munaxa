import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/token';
import { cookieName } from '@/lib/auth/session';

/**
 * Access gate. The demo is NOT publicly accessible: every route except the login
 * page and the auth endpoints requires a valid, unexpired, signed session cookie.
 * Expired/forged cookies are rejected here before any page or data is served.
 */
const PUBLIC_PATHS = [
  '/login',
  '/request-demo',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/requests',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(cookieName())?.value;
  const claims = await verifySession(token);

  if (!claims) {
    // API → 401 JSON; pages → redirect to login (preserving intended destination).
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname + search)}` : '';
    return NextResponse.redirect(url);
  }

  // Demo-account management is admin-only.
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && !claims.admin) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|munaxa-logo.png|robots.txt).*)',
  ],
};
