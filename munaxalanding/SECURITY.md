# Security Notes — Munaxa Landing Page

This document summarizes the security controls implemented in `/munaxalanding`. It is scoped
to this marketing site only.

## Transport & headers

- **HTTPS enforcement**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  (set in `next.config.mjs`). Deploy behind TLS termination (Cloudflare/ALB/Nginx).
- **Content-Security-Policy**: nonce-based, set per-request in `middleware.ts`.
  - `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
    `frame-ancestors 'none'`, `upgrade-insecure-requests`.
  - `script-src`/`style-src` use a per-request nonce + `'strict-dynamic'`.
  - Cloudflare Turnstile origins are allow-listed (only relevant if Turnstile is configured).
- **X-Content-Type-Options: nosniff**, **X-Frame-Options: DENY**,
  **Referrer-Policy: strict-origin-when-cross-origin**,
  **Permissions-Policy**: camera/microphone/geolocation/payment/usb all denied.

## CSRF protection

- Double-submit cookie pattern (`middleware.ts` + `src/lib/csrf.ts`):
  - Middleware issues a `csrf_token` cookie (`SameSite=Strict`, `Secure` in production).
  - The contact form reads the cookie value client-side and submits it in the JSON body.
  - The API route compares the submitted token to the cookie using a constant-time
    comparison and rejects the request (HTTP 403) on mismatch.
  - `SameSite=Strict` independently prevents the cookie from being sent on cross-site
    requests, so a forged cross-origin POST cannot supply a matching token.

## Input validation & sanitization

- All contact form fields are validated server-side with `zod` (`src/lib/validation.ts`):
  length limits, email format, phone format, trimming.
- User-supplied values are HTML-escaped (`escapeHtml`) before being interpolated into the
  internal notification email's HTML body, preventing HTML/script injection in the staff
  inbox.
- The database layer (`src/lib/db.ts`) uses **parameterized queries exclusively** — no string
  concatenation of user input into SQL (prevents SQL injection, OWASP A03).

## Rate limiting & anti-spam

- **Rate limiting**: `src/lib/rate-limit.ts` enforces a sliding-window limit
  (5 submissions / 10 minutes per IP) on `POST /api/contact`, returning `429` with
  `Retry-After` when exceeded.
- **Honeypot field**: a visually hidden `website` field (`src/components/sections/contact.tsx`)
  that real users never fill. If populated, the API returns `200 OK` but silently discards the
  submission — bots are not informed they were detected.
- **Optional CAPTCHA**: Cloudflare Turnstile (`src/lib/turnstile.ts`) is verified server-side
  when `TURNSTILE_SECRET_KEY` is configured. The platform stays usable without it (rate
  limiting + honeypot remain active).

## Secrets handling

- All secrets (Resend API key, database URL, Turnstile secret, Sentry DSN) are read from
  environment variables only — none are hardcoded. `.env.example` documents every variable
  with placeholder values; real `.env*` files are git-ignored at the repo root.

## Logging & monitoring

- `src/lib/logger.ts` emits structured JSON logs for: rate-limit hits, CSRF failures,
  honeypot triggers, CAPTCHA failures, DB errors, email send failures, and successful
  submissions.
- IP addresses are masked (`maskIp`) before being logged for abuse triage, while the full
  IP is stored in `contact_inquiries` and included in the internal notification email (as
  required for spam/abuse follow-up) — operators should define a retention/anonymization
  policy for this table.
- `SENTRY_DSN` can be configured for error monitoring (optional, same pattern as
  `apps/admin`).

## Dependency surface

- New runtime dependencies introduced for this app: `pg` (parameterized Postgres client),
  `resend` (transactional email), `lucide-react` (icons). All are widely used, actively
  maintained packages already aligned with conventions used elsewhere in the monorepo
  (Resend is referenced in `apps/api/.env.example`; `lucide` is the icon library configured
  in `apps/admin/components.json`).

## Out of scope / recommendations for production hardening

- For multi-instance/multi-region deployments, replace the in-memory rate limiter with a
  shared store (Redis/Upstash) — the function signature in `rate-limit.ts` is designed to be
  swapped in place.
- Configure a Web Application Firewall (e.g., Cloudflare WAF) in front of the deployment for
  an additional layer of bot/DDoS mitigation.
- Periodically purge or anonymize old rows in `contact_inquiries` per your data retention
  policy.
