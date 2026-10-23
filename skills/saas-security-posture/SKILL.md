---
name: saas-security-posture
description: Audit and harden your SaaS tool stack
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# SaaS Security Posture Management for Startups

Secure every SaaS tool your company relies on with practical, command-driven hardening.

## When to Use This Skill

- **SOC 2 preparation** — auditors need evidence of MFA, access controls, and OAuth governance.
- **Suspicious OAuth app** — an employee authorized a third-party app with broad scopes.
- **SaaS sprawl** — teams sign up for tools with company email and nobody tracks them.
- **Post-incident hardening** — after phishing or credential leaks, tighten every surface.

Start with authorized read-only inventory. Broad MFA/OAuth/SSO/retention/SCP changes can lock out users, destroy retained evidence or stop services. Record exact targets and existing state, validate recovery, and apply only approved changes in staged scope. Export files may contain sensitive grants/identifiers: use restrictive permissions and minimize/redact output. Before branch-protection PUT, fetch and merge existing settings rather than replacing required checks or actor restrictions with this example.

## 2. SaaS Inventory Audit

### Google Workspace — OAuth Grants

```bash
gam all users show tokens > oauth_tokens_audit.csv
```

### GitHub — Installed Apps

```bash
gh api /orgs/{ORG}/installations --paginate \
  --jq '.installations[] | {app: .app_slug, permissions: .permissions, created: .created_at}'
gh api /orgs/{ORG}/credential-authorizations --paginate \
  --jq '.[] | {login: .login, credential_type: .credential_type}'
```

### Slack — Approved and Pending Apps

```bash
curl -s -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  "https://slack.com/api/admin.apps.approved.list" | jq '.approved_apps[] | {name: .app.name, id: .app.id}'
curl -s -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  "https://slack.com/api/admin.apps.requests.list" | jq '.app_requests[]'
```

### AWS — IAM Credential Report

```bash
aws iam generate-credential-report
aws iam get-credential-report --output text --query 'Content' | base64 -d > iam_credential_report.csv
```

### Master Inventory Template

```yaml
tools:
  - name: Google Workspace
    owner: it@company.com
    sso: true
    mfa: enforced
  - name: GitHub Enterprise
    owner: engineering@company.com
    sso: true
    mfa: enforced
  - name: Slack Business+
    owner: it@company.com
    sso: true
    app_approval: required
  - name: AWS Organizations
    owner: platform@company.com
    sso: true
    scp_enforced: true
```

---

## 3. GitHub Security Hardening

```bash
# Enforce 2FA and find non-compliant members
gh api -X PATCH /orgs/{ORG} -F two_factor_requirement_enabled=true
gh api "/orgs/{ORG}/members?filter=2fa_disabled" --paginate --jq '.[].login'

# Verify SAML SSO identities
gh api /orgs/{ORG}/credential-authorizations --paginate \
  --jq '.[] | {login: .login, saml_name_id: .saml_name_id}'

# Review the org IP allow list in supported enterprise settings or GraphQL.
# The REST /orgs/{ORG}/ip-allow-list endpoint is not supplied here.

# Branch protection on main
gh api -X PUT /repos/{ORG}/{REPO}/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input - <<'EOF'
{
  "required_status_checks": {"strict": true, "contexts": ["ci/build","ci/test"]},
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Audit PATs and revoke stale tokens
gh api /orgs/{ORG}/personal-access-tokens --paginate \
  --jq '.[] | {owner: .owner.login, name: .token_name, expires: .token_expires_at}'
gh api -X DELETE /orgs/{ORG}/personal-access-tokens/{PAT_ID}

# Audit deploy keys and webhooks
for repo in $(gh repo list {ORG} --limit 500 --json name -q '.[].name'); do
  gh api /repos/{ORG}/${repo}/keys --jq '.[] | {title: .title, read_only: .read_only}'
done
gh api /orgs/{ORG}/hooks --jq '.[] | {url: .config.url, events: .events, active: .active}'
```

---

## 4. Slack Security

Use the supported admin console to review app approval, session duration, retention and export permissions for the actual plan; do not invent admin Web API methods for these settings. Record current values, stage the proposed changes and verify them after authorized application. Retention changes can delete evidence and require the organization's approved policy.

For Enterprise workspace discoverability, the supported `admin.teams.settings.setDiscoverability` method accepts team_id and one of open, invite_only, closed or unlisted; it requires an org-installed admin token with the documented scope. Always check the JSON `ok` field, not just HTTP200. Discoverability is not a substitute for access policy.

## 5. Google Workspace Hardening

Use the Admin console and the installed GAM version's documented commands; the generic `gam update org ... settings` examples are not a validated GAM interface. Review and stage:

1. 2-Step Verification enrollment/enforcement for the intended organizational unit, with recovery access verified first.
2. Third-party OAuth app access and explicitly trusted client IDs.
3. External Drive sharing, transfer and group membership policies.
4. Device management/lock/encryption requirements on managed devices. A wipe is destructive; verify exact device, ownership and approved recovery before issuing it.
5. SPF, DKIM and DMARC records for the actual sending domain; do not enforce reject before authorized senders and reports are validated.

## 6. AWS Account Security

```bash
# Root account lockdown — verify MFA, remove access keys
aws iam get-account-summary --query 'SummaryMap.AccountMFAEnabled'
aws iam get-account-summary --query 'SummaryMap.AccountAccessKeysPresent'

# SSO permission set with least privilege
aws sso-admin create-permission-set --instance-arn "${SSO_INSTANCE_ARN}" \
  --name "DeveloperAccess" --session-duration "PT8H"
aws sso-admin attach-managed-policy-to-permission-set \
  --instance-arn "${SSO_INSTANCE_ARN}" --permission-set-arn "${PERMISSION_SET_ARN}" \
  --managed-policy-arn "arn:aws:iam::aws:policy/ReadOnlyAccess"
```

### Service Control Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Sid": "DenyRootActions", "Effect": "Deny", "Action": "*", "Resource": "*",
     "Condition": {"StringLike": {"aws:PrincipalArn": "arn:aws:iam::*:root"}}},
    {"Sid": "DenyLeaveOrg", "Effect": "Deny",
     "Action": "organizations:LeaveOrganization", "Resource": "*"}
  ]
}
```

```bash
aws organizations create-policy --name "DenyRootActions" \
  --type SERVICE_CONTROL_POLICY --content file://deny-root-actions.json
aws organizations attach-policy --policy-id "${POLICY_ID}" --target-id "${ORG_ROOT_ID}"

# Organization-wide CloudTrail
aws cloudtrail create-trail --name org-security-trail \
  --s3-bucket-name company-cloudtrail-logs \
  --is-multi-region-trail --is-organization-trail --enable-log-file-validation
aws cloudtrail start-logging --name org-security-trail
```

---

## 7. OAuth App Review

### Identify High-Risk Grants

```bash
# Google — find apps with dangerous scopes
gam all users show tokens | grep -E "(drive|gmail|admin)" > high_risk_oauth.txt

# GitHub — find apps with write access
gh api /orgs/{ORG}/installations --paginate \
  --jq '.installations[] | select(.permissions.contents == "write") | {app: .app_slug}'
```

### Revoke Dangerous Grants

```bash
gam user compromised@company.com delete token clientid APP_CLIENT_ID  # single app
gam user compromised@company.com delete tokens                        # all apps
gh api -X DELETE /orgs/{ORG}/installations/{INSTALLATION_ID}           # GitHub app
curl -s -X POST -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://slack.com/api/admin.apps.uninstall" -d '{"app_id": "A0XXXXXXX"}'
```

### Scope Risk Classification

```
CRITICAL — revoke unless justified:
  Google: mail.google.com, admin.directory.user | GitHub: admin:org, repo | Slack: admin
HIGH — review carefully:
  Google: googleapis.com/auth/drive | GitHub: contents:write | Slack: channels:read
LOW — generally safe:
  Google: userinfo.email | GitHub: read:org | Slack: identity.basic
```

---

## 8. Admin Account Protection

Create dedicated least-privilege admin identities through the supported identity provider. Never pass passwords as CLI arguments (including generated command substitutions); use the supported secret-manager or secure interactive provisioning path. Verify recovery before enforcing hardware-backed MFA. Maintain an authorized break-glass process with restricted credential storage, tested recovery, audited use and post-use rotation.

MFA policies must account for IAM-user sessions, service roles and federated/SSO identities. A blanket deny based on a missing `aws:MultiFactorAuthPresent` key can block automation or federation; test scoped policies and recovery in a nonproduction account before attachment.

## 9. Data Loss Prevention

```bash
# Google Drive — block external sharing and restrict viewers
gam update org "/" settings drive sharing_outside_domain off
gam update org "/" settings drive disable_download_print_copy_for_viewers on

# GitHub — enable secret scanning and push protection org-wide
# Configure secret scanning/push protection using organization security configurations
# in Settings > Advanced Security, reviewing repository scope and license impact.
gh api /orgs/{ORG}/secret-scanning/alerts --paginate \
  --jq '.[] | {repo: .repository.name, secret_type: .secret_type, state: .state}'

# Slack export permissions: use supported plan-specific admin settings.
# No setExportRestrictions Web API method is assumed here.

# AWS — block all public S3 access at account level
aws s3control put-public-access-block --account-id "${AWS_ACCOUNT_ID}" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## 10. Shadow IT Detection

### DNS-Based Discovery

```bash
SHADOW_IT_DOMAINS=("airtable.com" "notion.so" "trello.com" "asana.com"
  "monday.com" "clickup.com" "figma.com" "canva.com" "miro.com"
  "zapier.com" "dropbox.com" "box.com" "wetransfer.com")
for domain in "${SHADOW_IT_DOMAINS[@]}"; do
  count=$(grep -Fc -- "$domain" /var/log/dns/query.log) || { code=$?; [ "$code" -eq 1 ] || exit "$code"; }
  [ "${count}" -gt 0 ] && echo "DETECTED: ${domain} — ${count} queries"
done
```

### Google Workspace Login Audit

```bash
gam report login parameters app_name \
  start_time "2026-03-01T00:00:00Z" end_time "2026-03-24T23:59:59Z" > login_audit.csv
gam report token > token_usage_report.csv
```

### Proxy Log Analysis

```bash
awk '{print $7}' /var/log/squid/access.log | sed 's|https\?://||;s|/.*||' \
  | sort | uniq -c | sort -rn | head -50 > top_domains.txt
comm -23 <(awk '{print $2}' top_domains.txt | sort) \
  <(yq '.tools[].domains[]' saas-inventory.yaml | sort) > unapproved.txt
```

### Automated Alerting

Prepare a local review report first. Validate the DNS log format, exact domain normalization, date parsing and approved inventory schema with trusted fixtures. Use a private temporary directory, not a shared predictable /tmp file. DNS queries are leads, not proof a user adopted a service. Scheduling privileged collectors and sending mail require authorization for the target host, schedule and recipient; do not append cron entries or install a root script during discovery.

## Quick Reference — Top 10 Priority Actions

| # | Action | Scope |
|---|--------|-------|
| 1 | Enforce MFA/2FA everywhere | Google, GitHub, AWS, Slack |
| 2 | Enable SSO with your IdP | All tools |
| 3 | Audit and revoke OAuth grants | Google, GitHub |
| 4 | Require Slack app approval | Slack |
| 5 | Branch protection on main | GitHub |
| 6 | Secret scanning + push protection | GitHub |
| 7 | Block public S3 buckets | AWS |
| 8 | Enable org-wide CloudTrail | AWS |
| 9 | Disable external Drive sharing | Google |
| 10 | Create break-glass admin accounts | Google, AWS |

## Maintenance Cadence

**Weekly:** Review OAuth grants, secret scanning alerts, Slack app queue.
**Monthly:** AWS IAM report, rotate service keys, admin account review, shadow IT scan.
**Quarterly:** Full SaaS inventory refresh, OAuth pruning, break-glass test, SCP updates.

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

