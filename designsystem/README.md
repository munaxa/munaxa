# @axa/design-system

The single source of truth for the user interface of every AXA product — Munaxa, Workaxa,
Inkaxa and whatever comes next.

It is **product-agnostic by construction**: it contains no school, HR, finance or any other
domain terminology, no business rules, and no product names outside the `themes/` and `assets/`
layers, where naming a product is the entire point.

---

## 1. Architecture

The system is five layers. Each layer may only depend on the ones above it.

```
tokens        the values          spacing, radius, elevation, motion, z-index, breakpoints
typography    the type scale      families, sizes, weights, line-heights
themes        the colour          the Tailwind contract + one complete palette per product
components    the primitives      Button, Input, Card, Table, Dialog, Tabs, …
patterns      the compositions    StatCard, Stepper, Reveal, TokenReference, …
templates     the page shells     (empty by design — see templates/README.md)
```

Two cross-cutting leaves sit alongside them: `icons/` (one icon library at one version, for the
whole ecosystem) and `hooks/` (UI-only React hooks). `lib/` holds `cn()`, the Tailwind-aware
class combiner every component uses.

The load-bearing idea is the **theme contract**. `themes/base.css` declares *which* semantic
variables exist (`--background`, `--primary`, `--border`, …) and maps them onto Tailwind's token
namespaces. It never says what colour any of them is. A product palette
(`themes/<product>/palette.css`) supplies a complete set of values for that contract. Because
every component styles itself only through the contract (`bg-primary`, `text-muted-foreground`,
`border-border`), **a component written once renders correctly in every product, in light and
dark, forever** — with no per-product branches anywhere in component code.

### Folder structure

```
designsystem/
├── index.ts                  public barrel — what `@axa/design-system` exports
├── package.json              entry points (see §6)
├── tokens/
│   ├── index.ts              typed token aggregate
│   ├── spacing.ts radius.ts elevation.ts border.ts motion.ts
│   ├── transitions.ts z-index.ts breakpoints.ts
│   └── css/primitives.css    the same scales as CSS custom properties (--axa-*)
├── typography/index.ts       families, sizes, weights, line-heights
├── themes/
│   ├── index.ts              typed registry of every product theme
│   ├── base.css              THE CONTRACT: @theme mapping + dark variant + utilities
│   ├── munaxa/{palette.css,brand.ts,index.css}
│   ├── workaxa/{palette.css,brand.ts,index.css}
│   └── inkaxa/{palette.css,brand.ts,index.css}
├── icons/index.ts            the curated lucide re-export
├── lib/cn.ts                 clsx + tailwind-merge
├── hooks/use-theme.ts        light/dark switching
├── components/
│   ├── primitives/           Button, Badge
│   ├── forms/                Input, Select, Textarea, Checkbox, Radio, Switch, Label,
│   │                         Field, EntityPicker
│   ├── feedback/             Spinner, EmptyState, ErrorState, Tooltip, Dialog, Drawer, Toast
│   ├── navigation/           Tabs, Pagination
│   ├── layout/               Card
│   └── data-display/         Table, Timeline
├── patterns/
│   ├── stat-card.tsx stepper.tsx progress.tsx token-reference.tsx
│   └── motion/{reveal.tsx,count-up.tsx,motion.css}
├── templates/                reserved — see templates/README.md
├── docs/
└── assets/{logos,brand}/
```

---

## 2. Naming conventions

| Thing                | Convention                          | Example                          |
| -------------------- | ----------------------------------- | -------------------------------- |
| File                 | `kebab-case`                        | `stat-card.tsx`, `use-theme.ts`  |
| Component            | `PascalCase`, matching the file      | `StatCard` in `stat-card.tsx`    |
| Hook                 | `useThing` in `use-thing.ts`         | `useTheme`                       |
| Props type           | `<Component>Props`, exported         | `StatCardProps`                  |
| Semantic CSS var     | role, not colour                     | `--primary`, never `--teal`      |
| Primitive CSS var    | `--axa-<scale>-<step>`               | `--axa-space-4`                  |
| Theme folder         | the product id, lowercase            | `themes/workaxa/`                |

Names describe **role**, never appearance or domain. `--destructive`, not `--red`.
`EntityPicker`, not `StudentPicker`. A name that only makes sense inside one product is the
clearest possible signal that the thing does not belong here.

---

## 3. Component rules

1. **No product terminology.** If the name, a prop, a default string or a comment mentions
   students, employees, invoices, tenants or a product name, it is not a design-system
   component. See §7.
2. **No business logic and no data fetching.** Components receive data through props. Anything
   that loads is injected as a function (`EntityPicker` takes a `load` callback; it has no idea
   what it is loading).
3. **No hardcoded colours.** ESLint fails the build on a hex literal anywhere outside `themes/`.
   Style through contract classes only.
4. **No hardcoded scale values either.** Use the token-backed Tailwind utilities
   (`p-4`, `rounded-lg`, `z-modal`), never magic pixel values.
5. **No app framework coupling.** No `next/link`, no `next/navigation`, no router. Components
   take `href`/`onClick`; the application supplies routing.
6. **Every visible string is a prop.** The design system never ships copy and never imports an
   i18n library — translation belongs to the product.
7. **Accessible by default.** Correct roles and ARIA wiring, keyboard support, visible focus.
   `EntityPicker` is the reference: a full combobox with `aria-activedescendant`.
8. **Forward `className` and merge it with `cn()`**, so consumers can adjust layout without
   forking a component.
9. **Export through the barrel.** A category `index.ts`, then the root `index.ts`. Consumers
   import from `@axa/design-system` and never deep-import a file path — that keeps the internal
   taxonomy free to change.
10. **`'use client'` on anything with state or effects**, so React Server Component consumers
    work without wrappers.

### Where does a new component go?

```
Is it a single interactive control?           → components/<category>/
Is it several controls composed together?     → patterns/
Is it a whole screen skeleton?                → templates/   (two products first — see below)
Does it know what a "student" is?             → the product. Not here.
```

Promote from a product into the design system when **a second consumer needs it**, not before.
One product needing something is a product component; two products needing it is a design-system
component. Applying that rule is what kept this migration honest — Munaxa's `AppShell`,
`PrivacyProvider`, `StatusBadge` and every `domain/*` component stayed in Munaxa.

---

## 4. Token rules

1. **Tokens are values, not decisions.** `tokens/` holds structural scales only — spacing,
   radius, elevation geometry, motion, z-index, breakpoints, borders. Colour is *never* a token;
   colour is a theme.
2. **One source per fact.** Each scale exists in TypeScript (`tokens/*.ts`) and as CSS custom
   properties (`tokens/css/primitives.css`). Change both together, or change neither.
3. **Nothing branches by theme.** A value in `tokens/` is identical in every product and in both
   colour schemes. Anything that varies belongs in `themes/`.
4. **Shadows carry a brand tint through a variable.** The geometry is shared
   (`0 24px 50px -30px …`); the colour comes from `--shadow-tint` / `--glow-tint`, which each
   palette supplies. This is why elevation looks native in every product without duplicating the
   ramp.
5. **Applications never hardcode a scale value.** No raw `#hex`, `px`, or z-index in product
   code — use the utilities the tokens generate.

---

## 5. Theming rules

1. **A theme is a complete palette, not a diff.** Every product palette supplies *every*
   variable in the contract, for `:root` and for `.dark`. Themes deliberately do not inherit
   from each other: partial overrides are how a product ends up with one unstyled control after
   someone adds a variable.
2. **The contract is closed.** Adding a semantic variable means adding it to `themes/base.css`
   **and** to every palette in the same change. A palette that is missing a variable is a bug.
3. **Components never name a theme.** No component may read `themes.munaxa` or branch on a
   product. If a component needs to vary, that variation is a new contract variable.
4. **One theme per application, chosen at build time**, by importing exactly one theme entry
   point in `globals.css`. Light/dark switching within a theme is the `.dark` class, driven by
   `useTheme`.
5. **Raw hexes live only in `themes/<product>/brand.ts`,** for surfaces that genuinely cannot
   read CSS variables — HTML email, OG images, favicons. Everything rendered in a browser reads
   the contract.

### Adding a product theme

```
themes/newproduct/
├── palette.css   copy an existing palette, replace every value
├── brand.ts      brand hexes, gradient stops, static neutral scale
└── index.css     @import '../base.css';  @import './palette.css';
```

Then add one entry to `themes/index.ts` and one `exports` line to `package.json`. **No component
changes.** That is the test of whether the layering is intact.

---

## 6. How a product consumes the design system

**1. Depend on it.** In the product app's `package.json`:

```json
{ "dependencies": { "@axa/design-system": "workspace:*" } }
```

**2. Activate a theme.** In `globals.css`:

```css
@import 'tailwindcss';
@import '@axa/design-system/css/themes/munaxa'; /* or workaxa / inkaxa */

/* Tailwind v4 must scan the design system's sources to emit the classes it uses. */
@source '../../../../../designsystem/components';
@source '../../../../../designsystem/patterns';

/* Only if the product uses the motion patterns. */
@import '@axa/design-system/css/motion';

@layer base {
  :root {
    --radius: 0.5rem; /* the product's own radius base */
    /* --font-display / --font-body / --font-mono come from the app's font loader */
  }
}
```

**3. Import from the root.**

```tsx
import { Button, Card, CardContent, Table, useToast, cn } from '@axa/design-system';
import { Search } from '@axa/design-system/icons';
import { tokens } from '@axa/design-system/tokens';
import { themes } from '@axa/design-system/themes';
```

### Entry points

| Import                                | Gives you                                    |
| ------------------------------------- | -------------------------------------------- |
| `@axa/design-system`                  | components, patterns, hooks, `cn`, `themes`   |
| `@axa/design-system/tokens`           | typed structural tokens                       |
| `@axa/design-system/typography`       | the type scale                                |
| `@axa/design-system/themes`           | the typed theme registry + brand hexes        |
| `@axa/design-system/icons`            | the shared icon set                           |
| `@axa/design-system/hooks`            | UI hooks                                      |
| `@axa/design-system/patterns`         | patterns only                                 |
| `@axa/design-system/css/themes/<id>`  | a theme (contract + palette)                  |
| `@axa/design-system/css/tokens`       | the primitive scales as CSS vars              |
| `@axa/design-system/css/motion`       | styles for the motion patterns                |

### Verifying your theme

Render `<TokenReference />` on an internal page. It reads the live custom properties off the
document, so it can never drift from the palette: every swatch is the value your app is actually
serving, in the scheme it is actually in.

---

## 7. What must never enter this package

| Not allowed                                       | Why                                            |
| ------------------------------------------------- | ---------------------------------------------- |
| School / HR / finance terminology                  | Ties the layer to one product                   |
| Business rules, validation, permissions            | Product logic, not UI                           |
| Data fetching, API clients, routing                | Product infrastructure                          |
| i18n libraries or literal user-facing copy         | Translation is the product's job                |
| Product names outside `themes/` and `assets/`      | Branding is scoped; everything else is shared   |
| A hardcoded hex outside `themes/`                  | Breaks theming; ESLint enforces this            |

Munaxa keeps, and should keep, everything domain-shaped: `AppShell` (its navigation model),
`Shell` (auth guard), `PrivacyProvider`, `StatusBadge`, `ConfirmProvider` (bound to its i18n),
`GlobalSearch`, `Logo`/`Wordmark`/`Monogram`, `NavIcon`, `I18nProvider` and every
`components/domain/*`.

---

## 8. Contributing

1. Confirm a second consumer needs it (§3).
2. Place it by layer (§1) and name it by role (§2).
3. Style it only through the contract; no hexes, no magic numbers (§3, §4).
4. Export it through its category barrel and the root barrel.
5. `pnpm turbo run build lint typecheck --filter=@axa/design-system` must pass — lint enforces
   the no-hex rule, and the build type-checks every entry point.
6. If you added a contract variable, add it to **every** palette (§5.2).
