# Munaxa — School Operating System (School OS)

Munaxa is a **production-grade, multi-tenant School Operating System** for K-12 schools, built for
the **Jordan** market (Arabic + English, RTL + LTR). It covers school administration, student &
people management, attendance, scheduling, finance, communication, and reporting.

> Munaxa is **not** an LMS. It integrates with Google Classroom and Microsoft Teams via **deep
> links only** and never duplicates LMS functionality.

## Monorepo layout

```text
munaxa/
├── apps/
│   ├── api/        # NestJS backend (modular monolith, DDD + Clean Architecture)
│   ├── admin/      # Next.js 15 Admin Portal (App Router, Tailwind, shadcn)
│   └── mobile/     # Flutter apps (Parent / Student / Teacher flavors)
├── packages/
│   ├── domain/         # Framework-free domain enums/constants (roles, permissions, locale)
│   ├── contracts/      # Shared DTOs / zod schemas (API ⇄ Admin source of truth)
│   ├── utils/          # Cross-cutting helpers (Jordan validators, money)
│   ├── i18n/           # en/ar message catalogs
│   ├── ui/             # Shared React UI helpers
│   ├── config-typescript/  # Shared tsconfig bases
│   ├── config-eslint/      # Shared ESLint (flat) configs
│   └── config-tailwind/    # Tailwind preset + design tokens
├── prisma/         # Prisma schema & migrations (shared PostgreSQL)
├── docs/           # Architecture (Phase 0) & runbooks
└── .github/        # CI/CD workflows
```

## Prerequisites
- Node.js 22+ · pnpm 10+ · Docker · (Flutter 3.24+ for mobile)

## Quick start

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local

pnpm install
pnpm docker:up            # Postgres, Redis, LocalStack(S3), Mailhog
pnpm prisma:generate
pnpm dev                  # runs api + admin via Turborepo
```

- API: http://localhost:4000/api/v1 — Swagger at `/api/docs`
- Admin: http://localhost:3000

## Common scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in dev |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates |
| `pnpm format` | Prettier write |
| `pnpm prisma:migrate` | Create/apply a dev migration |
| `pnpm docker:up` / `pnpm docker:down` | Local infra |

## Documentation
- Architecture blueprint: [`docs/architecture/`](./docs/architecture/README.md)
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
- ⬜ Phase 11 — Parent Portal (next)

Development is **phase-by-phase**; see `MunaxaPrompts/` for the phase specifications.
