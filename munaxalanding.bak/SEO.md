# Munaxa SEO Architecture

This document describes the enterprise SEO framework in `munaxalanding` and the indexing
strategy applied across the Munaxa apps. It is built **on top of** the existing design
system — no colours, typography, spacing, components, or workflows were changed.

## Indexing strategy by application

SEO responsibility is decided by **application purpose**, not repository location:

| App | Purpose | Indexing |
| --- | --- | --- |
| `munaxalanding` | Public marketing site (`www.munaxa.com`) | **Full SEO** — every page indexable |
| `munaxademo` | Public live demo (`demo.munaxa.com`) | **Selective** — `/request-demo` indexable; login + all authenticated `(app)/*` screens `noindex` |
| `apps/admin` | Authenticated School OS (`app.munaxa.com`) | **Never indexed** — global `noindex, nofollow`, `X-Robots-Tag`, robots.txt disallow-all, self-canonical auth pages |

Enforcement is layered (defence-in-depth): per-route `robots` metadata **+** an
`X-Robots-Tag` header (middleware in the demo, `next.config` in admin) **+** `robots.ts`.

## The framework (`src/lib/seo/`)

| Module | Responsibility |
| --- | --- |
| `config.ts` | Site constants, locale/OG maps, brand, geo targeting, verification + analytics IDs (all env-driven) |
| `metadata.ts` | `buildMetadata()` — canonical, hreflang alternates, OG, Twitter, robots, authors, publisher, applicationName |
| `jsonld.ts` | Builders for every schema type: Organization, WebSite (+ SearchAction), SoftwareApplication, FAQPage, HowTo, BreadcrumbList, Article/BlogPosting, Person, LocalBusiness, Review, AggregateRating, Product, VideoObject, ImageObject, CollectionPage, ItemList |
| `breadcrumbs.ts` | `buildBreadcrumbs()` — trail data + BreadcrumbList nodes |
| `content-metadata.ts` | Bridges the content registry to `buildMetadata()` |
| `validate.ts` | Automated SEO validation (runs at build time via `sitemap.ts`) |

Components: `components/seo/json-ld.tsx` (nonce-aware, CSP-safe), `breadcrumbs.tsx`,
`content-page-view.tsx` (programmatic page renderer), `collection-view.tsx` (hub renderer).

## Programmatic SEO engine (`src/content/`)

All page content is **structured data** — nothing is hardcoded in route components. Adding
a page is a data change in one file; routing, metadata, JSON-LD, breadcrumbs, internal
links and the sitemap update automatically. This scales to thousands of pages.

| Content type | Route | Schema |
| --- | --- | --- |
| Features (`features.ts`) | `/features`, `/features/[slug]` | SoftwareApplication + FAQ + Breadcrumb |
| Solutions (`solutions.ts`) | `/solutions`, `/solutions/[slug]` | SoftwareApplication + FAQ |
| Countries (`countries.ts`) | `/[country]` | LocalBusiness + SoftwareApplication |
| Cities (`countries.ts`) | `/[country]/[city]` | LocalBusiness |
| Integrations (`integrations.ts`) | `/integrations`, `/integrations/[slug]` | SoftwareApplication |
| Comparisons (`comparisons.ts`) | `/compare`, `/compare/[slug]` | SoftwareApplication |
| Articles (`articles.ts`) | `/blog`, `/blog/[slug]` | BlogPosting + FAQ |

The root `[country]` segment uses `dynamicParams = false`, so only known country slugs
render; every other single-segment path 404s and static routes always win — it never
shadows `/features`, `/privacy`, etc.

### Content model

Every entry is a `ContentPage` with localized (`{ en, ar }`) fields — see `content/types.ts`.
English is authoritative and acts as the fallback (`t(value, locale)`). This satisfies the
multilingual requirement (localized titles, descriptions, H1, lead, highlights, FAQ) and is
the foundation for a future CMS: a CMS only needs to satisfy the `ContentPage` type.

### Internal linking

`resolveRelated()` turns each entry's `related` refs into real links (unknown slugs are
skipped, so no broken links). Every page surfaces related Features / Solutions / Countries /
Integrations / Comparisons / Articles, plus breadcrumb trails and hub index pages.

## Multilingual SEO

The site serves both languages on a **single URL** (locale is cookie-driven; see
`middleware.ts`). Canonicals are therefore self-referential, and `hreflang` alternates map
`en`, `ar` and `x-default` to that URL, preventing duplicate-content treatment. Arabic pages
render RTL via the existing design-system tokens.

## AI search optimization

Pages use semantic HTML, entity-first content, an answer-led lead paragraph, structured
FAQ blocks and rich JSON-LD — the signals Google AI Overviews, ChatGPT, Claude, Gemini and
Perplexity rely on.

## Analytics (`components/analytics/analytics.tsx`)

GA4, Microsoft Clarity and PostHog each load **only when configured**, via nonce'd scripts
that keep the strict CSP intact. Analytics endpoints are allow-listed in the middleware CSP.
Search Console / Bing / Yandex verification is emitted through metadata. See `.env.example`.

## Automated validation

`validateContent()` runs at build time (invoked from `sitemap.ts`) and reports, in the build
logs: duplicate paths, duplicate titles/descriptions, missing required fields, broken
internal links, and out-of-range title/description lengths. It is non-fatal by default and
reusable in CI/tests.

## What was intentionally NOT changed

Design system, typography, spacing, brand colours, component library, existing UX, existing
workflows and business logic are untouched. New pages reuse the existing `Header`, `Footer`,
`Card`, `Button`, tokens and `section-shell` layout.
