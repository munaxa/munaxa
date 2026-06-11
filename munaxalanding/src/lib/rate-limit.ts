/**
 * In-memory sliding-window rate limiter for the contact API.
 *
 * This is intentionally dependency-free so the landing page can be deployed as a single
 * standalone container without provisioning Redis. It is correct for a single-instance
 * deployment (the typical footprint for a marketing site).
 *
 * Scaling note: if the landing page is deployed across multiple instances/regions, replace
 * this with a shared store (e.g. Upstash Redis / Cloudflare KV) keyed the same way — the
 * function signature below can stay the same.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically evict expired buckets so memory doesn't grow unbounded.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Checks and increments the request count for `key` within `windowMs`.
 * Returns `allowed: false` once `limit` is exceeded for the current window.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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
