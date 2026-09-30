# ADR-0002 — Munaxa ecosystem boundaries: independent products, one shared foundation

**Status:** Accepted · **Proposed:** 2026-09-29 · **Accepted:** 2026-09-30 · **Scope:** `munaxa`, `munaxa-platform`, `munaxa-docs`,
`munaxa-work`, `munaxa-school`, `munaxa-identity`
**For:** whoever decides production infrastructure, product engineering leads, and anyone about to
add a cross-product dependency.

This is the authoritative architecture decision for how the Munaxa products relate to each other and
to `@munaxa/platform`. It changes no application code. Every "current state" statement below comes
from the repositories as they stood when it was written (2026-09-29), with the file named. It sits
beside [ADR-0001](./0001-munaxa-identity-is-a-sixth-peer-product.md), merged the same day, and governs
alongside [`PLATFORM_ENGINEERING_STANDARDS.md`](../../PLATFORM_ENGINEERING_STANDARDS.md), whose §2–§4
it applies rather than amends. Like every ADR it is immutable once accepted: supersede it, do not
edit its decisions.

---

## 1. Decision in one paragraph

Munaxa is a **family of independently sellable, independently deployable products**: Docs (EDMS),
Work (HCM) and School (School OS). Each owns its domain, database, tenants, users, permissions,
deployment and release cycle. `@munaxa/platform` is a **library**, not a service: design system plus
stateless technical primitives, consumed at build time, never called at runtime. Anything
ecosystem-wide that holds state (a customer registry, entitlements, billing, a common identity) is a
**future, optional control plane**. A product may *read from* it, but it must never *need* it in order
to sign a user in or serve a request.

### 1.1 Binding decisions

These are accepted. Changing any of them requires a superseding ADR.

1. Docs, Work and School are **independently sellable**.
2. Docs, Work and School are **independently deployable**.
3. Each product owns its own business domain, database(s), tenant model, users, permissions and
   release cycle.
4. No product imports another product.
5. No product reads another product's database.
6. No product requires another product in order to operate.
7. `@munaxa/platform` is a **build-time library**, not a runtime service.
8. Platform contains the shared design system and approved stateless technical/security primitives.
9. No business-domain logic moves into Platform.
10. A future Munaxa control plane is optional and is **never on a product's sign-in or request path**.
11. Future cross-product integrations use published APIs, webhooks or signed artifacts, and remain
    optional.
12. Product databases remain separate.
13. Product authentication remains independent for now. Munaxa Identity is Work's authentication
    service and ships inside the Work deployment/purchase unit; Docs and School are not required to use
    it ([ADR-0001](./0001-munaxa-identity-is-a-sixth-peer-product.md)). A common identity needs its own
    ADR.
14. Session cookies are **host-only** (no `Domain=.munaxa.com`). This is mandatory.
15. Target product hostnames are `docs.munaxa.com`, `work.munaxa.com` and `school.munaxa.com`.
16. `www.munaxa.com` remains the corporate site.

---

## 2. Ecosystem diagram

```text
                        BUILD TIME ONLY (npm packages from GitHub Packages)
                 ┌──────────────────────────────────────────────────────────────┐
                 │  @munaxa/platform  — tokens · themes · typography · icons ·   │
                 │  ui · brand · utils · security libraries (auth, rbac, crypto…)│
                 │  no database · no endpoint · no product vocabulary            │
                 └───────┬───────────────┬───────────────┬───────────────┬──────┘
                         │               │               │               │
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ RUNTIME ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─
                         ▼               ▼               ▼               ▼
   docs.munaxa.com  ┌─────────┐   work.munaxa.com  ┌──────────────────┐   school.munaxa.com
                    │  DOCS   │                    │ WORK  ◄─ Identity│   ┌─────────┐
                    │ web·api │                    │ admin·api  (auth)│   │ SCHOOL  │
                    │ worker  │                    │ front door       │   │admin·api│
                    ├─────────┤                    ├──────────────────┤   ├─────────┤
                    │ own DBs │                    │ Work DB │ Id DB  │   │ own DB  │
                    │ (1/tenant)                   │                  │   │ (pool + │
                    │ own S3  │                    │                  │   │  silo)  │
                    └─────────┘                    └──────────────────┘   └─────────┘
                         ▲                                ▲                    ▲
                         └───────── optional, later ──────┴────────────────────┘
                              Munaxa control plane (NOT BUILT)
                    customer registry · catalogue · entitlements · billing ·
                    provisioning · optional common identity
                    — pushes configuration to products; never on the request path —

   www.munaxa.com  →  munaxa (corporate site) — marketing only, no product dependency
```

No arrow runs between products. That is the whole architecture.

---

## 3. What is actually shared today

Established by reading each repository's `package.json` files and its source imports.

| Consumer | `@munaxa/*` it depends on | What it actually imports in source |
| --- | --- | --- |
| Docs | `ui`, `icons`, `theme`, `tokens`, `platform`, `config-eslint`, `config-typescript` | `@munaxa/ui` (74 sites), `@munaxa/icons` (17). **No security package.** |
| Work | `ui`, `theme`, `platform`, `auth`, `crypto`, configs | `@munaxa/ui` (91), `@munaxa/auth` and `@munaxa/crypto` (1 file: `apps/api/src/identity/authentication-port.ts`, token verification) |
| School | `ui`, `theme`, `tokens`, `platform`, configs | `@munaxa/ui` (119). **No security package.** |
| Identity | `@munaxa/*` security platform | auth, session, rbac, crypto, audit… as the implementation of its service |
| Corporate | `@munaxa/*` design system, configs | the brand and UI |

What is **not** shared today, and must not be read as shared:

- **No shared database.** Docs, Work, School and Identity each have their own Prisma schema and migrations.
- **No shared tenant.** There are four tenant concepts: a Docs tenant (slug → placement via
  `TenantRegistry`), a School `Tenant` row, a Work `tenant_membership`, and an Identity *organisation*.
  Identity's `ARCHITECTURE.md` states that its organisation and the Work tenant are "deliberately not the
  same identifier" and are mapped operationally.
- **No shared authentication.** Three implementations are live (§7).
- **No shared runtime service.** No product calls another product. Identity is called only by Work.
- **No product-to-product import.** Docs, Work and School each run a CI `boundaries` job enforcing
  `PLATFORM_ENGINEERING_STANDARDS.md` §4.

---

## 4. Boundary A: `@munaxa/platform`

**Definition.** Code that is true for every Munaxa product regardless of the business it serves, shipped
as versioned npm packages and consumed at build time. It has no database, no endpoint, no deployment of
its own (Storybook excepted) and no product vocabulary. This restates what `munaxa-platform/README.md`
and `PLATFORM_ENGINEERING_STANDARDS.md` §2–§4 already say. This ADR confirms it and adds nothing.

| Belongs in Platform | Where it is today |
| --- | --- |
| Design tokens: colour roles, spacing, radius, shadow, z-index, motion | `@munaxa/tokens` |
| Colour palettes and per-product themes (`docs`, `work`, `school`, `group`) | `@munaxa/theme`, `packages/platform/themes/*` |
| Typography: scale and font stacks | `@munaxa/typography` |
| Icons | `@munaxa/icons` |
| Shared UI: primitives, patterns, layouts, app shell, charts, date UI, hooks | `@munaxa/ui` |
| Brand registry, logos, product lockups | `packages/platform/brand`, `assets/<product>` |
| Framework-agnostic helpers (`cn`, …) | `@munaxa/utils` |
| Lint and TypeScript bases | `@munaxa/config-eslint`, `@munaxa/config-typescript` |
| Stateless security **libraries**: hashing, signing, token format, RBAC resolution, session lifecycle logic, CSRF, rate limiting, audit chaining, typed config | `@munaxa/auth`, `rbac`, `session`, `security`, `audit`, `crypto`, `cache`, `logging`, `notifications`, `config`, `interfaces`, `types` |

| Never belongs in Platform | Why |
| --- | --- |
| Business logic of any product (documents, workflows, payroll, timetables…) | Law 1: the platform never learns about a product |
| A database, a table, a migration, a driver | Platform "never migrates a schema, never owns a table" (security-platform docs) |
| A running service: auth server, tenant registry, billing API | A service has state and a deployment. That makes it a product (Identity) or the control plane (§9) |
| A product's permission catalogue or role vocabulary | Work ADR-0076: the product owns the vocabulary, Platform owns the mechanism |
| Tenant resolution, entitlement checks, subscription status | Product state, product decision |
| A product switcher that *requires* another product to exist | Cross-product navigation is a presentation option, never a dependency |

**Rule for growth (unchanged):** something moves into Platform only on the **second real consumer**
(§3 of the standards). Docs being first to production gives Docs no special claim on the shared layer.

---

## 5. Boundaries B–D: the products

Each product owns everything in its row. Nothing listed may be moved to Platform, merged with another
product's equivalent, or served to another product by direct database access.

### B. Munaxa Docs (`munaxa-docs`, EDMS)

Owned (all present in `apps/api/src/modules/*`, `prisma/`, `infra/`):

- **Documents**: controlled record, business metadata, folders and libraries, favourites, recents,
  duplicate detection, templates (`document`, `library`)
- **Revisions**: check-out/in, publish/supersede, restore, compare (`revision`)
- **Numbering**: rules, sequences, reservations, gapless mode
- **Workflow**: approval engine, routing, deadlines, escalation, delegation (`workflow`, `identity`)
- **Storage**: content-addressed blobs, per-tenant prefixes, antivirus gate, integrity sweep (`storage`)
- **Preview and OCR**: renderer registry, watermarking, print control (`preview`)
- **Search**: per-tenant PostgreSQL index, ACL-filtered (`search`)
- **Permissions**: role catalogue plus hierarchical ACL with deny precedence (ADR-0005, 0016)
- **Audit**: hash-chained trail, signed checkpoints, evidence bundles (`audit`)
- **Retention**: soft delete, recycle bin, legal hold, purge, tombstones (`retention`)
- **Signatures**: Part 11 witnessed attestation (ADR-0017)
- **Notifications, reporting, dashboard, bulk operations, integrations** (webhooks, SIEM, API keys)
- **Identity for Docs**: users, roles, refresh families, TOTP MFA, OIDC federation, API clients (`identity`)
- **Tenancy**: `TenantRegistry`, one database, storage location and search index per tenant (ADR-0015)
- **Commerce design**: plans, entitlements and usage (doc 21, ADR-0012). This is designed for Docs, not built.

### C. Munaxa Work (`munaxa-work`, HCM)

Owned (the `packages/modules/*` registry in `docs/DOMAIN_OWNERSHIP.md`): `identity` (workforce user,
tenant membership, invitations, portal access), `organization`, `people`, `employment`, `recruitment`,
`onboarding`, `attendance`, `leave`, `compensation`, `payroll`, `performance`, `learning`, `career`,
`workflow`, `relations`, `assets`, `letters` and **`documents`** (HR documents as records: types,
versions, verification). Also owned: the 285-permission catalogue (ADR-0076), tenant isolation with RLS
(ADR-0030/0032/0033), country packs, and the admin, employee, manager and mobile clients.

Work's `documents` module is **not** Munaxa Docs and must not become a dependency on it. An employee's
contract being stored in Docs is a *future integration* between two products that are both present
(§9.3). It is never a prerequisite for Work.

**Work's authentication belongs to Munaxa Identity** ([ADR-0001](./0001-munaxa-identity-is-a-sixth-peer-product.md),
merged in `e173217`, PR #263). Work holds no credential and verifies RS256
tokens with a configured public key.

### D. Munaxa School (`munaxa-school`, School OS)

Owned (`apps/api/src/*`): school structure, academic year, enrollment and exits, people (students,
guardians, teachers and staff, including a teacher-as-employee HR slice), scheduling and timetable,
attendance and presence, academics, finance, e-invoicing, cards, communication, parent and student
portals, reporting, year-end, School's `documents` engine, events, webhooks, the School RBAC matrix, the
mobile apps, `landing/` and `munaxademo/`.

School also owns **its own commercial plane**: `subscription` (plans, pricing, usage, read-only state),
`feature-flags`, `billing`, and the "Platform Console" (`/platform/console/*`, `docs/PLATFORM_CONSOLE.md`)
used by Munaxa staff to manage schools. That is a *School* control plane. It is not the Munaxa control
plane, and nothing outside School may depend on it (risk R3).

School's teacher-as-employee HR slice overlaps Work's domain by design. Per §6 of the standards
("never unify across products"), it stays in School. A school that also buys Work integrates the two
later (§9.3). It does not consolidate them.

---

## 6. Independent product model

Every product is one **deployment unit** with the same shape:

| Property | Docs | Work | School |
| --- | --- | --- | --- |
| Public origin (target) | `docs.munaxa.com` | `work.munaxa.com` | `school.munaxa.com` |
| Deployment unit | web + api (+ worker) | front door + admin + api + **Identity** | admin + api (+ mobile) |
| Release cycle | own tags, own CI (7 required checks) | own | own |
| Product data | Postgres, **one database per tenant**, own object store, own search index | own Postgres (Work) + own Postgres (Identity) | own Postgres, pooled with opt-in silo (`03b-tenant-database-routing.md`) |
| Tenant | Docs tenant (slug → placement) | Work tenant + Identity organisation | School `Tenant` |
| Users and permissions | Docs `user`, roles, ACL | Identity account → Work `workforce_user`/membership, Work catalogue | School `User`, RBAC matrix |
| Sold as | Docs subscription | Work subscription | School subscription |
| Needs another product? | **No** | **No** (Identity ships *inside* the Work unit) | **No** |

**Consequence for Work.** Until Identity serves a second product, it is operationally part of the Work
deployment unit: a Work-only customer gets Work and Identity, and nothing from Docs or School. That meets
the independence rule. Identity is a separate *repository and service*, but it is not a separate
*purchase*.

---

## 7. Authentication, as it is today

| | Docs | Work | School |
| --- | --- | --- | --- |
| Credential store | Docs DB (`user`, credentials) | Identity DB | School DB (`User`) |
| Token issuer | Docs API, HS256 (`JWT_ACCESS_SECRET`, issuer `https://docs.munaxa.com`) | Identity, RS256; Work verifies with a public key | School API, HS256 (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`) |
| Login fields | tenant, email, password (+ TOTP) | email, password, organisation (when required) | tenant, email/username, password |
| Tenant at sign-in | explicit field, else leftmost host label (`auth.controller.ts:tenantFromHost`) | Identity organisation → token; Work resolves tenant from `tenant_membership`, ignores `tid` | tenant field; blank = platform staff |
| Session cookies | web-owned `edms_at`/`edms_rt`, httpOnly, **host-only** | `__Host-mx_session`, host-only, one origin via front door (Identity ADR-0004) | admin-owned |
| MFA | TOTP live | not wired (Identity ADR-0003, production blocker for Work) | per School docs |
| Federation | OIDC (Entra ID, Google) live | modelled, not wired | Firebase UID |

**Does it support the target UX?**

- `docs.munaxa.com → tenant → username/password → Docs`: **yes, today.** No dependency outside Docs.
- `work.munaxa.com → tenant → username/password → Work`: **yes, once Identity is deployed in the Work unit.**
  This is the Render staging topology in `munaxa-identity/deploy/RENDER.md`. The "tenant" the user types
  is Identity's *organisation*.
- `school.munaxa.com → tenant → username/password → School`: **functionally yes**, but School's
  deployment currently uses `app.munaxa.com`/`admin.munaxa.com` (`render.yaml`, `PLATFORM_CONSOLE.md`).
  That is a hostname decision, not an auth change.

**Cookie isolation is already correct.** Every product sets host-only cookies (no `Domain=.munaxa.com`),
so a session on `docs.munaxa.com` is never sent to `work.munaxa.com`. Keep it that way. A shared parent-
domain cookie would couple the products' security and is ruled out by Identity ADR-0004.

**Not redesigned here.** The three implementations stay. A common Munaxa identity is an optional future
capability (§9.2).

---

## 8. Tenant model

```text
Customer A (Docs only)        Customer B (Work only)          Customer C (Docs + Work)
  └─ Docs tenant "acme"         └─ Identity org "beta"          ├─ Docs tenant "gamma"
       ├─ Docs users                 └─ Work tenant               │    └─ Docs users, Docs data
       └─ Docs data (own DB)             ├─ Work users            └─ Identity org "gamma"
                                         └─ Work data                  └─ Work tenant, users, data
```

- **A tenant is a product concept.** Each product creates, isolates, backs up and deletes its own
  tenants. No product reads another product's tenant table.
- **Customer C has two tenants and, today, two accounts per person.** This is acceptable and expected
  until a common identity exists. Nothing is merged to avoid it.
- **The product databases are not merged.** No current requirement calls for it. Docs has committed to
  the opposite (a database per tenant, ADR-0015), and Work's and School's RLS models are each
  load-bearing inside their own schema.

| Can eventually be shared (by reference, through a control plane) | Stays product-specific |
| --- | --- |
| **Customer / organisation identity**: an opaque `customer_id` a product may *record* against its tenant | Tenant ID, tenant placement, tenant settings |
| **Tenant slug convention** (one human-readable handle per customer across products) | Users, roles, memberships, ACLs, delegations |
| Subscription status and entitlements, *pushed into* the product | Permission vocabularies (Docs keys, Work's 285, School's matrix) |
| Optional: a person's login account (common identity, §9.2) | All business data, audit trails, retention, storage |
| Brand, theme, UI (already shared through Platform) | Encryption keys, signing keys, audit checkpoint secrets |

**One additive, zero-cost step is recommended now:** when a tenant is provisioned in any product, record
an optional, nullable, opaque external customer reference beside it. Docs's `TenantRegistry` catalogue
entries can carry it without a schema change. This gives a future control plane something to join on,
and it is never an authorisation input.

---

## 9. Future common Munaxa services (not built, not required)

### 9.1 Control plane candidates

| Capability | What it would own | Existing in-product precursor |
| --- | --- | --- |
| Customer/organisation registry | Who the customer is, contacts, contracts | none (Identity has organisations for Work only) |
| Product catalogue | Products, editions, plans | Docs doc 21 `Plan`; School `subscription` |
| Entitlement | Which products and features a customer bought | Docs ADR-0012 (designed); School `plan-feature.guard` |
| Subscription status | Trial, active, past-due, suspended | Docs doc 21 §2; School `read-only-state.guard` |
| Tenant provisioning | "Create a Docs tenant for customer X" | Docs `provisioning.service.ts`, School `tenant-provisioning` |
| Licensing | Offline licence files for dedicated/on-prem | none |
| Billing | Invoices, payment provider | Docs `BillingPort` (designed); School `billing` |
| Customer administration | Munaxa staff console across products | School "Platform Console" (School-only) |

**Non-negotiable rules for any of these, whenever they are built:**

1. **Push, don't pull on the request path.** The control plane writes entitlements and status *into*
   each product, through that product's own provisioning/entitlement API or a signed file. A product
   enforces from its local copy. A control-plane outage must not stop sign-in or reads. This matches
   Docs doc 21 §6: "a provider outage must never open or close features".
2. **Every product has a standalone mode.** With no control plane configured, entitlements come from
   local configuration. That is exactly how an on-prem Docs install works today (`DEPLOYMENT_PROFILE=ON_PREMISE`).
3. **The control plane never reads product business data.** It knows customers, products and
   tenants by reference. It never knows documents, employees or students.
4. **It is its own repository and deployment**, a peer like Identity, never a Platform package.

### 9.2 Optional common identity

If Munaxa later wants one login across products, `munaxa-identity` is the existing candidate. Its
corporate ADR-0001 explicitly does **not** oblige Docs or School to migrate, and says consolidation
needs its own ADR. The preconditions below are recorded so that nobody has to rediscover them:

- An authorisation-code/OIDC issuer surface in Identity. Today it has none: host-only cookies plus a
  path-based front door is its cross-service mechanism (ADR-0004), and that does not span
  `docs.munaxa.com` ↔ `work.munaxa.com`.
- Docs already supports **OIDC federation** as a client. So the least invasive future path is: Identity
  becomes an OIDC provider, and a Docs tenant *optionally* federates to it, exactly as it would to Entra
  ID. Docs keeps local accounts for standalone customers. No Docs rewrite is needed.
- MFA wired in Identity (ADR-0003).
- Per-product permission namespaces (the `work:` pattern of Work ADR-0076), with each product still
  owning its vocabulary and its tenant membership.

### 9.3 Product-to-product integration (when a customer owns two)

Only through published APIs, webhooks or signed artifacts, and switched on per tenant. Never a shared
database, a shared queue topic that one product depends on, or an import. Examples: Work files an
employee contract into a Docs library over the Docs API with a Docs API key (ADR-0018); School HR
pushes staff records into Work. Each integration is optional, and each side keeps working when the
other is absent.

---

## 10. Shared vs isolated infrastructure

The goal is independence with sensible pooling, not maximum sharing. "Shared" below means the
*operator* may run one instance for several products **in Munaxa-hosted SaaS**. It never means one
product depends on another's.

| Resource | Eventually shareable | Must stay isolated | Rationale |
| --- | --- | --- | --- |
| **Compute** | Same cluster/account/provider, same node pools | Separate services, deployments, scaling and rollouts per product | Cost pooling; independent releases |
| **Databases** | Same managed Postgres *server/cluster* for cost | **Separate databases** per product, separate roles; Docs one DB per tenant | Backup, restore, migration and DPA scope are per product (and per Docs tenant) |
| **Redis** | One managed instance with per-product logical DB/ACL user/key prefix, *or* separate | Separate if a product's lockout or rate limiting must not be starved by another's load | Identity's `ARCHITECTURE.md`: lockout and rate limiting degrade without Redis. Separate instances are the default for Docs production |
| **Object storage** | Same provider account | **Separate buckets per product**; Docs per-tenant prefixes (or buckets) | Blast radius, lifecycle rules, customer-specific residency |
| **Antivirus** | One ClamAV service can serve several products (stateless scanner) | Nothing sensitive persists in it; network access limited to the callers | Cost, and signature updates maintained once |
| **Queues** | Same broker technology | Separate queues/namespaces per product; no cross-product topics | A product must not stall on another's backlog |
| **Secrets** | Same secret-manager service | **Separate paths and access policies per product**; never a shared signing key | Docs ADR-0020: one key per purpose |
| **Monitoring / logging** | One observability stack, per-product dashboards and alerts | Tenant IDs never as metric labels (Docs Phase 18 rule) | Ops efficiency |
| **DNS** | One `munaxa.com` zone | One subdomain per product; no parent-domain cookies | Cookie and CSP isolation |
| **CI/CD** | Shared reusable workflows and runners | Per-repo pipelines, required checks and release tags | Independent release cycles |
| **Container registry** | One registry (GHCR `munaxa` org) | Separate image names per product; immutable digests | Work and Identity already publish to GHCR; Docs does not yet (R7) |
| **Package registry** | GitHub Packages for `@munaxa/*` | At **build time only**; runtime images must not need it | On-prem customers must not need Munaxa's registry token |

---

## 11. Deployment models

The same images serve all three models. The differences are configuration, not code. Docs already
works this way (`20-deployment-architecture.md` §2: `DEPLOYMENT_PROFILE` read only by the registry and
boot validation).

| | 1. Munaxa-hosted SaaS | 2. Dedicated customer cloud | 3. Customer on-premises |
| --- | --- | --- | --- |
| Who runs it | Munaxa | Munaxa or customer, in the customer's cloud account | Customer |
| Products present | Only the ones purchased | Only the ones purchased | Only the ones purchased |
| Tenancy | Many tenants per product | Usually one tenant per product | One tenant per product |
| Docs | `CLOUD`, tenant catalogue, DB per tenant | `CLOUD` or `ON_PREMISE`, one tenant | `ON_PREMISE`, one DB, local/MinIO storage, SMTP |
| Work | Work + Identity unit; pooled DB with RLS | same unit, dedicated DBs | same unit; Identity bundled |
| School | pooled DB, opt-in silo | silo DB | silo DB (`TENANT_DATABASE_OVERRIDES`) |
| Control plane | Optional; pushes entitlements | Optional or absent; licence file | **Absent**; licence file / local config |
| Shared infra (§10) | Pooled across products | Not pooled across customers | None |
| Artifacts delivered | — | Images by digest + migration tooling | Images by digest + migration tooling (no source, no registry token) |

---

## 12. Current state vs target state

| Area | Current | Target | Gap |
| --- | --- | --- | --- |
| Platform scope | Design system + security libraries, no state | Same | None |
| Product independence | No product imports another; CI enforces | Same | None |
| Docs standalone | Own auth, tenants, DB per tenant, on-prem profile | Same | Hostname/tenant UX (R1), image publishing (R7) |
| Work standalone | Needs Identity; staged on Render with Identity | Work + Identity as one purchasable unit | Merge corporate ADR-0001; MFA in Identity |
| School standalone | Own auth and commerce; on `app.`/`admin.munaxa.com` | `school.munaxa.com` | Hostname migration (R2) |
| Tenant concepts | Four unrelated identifiers | Four, plus optional external customer reference | Additive field only |
| Auth | Three implementations | Three; optional common identity later | None now |
| Commercial plane | Designed in Docs, built in School, Work none | Local enforcement in each; optional central control plane later | Keep School console School-only (R3) |
| Ecosystem ADRs | Identity ADR-0001 on an unmerged branch | Merged, with this document alongside | Done: ADR-0001 merged (`e173217`), this ADR accepted |

---

## 13. Concrete architectural risks

| # | Risk | Evidence | Mitigation |
| --- | --- | --- | --- |
| R1 | **Docs tenant-from-host misreads the product hostname.** With the tenant field blank, the API takes the leftmost label of the host *it* receives whenever that host has more than two labels. So an API reached as `docs.munaxa.com` resolves slug `docs`, and one reached as `api.docs.munaxa.com` resolves `api`. Written here as "a uniform rejection"; measured on 2026-09-30 it was worse: where a tenant carries the slug `docs` (or `api`), a blank-tenant sign-in **authenticated into it**. The same rule also served refresh, sign-out, OIDC discovery and API keys. | `munaxa-docs/apps/api/src/modules/identity/presentation/auth.controller.ts:168` | **Resolved in Docs `14311c2`** (branch `claude/docs-tenant-login-and-images`): no tenant is read from the host; the organisation field is required. Not in release `f5d5bb2` — see the Docs release package §6.2. |
| R2 | **School holds generic Munaxa hostnames** (`app.munaxa.com`, `admin.munaxa.com`) and calls itself "Munaxa" in its README. The next product would collide, and customers would conflate School with the brand. | `munaxa-school/render.yaml`, `docs/PLATFORM_CONSOLE.md` | Reserve `school.munaxa.com`. Migrate when School goes to production. Not a Docs blocker. |
| R3 | **School's "Platform Console" (subscriptions, billing, staff roles) could drift into being the ecosystem control plane** because it exists first. | `munaxa-school/apps/api/src/platform`, `subscription`, `billing` | Record that it is School-scoped. A Munaxa control plane, if built, is its own peer repository (§9.1). |
| R4 | **Identity is a Work-shaped service with an ecosystem name.** It carries Work's permission artifact, `db:seed-work-roles` and a reserved `work:` namespace, and until 2026-09-30 its peer-product ADR was unmerged. The risk: someone makes Docs depend on it "because it's the Munaxa identity". | `munaxa-identity/artifacts/work-permissions.json`, `package.json` scripts | ADR-0001 merged (`e173217`); it says Docs and School are not obliged. Identity is part of the Work unit until a consolidation ADR exists. |
| R5 | **Name overlap: Work `documents`, School `documents` engine, Munaxa Docs.** This invites a "just call Docs" dependency or a consolidation. | `munaxa-work/packages/modules/documents`, `munaxa-school/docs/architecture/16-document-engine.md` | Each stays product-owned. Cross-product filing only via §9.3 integration, per tenant, optional. |
| R6 | **A future control plane becomes a runtime dependency** (entitlement lookups or sign-in via central service). A Docs-only or on-prem customer would lose access during an outage. | Design risk; Docs doc 21 already rules against it for payments | §9.1 rules 1–2 adopted as policy now. |
| R7 | **Docs images are built in CI but not published** to a registry. Work and Identity deploy by GHCR digest. Without a published image, production depends on building from source with a registry token. | `munaxa-docs/.github/workflows/ci.yml` builds `munaxa-docs-api:ci` only | Publish Docs images to GHCR by digest. This is a Docs CI change, not an application change. |
| R8 | **Build-time dependency on GitHub Packages** for `@munaxa/*`. It is fine for Munaxa, but an on-prem or dedicated customer must never need that token. | Every repo's `.npmrc` | Deliver images, not source. Already the Docs model. |
| R9 | **Docs cloud tenant onboarding requires a restart** (catalogue read at boot), and migrations are N-shaped. This is operational, not architectural. | ADR-0015 consequences | Accept for the first reference environment. Revisit with a control-plane registry adapter. |
| R10 | **Stale ecosystem docs.** The standards list five repos (six with Identity), link `tam2om/*` in places while code lives in `munaxa/*`, and Docs `ARCHITECTURE.md` says `@munaxa/typography`/`utils` are unpublished while Platform versions them at 1.1.1. | `PLATFORM_ENGINEERING_STANDARDS.md` header, `munaxa-docs/ARCHITECTURE.md` | Documentation fixes. Not blocking. |

---

## 14. Decisions required before Docs production infrastructure is finalized

Only these. None requires Work or School to be ready.

| # | Decision | Recommended answer |
| --- | --- | --- |
| D1 | Adopt this document, and merge corporate ADR-0001 (Identity as a peer product; Docs not obliged to adopt it) | **Done:** ADR-0001 merged (`e173217`, PR #263); this ADR accepted |
| D2 | Docs public hostname | `docs.munaxa.com` for the web app. API on its own host (e.g. `api.docs.munaxa.com`) or same-origin path, whichever the chosen host supports. Per-tenant subdomains deferred |
| D3 | How a user names their tenant on `docs.munaxa.com` | **Decided:** a required organisation field; the host is never read for a tenant (Docs `14311c2`) |
| D4 | Docs production data layout | Own Postgres cluster/instance for Docs (may be a managed server later shared with other products, but **separate databases and roles**), one database per tenant per ADR-0015 |
| D5 | Docs object storage, Redis, AV, secrets | Own bucket(s), own Redis, own secret paths. A ClamAV service may be Docs-owned now and shared later |
| D6 | Container registry | **Decided:** GHCR `munaxa` org, by digest. Workflow in Docs `c87519e`; publishing is a tag push (Docs release package §6.3) |
| D7 | Tenant provisioning record | Record an optional external customer reference with each tenant in the catalogue (§8), never used for authorisation |

---

## Approved direction

Munaxa Docs, Munaxa Work and Munaxa School are independent products. Each has its own deployment, its own
release cycle, its own databases, tenants, users and permissions, and each can be sold and run alone.
`@munaxa/platform` is their shared build-time foundation: design tokens, themes, typography, icons, UI,
brand and stateless technical and security libraries. It has no state, no service and no business logic.
No product imports, calls or reads the data of another. Munaxa Identity is Work's authentication service
and a candidate, not a requirement, for common identity. Ecosystem-level capabilities (customer registry,
catalogue, entitlements, billing, provisioning, common identity) are an optional future control plane
that pushes configuration into products and is never on their sign-in or request path.

## Decisions taken now

Each of these is supported by what is already in the repositories:

1. Platform scope is exactly as the platform README and standards §2–§4 define it. No product
   business logic, no database, no runtime service.
2. The product dependency law (standards §4) stands. The CI `boundaries` jobs stay mandatory.
3. Each product owns its database(s). Product databases are not merged. Docs keeps one database per
   tenant (ADR-0015).
4. Tenants are product-scoped. A customer of two products has two tenants.
5. Authentication stays per product: Docs local, Work via Identity, School local. Cookies stay
   host-only per product origin.
6. Product hostnames: `docs.munaxa.com`, `work.munaxa.com`, `school.munaxa.com`. `www.munaxa.com` is
   corporate.
7. Any future control plane must be push-based, optional, business-data-blind, and a separate peer
   repository (§9.1 rules).
8. Cross-product features happen only through published APIs/webhooks, enabled per tenant.
9. Merge corporate ADR-0001, and treat Identity as part of the Work deployment unit.
10. Shared infrastructure is limited to provider accounts, clusters/servers, registries, CI templates,
    DNS and observability, with per-product isolation as in §10.

## Decisions deferred

Wait for real customers, or for Work and School to be production-ready:

- Building any control plane: customer registry, catalogue, central entitlements, billing, licensing,
  staff console.
- Common Munaxa identity/SSO, and whether Docs or School ever federate to Identity.
- Per-tenant subdomains (`acme.docs.munaxa.com`) and custom domains.
- Pooling Redis, databases or AV across products in SaaS. Start separate, pool when cost justifies it.
- A Docs control-plane `TenantRegistry` adapter (hot tenant add without restart).
- Payment provider selection and self-service signup.
- Specific cross-product integrations (Work↔Docs filing, School↔Work HR).
- Dedicated-cloud and on-prem packaging for Work and School (Docs already has the profile).
- School's move to `school.munaxa.com`, and School/Work HR overlap resolution.

## Impact on Docs production

**Nothing in the Docs application architecture has to change**, and Docs production does not wait for
Work, School, Identity or a control plane. Docs already satisfies every independence requirement: its
own auth, tenants, databases, storage and on-prem profile, and no runtime dependency outside itself.

Settle the following in production preparation before proceeding:

1. **Tenant entry on `docs.munaxa.com` (D3/R1).** Confirm the login flow with the tenant field filled.
   Either require the field on the shared host or stop deriving a slug from the product hostname.
   Leaving it as is means a blank tenant field resolves to `docs`/`api` and every sign-in fails.
2. **Publish the Docs images by digest (D6/R7)** so the production environment deploys a built
   artifact rather than building from source with a registry token.
3. **Provision Docs-owned infrastructure (D4/D5):** its own Postgres databases (one per tenant) and
   roles, bucket(s), Redis and secret paths. Do not place Docs in the Work/Identity Render blueprint or
   its Supabase project.
4. **Set `JWT_ISSUER`/audience and `CORS_ORIGINS` to the final Docs hostnames**, and keep cookies
   host-only (already the case).
5. **Optionally** add the external customer reference to the tenant catalogue entries (D7). This is
   configuration only.

Nothing else. In particular: do not introduce Identity, a shared tenant table, a shared database, or a
control-plane dependency into Docs.
