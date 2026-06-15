# Munaxa Landing Page

A standalone marketing website for **Munaxa — the School Operating System**. Built to attract
school owners, principals, directors, and educational groups.

> This app is fully self-contained: it has its own dependencies, configuration, and lockfile,
> and can be built and deployed from this directory (or its own Git repository) with no other
> code or packages required.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Tailwind CSS** with the Munaxa design-system tokens (brand colors, fonts, shadows) defined
  locally in `tailwind.config.ts` + `src/app/globals.css`
- **Resend** for transactional email (acknowledgment + internal notification)
- **Supabase (Postgres)** via `@supabase/supabase-js` (service role, server-only) for storing
  contact inquiries
- **Cloudflare Workers** (via `@opennextjs/cloudflare`) as the primary hosting target, with
  Cloudflare KV for distributed rate limiting
- Optional **Cloudflare Turnstile** for CAPTCHA / bot protection

## Getting started

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

The site runs at http://localhost:3100.

### Database (Supabase)

Contact form submissions are upserted (keyed on email) into the Munaxa Supabase project's
`early_access_requests` table. The schema change is in
[`db/migrations/002_add_contact_fields_to_early_access_requests.sql`](./db/migrations/002_add_contact_fields_to_early_access_requests.sql)
(already applied to the live project).

Set in `.env.local` / your hosting platform's secrets:

```bash
SUPABASE_URL=https://fngkpuyvzqemkqnenryq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role secret — from Supabase dashboard > Project Settings > API>
```

`SUPABASE_SERVICE_ROLE_KEY` is a secret with full database access (it bypasses Row Level
Security). Keep it server-side only — never prefix it with `NEXT_PUBLIC_` and never commit a
real value. If either var is unset, the app still works — submissions are emailed but not
persisted (a warning is logged).

### Email (Resend)

1. Create a Resend account and verify the sending domain for `munaxa.com`.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Munaxa <no-reply@munaxa.com>`).
3. Without `RESEND_API_KEY`, emails are skipped and logged — useful for local development.

On a successful contact form submission, two emails are sent:

| Recipient         | Subject                           | Purpose                                                                              |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| The visitor       | "Thank You for Contacting Munaxa" | Acknowledgment                                                                       |
| `info@munaxa.com` | "New inquiry from {School Name}"  | Internal notification with full details, submission time, IP address, and user agent |

### Optional CAPTCHA (Cloudflare Turnstile)

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to enable Turnstile on the
contact form. Leave both empty to disable — the form remains protected by the honeypot field
and IP-based rate limiting either way.

## Available scripts

| Command           | Description                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`        | Run the dev server on port 3100                                                |
| `pnpm build`      | Production build (`next build`)                                                |
| `pnpm start`      | Run the production build with `next start`                                     |
| `pnpm lint`       | Lint                                                                           |
| `pnpm typecheck`  | Type-check                                                                     |
| `pnpm preview`    | Build with OpenNext and run it locally in the Workers runtime (`wrangler dev`) |
| `pnpm run deploy` | Build with OpenNext and deploy to Cloudflare Workers                           |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc`                         |

> Use `pnpm run deploy` (not `pnpm deploy`) — bare `deploy` is a reserved pnpm command.

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
│   │   ├── ui/                  # Local primitives (Button, Card, Input, etc.)
│   │   └── icons/                # Inline illustrations
│   └── lib/                     # cn, validation, csrf, rate-limit, db, email, turnstile, logger
├── db/migrations/                # SQL migrations for early_access_requests (Supabase)
├── src/middleware.ts              # CSP nonce + CSRF cookie
├── wrangler.jsonc                 # Cloudflare Workers config (KV binding, assets)
├── open-next.config.ts            # OpenNext Cloudflare adapter config
├── pnpm-workspace.yaml            # Marks this dir as its own pnpm root (standalone installs)
├── Dockerfile
└── .env.example
```

## Deployment

### Cloudflare Workers (primary)

The app deploys to Cloudflare Workers via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare),
using Workers Assets for static files and a KV namespace (`RATE_LIMIT_KV`, bound in
`wrangler.jsonc`) for distributed contact-form rate limiting.

1. **One-time setup** — authenticate Wrangler and create the KV namespace (already created
   for this project: `munaxa-landing-rate-limit`, id `907601a57357499f83f2b7db83339834`,
   bound as `RATE_LIMIT_KV` in `wrangler.jsonc`). To create your own:
   ```bash
   pnpm exec wrangler kv namespace create munaxa-landing-rate-limit
   # then update the "id" in wrangler.jsonc
   ```
2. **Configure secrets** (per environment) via `wrangler secret put <NAME>` or the Cloudflare
   dashboard → Workers → Settings → Variables. `SUPABASE_URL` is already set as a non-secret
   `vars` entry in `wrangler.jsonc`; the rest must be set as encrypted secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `TURNSTILE_SECRET_KEY` (and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a build-time var, if used)
   - `NEXT_PUBLIC_SITE_URL`, `SENTRY_DSN` (optional)
3. **Build & deploy:**
   ```bash
   pnpm run deploy
   ```
   This runs `opennextjs-cloudflare build` (bundles the Next.js app for Workers) followed by
   `opennextjs-cloudflare deploy` (`wrangler deploy` under the hood). Requires
   `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID` in the
   environment, or `wrangler login` for interactive use.
4. **Preview locally in the Workers runtime** (more accurate than `next dev`):
   ```bash
   pnpm preview
   ```
5. **Custom domain:** attach a custom domain/route to the Worker from the Cloudflare dashboard
   (Workers & Pages → munaxa-landing → Settings → Domains & Routes), e.g. `www.munaxa.com`.

### CI/CD (GitHub Actions)

`.github/workflows/deploy-landing.yml` builds and deploys the Worker on every push to `main`
that touches this app, and can also be run manually (`workflow_dispatch`). It needs the
following **repository secrets** (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` — Workers Scripts: Edit permission
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`

The workflow runs `pnpm run deploy` and then `wrangler secret put` for each of the secrets
above so the Worker's runtime config stays in sync with the GitHub secrets on every deploy.
If this app is moved to its own repository, copy that workflow file into
`.github/workflows/` of the new repo and remove the `working-directory` /
`cache-dependency-path` settings (or point them at the repo root).

### Docker (alternative, self-hosted)

```bash
docker build -t munaxa-landing .
docker run -p 3100:3100 --env-file .env munaxa-landing
```

Terminate TLS in front of the app (e.g. Nginx, ALB, Cloudflare in proxy mode) and ensure HTTPS
is enforced — the app sends `Strict-Transport-Security` assuming it is served over HTTPS.

### Other platforms (Vercel / Node hosts)

The app is a plain Next.js 15 project — point the platform at this directory and configure
the environment variables from `.env.example`.

## Security

See [SECURITY.md](./SECURITY.md) for a full breakdown of the security controls implemented
(headers, CSP, CSRF, rate limiting, input validation, anti-spam, and logging).

## Notes & assumptions

- The landing page is **English-only** for this initial version. The layout already uses
  logical CSS properties (`ps-`/`text-start` etc.) where practical, so RTL support can be
  added later if a bilingual marketing site is required.
- Testimonials in `src/components/sections/testimonials.tsx` are **placeholders** and must be
  replaced with real, permissioned customer quotes before launch.
- Pricing is intentionally not published; the FAQ directs visitors to contact sales.
- No internal architecture, API routes, database schema, or security control details from the
  Munaxa School OS are referenced anywhere in the page content.
