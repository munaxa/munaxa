# Munaxa Demo — Security Model

The demo is intentionally hermetic. This document describes the boundaries and the controls.

## What the demo can and cannot reach

| Concern                | Status in the demo                                                    |
| ---------------------- | --------------------------------------------------------------------- |
| Production database    | **Never connected.** There is no database driver and no `DATABASE_URL`. |
| Production APIs/auth    | **Never connected.** No API base URL; the demo has its own auth.       |
| Production storage/files| **Never connected.**                                                  |
| JoFotara e-invoicing   | **Mocked.** `lib/mock-integrations` returns a fake clearance UUID.     |
| SMS / Email / WhatsApp | **Mocked.** Recorded to an in-app outbox; nothing is sent.            |
| Push notifications     | **Mocked.**                                                           |
| Payment gateways       | **Mocked.** Returns a fake authorization; no charge occurs.           |

A strict **Content-Security-Policy** (`connect-src 'self'`) means the browser physically cannot
open a connection to any external host, even if code attempted to. `default-src 'self'`,
`frame-ancestors 'none'`, `object-src 'none'`, and `form-action 'self'` are also enforced
(see `next.config.mjs`), along with `X-Frame-Options`, `X-Content-Type-Options`, HSTS (prod) and
`X-Robots-Tag: noindex`.

## Access control

- **Not publicly accessible.** `middleware.ts` requires a valid session on every route except the
  login page, the public "Book a Demo" form (`/request-demo`, `POST /api/requests`) and the auth
  endpoints. There are **no shared/public credentials** — access is provisioned per prospect from
  an approved demo request, so competitors cannot self-serve their way in.
- **Role-locked accounts.** Prospect accounts carry an assigned role and cannot switch roles;
  scope is controlled by the sales team per account.
- **Signed sessions.** The session token is an HMAC-SHA256-signed payload (Web Crypto), set as an
  **httpOnly, SameSite=Strict, Secure** (in production) cookie. It carries an absolute expiry
  (`exp`) that is verified on every request.
- **Session cookie, not persistent.** No `maxAge`/`expires` → cleared when the browser closes.
- **Account lifecycle.** Demo accounts have a status (Active/Disabled) and an optional expiry.
  Disabled or expired accounts are rejected at login and cannot hold a usable session.
- **Password storage.** Account passwords are **PBKDF2-SHA256** hashed (100k iterations) and
  compared in (near) constant time. Plaintext is never stored at rest in the running store.
- **Brute-force protection.** An in-memory limiter throttles repeated failed logins per IP+user.
- **Admin separation.** Only the demo-admin account can reach `/admin/*` and `/api/admin/*`
  (enforced in middleware **and** in the route handlers).

## Competitor protection

The demo exposes **features and workflows only**:

- No production source, API documentation, Swagger, database schema or infrastructure details are
  shipped or referenced in the UI.
- Browser source maps are disabled in production (`productionBrowserSourceMaps: false`).
- Error messages are generic; internal identifiers are not surfaced.

## Secrets

The only secret is `DEMO_SESSION_SECRET` (HMAC key for the session cookie). Set it in production;
a dev-only fallback is used otherwise. There are no third-party API keys, because there are no
third-party integrations.

## Residual notes

- Account and login-history state lives in server memory and resets on restart — acceptable and
  intended for a demo (it is an explicit reset trigger), and avoids any persistent datastore.
- For multi-instance deployments, run a single instance or a sticky session, since the access
  store is in-process by design.
