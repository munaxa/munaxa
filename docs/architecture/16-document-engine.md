# 16 — Enterprise Document Engine (Phase 23)

A reusable engine that generates every official school document — **Admissions** documents
(Registration Agreement) and **Finance** documents (receipts, certificates, statements) — from a
**permanent snapshot**, stores the rendered PDF **immutably**, and **archives + audits** every
generation, print, download and email. It is an _enhancement_: it **consumes** the existing Billing
Ledger / Statement / Organization data and never creates or duplicates a financial record.

> Admissions documents and Finance documents are separated, the way enterprise ERPs do it. The
> Registration Agreement is a **legal commitment**, not a receipt; receipts live entirely in Finance
> and are independent of Admissions.

## Where it lives

- **Backend:** `apps/api/src/documents/`
  - `pdf/document-layout.ts` — declarative layout types (no hardcoded layouts; templates emit data).
  - `pdf/pdf-renderer.ts` — pdfkit renderer for the declarative layout (header/fields/table/totals/
    signatures/footer). Lazily imports pdfkit.
  - `branding.service.ts` — resolves school branding from `OrganizationSettings` (Part 7).
  - `document-engine.service.ts` — the reusable core: collect → merge-branding → render → archive.
  - `document.repository.ts` — gapless numbering, immutable archive, print/download/email logging,
    context reads, registration-agreement versioning.
  - `templates/` — pure functions mapping collected data → a `DocumentLayout` (+ `tuition-calc.ts`).
  - `finance-documents.service.ts` — collectors for each finance document type.
  - `registration-agreement.service.ts` — snapshot + versioned agreement generation.
  - `documents.service.ts` / `documents.controller.ts` / `documents.dto.ts` — orchestration + API.
- **Frontend:** `apps/admin/.../students/[studentId]/tabs/documents-section.tsx` (Student Finance
  Card → Documents) + `apps/admin/src/lib/documents.ts` (API client).
- **Schema:** `prisma/schema.prisma` + migration `20260628140000_document_engine`.

## Data model (additive, RLS-isolated)

| Model | Purpose |
|-------|---------|
| `GeneratedDocument` | Immutable archived document. PDF stored in `pdf` (bytea) + `checksum` (sha256) + `byteSize`. Tracks `printedCount`/`lastPrintedAt`, `version`, `status` (ARCHIVED/SUPERSEDED/CANCELLED) and the `dataSnapshot` it was built from. |
| `RegistrationAgreement` | The legal commitment. Versioned (`version`, `supersedesId`), with a permanent `feeBreakdown` + `installmentSchedule` + `grandTotal` snapshot; links to its `GeneratedDocument`. |
| `DocumentSequence` | Gapless per-tenant, per-scope counter (`AGREEMENT`, `DOC:<type>`) — same row-locked pattern as `FinanceReceiptCounter` / the JoFotara ICV. |

> The archive model is named `GeneratedDocument` (not `Document`) because a `Document` model already
> exists for parent-portal shared uploads.

PDFs are stored in Postgres so reprints always serve the **exact stored snapshot** (not a re-render)
and the flow works in every environment (no object-storage dependency). A `fileKey` offload to S3 can
be added later without changing the API.

## Workflows

### Admissions (Part 1)
`Review → Commit Registration → (Student/Parent/Enrollment/Ledger/Charges/Installments/Audit) →
Registration Completed → **auto-generate Registration Agreement** → print (optional) → Open Finance`

The agreement is generated automatically right after a successful **COMMITTED** commit
(`AdmissionsService.commit`), and on approval of a held (fee-modified) enrollment
(`AdmissionsService.approve`). Generation is best-effort and never blocks/fails the registration.

**Versioning:** a fee change after commitment creates **version N+1** and **archives** the prior
version (its document is marked `SUPERSEDED`). Agreements are never overwritten; full history is kept.

### Finance (Part 2)
`Receive → Verify → Allocate → Update Ledger → Generate Receipt → Print → Email`. Receipt generation
is fully independent of Admissions and is driven from the existing verified `Transaction` + ledger.

## Document types (Parts 3 & 6)

`REGISTRATION_AGREEMENT`, `PAYMENT_RECEIPT`, `ANNUAL_TUITION_CERTIFICATE`,
`OUTSTANDING_BALANCE_CERTIFICATE`, `CLEARANCE_CERTIFICATE`, `ACCOUNT_STATEMENT`, `PAYMENT_HISTORY`,
`FEE_BREAKDOWN`, `STUDENT_FINANCIAL_SUMMARY`. New types = a new enum value + a new template function.

### Annual Tuition Certificate
Computed automatically from the ledger — no manual typing. The registrar selects an **academic year**,
a **language** (EN / AR / BILINGUAL) and optional categories (transport, registration, books, …);
tuition is always included. Money actually paid (ledger) is attributed across the selected categories
in a deterministic priority order (tuition first), capped at each category's net charge
(`templates/tuition-calc.ts`). Wording is generic and tenant-configurable — there is **no hardcoded
reference to any country's tax authority**, so it localizes beyond Jordan.

## Security & audit (Part 8)
- All documents inherit **tenant isolation** (RLS `FORCE ROW LEVEL SECURITY`, `app_current_tenant()`).
- Stored PDFs are **immutable snapshots** (checksummed).
- Every **generate / print / download / email** writes an `AuditLog` entry.

## Permissions
- `document:read` — view/list/download/reprint archived documents.
- `document:generate` — generate official documents and email them.

Granted to `FinanceOfficer`, `Accountant`, `Registrar` (both) and `Principal` (read); `SchoolAdmin`
has all permissions.

## API (`/api/v1/documents`)
| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| GET | `/documents` | `document:read` | List the archive (by student/type/enrollment). |
| GET | `/documents/academic-years` | `document:read` | Years for the tuition-certificate picker. |
| POST | `/documents/generate` | `document:generate` | Generate & archive a finance document. |
| GET | `/documents/agreements` | `document:read` | List registration agreements (all versions). |
| POST | `/documents/agreements` | `document:generate` | (Re)generate an agreement (new version). |
| GET | `/documents/:id` | `document:read` | Document metadata. |
| GET | `/documents/:id/download` | `document:read` | Download the stored PDF (audited). |
| POST | `/documents/:id/print` | `document:read` | Reprint (increments counter; audited). |
| POST | `/documents/:id/email` | `document:generate` | Email the PDF as an attachment (audited). |

## Arabic rendering
pdfkit ships Latin-only fonts. AR/BILINGUAL labels are wired through the data layer; to render Arabic
glyphs, configure an Arabic-capable TTF via `PDF_ARABIC_FONT_PATH` (the renderer embeds it). Without
it, the standard font is used.

## Tests
- `apps/api/src/documents/**/*.spec.ts` — tuition allocation, template utils, and real PDF rendering.
- `apps/api/test/documents.e2e-spec.ts` — generate/archive/download/reprint/audit/RBAC against Postgres.
