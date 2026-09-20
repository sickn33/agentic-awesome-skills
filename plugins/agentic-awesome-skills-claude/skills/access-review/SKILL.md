---
name: access-review
description: Conduct periodic access reviews and certifications. Implement access
  governance and recertification workflows. Use when managing access compliance.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# Access Review

Implement periodic access review processes for AWS IAM, GitHub, Okta, and other identity providers, including automated reporting, certification workflows, and unused permission detection.

## Access Review Process

```yaml
access_review_workflow:
  1_scope:
    actions:
      - Define systems in scope for the review cycle
      - Identify review owners (managers, system owners)
      - Set review timeline and deadlines
      - Generate access inventory from all identity sources
    frequency:
      privileged_access: Quarterly
      standard_access: Semi-annually
      service_accounts: Quarterly
      api_keys: Monthly

  2_extract:
    actions:
      - Pull current access data from all systems
      - Correlate identities across platforms (SSO mapping)
      - Enrich with last login and activity data
      - Flag accounts for review (inactive, over-privileged, orphaned)

  3_review:
    actions:
      - Assign review items to appropriate managers
      - Manager certifies each user's access (approve/revoke/modify)
      - Risk-based prioritization (privileged users reviewed first)
      - Escalate non-responses after deadline
    decisions:
      approve: "Access is appropriate for current role"
      modify: "Access needs adjustment (reduce/change scope)"
      revoke: "Access is no longer needed"

  4_remediate:
    actions:
      - Revoke access flagged for removal
      - Modify access as directed by reviewers
      - Document exceptions with justification
      - Confirm changes with system owners
    sla:
      revocations: "Complete within 5 business days of decision"
      modifications: "Complete within 10 business days"
      exceptions: "Approved by security team, documented, time-limited"

  5_report:
    actions:
      - Generate completion metrics (% reviewed, % on time)
      - Document all decisions and actions taken
      - Archive evidence for compliance audits
      - Identify process improvements for next cycle
```

## AWS IAM Access Review Scripts

```bash
#!/usr/bin/env bash
# aws-iam-review.sh - Comprehensive IAM access review report

OUTPUT_DIR="./access-review/$(date +%Y-%m)"
mkdir -p "$OUTPUT_DIR"

echo "=== AWS IAM Access Review ==="

# Generate credential report
aws iam generate-credential-report > /dev/null
sleep 10
aws iam get-credential-report --output text --query Content | \
  base64 -d > "$OUTPUT_DIR/credential-report.csv"

echo "--- Users Without MFA ---"
aws iam get-credential-report --output text --query Content | base64 -d | \ <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
  awk -F, 'NR>1 && $4=="true" && $8=="false" {print $1}' | \
  tee "$OUTPUT_DIR/users-without-mfa.txt"

echo "--- Inactive Users (90+ days) ---"
THRESHOLD=$(date -d '90 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v-90d +%Y-%m-%dT%H:%M:%S)
aws iam get-credential-report --output text --query Content | base64 -d | \ <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
  awk -F, -v t="$THRESHOLD" 'NR>1 && $5!="N/A" && $5!="no_information" && $5<t {
    print $1","$5
  }' | tee "$OUTPUT_DIR/inactive-users.csv"

echo "--- Stale Access Keys (90+ days unused) ---"
for user in $(aws iam list-users --query 'Users[*].UserName' --output text); do
  for key_id in $(aws iam list-access-keys --user-name "$user" \
    --query 'AccessKeyMetadata[?Status==`Active`].AccessKeyId' --output text); do
    last_used=$(aws iam get-access-key-last-used --access-key-id "$key_id" \
      --query 'AccessKeyLastUsed.LastUsedDate' --output text)
    if [ "$last_used" = "None" ] || [ "$last_used" \< "$THRESHOLD" ]; then
      echo "$user,$key_id,$last_used"
    fi
  done
done | tee "$OUTPUT_DIR/stale-access-keys.csv"

echo "--- Users With Admin Policies ---"
for user in $(aws iam list-users --query 'Users[*].UserName' --output text); do
  policies=$(aws iam list-attached-user-policies --user-name "$user" \
    --query 'AttachedPolicies[*].PolicyName' --output text)
  if echo "$policies" | grep -qi "admin\|fullaccess"; then
    groups=$(aws iam list-groups-for-user --user-name "$user" \
      --query 'Groups[*].GroupName' --output text)
    echo "$user|policies:$policies|groups:$groups"
  fi
done | tee "$OUTPUT_DIR/admin-users.txt"

echo "--- IAM Roles With Cross-Account Trust ---"
for role in $(aws iam list-roles --query 'Roles[*].RoleName' --output text); do
  trust=$(aws iam get-role --role-name "$role" \
    --query 'Role.AssumeRolePolicyDocument' --output json 2>/dev/null)
  if echo "$trust" | grep -q '"AWS"' && echo "$trust" | grep -qv "$(aws sts get-caller-identity --query Account --output text)"; then
    echo "$role: $trust" | jq -c '.Statement[].Principal'
  fi
done | tee "$OUTPUT_DIR/cross-account-roles.txt"

echo "--- Service Accounts (Programmatic Only) ---"
aws iam get-credential-report --output text --query Content | base64 -d | \ <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
  awk -F, 'NR>1 && $4=="false" && $9!="N/A" {print $1","$11","$16}' | \
  tee "$OUTPUT_DIR/service-accounts.csv"

echo "Report generated in $OUTPUT_DIR"
```

## GitHub Access Review

```bash
#!/usr/bin/env bash
# github-access-review.sh - GitHub organization access audit

ORG="your-org"
OUTPUT_DIR="./access-review/github/$(date +%Y-%m)"
mkdir -p "$OUTPUT_DIR"

echo "=== GitHub Organization Access Review ==="

echo "--- Organization Members ---"
gh api orgs/$ORG/members --paginate \
  --jq '.[] | [.login, .site_admin] | @csv' \
  > "$OUTPUT_DIR/org-members.csv"

echo "--- Organization Owners ---"
gh api "orgs/$ORG/members?role=admin" --paginate \
  --jq '.[] | .login' \
  > "$OUTPUT_DIR/org-owners.txt"

echo "--- Outside Collaborators ---"
gh api orgs/$ORG/outside_collaborators --paginate \
  --jq '.[] | .login' \
  > "$OUTPUT_DIR/outside-collaborators.txt"

echo "--- Repository Access Per Repo ---"
for repo in $(gh repo list $ORG --json name -q '.[].name' --limit 500); do
  echo "Repo: $repo"
  gh api "repos/$ORG/$repo/collaborators" --paginate \
    --jq '.[] | [.login, .role_name] | @csv' \
    > "$OUTPUT_DIR/repo-$repo-access.csv" 2>/dev/null
done

echo "--- Team Memberships ---"
for team in $(gh api orgs/$ORG/teams --paginate --jq '.[].slug'); do
  echo "Team: $team"
  gh api "orgs/$ORG/teams/$team/members" --paginate \
    --jq '.[] | .login' \
    > "$OUTPUT_DIR/team-$team-members.txt"
done

echo "--- Pending Invitations ---"
gh api orgs/$ORG/invitations --paginate \
  --jq '.[] | [.login, .email, .role, .created_at] | @csv' \
  > "$OUTPUT_DIR/pending-invitations.csv"

echo "--- Deploy Keys ---"
for repo in $(gh repo list $ORG --json name -q '.[].name' --limit 500); do
  keys=$(gh api "repos/$ORG/$repo/keys" --jq '.[].title' 2>/dev/null)
  if [ -n "$keys" ]; then
    echo "$repo: $keys"
  fi
done > "$OUTPUT_DIR/deploy-keys.txt"

echo "--- Branch Protection Rules ---"
for repo in $(gh repo list $ORG --json name -q '.[].name' --limit 500); do
  protection=$(gh api "repos/$ORG/$repo/branches/main/protection" 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "$repo: protected"
    echo "$protection" | jq '{required_reviews: .required_pull_request_reviews.required_approving_review_count, dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews}' \
      > "$OUTPUT_DIR/branch-protection-$repo.json"
  else
    echo "$repo: NOT protected" >> "$OUTPUT_DIR/unprotected-repos.txt"
  fi
done

echo "Report generated in $OUTPUT_DIR"
```

## Okta Access Review

```bash
#!/usr/bin/env bash
# okta-access-review.sh - Okta user and application access audit
# Requires OKTA_DOMAIN and OKTA_API_TOKEN environment variables

OUTPUT_DIR="./access-review/okta/$(date +%Y-%m)"
mkdir -p "$OUTPUT_DIR"
BASE_URL="https://${OKTA_DOMAIN}/api/v1"

echo "=== Okta Access Review ==="

echo "--- Active Users ---"
curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
  "$BASE_URL/users?filter=status+eq+%22ACTIVE%22&limit=200" | \
  jq -r '.[] | [.profile.email, .profile.firstName, .profile.lastName, .lastLogin, .created] | @csv' \
  > "$OUTPUT_DIR/active-users.csv"

echo "--- Suspended/Deprovisioned Users ---"
for status in SUSPENDED DEPROVISIONED; do
  curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
    "$BASE_URL/users?filter=status+eq+%22$status%22&limit=200" | \
    jq -r '.[] | [.profile.email, .status, .statusChanged] | @csv'
done > "$OUTPUT_DIR/inactive-users.csv"

echo "--- Users Without MFA Enrolled ---"
curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
  "$BASE_URL/users?limit=200" | \
  jq -r '.[] | .id' | while read -r uid; do
    factors=$(curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
      "$BASE_URL/users/$uid/factors" | jq 'length')
    if [ "$factors" -eq 0 ]; then
      curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
        "$BASE_URL/users/$uid" | jq -r '.profile.email'
    fi
  done > "$OUTPUT_DIR/users-without-mfa.txt"

echo "--- Application Assignments ---"
curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
  "$BASE_URL/apps?limit=200" | \
  jq -r '.[] | [.id, .label, .status] | @csv' | while IFS=, read -r app_id app_name status; do
    echo "App: $app_name"
    curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
      "$BASE_URL/apps/$app_id/users?limit=200" | \
      jq -r '.[] | [.credentials.userName // .profile.email, .status] | @csv'
  done > "$OUTPUT_DIR/app-assignments.csv"

echo "--- Admin Role Assignments ---"
curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
  "$BASE_URL/users?limit=200" | \
  jq -r '.[] | .id' | while read -r uid; do
    roles=$(curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
      "$BASE_URL/users/$uid/roles" | jq -r '.[].type' 2>/dev/null)
    if [ -n "$roles" ]; then
      email=$(curl -s -H "Authorization: SSWS $OKTA_API_TOKEN" \
        "$BASE_URL/users/$uid" | jq -r '.profile.email')
      echo "$email: $roles"
    fi
  done > "$OUTPUT_DIR/admin-roles.txt"

echo "Report generated in $OUTPUT_DIR"
```

## Unused Permission Detection

```python
"""
Detect unused IAM permissions using CloudTrail and IAM Access Analyzer.
Generates recommendations for right-sizing access.
"""
import boto3
import json
import time
from datetime import datetime, timedelta, timezone


def analyze_iam_usage(days_lookback=90):
    """Analyze IAM user and role activity against granted permissions."""
    iam = boto3.client("iam")

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lookback_days": days_lookback,
        "findings": [],
    }

    users = iam.list_users()["Users"]
    for user in users:
        username = user["UserName"]

        # Get service last accessed data
        job_id = iam.generate_service_last_accessed_details(
            Arn=user["Arn"]
        )["JobId"]

        while True:
            result = iam.get_service_last_accessed_details(JobId=job_id)
            if result["JobStatus"] == "COMPLETED":
                break
            time.sleep(2)

        threshold = datetime.now(timezone.utc) - timedelta(days=days_lookback)
        unused_services = []

        for service in result["ServicesLastAccessed"]:
            last_accessed = service.get("LastAuthenticated")
            if last_accessed is None or last_accessed < threshold:
                unused_services.append({
                    "service": service["ServiceNamespace"],
                    "last_accessed": str(last_accessed) if last_accessed else "Never",
                })

        if unused_services:
            report["findings"].append({
                "type": "unused_permissions",
                "user": username,
                "arn": user["Arn"],
                "unused_service_count": len(unused_services),
                "unused_services": unused_services[:10],
                "recommendation": "Review and remove unused service permissions",
            })

    return report


def detect_overprivileged_roles():
    """Use IAM Access Analyzer to find overprivileged roles."""
    analyzer = boto3.client("accessanalyzer")

    findings = analyzer.list_findings(
        analyzerArn="arn:aws:access-analyzer:us-east-1:123456789012:analyzer/org-analyzer",
        filter={
            "status": {"eq": ["ACTIVE"]},
            "resourceType": {"eq": ["AWS::IAM::Role"]},
        },
    )

    return [
        {
            "resource": f["resource"],
            "resource_type": f["resourceType"],
            "condition": f.get("condition", {}),
            "principal": f.get("principal", {}),
            "action": f.get("action", []),
            "created_at": str(f["createdAt"]),
        }
        for f in findings.get("findings", [])
    ]
```


## Contents

- [Certification Workflow Automation](references/details.md)
- [Access Review Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Conducting quarterly or annual access reviews for compliance (SOC 2, HIPAA, PCI DSS, ISO 27001)
- Identifying and removing stale accounts and unused credentials
- Certifying that current access levels match job responsibilities
- Detecting excessive privileges and dormant service accounts
- Generating evidence for auditor requests on access governance

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
