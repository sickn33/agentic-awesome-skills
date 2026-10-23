---
name: aws-security-audit
description: "Comprehensive AWS security posture assessment using AWS CLI and security best practices"
category: security
risk: critical
source: community
tags: "[aws, security, audit, compliance, kiro-cli, security-assessment]"
date_added: "2026-02-27"
---

# AWS Security Audit

Perform comprehensive security assessments of AWS environments to identify vulnerabilities and misconfigurations.

## Review scope and execution boundaries

Select the exact account/role, partition, regions and control/framework version before collecting evidence; verify identity with `aws sts get-caller-identity`. Read-only assessment is the default. Commands that create MFA devices, change policies/keys, enable services, rotate secrets or create alarms require an approved change scope and rollback plan. Keep evidence and secret material out of shared logs.

These are partial examples, not certification or complete benchmark implementations. Control numbers are illustrative historical mappings, not a pinned current benchmark. Record PASS/FAIL/UNKNOWN/NOT-APPLICABLE per control with evidence and coverage. AccessDenied, API errors, missing permissions, absent pages and unimplemented checks are UNKNOWN, never PASS. Use paginators for SDK listings and cover all selected regions/accounts; never infer completeness from no findings. Shell snippets require Bash/GNU date, AWS CLI, jq and error checking (`set -euo pipefail` in complete scripts). Generate the IAM credential report first, wait for COMPLETE and decode its base64 Content; parse CSV by header in production. Credential reports are sensitive.

## When to Use
Use this skill when you need to audit AWS security posture, identify vulnerabilities, or prepare for compliance assessments.

## Audit Categories

**Identity & Access Management**
- Overly permissive IAM policies
- Unused IAM users and roles
- MFA enforcement gaps
- Root account usage
- Access key rotation

**Network Security**
- Open security groups (0.0.0.0/0)
- Public S3 buckets
- Unencrypted data in transit
- VPC flow logs disabled
- Network ACL misconfigurations

**Data Protection**
- Unencrypted EBS volumes
- Unencrypted RDS instances
- S3 object encryption and required key-policy coverage
- Backup policies missing
- KMS key rotation disabled

**Logging & Monitoring**
- CloudTrail disabled
- CloudWatch alarms missing
- VPC Flow Logs disabled
- S3 access logging disabled
- Config recording disabled

## Security Audit Commands

### IAM Security Checks

```bash
# List users without MFA
aws iam get-credential-report --query Content --output text | base64 --decode | \
  awk -F, '$8=="false" && $1!="<root_account>" {print $1}'

# Find unused IAM users (no activity in 90 days)
aws iam list-users --query 'Users[*].[UserName]' --output text | tr '\t' '\n' | \
while read user; do
  last_used=$(aws iam get-user --user-name "$user" \
    --query 'User.PasswordLastUsed' --output text)
  echo "$user: $last_used"
done

# List overly permissive policies (AdministratorAccess)
aws iam list-policies --scope Local \
  --query 'Policies[?PolicyName==`AdministratorAccess`]'
# Scope Local excludes AWS-managed AdministratorAccess. Inspect attached and
# inline effective policies, boundaries, session policies and SCPs separately.

# Find access keys older than 90 days
aws iam list-users --query 'Users[*].UserName' --output text | tr '\t' '\n' | \
while read user; do
  aws iam list-access-keys --user-name "$user" \
    --query 'AccessKeyMetadata[*].[AccessKeyId,CreateDate]' \
    --output text
done

# Check root account access keys
aws iam get-account-summary \
  --query 'SummaryMap.AccountAccessKeysPresent'
```

### Network Security Checks

```bash
# Find security groups open to the world
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].[GroupId,GroupName]' \
  --output table

# List public S3 buckets
aws s3api list-buckets --query 'Buckets[*].Name' --output text | tr '\t' '\n' | \
while read bucket; do
  acl=$(aws s3api get-bucket-acl --bucket "$bucket" 2>/dev/null)
  if echo "$acl" | grep -q "AllUsers"; then
    echo "PUBLIC: $bucket"
  fi
done

# Check VPC Flow Logs status
aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output text | tr '\t' '\n' | \
while read vpc; do
  flow_logs=$(aws ec2 describe-flow-logs \
    --filter "Name=resource-id,Values=$vpc" \
    --query 'FlowLogs[*].FlowLogId' --output text)
  if [ -z "$flow_logs" ]; then
    echo "No flow logs: $vpc"
  fi
done

# Find RDS instances without encryption
aws rds describe-db-instances \
  --query 'DBInstances[?StorageEncrypted==`false`].[DBInstanceIdentifier]' \
  --output table
```

### Data Protection Checks

```bash
# Find unencrypted EBS volumes
aws ec2 describe-volumes \
  --query 'Volumes[?Encrypted==`false`].[VolumeId,Size,State]' \
  --output table

# Inspect default configuration; all new S3 uploads have SSE-S3 baseline encryption.
# Existing historical objects and required KMS policies need separate evidence.
aws s3api list-buckets --query 'Buckets[*].Name' --output text | tr '\t' '\n' | \
while read bucket; do
  encryption=$(aws s3api get-bucket-encryption \
    --bucket "$bucket" 2>&1)
  if echo "$encryption" | grep -q "ServerSideEncryptionConfigurationNotFoundError"; then
    echo "Default encryption query needs investigation: $bucket; not proof all objects lack encryption"
  fi
done

# Find RDS snapshots that are public
aws rds describe-db-snapshots \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier]' --output text | tr '\t' '\n' | \
while read snapshot; do
  attrs=$(aws rds describe-db-snapshot-attributes \
    --db-snapshot-identifier "$snapshot" \
    --query 'DBSnapshotAttributesResult.DBSnapshotAttributes[?AttributeName==`restore`].AttributeValues' \
    --output text)
  if echo "$attrs" | grep -q "all"; then
    echo "PUBLIC SNAPSHOT: $snapshot"
  fi
done

# Check KMS key rotation
aws kms list-keys --query 'Keys[*].KeyId' --output text | tr '\t' '\n' | \
while read key; do
  rotation=$(aws kms get-key-rotation-status --key-id "$key" \
    --query 'KeyRotationEnabled' --output text 2>/dev/null)
  if [ "$rotation" = "False" ]; then
    echo "Rotation disabled: $key"
  fi
done
```

### Logging & Monitoring Checks

```bash
# Check CloudTrail status
aws cloudtrail describe-trails \
  --query 'trailList[*].[Name,IsMultiRegionTrail,LogFileValidationEnabled]' \
  --output table

# Verify CloudTrail is logging
aws cloudtrail get-trail-status --name my-trail \
  --query 'IsLogging'

# Check if AWS Config is enabled
aws configservice describe-configuration-recorders \
  --query 'ConfigurationRecorders[*].[name,roleARN]' \
  --output table

# List S3 buckets without access logging
aws s3api list-buckets --query 'Buckets[*].Name' --output text | tr '\t' '\n' | \
while read bucket; do
  logging=$(aws s3api get-bucket-logging --bucket "$bucket" 2>&1)
  if ! echo "$logging" | grep -q "LoggingEnabled"; then
    echo "No access logging: $bucket"
  fi
done
```

## Automated Security Audit Script

```bash
#!/bin/bash
# comprehensive-security-audit.sh

echo "=== AWS Security Audit Report ==="
echo "Generated: $(date)"
echo ""

# IAM Checks
echo "## IAM Security"
echo "Users without MFA:"
aws iam get-credential-report --query Content --output text | base64 --decode | \
  awk -F, '$8=="false" && $1!="<root_account>" {print "  - " $1}'

echo ""
echo "Root account access keys:"
aws iam get-account-summary \
  --query 'SummaryMap.AccountAccessKeysPresent' --output text

# Network Checks
echo ""
echo "## Network Security"
echo "Security groups open to 0.0.0.0/0:"
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].GroupId' \
  --output json | jq 'length'

# Data Protection
echo ""
echo "## Data Protection"
echo "Unencrypted EBS volumes:"
aws ec2 describe-volumes \
  --query 'Volumes[?Encrypted==`false`].VolumeId' \
  --output json | jq 'length'

echo ""
echo "Unencrypted RDS instances:"
aws rds describe-db-instances \
  --query 'DBInstances[?StorageEncrypted==`false`].DBInstanceIdentifier' \
  --output json | jq 'length'

# Logging
echo ""
echo "## Logging & Monitoring"
echo "CloudTrail status:"
aws cloudtrail describe-trails \
  --query 'trailList[*].[Name,TrailARN]'
# Get IsLogging from get-trail-status for each TrailARN, not describe-trails. \
  --output table

echo ""
echo "=== End of Report ==="
```

## Assessment result model

Do not calculate a security score from stubs or skipped checks. For each control report account/region/resource, evidence timestamp, exact check and PASS/FAIL/UNKNOWN/NOT-APPLICABLE. Explicitly list unqueried regions, unavailable permissions, pagination failures and controls requiring manual evidence. Public ingress may be intentional; severity depends on port/protocol, IPv6 exposure, asset sensitivity and compensating controls.

## Compliance Mapping

**CIS AWS Foundations Benchmark**
- 1.1: Root account usage
- 1.2-1.14: IAM policies and MFA
- 2.1-2.9: Logging (CloudTrail, Config, VPC Flow Logs)
- 4.1-4.3: Monitoring and alerting

**PCI-DSS**
- Requirement 1: Network security controls
- Requirement 2: Secure configurations
- Requirement 8: Access controls and MFA
- Requirement 10: Logging and monitoring

**HIPAA**
- Access controls (IAM)
- Audit controls (CloudTrail)
- Encryption (EBS, RDS, S3)
- Transmission security (TLS/SSL)

## Remediation Priorities

**Critical (Fix Immediately)**
- Root account access keys
- Public RDS snapshots
- Security groups open to 0.0.0.0/0 on sensitive ports
- CloudTrail disabled

**High (Fix Within 7 Days)**
- Users without MFA
- Unencrypted data at rest
- Missing VPC Flow Logs
- Overly permissive IAM policies

**Medium (Fix Within 30 Days)**
- Old access keys (>90 days)
- Missing S3 access logging
- Unused IAM users
- KMS key rotation disabled

## Example Prompts

- "Run a comprehensive security audit on my AWS account"
- "Check for IAM security issues"
- "Find all unencrypted resources"
- "Generate a security compliance report"
- "Calculate my AWS security score"

## Best Practices

- Run audits weekly
- Automate with Lambda/EventBridge
- Export results to S3 for trending
- Integrate with SIEM tools
- Track remediation progress
- Document exceptions with business justification

## Kiro CLI Integration

```bash
kiro-cli chat "Use aws-security-audit to assess my security posture"
kiro-cli chat "Generate a security audit report with aws-security-audit"
```

## Additional Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [AWS Security Hub](https://aws.amazon.com/security-hub/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
