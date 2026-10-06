# ADR-0003 cross-repository consistency audit

**Date:** 2026-10-06 · **Kind:** read-only audit · **Subject:**
[ADR-0003](../adr/0003-aws-non-production-foundation.md) (Proposed, `8f0b675`) · **Changes made by this
audit:** this file only. No repository other than `munaxa/munaxa` was modified. No AWS resource,
workflow, cookie or DNS record was touched. ADR-0003 was not accepted or edited.

## Revisions inspected

Every search used `git grep` on tracked files at the commit below, so working-tree state played no
part.

| Repository               | Ref                                                       | Commit    | Date       |
| ------------------------ | --------------------------------------------------------- | --------- | ---------- |
| `munaxa/munaxa`          | `claude/adr-0003-aws-nonprod-foundation` (ADR-0003)        | `8f0b675` | 2026-10-06 |
| `munaxa/munaxa-identity` | `main`                                                    | `0112925` | 2026-09-09 |
| `munaxa/munaxa-identity` | `claude/aws-nonprod-dns-decision`, the tip of the review chain below | `da4f531` | 2026-10-06 |
| `munaxa/munaxa-work`     | `main`                                                    | `869cceb` | 2026-09-02 |
| `munaxa/munaxa-docs`     | `main`                                                    | `2ded2bc` | 2026-10-05 |
| `munaxa/munaxa-school`   | `main`                                                    | `191e63e` | 2026-08-18 |
| `munaxa/munaxa-platform` | `main`                                                    | `d0a29ec` | 2026-08-18 |

The Identity review chain is unmerged; each branch is based on the one before. In order:

| Commit    | Change                                                      | Branch                                |
| --------- | ----------------------------------------------------------- | ------------------------------------- |
| `95b9a2e` | trust proxy                                                 | `claude/confident-fermi-k3cdx2`       |
| `127eff6` | migration runner                                            | `claude/identity-migration-runner`    |
| `c627481` | bootstrap/seed TLS                                          | `claude/identity-bootstrap-tls`       |
| `1c07a8e` | ECR publishing                                              | `claude/identity-ecr-publish`         |
| `954cf32` | architecture document                                       | `claude/aws-staging-architecture`     |
| `88e58da` | network decision                                            | `claude/aws-nonprod-network-decision` |
| `72c5ec5` | account decision                                            | `claude/aws-nonprod-account-decision` |
| `da4f531` | DNS decision                                                | `claude/aws-nonprod-dns-decision`     |

**Search terms**, case-insensitive:

- registry: `GHCR`, `ghcr.io`, `github container registry`, `ECR` (whole word), `ECR_REPOSITORY`,
  `.dkr.ecr.`;
- names: `aws-staging`, `munaxa/identity-api`, `munaxa-shared-nonprod`, `munaxa-nonprod`;
- domains: `nonprod.munaxa.com`, `work.nonprod.munaxa.com`, every `*.munaxa.com` and `*.munaxa.app`
  hostname;
- algorithm: `RS256`, `PLATFORM_AUTH_ALGORITHM`;
- issuer and sign-in: `PLATFORM_AUTH_ISSUER`, `IDENTITY_BASE_URL`, `PLATFORM_SIGN_IN_URL`;
- AWS: account `800728620253`, region names (`us-east-1`, `eu-west-1`, `eu-central-1`, …),
  `AWS_REGION`, `AWS_ACCESS_KEY_ID`;
- deployment: `Render`, `staging`/`production` GitHub environment names.

Lockfiles were excluded.

**Classification:**

- **A — Must change.** It contradicts ADR-0003 or would cause an incorrect AWS deployment.
- **B — Documentation stale.** No runtime effect, but it should be updated.
- **C — Intentional exception.** It is correctly different: another environment, existing
  production, on-premises or dedicated deployment, history, or a product's own decision.
- **D — Not related.** A false positive.

---

## 1. Executive result

**ADR-0003 is consistent with every repository's runtime code.** No application code contradicts it.

- **Identity:** the only "must change" findings (A). Its ECR publishing artifacts on the review
  chain still use the pre-ADR names `aws-staging` and `munaxa/identity-api`. They are not on
  `main`, nothing has been published, and they must be aligned **before the first AWS publish**. If
  they are not, either the role will refuse the workflow's OIDC subject, or the provisioner creates
  a repository and trust policy under the wrong names.
- **Docs:** production and non-production run in the management account and pull GHCR digests with
  a stored credential. That is Docs' accepted architecture (Docs ADR-0022–0025), so it is an
  intentional exception (C). Moving it needs a Docs ADR.
- **School:** runs on Render and Supabase with GHCR, `staging`/`production` GitHub environments,
  generic image names, static AWS keys and `app.`/`admin.munaxa.com`. It is not on AWS, so this is
  also an intentional exception (C), with work for School ADRs when it joins.
- **Work and Platform:** no conflicts. Work hard-codes no hostname, issuer, account, region or
  registry for AWS; all of it is configuration. `RS256` appears only as a supported verification
  algorithm or in test fixtures.
- **ADR-0003 itself:** three gaps to clarify **before acceptance** (B):
  - it does not say what happens to the existing **Render staging** environment for Identity and
    Work;
  - it leaves the production GitHub environment name as a placeholder (`aws-<prod>`), while the
    architecture document uses `aws-eu-prod`;
  - its reference implementation and architecture evidence live on **unmerged** Identity branches.

| Class | Count | Of which blocking |
| ----- | ----- | ----------------- |
| A     | 2     | 2 (block the first Identity ECR publish, not the ADR) |
| B     | 8     | 0 (3 should be settled before ADR-0003 is accepted)    |
| C     | 17    | 0                                                      |
| D     | 11    | 0                                                      |
| **Total** | **38** |                                                  |

## 2. ADR-0003 decisions checked

| # | Decision | Where it could be contradicted | Result |
| - | -------- | ------------------------------ | ------ |
| 1 | Non-production account `munaxa-nonprod` | Account IDs and names, Terraform defaults, runbooks | No contradiction. Only Docs names an account (`800728620253`, the management account) for its existing environments (C) |
| 2 | Production account `munaxa-prod` later | As above | No contradiction |
| 3 | Amazon ECR for AWS deployments | `ghcr.io` references, registry credentials, image variables | Docs' AWS production pulls GHCR (C, Docs ADR needed). All other GHCR use is Render or non-AWS (C) |
| 4 | ECR naming `munaxa-<product>-<component>` | Repository names | **Identity runbook uses `munaxa/identity-api` (A).** School's GHCR images are `munaxa-api`/`munaxa-admin` (B, matters when School moves) |
| 5 | GitHub environment `aws-nonprod` | `environment:` keys, OIDC `sub` | **Identity workflow and runbook use `aws-staging` (A)** |
| 6 | Domain `munaxa-nonprod.com` | `nonprod.munaxa.com`, staging hostnames | `nonprod.munaxa.com` appears only in the rejected-option analysis (C). Docs has a `staging.docs.munaxa.com` example (B) |
| 7 | `work.munaxa-nonprod.com` | Hard-coded Work or Identity hostnames | None hard-coded: Identity uses `PUBLIC_HOST`/`IDENTITY_BASE_URL`; Work uses `PLATFORM_AUTH_ISSUER`/`PLATFORM_SIGN_IN_URL` (D) |
| 8 | Production stays on `munaxa.com` | Production hostnames | Consistent: `docs.munaxa.com`, `api.docs.munaxa.com` (C) |
| 9 | Shared VPC, ALB and cluster; private tasks; endpoints, not NAT | Network plans | Only the architecture document defines it. Docs' own NAT-based non-production and public-task production are Docs' (C) |
| 10 | Product isolation | Shared credentials, databases, keys | No sharing found. Every product has its own secrets, signing material and database configuration |
| 11 | Identity: Work's authentication service, same origin, private key, ES256 | `RS256`, algorithm settings, issuer wiring | Identity is ES256 only. Work pins the algorithm by configuration (`ES256` in every Identity deploy file). ADR-0002's RS256 text is already corrected by ADR-0003 §13 (C) |

## 3. Repository-by-repository findings

### 3.1 `munaxa/munaxa`

| ID | File | Reference | Class | Why it matters | Recommended action |
| -- | ---- | --------- | ----- | -------------- | ------------------ |
| M-1 | `docs/adr/0002-independent-products-one-shared-foundation.md:369`, `:438`, `:420`, `:472` | §10 "Container registry: One registry (GHCR `munaxa` org)"; D6 "Decided: GHCR"; R7 "Work and Identity deploy by GHCR digest"; "Decisions taken now" 10 "registries" | C | Already superseded or updated for AWS by ADR-0003 §13. ADRs are immutable | None. Takes effect when ADR-0003 is accepted |
| M-2 | same file `:367` | §10 DNS row "One `munaxa.com` zone" | C | Updated by ADR-0003 §13 (production keeps it; non-production uses `munaxa-nonprod.com`) | None |
| M-3 | same file `:190`, `:239` | "verifies RS256 tokens"; "Identity, RS256" | C | Factually wrong (Identity is ES256). Corrected by ADR-0003 §13; changes no decision | None |
| M-4 | same file `:250`, `:401`, `:504` | Render staging topology for Work + Identity | C | Describes the existing Render environment, which still exists | See M-5 |
| M-5 | `docs/adr/0003-aws-non-production-foundation.md` (whole) | No statement on the existing **Render staging** environment (Identity `deploy/render.yaml`, GHCR) | B | A reader cannot tell whether AWS non-production replaces Render staging, runs beside it, or when Render stops. That decides whether the Render/GHCR files below stay C or become B | Add one sentence before acceptance, e.g. "Render staging remains until AWS non-production is verified for Identity + Work, then it is retired", or defer it explicitly with an owner |
| M-6 | same file `:121–122`, `:187` | `aws-<env>`, `aws-<prod>` | B | The production GitHub environment name is not fixed. The Identity architecture document (§8.4, §11) uses `aws-eu-prod`. An OIDC trust `sub` must match exactly | Before acceptance, either name it (`aws-eu-prod`, matching Docs' `eu-prod` token) or state it is deferred to `munaxa-prod` creation |
| M-7 | same file `:15`, `:138–142` | Cites `claude/aws-nonprod-dns-decision` (`da4f531`) and `claude/identity-ecr-publish` (`1c07a8e`) | B | Evidence and the reference implementation sit on unmerged review branches, which can be rebased or deleted | Before acceptance, merge the Identity chain and cite `main` commits, or keep the commit SHAs and keep the branches until merged |

### 3.2 `munaxa/munaxa-identity`

| ID | File | Reference | Class | Why it matters | Recommended action |
| -- | ---- | --------- | ----- | -------------- | ------------------ |
| I-1 | `.github/workflows/publish-ecr.yml:48` (also comments and messages `:7`, `:45`, `:62`) | `environment: aws-staging` | **A** | The OIDC `sub` becomes `repo:munaxa/munaxa-identity:environment:aws-staging`. A role created per ADR-0003 trusts `…:environment:aws-nonprod`, so `AssumeRoleWithWebIdentity` is refused. Worse, someone "fixes" the trust to match the workflow and the convention silently forks | Rename to `aws-nonprod` in the workflow and its comments, and create the `aws-nonprod` GitHub environment. **Before the first publish.** Branch `claude/identity-ecr-publish` and descendants |
| I-2 | `docs/runbooks/ecr-image.md:41`, `:66`, `:82`, `:90`, `:120`, `:146`, `:152`, `:206`, `:212` | repository `munaxa/identity-api`; trust `sub` `…:environment:aws-staging`; environment `aws-staging`; `ECR_REPOSITORY` value `munaxa/identity-api` | **A** | This is the runbook the provisioner follows. It would create the repository, the IAM resource ARN and the trust policy under names ADR-0003 rejects | Change to `munaxa-identity-api` and `aws-nonprod` throughout, together with I-1. The workflow reads `ECR_REPOSITORY` from a variable, so no code change |
| I-3 | `docs/runbooks/ecr-image.md:262`, `:264` | "roughly $7 per endpoint-AZ … at us-east-1", "NAT … roughly $33 … at us-east-1" | B | Wrong region for cost figures; the intended region is `eu-central-1`. Verified figures are $8.76 per endpoint-AZ and $37.96 for NAT (architecture document §3.2) | Replace with the `eu-central-1` figures, or link the architecture document's §3 |
| I-4 | `docs/runbooks/aws-staging-architecture.md` (filename, title `:1`) | "staging architecture" | B | ADR-0003 uses "non-production". Cosmetic, but the file is cited by path from ADR-0003 | Keep the path (ADR-0003 links it); optionally retitle to "non-production" when the chain is merged |
| I-5 | same file `:977` | "the Identity ECR runbook uses repository `munaxa/identity-api` and GitHub environment `aws-staging` … they become …" | C | It is the alignment note that records I-1 and I-2 | Remove once I-1 and I-2 are done |
| I-6 | same file `:323`, `:347`, `:379`, `:390`, `:400`, `:992` | `nonprod.munaxa.com`, `work.nonprod.munaxa.com` | C | The rejected Option A and resolved decision #6, kept as the decision record | None |
| I-7 | same file `:997` | "ADR-0002 §7 says Identity signs RS256; Identity uses ES256" | C | Open item #11, now covered by ADR-0003 §13 | Mark it resolved by ADR-0003 when that is accepted |
| I-8 | `.github/workflows/publish-images.yml:1`, `:55`, `:71–72`; `deploy/render.yaml:17`, `:23`, `:74`, `:77`, `:133`, `:176`; `deploy/RENDER.md:34`, `:42`, `:49` | GHCR publishing; Render pulling `ghcr.io/munaxa/munaxa-*-api@sha256:…` with credential `ghcr-munaxa` | C | The existing Render staging environment, not AWS. ADR-0003 §6 allows existing GHCR workflows to continue. The image names already follow `munaxa-<product>-<component>` | None now. Reclassify to B when Render staging is retired (M-5) |
| I-9 | `deploy/docker-compose.staging.yml:98`, `:183`, `:185`, `:217`; `docs/runbooks/configuration-contract.md:36`, `:38`; `docs/runbooks/secrets.md:28`, `:30` | `IDENTITY_BASE_URL`/`PLATFORM_AUTH_ISSUER` = `${PUBLIC_ORIGIN}/api/auth`; `PLATFORM_AUTH_ALGORITHM: ES256`; `PLATFORM_SIGN_IN_URL` = `${PUBLIC_ORIGIN}/api/auth/login` | D | Parameterised by origin, ES256 everywhere, and same-origin by construction. Already correct for `https://work.munaxa-nonprod.com` | None |
| I-10 | `packages/config/src/environment.ts:66–182`, `environment.test.ts`, `.env.example:26–28`, `apps/api/scripts/generate-signing-key.mjs:41` | `IDENTITY_BASE_URL` (https enforced in production), `PLATFORM_AUTH_ALGORITHM=ES256` | D | Consistent with ADR-0003 decision 11 | None |
| I-11 | `docs/runbooks/migrations.md:61`; `apps/api/test/direct-connection.test.ts:168` | Regional RDS CA bundle table naming several regions; `…eu-west-1.rds.amazonaws.com` test fixture | D | Reference data and a test hostname, not a deployment region | None |

### 3.3 `munaxa/munaxa-work`

| ID | File | Reference | Class | Why it matters | Recommended action |
| -- | ---- | --------- | ----- | -------------- | ------------------ |
| W-1 | `.github/workflows/publish-images.yml:1–8`, `:68`, `:84–85`, `:114`, `:148`, `:166` | GHCR publishing for Render, images `munaxa-work-api`/`munaxa-work-admin` | C | The existing Render path. Names already follow the ECR convention | None now. See W-5 |
| W-2 | `packages/config/src/platform-authentication.ts:19`, `:31`, `:205`; `.env.example:35–40` | `PLATFORM_AUTHENTICATION_ALGORITHMS = ['RS256', 'ES256']` | D | A verifier allow-list: symmetric algorithms are refused by name, and the deployed algorithm is pinned by `PLATFORM_AUTH_ALGORITHM` (`ES256` in every Identity deploy file). It accepts ADR-0003's ES256 | None. Narrowing it to ES256 would be a Work decision, not required by ADR-0003 |
| W-3 | `packages/config/src/platform-authentication.test.ts` (16 lines), `apps/api/src/identity/authentication-port.spec.ts:41–43` | `RS256` and `https://identity.example.com` fixtures | D | Test fixtures | None |
| W-4 | `packages/config/src/environment.ts:100–102`, `portal-environment.ts:32`, `apps/admin/src/shell/access-state.tsx:25`, `apps/admin/locales/en.json:111` | `PLATFORM_AUTH_ISSUER`, `PLATFORM_AUTH_ALGORITHM`, `PLATFORM_SIGN_IN_URL` from environment; no default hostname | D | Work has **no** hostname, issuer, account, region or registry assumption. Non-production values are `https://work.munaxa-nonprod.com/api/auth` and `…/api/auth/login` | None |
| W-5 | (absence) | No ECR workflow and no `aws-nonprod` environment | C (gap, not a conflict) | Needed before Work runs in `munaxa-nonprod`. Identity's ECR workflow is the reference (ADR-0003 §6) | Add when Work is provisioned on AWS, under `munaxa-work-api`/`munaxa-work-admin` and `aws-nonprod`, or adopt the shared reusable workflow (ADR-0003 deferred item) |

### 3.4 `munaxa/munaxa-docs`

| ID | File | Reference | Class | Why it matters | Recommended action |
| -- | ---- | --------- | ----- | -------------- | ------------------ |
| D-1 | `infra/terraform/README.md:3`, `:106`; `bootstrap/variables.tf:4`, `:21`, `:27`, `:38`; `eu-prod/{core,data,service}/variables.tf:4`; `eu-prod/claude.s3.tfbackend:5` | Account `800728620253` (the management account) for Docs Production; Non-Production VPC `munaxa-docs-nonprod` there too | C | Docs' existing, partly applied production (bootstrap, core, data). ADR-0003 §5 adds no new workloads there and leaves the move to Docs | **Docs ADR** (ADR-0003 F6): move Production to `munaxa-prod`, ideally before it holds customer data, and Non-Production into `munaxa-nonprod` |
| D-2 | `.github/workflows/publish-images.yml:6–8`, `:46`, `:103`, `:124`, `:261`, `:334`, `:440`; `infra/terraform/eu-prod/service/variables.tf:43–68`; `release.auto.tfvars.example:5–7`; `eu-prod/core/iam.tf:47–71`; `eu-prod/core/locals.tf:18` | GHCR images; Terraform validation **requires** `^ghcr\.io/munaxa/munaxa-docs-…@sha256:`; execution roles read a `ghcr-pull-*` secret | C | Docs ADR-0002 D6 / Docs ADR-0024 for Docs production on AWS. ADR-0003 §6 makes ECR the standard but leaves Docs' move to Docs. The repository names already follow `munaxa-docs-<component>` | **Docs ADR** (F6): when adopting ECR, change the variable validation regex, drop the `ghcr-pull` secret from the execution roles, add ECR pull permissions, and add the OIDC publisher |
| D-3 | `docs/architecture/adr/0024-minimum-cost-first-customer-launch.md:37`, `:485`; `docs/architecture/adr/0025-production-email-amazon-ses-smtp.md:47` | "gathered in the non-production account"; "A separate production AWS account … still open" | C | Historical, immutable Docs ADRs. "Non-production account" there means the management account's Non-Production environment. Item 485 is answered at ecosystem level by ADR-0003 §5 for new workloads | Reference ADR-0003 in the Docs ADR from D-1 |
| D-4 | `infra/loadtest/run.mjs:21` | `--base-url https://staging.docs.munaxa.com` | B | An example hostname under `munaxa.com`, the pattern ADR-0003 §7 rejects for non-production | Change the example to `https://docs.munaxa-nonprod.com` when Docs joins `munaxa-nonprod` |
| D-5 | `infra/terraform/eu-prod/data/main.tf:24`, `eu-prod/service/main.tf:12`; 41 × `docs.munaxa.com`, 11 × `api.docs.munaxa.com` across docs | Production hostnames | C | Production stays on `munaxa.com` (ADR-0002 D2, ADR-0003 §7) | None |
| D-6 | `docs/reports/aws-region-validation-eu-central-1.md`, `docs/architecture/adr/0023-…` | `eu-central-1` | D | Same region as ADR-0003 | None |
| D-7 | `apps/api/src/modules/identity/domain/oidc.ts`, `oidc.spec.ts`, `federated-jit-provisioning.integration.spec.ts`, `ARCHITECTURE.md:315`, `apps/api/src/modules/identity/README.md:336–338` | `RS256` | D | Docs verifying **external** identity providers' ID tokens (federation), not Identity's tokens | None |
| D-8 | `apps/api/src/core/config/configuration.spec.ts:79` | `CORS_ORIGINS: 'https://docs.munaxa.com,https://admin.munaxa.com'` | D | Test fixture | None |

### 3.5 `munaxa/munaxa-school`

| ID | File | Reference | Class | Why it matters | Recommended action |
| -- | ---- | --------- | ----- | -------------- | ------------------ |
| S-1 | `.github/workflows/deploy.yml:16–18`, `:28`, `:88`, `:135`, `:140–144`; `docs/deployment-staging.md:188`; `docs/architecture/09-security-architecture.md:118`; `render.yaml:1` | GHCR, GitHub environments `staging`/`production`, Render and Supabase staging, "sha + latest tags" | C | School is not on AWS; this is its own deployment architecture. Its commented-out ECS option (`deploy.yml:143`) pins the task definition to a **sha tag**, where ADR-0003 requires a digest | **School ADR** when School joins AWS: ECR, `aws-nonprod`, digest-only, no `latest` (ADR-0003 F8) |
| S-2 | `.github/workflows/deploy.yml:140–144` | Image names `munaxa-api`, `munaxa-admin` | B | Do not follow `munaxa-<product>-<component>`; they are generic Munaxa names (the image counterpart of ADR-0002 R2) and would collide with another product's | Rename to `munaxa-school-api`/`munaxa-school-admin` with the School move (F8) |
| S-3 | `apps/api/.env.example:44–47`; `apps/api/src/common/storage.service.ts:51–57` | `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` for S3; default region `eu-central-1` | C | Static keys are acceptable off AWS. On ECS ADR-0003 forbids long-lived credentials, so they become a task role. The region is consistent | School ADR (F8) |
| S-4 | `apps/api/.env.example:22`; `render.yaml:39`; ADR-0002 R2 | `app.munaxa.com`, `admin.munaxa.com` | C | Existing School production hostnames. The move to `school.munaxa.com` is ADR-0002 R2, deferred there | School ADR (F8); non-production becomes `school.munaxa-nonprod.com` |
| S-5 | `apps/api/src/config/env.validation.ts:28` vs `apps/api/.env.example:56`, `env.validation.ts:32`, `:38` | Default `EMAIL_FROM` `no-reply@munaxa.app`, while every other sender default is `@mail.munaxa.com` | B | `munaxa.app` returned NXDOMAIN on 2026-10-06; an unset `EMAIL_FROM` would send from an unregistered domain. It is also inconsistent within School | School change (ADR-0003 F3): default to `no-reply@mail.munaxa.com` |

### 3.6 `munaxa/munaxa-platform`

| ID | File | Reference | Class | Why it matters | Recommended action |
| -- | ---- | --------- | ----- | -------------- | ------------------ |
| P-1 | `packages/platform/crypto/src/signing.ts:21`, `:95`, `:131`, `:145`; `test/security.test.ts:106`; `packages/platform/auth/src/tokens.ts:207`; `docs/security-platform/api.md:72`, `production-readiness-audit.md:369` | `RS256` as a supported asymmetric algorithm | D | Library capability. Identity selects ES256 | None |
| P-2 | (no match) | No GHCR, account, region, hostname or environment reference | D | Platform is a build-time library (ADR-0002 binding decision 7), out of scope for deployment naming | None |

## 4. Classification summary

| Class | Count | IDs |
| ----- | ----- | --- |
| **A — Must change** | 2 | I-1, I-2 |
| **B — Documentation stale** | 8 | M-5, M-6, M-7, I-3, I-4, D-4, S-2, S-5 |
| **C — Intentional exception** | 17 | M-1, M-2, M-3, M-4, I-5, I-6, I-7, I-8, W-1, W-5, D-1, D-2, D-3, D-5, S-1, S-3, S-4 |
| **D — Not related** | 11 | I-9, I-10, I-11, W-2, W-3, W-4, D-6, D-7, D-8, P-1, P-2 |
| **Total** | **38** | |

Two items change class later:

- I-5, the alignment note, becomes removable once I-1 and I-2 are done.
- I-8 and W-1, the Render/GHCR files, become B if ADR-0003 or a successor retires Render staging
  (M-5).

## 5. Exact stale references (A and B)

| ID | Repository | Location | Current text | Should become |
| -- | ---------- | -------- | ------------ | ------------- |
| I-1 | munaxa-identity (review chain) | `.github/workflows/publish-ecr.yml:48` | `environment: aws-staging` | `environment: aws-nonprod` (and the comments at `:7`, `:45`, `:62`) |
| I-2 | munaxa-identity (review chain) | `docs/runbooks/ecr-image.md:41`, `:120`, `:152`, `:206`, `:212` | `munaxa/identity-api` | `munaxa-identity-api` |
| I-2 | munaxa-identity (review chain) | `docs/runbooks/ecr-image.md:66`, `:82`, `:90`, `:146` | `aws-staging` (environment and trust `sub`) | `aws-nonprod` |
| I-3 | munaxa-identity (review chain) | `docs/runbooks/ecr-image.md:262`, `:264` | us-east-1 "roughly $7" / "roughly $33" | eu-central-1 $8.76 per endpoint-AZ / $37.96 NAT + $3.65 address |
| I-4 | munaxa-identity (review chain) | `docs/runbooks/aws-staging-architecture.md:1` | "AWS staging architecture" | optional: "AWS non-production architecture" (keep the path) |
| M-5 | munaxa | ADR-0003 | (silent on Render staging) | one sentence on Render staging's future, or an explicit deferral |
| M-6 | munaxa | ADR-0003 `:187` | `aws-<prod>` | `aws-eu-prod`, or "deferred to `munaxa-prod` creation" |
| M-7 | munaxa | ADR-0003 `:15`, `:138` | review-branch citations | `main` commits once merged |
| D-4 | munaxa-docs | `infra/loadtest/run.mjs:21` | `https://staging.docs.munaxa.com` | `https://docs.munaxa-nonprod.com` |
| S-2 | munaxa-school | `.github/workflows/deploy.yml:140–144` | `munaxa-api`, `munaxa-admin` | `munaxa-school-api`, `munaxa-school-admin` |
| S-5 | munaxa-school | `apps/api/src/config/env.validation.ts:28` | `no-reply@munaxa.app` | `no-reply@mail.munaxa.com` |

## 6. Required changes

| Repository | Change | When | Blocks |
| ---------- | ------ | ---- | ------ |
| `munaxa-identity` | I-1, I-2 (rename environment and repository), I-3 (cost figures); remove I-5's note afterwards | Before the first ECR publish; ideally before the review chain merges | The first Identity publish to `munaxa-nonprod` |
| `munaxa` | M-5, M-6, M-7 in ADR-0003 | Before ADR-0003 is accepted (this audit does not edit it) | Nothing at runtime; acceptance clarity |
| `munaxa-work` | W-5: an ECR publish workflow and an `aws-nonprod` environment | When Work is provisioned on AWS | Work's AWS deployment |
| `munaxa-docs` | D-4 (example hostname) | When Docs joins `munaxa-nonprod` | Nothing |
| `munaxa-school` | S-5 (sender default); S-2 with the AWS move | S-5 any time; S-2 with F8 | Nothing now |
| `munaxa-platform` | None | — | — |

## 7. Product ADRs required

| Product | ADR | Content | ADR-0003 follow-up |
| ------- | --- | ------- | ------------------ |
| Identity | Production refresh-cookie hardening | `__Secure-mx_refresh` can be planted by a `munaxa.com` sibling in production | F1 |
| Docs | Accounts and registry | Production to `munaxa-prod`, Non-Production into `munaxa-nonprod` (recreated; resources cannot move); GHCR → ECR (D-2's Terraform validation, IAM and secret changes) | F6 |
| School | AWS adoption | ECR with `munaxa-school-*` names; `aws-nonprod`; task role instead of static S3 keys; runtime or same-origin API URL instead of the build-time one; `school.munaxa.com` hostname (ADR-0002 R2) | F8 |
| Work | None required by ADR-0003 | `munaxa_work_tenant` → `__Host-` is a change, not an ADR (F2). W-5 is implementation | F2 |
| Ecosystem | GHCR's future for dedicated and on-premises delivery | Whether the GHCR workflows in Identity, Work, Docs and School remain a distribution channel | F7 |

## 8. Intentional exceptions

1. **Render staging for Identity and Work** (I-8, W-1, M-4). This is a separate, existing environment
   with GHCR images and a registry credential on Render. It remains valid until ADR-0003 says when
   AWS non-production replaces it (M-5).
2. **Docs on AWS in the management account with GHCR** (D-1, D-2, D-3). This is existing, accepted
   production architecture (Docs ADR-0022–0025), partly applied. ADR-0003 adds no workloads there
   and leaves the move to a Docs ADR.
3. **School on Render and Supabase with GHCR, `staging`/`production` environments and static S3
   keys** (S-1, S-3, S-4). Not AWS; adoption is School's ADR.
4. **Production hostnames on `munaxa.com`** (D-5, S-4). Unchanged by ADR-0003.
5. **ADR-0002's GHCR, DNS and RS256 statements** (M-1, M-2, M-3). Immutable; superseded or
   corrected by ADR-0003 §13 on acceptance.
6. **Rejected-option text in the Identity architecture document** (I-6). Kept as the decision record.
7. **`RS256` as a supported algorithm** in Platform and Work, and Docs' federation verifier (P-1, W-2,
   D-7). Capability, not configuration; Identity signs ES256.

## 9. Blocking inconsistencies

**For acceptance of ADR-0003: none.** No application, workflow or infrastructure code on any `main`
branch contradicts it. M-5, M-6 and M-7 are recommended clarifications, not contradictions.

**For the first AWS deployment: two, both in Identity's unmerged review chain.**

1. **I-1:** the ECR workflow requests an OIDC token for `environment:aws-staging`. A role trusting
   ADR-0003's `aws-nonprod` refuses it.
2. **I-2:** the ECR runbook would have the provisioner create `munaxa/identity-api` and a trust
   policy for `aws-staging`.

Both are configuration and documentation; neither needs application code.

## 10. Recommended order for future cleanup

1. **ADR-0003 clarifications (M-5, M-6)**, then acceptance. The names everything else aligns to
   become binding.
2. **Identity I-1, I-2, I-3, then remove I-5's note.** On `claude/identity-ecr-publish`, carried
   through its descendants.
3. **Merge the Identity review chain**, then update ADR-0003's citations to `main` commits (M-7), if
   it is not yet accepted.
4. **Provisioning** (ADR-0003 F4): `munaxa-nonprod`, SCP baseline, `munaxa-nonprod.com`, Identity's
   ECR repository, publisher role and `aws-nonprod` environment, then the first publish.
5. **Work W-5** when Work is deployed to `munaxa-nonprod`.
6. **Render staging retirement** (if M-5 says so), then reclassify I-8 and W-1.
7. **Identity F1 ADR** (production cookie hardening) and **Work F2** before Work production.
8. **Docs ADR (F6)** at Docs' timing; D-4 with it.
9. **School S-5** at any time; **School ADR (F8)** with S-2 when School moves to AWS.
10. **Ecosystem F7** (GHCR for dedicated and on-premises) when the first such customer is in sight.
