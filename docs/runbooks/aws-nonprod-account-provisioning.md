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
