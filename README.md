# Munaxa

The corporate repository for **Munaxa** — the company website, and the org-level engineering
standards the whole ecosystem is held to.

This repository is **not** the platform. It consumes the shared design system exactly like
every other product.

## The ecosystem

| Repository                                                            | What it is                        |
| --------------------------------------------------------------------- | --------------------------------- |
| **munaxa** (this repo)                                                  | Corporate website + org standards  |
| [munaxa-platform](https://github.com/tam2om/munaxa-platform)             | The shared design system           |
| [munaxa-school](https://github.com/tam2om/munaxa-school)                 | School — the School OS             |
| [munaxa-work](https://github.com/tam2om/munaxa-work)                     | Work — HCM                         |
| [munaxa-docs](https://github.com/tam2om/munaxa-docs)                     | Docs — document control            |

```text
                    munaxa-platform
                           │
        ┌──────────┬───────┴───────┬──────────┐
        ▼          ▼               ▼          ▼
     munaxa   munaxa-school   munaxa-work  munaxa-docs
```

That is every dependency edge in the ecosystem. Products never depend on each other, and the
platform never depends on a product. Each repository installs, lints, typechecks, tests and
builds on its own, without cloning any other.

## What's here

```text
munaxa/
├── apps/web/                            # munaxa.com (Next.js 15, App Router, Cloudflare Workers)
├── PLATFORM_ENGINEERING_STANDARDS.md    # Mandatory. How work is done across the ecosystem
└── docs/MIGRATION_REPORT.md             # The monorepo → multi-repo migration record
```

`munaxa.com` is the landing site for all three products: a hub page (`/`) and one sales page each
for School (`/school`), Work (`/work`) and Docs (`/docs`). Each product is sold separately, so each
page stands on its own; the hub introduces the three and sends visitors to the right one. Every
page ends in a demo form that emails `info@munaxa.com` through Resend.

The pages live in four route groups, each with its own root layout and exactly one theme import
(`apps/web/src/styles/<theme>.css`), so `/school` wears the School theme, `/docs` the Docs theme
and the hub the corporate one. The hub also shows the three products side by side, which the
platform's `:root` palettes cannot express; `ProductScope` covers that from the theme registry until
the platform ships scoped palettes (see `styles/corporate.css`).

Deploys go to the Cloudflare Worker `munaxa` on every merge to `main`
(`.github/workflows/deploy-cloudflare.yml`).

## The design system comes from the platform

Corporate owns its content, routing and copy. It owns no design system:

```tsx
import { buttonVariants, Card } from '@munaxa/ui';
```

```css
/* apps/web/src/styles/corporate.css */
@import 'tailwindcss';
@import '@munaxa/theme/css/corporate';
@source '../../node_modules/@munaxa/platform/dist';
```

Branding is that theme import and nothing more. Writing a Button here, defining a colour, or
hardcoding a hex is a bug — the change belongs in
[munaxa-platform](https://github.com/tam2om/munaxa-platform). CI enforces both halves: a
`no hardcoded hex` lint rule, and a `boundaries` job that fails on an import from any product.

## Setup

Installing needs a GitHub token with `read:packages` on the `tam2om` org — that is how
`@munaxa/*` resolves from GitHub Packages:

```bash
export GITHUB_TOKEN=<PAT with read:packages>
pnpm install

pnpm dev        # http://localhost:3100
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The demo forms need `RESEND_API_KEY` (copy `apps/web/.env.example` to `.env.local`). Without it,
development logs submissions instead of emailing them. To run the production Worker locally:

```bash
pnpm --filter @corporate/web cf:preview   # OpenNext build + wrangler dev; secrets in apps/web/.dev.vars
```
