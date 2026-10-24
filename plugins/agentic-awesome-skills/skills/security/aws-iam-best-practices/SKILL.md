---
name: aws-iam-best-practices
description: "IAM policy review, hardening, and least privilege implementation"
category: security
risk: critical
source: community
tags: "[aws, iam, security, access-control, kiro-cli, least-privilege]"
date_added: "2026-02-27"
---

# AWS IAM Best Practices

Review and harden IAM policies following AWS security best practices and least privilege principles.

## Review scope and execution boundaries

Select the exact account/role, partition, regions and control/framework version before collecting evidence; verify identity with `aws sts get-caller-identity`. Read-only assessment is the default. Commands that create MFA devices, change policies/keys, enable services, rotate secrets or create alarms require an approved change scope and rollback plan. Keep evidence and secret material out of shared logs.

These are partial examples, not certification or complete benchmark implementations. Control numbers are illustrative historical mappings, not a pinned current benchmark. Record PASS/FAIL/UNKNOWN/NOT-APPLICABLE per control with evidence and coverage. AccessDenied, API errors, missing permissions, absent pages and unimplemented checks are UNKNOWN, never PASS. Use paginators for SDK listings and cover all selected regions/accounts; never infer completeness from no findings. Shell snippets require Bash/GNU date, AWS CLI, jq and error checking (`set -euo pipefail` in complete scripts). Generate the IAM credential report first, wait for COMPLETE and decode its base64 Content; parse CSV by header in production. Credential reports are sensitive.

## When to Use
Use this skill when you need to review IAM policies, implement least privilege access, or harden IAM security.

## Core Principles

**Least Privilege**
- Grant minimum permissions needed
- Use managed policies when possible
- Avoid wildcard (*) permissions
- Regular access reviews

**Defense in Depth**
- Enable MFA for all users
- Use IAM roles instead of access keys
- Implement service control policies (SCPs)
- Enable CloudTrail for audit

**Separation of Duties**
- Separate admin and user roles
- Use different roles for different environments
- Implement approval workflows
- Regular permission audits

## IAM Security Checks

### Find Overly Permissive Policies

```bash
# Policy-name triage only: a name does not establish effective permissions
aws iam list-policies --scope Local \
  --query 'Policies[*].[PolicyName,Arn]' --output table | \
  grep -i admin

# Find policies with wildcard actions
aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text | tr '\t' '\n' | \
while read arn; do
  version=$(aws iam get-policy --policy-arn "$arn" \
    --query 'Policy.DefaultVersionId' --output text)
  doc=$(aws iam get-policy-version --policy-arn "$arn" \
    --version-id "$version" --query 'PolicyVersion.Document')
  if echo "$doc" | grep -q '"Action": "\*"'; then
    echo "Wildcard action in: $arn"
  fi
done

# Find inline policies (should use managed policies)
aws iam list-users --query 'Users[*].UserName' --output text | tr '\t' '\n' | \
while read user; do
  policies=$(aws iam list-user-policies --user-name "$user" \
    --query 'PolicyNames' --output text)
  if [ -n "$policies" ]; then
    echo "Inline policies on user $user: $policies"
  fi
done
```

### MFA Enforcement

```bash
# List users without MFA
aws iam get-credential-report --query Content --output text | base64 --decode | \
  awk -F, 'NR>1 && $8=="false" {print $1}'

# Check if MFA is required in policies
aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text | tr '\t' '\n' | \
while read arn; do
  version=$(aws iam get-policy --policy-arn "$arn" \
    --query 'Policy.DefaultVersionId' --output text)
  doc=$(aws iam get-policy-version --policy-arn "$arn" \
    --version-id "$version" --query 'PolicyVersion.Document')
  if echo "$doc" | grep -q "aws:MultiFactorAuthPresent"; then
    echo "MFA condition mentioned in: $arn (inspect Effect/operator/applicability)"
  fi
done

# Create a virtual device only; enable-mfa-device with two valid codes is separate.
# Store the bootstrap seed privately and delete after verified enrollment.
umask 077
MFA_DIR=$(mktemp -d)
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name user-mfa \
  --outfile "$MFA_DIR/qr.png" \
  --bootstrap-method QRCodePNG
```

### Access Key Management

```bash
# Find old access keys (>90 days)
aws iam list-users --query 'Users[*].UserName' --output text | tr '\t' '\n' | \
while read user; do
  aws iam list-access-keys --user-name "$user" \
    --query 'AccessKeyMetadata[*].[AccessKeyId,CreateDate,Status]' \
    --output text | \
  while read key_id create_date status; do
    age_days=$(( ($(date +%s) - $(date -d "$create_date" +%s)) / 86400 ))
    if [ $age_days -gt 90 ]; then
      echo "$user: Key $key_id is $age_days days old"
    fi
  done
done

# Rotate access key
OLD_KEY="<AWS_ACCESS_KEY_ID>"
IAM_USER="myuser"

# Create new key into a private new file; never print the secret.
umask 077
KEY_DIR=$(mktemp -d)
aws iam create-access-key --user-name "$IAM_USER" > "$KEY_DIR/new-key.json"
echo "New key created. Update applications, then run:"
echo "aws iam delete-access-key --user-name $IAM_USER --access-key-id $OLD_KEY"

# Deactivate old key (test first)
aws iam update-access-key \
  --user-name "$IAM_USER" \
  --access-key-id "$OLD_KEY" \
  --status Inactive
```

### Role and Policy Analysis

```bash
# List unused roles (no activity in 90 days)
aws iam list-roles --query 'Roles[*].[RoleName,RoleLastUsed.LastUsedDate]' \
  --output text | tr '\t' '\n' | \
while read role last_used; do
  if [ "$last_used" = "None" ]; then
    echo "No reported use in tracking period: $role; verify GetRole and retention"
  fi
done

# Find roles with trust relationships to external accounts
aws iam list-roles --query 'Roles[*].RoleName' --output text | tr '\t' '\n' | \
while read role; do
  trust=$(aws iam get-role --role-name "$role" \
    --query 'Role.AssumeRolePolicyDocument')
  if echo "$trust" | grep -q '"AWS":'; then
    echo "AWS principal trust present: $role; compare account IDs and conditions"
  fi
done

# Analyze policy permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/myuser \
  --action-names s3:GetObject s3:PutObject \
  --resource-arns arn:aws:s3:::mybucket/*
```

## IAM Policy Templates

### Least Privilege S3 Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/user-data/${aws:username}/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": "user-data/${aws:username}/*"
        }
      }
    }
  ]
}
```

The username policy variable is for IAM-user principals; role/federated sessions need a validated principal-tag/identity design. These explicit-deny policies can lock out API clients and service calls; test the applicable MFA/SourceIp context and recovery access before attachment. Policy simulation alone is not a live authorization guarantee.

### MFA-Required Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

### Time-Based Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:*",
      "Resource": "*",
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "2026-01-01T00:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2026-12-31T23:59:59Z"
        }
      }
    }
  ]
}
```

### IP-Restricted Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": [
            "203.0.113.0/24",
            "198.51.100.0/24"
          ]
        }
      }
    }
  ]
}
```

## IAM Hardening Checklist

**User Management**
- [ ] Enable MFA for all users
- [ ] Remove unused IAM users
- [ ] Rotate access keys every 90 days
- [ ] Use IAM roles instead of long-term credentials
- [ ] Implement password policy (length, complexity, rotation)

**Policy Management**
- [ ] Replace inline policies with managed policies
- [ ] Remove wildcard (*) permissions
- [ ] Implement least privilege
- [ ] Use policy conditions (MFA, IP, time)
- [ ] Regular policy reviews

**Role Management**
- [ ] Use roles for EC2 instances
- [ ] Implement cross-account roles properly
- [ ] Review trust relationships
- [ ] Remove unused roles
- [ ] Use session tags for fine-grained access

**Monitoring**
- [ ] Enable CloudTrail for IAM events
- [ ] Set up CloudWatch alarms for IAM changes
- [ ] Use AWS IAM Access Analyzer
- [ ] Regular access reviews
- [ ] Monitor for privilege escalation

## Automated IAM Hardening

```python
#!/usr/bin/env python3
# iam-hardening.py

import boto3
from datetime import datetime, timedelta

iam = boto3.client('iam')

def enforce_mfa():
    """Identify users without MFA"""
    users = [u for page in iam.get_paginator('list_users').paginate() for u in page['Users']]
    no_mfa = []
    
    for user in users:
        mfa_devices = iam.list_mfa_devices(
            UserName=user['UserName']
        )['MFADevices']
        
        if not mfa_devices:
            no_mfa.append(user['UserName'])
    
    return no_mfa

def rotate_old_keys():
    """Find access keys older than 90 days"""
    users = [u for page in iam.get_paginator('list_users').paginate() for u in page['Users']]
    old_keys = []
    
    for user in users:
        keys = iam.list_access_keys(
            UserName=user['UserName']
        )['AccessKeyMetadata']
        
        for key in keys:
            age = datetime.now(key['CreateDate'].tzinfo) - key['CreateDate']
            if age.days > 90:
                old_keys.append({
                    'user': user['UserName'],
                    'key_id': key['AccessKeyId'],
                    'age_days': age.days
                })
    
    return old_keys

def find_overpermissive_policies():
    """Find policies with wildcard actions"""
    policies = [p for page in iam.get_paginator('list_policies').paginate(Scope='Local') for p in page['Policies']]
    overpermissive = []
    
    for policy in policies:
        version = iam.get_policy_version(
            PolicyArn=policy['Arn'],
            VersionId=policy['DefaultVersionId']
        )
        
        doc = version['PolicyVersion']['Document']
        statements = doc.get('Statement', [])
        if isinstance(statements, dict): statements = [statements]
        for statement in statements:
            actions = statement.get('Action', [])
            if isinstance(actions, str): actions = [actions]
            if statement.get('Effect') == 'Allow' and any('*' in action for action in actions):
                overpermissive.append(policy['PolicyName'])
                break
    
    return overpermissive

if __name__ == "__main__":
    print("IAM Hardening Report")
    print("=" * 50)
    
    print("\nUsers without MFA:")
    for user in enforce_mfa():
        print(f"  - {user}")
    
    print("\nOld access keys (>90 days):")
    for key in rotate_old_keys():
        print(f"  - {key['user']}: {key['age_days']} days")
    
    print("\nOverpermissive policies:")
    for policy in find_overpermissive_policies():
        print(f"  - {policy}")
```

## Example Prompts

- "Review my IAM policies for security issues"
- "Find users without MFA enabled"
- "Create a least privilege policy for S3 access"
- "Identify overly permissive IAM roles"
- "Generate an IAM hardening report"

## Best Practices

- Use AWS managed policies when possible
- Implement policy versioning
- Test policies in non-production first
- Document policy purposes
- Regular access reviews (quarterly)
- Use IAM Access Analyzer
- Implement SCPs for organization-wide controls

## Kiro CLI Integration

```bash
kiro-cli chat "Use aws-iam-best-practices to review my IAM setup"
kiro-cli chat "Create a least privilege policy with aws-iam-best-practices"
```

## Additional Resources

- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [IAM Policy Simulator](https://policysim.aws.amazon.com/)
- [IAM Access Analyzer](https://aws.amazon.com/iam/features/analyze-access/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
