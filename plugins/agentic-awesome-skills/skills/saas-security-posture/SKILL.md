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
gh api -X PATCH /orgs/{ORG} -f two_factor_requirement_enabled=true
gh api /orgs/{ORG}/members?filter=2fa_disabled --paginate --jq '.[].login'

# Verify SAML SSO identities
gh api /orgs/{ORG}/credential-authorizations --paginate \
  --jq '.[] | {login: .login, saml_name_id: .saml_name_id}'

# Add IP allow list entry
gh api -X POST /orgs/{ORG}/ip-allow-list \
  -f allow_list_value="203.0.113.0/24" -f name="Office VPN" -F is_active=true

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

```bash
# Require app approval
curl -s -X POST -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://slack.com/api/admin.apps.config.set" -d '{"app_approval_enabled": true}'

# Set workspace to invite-only
curl -s -X POST -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://slack.com/api/admin.teams.settings.setDiscoverability" \
  -d '{"team_id": "T0XXXXXXX", "discoverability": "invite_only"}'

# Force re-authentication every 24 hours
curl -s -X POST -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://slack.com/api/admin.teams.settings.setSessionDuration" \
  -d '{"team_id": "T0XXXXXXX", "session_duration": 86400}'

# Set message retention to 1 year
curl -s -X POST -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://slack.com/api/admin.teams.settings.setRetentionPolicy" \
  -d '{"team_id": "T0XXXXXXX", "retention_type": "all", "retention_duration": 365}'

# Audit Slack Connect shared channels
curl -s -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  "https://slack.com/api/admin.conversations.search?search_channel_types=connect" \
  | jq '.conversations[] | {name: .name, is_ext_shared: .is_ext_shared}'
```

---

## 5. Google Workspace Hardening

```bash
# Enforce 2-Step Verification and strong passwords
gam update org "/" settings 2sv enforced
gam update org "/" settings password_length 14

# Block all third-party OAuth apps, then whitelist specific ones
gam update org "/" settings oauth_access block_all
gam update org "/" settings oauth_access whitelist client_id:APP_CLIENT_ID_1

# Disable external Drive sharing and file transfers
gam update org "/" settings drive sharing_outside_domain off
gam update org "/" settings drive transfer_to_personal off
gam update org "/" settings groups external_members off

# Verify email authentication records
dig TXT company.com | grep "v=spf1"
dig TXT google._domainkey.company.com
dig TXT _dmarc.company.com
# Expected: v=DMARC1; p=reject; rua=mailto:dmarc-reports@company.com; pct=100

# Mobile device management
gam update org "/" settings mobile management advanced
gam update org "/" settings mobile screen_lock required
gam update org "/" settings mobile encryption required
gam update mobile ${DEVICE_ID} action wipe   # compromised device
```

---

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

```bash
# Dedicated admin account in Google Workspace
gam create user admin-jdoe@company.com firstname "John (Admin)" lastname "Doe" \
  password "$(openssl rand -base64 32)" org "/Admins"
gam update user admin-jdoe@company.com admin on

# Require hardware security keys for the Admins OU
gam update org "/Admins" settings 2sv security_key_only

# AWS MFA enforcement policy
cat <<'EOF' > enforce-mfa-policy.json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyUnlessMFA", "Effect": "Deny",
    "NotAction": ["iam:CreateVirtualMFADevice","iam:EnableMFADevice",
                  "iam:GetUser","iam:ListMFADevices","sts:GetSessionToken"],
    "Resource": "*",
    "Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}
  }]
}
EOF
aws iam create-policy --policy-name EnforceMFA --policy-document file://enforce-mfa-policy.json

# Break-glass account for SSO outages
BREAK_GLASS_PW=$(openssl rand -base64 48)
gam create user breakglass@company.com firstname "Break" lastname "Glass" \
  password "${BREAK_GLASS_PW}" org "/Admins" admin on
# Store password in a sealed envelope in a physical safe
# After every use: rotate password, re-seal, log the incident
```

---

## 9. Data Loss Prevention

```bash
# Google Drive — block external sharing and restrict viewers
gam update org "/" settings drive sharing_outside_domain off
gam update org "/" settings drive disable_download_print_copy_for_viewers on

# GitHub — enable secret scanning and push protection org-wide
gh api -X PATCH /orgs/{ORG} -f security_product=secret_scanning -f enablement=enable_all
gh api -X PATCH /orgs/{ORG} -f security_product=secret_scanning_push_protection -f enablement=enable_all
gh api /orgs/{ORG}/secret-scanning/alerts --paginate \
  --jq '.[] | {repo: .repository.name, secret_type: .secret_type, state: .state}'

# Slack — restrict data export to org admins
curl -s -X POST -H "Authorization: Bearer ${SLACK_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://slack.com/api/admin.teams.settings.setExportRestrictions" \
  -d '{"team_id": "T0XXXXXXX", "export_type": "org_admins_only"}'

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
  count=$(grep -c "${domain}" /var/log/dns/query.log 2>/dev/null || echo "0")
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

```bash
cat <<'SCRIPT' > /usr/local/bin/shadow-it-check.sh
#!/usr/bin/env bash
set -euo pipefail
APPROVED="/etc/security/approved-saas-domains.txt"
YESTERDAY=$(date -d "yesterday" +%d-%b-%Y)
grep "${YESTERDAY}" /var/log/dns/query.log | awk '{print $4}' | sort -u > /tmp/today.txt
NEW=$(comm -23 /tmp/today.txt <(sort "${APPROVED}"))
[ -n "${NEW}" ] && mail -s "[ALERT] Shadow IT" security@company.com <<< "${NEW}"
SCRIPT
chmod +x /usr/local/bin/shadow-it-check.sh
echo "0 8 * * * root /usr/local/bin/shadow-it-check.sh" >> /etc/cron.d/shadow-it-check
```

---

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

