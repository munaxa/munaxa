# Timetable → Enterprise Scheduling Engine — Refactor

## Context

The Munaxa timetable was **time-slot oriented**: `TimetableSlot` rows hung directly off a `Section`
with a flat `periodIndex`, no semester link, and no draft/publish lifecycle. Real K–12 schools work
differently — a timetable belongs to a **Section**, is versioned as a **Schedule Plan** inside a
**Semester**, is **published** once (after conflicts are cleared), and everyone else (students,
parents, teachers, attendance) **inherits** it. Students never own timetable records.

This refactor is **additive** and preserves existing data. The legacy
`TimetableSlot` / `ScheduleException` / `TimetableConfig` tables stay in place during the transition
(the same "transitional shim" approach the codebase already uses for `Student.sectionId` and
`AcademicYear.campusId`). A migration wraps existing slots into a default published plan so nothing
is lost.

New hierarchy:

```
AcademicYear → Semester → SchedulePlan → SectionTimetable → ScheduledClass
                          (DRAFT/PUBLISHED/ARCHIVED)         ("Class", not "Period")
```

Inheritance (no per-person timetable rows):

```
Student → Enrollment → Section ┐
Teacher → TeacherSection ──────┼→ PUBLISHED SchedulePlan → SectionTimetable → ScheduledClass
Parent  → child's Enrollment ──┘
```

---

## Delivered in this pass (foundation — verified)

| Item | File | Status |
|------|------|--------|
| Prisma models + enums + relations | `prisma/schema.prisma` | ✅ `prisma validate` passes |
| Data-preserving migration + RLS + backfill | `prisma/migrations/20260720120000_scheduling_engine/migration.sql` | ✅ written |
| Pure resolution + live-context + conflict engine | `apps/api/src/timetable/engine/scheduling-engine.ts` | ✅ written |
| Engine unit tests | `apps/api/src/timetable/engine/scheduling-engine.spec.ts` | ✅ written (run with `pnpm --filter @munaxa/api test`) |

### New models

- **`Subject`** — managed, tenant-scoped subject with a stable `colorHex` (consistent grid colours)
  and optional `code`. Replaces free-text subject strings. Partial-unique `(tenantId, code)`.
- **`SpecialLocation`** — optional lab/gym/library/etc. `ScheduledClass.locationId` is null for normal
  lessons (which happen in the section's assigned classroom and are **never shown as a room number**).
- **`BellSchedule` / `BellSchedulePeriod`** — reusable "school class times" definition per campus &
  `ScheduleType`; `isBreak` rows model assembly/break/lunch.
- **`SchedulePlan`** — versioned plan under a `Semester`. `status` DRAFT/PUBLISHED/ARCHIVED. Partial
  unique index guarantees **one PUBLISHED plan per semester**.
- **`SectionTimetable`** — one weekly timetable per `(plan, section)`.
- **`ScheduledClass`** — a "Class": `classNumber`, `startTime`/`endTime`, `subjectId`, optional
  `teacherId`, optional `locationId`. Unique `(sectionTimetable, scheduleType, dayOfWeek, classNumber)`.

All new tables carry `tenantId`, soft-delete (`deletedAt`) where recoverable, and the
`tenant_isolation` RLS policy (identical pattern to the existing timetable migration).

### Engine API (`scheduling-engine.ts`, pure & reusable)

- `resolveScheduleType(config, date)` — REGULAR vs RAMADAN (inclusive window).
- `resolveDay({ classes, exceptions, scheduleType, dayOfWeek })` — overlays exceptions
  (cancel/substitute/replace/holiday) on the published classes.
- `findCurrentAndNext(classes, nowMinutes)` — current + next, skipping cancelled.
- `buildLiveContext(day, nowMinutes)` — the shared **live card** model: state ∈
  `IN_CLASS | BEFORE_SCHOOL | BREAK | AFTER_SCHOOL | HOLIDAY | NO_CLASSES`, plus `remainingClasses`,
  `minutesUntilCurrentEnds`, `minutesUntilNextStarts`. **Never stored — always computed from server time.**
- `detectConflicts(classes)` → `Conflict[]` — `TEACHER_DOUBLE_BOOKING`, `SECTION_OVERLAP`,
  `MISSING_TEACHER`, `INVALID_TIME` (ERROR) + `SUBJECT_DUPLICATION` (WARNING).
- `canPublish(conflicts)` — true iff no ERROR-severity conflict. **Publishing must call this.**

---

## Remaining build-out (follow-ups)

Each NestJS resource follows the existing `{controller, service, repository, dto}` pattern (see
`apps/api/src/structure/semesters/*` as the template) and registers in a module.

### Backend — `apps/api/src/timetable/`

1. **`subjects/`** — CRUD for `Subject` (name En/Ar, code, colorHex). Permission `timetable:manage`.
2. **`special-locations/`** — CRUD for `SpecialLocation`.
3. **`plans/`** — `SchedulePlanService`:
   - `create(semesterId, name)` → DRAFT; `duplicate(planId)`; `copyFromSemester(sourceSemesterId, targetSemesterId)`.
   - `validate(planId)` → loads all `ScheduledClass` for the plan, calls `detectConflicts`, returns the list.
   - `publish(planId)` → runs `detectConflicts`; **rejects with 409 if `!canPublish`**; sets status
     PUBLISHED + `publishedAt/ById`; the one-published partial index enforces exclusivity.
   - `archive(planId)`, `restore(planId)`.
   - `remove(planId)` → **guard: PUBLISHED plans and plans referenced by existing attendance cannot be
     deleted**; DRAFT/ARCHIVED only; write an `AuditLog` entry (see `apps/api/src/**/**.repository.ts`
     for the audit-write pattern).
4. **`section-timetables/`** — manage `SectionTimetable` + its `ScheduledClass` rows (inline create/
   update/delete a class, clear one day, clear one section). Bulk ops: replace-teacher, replace-subject.
5. **`resolver/` (refactor `resolver.service.ts`)** — resolve **from the published plan** instead of
   `TimetableSlot`:
   - `sectionId + date` → find PUBLISHED plan for the section's current semester → `SectionTimetable`
     → `ScheduledClass[]` → map to `ScheduledClassInput` (join Subject/Teacher/Location names) →
     `resolveScheduleType` + `resolveDay`.
   - `currentClass(sectionId, at)` → `buildLiveContext`.
   - Keep the old `TimetableSlot` path behind a feature check until fully retired.

### Inheritance & integration

- **Student portal** `apps/api/src/student-portal/me/me.service.ts::timetable()` — replace the raw
  `timetableForSection` read with: resolve the student's **active Enrollment → sectionId** → published
  plan resolver. Add a `liveClass()` endpoint using `buildLiveContext`.
- **Parent portal** — for each linked child's active enrollment, expose the same resolved week +
  `buildLiveContext` ("Now Attending" card). No new tables.
- **Teacher dashboard** — dynamically gather the teacher's `ScheduledClass` rows across sections for
  the day (never stored); `buildLiveContext` per current class + "attendance pending" flag.
- **Attendance** `apps/api/src/attendance/students/*` — derive current class/subject/teacher from the
  resolver instead of asking the caller; key attendance to `(section, classNumber, date)`.

### Admin UI — `apps/admin/src/app/(app)/timetable/`

Replace `page.tsx` with an enterprise scheduling workspace (`src/lib/timetable.ts` gains the plan/
class/conflict endpoints):
- Selectors: Academic Year → Semester → Schedule Plan (+ status badge).
- Weekly grid per section; Grade/Section/Teacher/Subject filters; subject colours from `Subject.colorHex`.
- Live **conflict/validation panel** (calls `validate`), and actions: Publish, Archive, Duplicate,
  Copy Previous Semester, Delete (with confirm), Print, Export PDF/Excel.
- Drag-and-drop + inline editing (defer to a dedicated pass; the CRUD endpoints above already support
  a non-drag editor first).

### Mobile — `apps/mobile/lib/features/{student,timetable}/`

- Point `TimetableApi`/`studentTimetableProvider` at the inherited published plan.
- Add a live "Now Attending / Next Class / remaining time" card from the `liveClass()` endpoint,
  rendering the non-class states (Before School, Break, Lunch, School Finished, Holiday).

---

## Verification

1. **Schema:** `DATABASE_URL=… DIRECT_DATABASE_URL=… npx prisma validate` — ✅ passes.
2. **Engine tests:** `pnpm --filter @munaxa/api test scheduling-engine` (14 cases: resolution,
   Ramadan, live states, all conflict types, publish-gate).
3. **Migration (against a DB):** `pnpm prisma:migrate` then confirm each section that had
   `TimetableSlot` rows now has a `Migrated Plan` (PUBLISHED) → `SectionTimetable` → `ScheduledClass`
   rows, and RLS blocks cross-tenant reads.
4. **End-to-end (after backend build-out):** create AY→Semester→Plan, add classes, introduce a
   teacher double-booking → `validate` reports it and `publish` returns 409; resolve → publish →
   student/parent/teacher inherit; attendance reads the active class.

> **Note:** dependencies were not installed in this environment, so `tsc`/`jest` could not be run
> here. The Prisma schema was validated with the Prisma CLI; the engine + tests are framework-free
> and mirror the existing, passing `timetable-engine.spec.ts`.
