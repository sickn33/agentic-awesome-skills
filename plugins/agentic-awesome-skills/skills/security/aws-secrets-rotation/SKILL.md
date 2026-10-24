---
name: aws-secrets-rotation
description: "Automate AWS secrets rotation for RDS, API keys, and credentials"
category: security
risk: critical
source: community
tags: "[aws, secrets-manager, security, automation, kiro-cli, credentials]"
date_added: "2026-02-27"
---

# AWS Secrets Rotation

Automate rotation of secrets, credentials, and API keys using AWS Secrets Manager and Lambda.

## Review scope and execution boundaries

Select the exact account/role, partition, regions and control/framework version before collecting evidence; verify identity with `aws sts get-caller-identity`. Read-only assessment is the default. Commands that create MFA devices, change policies/keys, enable services, rotate secrets or create alarms require an approved change scope and rollback plan. Keep evidence and secret material out of shared logs.

These are partial examples, not certification or complete benchmark implementations. Control numbers are illustrative historical mappings, not a pinned current benchmark. Record PASS/FAIL/UNKNOWN/NOT-APPLICABLE per control with evidence and coverage. AccessDenied, API errors, missing permissions, absent pages and unimplemented checks are UNKNOWN, never PASS. Use paginators for SDK listings and cover all selected regions/accounts; never infer completeness from no findings. Shell snippets require Bash/GNU date, AWS CLI, jq and error checking (`set -euo pipefail` in complete scripts). Generate the IAM credential report first, wait for COMPLETE and decode its base64 Content; parse CSV by header in production. Credential reports are sensitive.

## When to Use
Use this skill when you need to implement automated secrets rotation, manage credentials securely, or comply with security policies requiring regular key rotation.

## Supported Secret Types

**AWS Services**
- RDS database credentials
- DocumentDB credentials
- Redshift credentials
- ElastiCache credentials

**Third-Party Services**
- API keys
- OAuth tokens
- SSH keys
- Custom credentials

## Secrets Manager Setup

### Create a Secret

Placeholders below are not deployable credentials. Use private input files (`--secret-string file://...`) rather than inline real secret values visible in shell history/process arguments. Binary output files need umask 077 and exclusive creation; never overwrite a real private key.

```bash
# Create RDS secret
aws secretsmanager create-secret \
  --name prod/db/mysql \
  --description "Production MySQL credentials" \
  --secret-string '{
    "username": "admin",
    "password": "CHANGE_ME",
    "engine": "mysql",
    "host": "mydb.cluster-abc.us-east-1.rds.amazonaws.com",
    "port": 3306,
    "dbname": "myapp"
  }'

# Create API key secret
aws secretsmanager create-secret \
  --name prod/api/stripe \
  --secret-string '{
    "api_key": "sk_live_xxxxx",
    "webhook_secret": "whsec_xxxxx"
  }'

# Create secret from file
aws secretsmanager create-secret \
  --name prod/ssh/private-key \
  --secret-binary fileb://~/.ssh/id_rsa
```

### Retrieve Secrets

```bash
# Get secret value
aws secretsmanager get-secret-value \
  --secret-id prod/db/mysql \
  --query 'SecretString' --output text

# Get specific field
aws secretsmanager get-secret-value \
  --secret-id prod/db/mysql \
  --query 'SecretString' --output text | \
  jq -r '.password'

# Get binary secret
aws secretsmanager get-secret-value \
  --secret-id prod/ssh/private-key \
  --query 'SecretBinary' --output text | \
  base64 --decode > "$PRIVATE_OUTPUT_FILE"  # fresh private path, umask 077
```

## Automatic Rotation Setup

### Enable RDS Rotation

```bash
# Enable automatic rotation (30 days)
aws secretsmanager rotate-secret \
  --secret-id prod/db/mysql \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRDSMySQLRotation \
  --rotation-rules AutomaticallyAfterDays=30

# Rotate immediately
aws secretsmanager rotate-secret \
  --secret-id prod/db/mysql

# Check configuration only; completion requires expected VersionId at AWSCURRENT
# and successful target authentication/consumer refresh.
aws secretsmanager describe-secret \
  --secret-id prod/db/mysql \
  --query 'RotationEnabled'
```

### Lambda rotation implementation

Use the AWS-maintained rotation template appropriate to the database/service and verify its permissions and network prerequisites. A function must validate SecretId, rotation enabled state, ClientRequestToken membership and AWSPENDING stage before mutation; already-current tokens should return idempotently.

1. `createSecret`: reuse an existing pending version for this token or generate/store it once.
2. `setSecret`: retrieve that exact pending VersionId and AWSPENDING stage; verify current/pending refer to the same authorized host/account/user before changing the target. Never update the database with AWSCURRENT by mistake.
3. `testSecret`: connect using the pending credentials, bounded timeouts, TLS verification and minimum permissions; close connections on all paths.
4. `finishSecret`: promote the tested pending version; remove AWSCURRENT from the previous version only as documented. Monitor consumers and retain a recovery path.

Do not substitute an asynchronous master-password modification for a working database-user rotation implementation. Application refresh, overlapping credentials and retry/idempotency behavior need integration tests.

### Stripe and other provider API keys

Stripe documents creation, expiration and rotation through its Dashboard. This skill does not provide a verified key-management API. Do not call invented `/v1/api_keys` creation/revocation endpoints or put secret key material in URL paths. Follow the provider's documented workflow, stage the replacement privately in Secrets Manager, update/test consumers, and revoke the old key after confirmed rollout. Webhook signing secrets are a separate credential.

## Rotation Monitoring

### CloudWatch Alarms

The following is a **custom metric contract**, not a guaranteed native Secrets Manager metric. Publish `RotationFailed` in your own namespace from monitored failure events; verify a test failure reaches the alarm and SNS destination. An alarm on a nonexistent series does not detect failures.

```bash
# Create alarm for rotation failures
aws cloudwatch put-metric-alarm \
  --alarm-name secrets-rotation-failures \
  --alarm-description "Alert on secrets rotation failures" \
  --metric-name RotationFailed \
  --namespace MyApp/SecretRotation \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

### Rotation Audit Script

```bash
#!/bin/bash
# audit-rotations.sh

echo "Secrets Rotation Audit"
echo "====================="

aws secretsmanager list-secrets --query 'SecretList[*].[Name,RotationEnabled,LastRotatedDate]' \
  --output text | tr '\t' '\n' | \
while read name enabled last_rotated; do
  echo ""
  echo "Secret: $name"
  echo "  Rotation Enabled: $enabled"
  echo "  Last Rotated: $last_rotated"
  
  if [ "$enabled" = "True" ]; then
    # Check rotation schedule
    rules=$(aws secretsmanager describe-secret --secret-id "$name" \
      --query 'RotationRules.AutomaticallyAfterDays' --output text)
    echo "  Rotation Schedule: Every $rules days"
    
    # Calculate days since last rotation
    if [ "$last_rotated" != "None" ]; then
      days_ago=$(( ($(date +%s) - $(date -d "$last_rotated" +%s)) / 86400 ))
      echo "  Days Since Rotation: $days_ago"
      
      if [ $days_ago -gt $rules ]; then
        echo "  ⚠️  OVERDUE for rotation!"
      fi
    fi
  fi
done
```

## Application Integration

### Python SDK

```python
import boto3
import json

def get_secret(secret_name):
    """Retrieve secret from Secrets Manager"""
    client = boto3.client('secretsmanager')
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    except Exception as e:
        print(f"Error retrieving secret: {e}")
        raise

# Usage
db_creds = get_secret('prod/db/mysql')
connection = pymysql.connect(
    host=db_creds['host'],
    user=db_creds['username'],
    password=db_creds['password'],
    database=db_creds['dbname']
)
```

### Node.js SDK

This is legacy AWS SDK v2 syntax. For a new integration use the installed AWS SDK v3 SecretsManagerClient/GetSecretValueCommand API and its current credential chain. Do not log complete SDK errors or secret responses.

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: secretName
    }).promise();
    
    return JSON.parse(data.SecretString);
  } catch (err) {
    console.error('Error retrieving secret:', err);
    throw err;
  }
}

// Usage
const dbCreds = await getSecret('prod/db/mysql');
const connection = mysql.createConnection({
  host: dbCreds.host,
  user: dbCreds.username,
  password: dbCreds.password,
  database: dbCreds.dbname
});
```

## Rotation Best Practices

**Planning**
- [ ] Identify all secrets requiring rotation
- [ ] Define rotation schedules (30, 60, 90 days)
- [ ] Test rotation in non-production first
- [ ] Document rotation procedures
- [ ] Plan for emergency rotation

**Implementation**
- [ ] Use AWS managed rotation when possible
- [ ] Implement proper error handling
- [ ] Add CloudWatch monitoring
- [ ] Test application compatibility
- [ ] Implement gradual rollout

**Operations**
- [ ] Monitor rotation success/failure
- [ ] Set up alerts for failures
- [ ] Regular rotation audits
- [ ] Document troubleshooting steps
- [ ] Maintain rotation runbooks

## Emergency Rotation

```bash
# Immediate rotation (compromise detected)
aws secretsmanager rotate-secret \
  --secret-id prod/db/mysql \
  --rotate-immediately

# Force rotation even if recently rotated
aws secretsmanager rotate-secret \
  --secret-id prod/api/stripe \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:RotateStripeKey \
  --rotate-immediately

# LastRotatedDate alone does not prove this requested rotation completed.
aws secretsmanager describe-secret \
  --secret-id prod/db/mysql \
  --query 'LastRotatedDate'
```

## Compliance Tracking

```python
#!/usr/bin/env python3
# compliance-report.py

import boto3
from datetime import datetime, timedelta

client = boto3.client('secretsmanager')

def generate_compliance_report():
    secrets = [s for page in client.get_paginator('list_secrets').paginate() for s in page['SecretList']]
    
    compliant = []
    non_compliant = []
    
    for secret in secrets:
        name = secret['Name']
        rotation_enabled = secret.get('RotationEnabled', False)
        last_rotated = secret.get('LastRotatedDate')
        
        if not rotation_enabled:
            non_compliant.append({
                'name': name,
                'issue': 'Rotation not enabled'
            })
            continue
        
        if last_rotated:
            days_ago = (datetime.now(last_rotated.tzinfo) - last_rotated).days
            if days_ago > 90:
                non_compliant.append({
                    'name': name,
                    'issue': f'Not rotated in {days_ago} days'
                })
            else:
                compliant.append(name)
        else:
            non_compliant.append({
                'name': name,
                'issue': 'Never rotated'
            })
    
    print(f"Compliant Secrets: {len(compliant)}")
    print(f"Non-Compliant Secrets: {len(non_compliant)}")
    print("\nNon-Compliant Details:")
    for item in non_compliant:
        print(f"  - {item['name']}: {item['issue']}")

if __name__ == "__main__":
    generate_compliance_report()
```

## Example Prompts

- "Set up automatic rotation for my RDS credentials"
- "Create a Lambda function to rotate API keys"
- "Audit all secrets for rotation compliance"
- "Implement emergency rotation for compromised credentials"
- "Generate a secrets rotation report"

## Kiro CLI Integration

```bash
kiro-cli chat "Use aws-secrets-rotation to set up RDS credential rotation"
kiro-cli chat "Create a rotation audit report with aws-secrets-rotation"
```

## Additional Resources

- [AWS Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [Rotation Lambda Templates](https://github.com/aws-samples/aws-secrets-manager-rotation-lambdas)
- [Best Practices for Secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
