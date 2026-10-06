# Runbook — provisioning the `munaxa-nonprod` AWS account

**Implements:** [ADR-0003](../adr/0003-aws-non-production-foundation.md) §5 (account model) and §8
(security rationale); follow-up F4. **Status:** ready to execute once the prerequisites in §1 are
met. **Not yet executed:** nothing in this runbook has been run against AWS. Two discovery attempts on
2026-10-06 were blocked by AWS connector authorization (see "Execution record" at the end).

**Scope.** This runbook covers only:

- the account itself;
- its organizational unit;
- the organization-level guardrails (SCPs);
- root-user handling;
- verification.

It creates **no application infrastructure** (§8). Every command runs from the **Organizations
management account** unless stated otherwise. Every identifier in angle brackets (`<ROOT_ID>`,
`<NEW_ACCOUNT_ID>`, …) is read from AWS during execution and is never guessed.

**Cost.** Organizations, member accounts, OUs, SCPs, IAM and centralized root access are free (_"AWS
Organizations is offered at no additional charge"_, Organizations user guide). **No step in §2–§7
creates a resource with a charge.** The one optional step that would (§6.5, a CloudTrail trail's S3
storage, cents) is marked and deferred.

---

## 1. Prerequisites

### 1.1 Access

| Need | Why | Status at time of writing |
| --- | --- | --- |
| A principal in the **management account** with Organizations administration (`organizations:*` read, `CreateOrganizationalUnit`, `CreateAccount`, `DescribeCreateAccountStatus`, `MoveAccount`, `CreatePolicy`, `AttachPolicy`, `EnablePolicyType`, `TagResource`), plus `iam:CreateServiceLinkedRole` and the IAM organization root-access actions in §5 | Account creation and SCPs can only be done from the management account | **Not available.** The connector is signed in as the management account's root user, and root is not used for this. No scoped principal exists (§1.3) |
| The **root email address** for the new account: a mailbox Munaxa controls, used by no other AWS account (a role address or distribution list, not a person's private mailbox) | `CreateAccount` requires it, and it is the account's recovery channel | **Missing.** It must be chosen by the owner; this runbook does not invent one |

### 1.2 Inspect the organization (read-only)

Run all of these before any change, and record the results in the execution record. Each line names
the value that lets you proceed. **If any "stop" condition holds, stop and report. Do not weaken the
design to fit.**

```bash
aws sts get-caller-identity
#   Account must be the management account. Docs documents it as 800728620253 (munaxa-docs
#   infra/terraform/README.md); confirm, do not assume.

aws organizations describe-organization
#   FeatureSet must be "ALL".            STOP if "CONSOLIDATED_BILLING": SCPs are unavailable (ADR-0003 §12).
#   MasterAccountId must equal the caller's account.

aws organizations list-roots
#   Record <ROOT_ID>. PolicyTypes: note whether SERVICE_CONTROL_POLICY is ENABLED (see §6.1).

aws organizations list-organizational-units-for-parent --parent-id <ROOT_ID>
aws organizations list-accounts
aws organizations list-parents --child-id <ACCOUNT_ID>        # for each account
#   Record the full tree. STOP if an account named munaxa-nonprod (or with the intended root email) already exists.

aws organizations list-policies --filter SERVICE_CONTROL_POLICY
aws organizations list-targets-for-policy --policy-id <POLICY_ID>   # for each policy
aws organizations describe-policy --policy-id <POLICY_ID>           # for each non-AWS-managed policy
#   Record existing SCPs, where they are attached, and any existing region restriction.
#   STOP if an existing SCP at the root would deny what §6 must allow (eu-central-1, IAM roles, OIDC, route53domains).

aws organizations list-aws-service-access-for-organization
#   Note whether iam.amazonaws.com (centralized root access, §5) and cloudtrail.amazonaws.com are enabled.

aws service-quotas list-service-quotas --service-code organizations --region us-east-1
#   Find the "maximum number of accounts" quota (default 10) and compare it with list-accounts.
#   STOP if creating one more account would exceed it; request an increase first.

aws organizations list-create-account-status --states IN_PROGRESS FAILED
#   Note any earlier failed or in-flight attempt.
```

**Expected baseline, from repository evidence only.** The Organizations management account is
`800728620253`. It hosts Docs Production and Docs Non-Production (`munaxa-docs`
`infra/terraform/README.md`; Docs ADR-0024). Those Docs resources are **not touched** by this
runbook: SCPs never apply to the management account (_"SCPs don't affect users or roles in the
management account"_), and every guardrail below is attached to the new OU only.

### 1.3 Management-account principal assessment (2026-10-06T10:03Z)

**Rule.** No Organizations discovery or write operation runs as the management account's root user.
The checks below are read-only IAM and IAM Identity Center calls, made only to find out whether a
scoped principal already exists. **No Organizations API was called.**

**Calls made**, all read-only:

- `sts:GetCallerIdentity`;
- `iam:ListRoles`, `ListUsers`, `ListPolicies` (×2), `GetRole`, `ListAttachedRolePolicies`,
  `GetPolicyVersion` (×4);
- `iam:ListAttachedUserPolicies`, `ListUserPolicies`, `ListGroupsForUser` (×3 each);
- `sso-admin:ListInstances` in `eu-central-1`, `us-east-1`, `eu-west-1` and `me-central-1`.

#### Verified current state

| Item | Finding |
| --- | --- |
| **Connector identity** | `arn:aws:iam::800728620253:root`, the root user of management account `800728620253` |
| IAM Identity Center | **No instance** in `eu-central-1`, `us-east-1`, `eu-west-1` or `me-central-1` (other Regions not checked) |
| Roles a human or agent can assume | One: `munaxa-docs/bootstrap/munaxa-docs-eu-prod-deployer`. It trusts IAM users `claude-munaxa-docs` and `admin.tamer` (source identity and session-name conditions) |
| That role's Organizations access | **Denied.** Its guardrail policy `munaxa-docs-eu-prod-deployer-guardrails-identity` has `Deny organizations:*` (Sid `NoOrganizationsBillingOrAccountSecurityControls`), under the `munaxa-docs-eu-prod-deployer-boundary` permissions boundary. It is Docs Production's deployer and **unsuitable**; it must not be repurposed |
| Other roles | 15 workload roles (ECS execution and task, Backup, Scheduler, RDS monitoring), all trusted by AWS services only, plus 8 service-linked roles (including `AWSServiceRoleForOrganizations`). None is suitable |
| IAM users | `admin.tamer` (`AdministratorAccess`), `claude-munaxa-docs` (`AdministratorAccess`), `munaxa-docs-ses-smtp` (inline `ses-send-only`). The first two can do Organizations administration, but they are **unscoped** (full administrator), so they do not meet the requirement |
| Customer-managed policies | 11, all Docs Production deployer policies or boundaries under `/munaxa-docs/bootstrap/`. None grants scoped Organizations access |
| Read-only Organizations role | **None exists** |
| Can the connector use a scoped role? | **No.** None exists, and the connector is signed in as root. A root session cannot assume IAM roles, so a role would also require the connector to be signed in as a non-root principal |

**Incidental observations, not acted on:**

- Two IAM users with `AdministratorAccess` exist in the management account. They are Docs' existing
  setup (`munaxa-docs` `infra/terraform/README.md`: _"Both administrator users keep
  AdministratorAccess"_).
- `munaxa-docs-nonprod-ecs-execution-role` and `-task-role` trust ECS in **`me-central-1`**, while
  the `munaxa-docs-eu-nonprod-*` roles trust `eu-central-1`. That is a Docs matter (ADR-0003 F6).

#### Result: **BLOCKED** — a scoped management principal must be established

The exact blocker: no principal exists in the management account that has Organizations access
limited to what this runbook needs, and the connector is authenticated only as root. Nothing was
created. No IAM user, access key or role is created without explicit authorization.

#### Proposed principal (not created; needs explicit authorization)

**Mechanism (recommended): IAM Identity Center** in `eu-central-1` (free), with one permission set
and the connector signed in through it. That gives no long-lived credentials and no IAM user, which
fits ADR-0003's rule.

The alternative is an IAM role in the management account, under path `/munaxa-org/`, assumed from a
non-root sign-in. Which option is usable depends on how the AWS connector can be signed in; check
its settings before choosing.

Either way, two separately grantable policies are needed:

**`munaxa-org-discovery`** (read-only; enough for §1.2):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OrganizationsReadOnly",
      "Effect": "Allow",
      "Action": ["organizations:Describe*", "organizations:List*"],
      "Resource": "*"
    },
    {
      "Sid": "OrganizationsQuotasReadOnly",
      "Effect": "Allow",
      "Action": ["servicequotas:ListServiceQuotas", "servicequotas:GetServiceQuota"],
      "Resource": "*"
    },
    { "Sid": "WhoAmI", "Effect": "Allow", "Action": "sts:GetCallerIdentity", "Resource": "*" }
  ]
}
```

**`munaxa-org-nonprod-provisioning`** (granted only when §2–§6 are approved; exactly the operations
those sections use):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NonProdOuAccountAndScps",
      "Effect": "Allow",
      "Action": [
        "organizations:CreateOrganizationalUnit",
        "organizations:CreateAccount",
        "organizations:DescribeCreateAccountStatus",
        "organizations:MoveAccount",
        "organizations:TagResource",
        "organizations:EnablePolicyType",
        "organizations:CreatePolicy",
        "organizations:AttachPolicy"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TrustedAccessForCentralRootManagementOnly",
      "Effect": "Allow",
      "Action": "organizations:EnableAWSServiceAccess",
      "Resource": "*",
      "Condition": { "StringEquals": { "organizations:ServicePrincipal": "iam.amazonaws.com" } }
    },
    {
      "Sid": "CentralRootAccessManagement",
      "Effect": "Allow",
      "Action": [
        "iam:EnableOrganizationsRootCredentialsManagement",
        "iam:EnableOrganizationsRootSessions",
        "iam:ListOrganizationsFeatures"
      ],
      "Resource": "*"
    },
    {
      "Sid": "OrganizationsServiceLinkedRoleOnly",
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "*",
      "Condition": { "StringEquals": { "iam:AWSServiceName": "organizations.amazonaws.com" } }
    }
  ]
}
```

Notes:

- **What is not granted.** No `AdministratorAccess`, no `*:*`, nothing in EC2, RDS, ECS, ECR,
  Route 53 or ACM, no `DetachPolicy`/`DeletePolicy`/`CloseAccount`. Rollback (§9) uses a separately
  authorized session.
- **Tighten after discovery.** Once §1.2 has returned `<ROOT_ID>` and the policy IDs, `AttachPolicy`,
  `MoveAccount` and `CreateOrganizationalUnit` can be limited to the root, the `NonProduction` OU and
  the three `munaxa-nonprod-*` policies by ARN.
- **Order.** Grant only `munaxa-org-discovery` first, run §1.2, and grant the provisioning policy
  only when creation is approved.

### 1.4 AWS connector authentication capability (2026-10-06T10:34Z)

The check used AWS documentation, read through the connector's documentation tools, and the
connector's own tool interface. No AWS API call was made, and nothing was created or changed.

**Sources:**

- AWS Sign-In User Guide, "Configure OAuth access to AWS MCP Server" and "Sign-In with OAuth 2.0";
- "AWS Sign-In condition keys reference";
- AWS Security Blog, "Introducing OAuth Support for AWS MCP Server" (2026-07-09);
- AWS MCP Server guide, "Setting up the AWS MCP Server".

| Question | Finding |
| --- | --- |
| How the connector authenticates | **Interactive OAuth 2.1 through AWS Sign-In**, browser-based (authorization code with PKCE). `https://claude.ai/*` is an approved redirect URI for Claude. Access tokens last up to one hour and are refreshed automatically with rotating refresh tokens |
| Identities interactive sign-in accepts | _"IAM users; AWS account root users; IAM Identity Center users; SAML and Custom Identity broker users"_ (Sign-In with OAuth 2.0) |
| **IAM Identity Center / SSO** | **Supported.** The Security Blog lists it among the three interactive sign-in methods (_"managed access through AWS IAM Identity Center for enterprises"_) |
| Can it use an Identity Center permission set? | **Yes, by implication.** An Identity Center sign-in produces a session for one account and one permission set, and the connector acts with exactly that session's permissions. The Sign-In page's exact steps for choosing the account and permission set during OAuth are **not documented in the pages read**, and are confirmed at first sign-in |
| **Assumed role** | **Supported only as the signed-in identity**, through federation (a SAML or custom identity broker) into a role. AWS's own CloudTrail examples show an `AssumedRole` session (`assumed-role/Admin/…`) authorizing the MCP Server |
| Switching to a role mid-session | **Not supported by this connector.** `run_script`/`call_boto3` accept no credentials, profile or role parameter. AWS documents multi-profile switching only for the local SigV4 proxy (_"Multi-profile switching is only available with SigV4 authentication"_), not for the hosted OAuth connector. Root could not assume a role anyway |
| Reconnecting with different credentials | **Yes.** Disconnect the AWS connector in the claude.ai connector settings and authorize again, signing in as the other identity. An existing AWS Sign-In browser session is reused, so sign out of the root session first |
| Browser sign-in required | **Yes** for this connector. Non-interactive client-credentials tokens need existing SigV4 credentials, which this cloud session does not hold and must not hold |
| Permissions the signed-in identity needs | `signin:AuthorizeOAuth2Access` and `signin:CreateOAuth2Token` on `arn:aws:signin:*:*:service-principal/aws-mcp.amazonaws.com` (AWS-managed `AWSMCPSignInOAuthAccessPolicy`), plus the AWS permissions for the work itself. **Root needs none**, which is why the connector worked as root without setup |
| Documented restrictions on root | **None.** Root is an explicitly supported OAuth identity. Sign-In resource-based policies and RCPs can condition on `aws:PrincipalArn`/`signin:PrincipalArn`, so root could be denied OAuth. However, RCPs, like SCPs, do not affect the management account, and whether a Sign-In resource policy can bind the management account's root was **not verified**. In practice the restriction is procedural: this runbook does not run as root (§1.3) |
| Governance available | Sign-In condition keys: `signin:OAuthClientId`, `signin:OAuthRedirectUri`, `signin:OAuthGrantType`. `aws:SignInSessionArn` lets one OAuth session be denied. All OAuth activity is in CloudTrail |

#### Decision: **CONNECTOR SUPPORTS IAM IDENTITY CENTER**

Identity Center is the recommended mechanism for this project:

- it needs no IAM user and no access key, as ADR-0003 requires;
- it is free;
- it is the mechanism AWS names for this connector;
- it is reusable later for human access to `munaxa-nonprod` and `munaxa-prod`.

A federated role would need an external identity provider (SAML or a custom broker) that Munaxa
does not have. A console role switch from an IAM user would need an IAM user, which is excluded.

**What has to exist before reconnecting** (none of it is created yet; each step needs explicit
authorization):

1. An **IAM Identity Center organization instance**, enabled from the management account. The home
   Region is a choice: `eu-central-1` matches ADR-0003. Enabling it is free.
2. An **Identity Center user** for the operator, with an email address the owner chooses, and MFA
   required.
3. A **permission set**, for example `MunaxaOrgDiscovery`, containing:
   - `munaxa-org-discovery` (§1.3) as an inline policy;
   - `signin:AuthorizeOAuth2Access` and `signin:CreateOAuth2Token` on
     `arn:aws:signin:*:*:service-principal/aws-mcp.amazonaws.com`, restricted with
     `signin:OAuthRedirectUri` `https://claude.ai/*`;
   - a short session duration (one hour).

   `munaxa-org-nonprod-provisioning` (§1.3) goes into a **second** permission set, assigned only when
   creation is approved.
4. An **assignment** of that user and permission set to the management account `800728620253`.

Identity Center does not avoid root for the first step. Enabling Identity Center, creating the
permission set and assigning it are themselves management-account changes, and today only root or
the two `AdministratorAccess` IAM users can make them. That bootstrap is the owner's to perform, or to
authorize explicitly. It is the last time a root or administrator session is needed for this work.

**Reconnecting afterwards:**

1. Sign out of the AWS console root session.
2. Disconnect the AWS connector in claude.ai connector settings, and connect it again.
3. At AWS Sign-In, choose IAM Identity Center sign-in, sign in as the Identity Center user, and
   select account `800728620253` with `MunaxaOrgDiscovery`.
4. Approve the request.
5. Verify with `sts:GetCallerIdentity`. The expected ARN has the form
   `arn:aws:sts::800728620253:assumed-role/AWSReservedSSO_MunaxaOrgDiscovery_<suffix>/<user>`.

**Then** §1.2 discovery can run.

### 1.5 IAM Identity Center discovery access — bootstrap (2026-10-06T10:37Z)

**Authorized** by the owner: an Identity Center instance in `eu-central-1`, one dedicated operator
user with MFA, the `MunaxaOrgDiscovery` permission set (discovery plus OAuth sign-in permissions only),
and its assignment to `800728620253`. Nothing else is authorized.

**Result: nothing was created. Two blockers were found before the first change.**

| # | Blocker | Evidence | Needed from the owner |
| - | ------- | -------- | --------------------- |
| 1 | **The Identity Center organization instance cannot be created through the API in a management account.** The connector's only route is the API | `sso-admin:CreateInstance`: _"The CreateInstance request is rejected if … the instance is created within the organization management account"_ (AWS SDK reference for `SSOAdmin.CreateInstance`). An organization instance is enabled from the IAM Identity Center console | Enable it in the console (steps below) |
| 2 | **No operator email address has been supplied.** Identity Center users need one, and it is the sign-in and recovery channel | Not in the task or the repositories. It is not invented, and no existing identity's address is reused | Supply a dedicated mailbox Munaxa controls (a role address, not `admin.tamer` or `claude-munaxa-docs`) |

**Read-only calls made:**

- `ec2:DescribeRegions` (18 enabled Regions);
- `sso-admin:ListInstances` in each of the 18 Regions. **No instance exists in any Region.**

No Organizations API was called. Nothing was created or changed: no Identity Center instance, user,
permission set, assignment, IAM user, access key or policy.

#### Owner action A: enable the organization instance (console only)

1. Sign in to the AWS console for account `800728620253`. This is the one remaining privileged
   session: root or an existing administrator.
2. Switch the console Region to **Europe (Frankfurt) `eu-central-1`**. The Region chosen here
   becomes the instance's permanent home Region.
3. Open **IAM Identity Center** and choose **Enable**. When offered, choose the **organization
   instance**, not an account instance.
   - If the console says AWS Organizations "all features" must be enabled first, **stop**. That is
     also an ADR-0003 prerequisite (§1.2), and enabling it is a separate decision.
4. Leave the identity source as the **Identity Center directory**, the default.
5. Under **Settings → Authentication → Multi-factor authentication**, confirm or set:
   - MFA every time they sign in;
   - authenticator apps and security keys allowed;
   - users without a device must register one at sign-in.
6. Note the **AWS access portal URL** shown on the dashboard (`https://<identifier>.awsapps.com/start`)
   and record it here.

Enabling the instance is free, and adds the Identity Center service-linked role and trusted access
for `sso.amazonaws.com` in Organizations. Those are the instance's own prerequisites, not additional
resources.

#### Owner action B: the operator, permission set and assignment

Two options:

- **B1:** the owner supplies the operator email, and Claude creates the user, the permission set and
  the assignment through the API once the instance exists. That means `identitystore:CreateUser`,
  `sso-admin:CreatePermissionSet`, `PutInlinePolicyToPermissionSet`, `CreateAccountAssignment` and
  `ProvisionPermissionSet`.
- **B2:** the owner creates them in the console from the definitions below.

Either way, MFA is registered by the operator at first sign-in. It cannot be registered on a user's
behalf.

| Item | Definition |
| --- | --- |
| Operator user | Username `munaxa-org-operator`; display name "Munaxa organization operator"; email `<OPERATOR_EMAIL>` (owner-supplied). A dedicated identity used for nothing else. It gets a password through the console's "send email" or one-time-password setup, then registers MFA at first sign-in |
| Permission set | `MunaxaOrgDiscovery`; description "Read-only AWS Organizations discovery for ADR-0003 (no writes)"; session duration **PT1H**; **no** AWS-managed or customer-managed policies attached; **no** permissions boundary needed (the inline policy is the whole grant) |
| Assignment | User `munaxa-org-operator` → account `800728620253` → `MunaxaOrgDiscovery`. Nothing else |
| Not created | The provisioning permission set (`munaxa-org-nonprod-provisioning`, §1.3) and any other assignment |

**`MunaxaOrgDiscovery` inline policy**, the complete grant:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OrganizationsReadOnly",
      "Effect": "Allow",
      "Action": ["organizations:Describe*", "organizations:List*"],
      "Resource": "*"
    },
    {
      "Sid": "OrganizationsQuotaRead",
      "Effect": "Allow",
      "Action": "servicequotas:ListServiceQuotas",
      "Resource": "*"
    },
    {
      "Sid": "AwsMcpOAuthAuthorizeFromClaudeOnly",
      "Effect": "Allow",
      "Action": "signin:AuthorizeOAuth2Access",
      "Resource": "arn:aws:signin:*:*:service-principal/aws-mcp.amazonaws.com",
      "Condition": { "StringLike": { "signin:OAuthRedirectUri": "https://claude.ai/*" } }
    },
    {
      "Sid": "AwsMcpOAuthTokensFromClaudeOnly",
      "Effect": "Allow",
      "Action": "signin:CreateOAuth2Token",
      "Resource": "arn:aws:signin:*:*:service-principal/aws-mcp.amazonaws.com",
      "Condition": {
        "StringLike": { "signin:OAuthRedirectUri": "https://claude.ai/*" },
        "StringEquals": { "signin:OAuthGrantType": ["authorization_code", "refresh_token"] }
      }
    }
  ]
}
```

How these conditions were chosen:

- **Which keys apply to which action.** `signin:OAuthRedirectUri` applies to both actions;
  `signin:OAuthGrantType` applies only to `CreateOAuth2Token` (AWS Sign-In condition keys reference).
  The two actions are therefore in separate statements, so the grant-type condition never meets an
  action that lacks the key, which would otherwise deny it. AWS's own localhost example puts both
  conditions in one statement.
- **What the conditions exclude.** The grant-type list excludes `client_credentials`, so no headless
  token can be minted with these permissions. The redirect condition limits tokens to Claude's
  documented redirect URI.
- **Check at first connection.** If the hourly token refresh fails (that is, if AWS omits the
  redirect URI on a `refresh_token` exchange), remove only the `StringLike` condition from
  `AwsMcpOAuthTokensFromClaudeOnly` and record the change here. Do not widen anything else.
- **`sts:GetCallerIdentity`** needs no permission and is not granted.

#### Verification once created (to run then; not run now)

1. `sso-admin:ListInstances` in `eu-central-1` shows one instance, owned by `800728620253`.
2. `identitystore:ListUsers` shows `munaxa-org-operator`.
3. `sso-admin:DescribePermissionSet`, `GetInlinePolicyForPermissionSet`,
   `ListManagedPoliciesInPermissionSet` and `ListCustomerManagedPolicyReferencesInPermissionSet`
   show the policy above and **nothing else**: no `AdministratorAccess`, no managed policy.
4. `sso-admin:ListAccountAssignments` for `800728620253` and `MunaxaOrgDiscovery` shows exactly the
   operator.
5. `iam:ListUsers` still shows exactly `admin.tamer`, `claude-munaxa-docs` and
   `munaxa-docs-ses-smtp`, with no new access keys (`iam:ListAccessKeys`). The IAM roles are the 24
   from §1.3 plus Identity Center's own: `AWSServiceRoleForSSO` and one
   `AWSReservedSSO_MunaxaOrgDiscovery_*` role.

#### Reconnecting the AWS connector (after A and B)

| Item | Value |
| --- | --- |
| Identity Center home Region | `eu-central-1` |
| Management account | `800728620253` |
| Operator identity | `munaxa-org-operator` (`<OPERATOR_EMAIL>`) |
| Permission set | `MunaxaOrgDiscovery` |
| Access portal | `<ACCESS_PORTAL_URL>`, recorded in action A step 6 |
| MFA | **Required.** It is registered at first portal sign-in and completed on every sign-in |

**Flow:**

1. **Sign out of the root session.** Sign out of the AWS console and close any AWS tabs. AWS Sign-In
   reuses an active session, so a lingering root session would authorize the connector as root
   again.
2. Open the access portal URL, sign in as `munaxa-org-operator`, and complete MFA.
3. **Disconnect and reconnect the connector.** In claude.ai, go to **Settings → Connectors → AWS**,
   disconnect it, then connect it again. The connector opens AWS Sign-In in the browser.
4. **Sign in through Identity Center.** At AWS Sign-In, choose the IAM Identity Center option (or
   continue the portal session from step 2). Select account `800728620253` and permission set
   `MunaxaOrgDiscovery`, then review and approve the authorization request. The exact screens are
   not documented in the pages consulted (§1.4); follow the prompts, and do not choose root or an
   IAM user.
5. **Confirm the identity.** Ask Claude to run `sts:GetCallerIdentity`. The expected `Arn` is
   `arn:aws:sts::800728620253:assumed-role/AWSReservedSSO_MunaxaOrgDiscovery_<suffix>/munaxa-org-operator`.
   **Any other ARN, root included, means stop.**

**Remaining gate:** Organizations discovery (§1.2) starts only after step 5 shows the
`MunaxaOrgDiscovery` session.

### 1.6 Discovery identity — created (2026-10-06T11:23Z)

**Instance (enabled by the owner in the console, 2026-10-06T10:46:58Z):**

| Item | Value |
| --- | --- |
| Instance | `ssoins-6987a5ab7f1b6dbb` (`arn:aws:sso:::instance/ssoins-6987a5ab7f1b6dbb`), `ACTIVE`, organization instance |
| Owner account | `800728620253` (management) |
| Organization | `o-qzf8irwaya` (owner-confirmed; not yet read from Organizations) |
| Primary Region | `eu-central-1` |
| Identity source | Identity Center directory, identity store `d-99674e1617` |
| Multi-account permissions | Enabled |
| Encryption | AWS-owned key |

**Created through the API**, authorized by the owner. The caller was the management account's root
user, the one-time bootstrap anticipated in §1.4.

| Time (UTC) | Object | Result |
| --- | --- | --- |
| 11:23 | Identity Center user `munaxa-org-operator` | User ID `83a408d2-70f1-702d-a1bc-aff83b24d510`. Display name "Munaxa organization operator", email `admin@munaxa.com` (owner-supplied) |
| 11:23 | Permission set `MunaxaOrgDiscovery` | `arn:aws:sso:::permissionSet/ssoins-6987a5ab7f1b6dbb/ps-20c7894c9f2223bf`. Session duration `PT1H`. Tags `Project=Munaxa`, `Purpose=ADR-0003-org-discovery` |
| 11:23 | Inline policy on `MunaxaOrgDiscovery` | Exactly the §1.5 policy: `organizations:Describe*`, `organizations:List*`, `servicequotas:ListServiceQuotas`, `signin:AuthorizeOAuth2Access` (redirect `https://claude.ai/*`), and `signin:CreateOAuth2Token` (redirect `https://claude.ai/*`, grant types `authorization_code` and `refresh_token`). Both `signin` actions are limited to `arn:aws:signin:*:*:service-principal/aws-mcp.amazonaws.com` |
| 11:23:27 | Account assignment | `munaxa-org-operator` → `800728620253` → `MunaxaOrgDiscovery`. Request `2429d001-8b2d-483d-b7c3-a8235084e85d`, `SUCCEEDED` |

**Verification (read-only, immediately afterwards):**

| # | Check | Result |
| - | ----- | ------ |
| 1 | Identity store users | Exactly one: `munaxa-org-operator`, `admin@munaxa.com` ✅ |
| 2 | Permission sets in the instance | Exactly one: `MunaxaOrgDiscovery`, `PT1H` ✅ |
| 3 | Its policies | The inline policy above, byte-for-byte as defined. **No** AWS-managed policies, **no** customer-managed policy references, **no** permissions boundary (`GetPermissionsBoundaryForPermissionSet`: "PermissionsBoundary not present") ✅ |
| 4 | Assignments | One: `USER 83a408d2-…` on `800728620253`. `ListAccountsForProvisionedPermissionSet` returns only `800728620253`, and `ListPermissionSetsProvisionedToAccount` returns only `MunaxaOrgDiscovery` ✅ |
| 5 | AdministratorAccess | Not attached anywhere in the permission set. The provisioned IAM role `AWSReservedSSO_MunaxaOrgDiscovery_4ae1c821d8802e94` (path `/aws-reserved/sso.amazonaws.com/eu-central-1/`) has **no** attached managed policy, only `AwsSSOInlinePolicy` ✅ |
| 6 | IAM users and keys | Unchanged from the pre-change baseline: `admin.tamer` (no keys), `claude-munaxa-docs` (1 key, created 2026-10-04), `munaxa-docs-ses-smtp` (1 key, created 2026-10-05). **No IAM user or access key created** ✅ |
| 7 | IAM roles | 25 before, 26 after. The only addition is the Identity Center-managed `AWSReservedSSO_MunaxaOrgDiscovery_*` role that the assignment provisions (expected, §1.5). `AWSServiceRoleForSSO` was already present from the owner's enablement ✅ |
| 8 | Out of scope | No Organizations API called, no second permission set, no change to Docs roles or users, and no account, OU, SCP or application resource created ✅ |

**MFA:**

- **Instance setting.** It is not exposed through any API used here, and it was not changed. AWS documents it as on by default for a new instance: _"IAM Identity Center comes preconfigured with
  multi-factor authentication (MFA) turned on by default"_, prompting _"Every time they sign in
  (always-on)"_ (the default), and _"Require them to register an MFA device at sign in"_ (the default
  for users without a device).
- **Owner check.** Under **IAM Identity Center → Settings → Authentication → Multi-factor
  authentication**, confirm those two values, then record "confirmed" here.
- **User state.** **Pending first sign-in.** The operator has no password and no MFA device yet.
  Users created through the API are not sent an invitation. The owner sets the first password by
  choosing **Users → `munaxa-org-operator` → Reset password → Send an email to the user with
  instructions** (or by generating a one-time password). The device is self-registered at first
  sign-in. That step cannot be completed or bypassed through the API, and it was not.

#### Reconnecting the AWS connector as `munaxa-org-operator`

| Item | Value |
| --- | --- |
| Access portal | `https://d-99674e1617.awsapps.com/start`. This is the default form for this identity store; confirm it on the Identity Center dashboard if it was customized |
| Home Region | `eu-central-1` |
| Account | `800728620253` |
| User | `munaxa-org-operator` (`admin@munaxa.com`) |
| Permission set | `MunaxaOrgDiscovery` |
| MFA | Required at every sign-in, registered at the first one |

1. **Set the password** by sending the password-reset email from the console, as above, and opening
   the link from `admin@munaxa.com`.
2. **Sign out of the root console session** and close all AWS tabs. Sign-In reuses an active session.
3. **Sign in to the access portal.** Open it, sign in as `munaxa-org-operator`, set the password,
   **register an MFA device** and complete MFA. Confirm that account `800728620253` shows
   `MunaxaOrgDiscovery`.
4. **Reconnect the connector.** In claude.ai, open **Settings → Connectors → AWS**, then disconnect
   and connect. When AWS Sign-In opens, use the IAM Identity Center sign-in or the existing portal
   session, select account `800728620253` and `MunaxaOrgDiscovery`, then review and **approve**.
   Do not choose root or an IAM user.
5. **Confirm the identity.** Ask Claude to run `sts:GetCallerIdentity`. The expected ARN is
   `arn:aws:sts::800728620253:assumed-role/AWSReservedSSO_MunaxaOrgDiscovery_4ae1c821d8802e94/munaxa-org-operator`.
   **Anything else, root included, means stop.**
6. **If the connector loses access after about an hour**, the token refresh was refused. Remove only
   the `StringLike` redirect condition from `AwsMcpOAuthTokensFromClaudeOnly` (§1.5) and record it.

**Remaining gate:** Organizations discovery (§1.2) runs only once step 5 shows the
`MunaxaOrgDiscovery` session. Until then the root session is not used for anything further.

---

## 2. Account creation

Create the OU first (§3), attach the guardrails to it (§6), then create the account and move it in.
That way the account spends only minutes outside the guarded OU, while it is still empty.

```bash
aws organizations create-account \
  --account-name munaxa-nonprod \
  --email <ROOT_EMAIL> \
  --role-name OrganizationAccountAccessRole \
  --iam-user-access-to-billing DENY \
  --tags Key=Environment,Value=NonProduction Key=Project,Value=Munaxa Key=ManagedBy,Value=Organizations
#   Returns a CreateAccountStatus id. Account creation is asynchronous.

aws organizations describe-create-account-status --create-account-request-id <REQUEST_ID>
#   Repeat until State is SUCCEEDED; record <NEW_ACCOUNT_ID>. On FAILED, record FailureReason and stop.
```

- `--iam-user-access-to-billing DENY`: billing is viewed from the management account. IAM users are
  forbidden in the member account anyway (§6.3).
- `OrganizationAccountAccessRole` is created in the new account with administrator rights and trusts
  the management account. It is the bootstrap path until IAM Identity Center permission sets exist.
  Restrict who in the management account may assume it.
- New accounts come with a default VPC in each Region. It costs nothing. See §6.6.

## 3. OU placement

```bash
aws organizations create-organizational-unit --parent-id <ROOT_ID> --name NonProduction \
  --tags Key=Environment,Value=NonProduction
#   Record <NONPROD_OU_ID>.

# After §6 has attached the guardrails to <NONPROD_OU_ID>:
aws organizations move-account --account-id <NEW_ACCOUNT_ID> \
  --source-parent-id <ROOT_ID> --destination-parent-id <NONPROD_OU_ID>
```

Target structure (ADR-0003 §5):

```text
Root <ROOT_ID>
├── Management account (800728620253, to be confirmed in §1.2) — no new workloads
│     still holds Docs Production and Docs Non-Production (Docs' decision, ADR-0003 F6)
├── OU NonProduction <NONPROD_OU_ID>   — SCPs §6.2–§6.4 attached here
│   └── munaxa-nonprod <NEW_ACCOUNT_ID>
└── (OU Production and munaxa-prod)     — NOT created by this runbook
```

**The Production OU is not created now.** It would be empty, since Docs production cannot be moved
into an OU while it lives in the management account. It is created together with `munaxa-prod`,
when the first production resource is needed (ADR-0003 §5, "Deferred").

## 4. Account naming

| Item | Value | Source |
| --- | --- | --- |
| Account name | `munaxa-nonprod` | ADR-0003 §4, §5 |
| OU name | `NonProduction` | ADR-0003 §5 |
| Account tags | `Environment=NonProduction`, `Project=Munaxa`, `ManagedBy=Organizations` | Matches the `Environment=NonProduction` tag Docs' guardrails already key on |
| GitHub environment that will deploy here | `aws-nonprod` | ADR-0003 §6 (no GitHub change in this runbook) |
| Root email | `<ROOT_EMAIL>` (owner's choice, §1.1) | — |

## 5. Root-user handling

A member account created through Organizations has a root user with an email address but **no
password** until someone runs password recovery on that address. ADR-0003 forbids long-lived
credentials, so the root user is not used.

1. **Centralized root access management (free, recommended).** It removes, and prevents,
   root credentials in member accounts, and allows privileged root tasks to be performed from the
   management account when genuinely needed:

   ```bash
   aws organizations enable-aws-service-access --service-principal iam.amazonaws.com
   aws iam enable-organizations-root-credentials-management
   aws iam enable-organizations-root-sessions
   aws iam list-organizations-features      # expect RootCredentialsManagement and RootSessions
   ```

   Enable it **before** creating the account if possible. Accounts created afterwards then never
   receive root credentials.
2. **Never create root access keys.** The SCP in §6.3 also denies access-key creation for the
   member's root user.
3. **The root email mailbox stays monitored.** It receives account notices and is the recovery path.
4. **Alternate contacts** (billing, operations, security) are set on the new account from the
   management account with `aws account put-alternate-contact --account-id <NEW_ACCOUNT_ID> …`, once
   trusted access for AWS Account Management is enabled. The contact details are the owner's.

## 6. SCP and guardrail plan

### 6.1 Enable SCPs if they are not already enabled

```bash
aws organizations enable-policy-type --root-id <ROOT_ID> --policy-type SERVICE_CONTROL_POLICY
```

Enabling SCPs attaches the AWS-managed `FullAWSAccess` policy to the root, every OU and every
account, so effective permissions are unchanged. SCPs never affect the management account, so the
Docs resources there are unaffected. Up to **10 SCPs** may be attached directly to an OU (including
`FullAWSAccess`), and each may hold **10,240 characters** (Organizations quotas). The plan below uses
three.

All three are attached to **`NonProduction` only**. None is attached to the root, so no existing
member account, if §1.2 finds any, is affected.

### 6.2 `munaxa-nonprod-region-lock` — only `eu-central-1`

Requirement: allowed Region `eu-central-1`, while keeping domain registration, IAM, OIDC and STS
working. The exempted global services are AWS's own list from the Control Tower region-deny control
(`GRREGIONDENY`, AWS Control Tower control reference), unchanged except that the Control Tower
principal exception is removed and the Region is fixed. `route53domains:*` (domain registration,
served from `us-east-1`), `route53:*`, `iam:*`, `sts:*` and `organizations:*` are in the list.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideEuCentral1",
      "Effect": "Deny",
      "NotAction": [
        "a4b:*", "access-analyzer:*", "account:*", "acm:*", "activate:*", "artifact:*",
        "aws-marketplace-management:*", "aws-marketplace:*", "aws-portal:*", "billing:*",
        "billingconductor:*", "budgets:*", "ce:*", "chatbot:*", "chime:*", "cloudfront:*",
        "cloudtrail:LookupEvents", "compute-optimizer:*", "config:*", "consoleapp:*",
        "consolidatedbilling:*", "cur:*", "datapipeline:GetAccountLimits", "devicefarm:*",
        "directconnect:*", "ec2:DescribeRegions", "ec2:DescribeTransitGateways",
        "ec2:DescribeVpnGateways", "ecr-public:*", "fms:*", "freetier:*", "globalaccelerator:*",
        "health:*", "iam:*", "importexport:*", "invoicing:*", "iq:*", "kms:*",
        "license-manager:ListReceivedLicenses", "lightsail:Get*", "mobileanalytics:*",
        "networkmanager:*", "notifications-contacts:*", "notifications:*", "organizations:*",
        "payments:*", "pricing:*", "quicksight:DescribeAccountSubscription",
        "resource-explorer-2:*", "route53-recovery-cluster:*",
        "route53-recovery-control-config:*", "route53-recovery-readiness:*", "route53:*",
        "route53domains:*", "s3:CreateMultiRegionAccessPoint", "s3:DeleteMultiRegionAccessPoint",
        "s3:DescribeMultiRegionAccessPointOperation", "s3:GetAccountPublicAccessBlock",
        "s3:GetBucketLocation", "s3:GetBucketPolicyStatus", "s3:GetBucketPublicAccessBlock",
        "s3:GetMultiRegionAccessPoint", "s3:GetMultiRegionAccessPointPolicy",
        "s3:GetMultiRegionAccessPointPolicyStatus", "s3:GetStorageLensConfiguration",
        "s3:GetStorageLensDashboard", "s3:ListAllMyBuckets", "s3:ListMultiRegionAccessPoints",
        "s3:ListStorageLensConfigurations", "s3:PutAccountPublicAccessBlock",
        "s3:PutMultiRegionAccessPointPolicy", "savingsplans:*", "shield:*", "sso:*", "sts:*",
        "support:*", "supportapp:*", "supportplans:*", "sustainability:*", "tag:GetResources",
        "tax:*", "trustedadvisor:*", "vendor-insights:ListEntitledSecurityProfiles",
        "waf-regional:*", "waf:*", "wafv2:*"
      ],
      "Resource": "*",
      "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["eu-central-1"] } }
    }
  ]
}
```

### 6.3 `munaxa-nonprod-account-protection` — organization, credentials, audit

Requirements covered:

- prevent leaving the organization;
- prevent account closure;
- no IAM users and no long-lived access keys;
- protect CloudTrail;
- keep GitHub OIDC roles possible.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyLeavingOrClosing",
      "Effect": "Deny",
      "Action": ["organizations:LeaveOrganization", "account:CloseAccount"],
      "Resource": "*"
    },
    {
      "Sid": "DenyIamUsersAndLongLivedKeys",
      "Effect": "Deny",
      "Action": [
        "iam:CreateUser",
        "iam:CreateAccessKey",
        "iam:CreateLoginProfile",
        "iam:UpdateLoginProfile"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ProtectCloudTrail",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "cloudtrail:UpdateTrail",
        "cloudtrail:PutEventSelectors",
        "cloudtrail:PutInsightSelectors"
      ],
      "Resource": "*"
    }
  ]
}
```

- **OIDC stays possible.** Nothing here touches `iam:CreateOpenIDConnectProvider`, `iam:CreateRole`,
  `iam:PutRolePolicy`, `iam:AttachRolePolicy` or `sts:AssumeRoleWithWebIdentity`. The deployment
  model is roles only (ADR-0003 §6).
- **Known future exception.** Docs sends mail through SES SMTP credentials, which are derived from an
  IAM user (Docs ADR-0025). If Docs Non-Production moves into this account (ADR-0003 F6), the Docs
  ADR must either change the mail credential or request a narrowly scoped exception to this
  statement. None is granted now.
- **CloudTrail.** The statement freezes any trail once it exists, including one the management
  account creates as an organization trail (members cannot change those anyway). Changing a trail
  later means temporarily detaching this SCP from the management account, which is itself
  recorded.

### 6.4 `munaxa-nonprod-cost-guardrails` — the low-cost architecture

Requirements covered: no NAT gateways (ADR-0003 §12, VPC endpoints instead), and no unnecessarily
large compute, database or cache resources.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNatGatewaysAndEc2Instances",
      "Effect": "Deny",
      "Action": ["ec2:CreateNatGateway", "ec2:RunInstances"],
      "Resource": "*"
    },
    {
      "Sid": "DenyRdsOutsideSmallSingleAz",
      "Effect": "Deny",
      "Action": [
        "rds:CreateDBInstance",
        "rds:ModifyDBInstance",
        "rds:RestoreDBInstanceFromDBSnapshot",
        "rds:RestoreDBInstanceToPointInTime",
        "rds:CreateDBInstanceReadReplica"
      ],
      "Resource": "arn:aws:rds:*:*:db:*",
      "Condition": { "StringNotLike": { "rds:DatabaseClass": ["db.t4g.micro", "db.t4g.small"] } }
    },
    {
      "Sid": "DenyRdsMultiAz",
      "Effect": "Deny",
      "Action": [
        "rds:CreateDBInstance",
        "rds:ModifyDBInstance",
        "rds:RestoreDBInstanceFromDBSnapshot",
        "rds:RestoreDBInstanceToPointInTime",
        "rds:CreateDBInstanceReadReplica"
      ],
      "Resource": "arn:aws:rds:*:*:db:*",
      "Condition": { "Bool": { "rds:MultiAz": "true" } }
    },
    {
      "Sid": "DenyAuroraAndServerlessCaches",
      "Effect": "Deny",
      "Action": ["rds:CreateDBCluster", "elasticache:CreateServerlessCache"],
      "Resource": "*"
    },
    {
      "Sid": "DenyCacheOutsideSmall",
      "Effect": "Deny",
      "Action": [
        "elasticache:CreateCacheCluster",
        "elasticache:CreateReplicationGroup",
        "elasticache:ModifyCacheCluster",
        "elasticache:ModifyReplicationGroup"
      ],
      "Resource": [
        "arn:aws:elasticache:*:*:cluster:*",
        "arn:aws:elasticache:*:*:replicationgroup:*"
      ],
      "Condition": {
        "StringNotLike": { "elasticache:CacheNodeType": ["cache.t4g.micro", "cache.t4g.small"] }
      }
    }
  ]
}
```

Design notes:

- **Why `Resource` is scoped to the `db`, `cluster` and `replicationgroup` ARNs.** `rds:DatabaseClass`
  and `rds:MultiAz` exist only on the RDS `db` resource, and `elasticache:CacheNodeType` only on the
  ElastiCache `cluster`/`replicationgroup` resources (AWS Service Authorization Reference, via the
  service-reference data, 2026-10-06). A request also names other resources: subnet groups,
  parameter groups, security groups. With `Resource: "*"`, a negated condition on a key those
  resources lack evaluates to true, and the SCP would deny **every** create request.
- **Why `ec2:RunInstances` is denied.** The architecture runs on Fargate, which does not launch EC2
  instances in the account. If an EC2 need ever appears, it is a design change, made by editing
  this policy deliberately.
- **Why Aurora and serverless ElastiCache are denied.** Neither is in the baseline (ADR-0003 §12:
  RDS PostgreSQL `db.t4g.micro`, one Valkey node), and both carry minimum charges that are easy to
  start by accident.
- **Allowed sizes.** `db.t4g.micro`/`small` and `cache.t4g.micro`/`small` leave one step of headroom
  above the planned micro sizes. Anything larger is a deliberate policy change.
- **Not limitable by SCP.** Fargate task sizes have no condition key, so they are kept small in the
  task definitions and watched by cost monitoring.

### 6.5 Audit trail (deferred; small charge)

CloudTrail **event history** (90 days of management events) is on in every account at no charge.
That is enough for the empty account this runbook produces. A persistent trail, either an
organization trail from the management account or one inside `munaxa-nonprod`, delivers the first
copy of management events free, but stores them in S3, which is a (cents-level) paid resource. It
is **not created here**. Decide it together with the first application resources. §6.3 protects it
once it exists.

### 6.6 Default VPCs (optional, free)

The new account has a default VPC in each Region, and ADR-0003's design uses none of them. Outside
`eu-central-1` they are unreachable under §6.2. In `eu-central-1`, delete the default VPC from inside
the account before the shared VPC is built, so nothing lands in it by accident. It costs nothing to
keep or delete, and `aws ec2 create-default-vpc` restores it.

### 6.7 Attach

```bash
for name in munaxa-nonprod-region-lock munaxa-nonprod-account-protection munaxa-nonprod-cost-guardrails; do
  aws organizations create-policy --type SERVICE_CONTROL_POLICY --name "$name" \
    --description "ADR-0003 guardrail: $name" --content "file://$name.json"
  #   Record each <POLICY_ID>.
done
aws organizations attach-policy --policy-id <POLICY_ID> --target-id <NONPROD_OU_ID>   # for each of the three
aws organizations list-policies-for-target --target-id <NONPROD_OU_ID> --filter SERVICE_CONTROL_POLICY
#   Expect FullAWSAccess plus the three above.
```

## 7. Verification checklist

Run the member-account checks as `OrganizationAccountAccessRole` in `<NEW_ACCOUNT_ID>`. Every check is
either read-only, an EC2 `--dry-run`, or a create request built to fail validation even if the
guardrail were missing, so no check can create a resource or a charge.

| # | Check | Command (abridged) | Expected |
| - | ----- | ------------------ | -------- |
| 1 | Account exists, active, named | `organizations describe-account --account-id <NEW_ACCOUNT_ID>` | `Name=munaxa-nonprod`, `Status=ACTIVE` |
| 2 | OU placement | `organizations list-parents --child-id <NEW_ACCOUNT_ID>` | `<NONPROD_OU_ID>` |
| 3 | SCPs attached | `organizations list-policies-for-target --target-id <NONPROD_OU_ID>` | FullAWSAccess + 3 |
| 4 | Root credentials | `iam list-organizations-features` | Root credentials management and root sessions enabled |
| 5 | Region lock | `ec2 describe-vpcs --region us-east-1` (in member) | `AccessDenied` / `UnauthorizedOperation` naming an SCP |
| 6 | Region lock allows home Region | `ec2 describe-vpcs --region eu-central-1` | Succeeds |
| 7 | Global services usable | `iam list-roles`; `route53domains list-domains --region us-east-1` | Succeed |
| 8 | No IAM users | `iam create-user --user-name scp-test` | `AccessDenied` (explicit deny in an SCP) |
| 9 | OIDC still possible | Policy review: no statement in §6.2–§6.4 denies `iam:CreateOpenIDConnectProvider`, `iam:CreateRole` or `sts:AssumeRoleWithWebIdentity`, and `iam:*`/`sts:*` are exempt from the region lock | Confirmed by review now. Confirmed in practice when the OIDC provider is created in the next, separate step (not here) |
| 10 | No NAT | `ec2 create-nat-gateway --subnet-id subnet-00000000000000000 --dry-run --region eu-central-1` | `UnauthorizedOperation` (an SCP denial), not `DryRunOperation` |
| 11 | No EC2 | `ec2 run-instances --image-id ami-00000000000000000 --instance-type t4g.nano --dry-run --region eu-central-1` | `UnauthorizedOperation` |
| 12 | RDS class limit | `rds create-db-instance --db-instance-identifier scp-test --db-instance-class db.m7g.large --engine postgres --master-username x --manage-master-user-password --allocated-storage 20 --db-subnet-group-name does-not-exist --region eu-central-1` | `AccessDenied`. Without the SCP it would fail on the missing subnet group, so nothing is created either way |
| 13 | RDS Multi-AZ | as 12 with `db.t4g.micro --multi-az` | `AccessDenied` |
| 14 | Cache limit | `elasticache create-cache-cluster --cache-cluster-id scp-test --cache-node-type cache.m7g.large --engine valkey --num-cache-nodes 1 --cache-subnet-group-name does-not-exist --region eu-central-1` | `AccessDenied` |
| 15 | No leaving | `organizations leave-organization` (member) | `AccessDenied` |
| 16 | Management account unaffected | Docs' existing deployer checks (`munaxa-docs` `infra/terraform/README.md`) still pass | Unchanged: SCPs never apply to the management account |
| 17 | Nothing billable created | Cost Explorer for the new linked account, the next day | $0.00 |

Record the outputs (redacted of anything secret) in the execution record below.

## 8. What must NOT be provisioned yet

This runbook creates the account, one OU, three SCPs, and organization-level settings (SCP policy
type, trusted access for IAM centralized root access). It must not create any of the following;
each is a later, separately reviewed step:

- `munaxa-prod` or the Production OU;
- VPC, subnets, route tables, security groups, VPC endpoints, NAT gateways, Elastic IPs;
- ALB, target groups, listeners;
- ECR repositories;
- ECS cluster, services, task definitions;
- RDS instances, subnet groups, parameter groups;
- ElastiCache/Valkey;
- Route 53 hosted zone, the `munaxa-nonprod.com` domain registration, ACM certificates;
- the GitHub OIDC provider, IAM deployment/publisher/execution/task roles;
- Secrets Manager secrets, KMS keys, CloudWatch log groups;
- a CloudTrail trail and its S3 bucket (§6.5).

Nothing in Identity, Work, Docs or School changes, and no GitHub environment is created.

## 9. Rollback and remediation

| Situation | Remedy | Notes |
| --- | --- | --- |
| An SCP blocks something legitimate | `aws organizations detach-policy`, then fix the policy with `update-policy` and re-attach | Takes effect within minutes. Detaching widens permissions, so record why |
| An SCP is wrong before the account exists | Delete or edit it freely | No account is affected |
| The account was created with the wrong name | `aws account put-account-name --account-id <NEW_ACCOUNT_ID> --account-name munaxa-nonprod` from the management account, or rename in the console | Names are not identifiers |
| The account was created with the wrong root email | Update the root email in the account settings (as the root user or the management account), with verification of the new address | Keep the mailbox under Munaxa's control |
| Account creation `FAILED` | Read `FailureReason`, for example `EMAIL_ALREADY_EXISTS` or `ACCOUNT_LIMIT_EXCEEDED`. Fix the cause, then re-run | Nothing to clean up |
| The account must be undone | `aws organizations close-account --account-id <NEW_ACCOUNT_ID>` (temporarily detach §6.3's `account:CloseAccount` deny first) | **Not instant.** A closed account remains suspended for a post-closure period, counts against the organization's account quota until then, and its name and email cannot be reused immediately. Only 3 closures may run at once, and a created account must exist 4 days before it can be removed from the organization (Organizations quotas). Prefer fixing over closing |
| The OU must be undone | Move the account out, then `aws organizations delete-organizational-unit` | Only an empty OU can be deleted |
| Centralized root access must be undone | `aws iam disable-organizations-root-sessions` / `disable-organizations-root-credentials-management` | Does not restore deleted root credentials; recovery is via the root email |

---

## Execution record

| Date | Step | Result | By |
| --- | --- | --- | --- |
| 2026-10-06 | §1.2 inspection | **Not run.** The AWS connector required re-authorization (`AWS_MCP` sign-in), so no Organizations call could be made | Claude Code session |
| 2026-10-06 | §2–§7 | **Not run.** Blocked on §1.1: management-account access for the automation, and the owner-chosen root email address | — |
| 2026-10-06T09:57Z | §1.2 inspection, second attempt (read-only discovery task) | **Blocked before the first call.** `sts:GetCallerIdentity` through the AWS connector returned "`AWS_MCP` needs you to sign in again". No Organizations API was reached, no alternative credential was used, and nothing was created or changed | Claude Code session |
| 2026-10-06T10:03Z | §1.3 principal assessment (read-only IAM and IAM Identity Center) | Connector now reachable, as `arn:aws:iam::800728620253:root`. No scoped Organizations principal and no Identity Center instance found. **No Organizations API called; nothing created or changed. BLOCKED** pending a scoped principal | Claude Code session |
| 2026-10-06T10:34Z | §1.4 connector authentication capability | Documentation-only check. **Connector supports IAM Identity Center** (interactive OAuth through AWS Sign-In). No AWS API call; nothing created or changed. Still **BLOCKED** until the Identity Center principal exists and the connector is re-authorized as it | Claude Code session |
| 2026-10-06T10:37Z | §1.5 Identity Center bootstrap (authorized) | **Nothing created.** Two blockers: `CreateInstance` is rejected in a management account (console-only enablement), and no operator email was supplied. Read-only: `ec2:DescribeRegions` and `sso-admin:ListInstances` in all 18 enabled Regions (none exists). No Organizations call | Claude Code session |
| 2026-10-06T11:23Z | §1.6 discovery identity (authorized) | **Created:** Identity Center user `munaxa-org-operator`, permission set `MunaxaOrgDiscovery` (inline policy only, `PT1H`), assignment to `800728620253` (`SUCCEEDED`). Verified read-only: no managed policy, no boundary, no IAM user or key, only the expected `AWSReservedSSO_*` role added. MFA is the documented default (owner to confirm); the user is pending first sign-in. No Organizations call | Claude Code session (root bootstrap, owner-authorized) |
| 2026-10-06T11:44Z | §1.2 discovery as `munaxa-org-operator` (step 1: identity check) | **Blocked before verification.** The single permitted pre-check, `sts:GetCallerIdentity`, returned "`AWS_MCP` needs you to sign in again". The connector was not authorized in this session, so the expected `AWSReservedSSO_MunaxaOrgDiscovery_4ae1c821d8802e94/munaxa-org-operator` identity could not be confirmed. No Organizations call, nothing created or changed. Gate: **BLOCKED** | Claude Code session |

### Discovery status (2026-10-06T09:57Z)

| | State |
| --- | --- |
| **Verified current state** | **None from AWS.** The only known facts are repository evidence: management account `800728620253`, which holds Docs Production and Docs Non-Production (`munaxa-docs` `infra/terraform/README.md`, Docs ADR-0024). They are unconfirmed against AWS |
| **Not determined** | Organization ID and status; `FeatureSet`; root ID; OU tree, including whether `NonProduction`/`Production` exist; member accounts and their placement; SCP policy-type status; existing SCPs and their targets; region or other restrictions; account quota and usage; whether the principal may create accounts |
| **Planned state (unchanged)** | §2–§6: `NonProduction` OU, `munaxa-nonprod` account, three SCPs on the OU, centralized root access. Not started |
| **Items requiring action** | 1. Re-authorize the AWS connector, signed in as a management-account principal with Organizations read access (`organizations:Describe*`, `organizations:List*`, `servicequotas:ListServiceQuotas`), so §1.2 can run. 2. The owner chooses the root email address (§1.1). Needed only for creation, not for discovery |
| **Decision gate** | **BLOCKED.** No prerequisite in §1.2 has been verified |

When the prerequisites are met, continue from §1.2 and append rows here. The values to record are:

- the organization ID and `FeatureSet`;
- `<ROOT_ID>`, `<NONPROD_OU_ID>`, `<NEW_ACCOUNT_ID>`;
- the policy IDs;
- the verification outcomes.
