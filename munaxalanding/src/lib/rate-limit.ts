import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Sliding-window rate limiter for the contact API.
 *
 * On Cloudflare Workers (production), counters are stored in the `RATE_LIMIT_KV`
 * namespace (see wrangler.jsonc) so the limit is shared across all edge locations.
 * Outside of Workers (e.g. plain `next start`, or `next dev` without bindings), it
 * falls back to an in-memory `Map` — correct for a single-instance deployment.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// --- In-memory fallback --------------------------------------------------

const buckets = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// --- Cloudflare KV-backed limiter -----------------------------------------

async function checkRateLimitKv(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = await kv.get<Bucket>(key, 'json');

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    await kv.put(key, JSON.stringify({ count: 1, resetAt }), {
      expirationTtl: Math.ceil(windowMs / 1000) + 60,
    });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  const count = existing.count + 1;
  const ttl = Math.max(60, Math.ceil((existing.resetAt - now) / 1000));
  await kv.put(key, JSON.stringify({ count, resetAt: existing.resetAt }), {
    expirationTtl: ttl,
  });
  return { allowed: true, remaining: limit - count, resetAt: existing.resetAt };
}

/**
 * Checks and increments the request count for `key` within `windowMs`.
 * Returns `allowed: false` once `limit` is exceeded for the current window.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const { env } = getCloudflareContext();
    if (env.RATE_LIMIT_KV) {
      return await checkRateLimitKv(env.RATE_LIMIT_KV, key, limit, windowMs);
    }
  } catch {
    // Not running under the Cloudflare Workers runtime — use the in-memory fallback.
  }
  return checkRateLimitMemory(key, limit, windowMs);
}
