---
name: aws-iam
description: Manage IAM users, roles, and policies. Implement least-privilege access
  and security best practices. Use when configuring AWS identity and access management.
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

# AWS IAM

Manage identity and access in AWS with least-privilege policies, roles, federation, and permission boundaries.

## When to Use This Skill

- Creating roles for EC2 instances, Lambda functions, or ECS tasks
- Writing custom IAM policies with least-privilege access
- Setting up OIDC federation for GitHub Actions or other CI/CD systems
- Implementing permission boundaries for delegated administration
- Auditing access with IAM Access Analyzer and credential reports
- Configuring cross-account access with assume-role patterns
- Enforcing MFA and session policies

## Prerequisites

- AWS CLI v2 installed and configured
- IAM permissions: `iam:*` (or scoped to specific actions for least privilege)
- For OIDC: ability to create identity providers (`iam:CreateOpenIDConnectProvider`)
- AWS Organizations access for Service Control Policies (SCPs)

## IAM Policy Structure

Every IAM policy follows the same JSON structure. Always specify the minimum actions and resources required.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ],
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-app-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

## Create and Manage Roles

```bash
# Create an EC2 instance role with trust policy
aws iam create-role \
  --role-name EC2AppRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' \
  --tags '[{"Key":"Team","Value":"platform"},{"Key":"Environment","Value":"production"}]'

# Create and attach an inline policy
aws iam put-role-policy \
  --role-name EC2AppRole \
  --policy-name s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-app-bucket/*"
    }]
  }'

# Attach a managed policy
aws iam attach-role-policy \
  --role-name EC2AppRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# Create instance profile and associate the role
aws iam create-instance-profile --instance-profile-name EC2AppProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2AppProfile \
  --role-name EC2AppRole

# Create a Lambda execution role
aws iam create-role \
  --role-name LambdaExecRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name LambdaExecRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

## Cross-Account Access

```bash
# In Account B: create role that Account A can assume
aws iam create-role \
  --role-name CrossAccountReadRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::111111111111:root"},
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {"sts:ExternalId": "unique-external-id-12345"}
      }
    }]
  }'

# In Account A: assume the role
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/CrossAccountReadRole \
  --role-session-name cross-account-session \
  --external-id unique-external-id-12345

# Use the temporary credentials
export AWS_ACCESS_KEY_ID="ASIAXXX"
export AWS_SECRET_ACCESS_KEY="xxx"
export AWS_SESSION_TOKEN="xxx"
```

## OIDC Federation for GitHub Actions

```bash
# Create the GitHub OIDC identity provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

# Create a role for GitHub Actions with repo-scoped trust
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:my-org/my-repo:ref:refs/heads/main"
        }
      }
    }]
  }'

# Attach deployment permissions to the role
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::123456789012:policy/DeploymentPolicy
```

GitHub Actions workflow usage:

```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1
      - run: aws sts get-caller-identity
```

## Permission Boundaries

```bash
# Create a permission boundary policy
aws iam create-policy \
  --policy-name DeveloperBoundary \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowedServices",
        "Effect": "Allow",
        "Action": [
          "s3:*",
          "lambda:*",
          "dynamodb:*",
          "sqs:*",
          "sns:*",
          "logs:*",
          "cloudwatch:*",
          "ecr:*",
          "ecs:*"
        ],
        "Resource": "*"
      },
      {
        "Sid": "DenyIAMChanges",
        "Effect": "Deny",
        "Action": [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachRolePolicy",
          "iam:PutRolePermissionsBoundary",
          "iam:DeleteRolePermissionsBoundary"
        ],
        "Resource": "*"
      },
      {
        "Sid": "DenyOutsideRegion",
        "Effect": "Deny",
        "Action": "*",
        "Resource": "*",
        "Condition": {
          "StringNotEquals": {
            "aws:RequestedRegion": ["us-east-1", "us-west-2"]
          },
          "ForAnyValue:StringNotLike": {
            "aws:PrincipalArn": "arn:aws:iam::*:role/admin-*"
          }
        }
      }
    ]
  }'

# Create a role with the permission boundary
aws iam create-role \
  --role-name DeveloperRole \
  --assume-role-policy-document file://trust-policy.json \
  --permissions-boundary "arn:aws:iam::123456789012:policy/DeveloperBoundary"
```

## IAM Access Analyzer and Auditing

```bash
# Create an IAM Access Analyzer
aws accessanalyzer create-analyzer \
  --analyzer-name account-analyzer \
  --type ACCOUNT

# List findings (externally accessible resources)
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/account-analyzer

# Generate credential report
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d > credential-report.csv

# Find users with console access but no MFA
aws iam list-users --query "Users[].UserName" --output text | while read user; do
  mfa=$(aws iam list-mfa-devices --user-name "$user" --query "MFADevices" --output text)
  if [ -z "$mfa" ]; then
    echo "NO MFA: $user"
  fi
done

# List all policies attached to a role
aws iam list-attached-role-policies --role-name EC2AppRole
aws iam list-role-policies --role-name EC2AppRole

# Get the last-accessed services for a role
aws iam generate-service-last-accessed-details --arn arn:aws:iam::123456789012:role/EC2AppRole
# Then retrieve results with the returned JobId
aws iam get-service-last-accessed-details --job-id "job-id-from-above"

# Simulate a policy to test access
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/EC2AppRole \
  --action-names s3:GetObject s3:PutObject \
  --resource-arns arn:aws:s3:::my-app-bucket/data.json
```

## Terraform IAM Role with OIDC

```hcl
# OIDC provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:*"
        }
      }
    }]
  })

  permissions_boundary = aws_iam_policy.boundary.arn
}

resource "aws_iam_role_policy_attachment" "deploy" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.deployment.arn
}

# Permission boundary
resource "aws_iam_policy" "boundary" {
  name = "DeveloperBoundary"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowedServices"
        Effect   = "Allow"
        Action   = ["s3:*", "lambda:*", "dynamodb:*", "ecs:*", "logs:*"]
        Resource = "*"
      },
      {
        Sid      = "DenyIAMEscalation"
        Effect   = "Deny"
        Action   = ["iam:CreateUser", "iam:CreateRole", "iam:AttachRolePolicy"]
        Resource = "*"
      }
    ]
  })
}
```

## Service Control Policies (Organizations)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyRootAccount",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:PrincipalArn": "arn:aws:iam::*:root"
        }
      }
    },
    {
      "Sid": "RequireIMDSv2",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringNotEquals": {
          "ec2:MetadataHttpTokens": "required"
        }
      }
    },
    {
      "Sid": "DenyRegionsOutsideUS",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2"]
        },
        "ForAnyValue:StringNotLike": {
          "aws:PrincipalArn": ["arn:aws:iam::*:role/OrganizationAdmin"]
        }
      }
    }
  ]
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Access Denied on API call | Missing or incorrect policy | Use `simulate-principal-policy` to test; check resource ARN format |
| Role cannot be assumed | Trust policy does not include the caller | Verify Principal in trust policy matches caller ARN |
| OIDC federation fails | Thumbprint or audience mismatch | Verify OIDC provider URL, client ID list, and condition keys |
| Permission boundary blocks action | Boundary does not include the action | Add the action to the boundary; effective = identity AND boundary |
| Credential report shows stale keys | Keys not rotated in 90+ days | Rotate keys; disable unused access keys |
| Service-linked role creation fails | Organization SCP blocks iam:CreateServiceLinkedRole | Add exception in SCP for the specific service |
| Cross-account assume role fails | Missing ExternalId or wrong account | Verify ExternalId matches; check account number in Principal |
| MFA condition not enforced | Condition key not in policy | Add `aws:MultiFactorAuthPresent` condition |

## Related Skills

- terraform-aws (`terraform-aws`) - IaC deployment of IAM resources
- aws-ec2 (`aws-ec2`) - Instance profiles and roles
- aws-lambda (`aws-lambda`) - Lambda execution roles
- aws-ecs-fargate (`aws-ecs-fargate`) - ECS task and execution roles
- access-review (`access-review`) - Access auditing and governance

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

