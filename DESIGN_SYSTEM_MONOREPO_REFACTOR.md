# Design System Monorepo Refactor — Migration & Deliverables Report

**Program:** Munaxa — Design System as the single source of truth
**Branch:** `claude/design-system-monorepo-refactor-i0m1k6`
**Date:** 2026-06-26
**Type:** Architecture refactor only — **no UI redesign, no business-logic / API / workflow changes.**

> This document is the authoritative deliverable for the refactor. It covers all eight
> required outputs: (1) Migration Report, (2) New folder structure, (3) Components migrated,
> (4) Tokens migrated, (5) Compatibility layer, (6) Updated imports, (7) Documentation
> updates, (8) Validation report.

---

## 0. Executive summary

The platform now has a real **token + component foundation** that behaves like Polaris /
Fluent / Primer: one place for tokens, one place for components, consumed through stable
public APIs.

**Shipped & build-verified this phase:**

| Layer | Package | Status |
|---|---|---|
| Design tokens (single source of truth) | **`@munaxa/design-tokens`** (new) | ✅ built, lint-clean |
| Icons (single icon source) | **`@munaxa/icons`** (new) | ✅ built, lint-clean |
| Tailwind preset now consumes tokens | `@munaxa/config-tailwind` | ✅ rewired, values identical |
| Component library, enterprise taxonomy | `@munaxa/ui` | ✅ reorganized, public API stable |
| Canonical consumer unaffected | `apps/admin` | ✅ typecheck clean |

**Deliberately deferred (gradual migration, see §9):** physically deleting the duplicate
component/token copies inside the **standalone** apps (`munaxalanding`, `munaxademo`) and the
**design-system website** (`munaxadesignsystem`). Those three are independent pnpm roots with
their own lockfiles and separate Cloudflare deploys; consolidating them is a controlled,
per-app step that must not break their deployments. The foundation they will consume is now in
place, and every duplicate is inventoried below.

---

## 1. Migration Report — Audit of duplication

Scan scope: `apps/*`, `munaxalanding`, `munaxademo`, `munaxadesignsystem`, `packages/*`
(excluding `node_modules` / build output).

### 1.1 Duplicated UI components

`@munaxa/ui` holds **19** canonical component files. The same primitives are re-implemented in
multiple other places:

| Component | Canonical | Duplicates found in |
|---|---|---|
| Button | `@munaxa/ui` | landing, demo, design-system website |
| Card | `@munaxa/ui` | landing, demo, design-system website |
| Badge | `@munaxa/ui` | landing, demo, design-system website |
| Input | `@munaxa/ui` | landing, demo, design-system website |
| Table | `@munaxa/ui` | demo, design-system website |
| Spinner | `@munaxa/ui` | demo, design-system website |
| Field | `@munaxa/ui` | demo, design-system website |
| Textarea, Checkbox, Switch, Tabs, Tooltip, Dialog, Drawer, Pagination | `@munaxa/ui` | design-system website |

- **`munaxalanding/src/components/ui/`** — 7 duplicate primitives (button, badge, input, card, label, + 2 app widgets).
- **`munaxademo/src/components/ui/`** — 7 duplicate primitives.
- **`munaxadesignsystem/client/src/components/ui/`** — **53** shadcn-style components (the full reference set; superset of `@munaxa/ui`).

### 1.2 Duplicated design tokens

| Token surface | Locations |
|---|---|
| Brand palette / radius / shadows / fonts (Tailwind theme) | `packages/config-tailwind/preset.ts` **and** inlined verbatim in `munaxalanding/tailwind.config.ts` **and** `munaxademo/tailwind.config.ts` |
| Typed token modules (colors/spacing/typography/radius/shadows/motion/zIndex) | `munaxadesignsystem/client/src/design-system/tokens/*` |

These were three drifting copies of the same values. **`@munaxa/design-tokens` is now the
single typed source**, and `config-tailwind` derives from it.

> ⚠️ **Drift detected during audit:** `munaxadesignsystem/.../tokens/colors.ts` had diverged to a
> teal/Orbix palette (`#007595`) while the **live** preset and apps ship the violet brand
> (`#7A3FFF`). `@munaxa/design-tokens` carries the **live, shipped** values (violet) so the
> migration changes nothing visually. Reconciling the website's stale token file is a
> documentation cleanup, tracked in §9.

### 1.3 Duplicated utilities & icons

| Item | Locations |
|---|---|
| `cn()` class combiner | `@munaxa/ui` (canonical), `munaxalanding/src/lib/cn.ts`, `munaxademo/src/lib/cn.ts`, `munaxadesignsystem/client/src/lib/utils.ts` |
| `token-reference` widget | landing, demo, design-system website (3 copies) |
| Icon library (`lucide-react`) | pinned independently by landing (`^0.469`) & design-system website (`^0.453`); 12 importers in landing alone. Now centralized in **`@munaxa/icons`**. |

### 1.4 Duplicated hooks

Only the design-system website carries shared hooks (`useMobile`, `useComposition`,
`usePersistFn`). No cross-app hook duplication today; `@munaxa/ui/src/hooks` is the destination
when they are promoted (§9).

---

## 2. New folder structure

### 2.1 Packages (workspace `packages/*`)

```
packages/
  design-tokens/      ← NEW · single source of truth for all tokens
    src/
      colors.ts  typography.ts  spacing.ts  radius.ts  elevation.ts
      border.ts  motion.ts  transitions.ts  z-index.ts  breakpoints.ts
      index.ts
    css/tokens.css     ← canonical CSS custom properties (opt-in import)
  icons/              ← NEW · single icon source (re-exports lucide-react)
    src/index.ts
  ui/                 ← reorganized into the enterprise taxonomy below
  config-tailwind/    ← (a.k.a. "tailwind-config") now consumes design-tokens
  config-eslint/      ← (a.k.a. "eslint-config")
  config-typescript/  ← (a.k.a. "tsconfig")
  contracts/ domain/ i18n/ utils/
```

> Naming note: the architecture brief lists `tailwind-config`, `eslint-config`, `tsconfig`.
> Those already exist as `config-tailwind`, `config-eslint`, `config-typescript`. They were
> **kept under their existing names** to avoid a churny, risky rename of working, widely-imported
> packages — the role is identical. This is the single intentional deviation from the brief's
> literal names.

### 2.2 `@munaxa/ui` internal taxonomy

```
packages/ui/src/
  components/
    primitives/      button, badge
    forms/           input (+ Select, fieldBase), textarea, field, checkbox, radio, switch
    feedback/        spinner, empty-state, error-state, tooltip, dialog, drawer
    navigation/      tabs, pagination
    layout/          card
    data-display/    table, timeline
    patterns/        (composite patterns — populated in later phases)
  hooks/             (shared hooks — populated as hooks are promoted)
  lib/               cn  (moved here from src/cn.ts)
  icons/             re-export of @munaxa/icons
  styles/            component-scoped CSS (keyframes/print/base)
  tokens/            re-export of @munaxa/design-tokens
  index.ts           ← the single public API barrel
```

---

## 3. Components migrated

This phase **organized** the canonical set (no behavior change) and established the taxonomy
and category barrels. Files were moved with `git mv` (history preserved):

- **primitives:** Button, Badge
- **forms:** Input, Select, Textarea, Field, Checkbox, Radio, RadioGroup, Switch
- **feedback:** Spinner, EmptyState, ErrorState, Tooltip, Dialog, Drawer
- **navigation:** Tabs (+List/Trigger/Content), Pagination
- **layout:** Card (+Header/Title/Description/Content/Footer)
- **data-display:** Table (THead/TBody/TR/TH/TD), Timeline (+TimelineItem)

The duplicate copies in landing / demo / design-system website are **inventoried** (§1.1) and
queued for deletion-after-verification in §9 — nothing was deleted yet, per the "verify
compatibility before deleting" rule.

---

## 4. Tokens migrated

Every token category from the reference system is now typed and exported from
`@munaxa/design-tokens`:

| Category | Export | Notes |
|---|---|---|
| Colors | `colors` | brand, ink, neutral, theme-aware coral/aqua, semantic (success/warning/info/danger), data-viz, gradient stops |
| Typography | `typography` | fontFamily, fontSize, fontWeight, lineHeight |
| Spacing | `spacing` | platform scale (rem) |
| Radius | `radius` | none→full (8/12/14/22/32px) |
| Elevation | `elevation` | sm/md/lg/card/glow/**focus ring** |
| Border | `border` | width, style, color token |
| Motion | `motion` | duration + easing |
| Transitions | `transitions` | ready-made `transition` presets composed from motion |
| Z-index | `zIndex` | base→toast named layering |
| Breakpoints | `breakpoints` | sm→2xl |

Plus `tokens` (the whole set as one object) and `@munaxa/design-tokens/css` (CSS variables for
non-TS consumers). **No values were invented** — they mirror the live shipped brand.

---

## 5. Compatibility layer

Backward compatibility is the core safety property of this phase:

1. **Stable public API.** `@munaxa/ui`'s `index.ts` exports the exact same names as before the
   reorganization (verified against the compiled `dist`). Only an additive `tokens` namespace
   was added. Internal files moved; the public surface did not.
2. **Admin barrel untouched.** `apps/admin/src/components/ui/index.ts` is still
   `export * from '@munaxa/ui'`; all `@/components/ui` imports keep working unchanged.
3. **`'use client'` preserved** in the compiled output of interactive components
   (Dialog, Drawer, Tooltip, Tabs) so Next.js still treats them as client components.
4. **Identical preset output.** `config-tailwind` now reads values from `@munaxa/design-tokens`
   but emits byte-identical theme values (verified: brand `#7A3FFF`, ink `#0B0518`, focus ring,
   z-index, durations all unchanged) — zero visual diff.
5. **Nothing deleted.** Duplicates remain in place until each consumer is migrated and verified.

---

## 6. Updated imports

| Where | Before | After |
|---|---|---|
| `@munaxa/ui` component internals | `import { cn } from '../cn.js'` | `import { cn } from '../../lib/cn.js'` |
| `@munaxa/ui` public barrel | flat component files | category barrels → single root barrel |
| `config-tailwind/preset.ts` | hardcoded hex literals | `import { colors, elevation, motion, zIndex, typography } from '@munaxa/design-tokens'` |
| Apps (Admin) | `import { Button } from '@munaxa/ui'` | **unchanged** (still the one true path) |

The rule going forward, enforced by convention and the public barrel: **apps import only from
`@munaxa/ui` and `@munaxa/design-tokens` — never deep internal paths.** A repo scan confirms
**zero** deep imports into `@munaxa/ui/...` internals today.

---

## 7. Documentation updates

- This report (the master deliverable).
- `@munaxa/design-tokens`, `@munaxa/icons`, and the new `@munaxa/ui` directories are
  self-documented with file-level docblocks describing ownership and the "single source of
  truth" contract.
- **Design-system website (`munaxadesignsystem`)** documentation refactor — turning each doc
  page into a live `@munaxa/ui` consumer (Live Preview / Variants / Props / A11y / Usage / Copy
  Import / Copy Example / Do-Don't / Guidelines / Related) — is the explicit next phase (§9).
  It is intentionally **not** done in the same change that establishes the foundation, because it
  requires bridging the website's Vite + Tailwind v4 + Radix stack to the package, which is a
  larger, separately-reviewable migration.

---

## 8. Validation report

### 8.1 Build / typecheck / lint (this environment)

| Check | Result |
|---|---|
| `pnpm --filter @munaxa/design-tokens build` | ✅ |
| `pnpm --filter @munaxa/icons build` | ✅ |
| `pnpm --filter @munaxa/ui build` | ✅ (`'use client'` preserved in dist) |
| `pnpm --filter @munaxa/admin typecheck` | ✅ clean |
| `lint` (design-tokens, icons, ui) | ✅ clean |
| Token resolution from preset (runtime) | ✅ values identical to previous hardcoded preset |

> The API package's Prisma engine download fails in this sandbox (no outbound network for the
> Prisma binary); that is an environment limitation unrelated to this refactor and does not
> touch the design-system packages.

### 8.2 "Change a token → everything updates" — current truth

| Target | Editing `@munaxa/design-tokens` propagates? |
|---|---|
| **Admin** | ✅ **Yes, today.** Admin → `config-tailwind` preset → `@munaxa/design-tokens`. |
| **`@munaxa/ui`** | ✅ Yes — consumes the preset's classes + can import tokens directly. |
| **Landing** | ✅ **Yes, as of Phase 2 (§10).** Edit `@munaxa/design-tokens` → `pnpm sync:tokens` → Landing's generated tokens update; CI fails if they drift. |
| **Demo** | ⏳ Next: apply the same generator target (§10 is built to extend to it). |
| **Design-system website** | ⏳ **After §9 step.** Replace its local `tokens/*` with `@munaxa/design-tokens`. |

### 8.3 "Change `Button.tsx` → every app updates" — current truth

✅ **True today for Admin** (the only app consuming `@munaxa/ui`). Becomes true for
landing/demo/website as each is migrated off its local copy in §9.

---

## 9. Remaining gradual migration (next phases)

Ordered, each independently shippable and verifiable. **Nothing here deletes code until its
replacement is proven in that app.**

1. **Landing → packages.** _Tokens: ✅ done in Phase 2 (§10)._ Remaining: consume `@munaxa/ui`,
   `@munaxa/icons`, `@munaxa/config-tailwind` to delete the 7 local `ui/*` and `lib/cn.ts` — this
   step needs the **component-distribution decision** (§10.3: join workspace vs publish packages).
2. **Demo → packages.** Same procedure for `munaxademo` (7 local `ui/*` + inlined tokens + `lib/cn.ts`).
3. **Design-system website → consumer-only.** Bridge `munaxadesignsystem` (Vite/Tailwind v4) to
   `@munaxa/ui` + `@munaxa/design-tokens`; replace its 53 local `ui/*` and `tokens/*`; rebuild every
   doc page as a live `@munaxa/ui` consumer with the full documentation template (§7). Delete the
   local component/token copies — **the website must never own duplicate UI**.
4. **Promote shared hooks** (`useMobile`, `useComposition`, `usePersistFn`) into `@munaxa/ui/hooks`.
5. **Grow `@munaxa/ui`** to cover the reference superset still only in the website (Avatar, Select,
   DatePicker, Calendar, Combobox, Charts, Sidebar, Breadcrumb, StatCard, DataTable, Skeleton, etc.).
6. **Reconcile the stale website `colors.ts`** (teal drift) against `@munaxa/design-tokens`.

### CI

The workspace `node` CI job already runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
`pnpm build` (turbo) across **all** workspace packages — so `@munaxa/design-tokens`,
`@munaxa/icons`, and `@munaxa/ui` are now gated on every PR automatically. Standalone
`landing` / `demo` / `designsystem` jobs continue to gate those apps. As each app joins the
workspace in §9, it is covered by the same workspace gates.

---

## 10. Phase 2 — Landing token consolidation (shipped)

**Goal:** make `@munaxa/design-tokens` the source of truth for Landing's tokens **without**
changing Landing's standalone deploy model and with **zero visual change**.

### 10.1 Why not just add Landing to the workspace?

Investigated and ruled out for this phase (documented so the decision is auditable):

- `munaxalanding` is an **independent pnpm root** (its own `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
  `.npmrc`). Both its `Dockerfile` and its **Cloudflare deploy** (`opennextjs-cloudflare build`,
  `wrangler.jsonc`) run `pnpm install --frozen-lockfile` **from inside `munaxalanding`** as a
  standalone root.
- The Cloudflare build/install command lives in an **external dashboard** (the repo's own CI
  comments confirm "Deployed to Cloudflare via the dashboard Git integration"), which this repo
  cannot edit or verify.
- Therefore, removing Landing's standalone lockfile to join the workspace would break the Docker
  self-host build **and** risk breaking a Cloudflare deploy that can't be fixed from here.
- Landing's Tailwind config is also a **customized variant** (different radius/shadow/gradient,
  extra `arabic` font + container-queries), not byte-identical to the shared preset — so it can't
  simply adopt the preset wholesale without visual changes.

### 10.2 What shipped (zero new runtime dep, zero visual change)

| Change | File |
|---|---|
| Token generator (reads the built `@munaxa/design-tokens`, writes a committed, dependency-free module per app) | `scripts/sync-design-tokens.mjs` |
| `pnpm sync:tokens` / `pnpm sync:tokens:check` scripts | root `package.json` |
| Generated, committed token module Landing imports | `munaxalanding/src/design-tokens.generated.ts` |
| Tailwind config now imports `brand`/`ink` from the generated module (values identical) | `munaxalanding/tailwind.config.ts` |
| CI gate: fail if any app's generated tokens drift from the source | `.github/workflows/ci.yml` (`Design-token sync check`) |
| Generator output excluded from Prettier (formatting owned by the generator) | `.prettierignore` |

**Verification (this environment):** Landing `typecheck` ✅, `build` ✅ (identical route output to
the pre-change baseline), `lint` ✅; `pnpm sync:tokens:check` ✅ (no drift). Generated brand/ink
values are literally identical to the previously hardcoded ones — no CSS diff.

### 10.3 What still needs a decision (component distribution)

Deleting Landing's **7 local `ui/*` components** and `lib/cn.ts` in favor of `@munaxa/ui`
requires a way for a standalone app to consume a **private** package. The generator pattern works
for *tokens* (plain values) but not for *React components*. Two viable paths — owner's call:

- **(A) Join the workspace** — true live imports (`edit Button.tsx → Landing updates`), but
  requires reworking the Docker build and the external Cloudflare build command.
- **(B) Publish `@munaxa/*`** to a private registry (e.g. GitHub Packages) — Landing stays a
  standalone root and depends on versioned releases; needs release/versioning infrastructure.

Until that decision, Landing's local components remain (inventoried in §1.1); **nothing was
deleted**. The same generator already supports adding `munaxademo` as a second target (one line
in `scripts/sync-design-tokens.mjs`).
