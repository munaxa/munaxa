# Munaxa Finance — Collections & Payment Operational Workflow

This document describes the **operational workflow** for finance officers. It is a workflow/UX
layer over the existing Finance Domain — **the ledger, payment plans, installments, allocation and
collections tables are unchanged**. Nothing here is an accounting redesign.

## Principle

The daily job of a school finance officer is **collecting overdue balances while keeping the
existing agreement** — not replacing payment plans. The software must make that the path of least
resistance:

- **Normal:** record a payment (any amount), which auto-allocates via the Allocation Policy across
  the open installments of the existing plan; record a promise-to-pay; log a call; send a reminder.
- **Exceptional:** replace the payment plan — only for hardship, scholarship, recalculation,
  transfer, school-approved renegotiation, or an administrative correction.

## Real-world flow (the default)

1. Student enrolled → charges created → payment plan created → parent signs.
2. Installments become due; a parent misses one or more.
3. Finance officer contacts the parent (logged in the **Communication Log**).
4. Officer optionally records a **Promise to Pay** (amount + expected date).
5. Parent pays one/multiple/partial installments → **payment is auto-allocated** (FIFO by due date)
   — **the original plan is unchanged.**

The plan is **never** replaced as part of this flow.

## What is reused (no changes)

| Concern | Reused component |
|---|---|
| Record payment (any amount) + automatic allocation | `PaymentService` + `allocation-policy` (FIFO) |
| Outstanding / overdue / oldest-due / days-overdue | `CollectionsService.snapshot` (over the ledger) |
| Aging buckets, reminders (in-app/SMS/email), transport evaluate/suspend | `CollectionsService` |
| Collections case / promise / dunning event tables | `CollectionsCase` · `PromiseToPay` · `DunningEvent` |
| Payment plans / installments / ledger | untouched |

## What was added (this change)

### Promise to Pay (new API + UI)
Records a parent's commitment under the account's `CollectionsCase` (auto-opened), moves the case to
`PROMISE_TO_PAY`, logs a `PROMISE` dunning event, and audits it.

- `POST /finance/collections/students/:studentId/promises` — `{ amount, promiseBy, note? }`
- `GET  /finance/collections/students/:studentId/promises` — with a derived status
  (`OPEN` · `OVERDUE` · `KEPT` · `BROKEN`)
- `POST /finance/collections/promises/:promiseId/resolve` — `{ kept: boolean }`

Promises also appear on the enriched collections profile (`GET /finance/collections/students/:id`).

### Communication Log (new API + UI)
Logs a parent contact as a `COMMUNICATION` dunning event — timestamped and audited.

- `POST /finance/collections/students/:studentId/communications` — `{ medium, note }` where
  `medium ∈ { PHONE, WHATSAPP, SMS, EMAIL, MEETING, NOTE }`
- `GET  /finance/collections/students/:studentId/communications`

Schema: one additive, nullable column `DunningEvent.medium` + a `CommunicationMedium` enum and a
`COMMUNICATION` `DunningEventType` value (migration `20260704120000_collections_communication_log`).
No ledger/plan/data-migration changes.

### Replace Plan → exceptional administrative action
`POST /finance/charges/:chargeId/plan` accepts an optional `reason`. When an active plan already
exists the write is audited as **`finance.plan.replace`** (with `reason`, `replaced: true`,
`supersededCount`); a first plan is `finance.plan.create`. The previous plan is superseded and the
new plan is scheduled for the **outstanding balance only** (existing behaviour, retained).

In the **Student Finance** UI, Replace Plan is removed from the primary action row and placed under a
per-charge **Advanced actions** disclosure, which requires a reason and a confirmation dialog.

## Enriched collections profile

`GET /finance/collections/students/:studentId` now returns, in one payload:
`collectionsStatus`, `snapshot` (outstanding · overdue · overdueCount · oldestOverdueDays), the
transport suspension state, reminder history, **promises** (with status), and the
**communications** log.

## Deferred (follow-up PRs — not required for the core reframing)

- Full Student Finance primary-action bar (Record Payment · Promise · Reminder · Log Communication ·
  Discount · Credit · Suspend/Reinstate Transport · Statement · Invoice) and the promise/comm panels.
- Operational Finance **dashboard** (promises due today · missed promises · suspensions · workload).
- **Reminder levels** (friendly / overdue / final / transport-warning / suspension-notice).
- **Transport policy** expansion (suspend after N days or amount, not only N installments) and the
  reason / suspended-by / reinstated-date fields.
