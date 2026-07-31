# Munaxa Platform Engineering Standards

**Status: mandatory · Applies to: every contributor, human and AI · Scope: every repository in
the Munaxa ecosystem — munaxa, munaxa-platform, munaxa-school, munaxa-work, munaxa-docs**

This is the engineering rulebook. It defines **how work is done** across the ecosystem — not
what the system is. For what each system is, see that repository's own README.

> **On scope.** This document predates the repository separation, when everything lived in one
> monorepo. It is kept here, in the corporate repository, because it governs all five. Where it
> still says "this repository" about cross-cutting rules, read "every repository"; where it
> refers to a `platform/` or `school/` directory, the equivalent now lives in
> [munaxa-platform](https://github.com/tam2om/munaxa-platform) or
> [munaxa-school](https://github.com/tam2om/munaxa-school). See
> [`docs/MIGRATION_REPORT.md`](./docs/MIGRATION_REPORT.md).

It is the single authoritative source for contribution rules. Where any other document repeats a
rule, that document is a summary and this one governs.

> **The platform is frozen.** Its structure, package names and public API are settled. Development
> happens inside products. `munaxa-platform` changes only when a genuine cross-product need is proven —
> see [§3](#3-changing-the-platform).

---

## Contents

1. [The five laws](#1-the-five-laws)
2. [Platform and product](#2-platform-and-product)
3. [Changing the platform](#3-changing-the-platform)
4. [Dependency rules](#4-dependency-rules)
5. [Before you write code](#5-before-you-write-code)
6. [Reuse and duplication](#6-reuse-and-duplication)
7. [Design system rules](#7-design-system-rules)
8. [Code quality rules](#8-code-quality-rules)
9. [Security and permissions](#9-security-and-permissions)
10. [Tests](#10-tests)
11. [Documentation](#11-documentation)
12. [Backward compatibility](#12-backward-compatibility)
13. [Prohibited actions](#13-prohibited-actions)
14. [Definition of Done](#14-definition-of-done)
15. [Precedence and conflicts](#15-precedence-and-conflicts)

---

## 1. The five laws

Everything below follows from these. If you remember nothing else, remember these.

1. **The platform never learns about a product.** No product import, no business rule, no domain
   vocabulary in `platform/`. This is the one change that is invisible today and unfixable later.
2. **Never bypass a control to make something pass.** Not a permission guard, not a validator, not
   a lint rule, not a failing test. A control that blocks you is either right, or it is a defect
   worth reporting — it is never an obstacle to route around.
3. **Search before you create.** Most "missing" code already exists under another name. A second
   implementation is the most common and most damaging failure mode in this repository.
4. **Leave the repository production-ready.** Every task ends with a codebase that builds, passes,
   lints, and contains no placeholder, no TODO and no dead code. There is no "finish it next turn".
5. **Report conflicts; never resolve them silently.** When an instruction contradicts a rule, or
   two rules contradict each other, say so and ask. Choosing quietly hides a decision a human
   needed to make.

## 2. Platform and product

**The platform** (the `munaxa-platform` repository, shipped as `@munaxa/*`) is the code that is
true for every Munaxa product regardless of what business it serves: design tokens, typography, themes, icons, UI
components, patterns, templates and brand assets.

The membership test, applied without mercy:

> Could this be dropped into a product with nothing to do with schools, HR or invoicing, and still
> make sense — in its name, its props, its defaults and its comments?

If no, it is product code. That is not a demotion. Most code is product code, and a small platform
is a healthy one.

**A product** (`school/`, `work/`, …) is a complete, independently deployable business system
that consumes the platform. It owns its domain model, business rules, workflows, database, API,
navigation, app shell, authentication UI, copy and deployment. Products are **peers** — the fact
that School exists and Work does not gives School no special claim on the shared layer.

**Two directories inside `platform/` are product-owned:** `platform/themes/<product>/` and
`platform/assets/<product>/`. Changing your own product's palette or artwork is a product change,
not a platform change — but it must still pass `pnpm validate`.

## 3. Changing the platform

`platform/` changes **only** for:

1. **Demonstrated duplication** — the same component, token or helper independently written in two
   products. Bring evidence: both file paths.
2. **A proven cross-product requirement** — a new semantic role, a token step, an accessibility fix
   that belongs in every product.
3. **A defect** — a bug, security issue or accessibility failure in shipped platform code.
4. **A standards change**, with an ADR explaining what the current rule breaks.

It does **not** change for:

- A single product needing something → build it in that product.
- Anticipating a future product's needs → wait for the product.
- Convenience during a product task → this is exactly how business logic leaks in.

Promotion happens on the **second real consumer**, never in anticipation of one. A component
designed for a hypothetical second product is a component designed for nobody. Every platform
change follows [`platform/CONTRIBUTING.md`](./platform/CONTRIBUTING.md) in full.

## 4. Dependency rules

> **1. The platform MUST NEVER import from any product.**
> **2. Products MAY import the platform.**
> **3. Products MUST NEVER import another product.**

Absolute. No exception, no temporary exemption, no "just this one type".

A single `import { Student } from '@school/domain'` inside `platform/` makes the platform
unbuildable for every other product, and the damage is invisible until the second product tries to
install — by which time the import is load-bearing. Two products that import each other are one
product with a confusing folder layout.

**Products import the platform through public entry points only:**

```ts
import { Button, Card, useToast, cn } from '@munaxa/ui';
import { Search } from '@munaxa/icons';
import { tokens } from '@munaxa/tokens';
import { themes } from '@munaxa/theme';
```

Never a deep path (`@munaxa/ui/components/primitives/button`), never a relative path into
another repository. The internal folder layout exists so files can be re-filed without breaking anyone;
a deep import forfeits that. Full detail:
[`platform/architecture/import-rules.md`](./platform/architecture/import-rules.md).

**The platform must never depend on:** any product package, `next/*` or any router, any HTTP or
data-fetching client, any i18n library, any ORM or backend SDK, or a second class-name combiner or
icon library. `react` and `react-dom` stay **peer** dependencies.

**No app-local re-export barrels.** A `src/components/ui/index.ts` that re-exports the platform
hides what a product actually depends on and becomes the obvious place to "just add one local
override". Both were deleted during the platform extraction. Do not reintroduce them.

## 5. Before you write code

### 5.1 Search — mandatory

Before creating **any** component, hook, service, utility, type, permission, event or migration:

```bash
grep -rn "export function <Name>\|export const <Name>" platform/ui <product>/apps
grep -rn "<what it does>" --include=*.ts --include=*.tsx
grep -n  "<RESOURCE>" school/packages/domain/src/permissions.ts     # permissions
```

State what you searched for and what you found. "I searched for X and Y and found nothing" is part
of the deliverable when you create something new.

### 5.2 Answer the placement question

```
Contains business vocabulary?                 → product. Stop.
Fetches data, routes, or checks permissions?  → product. Stop.
TWO products need it today?                   → platform, via platform/CONTRIBUTING.md in full.
ONE product needs it?                         → that product.
A future product might need it?               → that product. Wait for the second consumer.
```

### 5.3 Read the relevant document

| Working on | Read first |
| ---------- | ---------- |
| Anything in `platform/` | [`platform/CONTRIBUTING.md`](./platform/CONTRIBUTING.md) |
| A UI component or screen | [`platform/architecture/`](./platform/architecture/README.md) |
| Munaxa UI | [`school/docs/ui-governance.md`](./school/docs/ui-governance.md) |
| A record screen, search, timeline, audit UI | [`school/docs/ux/`](./school/docs/ux/README.md) |
| A backend module | [`school/docs/architecture/`](./school/docs/architecture/README.md) |

## 6. Reuse and duplication

- **Never duplicate code.** If you are about to write something that exists, extend the existing
  thing instead.
- **Reuse existing platform components.** A screen is assembled from `@munaxa/ui` components
  plus the product's own domain components. Writing a new button, input, card, table, dialog,
  badge or spinner is always wrong.
- **Never copy platform code into a product to modify it.** If a platform component cannot do what
  you need, either add an optional prop (two consumers) or compose around it.
- **Prefer composition over duplication, and over inheritance.** Inheritance is for framework
  contracts (`implements CanActivate`), never for sharing code between siblings.
- **Rule of three.** One occurrence: write it inline. Two: leave it duplicated and note it — let
  them evolve honestly. Three: extract, now that you know what genuinely varies. The wrong
  abstraction is more expensive than duplication, because it couples two things forever and grows
  a flag for every difference.
- **Never unify across products.** School and Work having similar-looking domain logic is
  expected and correct. Only genuinely product-agnostic code is shared.

Duplication is **never** acceptable for: a design token or colour, a UI primitive, a security
control, or a business rule that must hold globally.

## 7. Design system rules

Full reasoning: [`platform/architecture/theming.md`](./platform/architecture/theming.md).
Munaxa-specific enforcement: [`school/docs/ui-governance.md`](./school/docs/ui-governance.md).

- **Never introduce a new colour, spacing, radius, shadow, z-index or motion value.** Use the
  token-backed utilities. A missing value is a bug report against the scale, not a licence to
  inline one.
- **Never hardcode a hex, `rgb()`, `hsl()` or a raw Tailwind palette class** (`bg-red-500`). Use
  semantic classes: `bg-primary`, `text-muted-foreground`, `bg-success`, `border-border`.
  Mechanically enforced — ESLint fails the build in `platform/ui`, `platform/tokens` and
  `school/apps/admin/src`.
- **Raw hexes live in exactly one place:** `platform/themes/<product>/brand.ts`, for surfaces that
  cannot read CSS variables (HTML email, OG images, favicons, PDF).
- **Semantic roles are named for their role**, never their appearance. `--destructive`, not
  `--red`; `--accent-warm`, not `--coral`.
- **A palette answers the contract completely** and may not invent a role or fork a structural
  scale. `pnpm validate` enforces this.
- **RTL: logical properties only** — `ps-`/`pe-`/`ms-`/`me-`/`text-start`/`text-end`/`border-s`/
  `border-e`/`start-`/`end-`. Physical utilities (`pl-`, `mr-`, `text-left`) are prohibited.
- **Accessibility is WCAG 2.2 AA at merge time**, part of the component and not a prop the caller
  can forget. Details: [`platform/architecture/accessibility.md`](./platform/architecture/accessibility.md).
- **The platform ships no copy.** Every user-visible string is a prop. Product strings go through
  the product's i18n catalogue (EN + AR for Munaxa), never hardcoded.

## 8. Code quality rules

Naming, TypeScript and React conventions in detail:
[`platform/architecture/naming-conventions.md`](./platform/architecture/naming-conventions.md).

- **No placeholders.** No stub returning `null`, no `throw new Error('not implemented')`, no empty
  component "to be filled in".
- **No TODOs.** Do it, or open a tracked issue and reference it by number. A `TODO` with no owner
  and no date is a lie about intent.
- **No dead code.** No unused export, unreachable branch, commented-out block or orphaned file.
  Delete it — git remembers.
- **No unused imports or variables.** Both fail the build; never suppress.
- **No disabled lint rules without written justification.** `eslint-disable`, `@ts-ignore` and
  `@ts-expect-error` each require a comment naming the reason and, where relevant, the upstream
  issue. Never add a suppression to make CI pass.
- **No `any`.** Use `unknown` and narrow. `@typescript-eslint/no-explicit-any` is an error.
- **No speculative abstractions.** No plugin system, registry, generic base class or configuration
  layer for a single caller. Solve today's problem in the simplest way that does not preclude
  tomorrow's.
- **Names describe role and intent** — never appearance, never implementation, never creation
  order. `EntityPicker`, not `StudentPicker`. `items`, not `students`.
- **Comments explain why.** The code already says what. No commented-out code, no stale comments.
- **Prettier is the sole formatting authority.** Formatting-only changes go in their own commit.
- **Refactors and behaviour changes never share a commit**, and a refactor must come with evidence
  that nothing observable changed.

## 9. Security and permissions

Munaxa specifics: [`school/docs/architecture/09-security-architecture.md`](./school/docs/architecture/09-security-architecture.md)
and [`05-rbac-matrix.md`](./school/docs/architecture/05-rbac-matrix.md).

- **Nothing is accessible without a permission.** Every mutating endpoint carries an explicit
  permission requirement; every UI affordance that triggers a permissioned action is gated on the
  same permission.
- **Never invent a permission in the UI.** Use the catalogue in `packages/domain`; if the
  permission does not exist, add it there first.
- **Hiding a button is not security.** The server is the authority; client gating is a courtesy to
  the user.
- **Never weaken a guard, filter, validator or policy** to make a test or build pass. Fix the
  caller.
- **Never disable tenant isolation** or remove a tenant scope. Cross-tenant queries exist only in
  explicitly platform-scoped, permission-gated console endpoints.
- **Never log a secret, credential, token or personal identifier.**
- **Never commit a secret.** New configuration is documented in `.env.example` with a placeholder,
  never a real value.
- **Never mark a route public** unless it genuinely must be reachable unauthenticated, with a
  comment saying why.
- **Sensitive actions are audited**, and audit records are append-only.

## 10. Tests

- **Always update tests with every feature.** New business logic ships with unit tests for its
  pure logic in the same commit.
- **Changed behaviour means changed tests**, also in the same commit.
- **Never delete or skip a failing test to go green.** A failing test is information. Fix the code;
  if the test encoded a rule that genuinely changed, change the test and say so explicitly.
- **Test the rules, not the framework.** Pure domain logic is where tests pay; snapshot tests of
  markup fail on every legitimate change and pass on every broken one.
- **Verification is not optional.** Before reporting success:

  ```bash
  pnpm validate        # theme contract + structural token mirrors
  pnpm turbo run build typecheck lint test
  pnpm format:check
  ```

  For a change that claims not to alter the UI, prove it with a stylesheet diff:

  ```bash
  cd <product>/apps/<app> && npx @tailwindcss/cli -i src/app/globals.css -o /tmp/after.css
  diff <(sort /tmp/before.css) <(sort /tmp/after.css)
  ```

- **Report outcomes honestly.** If tests fail, say so and show the output. If a check could not be
  run, say which and why. A confident false report is worse than no report.

## 11. Documentation

Standards: [`school/docs/ux/documentation-architecture.md`](./school/docs/ux/documentation-architecture.md).

- **Update documentation with every architectural change** — the affected document, the index, and
  an ADR if a decision was made between real alternatives.
- **One authoritative source per topic.** If you find yourself restating a rule, link to it
  instead. Duplicated documentation drifts and then lies.
- **Record decisions as ADRs**, in `school/docs/architecture/adr/`. An ADR states context,
  decision, alternatives considered and consequences. ADRs are immutable — supersede, never edit.
- **Point-in-time reports go to `docs/archive/`** and are never edited afterwards. They are
  historical evidence, not current guidance.
- **Every document states what it is for and who it is for.** If you cannot write that sentence,
  the document has no reason to exist.

## 12. Backward compatibility

- **Always preserve backward compatibility unless explicitly instructed otherwise.** Adding is
  safe; changing and removing are not.
- **Prefer extension over modification** — a new optional prop, a new variant, a new endpoint,
  never a changed signature.
- **If you must break a contract, update every consumer in the same commit** and say so explicitly
  in the commit message and the summary. The monorepo exists so this is possible.
- **Always update API contracts** when an endpoint changes: the DTO, its validation decorators,
  its OpenAPI annotations, and the product's typed client.
- **Never edit an applied database migration.** Add a new one.
- **Never change a shipped event's payload shape.** Add a new version.
- **Deprecate before deleting** a public API: `@deprecated` naming the replacement, one release
  cycle, then remove. Nothing is kept "just in case".

## 13. Prohibited actions

Never, under any framing:

| Never | Because |
| ----- | ------- |
| Import a product into the platform | Breaks the dependency law irreversibly |
| Import one product from another | Two products become one |
| Put business logic in the platform | Invisible until the second product; then unfixable |
| Remove or weaken a permission check | Silent privilege escalation |
| Disable tenant scoping or row-level security | Cross-tenant data exposure |
| Delete or skip a test to go green | Destroys the signal the test existed to give |
| Add a lint or type suppression to pass CI | Converts a real defect into a hidden one |
| Edit an already-applied migration | Diverges environments permanently |
| Change a shipped event's payload shape | Breaks every consumer, asynchronously |
| Commit a secret, key or real credential | Immediate security incident |
| Fabricate a test result or verification | Removes the human's basis for trust |
| Widen a public API "just in case" | Speculative surface becomes permanent surface |
| Rename or move platform folders | The platform is frozen |
| Duplicate a UI primitive or a design token | The failure this whole structure prevents |

## 14. Definition of Done

A change is done when **all** of these are true. Not most.

1. The requested scope is fully delivered, or the unfinished part is named explicitly.
2. `pnpm validate` passes (whenever the platform was touched).
3. `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` all pass.
4. No new lint suppression, no new `any`, no new `@ts-ignore`.
5. No placeholder, no TODO, no dead code, no unused import.
6. Tests were added or updated for changed behaviour.
7. API contracts — DTOs, validation, OpenAPI annotations, typed clients — match the implementation.
8. Documentation reflects reality; an ADR exists if a decision was made.
9. Backward compatibility is preserved, or the break is explicit and every consumer is updated in
   the same commit.
10. Nothing product-specific was added to `platform/`; nothing shared was left duplicated in a
    product.
11. Permissions gate every new endpoint and every new UI affordance.
12. The verification actually ran, and the report of it is accurate.

> If you cannot tick all twelve, the change is not done. Deliver less, completely, and say what
> remains. A half-finished change that claims to be finished is the only outcome worse than no
> change at all.

## 15. Precedence and conflicts

When sources disagree:

```
1. An explicit, current instruction from the repository owner
2. This document
3. platform/CONTRIBUTING.md and platform/architecture/
4. Product governance (school/docs/ui-governance.md) and product architecture docs
5. Existing code
```

**Existing code is the lowest authority.** A pattern being widespread is evidence that it was
convenient, not that it is correct.

When you are unsure, in order: search the codebase; read the relevant document; choose the more
conservative option — the one that adds less surface, breaks less and is easier to reverse; state
the uncertainty in your summary. Ask only when proceeding under either reading would be unsafe or
would waste the work.
