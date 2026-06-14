/** @type {import('next').NextConfig} */

// The demo is hermetic: it makes NO outbound calls. CSP locks every fetch to 'self'
// so the browser physically cannot reach JoFotara / SMS / email / WhatsApp / push /
// payment endpoints — all integrations are mocked in-process (lib/mock-integrations).
const isProd = process.env.NODE_ENV === 'production';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for a slim production container / cloud deploy.
  output: 'standalone',
  // Competitor protection: never ship readable source maps to the browser.
  productionBrowserSourceMaps: false,
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          ...(isProd
            ? [
                { key: 'Content-Security-Policy', value: csp },
                { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
