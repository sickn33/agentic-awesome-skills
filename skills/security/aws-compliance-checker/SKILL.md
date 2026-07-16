---
name: aws-compliance-checker
description: "Automated compliance checking against CIS, PCI-DSS, HIPAA, and SOC 2 benchmarks"
category: security
risk: safe
source: community
tags: "[aws, compliance, audit, cis, pci-dss, hipaa, kiro-cli]"
date_added: "2026-02-27"
---

# AWS Compliance Checker

Automated compliance validation against industry standards including CIS AWS Foundations, PCI-DSS, HIPAA, and SOC 2.

## When to Use
Use this skill when you need to validate AWS compliance against industry standards, prepare for audits, or maintain continuous compliance monitoring.

## Supported Frameworks

**CIS AWS Foundations Benchmark**
- Identity and Access Management
- Logging and Monitoring
- Networking
- Data Protection

**PCI-DSS (Payment Card Industry)**
- Network security
- Access controls
- Encryption
- Monitoring and logging

**HIPAA (Healthcare)**
- Access controls
- Audit controls
- Data encryption
- Transmission security

**SOC 2**
- Security
- Availability
- Confidentiality
- Privacy

## CIS AWS Foundations Checks

### Identity & Access Management (1.x)

```bash
#!/bin/bash
# cis-iam-checks.sh

echo "=== CIS IAM Compliance Checks ==="

# 1.1: Root account usage
echo "1.1: Checking root account usage..."
root_usage=$(aws iam get-credential-report --output text | \
  awk -F, 'NR==2 {print $5,$11}')
echo "  Root password last used: $root_usage"

# 1.2: MFA on root account
echo "1.2: Checking root MFA..."
root_mfa=$(aws iam get-account-summary \
  --query 'SummaryMap.AccountMFAEnabled' --output text)
echo "  Root MFA enabled: $root_mfa"

# 1.3: Unused credentials
echo "1.3: Checking for unused credentials (>90 days)..."
aws iam get-credential-report --output text | \
  awk -F, 'NR>1 {
    if ($5 != "N/A" && $5 != "no_information") {
      cmd = "date -d \"" $5 "\" +%s"
      cmd | getline last_used
      close(cmd)
      now = systime()
      days = (now - last_used) / 86400
      if (days > 90) print "  ⚠️  " $1 ": " int(days) " days inactive"
    }
  }'

# 1.4: Access keys rotated
echo "1.4: Checking access key age..."
aws iam list-users --query 'Users[*].UserName' --output text | \
while read user; do
  aws iam list-access-keys --user-name "$user" \
    --query 'AccessKeyMetadata[*].[AccessKeyId,CreateDate]' \
    --output text | \
  while read key_id create_date; do
    age_days=$(( ($(date +%s) - $(date -d "$create_date" +%s)) / 86400 ))
    if [ $age_days -gt 90 ]; then
      echo "  ⚠️  $user: Key $key_id is $age_days days old"
    fi
  done
done

# 1.5-1.11: Password policy
echo "1.5-1.11: Checking password policy..."
policy=$(aws iam get-account-password-policy 2>&1)
if echo "$policy" | grep -q "NoSuchEntity"; then
  echo "  ❌ No password policy configured"
else
  echo "  ✓ Password policy exists"
  echo "$policy" | jq '.PasswordPolicy | {
    MinimumPasswordLength,
    RequireSymbols,
    RequireNumbers,
    RequireUppercaseCharacters,
    RequireLowercaseCharacters,
    MaxPasswordAge,
    PasswordReusePrevention
  }'
fi

# 1.12-1.14: MFA for IAM users
echo "1.12-1.14: Checking IAM user MFA..."
aws iam get-credential-report --output text | \
  awk -F, 'NR>1 && $4=="false" {print "  ⚠️  " $1 ": No MFA"}'
```

### Logging (2.x)

```bash
#!/bin/bash
# cis-logging-checks.sh

echo "=== CIS Logging Compliance Checks ==="

# 2.1: CloudTrail enabled
echo "2.1: Checking CloudTrail..."
trails=$(aws cloudtrail describe-trails \
  --query 'trailList[*].[Name,IsMultiRegionTrail,LogFileValidationEnabled]' \
  --output text)

if [ -z "$trails" ]; then
  echo "  ❌ No CloudTrail configured"
else
  echo "$trails" | while read name multi_region validation; do
    echo "  Trail: $name"
    echo "    Multi-region: $multi_region"
    echo "    Log validation: $validation"
    
    # Check if logging
    status=$(aws cloudtrail get-trail-status --name "$name" \
      --query 'IsLogging' --output text)
    echo "    Is logging: $status"
  done
fi

# 2.2: CloudTrail log file validation
echo "2.2: Checking log file validation..."
aws cloudtrail describe-trails \
  --query 'trailList[?LogFileValidationEnabled==`false`].Name' \
  --output text | \
while read trail; do
  echo "  ⚠️  $trail: Log validation disabled"
done

# 2.3: S3 bucket for CloudTrail
echo "2.3: Checking CloudTrail S3 bucket access..."
aws cloudtrail describe-trails \
  --query 'trailList[*].S3BucketName' --output text | \
while read bucket; do
  public=$(aws s3api get-bucket-acl --bucket "$bucket" 2>&1 | \
    grep -c "AllUsers")
  if [ "$public" -gt 0 ]; then
    echo "  ❌ $bucket: Publicly accessible"
  else
    echo "  ✓ $bucket: Not public"
  fi
done

# 2.4: CloudTrail integrated with CloudWatch Logs
echo "2.4: Checking CloudWatch Logs integration..."
aws cloudtrail describe-trails \
  --query 'trailList[*].[Name,CloudWatchLogsLogGroupArn]' \
  --output text | \
while read name log_group; do
  if [ "$log_group" = "None" ]; then
    echo "  ⚠️  $name: Not integrated with CloudWatch Logs"
  else
    echo "  ✓ $name: Integrated with CloudWatch"
  fi
done

# 2.5: AWS Config enabled
echo "2.5: Checking AWS Config..."
recorders=$(aws configservice describe-configuration-recorders \
  --query 'ConfigurationRecorders[*].name' --output text)

if [ -z "$recorders" ]; then
  echo "  ❌ AWS Config not enabled"
else
  echo "  ✓ AWS Config enabled: $recorders"
fi

# 2.6: S3 bucket logging
echo "2.6: Checking S3 bucket logging..."
aws s3api list-buckets --query 'Buckets[*].Name' --output text | \
while read bucket; do
  logging=$(aws s3api get-bucket-logging --bucket "$bucket" 2>&1)
  if ! echo "$logging" | grep -q "LoggingEnabled"; then
    echo "  ⚠️  $bucket: Access logging disabled"
  fi
done

# 2.7: VPC Flow Logs
echo "2.7: Checking VPC Flow Logs..."
aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output text | \
while read vpc; do
  flow_logs=$(aws ec2 describe-flow-logs \
    --filter "Name=resource-id,Values=$vpc" \
    --query 'FlowLogs[*].FlowLogId' --output text)
  if [ -z "$flow_logs" ]; then
    echo "  ⚠️  $vpc: No flow logs enabled"
  else
    echo "  ✓ $vpc: Flow logs enabled"
  fi
done
```

### Monitoring (3.x)

```bash
#!/bin/bash
# cis-monitoring-checks.sh

echo "=== CIS Monitoring Compliance Checks ==="

# Check for required CloudWatch metric filters and alarms
required_filters=(
  "unauthorized-api-calls"
  "no-mfa-console-signin"
  "root-usage"
  "iam-changes"
  "cloudtrail-changes"
  "console-signin-failures"
  "cmk-changes"
  "s3-bucket-policy-changes"
  "aws-config-changes"
  "security-group-changes"
  "nacl-changes"
  "network-gateway-changes"
  "route-table-changes"
  "vpc-changes"
)

log_group=$(aws cloudtrail describe-trails \
  --query 'trailList[0].CloudWatchLogsLogGroupArn' \
  --output text | cut -d: -f7)

if [ -z "$log_group" ] || [ "$log_group" = "None" ]; then
  echo "  ❌ CloudTrail not integrated with CloudWatch Logs"
else
  echo "Checking metric filters for log group: $log_group"
  
  existing_filters=$(aws logs describe-metric-filters \
    --log-group-name "$log_group" \
    --query 'metricFilters[*].filterName' --output text)
  
  for filter in "${required_filters[@]}"; do
    if echo "$existing_filters" | grep -q "$filter"; then
      echo "  ✓ $filter: Configured"
    else
      echo "  ⚠️  $filter: Missing"
    fi
  done
fi
```

### Networking (4.x)

```bash
#!/bin/bash
# cis-networking-checks.sh

echo "=== CIS Networking Compliance Checks ==="

# 4.1: No security groups allow 0.0.0.0/0 ingress to port 22
echo "4.1: Checking SSH access (port 22)..."
aws ec2 describe-security-groups \
  --query 'SecurityGroups[*].[GroupId,GroupName,IpPermissions]' \
  --output json | \
jq -r '.[] | select(.[2][]? | 
  select(.FromPort == 22 and .IpRanges[]?.CidrIp == "0.0.0.0/0")) | 
  "  ⚠️  \(.[0]): \(.[1]) allows SSH from 0.0.0.0/0"'

# 4.2: No security groups allow 0.0.0.0/0 ingress to port 3389
echo "4.2: Checking RDP access (port 3389)..."
aws ec2 describe-security-groups \
  --query 'SecurityGroups[*].[GroupId,GroupName,IpPermissions]' \
  --output json | \
jq -r '.[] | select(.[2][]? | 
  select(.FromPort == 3389 and .IpRanges[]?.CidrIp == "0.0.0.0/0")) | 
  "  ⚠️  \(.[0]): \(.[1]) allows RDP from 0.0.0.0/0"'

# 4.3: Default security group restricts all traffic
echo "4.3: Checking default security groups..."
aws ec2 describe-security-groups \
  --filters Name=group-name,Values=default \
  --query 'SecurityGroups[*].[GroupId,IpPermissions,IpPermissionsEgress]' \
  --output json | \
jq -r '.[] | select((.[1] | length) > 0 or (.[2] | length) > 1) | 
  "  ⚠️  \(.[0]): Default SG has rules"'
```

## PCI-DSS Compliance Checks

```python
#!/usr/bin/env python3
# pci-dss-checker.py

import boto3

def check_pci_compliance():
    """Check PCI-DSS requirements"""
    
    ec2 = boto3.client('ec2')
    rds = boto3.client('rds')
    s3 = boto3.client('s3')
    
    issues = []
    
    # Requirement 1: Network security
    sgs = ec2.describe_security_groups()
    for sg in sgs['SecurityGroups']:
        for perm in sg.get('IpPermissions', []):
            for ip_range in perm.get('IpRanges', []):
                if ip_range.get('CidrIp') == '0.0.0.0/0':
                    issues.append(f"PCI 1.2: {sg['GroupId']} open to internet")
    
    # Requirement 2: Secure configurations
    # Check for default passwords, etc.
    
    # Requirement 3: Protect cardholder data
    volumes = ec2.describe_volumes()
    for vol in volumes['Volumes']:
        if not vol['Encrypted']:
            issues.append(f"PCI 3.4: Volume {vol['VolumeId']} not encrypted")
    
    # Requirement 4: Encrypt transmission
    # Check for SSL/TLS on load balancers
    
    # Requirement 8: Access controls
    iam = boto3.client('iam')
    users = iam.list_users()
    for user in users['Users']:
        mfa = iam.list_mfa_devices(UserName=user['UserName'])
        if not mfa['MFADevices']:
            issues.append(f"PCI 8.3: {user['UserName']} no MFA")
    
    # Requirement 10: Logging
    cloudtrail = boto3.client('cloudtrail')
    trails = cloudtrail.describe_trails()
    if not trails['trailList']:
        issues.append("PCI 10.1: No CloudTrail enabled")
    
    return issues

if __name__ == "__main__":
    print("PCI-DSS Compliance Check")
    print("=" * 50)
    
    issues = check_pci_compliance()
    
    if not issues:
        print("✓ No PCI-DSS issues found")
    else:
        print(f"Found {len(issues)} issues:\n")
        for issue in issues:
            print(f"  ⚠️  {issue}")
```

## HIPAA Compliance Checks

```bash
#!/bin/bash
# hipaa-checker.sh

echo "=== HIPAA Compliance Checks ==="

# Access Controls (164.308(a)(3))
echo "Access Controls:"
aws iam get-credential-report --output text | \
  awk -F, 'NR>1 && $4=="false" {print "  ⚠️  " $1 ": No MFA (164.312(a)(2)(i))"}'

# Audit Controls (164.312(b))
echo ""
echo "Audit Controls:"
trails=$(aws cloudtrail describe-trails --query 'trailList[*].Name' --output text)
if [ -z "$trails" ]; then
  echo "  ❌ No CloudTrail (164.312(b))"
else
  echo "  ✓ CloudTrail enabled"
fi

# Encryption (164.312(a)(2)(iv))
echo ""
echo "Encryption at Rest:"
aws ec2 describe-volumes \
  --query 'Volumes[?Encrypted==`false`].VolumeId' \
  --output text | \
while read vol; do
  echo "  ⚠️  $vol: Not encrypted (164.312(a)(2)(iv))"
done

aws rds describe-db-instances \
  --query 'DBInstances[?StorageEncrypted==`false`].DBInstanceIdentifier' \
  --output text | \
while read db; do
  echo "  ⚠️  $db: Not encrypted (164.312(a)(2)(iv))"
done

# Transmission Security (164.312(e)(1))
echo ""
echo "Transmission Security:"
echo "  Check: All data in transit uses TLS 1.2+"
```

## Automated Compliance Reporting

```python
#!/usr/bin/env python3
# compliance-report.py

import boto3
import json
from datetime import datetime

def generate_compliance_report(framework='cis'):
    """Generate comprehensive compliance report"""
    
    report = {
        'framework': framework,
        'generated': datetime.now().isoformat(),
        'checks': [],
        'summary': {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'score': 0
        }
    }
    
    # Run all checks based on framework
    if framework == 'cis':
        checks = run_cis_checks()
    elif framework == 'pci':
        checks = run_pci_checks()
    elif framework == 'hipaa':
        checks = run_hipaa_checks()
    
    report['checks'] = checks
    report['summary']['total'] = len(checks)
    report['summary']['passed'] = sum(1 for c in checks if c['status'] == 'PASS')
    report['summary']['failed'] = report['summary']['total'] - report['summary']['passed']
    report['summary']['score'] = (report['summary']['passed'] / report['summary']['total']) * 100
    
    return report

def run_cis_checks():
    # Implement CIS checks
    return []

def run_pci_checks():
    # Implement PCI checks
    return []

def run_hipaa_checks():
    # Implement HIPAA checks
    return []

if __name__ == "__main__":
    import sys
    framework = sys.argv[1] if len(sys.argv) > 1 else 'cis'
    
    report = generate_compliance_report(framework)
    
    print(f"\n{framework.upper()} Compliance Report")
    print("=" * 50)
    print(f"Score: {report['summary']['score']:.1f}%")
    print(f"Passed: {report['summary']['passed']}/{report['summary']['total']}")
    print(f"Failed: {report['summary']['failed']}/{report['summary']['total']}")
    
    # Save to file
    with open(f'compliance-{framework}-{datetime.now().strftime("%Y%m%d")}.json', 'w') as f:
        json.dump(report, f, indent=2)
```

## Example Prompts

- "Run CIS AWS Foundations compliance check"
- "Generate a PCI-DSS compliance report"
- "Check HIPAA compliance for my AWS account"
- "Audit against SOC 2 requirements"
- "Create a compliance dashboard"

## Best Practices

- Run compliance checks weekly
- Automate with Lambda/EventBridge
- Track compliance trends over time
- Document exceptions with justification
- Integrate with AWS Security Hub
- Use AWS Config Rules for continuous monitoring

## Kiro CLI Integration

```bash
kiro-cli chat "Use aws-compliance-checker to run CIS benchmark"
kiro-cli chat "Generate PCI-DSS report with aws-compliance-checker"
```

## Additional Resources

- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [AWS Security Hub](https://aws.amazon.com/security-hub/)
- [AWS Compliance Programs](https://aws.amazon.com/compliance/programs/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
