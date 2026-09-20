---
name: aws-secrets-manager
description: Store and rotate secrets in AWS Secrets Manager.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# AWS Secrets Manager

Securely store, manage, and rotate secrets in AWS.

## When to Use This Skill

Use this skill when:
- Storing database credentials, API keys, or tokens in AWS
- Implementing automatic credential rotation for RDS or other services
- Replacing hardcoded secrets in application code or config files
- Integrating secrets into ECS, EKS, or Lambda workloads
- Meeting compliance requirements for secret management and rotation

## Prerequisites

- AWS account with appropriate IAM permissions
- AWS CLI v2 installed and configured
- IAM policy allowing `secretsmanager:*` actions (or scoped permissions)
- For rotation: Lambda execution role and VPC access to target services
- Python 3.9+ with `boto3` for SDK examples

## Secret Creation and Management

```bash
# Create a secret with JSON structure
aws secretsmanager create-secret \
  --name myapp/production/database \
  --description "Production database credentials" \
  --secret-string '{"username":"dbadmin","password":"S3cur3P@ssw0rd!","engine":"postgres","host":"db.internal.example.com","port":5432,"dbname":"myapp"}' \
  --tags '[{"Key":"Environment","Value":"production"},{"Key":"Team","Value":"platform"}]'

# Create a secret with KMS encryption (custom key)
aws secretsmanager create-secret \
  --name myapp/production/api-key \
  --description "Third-party API key" \
  --secret-string "ak_live_xxxxxxxxxxxx" \
  --kms-key-id alias/secrets-key

# Create a binary secret (certificates, keys)
aws secretsmanager create-secret \
  --name myapp/production/tls-cert \
  --secret-binary fileb://server.pfx

# Get secret value
aws secretsmanager get-secret-value \
  --secret-id myapp/production/database \
  --query 'SecretString' --output text | jq .

# Get a specific version
aws secretsmanager get-secret-value \
  --secret-id myapp/production/database \
  --version-stage AWSPREVIOUS

# Update secret value
aws secretsmanager put-secret-value \
  --secret-id myapp/production/database \
  --secret-string '{"username":"dbadmin","password":"N3wS3cur3P@ss!","engine":"postgres","host":"db.internal.example.com","port":5432,"dbname":"myapp"}'

# List all secrets
aws secretsmanager list-secrets \
  --filters Key=name,Values=myapp/production

# Delete secret (with recovery window)
aws secretsmanager delete-secret \
  --secret-id myapp/production/old-key \
  --recovery-window-in-days 7

# Restore a deleted secret
aws secretsmanager restore-secret \
  --secret-id myapp/production/old-key

# Tag a secret
aws secretsmanager tag-resource \
  --secret-id myapp/production/database \
  --tags '[{"Key":"RotationEnabled","Value":"true"}]'
```

## Automatic Rotation

### Enable Rotation

```bash
# Enable rotation with an existing Lambda function
aws secretsmanager rotate-secret \
  --secret-id myapp/production/database \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRDSPostgreSQLRotation \
  --rotation-rules '{"AutomaticallyAfterDays":30,"ScheduleExpression":"rate(30 days)"}'

# Trigger immediate rotation
aws secretsmanager rotate-secret \
  --secret-id myapp/production/database

# Check rotation status
aws secretsmanager describe-secret \
  --secret-id myapp/production/database \
  --query '{RotationEnabled:RotationEnabled,RotationLambdaARN:RotationLambdaARN,RotationRules:RotationRules,LastRotatedDate:LastRotatedDate}'
```

### Lambda Rotation Function

```python
"""rotation_function.py - Custom rotation Lambda for database credentials."""

import boto3
import json
import logging
import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """Secrets Manager rotation handler.

    The rotation process has four steps:
    1. createSecret - Generate new secret value
    2. setSecret - Apply the new secret to the target service
    3. testSecret - Verify the new secret works
    4. finishSecret - Mark rotation complete
    """
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    client = boto3.client('secretsmanager')

    metadata = client.describe_secret(SecretId=secret_arn)
    if not metadata.get('RotationEnabled'):
        raise ValueError(f"Secret {secret_arn} does not have rotation enabled")

    versions = metadata.get('VersionIdsToStages', {})
    if token not in versions:
        raise ValueError(f"Secret version {token} has no stage for rotation")

    if step == "createSecret":
        create_secret(client, secret_arn, token)
    elif step == "setSecret":
        set_secret(client, secret_arn, token)
    elif step == "testSecret":
        test_secret(client, secret_arn, token)
    elif step == "finishSecret":
        finish_secret(client, secret_arn, token)
    else:
        raise ValueError(f"Invalid step: {step}")


def create_secret(client, secret_arn, token):
    """Generate a new secret value."""
    current = client.get_secret_value(
        SecretId=secret_arn, VersionStage="AWSCURRENT"
    )
    current_dict = json.loads(current['SecretString'])

    new_password = client.get_random_password(
        PasswordLength=32,
        ExcludeCharacters='/@"\\',
        RequireEachIncludedType=True,
    )['RandomPassword']

    current_dict['password'] = new_password
    client.put_secret_value(
        SecretId=secret_arn,
        ClientRequestToken=token,
        SecretString=json.dumps(current_dict),
        VersionStages=['AWSPENDING'],
    )
    logger.info(f"createSecret: New secret version created for {secret_arn}")


def set_secret(client, secret_arn, token):
    """Apply the new secret to the target database."""
    pending = client.get_secret_value(
        SecretId=secret_arn, VersionId=token, VersionStage="AWSPENDING"
    )
    pending_dict = json.loads(pending['SecretString'])

    current = client.get_secret_value(
        SecretId=secret_arn, VersionStage="AWSCURRENT"
    )
    current_dict = json.loads(current['SecretString'])

    conn = psycopg2.connect(
        host=current_dict['host'],
        port=current_dict.get('port', 5432),
        user=current_dict['username'],
        password=current_dict['password'],
        dbname=current_dict.get('dbname', 'postgres'),
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(
            "ALTER USER %s WITH PASSWORD %s",
            (pending_dict['username'], pending_dict['password']),
        )
    conn.close()
    logger.info(f"setSecret: Password updated in database for {secret_arn}")


def test_secret(client, secret_arn, token):
    """Verify the new secret works."""
    pending = client.get_secret_value(
        SecretId=secret_arn, VersionId=token, VersionStage="AWSPENDING"
    )
    pending_dict = json.loads(pending['SecretString'])

    conn = psycopg2.connect(
        host=pending_dict['host'],
        port=pending_dict.get('port', 5432),
        user=pending_dict['username'],
        password=pending_dict['password'],
        dbname=pending_dict.get('dbname', 'postgres'),
    )
    conn.close()
    logger.info(f"testSecret: New credentials verified for {secret_arn}")


def finish_secret(client, secret_arn, token):
    """Finalize the rotation by updating version stages."""
    metadata = client.describe_secret(SecretId=secret_arn)
    versions = metadata.get('VersionIdsToStages', {})

    current_version = None
    for version_id, stages in versions.items():
        if "AWSCURRENT" in stages:
            if version_id == token:
                logger.info("finishSecret: Version already marked AWSCURRENT")
                return
            current_version = version_id
            break

    client.update_secret_version_stage(
        SecretId=secret_arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version,
    )
    logger.info(f"finishSecret: Rotation complete for {secret_arn}")
```

### Rotation Lambda Terraform

```hcl
resource "aws_lambda_function" "rotation" {
  filename         = "rotation_function.zip"
  function_name    = "secrets-rotation-postgresql"
  role             = aws_iam_role.rotation.arn
  handler          = "rotation_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.rotation.id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }
}

resource "aws_lambda_permission" "secrets_manager" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
  statement_id  = "AllowSecretsManager"
}

resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn
  rotation_rules {
    automatically_after_days = 30
  }
}
```

## Application Integration

### Python SDK

```python
import boto3
import json
from functools import lru_cache

def get_secret(secret_name: str, region: str = "us-east-1") -> dict:
    """Retrieve and parse a secret from AWS Secrets Manager."""
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    if "SecretString" in response:
        return json.loads(response["SecretString"])
    else:
        import base64
        return base64.b64decode(response["SecretBinary"])

@lru_cache(maxsize=32)
def get_cached_secret(secret_name: str) -> dict:
    """Cached secret retrieval. Clear cache on rotation events."""
    return get_secret(secret_name)

# Usage
creds = get_secret("myapp/production/database")
connection_string = (
    f"postgresql://{creds['username']}:{creds['password']}"
    f"@{creds['host']}:{creds['port']}/{creds['dbname']}"
)
```

### ECS Task Definition

```json
{
  "containerDefinitions": [
    {
      "name": "myapp",
      "image": "ghcr.io/acme/myapp:v1.0.0",
      "secrets": [
        {
          "name": "DB_USERNAME",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/production/database:username::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/production/database:password::"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/production/api-key"
        }
      ]
    }
  ],
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole"
}
```

### EKS with External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: myapp/production/database
        property: username
    - secretKey: password
      remoteRef:
        key: myapp/production/database
        property: password
```

## Resource-Based Policy

```bash
# Restrict secret access to specific roles
aws secretsmanager put-resource-policy \
  --secret-id myapp/production/database \
  --resource-policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": [
            "arn:aws:iam::123456789:role/myapp-ecs-task-role",
            "arn:aws:iam::123456789:role/myapp-lambda-role"
          ]
        },
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": "*",
        "Condition": {
          "StringEquals": {
            "aws:RequestedRegion": "us-east-1"
          }
        }
      },
      {
        "Effect": "Deny",
        "Principal": "*",
        "Action": "secretsmanager:GetSecretValue",
        "Resource": "*",
        "Condition": {
          "StringNotEquals": {
            "aws:PrincipalAccount": "123456789012"
          }
        }
      }
    ]
  }'
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `AccessDeniedException` on GetSecretValue | IAM policy missing permission | Add `secretsmanager:GetSecretValue` to the role; check resource-based policy |
| Rotation fails with Lambda timeout | Lambda cannot reach database | Ensure Lambda is in same VPC with route to DB; check security groups |
| Secret value is empty after rotation | createSecret step failed | Check Lambda CloudWatch logs; verify random password generation works |
| ECS container fails to start | Secret ARN format incorrect | Use full ARN with `::` for JSON key extraction; verify secret exists |
| Application uses old credentials after rotation | Client caching stale values | Implement cache invalidation on rotation; reduce cache TTL |
| Rotation Lambda permission error | Missing `lambda:InvokeFunction` permission | Add `aws_lambda_permission` for secretsmanager.amazonaws.com principal |
| KMS decrypt fails | Secret KMS key policy missing role | Add the accessing role to the KMS key policy's `kms:Decrypt` principals |

## Best Practices

- Enable automatic rotation with 30-day intervals minimum
- Use resource-based policies in addition to IAM policies (defense in depth)
- Encrypt secrets with customer-managed KMS keys (not default)
- Implement least-privilege access (only the roles that need each secret)
- Use secret versioning for safe rollback during rotation issues
- Monitor secret access with CloudTrail and alert on unusual patterns
- Structure secret names hierarchically: `{app}/{env}/{secret-type}`
- Never log secret values; log only secret ARNs and access metadata
- Test rotation in staging before enabling in production
- Set up CloudWatch alarms for rotation failures

## Related Skills

- hashicorp-vault (`hashicorp-vault`) - Multi-cloud secrets
- aws-iam (`aws-iam`) - IAM policies
- azure-keyvault (`azure-keyvault`) - Azure secret management
- gcp-secret-manager (`gcp-secret-manager`) - GCP secret management

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
