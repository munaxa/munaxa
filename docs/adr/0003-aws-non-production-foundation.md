# ADR-0003 — AWS non-production foundation: one account, Amazon ECR, its own domain

**Status:** Accepted · **Proposed:** 2026-10-06 · **Accepted:** 2026-10-06 · **Scope:** `munaxa`, `munaxa-identity`, `munaxa-work`,
`munaxa-docs`, `munaxa-school`
**For:** whoever provisions Munaxa's AWS environments, product engineering leads, and anyone wiring a
product's CI to AWS.

This ADR records three ecosystem decisions for hosting Munaxa products on AWS: the **account**, the
**image registry** and the **non-production domain**. It changes no application code and provisions
nothing. It applies [ADR-0002](./0002-independent-products-one-shared-foundation.md) §10 ("shared vs
isolated infrastructure") to AWS. Where it changes an ADR-0002 statement it says so in §13 rather
than leaving two answers. Like every ADR it is immutable once accepted: supersede it, do not edit
its decisions.

**This ADR is self-contained.** Every decision and its rationale are stated here, and nothing in it
depends on another repository's branch. The supporting analysis (option comparisons, prices verified
on 2026-10-06 against the AWS Price List for `eu-central-1`, and the detailed network, DNS and account
design) was written in `munaxa-identity` as `docs/runbooks/aws-staging-architecture.md`, on a review
branch at the time of writing (commit `da4f531`). Below it is called "the supporting analysis". It is
background, not a source of decisions. If it is rebased, renamed, merged, moved or discarded, this ADR
is unaffected, and where the two ever differ, this ADR governs. Every "current state" statement below
names its source.

Throughout, **decided** means binding: this ADR is accepted. **Deferred** means deliberately left
open, with a named owner. **Product ADR** means the decision belongs to one product's repository and
this ADR does not make it.

---

## 1. Status

Accepted on 2026-10-06, after review and a cross-repository consistency audit
(`docs/verification/aws-adr-0003-consistency-audit.md`). It is binding from that date. Until it was
accepted, nothing it describes could be provisioned; that honoured Docs ADR-0022's condition that
_"the AWS region and account structure are decided before any resource is provisioned"_.

## 2. Date

Proposed 2026-10-06. Accepted 2026-10-06.

## 3. Context

- **Munaxa has no revenue.** Hosting must cost as little as practical, but a non-production
  environment that does not resemble production cannot test a production deployment.
- **AWS is the chosen platform.** ECS on Fargate (Docs ADR-0022) in `eu-central-1` (Docs ADR-0023).
  Docs has started its production there. At the time of writing, Identity had prepared its first AWS
  artifacts (ECR publishing via GitHub OIDC, a migration runner, TLS to RDS) as unmerged review work in
  `munaxa-identity`.
- **Identity and Work have a staging environment today, on Render**, not AWS. It runs as one public
  origin, with images published to GHCR and pulled by digest using a stored registry credential
  (`munaxa-identity` `deploy/render.yaml`, `deploy/RENDER.md`; ADR-0002 §7 and §12).
- **There is no account convention.** Docs Production and Docs Non-Production both live in
  `800728620253`, **the AWS Organizations management account**. Docs' own Terraform README states
  the consequence: _"service control policies do not apply to it. Isolation is enforced entirely in
  IAM"_, and _"Both administrator users keep AdministratorAccess and can bypass all of this."_ Docs
  ADR-0024 lists _"A separate production AWS account"_ as still open.
- **The registry decision predates AWS.** ADR-0002 §10 and D6 name GHCR. On ECS, GHCR needs a stored
  registry credential; ECR is pulled with the task execution role and needs none.
- **`munaxa.com` is hosted on Cloudflare** (name servers `rick.ns.cloudflare.com`,
  `bristol.ns.cloudflare.com`; public DNS, 2026-10-06). Production siblings already exist on it:
  `www.`, `app.` and `admin.` (Cloudflare-proxied; `app.`/`admin.` are School, ADR-0002 R2), and
  `docs.munaxa.com` (a DNS-only record to the Docs production ALB). `work.munaxa.com` does not exist yet.
- **Identity's cookies make the site boundary matter.** Identity is Work's authentication service on
  Work's origin (ADR-0001; Identity ADR-0004). Its session cookie is `__Host-mx_session`. Its refresh
  cookie is `__Secure-mx_refresh` with `Path=/api/auth/refresh`; it carries no `Domain`, but its
  prefix does not stop another host on the same registrable domain from planting a cookie of that
  name (§8).

## 4. Decision

1. **Account.** All Munaxa non-production environments live in **one dedicated member account,
   `munaxa-nonprod`**. Production later lives in **one dedicated member account, `munaxa-prod`**. The
   Organizations management account receives **no new application workloads**.
2. **Registry.** For AWS deployments the image registry is **Amazon ECR**, published from GitHub
   Actions through **GitHub OIDC**, deployed to ECS Fargate **by immutable digest**. **No long-lived AWS
   credential** exists anywhere in the pipeline.
3. **Domain.** Non-production uses its own registrable domain, **`munaxa-nonprod.com`**
   (`work.munaxa-nonprod.com`, …). Production stays on **`munaxa.com`** (ADR-0002 binding decision 15).
   This is a security boundary, not a naming preference.

Identity and Work stay on one origin within each environment. Identity remains Work's
authentication service and the only holder of its private signing key; Work receives only the public
verification key. Docs and School remain independently authenticated (ADR-0002 binding decision 13).
None of this changes.

### 4.1 Transition from Render staging

**Decided.**

- **Render staging stays operational** while AWS non-production for Identity and Work is built and
  validated. There is no requirement to migrate immediately and no shutdown date.
- **Render staging is not the AWS non-production environment.** It is not in `munaxa-nonprod`, is not
  governed by this ADR's account, registry or domain rules, and its configuration is not a template
  for them.
- **AWS non-production becomes the authoritative semi-production environment** for Identity and Work
  once it passes its acceptance testing. Until then, Render staging remains the environment of
  record for those products.
- **Render staging may then be retired** whenever it is no longer needed. Retirement is an
  operational decision for the Identity and Work owners; this ADR sets no date.
- **The existing Render GHCR workflows remain valid** throughout, and after the transition for as
  long as Render staging exists (§6, "Deferred"). Their GHCR use is not an AWS deployment and is not
  superseded by §13.

## 5. Account model

**Decided.**

```text
AWS Organization (all features enabled, so SCPs apply to member accounts)
│
├── Management account 800728620253 — Organizations, billing, identity administration only.
│     No new workloads. (Today it also holds Docs Production and Docs Non-Production; see §11.)
│
├── OU NonProduction
│   └── munaxa-nonprod — every product's non-production environment
│       shared: one VPC, one ALB, one ECS cluster, VPC endpoints, the munaxa-nonprod.com zone,
│               one GitHub OIDC provider
│       per product: services, task definitions, ECR repositories, IAM roles, secrets,
│               log groups, databases and roles, signing keys
│
└── OU Production
    └── munaxa-prod — every product's production environment (created when first needed)
```

- **One account per environment class, not per product.** ADR-0002's "Decisions taken now" item 10
  already lists provider accounts among what products share. Product isolation is enforced inside the
  account (§10), so per-product accounts would add eight accounts and cross-account networking and
  buy no isolation.
- **Why a member account and not the management account.** AWS: _"SCPs don't affect users or roles
  in the management account"_; _"Avoid deploying workloads to the organization's management
  account"_ (Organizations user guide). Non-production is the most frequently changed, least reviewed
  workload. In a member account it can be fenced by SCPs (region, no IAM users or access keys, cost
  guardrails) and holds no permission in production at all.
- **Cost:** none. _"AWS Organizations is offered at no additional charge"_. IAM, the OIDC provider,
  SCPs and the first CloudTrail copy of management events are free. Nothing is duplicated, because
  the non-production environment does not exist yet.

**Deferred:**

- When `munaxa-prod` is created: before the first Identity or Work production resource.
- Whether Docs production moves into it: Docs' decision, Docs ADR-0024 open item 2.

## 6. Registry and deployment model

**Decided.**

```text
GitHub Actions job in environment aws-nonprod (or aws-eu-prod)
  → GitHub OIDC token (sub = repo:munaxa/munaxa-<product>:environment:aws-nonprod, or :aws-eu-prod)
  → product-specific AWS role in that environment's account (publisher or deployer)
  → Amazon ECR repository munaxa-<product>-<component>
  → immutable digest repository@sha256:…
  → ECS Fargate task definition (service and one-off tasks run the same digest)
```

- **GitHub environments, one per AWS environment, in every product repository that deploys to AWS:**

  | GitHub environment | AWS account      | Region         | Purpose                                     |
  | ------------------ | ---------------- | -------------- | ------------------------------------------- |
  | `aws-nonprod`      | `munaxa-nonprod` | `eu-central-1` | Non-production publishing and deployment    |
  | `aws-eu-prod`      | `munaxa-prod`    | `eu-central-1` | Production promotion and deployment (later) |

  The names are explicit, not placeholders. The environment name becomes the OIDC `sub` that each
  role's trust policy matches exactly, so it is the boundary between accounts. `aws-` marks an AWS
  target, as distinct from the Render `staging` environment and other hosts. `eu-prod` names the
  region class of production, because production data residency is bound to its region. It is the
  token Docs already uses for its production resources (`munaxa-docs-eu-prod-*`). Non-production
  holds no customer data and is one account in one region, so it needs no region token. A production
  environment in another region would be a new environment with its own name, decided when that
  region is.
- **No long-lived credentials.** No AWS access key, ECR password or registry token in source,
  images, repository files or GitHub secrets. Each role trusts **one repository and one GitHub
  environment**, by exact `sub` and `aud` match.
- **Repositories are product- and component-specific:** `munaxa-<product>-<component>`, the same
  names as today's images (for example `munaxa-identity-api`, `munaxa-work-api`, `munaxa-work-admin`,
  `munaxa-docs-api`). Tags are immutable, and deployment pins the digest, never a tag.
- **Promotion copies the digest.** Production gets its own repositories in `munaxa-prod`. A job in
  the production environment copies the exact digest from `munaxa-nonprod`, so production never
  runs from, or depends on, the non-production account.
- **Conformance is defined by the rules above, not by any implementation.** A product's pipeline
  conforms when it meets them, in whatever form.

**Implementation status (informative, not part of the decision).** Identity's ECR publishing work
was the first implementation and informed this standard: a workflow, an image-verification script
and a runbook (`.github/workflows/publish-ecr.yml`, `.github/scripts/verify-runtime-image.sh`,
`docs/runbooks/ecr-image.md`). At the time of writing it was unmerged, on review branch
`claude/identity-ecr-publish` (`1c07a8e`). It predates this standard and uses repository
`munaxa/identity-api` and GitHub environment `aws-staging`. It must be aligned to
`munaxa-identity-api` and `aws-nonprod` before its first AWS publish (F5). It is a useful pattern for
other products, but this ADR does not depend on it: if it is rebased, renamed, merged or discarded,
the standard is unchanged.

**Deferred:**

- Whether GHCR remains the channel for delivering images to dedicated-cloud and on-premises
  customers (ADR-0002 §11). Existing GHCR publishing workflows, including those that feed Render
  staging (§4.1), may continue, but **no AWS environment pulls from GHCR**.
- A shared reusable publish workflow in `munaxa` (ADR-0002 §10 CI/CD row "Shared reusable workflows";
  "Decisions taken now" item 10 "CI templates").

## 7. Domain model

**Decided.**

| Product   | Non-production                      | Production                  |
| --------- | ----------------------------------- | --------------------------- |
| Work unit | `https://work.munaxa-nonprod.com`   | `https://work.munaxa.com`   |
| Docs      | `https://docs.munaxa-nonprod.com`   | `https://docs.munaxa.com`   |
| School    | `https://school.munaxa-nonprod.com` | `https://school.munaxa.com` |

- **One hostname per product per environment, paths within a product.** The Work unit stays one
  origin split by path: `/api/auth/*` → Identity, `/api/v1/*` → Work API, `/*` → Work admin
  (Identity ADR-0004).
- **`munaxa.com` stays on Cloudflare** for production. Product records are DNS-only, never proxied:
  a proxy adds a second hop, and Identity trusts exactly one, the ALB, so its per-IP sign-in rate
  limit would see Cloudflare's addresses instead of clients'.
- **`munaxa-nonprod.com` is managed independently** for non-production, from `munaxa-nonprod`. It
  has no delegation from `munaxa.com` or Cloudflare, and no non-production credential can change
  production DNS.
- **Name availability:** `munaxa-nonprod.com` returned NXDOMAIN at the `.com` registry on
  2026-10-06. It appears unregistered and must be registered before use.

**Deferred to provisioning:**

- the Route 53 implementation (registrar, hosted zone, records);
- certificates (the supporting analysis recommends one non-production wildcard and one production
  certificate per hostname);
- CAA records.

## 8. Security rationale

**Account boundary.** A non-production deployment cannot modify production because every layer
would have to fail at once:

1. The production account trusts nothing from `munaxa-nonprod`, and no production role accepts an
   `aws-nonprod` OIDC subject.
2. GitHub environment protection rules gate `aws-eu-prod`, and each environment's variables name only
   its own account's roles.
3. Infrastructure code pins its one allowed account ID.
4. SCPs apply to member accounts.

None of this is available while workloads sit in the management account.

**Registry.** ECR is pulled with the execution role, inside the VPC through endpoints, with no
registry secret to store, rotate or leak. Publishing needs no stored AWS credential.

**Domain.** Hosts under one registrable domain are the same _site_. A host that an attacker controls
under that domain (a "sibling"):

- **can** set a cookie with `Domain=<parent>` that every sibling receives, under any name except a
  `__Host-` name;
- **can** order its copy before the real one (same or longer `Path`, created earlier);
- **can** evict cookies or send oversized "cookie bomb" headers, whatever their prefix;
- **can** make the browser attach `SameSite=Lax` and `Strict` cookies to requests it triggers,
  because those requests are same-site.

It **cannot** read another host's host-only cookies or the responses to those requests. Under
`nonprod.munaxa.com`, every non-production host would be such a sibling of production. Under
`munaxa-nonprod.com`, none is: requests between the environments are cross-site, no non-production
host can set a `munaxa.com` cookie, password managers stop offering production credentials on
non-production pages, and future WebAuthn relying-party IDs and federation registrations separate
cleanly. Identity's exact-origin CSRF allow-list remains in place; the site boundary adds to it
rather than replacing it.

**Not changed:**

- Identity's authentication architecture and its cookies;
- Work's verification of Identity's tokens;
- ADR-0002 binding decision 14 (host-only cookies).

## 9. Cost rationale

**Guiding principle (decided): semi-production architecture with minimum practical non-production
capacity.** Non-production has production's _shape_ and security boundaries:

- private tasks;
- TLS everywhere, including to the database;
- Secrets Manager;
- per-product IAM;
- per-product databases.

It does not have production's _size_. Non-production is not made production-sized for symmetry.

| Decision | Recurring cost | Basis |
| --- | --- | --- |
| `munaxa-nonprod` account | **$0** | Organizations and member accounts carry no charge |
| ECR instead of GHCR | Storage, cents; same-Region pulls free | ECR pricing: same-Region transfer to Fargate is free |
| `munaxa-nonprod.com` | **≈ $16 a year** registration + $0.50/month zone (the zone replaces a planned sub-zone) | Route 53 `.com` price since 2026-07-01 (secondary source; re-check at purchase) |

The whole Identity + Work non-production environment is estimated at about **$128–133 a month**
on-demand in the supporting analysis, less with Fargate Spot. That is an estimate, not a decision.

## 10. Product isolation

Shared by all products in an environment: the account, VPC, ALB, ECS cluster, VPC endpoints, the
DNS zone and the OIDC provider. The following are **never shared**. This applies ADR-0002 §10 and
binding decisions 5 and 12.

| Concern               | Per product (and per component where it applies)                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ECS                   | Separate services and task definitions                                                                                 |
| ECR                   | Separate repositories, `munaxa-<product>-<component>`                                                                  |
| IAM                   | Separate publisher, deployer, execution and task roles, under per-product paths and permissions boundaries. A product's deployer may pass only that product's roles |
| Secrets Manager       | Separate secrets per consumer, `munaxa-<product>-<env>/<consumer>`; each execution role reads only its own              |
| Databases             | Separate databases and roles. **Identity has its own database; Work has its own database.** One RDS server may host several products' databases (ADR-0002 §10), never one shared database |
| Signing keys          | Never shared. Identity alone holds its private key; Work holds only the public key; Docs and School keep their own |
| Credentials           | No product receives another product's credentials                                                                      |
| Network               | Separate security groups; a product's data tier admits only that product's tasks                                        |

## 11. Production evolution

- **`munaxa-prod` is created once, for all products,** when the first Identity or Work production
  resource is built. Same patterns; production-sized:
  - more than one task per service;
  - Multi-AZ databases;
  - endpoints in every AZ that runs tasks;
  - longer log retention;
  - its own OIDC provider, trusting only the `aws-eu-prod` GitHub environment.
- **Docs today (unchanged by this ADR):** Docs Production and Docs Non-Production are in the
  management account, and Docs production follows its accepted ADRs (0022–0025), including its GHCR
  plan. Moving Docs Non-Production into `munaxa-nonprod`, and Docs Production into `munaxa-prod`,
  are Docs decisions. Moving production is cheapest before it holds customer data. AWS resources
  cannot move between accounts; they are recreated.
- **School** joins on `school.munaxa-nonprod.com` / `school.munaxa.com` when its own blockers are
  resolved (§14).

## 12. Consequences

- **Non-production infrastructure baseline.** This ADR records it as the ecosystem baseline. Its
  detailed design and costing are in the supporting analysis; this ADR does not re-derive them:
  - one shared non-production VPC, one shared ALB, one shared ECS cluster;
  - private ECS tasks;
  - VPC endpoints instead of a NAT gateway for the initial Identity + Work environment;
  - one database server that may host several products' databases, each with its own roles.

  Products that need internet egress (Docs, School) choose their egress when they join.
- **One more account, one more domain.** Each has to be created, secured and renewed: the member
  account's root user, auto-renewal of the domain.
- **SCPs require the organization's "all features" mode.** Verify it before relying on SCPs.
- **The ADR-0002 statements listed in §13 no longer describe AWS deployments.**
- **Nothing in any product's application code changes because of this ADR.**

## 13. Superseded and conflicting decisions

ADR-0002 is not edited. These statements are superseded or updated here:

| ADR-0002 statement | Status after this ADR |
| --- | --- |
| §10 row **Container registry**: "One registry (GHCR `munaxa` org)" | **Superseded for AWS deployments:** ECR in each environment's account (§6). GHCR's role for non-AWS distribution is deferred |
| §14 **D6** "Container registry — Decided: GHCR `munaxa` org, by digest" | **Superseded for AWS deployments**, as above. Digest-pinned deployment is kept |
| §13 **R7** "Work and Identity deploy by GHCR digest" | **Updated:** on AWS they deploy by ECR digest. Docs' existing GHCR publishing remains Docs' to move |
| "Decisions taken now" 10: shared "registries" | **Updated:** the registry service (ECR) is shared per account; repositories are per product and component |
| §10 row **DNS**: "One `munaxa.com` zone" | **Updated:** production keeps one `munaxa.com` zone (on Cloudflare); non-production uses the separate `munaxa-nonprod.com` (§7) |
| §10 row **Compute**: "Same cluster/account/provider" | **Consistent:** one account and one cluster per environment class (§5) |
| Binding decisions 13–15 and "Decisions taken now" 5–6 | **Unchanged** |
| §7 and §12 description of Work + Identity **staged on Render** | **Unchanged.** Render staging continues during the transition (§4.1) and is outside this ADR's AWS rules |
| §5C and §7 describe Identity's tokens as **RS256** | **Factual correction, not a decision:** Identity signs **ES256** (`munaxa-identity` `packages/config/src/environment.ts`, `IDENTITY_SIGNING_ALGORITHMS = ['ES256']`). Work verifies with the public key either way |

ADR-0001 is unchanged and consistent. Its consequence that _"one browser origin is required for
staging"_ holds in each environment.

## 14. Follow-up decisions

Each item names its owner. None is decided or implemented here.

| # | Follow-up | Owner | Kind |
| --- | --- | --- | --- |
| F1 | **Security — Identity production cookie hardening.** In production, `work.munaxa.com` is same-site with `www.`, `app.`, `admin.` and `docs.munaxa.com`. Any of those hosts, if compromised, can plant a `__Secure-mx_refresh` cookie (`Domain=munaxa.com`, `Path=/api/auth/refresh`). `cookie-parser` keeps the first duplicate, so a victim's next refresh can rotate the attacker's lineage and sign the victim into the attacker's account (login CSRF and session swap). The `Origin` check does not stop it. The options are a `__Host-` refresh cookie (which requires `Path=/`), rejecting duplicate refresh cookies and binding the refresh to the session subject, or a Platform fix. **Must be decided before Work production.** Non-production is not exposed across environments because of §7 | Identity | **Identity ADR** |
| F2 | **Work `munaxa_work_tenant` cookie.** Unprefixed, so a sibling host can plant it. It carries only a tenant _selection_ among the user's own memberships (Work ADR-0032), never an authority. Review it for host-only (`__Host-`) protection before production | Work | Work change |
| F3 | **School default sender `no-reply@munaxa.app`** (`munaxa-school` `apps/api/src/config/env.validation.ts`). `munaxa.app` returned NXDOMAIN on 2026-10-06, so it appears unregistered or unconfigured, and mail from it would fail authentication | School | School change |
| F4 | Create `munaxa-nonprod`, enable SCPs with a baseline, and register `munaxa-nonprod.com` | Infrastructure owner | Provisioning, after acceptance |
| F5 | Align Identity's ECR implementation work with §6 (repository `munaxa-identity-api`, GitHub environment `aws-nonprod`) before its first publish, whatever branch it is then on | Identity | Configuration |
| F6 | Docs: move Non-Production into `munaxa-nonprod`, Production into `munaxa-prod`, and its registry to ECR | Docs | **Docs ADR** |
| F7 | GHCR's future as the dedicated-cloud and on-premises distribution channel | Ecosystem | Future ecosystem ADR |
| F8 | School: the hostname move (ADR-0002 R2), a build-time API URL that prevents promotion by digest, and static S3 keys that become a task role on ECS | School | School ADRs |
