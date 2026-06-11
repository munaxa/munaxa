import { logger } from './logger';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Cloudflare Turnstile token (optional CAPTCHA layer).
 * Returns `true` when Turnstile is not configured (TURNSTILE_SECRET_KEY unset) so the form
 * keeps working without CAPTCHA in environments that don't need it; returns `false` when
 * Turnstile IS configured but verification fails or no token was provided.
 */
export async function verifyTurnstile(token: string | undefined, remoteIp: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    const result = (await response.json()) as { success: boolean };
    return result.success === true;
  } catch (error) {
    logger.error('turnstile.verify_failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return false;
  }
}
