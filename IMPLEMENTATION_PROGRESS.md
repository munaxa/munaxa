# HR × Attendance Evolution — Implementation Progress

_Live status of the atomic-PR program defined in
`HR_ATTENDANCE_ENTERPRISE_ARCHITECTURE.md` (Phase 3). Kept in sync with the code._

Branch: `claude/attendance-structure-ui-docs-lxo7qc`
Environment: Node 22 · pnpm 10 · **no database/Docker available** (see Blockers).

---

## Validation environment (what gates are runnable here)

| Gate | Runnable? | Notes |
|------|-----------|-------|
| Prisma generate | ✅ | proves schema parses/validates |
| TypeScript (`typecheck`) | ✅ | full API, green |
| ESLint (`lint`) | ✅ | full API, green |
| Unit tests (`jest`) | ✅ | **55 suites / 409 tests green** |
| Integration / E2E | ❌ | require Postgres (none provisioned) |
| Migration apply | ❌ | requires a database |
| Production build (`nest build`) | ✅ | runnable |

Every landed PR below passed **all runnable gates**. PRs that require a database
to complete their gate set are **not** committed as "done" — see Remaining.

---

## Landed PRs (validated, merged to the working branch)

| PR | Title | Owner (matrix) | Extend/New | Gates |
|----|-------|----------------|-----------|-------|
| Docs | Audit + plan + Capability Ownership Matrix | governance | — | n/a |
| PR-1 | Publish `StaffAttendanceRecorded` integration event | C1 events / C6 HR | EXTEND | tc ✓ lint ✓ unit ✓ |
| PR-2 | Calendar-aware `workingDaysBetween` (+ port) | C8 leave / C3 sched | EXTEND | tc ✓ lint ✓ unit ✓ |
| PR-3 | Attendance policy engine (pure core) | N2 (new, convention) | NEW-core | tc ✓ lint ✓ unit ✓ |
| PR-4 | Shift-window engine (pure core) | N1 (new) | NEW-core | tc ✓ lint ✓ unit ✓ |

**Behavioral impact today: none.** PR-1 emits a fact no consumer reads yet; PR-2's
calendar defaults to the original weekend-only behavior; PR-3/PR-4 are pure
modules not yet wired into the write path. This is deliberate, safe sequencing —
foundations first, wiring next.

**Duplicate-detection (per-PR):** no duplicate module/service/repo/API/event/
calculation introduced. PR-2 extends the single working-day helper; PR-4 reuses
the canonical `timeToMinutes` (no second HH:MM parser); PR-1 extends the single
`DomainEvents` bus (no second bus).

---

## Remaining PRs (blocked on a database — see Blockers)

Ordered per the plan. Each needs Postgres to satisfy its integration/e2e/migration
gates, so none is committed until it can pass them.

| PR | Title | Why DB-blocked |
|----|-------|----------------|
| PR-2b | Scheduling-backed calendar provider → leave/payroll | reads `ScheduleException`; needs e2e |
| PR-3b/4b | Persist `AttendancePolicy` + `Shift`/assignment; wire derivation into `record()` | new tables + migrations + e2e |
| PR-5 | Teacher-attendance sync (HR→Academics subscriber) | projection writes; e2e across contexts |
| PR-6 | Teacher availability read-model | needs seeded data; e2e |
| PR-7 | Driver→Transport sync | e2e |
| PR-8 | Attendance notification catalog + emitters | catalog is additive (typecheck-able); emit path needs engine e2e |
| PR-9 | Attendance locking (`AttendanceLock` + guard) | new table + migration + e2e |
| PR-10 | Correction workflow (`AttendanceCorrectionRequest`) | new table + migration + e2e |
| PR-11 | Biometric provider layer + ingestion | e2e |
| PR-12 | Attendance analytics (extends HR dashboard/reporting) | repository + e2e |
| PR-13 | Payroll `Validated` stage | depends on lock; e2e |
| PR-14 | Admin/mobile UI | frontend build + visual |

---

## Blockers

- **B1 — No database in this environment.** No Docker, no `DATABASE_URL`, no
  Postgres. All remaining PRs introduce migrations and/or cross-context
  persistence whose mandated gates (integration, e2e, migration-apply, migration
  safety) cannot be executed here. Committing that code without those gates would
  violate the program's own quality-gate rule ("No PR is complete until every gate
  passes") and risk an unvalidated schema. **Resolution required:** run the
  remaining PRs in an environment with Postgres (the repo ships
  `docker-compose.yml`; `pnpm docker:up` + `prisma migrate dev` provisions it).

---

## Risk Register

| ID | Risk | Severity | Mitigation / status |
|----|------|----------|---------------------|
| R1 | Dual event buses (`DomainEvents` vs `NotificationEventBus`) drift | Med | PR-1 extended the existing `DomainEvents`; notifications remain a subscriber. No third bus. |
| R2 | In-process events not durable (lost on crash) | Med | Optional `EventOutbox` deferred to PR-1b; current syncs are best-effort + reconcilable. Accepted for now. |
| R3 | `lateMinutes` caller-supplied until derivation is wired | Low→resolving | PR-4 shift engine derives it; wiring in PR-4b. |
| R4 | Calendar rule fork between leave & payroll | Closed | PR-2 evolved the single shared helper; regression-tested. |
| R5 | Migration safety for new tables | Open | New tables (Shift, Policy, Lock, Correction) must be additive + RLS + `munaxa_app` grant, mirroring `20260723160000_hr_staff_attendance`. Enforced at PR authoring; needs DB to apply. |

## Breaking Change Report

**Empty.** No existing API, DTO, table, enum, or public signature changed
behavior. Repository return types were enriched internally (`record`/`bulkRecord`)
but HTTP contracts are unchanged; `workingDaysBetween` added an optional
parameter (backward compatible).

## Technical Debt Register

| ID | Item | Rationale |
|----|------|-----------|
| TD1 | `EventOutbox` durability not yet implemented | In-process bus acceptable for v1; revisit when a lost sync is business-critical. |
| TD2 | Shift engine handles same-day shifts only | Overnight shifts deferred; documented in `shift-window.logic.ts`. |
| TD3 | Policy/shift pure cores not yet persisted or wired | Intentional logic-first sequencing; wiring PRs are DB-blocked. |

## Migration Notes

No migrations added yet. Forthcoming tables (`Shift`, `EmployeeShiftAssignment`,
`AttendancePolicy`, `AttendanceLock`, `AttendanceCorrectionRequest`) will each:
enable + force RLS, add the `tenant_isolation` policy, and `GRANT` CRUD to
`munaxa_app` — mirroring `prisma/migrations/20260723160000_hr_staff_attendance`.
