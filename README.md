# AXA

Monorepo for the AXA product ecosystem and the shared platform they all build on.

```
/
├── PLATFORM_ENGINEERING_STANDARDS.md   the rulebook — read before contributing
├── docs/README.md                      the documentation index
├── platform/         @axa/platform — the shared, product-agnostic foundation (frozen)
├── school/           Munaxa School — Multi-Tenant School Operating System
├── work/             Munaxa Work — reserved, not implemented yet
├── tooling/          shared ESLint + TypeScript configs (@axa/config-*)
├── package.json      workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml   local dev stack (School)
└── render.yaml          staging blueprint (School)
```

## Start here

| Read | For |
| --- | --- |
| [PLATFORM_ENGINEERING_STANDARDS.md](./PLATFORM_ENGINEERING_STANDARDS.md) | **Mandatory.** How work is done here — human or AI |
| [docs/README.md](./docs/README.md) | The documentation index: every document, its purpose and audience |
| [platform/README.md](./platform/README.md) | Consuming the shared platform |
| [school/docs/README.md](./school/docs/README.md) | The School product |

The repository root is the **workspace root**, not a product. It owns dependency resolution
(pnpm), the task graph (turbo), lint/format/TypeScript baselines and CI. Product code lives
entirely under its own product folder. This is what lets `school/` and a future `work/`
resolve `@axa/platform` through `workspace:*` instead of publishing to a registry.

## Getting started

```bash
pnpm install
pnpm prisma:generate        # School API's Prisma client
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

Munaxa is the brand; the products are named for what they do.

| Product    | Folder                        | Theme    | Status                                           |
| ---------- | ----------------------------- | -------- | ------------------------------------------------ |
| **School** | [`school/`](school/README.md) | `school` | In development. Admin portal, API, landing, demo  |
| **Work**   | [`work/`](work/README.md)     | `work`   | Reserved. Theme authored, no code yet             |
| **Docs**   | —                             | `docs`   | Theme authored, no product root yet               |
| **Group**  | —                             | `group`  | Corporate identity. Theme only                    |

## Workspace members

`pnpm-workspace.yaml` lists them. Two apps under `school/` are deliberately *not* members —
`school/munaxadesignsystem` and `school/orbix-studio` are standalone Cloudflare apps with their
own pnpm roots and lockfiles. Because they resolve `@axa/platform` through a `file:` dependency
rather than `workspace:*`, a platform change can break them while every workspace build stays
green; CI therefore runs the design-system job on `platform/**` changes too.
