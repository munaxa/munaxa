# Munaxa — monorepo → multi-repository migration report

**Status: complete, pending one manual step (see [Required before merge](#required-before-merge))**

The single `Munaxa` monorepo has been separated into five independent repositories. This
document is the record: what was found, what moved, what changed, what was verified, and what
is left.

---

## 1. What the audit actually found

The starting repository did not match the shape the migration brief assumed. Recording the
difference matters, because it determined how much of this migration was code movement and how
much was scaffolding.

| Tree                | Brief assumed        | Actually contained                                                         |
| ------------------- | -------------------- | -------------------------------------------------------------------------- |
| `platform/`         | Design System        | ✅ A complete, mature design system — 414 tests, a token contract validator  |
| `school/`           | School product       | ✅ A complete product — API, admin, mobile, landing, demo, 60+ migrations    |
| `work/`             | Work product         | ⚠️ **A README only.** No application code has ever been written             |
| `docs/`             | Docs product         | ⚠️ Phase specification `.txt` files only                                    |
| `edms/`             | —                    | ⚠️ Docs' Phase 0 architecture and ADRs. Documentation only, no code          |
| `ui/`               | —                    | ⚠️ One orphaned file (`ui/components/files/index.ts`), referenced by nothing |
| *(corporate site)*  | Corporate website    | ❌ **Did not exist.** The only marketing site was School's own landing page  |

Two further findings shaped the work:

- **The package scope was `@axa/*`, not `@munaxa/*`** — `@axa/platform`, `@axa/config-eslint`,
  `@axa/config-typescript`. 252 files referenced it.
- **The platform was a single package with subpath exports**, not the seven packages the brief
  named (`@munaxa/ui`, `@munaxa/tokens`, …).

### Design-system discipline was already good

The brief anticipated widespread duplication of buttons, inputs, tables, tokens and Tailwind
config. That is **not** what the codebase looked like. Every app already imported the shared
platform (191 import sites) and every `globals.css` already imported the shared theme. There was
no duplicated component library to dismantle.

What duplication existed was narrow and real:

| Duplicate                                          | Verdict                                              | Action                                        |
| -------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `wordmark.tsx` in `apps/admin` and `munaxademo`     | **Byte-identical**                                   | Deduplicated into `@school/brand`             |
| `logo.tsx` in `apps/admin` and `munaxademo`         | Identical implementation, differing only in comments | Deduplicated into `@school/brand`             |
| `theme-locale-toggle.tsx` in the same two apps      | *Not* a duplicate — different state sources          | Left alone; see [Technical debt](#7-technical-debt) |
| `bg-grad-primary` in `apps/admin/globals.css`       | Three hardcoded brand hexes                          | Rewritten to derive from `--primary`          |
| `ui/components/files/index.ts` at the repo root     | Orphaned dead code                                   | Deleted                                       |

### The one migration-blocking defect

Every app's `globals.css` contained a Tailwind directive reaching **across product boundaries
by relative path**:

```css
@source '../../../../platform/ui';
```

This works only inside a monorepo. After separation the path resolves to nothing, Tailwind
silently emits no classes for any platform component, and every app renders unstyled — while
still building successfully. It was retargeted at the installed package in all three apps
and the result verified against real build output (see [§5](#5-verification)).

---

## 2. Repositories

| Repository        | Contents                                                | Commits carried |
| ----------------- | ------------------------------------------------------- | --------------- |
| `munaxa`          | Corporate site + org standards (the original repo)       | full history    |
| `munaxa-platform` | `platform/` → `packages/platform`, plus `tooling/*`      | 34              |
| `munaxa-school`   | `school/` → repository root                              | 15              |
| `munaxa-work`     | `work/` → repository root                                | 2               |
| `munaxa-docs`     | `edms/` → root, `docs/` → `prompts/`                     | 32              |

### Git history

History was preserved with `git-filter-repo` — commits that touched each subtree were kept and
their paths rewritten, so `git log` and `git blame` follow files through the move. Nothing was
delete-and-recreated.

`munaxa-docs` was assembled from **two** filtered histories (`edms/` and `docs/`) merged with
`--allow-unrelated-histories`, because a single pass with overlapping path-rename rules
(`edms/` → root would produce `docs/`, which the second rule then rewrote again) crashed
fast-import. Two passes and a merge keeps both blame trails intact.

Within `munaxa-school`, `Logo` and `Wordmark` were relocated with `git mv` rather than copied,
so their blame survives the deduplication.

---

## 3. Package architecture

`munaxa-platform` publishes the package names the brief specified:

| Package                    | Contents                                                     |
| -------------------------- | ------------------------------------------------------------ |
| `@munaxa/ui`               | Components, patterns, layouts, shell, charts, date, UI hooks   |
| `@munaxa/tokens`           | Typed design tokens + the CSS custom-property layer            |
| `@munaxa/theme`            | The typed theme registry + per-brand CSS entry points          |
| `@munaxa/icons`            | The shared icon set                                            |
| `@munaxa/typography`       | Type scale and font stacks                                     |
| `@munaxa/utils`            | Shared helpers (`cn`)                                          |
| `@munaxa/platform`         | The implementation the above re-export from                    |
| `@munaxa/config-eslint`    | Shared ESLint bases                                            |
| `@munaxa/config-typescript`| Shared TypeScript bases                                        |

### A deliberate decision: façades, not a physical split

The brief asked for seven separate packages. The platform was one package with subpath exports.
Rather than physically split ~20k lines across seven new packages — which would have rewritten
every import site, forked the test suite and the token contract validator, and introduced
version-skew between packages that are only ever released together — the six public packages are
**buildless façades**: a generated `.js`/`.d.ts` pair per entry point that re-exports a slice of
`@munaxa/platform`.

This was chosen because it delivers what the package split is *for* — products depend on stable,
intention-revealing names, and the platform's internals can be reorganised without touching a
consumer — at a fraction of the risk, while keeping one version, one test suite and one token
contract. **The façade boundary is already the public API**, so if the packages later need to own
their sources, the implementation can move behind it without a single consumer changing.

A `facades` CI job regenerates them and fails if the committed output has drifted from
`scripts/gen-facades.mjs`.

`@munaxa/auth` and `@munaxa/types` from the brief's list were **not** created: there is no
authentication SDK and no shared type surface in the platform today. Creating empty packages to
match a list would be worse than not having them.

### Distribution

The platform publishes to **GitHub Packages** on a `v*.*.*` tag; products depend on `^1.0.0`.
Every product repo carries an `.npmrc` scoping `@munaxa` to `npm.pkg.github.com`, and every CI
workflow and Dockerfile passes a `read:packages` token.

---

## 4. Dependency graph

```text
                    munaxa-platform
                           │
        ┌──────────┬───────┴───────┬──────────┐
        ▼          ▼               ▼          ▼
     munaxa   munaxa-school   munaxa-work  munaxa-docs
```

That is the complete set of edges. Verified absent: School→Work, School→Docs, Work→Docs,
Docs→School, Corporate→any product, Platform→any product. No cycles.

Each product repository carries a `boundaries` CI job that greps for cross-product imports and
fails the build, so the rule is enforced rather than documented.

The platform holds **no business database**. Each product owns its own Prisma schema and
migrations — School's 60+ migrations moved with it and are shared with nobody.

---

## 5. Verification

Everything below was actually executed, with the products resolving `@munaxa/*` from the split
platform checkout (via pnpm `link:` overrides, since the packages are not yet published).

| Repository        | install | lint | typecheck | test              | build           |
| ----------------- | ------- | ---- | --------- | ----------------- | --------------- |
| `munaxa-platform` | ✅      | ✅ 8/8 | ✅ 8/8   | ✅ **414 passed** | ✅ 7/7          |
| `munaxa-school`   | ✅      | ✅ 14/14 | ✅ 14/14 | ✅ 12/12       | ✅ 9/9          |
| `munaxa`          | ✅      | ✅   | ✅        | ✅ (none yet)     | ✅ Next build   |
| `munaxa-work`     | ✅      | ✅   | ✅        | ✅                | ✅ (empty workspace) |
| `munaxa-docs`     | ✅      | ✅   | ✅        | ✅                | ✅ (empty workspace) |

The platform also passes `pnpm validate` — 49 typed tokens matching their CSS mirrors exactly.

**The Tailwind fix was verified against build output, not by inspection.** The admin app's
compiled CSS contains classes that only platform components use — `ring-offset-background`,
`animate-in`, `aria-invalid`, `data-[state=open]` — confirming the retargeted `@source` resolves
and the design system still renders. The regenerated `bg-grad-primary` emits from
`var(--primary)` with no hardcoded hex remaining.

### Issues found and fixed during verification

1. **Missing package declarations.** `apps/admin`, `munaxademo` and `landing` imported
   `@munaxa/icons`/`@munaxa/theme`/`@munaxa/tokens` without declaring them — previously they
   resolved transitively through the single `@axa/platform` dependency. Typecheck caught all of
   them; each is now declared where it is used.
2. **`no-unnecessary-type-assertion`** on the admin app-shell's typed-route cast. That cast is
   load-bearing for `next build` (the app's own ESLint config documents exactly this trap), so
   it was suppressed the same way the app already suppresses it in two other files.
3. **`Button` has no `asChild` prop.** The corporate site was written against a shadcn-style API
   the platform does not implement; rewritten to `buttonVariants()`, which is the platform's
   sanctioned pattern for links styled as buttons.

---

## 6. Risks

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| **No lockfiles in the product repos.** They cannot be generated until `@munaxa/*` v1.0.0 is published; `pnpm install --frozen-lockfile` in CI will fail until then | **High — blocks CI** | See [Required before merge](#required-before-merge) |
| Cross-repo change coordination: a platform change now needs a release + a bump in each product, rather than one PR | Medium | Semver + the façade boundary keep breakage visible; consider Changesets |
| The Tailwind `@source` path is a string, not a typechecked import — a wrong path fails silently and renders unstyled | Medium | Verified in build output today; a CSS smoke assertion in each product's CI would make it permanent |
| Corporate content is scaffolding, not copy | Low | Structure, theme and CI are real; pages need writing |
| Docker builds now need a registry secret | Low | `--secret id=github_token` wired into both Dockerfiles |

### Required before merge

1. Publish the platform: tag `v1.0.0` on `munaxa-platform` to run the release workflow.
2. In each product repo, run `pnpm install` once and commit the generated `pnpm-lock.yaml`.
3. Add a `read:packages` token where CI needs one beyond the default `GITHUB_TOKEN`
   (Render and Cloudflare deploys in `munaxa-school`).

---

## 7. Technical debt

Carried forward deliberately, not overlooked:

- **`theme-locale-toggle.tsx`** remains in both `apps/admin` and `munaxademo`. They are *not*
  duplicates — one reads an i18n provider, the other a session context — so merging them means
  unifying the state model first. Left as-is rather than forced.
- **`landing`'s `Wordmark`** is a different component from `@school/brand`'s (different assets,
  different API). It should fold into `@school/brand` once the asset sets are reconciled.
- **The Storybook Cloudflare deploy** was removed from School's workflows (the design system is
  the platform's to ship) but not yet re-added to `munaxa-platform`. The `wrangler.jsonc` and
  `cf:deploy` script moved with the platform and are ready.
- **Corporate has no deployment pipeline.** School's Cloudflare setup was School-specific; a
  hosting target for the corporate site has not been chosen.
- **`PLATFORM_ENGINEERING_STANDARDS.md`** was written for a monorepo. Its scope note is updated,
  but its internal path references still describe the old layout.
- **No mechanised check that products don't reimplement platform components.** The `boundaries`
  job catches cross-product *imports*; it cannot catch a Button written from scratch.

## 8. Recommended next

1. **Publish and pin.** Tag the platform, commit the lockfiles, and get all five CIs green.
2. **Adopt Changesets** in `munaxa-platform`. With four consumers, "which version has this fix"
   becomes the daily question, and hand-stamped versions will not hold.
3. **Add a CSS smoke test** to each product's CI asserting a known platform class survives the
   build. This is the one failure mode that is invisible to lint, typecheck and build alike.
4. **Renovate** on the `@munaxa/*` range in every product, so platform releases propagate without
   anyone remembering to bump.
5. **Split the façades for real only if a package genuinely diverges** — a different release
   cadence or dependency set. Until then the current layout is strictly less machinery.
6. **Write the corporate content**, and choose its hosting.
