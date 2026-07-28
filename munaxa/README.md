# Munaxa — School Operating System (School OS)

Munaxa is a **production-grade, multi-tenant School Operating System** for K-12 schools, built for
the **Jordan** market (Arabic + English, RTL + LTR). It covers school administration, student &
people management, attendance, scheduling, finance, communication, and reporting.

> Munaxa is **not** an LMS. It integrates with Google Classroom and Microsoft Teams via **deep
> links only** and never duplicates LMS functionality.

## Layout

Munaxa is one product inside the [AXA workspace](../README.md). Its UI comes entirely from the
shared design system at [`/designsystem`](../designsystem/README.md) — there are no Munaxa-local
component or token packages.

```text
munaxa/
├── apps/
│   ├── api/        # NestJS backend (modular monolith, DDD + Clean Architecture)
│   ├── admin/      # Next.js 15 Admin Portal (App Router, Tailwind v4)
│   └── mobile/     # Flutter apps (Parent / Student / Teacher flavors)
├── packages/
│   ├── domain/     # Framework-free domain enums/constants (roles, permissions, locale)
│   ├── contracts/  # Shared DTOs / zod schemas (API ⇄ Admin source of truth)
│   ├── utils/      # Cross-cutting helpers (Jordan validators, money)
│   └── i18n/       # en/ar message catalogs
├── landing/            # Marketing site (Next.js, Cloudflare Workers)
├── munaxademo/         # Hermetic public demo (Next.js, Cloudflare Workers)
├── munaxadesignsystem/ # Design-system reference website (standalone pnpm root)
├── orbix-studio/       # Design exploration app (standalone pnpm root)
├── prisma/         # Prisma schema & migrations (shared PostgreSQL)
├── infra/          # Postgres roles, load tests
├── scripts/        # Build/ops scripts
└── docs/           # Architecture (Phase 0) & runbooks
```

Shared, cross-product concerns live at the workspace root, not here:

| Concern                          | Location                                        |
| -------------------------------- | ----------------------------------------------- |
| Components, tokens, icons, theme | [`/designsystem`](../designsystem/README.md)     |
| ESLint / TypeScript bases        | [`/tooling`](../tooling)                         |
| Workspace, task graph, CI        | `/pnpm-workspace.yaml`, `/turbo.json`, `/.github` |

The Munaxa theme (`@axa/design-system/css/themes/munaxa`) is the brand: teal `#007595`, its
palette authored in [`/designsystem/themes/munaxa`](../designsystem/themes/munaxa).

## Prerequisites
- Node.js 22+ · pnpm 10+ · Docker · (Flutter 3.24+ for mobile)

## Quick start

All commands run from the **repository root** (the workspace root), not from `munaxa/`.

```bash
cp .env.example .env
cp munaxa/apps/api/.env.example munaxa/apps/api/.env
cp munaxa/apps/admin/.env.example munaxa/apps/admin/.env.local

pnpm install
pnpm docker:up            # Postgres (+ app role), Redis, LocalStack(S3), Mailhog
pnpm prisma:generate
pnpm prisma:migrate       # apply migrations (also seeds the global permission catalog)
pnpm --filter @munaxa/api db:seed:demo   # demo school + admin login + a sample student
pnpm dev                  # runs api + admin via Turborepo
```

- API: http://localhost:4000/api/v1 — Swagger at `/api/docs`
- Admin: http://localhost:3000

**Demo login** (from `db:seed:demo`): tenant `demo` · `admin@demo.example` · `ChangeMe123!`

## Common scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in dev |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates |
| `pnpm format` | Prettier write |
| `pnpm prisma:migrate` | Create/apply a dev migration (+ seeds permissions) |
| `pnpm --filter @munaxa/api db:seed:demo` | Seed a demo school + admin login |
| `pnpm docker:up` / `pnpm docker:down` | Local infra |

## Documentation
- **Session handoff / continuation guide**: [`docs/HANDOFF.md`](./docs/HANDOFF.md) — read first to resume work
- Architecture blueprint: [`docs/architecture/`](./docs/architecture/README.md)
- Design system (shared UI layer): [`/designsystem/README.md`](../designsystem/README.md)
- Phase deployment notes: [`docs/phases/`](./docs/phases/)

## Phase status
- ✅ Phase 0 — System Architecture
- ✅ Phase 1 — Foundation Setup
- ✅ Phase 2 — Core Database Design
- ✅ Phase 3 — Authentication & RBAC
- ✅ Phase 4 — School Structure Management
- ✅ Phase 5 — People Management
- ✅ Phase 6 — Timetable Engine
- ✅ Phase 7 — Attendance System
- ✅ Phase 8 — Academics
- ✅ Phase 9 — Finance
- ✅ Phase 10 — Communication System
- ✅ Phase 11 — Parent Portal
- ✅ Phase 12 — Student App
- ✅ Phase 13 — Reporting
- ✅ Phase 14 — Advanced Modules
- ✅ Phase 15 — Production Hardening

Development is **phase-by-phase**; see `MunaxaPrompts/` for the phase specifications.
