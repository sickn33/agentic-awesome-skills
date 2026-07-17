---
name: aws-security-audit
description: "Perform an authorized, read-only AWS security posture review with scoped evidence, explicit account and region context, and approval-gated remediation."
category: security
risk: safe
source: community
tags: "[aws, security, audit, compliance, security-assessment]"
date_added: "2026-02-27"
---

# AWS Security Audit

## When to Use

Use this skill to review an AWS account or a defined set of accounts for IAM,
network, data-protection, logging, and monitoring gaps. Use it only with explicit
authorization and enough context to identify the intended account, profile, and
regions.

## Safety and Authorization Boundary

- Obtain explicit authorization for every account and organization in scope.
- Use a dedicated read-only audit role with the least privileges needed.
- Confirm the caller identity before collecting evidence; stop on an unexpected account.
- Do not create, update, delete, attach, detach, rotate, enable, disable, or remediate resources during the audit.
- Treat account IDs, ARNs, resource names, network topology, findings, and exported reports as sensitive data.
- Never print credentials, session tokens, secret values, access-key secrets, or application data.
- Do not upload findings or command output to third-party services without approval.
- Remediation requires a separate reviewed plan, explicit approval, rollback steps, and validation.

## Required Scope

Record these values before running any inventory command:

- Authorized AWS account IDs and, if applicable, organization ID.
- Named CLI profile or approved role and how it was obtained.
- Regions in scope, including whether global services are included.
- Services and compliance frameworks in scope.
- Evidence destination, retention period, and permitted recipients.
- Time window and accepted limitations such as denied permissions or disabled services.

## Read-Only Preflight

The following examples are inventory commands, not an instruction to run them
automatically. Substitute only user-approved profile and region values.

```bash
aws sts get-caller-identity --profile AUDIT_PROFILE
aws configure get region --profile AUDIT_PROFILE
aws ec2 describe-regions --all-regions --profile AUDIT_PROFILE
```

Compare the returned account ID with the approved scope. If it differs, stop.
Record denied calls as evidence gaps; do not broaden permissions silently.

## Audit Workflow

1. **Freeze scope**: account, regions, role, services, evidence handling, and success criteria.
2. **Run preflight**: verify identity and read-only access.
3. **Collect inventory**: use `list`, `describe`, and `get` operations only.
4. **Normalize evidence**: record command or API, timestamp, account, region, and relevant fields.
5. **Evaluate controls**: map evidence to the exact control version; do not infer pass from missing data.
6. **Validate findings**: reproduce each finding with a second read or independent AWS-native source when practical.
7. **Prioritize**: combine exposure, impact, exploitability, and existing compensating controls.
8. **Report gaps**: distinguish confirmed findings, not-applicable controls, access-denied checks, and unknowns.
9. **Stop before remediation**: prepare a separate change proposal and request approval.

## Evidence Collection Examples

### IAM and Account Posture

```bash
aws iam get-account-summary --profile AUDIT_PROFILE
aws iam list-users --profile AUDIT_PROFILE
aws iam list-roles --profile AUDIT_PROFILE
aws iam list-account-aliases --profile AUDIT_PROFILE
```

Do not label a user or role unused from one timestamp alone. Account for service
roles, federated access, credential-report freshness, and the agreed observation
window. Review policy documents rather than matching only policy names.

### Network and Public Exposure

```bash
aws ec2 describe-security-groups --profile AUDIT_PROFILE --region AUDIT_REGION
aws ec2 describe-network-acls --profile AUDIT_PROFILE --region AUDIT_REGION
aws ec2 describe-flow-logs --profile AUDIT_PROFILE --region AUDIT_REGION
aws rds describe-db-instances --profile AUDIT_PROFILE --region AUDIT_REGION
```

Evaluate protocol, port, source, resource attachment, reachability, and business
context together. A `0.0.0.0/0` rule is not by itself proof that a resource is
internet reachable, and absence of that literal is not proof of isolation.

### Storage and Encryption

```bash
aws ec2 describe-volumes --profile AUDIT_PROFILE --region AUDIT_REGION
aws rds describe-db-snapshots --snapshot-type public --profile AUDIT_PROFILE --region AUDIT_REGION
aws s3api list-buckets --profile AUDIT_PROFILE
aws kms list-keys --profile AUDIT_PROFILE --region AUDIT_REGION
```

For S3, evaluate Block Public Access, bucket policies, access points, ACLs, and
organization controls together. Do not classify exposure from ACL text matching
alone. Never retrieve object contents unless separately authorized.

### Logging and Monitoring

```bash
aws cloudtrail describe-trails --include-shadow-trails --profile AUDIT_PROFILE --region AUDIT_REGION
aws configservice describe-configuration-recorders --profile AUDIT_PROFILE --region AUDIT_REGION
aws securityhub describe-hub --profile AUDIT_PROFILE --region AUDIT_REGION
```

`describe-trails` does not prove that a trail is currently logging. For every
returned trail, use its exact name or ARN with the corresponding read operation,
record the region, and verify status separately. Treat disabled or unavailable
AWS Config and Security Hub as context, not automatic proof that every mapped
control fails.

## Finding Format

```markdown
## Finding: <short title>
- Status: confirmed | needs-validation | evidence-gap | not-applicable
- Account / region:
- Resource identifiers: redacted as required
- Evidence source and timestamp:
- Observed condition:
- Expected control and version:
- Exposure and impact:
- Compensating controls:
- Recommended next step:
- Approval required before change: yes
- Validation after approved remediation:
```

Do not calculate a universal security score from arbitrary deductions. If a
stakeholder requires scoring, use the named framework's documented method,
version, applicability rules, and evidence completeness; show unknown controls
separately.

## Remediation Gate

For each proposed change, document affected resources, expected impact,
dependencies, rollback, maintenance window, owner, and post-change checks. Run
no mutation until the user approves that exact plan. After an approved change,
re-read the resource and run the relevant application or connectivity tests.

## References

- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [AWS Security Audit Guidelines](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)

Verify current AWS CLI syntax and framework versions against official sources
before use. Service availability and control semantics vary by region and account.

## Limitations

- Read-only inventory cannot prove application-layer security or data handling correctness.
- Access-denied, disabled-service, and out-of-scope checks remain unknown, not pass.
- Compliance mapping is not certification and requires framework-specific applicability review.
- This skill does not authorize remediation or disclosure of sensitive findings.
