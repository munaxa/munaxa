# Workaxa

Reserved product root. **Nothing is implemented here yet** — this folder exists so the
repository's shape is settled before development starts, and so the design system has a second
real consumer to be designed against rather than a hypothetical one.

## What already exists for you

The shared UI layer is done and is the single source of truth:

| You need               | Where it comes from                                              |
| ---------------------- | ---------------------------------------------------------------- |
| Components             | `@axa/design-system`                                              |
| Design tokens          | `@axa/design-system/tokens`                                       |
| Icons                  | `@axa/design-system/icons`                                        |
| UI hooks               | `@axa/design-system/hooks`                                        |
| Theme registry         | `@axa/design-system/themes`                                       |
| The Workaxa theme      | `@import '@axa/design-system/css/themes/workaxa';`                |

The Workaxa palette is already authored — see
[`designsystem/themes/workaxa/`](../designsystem/themes/workaxa). Nothing about starting Workaxa
requires touching the design system's colours.

## When you start

1. Create the app(s) under `workaxa/` using the same shape Munaxa uses
   (`workaxa/apps/*`, `workaxa/packages/*`).
2. Add the new paths to the root [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) and, for any
   package that emits declarations, to the root [`tsconfig.json`](../tsconfig.json) references.
3. Depend on `"@axa/design-system": "workspace:*"`.
4. In the app's `globals.css`:

   ```css
   @import 'tailwindcss';
   @import '@axa/design-system/css/themes/workaxa';
   @source '../../../../designsystem/components';
   @source '../../../../designsystem/patterns';
   ```

   (Adjust the `@source` depth to the file's actual location — Tailwind v4 needs to scan the
   design system's sources to emit the classes its components use.)

Read [`designsystem/README.md`](../designsystem/README.md) before adding any component: whether
something belongs in the design system or in this product is the one decision that determines
whether the shared layer stays reusable.
