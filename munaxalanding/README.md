# Munaxa Landing Page

A standalone, independently deployable marketing website for **Munaxa — the School Operating
System**. Built to attract school owners, principals, directors, and educational groups.

> This app is self-contained inside `/munaxalanding`. It does not modify or depend on the
> School OS apps (`apps/api`, `apps/admin`) and can be built, deployed, and scaled separately.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — same major versions as `apps/admin`
- **Tailwind CSS** via the shared `@munaxa/config-tailwind` design-system preset (same brand
  tokens, fonts, and color palette as the rest of Munaxa)
- **Resend** for transactional email (acknowledgment + internal notification)
- **PostgreSQL** (via `pg`, parameterized queries) for storing contact inquiries — own schema,
  separate from the main Prisma-managed School OS database
- Optional **Cloudflare Turnstile** for CAPTCHA / bot protection

## Getting started

```bash
# from the repo root
cp munaxalanding/.env.example munaxalanding/.env.local
pnpm install
pnpm --filter @munaxa/landing dev
```

The site runs at http://localhost:3100.

### Database (optional but recommended)

Contact form submissions are stored in a dedicated `contact_inquiries` table. To enable
storage, create a database/role and run the migration:

```bash
createdb munaxa_landing
psql "$LANDING_DATABASE_URL" -f munaxalanding/db/migrations/001_create_contact_inquiries.sql
```

If `LANDING_DATABASE_URL` is not set, the app still works — submissions are emailed but not
persisted (a warning is logged).

### Email (Resend)

1. Create a Resend account and verify the sending domain for `munaxa.com`.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Munaxa <no-reply@munaxa.com>`).
3. Without `RESEND_API_KEY`, emails are skipped and logged — useful for local development.

On a successful contact form submission, two emails are sent:

| Recipient | Subject | Purpose |
|---|---|---|
| The visitor | "Thank You for Contacting Munaxa" | Acknowledgment |
| `info@munaxa.com` | "New inquiry from {School Name}" | Internal notification with full details, submission time, IP address, and user agent |

### Optional CAPTCHA (Cloudflare Turnstile)

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to enable Turnstile on the
contact form. Leave both empty to disable — the form remains protected by the honeypot field
and IP-based rate limiting either way.

## Available scripts

| Command | Description |
|---|---|
| `pnpm --filter @munaxa/landing dev` | Run the dev server on port 3100 |
| `pnpm --filter @munaxa/landing build` | Production build (standalone output) |
| `pnpm --filter @munaxa/landing start` | Run the production build |
| `pnpm --filter @munaxa/landing lint` | Lint |
| `pnpm --filter @munaxa/landing typecheck` | Type-check |

## Project structure

```text
munaxalanding/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Metadata, fonts, Organization JSON-LD
│   │   ├── page.tsx           # Landing page composition + FAQPage JSON-LD
│   │   ├── privacy/           # Privacy Policy
│   │   ├── terms/              # Terms of Service
│   │   ├── sitemap.ts          # /sitemap.xml
│   │   ├── robots.ts           # /robots.txt
│   │   ├── opengraph-image.tsx # Generated OG image
│   │   └── api/
│   │       ├── contact/route.ts # Contact form API (validation, rate limiting, email, storage)
│   │       └── health/route.ts  # Health check
│   ├── components/
│   │   ├── sections/           # Hero, Benefits, Why Munaxa, Modules, Testimonials, FAQ, Contact, Footer
│   │   ├── ui/                  # Shared primitives (Button, Card, Input, etc.)
│   │   └── icons/                # Inline illustrations
│   └── lib/                     # validation, csrf, rate-limit, db, email, turnstile, logger
├── db/migrations/                # SQL migration for contact_inquiries
├── middleware.ts                  # CSP nonce + CSRF cookie
├── Dockerfile
└── .env.example
```

## Deployment

### Docker (recommended for self-hosting)

```bash
docker build -f munaxalanding/Dockerfile -t munaxa-landing .
docker run -p 3100:3100 --env-file munaxalanding/.env munaxa-landing
```

### Platform deploys (Vercel / Cloudflare / etc.)

The app builds with `output: 'standalone'` and has no dependency on the School OS database,
auth, or APIs — set the **root directory** to `munaxalanding` and configure the environment
variables from `.env.example`.

### Reverse proxy / TLS

Terminate TLS in front of the app (e.g. Cloudflare, Nginx, ALB) and ensure HTTPS is enforced —
the app sends `Strict-Transport-Security` assuming it is served over HTTPS.

## Security

See [SECURITY.md](./SECURITY.md) for a full breakdown of the security controls implemented
(headers, CSP, CSRF, rate limiting, input validation, anti-spam, and logging).

## Notes & assumptions

- The landing page is **English-only** for this initial version. Munaxa's i18n system
  (`@munaxa/i18n`, RTL/LTR) can be integrated later if a bilingual marketing site is required —
  the layout already uses logical CSS properties (`ps-`/`text-start` etc.) where practical.
- Testimonials in `src/components/sections/testimonials.tsx` are **placeholders** and must be
  replaced with real, permissioned customer quotes before launch.
- Pricing is intentionally not published; the FAQ directs visitors to contact sales.
- No internal architecture, API routes, database schema, or security control details from the
  School OS are referenced anywhere in the page content.
