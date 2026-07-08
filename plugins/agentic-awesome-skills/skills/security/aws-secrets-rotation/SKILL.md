---
name: aws-secrets-rotation
description: "Automate AWS secrets rotation for RDS, API keys, and credentials"
category: security
risk: safe
source: community
tags: "[aws, secrets-manager, security, automation, kiro-cli, credentials]"
date_added: "2026-02-27"
---

# AWS Secrets Rotation

Automate rotation of secrets, credentials, and API keys using AWS Secrets Manager and Lambda.

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
  base64 -d > private-key.pem
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

# Check rotation status
aws secretsmanager describe-secret \
  --secret-id prod/db/mysql \
  --query 'RotationEnabled'
```

### Lambda Rotation Function

```python
# lambda_rotation.py
import boto3
import json
import os

secrets_client = boto3.client('secretsmanager')
rds_client = boto3.client('rds')

def lambda_handler(event, context):
    """Rotate RDS MySQL password"""
    
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']
    
    # Get current secret
    current = secrets_client.get_secret_value(SecretId=secret_arn)
    secret = json.loads(current['SecretString'])
    
    if step == "createSecret":
        # Generate new password
        new_password = generate_password()
        secret['password'] = new_password
        
        # Store as pending
        secrets_client.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(secret),
            VersionStages=['AWSPENDING']
        )
    
    elif step == "setSecret":
        # Update RDS password
        rds_client.modify_db_instance(
            DBInstanceIdentifier=secret['dbInstanceIdentifier'],
            MasterUserPassword=secret['password'],
            ApplyImmediately=True
        )
    
    elif step == "testSecret":
        # Test new credentials
        import pymysql
        conn = pymysql.connect(
            host=secret['host'],
            user=secret['username'],
            password=secret['password'],
            database=secret['dbname']
        )
        conn.close()
    
    elif step == "finishSecret":
        # Mark as current
        secrets_client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage='AWSCURRENT',
            MoveToVersionId=token,
            RemoveFromVersionId=current['VersionId']
        )
    
    return {'statusCode': 200}

def generate_password(length=32):
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(alphabet) for _ in range(length))
```

### Custom Rotation for API Keys

```python
# api_key_rotation.py
import boto3
import requests
import json

secrets_client = boto3.client('secretsmanager')

def rotate_stripe_key(secret_arn, token, step):
    """Rotate Stripe API key"""
    
    current = secrets_client.get_secret_value(SecretId=secret_arn)
    secret = json.loads(current['SecretString'])
    
    if step == "createSecret":
        # Create new Stripe key via API
        response = requests.post(
            'https://api.stripe.com/v1/api_keys',
            auth=(secret['api_key'], ''),
            data={'name': f'rotated-{token[:8]}'}
        )
        new_key = response.json()['secret']
        
        secret['api_key'] = new_key
        secrets_client.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(secret),
            VersionStages=['AWSPENDING']
        )
    
    elif step == "testSecret":
        # Test new key
        response = requests.get(
            'https://api.stripe.com/v1/balance',
            auth=(secret['api_key'], '')
        )
        if response.status_code != 200:
            raise Exception("New key failed validation")
    
    elif step == "finishSecret":
        # Revoke old key
        old_key = json.loads(current['SecretString'])['api_key']
        requests.delete(
            f'https://api.stripe.com/v1/api_keys/{old_key}',
            auth=(secret['api_key'], '')
        )
        
        # Promote to current
        secrets_client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage='AWSCURRENT',
            MoveToVersionId=token
        )
```

## Rotation Monitoring

### CloudWatch Alarms

```bash
# Create alarm for rotation failures
aws cloudwatch put-metric-alarm \
  --alarm-name secrets-rotation-failures \
  --alarm-description "Alert on secrets rotation failures" \
  --metric-name RotationFailed \
  --namespace AWS/SecretsManager \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

### Rotation Audit Script

```bash
#!/bin/bash
# audit-rotations.sh

echo "Secrets Rotation Audit"
echo "====================="

aws secretsmanager list-secrets --query 'SecretList[*].[Name,RotationEnabled,LastRotatedDate]' \
  --output text | \
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

# Verify rotation completed
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
    secrets = client.list_secrets()['SecretList']
    
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
