import * as Sentry from '@sentry/nestjs';

/**
 * Sentry initialization. MUST be imported before any other module in main.ts so that
 * instrumentation is applied early. No-ops when SENTRY_DSN is not set (e.g. local dev).
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Scrub obvious PII; full scrubbing config is hardened in Phase 15.
    sendDefaultPii: false,
  });
}
