# ADR-0001 — Munaxa Identity is a sixth peer product

**Status** Accepted
**Date** 2026-09-01
**Scope** Ecosystem — governs `munaxa`, `munaxa-platform`, `munaxa-school`, `munaxa-work`,
`munaxa-docs` and the repository this ADR admits
**Governs** [`PLATFORM_ENGINEERING_STANDARDS.md`](../../PLATFORM_ENGINEERING_STANDARDS.md), whose
§2 definition of a product and §4 dependency rules this decision applies rather than amends

## Context

`PLATFORM_ENGINEERING_STANDARDS.md` enumerates five repositories and says development happens
inside products. Nothing in it contemplates a product whose domain is identity itself, and the
question only became answerable once Munaxa Work needed to authenticate somebody.

Work's ADR-0001 says Platform owns authentication. That sentence has no referent today: the
platform ships authentication *libraries* and no authentication *service*. Work therefore
verifies tokens that nothing issues, and staging cannot exist. Three candidate homes for the
missing issuer were examined against the repositories rather than against preference.

**Platform cannot own it.** `docs/security-platform/README.md` states the principle — "Node
built-ins only. No database driver, no Redis client, no email vendor, no cloud SDK appears in any
package" — and `architecture.md` states the consequence: "Products own their data.
`CredentialRecord` is a *projection* of a product's user table … The platform never migrates a
schema, never owns a table and never requires one to be shaped a particular way." An
authentication service is durable state before it is anything else: accounts, sessions, refresh
lineages, roles. Putting them in `munaxa-platform` would require the one dependency the whole
repository is organised to exclude, and would break every product that deploys it somewhere the
driver cannot go. The platform is also frozen (§3); this is not a proven cross-product
requirement *of the shared layer*, it is a missing product.

**Work cannot own it.** Platform's own migration guide for Work proposes exactly that — implement
`UserDirectoryPort` over the Work user table, add session and refresh tables, wire `LoginService`
— and it is wrong for Work specifically. Work's ADR-0001 places authentication outside the
product; its ADR-0030 and ADR-0077 spend real complexity keeping the application role
unprivileged; and a product that holds password hashes for people who also use Docs and School
has quietly become the ecosystem's identity provider without being designed as one. The
disagreement between that guide and Work's ADR-0001 is the reason this ADR exists, and it is
recorded here rather than resolved silently in either repository.

**A shared package cannot own it.** §4 rule 3 — "Products MUST NEVER import another product" — is
absolute, and a package consumed by Docs, School and Work would leave each of them with its own
account store anyway. It solves nothing and costs the rule.

## Decision

**`munaxa-identity` is admitted as a sixth repository and a peer product.** Its domain is
identity: who somebody is, and what they are permitted to do. It satisfies §2's definition
without amendment — a complete, independently deployable system with its own domain model,
database, API and deployment, consuming the platform and owning no other product's data.

Ownership is exhaustive and has no overlap:

| | Owns |
| --- | --- |
| **Platform** | Security primitives and ports. No durable state, no driver, no endpoint. |
| **Identity** | Accounts, credentials, sessions, refresh lineages, roles, assignments, its own audit trail, and the authentication service. |
| **Work** | `workforce_user`, `tenant_membership`, business data, the Work permission vocabulary, Work tenant isolation. No credential, no session, no signing key. |

**Products communicate through protocols and artifacts, never imports.** Identity issues a signed
access token; Work verifies it with a configured public key. Work publishes its permission
catalogue as a generated JSON artifact; Identity reads the artifact. Neither repository appears in
the other's `package.json`, which keeps §4 rule 3 intact under a genuine runtime dependency — and
is why the catalogue is an artifact rather than the `@work/permissions` package that would
otherwise be the obvious design.

**Docs and School are not migrated.** Both own working identity implementations —
`munaxa-docs` has accounts, roles, refresh families, MFA and federation in production shape;
`munaxa-school` has accounts and an administrative bootstrap. Migrating either is a product
change with a data migration, a client contract change and a rollback story, and neither product
asked for it. Nothing in this ADR obliges them, and Identity is not "the Munaxa identity provider"
until they do.

**Consolidation is a future decision.** It needs its own ADR, its own evidence and its own owner.
Recording it as open is the point: an identity product that quietly grows an expectation that two
other products will eventually adopt it has made a commitment nobody agreed to.

## Consequences

- The ecosystem is six repositories. `PLATFORM_ENGINEERING_STANDARDS.md` §2's product definition
  covers the new one unchanged; its five-repository enumeration is now a list of examples rather
  than a closed set, and this ADR is the record of that.
- Work needs no authentication code. Its Phase 2–6 seam — configured public keys, `perms`-only
  authorization, `tid` ignored — is already the correct consumer of this architecture.
- Identity inherits the operational obligations of an authority: key rotation, revocation
  latency, and an audit trail. They are documented in `munaxa-identity/docs/`.
- One browser origin is required for staging, because the platform's session cookie carries the
  `__Host-` prefix and is therefore host-only. Separate services behind one public origin
  satisfies it; merging the applications is not required and is not done.
- A revoked grant reaches Work only when the access token expires. That window is stated in
  Identity's runbook rather than left to be discovered.

## Options considered

| Option | Why not |
| --- | --- |
| **A. Platform hosts the service** | Requires a database driver in a repository whose stated principle excludes one, and product data in a layer that owns none. Frozen besides. |
| **B. Work hosts it** | Contradicts Work's ADR-0001, gives one product custody of ecosystem-wide credentials, and makes the repository boundary a fiction. |
| **C. A shared package** | Violates §4 rule 3 absolutely, and still leaves an account store in every product. |
| **D. An external IdP alone** | Removes password storage but still needs a hosted service to own sessions, refresh lineages and role assignments. Reduces the work; does not remove the product. Remains available *inside* Identity via `IdentityProviderPort`. |
| **E. A sixth peer product** | **Chosen.** |
