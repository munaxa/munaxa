# Munaxa Design System — Governance

**Status:** Authoritative · **Canonical reference:** [`munaxadesignsystem/`](./munaxadesignsystem)
**Applies to:** `apps/admin` and all shared UI (`packages/ui`, `packages/config-tailwind`, `packages/i18n`).

`munaxadesignsystem/` is the **single, formal source of truth** for structure, design, theme, components, patterns, and content. This document codifies how that system is consumed and enforced in the product, distilled from the reference's governance docs (`DESIGN_GOVERNANCE.md`, `AI_GENERATION_RULES.md`, `DOMAIN_ARCHITECTURE.md`, `WORKSPACE_ARCHITECTURE.md`, `ENTERPRISE_NAVIGATION.md`).

---

## 1. Source of truth & layering

| Layer | Home | Rule |
|---|---|---|
| **Tokens** | `@munaxa/config-tailwind/preset.ts` + `apps/admin/src/app/globals.css` | Values are **ported verbatim** from `munaxadesignsystem`. Never invent colors/spacing/radius/shadow/z-index/motion. |
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

## 4. Typography & theme baseline (from the reference)

- Fonts: **IBM Plex Sans** (Latin) + **IBM Plex Sans Arabic** (RTL); system mono.
- Brand primary **`#7A3FFF`** (light) / **`#8A4FFF`** (dark); neutral surfaces; semantic green/amber/red/blue. Radius `0.5rem`.

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
