# AXA

Monorepo for the AXA product ecosystem and the shared platform they all build on.

```
/
├── PLATFORM_ENGINEERING_STANDARDS.md   the rulebook — read before contributing
├── docs/README.md                      the documentation index
├── platform/         @axa/platform — the shared, product-agnostic foundation (frozen)
├── munaxa/           Munaxa — Multi-Tenant School Operating System
├── workaxa/          Workaxa — reserved, not implemented yet
├── tooling/          shared ESLint + TypeScript configs (@axa/config-*)
├── package.json      workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml   local dev stack (Munaxa)
└── render.yaml          staging blueprint (Munaxa)
```

## Start here

| Read | For |
| --- | --- |
| [PLATFORM_ENGINEERING_STANDARDS.md](./PLATFORM_ENGINEERING_STANDARDS.md) | **Mandatory.** How work is done here — human or AI |
| [docs/README.md](./docs/README.md) | The documentation index: every document, its purpose and audience |
| [platform/README.md](./platform/README.md) | Consuming the shared platform |
| [munaxa/docs/README.md](./munaxa/docs/README.md) | The Munaxa product |

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

[`PLATFORM_ENGINEERING_STANDARDS.md`](./PLATFORM_ENGINEERING_STANDARDS.md) is the mandatory
rulebook for every contributor; [`platform/CONTRIBUTING.md`](platform/CONTRIBUTING.md) is the
checklist for changing the shared layer itself, and
[`platform/architecture/`](platform/architecture/README.md) explains the reasoning. The one
decision that matters is whether a thing is shared or product-specific.

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
