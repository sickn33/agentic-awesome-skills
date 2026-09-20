---
name: soc2-compliance
description: Implement SOC 2 Trust Services Criteria. Configure security, availability,
  and processing integrity controls. Use when achieving SOC 2 certification.
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

# SOC 2 Compliance

Implement SOC 2 Trust Services Criteria controls, evidence collection, and continuous compliance monitoring for Type I and Type II audits.

## When to Use

- Preparing for a SOC 2 Type I or Type II audit
- Mapping existing controls to Trust Services Criteria
- Automating evidence collection for auditor requests
- Building continuous compliance monitoring into CI/CD
- Onboarding new services and ensuring SOC 2 control coverage

## Trust Services Criteria Detailed Checklist

```yaml
security_common_criteria:
  CC1_control_environment:
    CC1.1: "Management demonstrates commitment to integrity and ethical values"
    CC1.2: "Board exercises oversight of internal controls"
    CC1.3: "Management establishes structure, authority, and responsibility"
    CC1.4: "Commitment to competence - hire and retain qualified personnel"
    CC1.5: "Individuals are held accountable for internal control responsibilities"
    evidence:
      - Code of conduct document
      - Organizational chart
      - Job descriptions with security responsibilities
      - Board meeting minutes discussing security
      - Background check policy and records

  CC2_communication:
    CC2.1: "Entity obtains or generates relevant quality information"
    CC2.2: "Entity internally communicates information including objectives and responsibilities"
    CC2.3: "Entity communicates with external parties"
    evidence:
      - Security awareness training records
      - Internal security newsletters or updates
      - Customer-facing security documentation
      - Status page and incident communication records

  CC3_risk_assessment:
    CC3.1: "Entity specifies objectives clearly to identify and assess risks"
    CC3.2: "Entity identifies risks to achievement of objectives"
    CC3.3: "Entity considers potential for fraud"
    CC3.4: "Entity identifies and assesses significant changes"
    evidence:
      - Annual risk assessment report
      - Risk register with ratings and treatment plans
      - Fraud risk assessment documentation
      - Change management records

  CC4_monitoring:
    CC4.1: "Entity selects, develops, and performs ongoing/separate evaluations"
    CC4.2: "Entity evaluates and communicates internal control deficiencies"
    evidence:
      - Continuous monitoring dashboard screenshots
      - Internal audit reports
      - Vulnerability scan results
      - Penetration test reports

  CC5_control_activities:
    CC5.1: "Entity selects and develops control activities to mitigate risks"
    CC5.2: "Entity selects and develops technology-based controls"
    CC5.3: "Entity deploys control activities through policies and procedures"
    evidence:
      - Information security policy
      - Access control procedures
      - Change management procedures
      - Encryption standards documentation

  CC6_logical_access:
    CC6.1: "Logical access security over protected information assets"
    CC6.2: "Prior to access, users are registered and authorized"
    CC6.3: "Access to data, software, functions, and other IT resources is authorized and modified"
    CC6.6: "Logical access security measures against threats from outside system boundaries"
    CC6.7: "Transmission of data between parties is protected"
    CC6.8: "Controls to prevent or detect unauthorized or malicious software"
    evidence:
      - IAM credential report
      - MFA enforcement configuration
      - Access review completion records
      - Firewall and WAF configurations
      - TLS/encryption configurations
      - Endpoint protection deployment records

  CC7_system_operations:
    CC7.1: "Detect anomalies and potential security incidents"
    CC7.2: "Monitor system components for anomalies"
    CC7.3: "Evaluate detected events and determine incidents"
    CC7.4: "Respond to identified security incidents"
    CC7.5: "Identify and remediate security incidents"
    evidence:
      - SIEM alert rules and dashboards
      - Monitoring configuration (CloudWatch, Datadog, etc.)
      - Incident response plan
      - Incident tickets and post-mortems

  CC8_change_management:
    CC8.1: "Entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes"
    evidence:
      - Change management policy
      - Pull request approval requirements
      - CI/CD pipeline configurations
      - Deployment records with approvals

  CC9_risk_mitigation:
    CC9.1: "Entity identifies, selects, and develops risk mitigation activities"
    CC9.2: "Entity assesses and manages risks associated with vendors"
    evidence:
      - Risk treatment plans
      - Vendor assessment records
      - Business associate agreements
      - Insurance certificates

availability_criteria:
  A1.1: "System processing capacity and availability are maintained"
  A1.2: "Environmental protections and recovery measures"
  A1.3: "Recovery plan procedures to support system availability"
  evidence:
    - Uptime SLA documentation
    - Capacity monitoring dashboards
    - Disaster recovery plan
    - DR test results
    - Backup verification records

processing_integrity_criteria:
  PI1.1: "Entity obtains or generates, uses, and communicates quality information"
  evidence:
    - Input validation procedures
    - Data processing accuracy checks
    - Error handling and retry logic documentation
    - Output reconciliation records

confidentiality_criteria:
  C1.1: "Entity identifies and maintains confidential information"
  C1.2: "Entity disposes of confidential information"
  evidence:
    - Data classification policy
    - Encryption configurations
    - Data retention and destruction policies
    - Secure disposal records

privacy_criteria:
  P1-P8: "Privacy notice, choice, collection, use, disclosure, access, quality, monitoring"
  evidence:
    - Privacy policy (published)
    - Consent management records
    - Data processing inventory
    - DSAR handling procedures
```

## Tool Mappings for Control Evidence

```yaml
control_to_tool_mapping:
  CC6.1_logical_access:
    aws:
      - IAM credential report (aws iam generate-credential-report)
      - IAM Access Analyzer findings
      - AWS SSO configuration
      - GuardDuty findings
    azure:
      - Azure AD sign-in logs
      - Conditional Access policies
      - PIM role assignments
    github:
      - Organization member list and roles
      - Repository access permissions
      - Branch protection rules
    okta:
      - User status report
      - MFA enrollment report
      - Application assignment report

  CC7.2_monitoring:
    tools:
      - CloudWatch / Azure Monitor / Cloud Monitoring dashboards
      - Datadog / New Relic / Grafana alert configurations
      - SIEM (Splunk, Elastic, Sentinel) saved searches
      - PagerDuty / OpsGenie escalation policies
    evidence_format:
      - Dashboard screenshots with date stamps
      - Alert rule configuration exports
      - Incident response records from ticketing system

  CC8.1_change_management:
    tools:
      - GitHub/GitLab PR merge requirements
      - CI/CD pipeline configurations (GitHub Actions, Jenkins)
      - Terraform plan outputs
      - Deployment logs
    evidence_format:
      - PR with approvals and CI checks
      - Deployment audit trail
      - Change advisory board meeting notes (if applicable)
```

## Evidence Collection Automation

```bash
#!/usr/bin/env bash
# collect-soc2-evidence.sh - Automated SOC 2 evidence collection
# Run monthly or before audit requests

EVIDENCE_DIR="./soc2-evidence/$(date +%Y-%m)"
mkdir -p "$EVIDENCE_DIR"

echo "=== CC6.1 - Logical Access Evidence ==="

# AWS IAM credential report
aws iam generate-credential-report
sleep 10
aws iam get-credential-report --output text --query Content | \
  base64 -d > "$EVIDENCE_DIR/aws-iam-credential-report.csv"

# AWS IAM Access Analyzer findings
aws accessanalyzer list-findings \
  --analyzer-arn "arn:aws:access-analyzer:us-east-1:123456789012:analyzer/org-analyzer" \
  --filter '{"status": {"eq": ["ACTIVE"]}}' \
  > "$EVIDENCE_DIR/access-analyzer-findings.json"

# MFA enforcement status
aws iam list-users --query 'Users[*].UserName' --output text | \
  tr '\t' '\n' | while read -r user; do
    mfa=$(aws iam list-mfa-devices --user-name "$user" --query 'MFADevices[0].SerialNumber' --output text)
    echo "$user,$mfa"
  done > "$EVIDENCE_DIR/mfa-status.csv"

# GitHub organization members and roles
gh api orgs/YOUR_ORG/members --paginate --jq '.[] | [.login, .role_name // "member"] | @csv' \
  > "$EVIDENCE_DIR/github-org-members.csv"

# GitHub branch protection rules
for repo in $(gh repo list YOUR_ORG --json name -q '.[].name'); do
  gh api repos/YOUR_ORG/$repo/branches/main/protection \
    > "$EVIDENCE_DIR/branch-protection-$repo.json" 2>/dev/null
done

echo "=== CC7.2 - Monitoring Evidence ==="

# CloudTrail status
aws cloudtrail get-trail-status --name org-audit-trail \
  > "$EVIDENCE_DIR/cloudtrail-status.json"

# Active CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM \
  > "$EVIDENCE_DIR/active-alarms.json"

# GuardDuty findings summary
aws guardduty list-findings --detector-id DETECTOR_ID \
  --finding-criteria '{"criterion":{"severity":{"gte":4}}}' \
  > "$EVIDENCE_DIR/guardduty-findings.json"

echo "=== CC8.1 - Change Management Evidence ==="

# Recent deployments (GitHub Actions)
gh run list --repo YOUR_ORG/YOUR_REPO --limit 50 --json conclusion,createdAt,displayTitle,headBranch \
  > "$EVIDENCE_DIR/recent-deployments.json"

# Pull requests merged in audit period
gh pr list --repo YOUR_ORG/YOUR_REPO --state merged --limit 100 \
  --json number,title,author,mergedBy,mergedAt,reviews \
  > "$EVIDENCE_DIR/merged-prs.json"

echo "=== A1 - Availability Evidence ==="

# Backup status
aws rds describe-db-snapshots --db-instance-identifier prod-db \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-5:]' \
  > "$EVIDENCE_DIR/rds-backup-snapshots.json"

# S3 replication status
aws s3api get-bucket-replication --bucket prod-data-bucket \
  > "$EVIDENCE_DIR/s3-replication-config.json"

echo "Evidence collected in $EVIDENCE_DIR"
tar -czf "$EVIDENCE_DIR.tar.gz" "$EVIDENCE_DIR"
echo "Archive: $EVIDENCE_DIR.tar.gz"
```

## Audit Preparation Timeline

```yaml
audit_prep_timeline:
  12_months_before:
    - Select auditor firm and sign engagement letter
    - Perform gap assessment against TSC criteria
    - Remediate identified control gaps
    - Begin formal evidence collection cadence

  6_months_before:
    - Conduct internal readiness assessment
    - Verify all controls are operating effectively
    - Complete risk assessment and update risk register
    - Ensure vendor assessments are current
    - Test disaster recovery procedures

  3_months_before:
    - Run automated evidence collection and verify completeness
    - Conduct access review and remediate findings
    - Review and update all policies and procedures
    - Perform vulnerability scan and penetration test
    - Confirm all training records are current

  1_month_before:
    - Prepare evidence request list responses
    - Organize evidence into auditor-friendly structure
    - Brief key personnel on audit interviews
    - Verify monitoring dashboards show healthy state
    - Confirm incident response records are complete

  during_audit:
    - Designate audit liaison for request management
    - Provide timely evidence and clarifications
    - Track open auditor questions
    - Escalate issues to control owners promptly

  after_audit:
    - Review draft report and provide management response
    - Create remediation plan for any exceptions
    - Communicate results to stakeholders
    - Update controls and processes based on findings
    - Begin next audit period evidence collection
```

## Continuous Compliance Monitoring

```yaml
# GitHub Actions workflow for continuous SOC 2 checks
name: SOC2 Compliance Checks
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  access-review:
    runs-on: ubuntu-latest
    steps:
      - name: Check MFA enforcement
        run: |
          USERS_WITHOUT_MFA=$(aws iam generate-credential-report && sleep 5 && \
            aws iam get-credential-report --output text --query Content | \
            base64 -d | awk -F, '$4=="true" && $8=="false" {print $1}') <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
          if [ -n "$USERS_WITHOUT_MFA" ]; then
            echo "::error::Users without MFA: $USERS_WITHOUT_MFA"
            exit 1
          fi

      - name: Check for unused credentials
        run: |
          THRESHOLD=$(date -d '90 days ago' +%Y-%m-%dT%H:%M:%S)
          aws iam get-credential-report --output text --query Content | \
            base64 -d | awk -F, -v t="$THRESHOLD" '$5!="N/A" && $5<t {print $1" last used "$5}' <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->

      - name: Verify CloudTrail is logging
        run: |
          STATUS=$(aws cloudtrail get-trail-status --name org-audit-trail --query 'IsLogging' --output text)
          [ "$STATUS" = "True" ] || (echo "::error::CloudTrail logging stopped" && exit 1)

      - name: Check GuardDuty is enabled
        run: |
          DETECTOR=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text)
          [ "$DETECTOR" != "None" ] || (echo "::error::GuardDuty not enabled" && exit 1)
```

## Best Practices

- Start with a gap assessment to understand current control maturity before engaging an auditor
- Automate evidence collection to reduce the burden of auditor requests and ensure consistency
- Map each control to a specific tool, owner, and evidence artifact for traceability
- Implement continuous monitoring rather than point-in-time checks for Type II readiness
- Maintain a central evidence repository organized by control criteria
- Conduct quarterly internal reviews to catch control drift before the audit period
- Keep policies living documents with version history and annual review dates
- Train all employees on their role in maintaining SOC 2 controls
- Use the audit preparation timeline to avoid last-minute scrambling
- Treat each auditor exception as an improvement opportunity rather than a failure

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
