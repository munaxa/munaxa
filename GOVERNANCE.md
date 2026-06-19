# Munaxa Design System — Governance

**Status:** Authoritative · **Canonical reference:** [`munaxadesignsystem/`](./munaxadesignsystem)
**Applies to:** `apps/admin` and all shared UI (`packages/ui`, `packages/config-tailwind`, `packages/i18n`).

`munaxadesignsystem/` is the **single, formal source of truth** for structure, design, theme, components, patterns, and content. This document codifies how that system is consumed and enforced in the product, distilled from the reference's governance docs (`DESIGN_GOVERNANCE.md`, `AI_GENERATION_RULES.md`, `DOMAIN_ARCHITECTURE.md`, `WORKSPACE_ARCHITECTURE.md`, `ENTERPRISE_NAVIGATION.md`).

---

## 0. One brand, all surfaces

Every surface in the repo uses **one palette — the Munaxa Design System brand** — defined once in **`munaxadesignsystem/client/src/index.css`** (the canonical source of truth): violet primary `#5B1FD6` (light) → `#B97BFF` (dark) on ink/violet surfaces (`#F7F5FF` / `#0B0518`), with coral + aqua accents and semantic success(aqua)/warning(amber)/error(coral)/info.

| Surface | Tokens live in | Conforms? |
|---|---|---|
| `munaxalanding` (marketing) | inlined in `src/app/globals.css` + `tailwind.config.ts` | ✅ 1:1 |
| `munaxademo` (sandbox) | inlined in `src/app/globals.css` + `tailwind.config.ts` | ✅ 1:1 |
| `apps/admin` (product) + `@munaxa/config-tailwind`, `@munaxa/ui` | `@munaxa/config-tailwind/preset.ts` + `apps/admin/src/app/globals.css` (Munaxa Design System hexes in shadcn HSL-channel form) | ✅ 1:1 |

**Rule:** the canonical `index.css` is the source of truth; all surfaces must track it 1:1. When the brand changes, update `index.css` first, then re-sync each app's inlined tokens — never edit an app's palette ad hoc or fork a separate theme. *(There is no longer a separate "enterprise" admin palette; the old standalone design-system HTML mockups have been removed in favour of this single source.)*

---

## 1. Source of truth & layering

| Layer | Home | Rule |
|---|---|---|
| **Tokens** | `@munaxa/config-tailwind/preset.ts` + `apps/admin/src/app/globals.css` | Colours are the Munaxa Design System brand from `munaxadesignsystem` (the canonical `index.css` hexes, mirrored as shadcn HSL channels). Spacing/radius/shadow/z-index/motion follow `munaxadesignsystem`. Never invent values — use tokens only. |
| **Primitives** | `@munaxa/ui` (`packages/ui/src/components`) | The only home for Button, Input, Card, Dialog, Tabs, Table, etc. No app-local re-implementations. |
| **Domain components** | `apps/admin/src/components/domain` | App-specific compositions over primitives (e.g. status badges, `RecordHeader`). Own the single source of truth for their domain's status colours. |
| **Patterns** | primitives + domain | EmptyState / ErrorState / Timeline / Record Workspace / Enterprise Nav per the reference. |

---

## 2. Absolute rules (the "never" list)

- **Never** introduce a new colour, spacing, radius, shadow, z-index, or motion value. Use tokens only.
- **Never** hardcode hex/`rgb`/`hsl` colours or raw Tailwind palette classes (`bg-red-500`). Use semantic token classes (`bg-primary`, `text-muted-foreground`, `bg-success`, `text-warning`, `border-border`). *(Mechanically enforced — see §5.)*
- **Never** duplicate a primitive — reuse/extend `@munaxa/ui`.
- **Never** change business logic, APIs, database schemas, routes, or workflows for a design change.

## 3. Always

- **Theme:** light-first default; full dark mode via the `.dark` class and theme-aware tokens.
- **RTL:** use logical properties (`ps-/pe-/ms-/me-/text-start/text-end/border-s/border-e/start-/end-`). Physical-direction utilities (`pl-/pr-/ml-/mr-/text-left/right/left-/right-`) are prohibited.
- **Accessibility (WCAG AA):** label every control (`Field`), `scope` on table headers, keyboard support + ARIA on interactive widgets, visible focus rings, `prefers-reduced-motion` respected, a skip link.
- **i18n:** all user-facing strings via `@munaxa/i18n` (EN + AR); no hardcoded copy.
- **Permissions & tenancy:** respect `principal.permissions` (nav + actions) and tenant isolation; never surface data a role can't access.

## 4. Typography & theme baseline

- **Colour:** the single Munaxa Design System brand from `munaxadesignsystem` (see §0) — violet primary `#5B1FD6` (light) / `#B97BFF` (dark) on ink/violet surfaces, coral + aqua accents, semantic success(aqua)/warning(amber)/error(coral)/info. Radius `0.5rem` in `apps/admin`.
- **Fonts (one intentional per-surface difference):** `apps/admin` ships **self-hosted IBM Plex Sans** (Latin) + **IBM Plex Sans Arabic** (RTL) so the product app has no Google-Fonts/CDN dependency; the public surfaces (`munaxalanding`, `munaxademo`) use the Munaxa Design System display stack **Sora / Inter / Cairo**. Both expose the same `--font-display` / `--font-body` / `--font-arabic` variables, so components are font-agnostic.

## 5. Enforcement

- **ESLint guardrail** (`apps/admin/eslint.config.mjs`): blocks hardcoded hex colours and raw Tailwind palette colours in `src/**`. Build fails on violation.
- **CI gates:** `typecheck` + `next build` (which runs lint) must pass; `prettier` + `eslint --fix` run pre-commit.
- Tailwind scans `packages/ui/src` so token classes resolve across the shared layer.

## 6. Contribution flow

1. Check the reference (`munaxadesignsystem/`) for the relevant token / component / pattern first.
2. Reuse the existing primitive or domain component; extend it (preserving its public API) rather than forking.
3. If a needed token/component is missing, **add it to the shared layer** (`@munaxa/config-tailwind` / `@munaxa/ui`) with values from the reference — not inline in a page.
4. Keep changes composition-only unless the task is explicitly about logic.
5. Verify: `pnpm --filter @munaxa/admin typecheck && pnpm --filter @munaxa/admin build`.

## 7. Exceptions (documented, not silent)

- **Modal scrims / nested-dialog z-index** may use values above the token scale (`z-[60/70/80]`) for stacking; documented inline.
- **Print stylesheets** inline DS token values as `rgb()` (a separate document can't read CSS variables).
- **Status badges** use a soft-tint variant of the DS semantic colours for dense tables (colours remain DS-sourced).

> When unsure, prefer the reference and ask before deviating.
