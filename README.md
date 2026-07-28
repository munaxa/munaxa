# AXA

Monorepo for the AXA product ecosystem and the shared platform they all build on.

```
/
├── platform/         @axa/platform — the shared, product-agnostic foundation
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
resolve `@axa/platform` through `workspace:*` instead of publishing to a registry.

## Getting started

```bash
pnpm install
pnpm prisma:generate        # Munaxa API's Prisma client
pnpm build                  # everything, in dependency order
pnpm validate && pnpm lint && pnpm typecheck && pnpm test
```

## The platform is the single source of truth

Every product consumes its components, tokens, icons and theme from
[`platform/`](platform/README.md). There are no product-local copies of a button, a card, a
token or a colour — enforced by review, by ESLint for colour, and by `pnpm validate` for the
theme contract and token scales.

[`platform/CONTRIBUTING.md`](platform/CONTRIBUTING.md) is the **mandatory standard** for all
work in the shared layer; [`platform/architecture/`](platform/architecture/README.md) explains
the reasoning. Read them before adding UI anywhere. The one decision that matters is whether a
thing is shared or product-specific.

```bash
pnpm validate   # theme contract + structural token mirrors — runs in CI before lint
```

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
