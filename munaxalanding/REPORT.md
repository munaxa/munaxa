# Implementation Summary — Munaxa Landing Page

## What was built

A new, independently deployable marketing website at `/munaxalanding`, positioning Munaxa as
an enterprise-grade School Operating System for school owners, principals, directors,
educational groups, and private/international schools — without exposing any internal
architecture, APIs, database design, or security controls of the School OS.

## Files created

```
munaxalanding/
├── package.json, tsconfig.json, eslint.config.mjs, postcss.config.mjs, tailwind.config.ts
├── next.config.mjs            # security headers + standalone output
├── src/middleware.ts           # CSP nonce + CSRF cookie issuance
├── .env.example, Dockerfile, README.md, SECURITY.md, REPORT.md (this file)
├── db/migrations/001_create_contact_inquiries.sql
└── src/
    ├── app/
    │   ├── layout.tsx, page.tsx, globals.css
    │   ├── opengraph-image.tsx, sitemap.ts, robots.ts
    │   ├── privacy/page.tsx, terms/page.tsx
    │   └── api/{contact,health}/route.ts
    ├── components/
    │   ├── sections/ (header, hero, benefits, why-munaxa, modules, testimonials, faq,
    │   │              contact, footer, legal-shell)
    │   ├── ui/ (button, card, input/textarea, label, badge)
    │   └── icons/hero-illustration.tsx
    └── lib/ (constants, validation, csrf, rate-limit, db, email, turnstile, logger, faq-data)
```

Workspace files updated:

- `pnpm-workspace.yaml` — added `munaxalanding` as a workspace package.

No files inside `apps/`, `packages/`, or `prisma/` were modified — the landing page is fully
additive and isolated.

## Architecture decisions

1. **Standalone Next.js 15 app, same major versions as `apps/admin`** (Next 15.1.4, React 19,
   TypeScript 5.7), reusing `@munaxa/config-tailwind` (brand tokens), `@munaxa/config-eslint`,
   `@munaxa/config-typescript`, and `@munaxa/ui` (the `cn` helper). This keeps the visual
   language and tooling consistent without coupling to the School OS runtime.

2. **Independent backend via Next.js Route Handlers** (`/api/contact`, `/api/health`) instead
   of extending the NestJS API. This lets the landing page be built, deployed, and scaled as a
   single container with zero dependency on the School OS API, RLS database, or auth system —
   directly satisfying "deployed independently without affecting the School OS."

3. **Dedicated `contact_inquiries` table via `pg` + parameterized queries**, with its own SQL
   migration (`db/migrations/001_create_contact_inquiries.sql`) and `LANDING_DATABASE_URL`.
   This avoids touching `prisma/schema.prisma` (the School OS schema/migrations) while still
   persisting inquiries securely. If unset, the app degrades gracefully (emails still sent,
   submission still succeeds, a warning is logged).

4. **Resend for transactional email** (`src/lib/email.ts`), matching the `RESEND_API_KEY` /
   `EMAIL_FROM` convention already present in `apps/api/.env.example`. Sends the exact
   acknowledgment email specified, plus an internal notification to `info@munaxa.com` with
   name, school, email, phone, message, submission time, IP, and user agent (HTML-escaped).

5. **Content strategy**: all copy is outcome/benefit-focused (centralized operations, reduced
   admin workload, parent communication, attendance, academic visibility, financial
   transparency, transportation, efficiency). Module descriptions are one-sentence,
   high-level summaries with no implementation details. No source paths, API routes, schema
   names, or security mechanisms are referenced in any user-facing copy.

## Security measures implemented

- **Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Permissions-Policy (`next.config.mjs`).
- **CSP**: nonce-based, `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`,
  `upgrade-insecure-requests` (`src/middleware.ts`).
- **CSRF**: double-submit cookie (`SameSite=Strict` + token comparison) for `/api/contact`.
- **Input validation**: `zod` schema with length limits, email/phone format checks
  (`src/lib/validation.ts`); HTML-escaping of all user input embedded into emails.
- **SQL injection prevention**: parameterized queries only (`src/lib/db.ts`).
- **Rate limiting**: 5 submissions / 10 minutes per IP, in-memory sliding window
  (`src/lib/rate-limit.ts`), `429` + `Retry-After`.
- **Anti-spam**: honeypot field (silently discarded, returns `200`), optional Cloudflare
  Turnstile CAPTCHA (`src/lib/turnstile.ts`, enabled only if configured).
- **Secrets**: all via environment variables (`.env.example`), none hardcoded.
- **Logging**: structured JSON logs for all security-relevant events, with IP masking for
  triage logs (`src/lib/logger.ts`).
- **SEO**: full metadata, OpenGraph/Twitter cards (generated OG image), JSON-LD
  (`Organization` + `FAQPage`), `sitemap.xml`, `robots.txt`, canonical URLs.

All of the above is also documented in [`SECURITY.md`](./SECURITY.md).

## Verification performed

- `pnpm install` (workspace updated successfully)
- `pnpm --filter @munaxa/landing typecheck` — passes
- `pnpm --filter @munaxa/landing lint` — passes (0 errors, 0 warnings)
- `pnpm --filter @munaxa/landing build` — production build succeeds (standalone output)
- Manual smoke test against `next dev`:
  - Page renders all sections (hero, benefits, why Munaxa, modules, testimonials, FAQ,
    contact, footer)
  - Security headers + CSP + `csrf_token` cookie present on responses
  - `/robots.txt`, `/api/health` respond correctly
  - `/api/contact`: valid submission → `200 {ok:true}`; honeypot → silently `200`; bad CSRF →
    `403`; invalid email → `400` with field error; 5th request within 10 minutes → `429`
  - Structured logs confirm DB/email "not configured" warnings are logged (expected in an
    environment without `LANDING_DATABASE_URL` / `RESEND_API_KEY`) while the request still
    succeeds

## Deployment steps

1. Provision a Postgres database (or schema) for `LANDING_DATABASE_URL` and run
   `db/migrations/001_create_contact_inquiries.sql`.
2. Verify the sending domain in Resend and set `RESEND_API_KEY` + `EMAIL_FROM`.
3. (Optional) Create a Cloudflare Turnstile site and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` +
   `TURNSTILE_SECRET_KEY`.
4. Set `NEXT_PUBLIC_SITE_URL` to the production domain.
5. Build & run:
   - Docker: `docker build -f munaxalanding/Dockerfile -t munaxa-landing .` then run with
     `--env-file munaxalanding/.env`, exposing port 3100 behind a TLS-terminating proxy/CDN.
   - Or deploy to any Next.js-compatible platform with the project root set to
     `munaxalanding`.
6. Confirm `/api/health` returns `200` post-deploy.

## Assumptions

- The landing page is **English-only** for v1 (Munaxa's bilingual `@munaxa/i18n` system can be
  layered in later; layout uses logical CSS properties where practical to ease that).
- Testimonials are **placeholders** and must be replaced with real, permissioned quotes before
  launch (clearly noted in `README.md` and as a code comment in `testimonials.tsx`).
- Pricing is intentionally not published — FAQ directs prospects to contact sales.
- `LANDING_DATABASE_URL` is expected to point at a database/role separate from the School OS's
  RLS-protected tenant database (either a different schema on the same Postgres instance or a
  separate database) — this was a deliberate choice to avoid any change to
  `prisma/schema.prisma` or tenant migrations.
- Cloudflare Turnstile was chosen as the optional CAPTCHA provider (free, privacy-respecting,
  simple server-side verification) but can be swapped for another provider by replacing
  `src/lib/turnstile.ts` and the corresponding script tag in `contact.tsx`.

## Addendum — Cloudflare Workers hosting, Supabase DB, notifications

This addendum covers a follow-up pass that wires the landing page up to live infrastructure:
Cloudflare Workers hosting, the Supabase Postgres database, and email notifications.

### Database (Supabase)

- Reused the existing Supabase project "Munaxa" (ref `fngkpuyvzqemkqnenryq`) and its
  `early_access_requests` table instead of creating a new database/table, avoiding a second
  Postgres instance for this single-purpose form.
- Applied migration `db/migrations/002_add_contact_fields_to_early_access_requests.sql`,
  adding `message`, `ip_address`, `user_agent`, and `updated_at` columns to
  `early_access_requests`.
- Rewrote `src/lib/db.ts` to use `@supabase/supabase-js` (HTTP-based, edge-compatible) with
  the service role key instead of `pg` (raw TCP, incompatible with the Workers runtime).
  Submissions are `upsert`'d on the `email` unique constraint — repeat inquiries from the
  same address update the existing row rather than erroring.
- Removed the now-obsolete `db/migrations/001_create_contact_inquiries.sql` and the `pg` /
  `@types/pg` dependencies.

### Cloudflare Workers hosting

- Migrated the build to `@opennextjs/cloudflare` (`open-next.config.ts`, `wrangler.jsonc`),
  replacing the standalone Node.js output. Static assets are served via Workers Assets;
  `compatibility_flags: ["nodejs_compat"]` is enabled.
- Created a Cloudflare KV namespace (`munaxa-landing-rate-limit`, binding `RATE_LIMIT_KV`)
  and rewrote `src/lib/rate-limit.ts` to use it for distributed rate limiting on Workers,
  with an in-memory fallback for `next dev`/`next start`.
- Added `preview`, `deploy`, and `cf-typegen` scripts to `package.json`. `cloudflare-env.d.ts`
  is generated via `pnpm cf-typegen` and committed for CI typecheck convenience.
- Bumped `next` to `15.1.12` (latest 15.1.x patch) and `@opennextjs/cloudflare`/`wrangler` to
  versions with compatible peer dependencies.
- The Docker-based deployment path (`Dockerfile`) is retained as a self-hosting alternative
  for environments that don't use Cloudflare.

### Notifications (Resend)

- The Resend integration (`src/lib/email.ts`) built in the original implementation is
  unchanged and ready to use — it only needs `RESEND_API_KEY` and `EMAIL_FROM` configured as
  secrets to start sending the applicant acknowledgment and internal notification emails.

### Verification performed

- `pnpm lint`, `pnpm typecheck`, and `pnpm build` all pass after the migration.
- `npx opennextjs-cloudflare build` succeeds, producing `.open-next/worker.js`.
- `wrangler dev --local` smoke tests against the built Worker:
  - `/` → 200, all sections render, security headers/CSP/`csrf_token` cookie present.
  - `/api/health` → `{"status":"ok","service":"landing", ...}`.
  - `/robots.txt` → correct content.
  - `POST /api/contact` with a valid payload → `{"ok":true}`.
  - `POST /api/contact` with the honeypot field filled → `{"ok":true}` (silent discard).
  - `POST /api/contact` with an invalid email → `400` with field-level validation errors.

### Secrets required to go fully live

These are not set in this environment and must be configured by the project owner:

- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — for `pnpm deploy` / CI deploys.
- `SUPABASE_SERVICE_ROLE_KEY` — from the Supabase dashboard (Project Settings → API),
  configured as a Worker secret via `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.
- `RESEND_API_KEY`, `EMAIL_FROM` — to enable transactional email notifications.
- (Optional) `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` for CAPTCHA.
