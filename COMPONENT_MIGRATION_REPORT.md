# COMPONENT_MIGRATION_REPORT.md

**Program:** Munaxa Design System Migration
**Phase:** 3 — Core Component Migration
**Date:** 2026-06-18
**Branch:** `claude/affectionate-shannon-fbfeaf`
**Status:** 🟡 Core complete & build-verified — a remaining mechanical sweep is itemized in §6. Awaiting approval before Phase 4.

> Governance decisions honored (Phase 0/2b): components **ported into `@munaxa/ui`**; **light-first** default; no business logic, APIs, schemas, or routes changed.

---

## 1. Headline

Two things were accomplished:

1. **Established `@munaxa/ui` as the single canonical component layer** — it went from exporting only `cn()` to housing the full primitive set (7 existing primitives moved in + **9 new ones built**). The app consumes it through its existing `@/components/ui` barrel, so **no page import paths had to change**.
2. **Swept the highest-impact pages** onto the new primitives — most importantly, the **3 NON_COMPLIANT pages (teachers, parents, inventory) are fixed** via proper `Field`/label wiring.

Everything is **build-verified** (`typecheck` + `next build`, 36/36 pages) at each step.

---

## 2. The Canonical Component Layer (`@munaxa/ui`)

### Moved in (behavior unchanged)
`Button`, `Card` (+Header/Title/Description/Content/Footer), `Badge`, `Input`, `Select`, `Field`, `Table`/`THead`/`TBody`/`TR`/`TH`/`TD`, `Spinner`.

### Built new (the Phase-1 X2 gap)
| Primitive | Notes |
|---|---|
| **Textarea** | Shares the Input/Select field surface (`fieldBase`) |
| **Checkbox** | Native, token-styled; optional associated `label` prop |
| **Radio** + **RadioGroup** | Native radio + `role="radiogroup"` wrapper |
| **Switch** | `role="switch"`, controlled, RTL-aware thumb transform |
| **Dialog** | Portal, `aria-modal`, labelled by title, Escape + backdrop close, scroll-lock, focus restore, `z-modal` |
| **Drawer** | Slide-over on a **logical** edge (`start`/`end`) so it mirrors under RTL; same a11y as Dialog |
| **Tabs** (+List/Trigger/Content) | Roving `tabindex`, **RTL-aware arrow-key** navigation, `aria-selected`/`aria-controls` |
| **Tooltip** | Hover + keyboard-focus, `role="tooltip"` + `aria-describedby` |
| **Pagination** | Accessible prev/next + page indicator, logical layout, i18n-able labels |

### Enhancements folded into existing primitives (additive, backward-compatible)
- **`Table` `TH`** now defaults `scope="col"` → fixes the systemic missing-`scope` a11y gap (X5) for every table at once.
- **`Field`** gained optional `error` (renders `role="alert"`) and `required` props.

### How it's wired (and why it's robust)
- Components live in `packages/ui/src/components/*`; exported via `packages/ui/src/index.ts`.
- Built with `tsc` to ESM `dist`; **verified that `'use client'` is preserved** at the top of compiled interactive components (Dialog/Drawer/Tabs/Tooltip), so Next treats them as client components.
- Tailwind already scans `packages/ui/src` (admin `tailwind.config.ts` content glob), so all token classes are emitted.
- Added `@types/react-dom` to `@munaxa/ui` (for `createPortal`). No runtime deps added.
- App `@/components/ui/index.ts` is now just `export * from '@munaxa/ui'`; the 2 deep `./ui/button` imports were repointed; app-local primitive files were deleted.

---

## 3. Light-First Default (governance decision #3)

- `layout.tsx`: removed the hardcoded `dark` class from `<html>`.
- `theme-locale-toggle.tsx`: default theme `dark` → `light` (state + persisted fallback).
- `globals.css`: comment updated. Dark mode remains fully supported via the toggle + `.dark` tokens.

---

## 4. Pages Swept (done)

| Page | Change | Effect |
|---|---|---|
| **people/teachers** | Every bare `Input`/`Select` in create form wrapped in `Field` (matching `htmlFor`/`id`); `dir`/`required`/handlers preserved | 🔴 NON → 🟡/🟢 |
| **people/parents** | Same Field wiring across the form | 🔴 NON → 🟡/🟢 |
| **inventory** | CreateItem + RecordTxn inputs wrapped in `Field` | 🔴 NON → 🟡/🟢 |
| **academics** | Raw `<textarea>` (CSV import) → `Textarea`; dropped redundant cn | raw control removed |
| **communication** | Announcement-body `<textarea>` → `Textarea` | raw control removed |
| **people/students** | CSV-import `<textarea>` → `Textarea` | raw control removed |
| **timetable** | `scope="col"` added to the schedule-grid headers | a11y |

**Note on timetable:** it is a bespoke schedule **matrix** (period × day), not a standard list table. Forcing the list-`Table` primitive would visually regress it and double-wrap inside its `Card`, so it intentionally keeps its custom grid and received the real a11y fix (`scope`). This is a deliberate, documented exception, not an oversight.

All swept pages: **logic, state, handlers, API calls, validation, and routes unchanged.** Verified by `typecheck` + `build`.

---

## 5. Verification

- ✅ `pnpm --filter @munaxa/ui build` — clean; `'use client'` preserved in dist
- ✅ `pnpm --filter @munaxa/admin typecheck` — clean
- ✅ `pnpm --filter @munaxa/admin build` — 36/36 pages
- ✅ Design-system ESLint guardrail — passes

---

## 6. Remaining Mechanical Sweep (carry-over)

A batch of **lower-risk, mechanical** replacements was not completed this phase (the parallel sweep agents hit a session limit mid-run). None affect build health; they are polish/consistency items. Proposed as a **Phase 3 continuation** before or alongside Phase 4:

| Item | Pages | Type |
|---|---|---|
| Raw `<input type=checkbox>` → `Checkbox` | settings/users, settings/roles, people/employees, structure/academic, people/students (vaccine) | Component |
| Bare form inputs → `Field` wrapping | clinic (medical-record form), library (create/checkout forms) | A11y |
| Raw `<button>`: add `type`/`aria-label`; `aria-current="step"` on stepper; `aria-expanded` on toggles | settings/integrations/jofotara (wizard), fleet, platform/databases, people/employees (name cells), structure/academic (delete) | A11y |
| Convert genuinely button-styled raw `<button>` → `Button` | finance (1), structure/schools (1), settings/roles (select-all) | Component |
| Surface caught-but-hidden errors | teachers, parents, structure/schools | (overlaps Phase 4 state work) |

> These were deliberately scoped to be conservative: clickable text/name cells and custom controls (attendance status pills, jofotara stepper) will **not** be restyled into `Button` — they only get accessible names — to avoid UX regressions.

---

## 7. STOP — Phase 3 Core Complete

The canonical component layer exists in `@munaxa/ui` with the full primitive set; the NON_COMPLIANT pages are fixed; light-first is in; build is green.

**Two paths for your call:**
- **(A)** Finish the §6 carry-over sweep now (a short Phase 3b), then proceed to Phase 4; or
- **(B)** Proceed to **Phase 4 (Pattern Compliance)** and fold the §6 items into it (several overlap with Phase 4's state/error-handling work).

**Awaiting approval** — and your preference between (A) and (B).
