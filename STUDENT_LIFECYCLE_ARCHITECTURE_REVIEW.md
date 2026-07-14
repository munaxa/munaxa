# Student Lifecycle, Admission & Academic-Year Architecture Review

> **Status: ARCHITECTURE REVIEW — awaiting approval before any code or schema change.**
> **Scope:** Student identity, Enrollment lifecycle, Academic Year lifecycle, one unified
> Admission, Year-End Processing, Withdrawal/Graduation/Re-enrollment. Built **on top of** the
> existing Finance ledger, Financial Account (`Payer`), Enrollment, Admissions and Fee-Config
> modules. **No existing ledger is redesigned. No automatic data migration.**
> **House conventions reused:** `TenantRepository.run()` + Postgres RLS, `writeAudit(tx, …)` in the
> same transaction, `@RequirePermissions`, partial-unique-index soft-delete pattern, effective-dated
> fee config, control-account/subsidiary-ledger finance model.

---

## 0. Executive position (read this first)

**This is mostly subtraction and completion, not a new system.** Munaxa already shipped the correct
spine for this specification:

| Business rule in the spec | Already in the codebase |
|---|---|
| One `Student` per person; identity by National ID / MoE number | `Student.nationalId` + `Student.moeStudentNumber`, uniqueness enforced by **partial unique indexes** (`WHERE deletedAt IS NULL`) — soft-delete-safe. |
| One student → many enrollments; each enrollment ∈ one academic year | `Enrollment` with `@@unique([tenantId, studentId, academicYearId])`. |
| Academic info on Enrollment; finance on the Financial Account | `Enrollment` (year/grade/section) + `Payer` (Financial Account) → `StudentFinancialAccount` sub-ledger. `Charge` already carries `enrollmentId` + `academicYearId`. |
| Re-enrollment reuses the student, never recreates | Admissions DTO already accepts `existingStudentId`; `RegistrationCommitment` gives idempotent commit. |
| Ledger is the single source of truth; balances span years | Control-account (`Payer`) over per-student sub-ledgers; `Charge.academicYearId` already dimensions the ledger by year. |

So the work is: **(a) finish four things that are genuinely missing** — a participation-lifecycle
status machine, an Academic-Year status machine, the Year-End Processing wizard, and a single
identity-lookup admission entry — and **(b) correct two places where the current model contradicts
the spec's own principle** — academic state that still lives on `Student`, and the admission-only
meaning of `EnrollmentStatus`.

I am **challenging five points** in the specification up front (§16) because getting them right is
what makes this last ten years. Everything below assumes those positions unless overridden.

**I recommend we do NOT write code until the five decision points in §16 are answered.**

---

## 1. Domain review

The canonical nouns, and where each concept must live:

- **Student = a person, for life.** Holds identity only: names (EN/AR + father/third), National ID,
  MoE number, DOB, gender, `userId`, `qrCode`, guardianship links. Nothing time-varying about
  schooling.
- **Enrollment = one student's participation in one Academic Year.** Holds *all* year-specific
  placement and lifecycle: campus, grade, section, classroom, admission/withdrawal/graduation dates,
  status, reason, transport intent, fee references.
- **Academic Year = an independent calendar/administrative entity** with explicit Start/End/Status
  that *gates* admissions, attendance, timetables, academics, finance generation and reporting.
- **Financial Account (`Payer`) = the customer that pays** for one or more students across one or
  more years. Control account over per-student `StudentFinancialAccount` sub-ledgers. Never
  recreated on withdrawal; survives any single child leaving.
- **Charge/PaymentPlan/Installment/Payment/Allocation/Credit/Refund = the ledger.** Immutable
  history; the single source of truth. Reused untouched.

**The one frame that resolves every "where does X live?" question:** identity rolls *sideways*
(Student ↔ Guardian ↔ Financial Account), academic facts roll *down* to the Enrollment, and money
rolls *up* the ledger (student sub-ledger → account control balance). This is already the house
model for finance (`UNIFIED_FINANCIAL_ACCOUNT_ARCHITECTURE.md`); we are extending the same
discipline to the academic side.

**Current violations of this frame (must fix):** `Student.status`, `Student.sectionId`,
`Student.enrollmentDate`, `Student.transportRequested`, `Student.areaId` are academic/time-varying
facts sitting on the identity record. See §4 and §16-D.

---

## 2. Student lifecycle review

**Spec rule:** *the Student record itself never becomes Withdrawn or Graduated; only Enrollment
changes status.*

**Today:** `enum StudentStatus { ACTIVE INACTIVE GRADUATED WITHDRAWN }` on `Student.status`. This is
a direct contradiction — withdrawal/graduation are stamped on identity. It is also *load-bearing*:
attendance, student lists, and finance filters read `Student.status` and `Student.sectionId`.

**Recommendation (see §16-D for the decision):** keep a `Student`-level status but **redefine and
demote it to a derived read-model**, never edited by hand:

- `StudentStatus` means **record state**, not academic state: `PROSPECT` (draft, no active
  enrollment yet) · `ENROLLED` (has an ACTIVE enrollment) · `ALUMNUS` (last enrollment GRADUATED) ·
  `INACTIVE` (no active enrollment, last was WITHDRAWN/COMPLETED) · `ARCHIVED`.
- It is **computed transactionally** by the single Enrollment-lifecycle writer whenever an enrollment
  changes state — the same pattern as the finance rollups. No screen writes it directly.
- The *academic* words "Withdrawn"/"Graduated" live **only** on `EnrollmentStatus`.

This preserves every existing query (`Student.status` still exists and is still indexed) while making
the spec's invariant true: a graduated person is `ALUMNUS`, not "a graduated student record" — their
graduation is a property of the 2027–2028 enrollment, permanently.

`Student.sectionId` → becomes the **current** section, derived from the active Enrollment (§4/§6).

---

## 3. Academic Year architecture review

**Today:** `AcademicYear { name, startDate, endDate, isCurrent Boolean }`, scoped **per campus**
(`@@unique([tenantId, campusId, name])`). "Current" is a boolean toggled by
`AcademicYearService`; nothing enforces a single current year and there is no lifecycle.

**Gaps vs. spec:** no explicit `Upcoming / Active / Closed` status; no single-active guarantee; no
closure semantics (locking attendance/grades/timetables while keeping finance open); and a scoping
mismatch — the spec says *"only one Academic Year may be Active per school"* but the model is
per-campus.

**Recommendation:**

1. Add `enum AcademicYearStatus { UPCOMING ACTIVE CLOSED }` (replacing the `isCurrent` boolean;
   `isCurrent == status == ACTIVE`). Keep `isCurrent` as a generated/compat column for one release if
   cheaper than touching all readers.
2. Enforce **exactly one ACTIVE per scope** with a partial unique index
   (`… WHERE status = 'ACTIVE'`), mirroring the "one ACTIVE PaymentPlan per charge" pattern already
   in the schema.
3. **Closure is an administrative event only** — it flips status to `CLOSED` and *locks academic
   editing* for that year (attendance, grades, timetables become read-only via a guard keyed on the
   year's status). It **must not** touch any Student or Enrollment row. Finance stays fully open;
   outstanding balances remain collectible (§8).
4. **Scope decision required (§16-A):** keep per-campus ("one active per campus", read "school" as
   the operating campus) vs. promote to school-scoped. My recommendation: **keep per-campus** — real
   Jordanian multi-campus operators run different calendars — and enforce single-ACTIVE-per-campus.

---

## 4. Enrollment model review

`Enrollment` exists and is the right anchor, but it is currently an **admission artifact**, not a
**participation record**. Two corrections:

**(a) It is missing the year-specific fields the spec assigns to it.** Add (nullable, additive):
`campusId`, `classroomId`, `admissionDate`, `withdrawalDate`, `graduationDate`, `reason`
(withdraw/graduate/cancel reason), and an explicit link for transport intent
(`transportDirection` already exists; add `areaId`/`transportRequested` here so they leave
`Student`). Attendance/behavior/grades/documents already reference `Student` + `Section`; they become
*derivable per year* by joining through the Enrollment for that year — no data move required, just a
reporting view.

**(b) Its status enum conflates two different lifecycles (see §16-C).** Today:
`EnrollmentStatus { QUOTED PENDING_APPROVAL COMMITTED ACTIVE CANCELLED }` — that is the *admission*
lifecycle. The spec wants the *participation* lifecycle
(`Draft Registered Active Completed Promoted Repeated Withdrawn Graduated Archived`).

**Recommendation:** **one** status machine that spans both, because they are one continuous life of a
single row:

```
DRAFT ─▶ QUOTED ─▶ (PENDING_APPROVAL) ─▶ REGISTERED ─▶ ACTIVE ─▶ ┬▶ COMPLETED ─▶ PROMOTED / REPEATED
                                                                 ├▶ GRADUATED
                                                                 └▶ WITHDRAWN
   (any pre-ACTIVE state) ─▶ CANCELLED                    (terminal) ─▶ ARCHIVED (year closed)
```

Migration of existing values: `COMMITTED → REGISTERED`, keep `ACTIVE`, keep `CANCELLED`,
`QUOTED/PENDING_APPROVAL` unchanged. `PROMOTED`/`REPEATED` are stamped on the *outgoing* enrollment
when the *next* enrollment is created by the wizard, so history reads cleanly ("2025-26 Grade 4
Promoted → 2026-27 Grade 5 Active").

Immutability: once the enrollment's Academic Year is `CLOSED`, the row (and its academic children)
are read-only — enforced by an app guard, backed by an append-only audit; a DB trigger is the
belt-and-suspenders option (§16-E is not this; this is a firm recommendation).

---

## 5. Year-End Processing workflow review

Entirely new. Model it as a **resumable, idempotent, audited batch** reusing the admission commit
path — do **not** build a parallel enrollment writer.

- **New models:** `YearEndProcess` (per source AcademicYear: status, counts, actor, timestamps) and
  `YearEndDecision` (per student: `PROMOTE | REPEAT | GRADUATE | WITHDRAW | DECIDE_LATER`, review
  flags, resulting `enrollmentId`). Idempotency via a per-decision key, exactly like
  `RegistrationCommitment.idempotencyKey`.
- **Step 1 — Close the year:** flip `AcademicYearStatus → CLOSED`; lock academic editing; finance
  stays open. No Student/Enrollment mutation.
- **Step 2 — Ensure next year exists** (`UPCOMING`). Reuse `AcademicYearService`.
- **Step 3 — Review board:** list every `ACTIVE` enrollment in the closing year; **highlight** rows
  needing manual review (failed subjects / missing grades / administrative or finance holds). **The
  system never silently promotes** — every student needs an explicit decision or stays
  `DECIDE_LATER`.
- **Step 4/5 — Promote/Repeat:** for each decided student, **call the same
  `RegistrationCommitService`** that admission uses, with `existingStudentId` set → creates the next
  Enrollment (copy campus/guardian/account-ref/optional default transport; set new year/grade/
  section/classroom), generates new Charges/Plan/Schedule via the existing fee engine, and stamps the
  outgoing enrollment `PROMOTED`/`REPEATED`. Historical enrollments untouched.
- **Step 6 — Graduate:** close the outgoing enrollment as `GRADUATED`; no new enrollment; Student
  becomes `ALUMNUS` (derived). All history retained.

**Why reuse the commit path:** admission, re-enrollment, promotion and repeat are the *same write* —
"create the next Enrollment + its ledger for this person." One path = one set of invariants, one
audit shape, one place to fix bugs. This is the single biggest maintainability win in the whole
refactor.

---

## 6. Database impact

All additive; no destructive change; no auto-migration of existing rows.

| Change | Type | Notes |
|---|---|---|
| `AcademicYearStatus` enum + `AcademicYear.status` | additive | backfill `ACTIVE` where `isCurrent`, else `UPCOMING`/`CLOSED` by date; partial unique index for single-ACTIVE. |
| Extend `EnrollmentStatus` enum + remap `COMMITTED→REGISTERED` | additive + data update | enum values only added; one UPDATE for existing rows, audited. |
| `Enrollment` new columns: `campusId, classroomId, admissionDate, withdrawalDate, graduationDate, reason, areaId, transportRequested` | additive nullable | placement/lifecycle moves here from `Student`. |
| Redefine `StudentStatus` values + make it derived | **behavioral** | keep column + indexes; add the new values; stop hand-editing; backfill from enrollments. Old values remain valid during transition. |
| `YearEndProcess`, `YearEndDecision` | new tables | standard tenant + RLS + audit. |
| Partial index: one `ACTIVE` AcademicYear per campus | additive | mirrors existing partial-unique patterns. |
| Optional: `WithdrawalSettlement`, `AdmissionCancellation` orchestration records | new tables | thin audit records over existing ledger ops (§8); no new ledger primitives. |
| Reporting view: per-year enrollment ↔ attendance/grades/behavior | new view | no data move; joins through Enrollment. |

Every new table follows the house pattern: `tenantId` NOT NULL, `tenant_isolation` RLS policy,
composite indexes leading with `tenantId`, `writeAudit` in-transaction.

---

## 7. Backend impact

- **New `StudentIdentityService.lookupByIdentifier(nationalId | moeStudentNumber)`** — the single
  identity check that drives admission Cases A/B/C (§9). National ID primary, MoE fallback, **exact
  match only**, tenant-scoped. No fuzzy/name/DOB comparison, ever.
- **`EnrollmentLifecycleService`** — the sole writer of enrollment status transitions and the derived
  `Student.status`/current-section; enforces the state machine in §4; writes audit per transition.
- **`RegistrationCommitService`** — extend the existing commit to be the shared path for admission,
  re-enrollment, promotion and repeat (parameterised by `existingStudentId` + `mode`). Fold the
  existing "family MERGE/SEPARATE/NEW_PLAN" wizard into it as a *mode*, not a second endpoint.
- **`AcademicYearService`** — add status transitions + single-ACTIVE enforcement + closure locking
  guard.
- **`YearEndProcessingService`** — orchestrates the wizard; batches decisions; idempotent per
  decision; delegates writes to `RegistrationCommitService`/`EnrollmentLifecycleService`.
- **Guards:** a `ClosedYearReadOnlyGuard` on attendance/grades/timetable mutations keyed on the
  year's status; a `DeletableOnlyIfDraftGuard` for the deletion rule (§13).
- **Permissions:** reuse `Registrar`, `SchoolAdmin`, `Principal`, `FinanceOfficer`. Add
  `enrollment:promote`, `enrollment:withdraw`, `academicyear:close`, `yearend:process` to the catalog
  and role-permission seed.

Existing endpoints keep working; nothing is deleted until the unified admission fully replaces the
two current flows (§10).

---

## 8. Finance impact

**The ledger is not redesigned and not migrated.** Everything below is orchestration over existing
primitives.

- **Re-enrollment / promotion finance:** new Enrollment → new `Charge`s (dimensioned by the new
  `academicYearId`/`enrollmentId` already on `Charge`) → new `PaymentPlan` + `Installment`s via the
  existing fee engine (`ChargeService.createInstallments`). Previous-year charges are **never
  rewritten**. Balances aggregate up the `Payer` control account across years — already true today.
- **Withdrawal settlement (academic event ≠ financial event):** a `WithdrawalSettlementService` that
  runs school policy as existing ledger ops — cancel remaining tuition (`Charge/Installment →
  CANCELLED`), keep registration fee, charge current month, refund transport/books (`Refund` +
  `RefundConsumption`), apply penalties (`FeeAdjustment`). **Nothing deleted; all recorded.** No new
  ledger tables — only a thin `WithdrawalSettlement` audit record tying the ops together.
- **Cancel Admission (pre-active):** void charges (`Charge → CANCELLED`), policy refund, cancel
  transport, release seat, **keep audit**. Distinct from withdrawal (§13/§16-B).
- **Financial Account continuity:** withdrawing one child never closes the `Payer`; siblings' charges
  and the control balance are untouched — already the model's behavior.
- **JoFotara / receipts:** unchanged; reused via `FinanceBridgeService`.

---

## 9. Admission impact

**Collapse the two flows** (`/admissions` and `/admissions/family`) into **one** wizard; the
single-student case is the degenerate N=1 of the account flow (consistent with
`UNIFIED_FINANCIAL_ACCOUNT_ARCHITECTURE.md`).

Flow:

1. **Guardian** — select existing or create → resolves/creates the Financial Account (`Payer`).
2. **Identity** — enter National ID (or MoE number) → **immediate `lookupByIdentifier`**:
   - **Case A — not found:** normal admission → create Student + Enrollment + Charges + Plan +
     Agreement (existing commit path).
   - **Case B — found & has ACTIVE enrollment:** *"already enrolled"* → buttons **Open Student** /
     **Open Financial Account**. No new admission.
   - **Case C — found & no active enrollment (last WITHDRAWN/COMPLETED):** *"previously enrolled"* →
     primary action **Re-Enroll** → same commit path with `existingStudentId`. **Never create a new
     Student.**
3. **Similar-name warning (new, informational only):** before the identifier is entered, a soft
   warning if a very similar name already exists — **never** blocks, **never** substitutes for the
   National-ID identity check (§16 keeps this a UX nicety, not an identity path).

`existingStudentId` already exists in the DTO; the missing piece is the *identity-lookup-first* entry
and the A/B/C branching UI.

---

## 10. Parent Portal impact

- **Student profile becomes read-only for finance** — show Financial Account, Outstanding Summary,
  Current Enrollment, and **Enrollment History** (immutable per-year rows: year · grade · status). No
  payment collection, no ledger editing, no installment management on the student page — those live
  only on the Financial Account (already the finance-doc direction).
- Multi-year history is a straight read over `Enrollment` ordered by Academic Year.
- Withdrawn/graduated children still show full history; the Financial Account keeps aggregating.

---

## 11. Reporting impact

- Every enrollment-based report gains an **Academic Year filter** (the dimension already exists on
  `Enrollment` and `Charge`). Counts by status (Active/Promoted/Repeated/Graduated/Withdrawn) come
  straight off `EnrollmentStatus`.
- Closed years remain **fully reportable** — closure locks *editing*, not *reading*.
- Cross-year financial reports (outstanding balances, collections) roll up the `Payer` control
  account and already span years via `Charge.academicYearId`.
- Add the per-year enrollment↔academic view (§6) so attendance/performance reports scope by year
  without denormalizing onto Student.

---

## 12. Migration strategy

**No automatic migration of business data.** Structural (additive) migrations only:

1. Add `AcademicYearStatus`; backfill status from `isCurrent`/dates; add single-ACTIVE partial index.
2. Extend `EnrollmentStatus`; one audited UPDATE `COMMITTED→REGISTERED`.
3. Add nullable `Enrollment` columns; **do not** back-move `Student.sectionId` en masse — new
   enrollments write placement to Enrollment; legacy `Student.sectionId` is read as the "current
   section" until the active enrollment supplies it. A background, opt-in backfill can populate
   historical enrollments later.
4. Redefine `StudentStatus` values; backfill derived status from enrollments in a one-off,
   idempotent, audited job.
5. Create `YearEnd*` and optional settlement tables.

Existing students, withdrawn students, and academic years **remain as-is**. Re-enrollment becomes the
**only** path for returning students. Historical ledgers are never touched.

---

## 13. Deletion & Cancel-Admission rules

- **Hard delete allowed only when** `Enrollment.status = DRAFT` **and no dependent records** exist
  (attendance/grades/finance/documents/transport/audit/JoFotara/collections/statements). Otherwise
  **hide Delete**; offer **Withdraw** (post-active) or **Cancel Admission** (pre-active).
- Enforce with `DeletableOnlyIfDraftGuard` + a dependency probe; Students continue to use soft-delete
  (`deletedAt`) so identifiers free up correctly (existing partial-unique behavior).
- **Cancel Admission ≠ Withdrawal:** cancel voids charges / policy-refunds / releases seat *before*
  the student is active; withdrawal closes an *active* enrollment and runs settlement. Both keep all
  audit history.

---

## 14. Rollback strategy

- Every migration is additive and paired with a **down** that drops only the new columns/tables/enum
  values — no data loss on rollback.
- The unified admission ships **behind a feature flag** (existing `FeatureFlag` per-tenant
  mechanism); the two legacy flows stay reachable until the new one is proven, then are removed in a
  later, isolated PR.
- Derived `Student.status` backfill is idempotent and re-runnable; if wrong, re-run after fix.
- Year-End wizard writes through the audited commit path, so a mis-promotion is corrected by
  withdrawing/cancelling the *new* enrollment — history stays intact, nothing is destructively
  undone.

---

## 15. Risk analysis

| Risk | Severity | Mitigation |
|---|---|---|
| `Student.status`/`sectionId` are load-bearing across attendance/finance | **High** | Keep the columns; redefine meaning; single derived writer; no reader rewrite required in phase 1. |
| Two `EnrollmentStatus` lifecycles conflated | High | One unified machine (§4) with a mechanical value remap; no ambiguous states. |
| AcademicYear campus-vs-school scope (§16-A) | High | Decide before coding; default keep-campus + single-ACTIVE index. |
| Silent/accidental promotion | High | Wizard requires explicit per-student decision; `DECIDE_LATER` default; review highlights. |
| Closed-year edits leaking through | Medium | Status-keyed guard + append-only audit + optional DB trigger. |
| Two admission flows drifting during transition | Medium | Feature-flag the unified flow; delete legacy in a dedicated follow-up. |
| Withdrawal settlement policy variance per school | Medium | Policy-driven service over existing ledger ops; no schema lock-in. |
| Similar-name warning mistaken for identity check | Low | Informational only; never blocks; identity is National-ID/MoE exact match only. |

---

## 16. Enterprise architect's critique — five decisions before we code

1. **[A] Academic Year scope — campus or school?** Spec says "one Active per school"; the model is
   per-campus. **My recommendation: keep per-campus, enforce single-ACTIVE per campus**, and read
   "school" as the operating campus. Overriding to school-scoped is cleaner on paper but breaks
   multi-campus operators with staggered calendars. **Need your call.**

2. **[B] One status machine, not two.** Merge the admission enum
   (`QUOTED…CANCELLED`) and the participation enum
   (`Draft…Archived`) into a single Enrollment lifecycle (§4). Avoids a second status column and the
   "which status is authoritative?" bug class. **I recommend yes.**

3. **[C] One commit path for admission = re-enrollment = promotion = repeat.** All four are "create
   the next Enrollment + its ledger for this person." Route them through the existing
   `RegistrationCommitService`, and fold the family MERGE/SEPARATE/NEW_PLAN wizard into it as a
   *mode*. Biggest long-term maintainability win. **I recommend yes.**

4. **[D] Demote `Student.status` to a derived read-model and move placement to Enrollment.** This is
   what actually makes the spec's "the Student never becomes Withdrawn/Graduated" true, instead of
   just asserting it. Keep the column for compatibility; stop hand-writing it; academic words live on
   `EnrollmentStatus` only. **I recommend yes** — but it touches many readers, so it's a decision.

5. **[E] Rename "Family" → "Financial Account" everywhere in this work** (routes, UI, DTOs, i18n),
   consistent with the already-approved finance direction. The payer may be a company / sponsor /
   government / divorced parents — "Family Admission" bakes in the assumption we're removing. Do it
   now while the surface is small. **I recommend yes.**

---

## 17. Recommended implementation order (only after §16 is answered)

1. **Academic Year status machine** — enum, single-ACTIVE index, closure lock guard. (Foundational;
   everything gates on the year.)
2. **Unified `EnrollmentStatus` + Enrollment fields** — enum extension, `COMMITTED→REGISTERED` remap,
   new nullable columns.
3. **`EnrollmentLifecycleService` + derived `Student.status`** — single writer, audited transitions.
4. **`StudentIdentityService.lookupByIdentifier` + unified Admission (A/B/C)** — behind a feature
   flag; similar-name warning; collapse the two flows.
5. **Re-enrollment through the shared commit path.**
6. **Year-End Processing wizard** — `YearEnd*` models, review board, promote/repeat/graduate/withdraw
   via the shared path.
7. **Withdrawal settlement + Cancel Admission** — orchestration over the existing ledger.
8. **Deletion guard + student profile read-only finance + Enrollment History UI.**
9. **Reporting: Academic-Year filter + per-year view.**
10. **Retire legacy admission flow; remove the feature flag.**

Each step is independently shippable, additive, reversible, and audited. No step redesigns the
ledger or migrates business data automatically.

---

**Awaiting approval and answers to the five decision points in §16 before writing any code or schema.**
