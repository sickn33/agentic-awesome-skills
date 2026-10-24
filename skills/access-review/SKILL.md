---
name: access-review
description: Conduct periodic access reviews and certifications. Implement access
  governance and recertification workflows. Use when managing access compliance.
category: security
risk: critical
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

## Review boundaries

Confirm exact tenant/accounts, read-only credentials, review period and authorized
reviewers. Store reports privately with defined retention; proposed cadence/SLA
numbers are examples, not compliance certification. Identity joins need verified
immutable IDs, not matching display names. Owner approval and a recovery/break-glass
plan are required before modifying access; inactivity heuristics never authorize
revoking production service accounts automatically.

## AWS IAM Access Review Scripts

Obtain the IAM credential report through a read-only scoped client, poll boundedly
until complete, and decode it once into a private file. Failure/unsupported values
are unknown, never zero/inactive. Use named CSV columns, not positional awk fields:

```python
import csv

def review_console_mfa(report_path):
    candidates = []
    with open(report_path, newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source):
            if row.get("password_enabled") == "true" and row.get("mfa_active") == "false":
                candidates.append({"user": row["user"], "finding": "review_console_mfa"})
    return candidates  # Private review data, not automatic disable actions.
```

Compare timezone-aware last-use/creation times and both access-key slots with an
agreed threshold; missing history may mean never-used, unsupported or unavailable.
Password last-use alone is not overall account inactivity. Effective privilege
requires user/group/role/inline policies, boundaries, SCPs and resource policies;
policy-name matching is only a hint. Cross-account trust needs structured principal
and condition analysis, not grep or an AWS-account substring. No key or access is
revoked solely because a report marks it stale.

## GitHub Access Review

```bash
#!/usr/bin/env bash
# github-access-review.sh - Partial organization inventory
set -euo pipefail
umask 077

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
for repo in $(gh api "orgs/$ORG/repos" --paginate --jq '.[].name'); do
  echo "Repo: $repo"
  gh api "repos/$ORG/$repo/collaborators" --paginate \
    --jq '.[] | [.login, .role_name] | @csv' \
    > "$OUTPUT_DIR/repo-$repo-access.csv"
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
for repo in $(gh api "orgs/$ORG/repos" --paginate --jq '.[].name'); do
  keys=$(gh api "repos/$ORG/$repo/keys" --jq '.[].title' 2>/dev/null)
  if [ -n "$keys" ]; then
    echo "$repo: $keys"
  fi
done > "$OUTPUT_DIR/deploy-keys.txt"

# Branch/ruleset enforcement needs a separate authorized read of each repository's
# actual default/protected branches, classic protection and repository/org rulesets.
# A 403/404 is unknown or absent for that API, not proof the branch is unprotected.
# site_admin is GitHub site administration, NOT an organization-owner indicator.

echo "Report generated in $OUTPUT_DIR"
```

## Okta Access Review

Use a secret-aware SDK/client against the approved Okta HTTPS domain; do not put
SSWS tokens in curl arguments. Disable unexpected redirects, set deadlines and
bounded page/retry budgets, and follow only same-origin API `Link: rel=next` URLs.
Enumerate users, factors, apps/assignments and admin roles with pagination; a
single `limit=200` response is incomplete. Iterate structured app IDs, not CSV
rows containing quoted commas. Record permissions/errors/coverage explicitly.
Factor enrollment is not proof that the current sign-on policy requires MFA or
that a user's enrollment is usable. Compare current authenticators, policy and
assignment data before recommendations. Keep names/email inventories restricted.

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

    users = (user for page in iam.get_paginator("list_users").paginate() for user in page["Users"])
    for user in users:
        username = user["UserName"]

        # Get service last accessed data
        job_id = iam.generate_service_last_accessed_details(
            Arn=user["Arn"]
        )["JobId"]

        for attempt in range(60):
            result = iam.get_service_last_accessed_details(JobId=job_id)
            if result["JobStatus"] == "COMPLETED":
                break
            if result["JobStatus"] == "FAILED":
                raise RuntimeError("IAM last-access job failed")
            time.sleep(2)
        else:
            raise TimeoutError("IAM last-access job exceeded polling budget")
        services = list(result["ServicesLastAccessed"])
        while result.get("IsTruncated"):
            result = iam.get_service_last_accessed_details(JobId=job_id, Marker=result["Marker"])
            services.extend(result["ServicesLastAccessed"])

        threshold = datetime.now(timezone.utc) - timedelta(days=days_lookback)
        unused_services = []

        for service in services:
            last_accessed = service.get("LastAuthenticated")
            if last_accessed is None or last_accessed < threshold:
                unused_services.append({
                    "service": service["ServiceNamespace"],
                    "last_accessed": str(last_accessed) if last_accessed else "Unknown/no recorded activity",
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


def list_external_access_candidates():
    """External-access findings are not a full effective-privilege/unused-access analysis."""
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
