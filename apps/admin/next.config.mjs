import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  // Security headers (OWASP A05). CSP is hardened in Phase 15.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

const sentryOptions = {
  silent: true,
  // Org/project are read from env in CI; no secrets committed.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
