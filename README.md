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
├── apps/web/                            # The corporate site (Next.js 15, App Router)
├── PLATFORM_ENGINEERING_STANDARDS.md    # Mandatory. How work is done across the ecosystem
└── docs/MIGRATION_REPORT.md             # The monorepo → multi-repo migration record
```

The corporate site covers the company's own surfaces: product showcase, pricing, about,
careers and contact. Product marketing sites live with their products —
`munaxa.com`'s School landing page is in `munaxa-school`, not here.

## The design system comes from the platform

Corporate owns its content, routing and copy. It owns no design system:

```tsx
import { buttonVariants, Card } from '@munaxa/ui';
```

```css
/* apps/web/src/app/globals.css */
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
