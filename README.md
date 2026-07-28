# AXA

Monorepo for the AXA product ecosystem and the design system they all share.

```
/
├── designsystem/     @axa/design-system — the shared, product-agnostic UI layer
├── munaxa/           Munaxa — Multi-Tenant School Operating System
├── workaxa/          Workaxa — reserved, not implemented yet
├── tooling/          shared ESLint + TypeScript configs (@axa/config-*)
├── package.json      workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml   local dev stack (Munaxa)
└── render.yaml          staging blueprint (Munaxa)
```

The repository root is the **workspace root**, not a product. It owns dependency resolution
(pnpm), the task graph (turbo), lint/format/TypeScript baselines and CI. Product code lives
entirely under its own product folder. This is what lets `munaxa/` and a future `workaxa/`
resolve `@axa/design-system` through `workspace:*` instead of publishing to a registry.

## Getting started

```bash
pnpm install
pnpm prisma:generate        # Munaxa API's Prisma client
pnpm build                  # everything, in dependency order
pnpm lint && pnpm typecheck && pnpm test
```

## The design system is the single source of truth

Every product consumes its components, tokens, icons and theme from
[`designsystem/`](designsystem/README.md). There are no product-local copies of a button, a
card, a token or a colour — that is enforced by review and, for colour, by ESLint.

Read [`designsystem/README.md`](designsystem/README.md) before adding UI anywhere. The one
decision that matters is whether a thing is shared or product-specific; the rules for making
that call are in §3 of that document.

## Products

| Product     | Folder                       | Status                                          |
| ----------- | ---------------------------- | ----------------------------------------------- |
| **Munaxa**  | [`munaxa/`](munaxa/README.md) | In development. Admin portal, API, landing, demo |
| **Workaxa** | [`workaxa/`](workaxa/README.md) | Reserved. Theme authored, no code yet          |
| **Inkaxa**  | —                            | Theme authored, no product root yet              |

## Workspace members

`pnpm-workspace.yaml` lists them. Two apps under `munaxa/` are deliberately *not* members —
`munaxa/munaxadesignsystem` and `munaxa/orbix-studio` are standalone Cloudflare apps with their
own pnpm roots and lockfiles.
