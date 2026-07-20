import { cookies } from 'next/headers';

const CSRF_COOKIE = 'csrf_token';

/**
 * Validates the double-submit CSRF token: the value submitted in the request body must
 * match the `csrf_token` cookie issued by middleware.ts. Combined with the `SameSite=Strict`
 * cookie attribute, this prevents cross-site form submissions.
 */
export async function isValidCsrfToken(submitted: string | undefined | null): Promise<boolean> {
  if (!submitted) return false;
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  return timingSafeEqual(cookieToken, submitted);
}

/** Constant-time string comparison to avoid timing side-channels on token checks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
