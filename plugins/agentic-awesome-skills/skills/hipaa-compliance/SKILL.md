---
name: hipaa-compliance
description: Implement HIPAA security and privacy rules. Configure PHI protections
  and BAA requirements. Use when handling healthcare data.
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

# HIPAA Compliance

Implement HIPAA Security Rule, Privacy Rule, and Breach Notification Rule requirements for systems that create, receive, maintain, or transmit electronic Protected Health Information (ePHI).

## When to Use

- Building or operating systems that handle electronic Protected Health Information
- Configuring cloud infrastructure for HIPAA-eligible workloads
- Establishing Business Associate Agreements with vendors
- Implementing technical safeguards for PHI protection
- Preparing for HIPAA compliance audits or OCR investigations

## HIPAA Rules and Safeguards

```yaml
security_rule:
  administrative_safeguards:
    164.308_a_1: "Security Management Process"
    actions:
      - Conduct risk analysis (required)
      - Implement risk management program (required)
      - Apply sanction policy for violations (required)
      - Review information system activity (required)

    164.308_a_3: "Workforce Security"
    actions:
      - Authorization/supervision procedures (addressable)
      - Workforce clearance procedure (addressable)
      - Termination procedures (addressable)

    164.308_a_4: "Information Access Management"
    actions:
      - Access authorization policies (addressable)
      - Access establishment and modification (addressable)
      - Isolate healthcare clearinghouse functions (required)

    164.308_a_5: "Security Awareness and Training"
    actions:
      - Security reminders (addressable)
      - Protection from malicious software (addressable)
      - Log-in monitoring (addressable)
      - Password management (addressable)

    164.308_a_6: "Security Incident Procedures"
    actions:
      - Response and reporting procedures (required)

    164.308_a_7: "Contingency Plan"
    actions:
      - Data backup plan (required)
      - Disaster recovery plan (required)
      - Emergency mode operation plan (required)
      - Testing and revision procedures (addressable)
      - Applications and data criticality analysis (addressable)

    164.308_a_8: "Evaluation"
    actions:
      - Periodic technical and nontechnical evaluation (required)

  physical_safeguards:
    164.310_a: "Facility Access Controls"
    164.310_b: "Workstation Use"
    164.310_c: "Workstation Security"
    164.310_d: "Device and Media Controls"

  technical_safeguards:
    164.312_a: "Access Control"
    actions:
      - Unique user identification (required)
      - Emergency access procedure (required)
      - Automatic logoff (addressable)
      - Encryption and decryption (addressable)

    164.312_b: "Audit Controls"
    actions:
      - Implement hardware/software/procedural mechanisms to record and examine access (required)

    164.312_c: "Integrity"
    actions:
      - Mechanism to authenticate ePHI (addressable)

    164.312_d: "Person or Entity Authentication"
    actions:
      - Verify identity of person/entity seeking access (required)

    164.312_e: "Transmission Security"
    actions:
      - Integrity controls (addressable)
      - Encryption (addressable)

privacy_rule:
  minimum_necessary: "Limit PHI use, disclosure, and requests to minimum necessary"
  individual_rights: "Access, amendment, accounting of disclosures, restrictions"
  notice_of_practices: "Provide notice of privacy practices to individuals"

breach_notification_rule:
  individual_notification: "Within 60 days of discovery"
  hhs_notification: "Annual for <500 records; within 60 days for 500+"
  media_notification: "Required when 500+ individuals in a state/jurisdiction"
```

## Technical Safeguards Implementation Checklist

```yaml
encryption_requirements:
  at_rest:
    standard: AES-256
    aws_services:
      - [ ] RDS encryption enabled (KMS managed key)
      - [ ] S3 bucket default encryption (SSE-KMS)
      - [ ] EBS volume encryption enabled
      - [ ] DynamoDB table encryption (KMS)
      - [ ] ElastiCache encryption at rest enabled
      - [ ] Redshift cluster encryption enabled
      - [ ] EFS encryption enabled
    azure_services:
      - [ ] Azure SQL TDE enabled (customer-managed key)
      - [ ] Storage Account encryption (CMK)
      - [ ] Managed Disk encryption (SSE with CMK)
      - [ ] Cosmos DB encryption at rest
    gcp_services:
      - [ ] Cloud SQL encryption (CMEK)
      - [ ] Cloud Storage encryption (CMEK)
      - [ ] BigQuery encryption (CMEK)
      - [ ] Persistent Disk encryption (CMEK)

  in_transit:
    standard: TLS 1.2 or higher
    checks:
      - [ ] TLS 1.2+ enforced on all load balancers
      - [ ] HTTP-to-HTTPS redirect enabled
      - [ ] Internal service-to-service mTLS configured
      - [ ] Database connections use SSL/TLS
      - [ ] API gateways enforce TLS minimum version
      - [ ] Email encryption for PHI (S/MIME or TLS)
      - [ ] VPN or private connectivity for admin access

  key_management:
    - [ ] Customer-managed KMS keys for PHI data stores
    - [ ] Key rotation enabled (annual minimum)
    - [ ] Key access restricted to authorized roles only
    - [ ] Key usage audited via CloudTrail / audit logs
    - [ ] Key deletion protection enabled

access_control:
  unique_user_identification:
    - [ ] Individual user accounts (no shared credentials)
    - [ ] MFA enforced for all users accessing PHI systems
    - [ ] Service accounts with unique identities and audited usage
    - [ ] Federated identity with SSO (SAML/OIDC)

  role_based_access:
    - [ ] Least privilege roles defined per job function
    - [ ] PHI access restricted to need-to-know
    - [ ] Separate roles for data access vs. administration
    - [ ] Privileged access requires just-in-time approval

  session_management:
    - [ ] Automatic session timeout (15 minutes idle for workstations)
    - [ ] Re-authentication for sensitive operations
    - [ ] Concurrent session limits
    - [ ] Session tokens secured (HttpOnly, Secure, SameSite)

  emergency_access:
    - [ ] Break-glass procedure documented and tested
    - [ ] Emergency access credentials stored securely
    - [ ] All emergency access usage audited and reviewed
    - [ ] Emergency access automatically expires

audit_controls:
  logging_requirements:
    - [ ] All PHI access logged (read, write, delete)
    - [ ] User authentication events logged
    - [ ] Administrative actions logged
    - [ ] Failed access attempts logged
    - [ ] Log integrity protection (hash chaining or WORM storage)
    - [ ] Logs retained for minimum 6 years
    - [ ] Regular log review process documented

  monitoring:
    - [ ] Real-time alerting on unauthorized PHI access attempts
    - [ ] Anomaly detection for unusual data access patterns
    - [ ] Privileged action monitoring
    - [ ] Data export/download alerting
```

## AWS HIPAA-Eligible Architecture

```bash
# Verify you are using only HIPAA-eligible AWS services
# Reference: https://aws.amazon.com/compliance/hipaa-eligible-services-reference/

# Create a dedicated VPC for PHI workloads
aws ec2 create-vpc --cidr-block 10.100.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=phi-vpc},{Key=Compliance,Value=HIPAA}]'

# Enable VPC flow logs for network auditing
aws ec2 create-flow-log \
  --resource-type VPC \
  --resource-ids vpc-XXXXXXXX \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /vpc/phi-flow-logs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/VPCFlowLogsRole

# Create encrypted RDS instance for PHI
aws rds create-db-instance \
  --db-instance-identifier phi-database \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --master-username admin \
  --master-user-password "USE_SECRETS_MANAGER" \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:alias/phi-rds-key \
  --vpc-security-group-ids sg-XXXXXXXX \
  --db-subnet-group-name phi-subnet-group \
  --backup-retention-period 35 \
  --multi-az \
  --deletion-protection \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]' \
  --tags Key=Compliance,Value=HIPAA Key=DataClassification,Value=PHI

# Create S3 bucket with HIPAA controls
aws s3api create-bucket --bucket phi-data-bucket --region us-east-1

aws s3api put-bucket-encryption --bucket phi-data-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms", "KMSMasterKeyID": "alias/phi-s3-key"}, "BucketKeyEnabled": true}]
  }'

aws s3api put-public-access-block --bucket phi-data-bucket \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-versioning --bucket phi-data-bucket \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-logging --bucket phi-data-bucket \
  --bucket-logging-status '{"LoggingEnabled": {"TargetBucket": "phi-access-logs", "TargetPrefix": "phi-data-bucket/"}}'

# Enable CloudTrail data events for PHI buckets
aws cloudtrail put-event-selectors --trail-name hipaa-audit-trail \
  --advanced-event-selectors '[{
    "Name": "PHI-S3-DataEvents",
    "FieldSelectors": [
      {"Field": "eventCategory", "Equals": ["Data"]},
      {"Field": "resources.type", "Equals": ["AWS::S3::Object"]},
      {"Field": "resources.ARN", "StartsWith": ["arn:aws:s3:::phi-data-bucket/"]}
    ]
  }]'
```

## Business Associate Agreement Tracking

```yaml
baa_tracking:
  required_when:
    - Vendor creates, receives, maintains, or transmits PHI on your behalf
    - Subcontractor of a business associate handles PHI
    - Cloud service provider stores or processes PHI

  not_required_for:
    - Conduit exception (postal service, ISP carrying encrypted data)
    - Treatment providers sharing PHI for treatment purposes
    - Plan sponsor receiving summary health information

  baa_registry:
    format:
      vendor_name: ""
      baa_execution_date: ""
      baa_expiration_date: ""
      phi_types_shared: []
      services_provided: ""
      subcontractors_identified: []
      breach_notification_sla: "hours"
      last_risk_assessment: ""
      next_review_date: ""
      status: "active | pending | expired"

  cloud_provider_baas:
    aws:
      - Sign AWS BAA via AWS Artifact in the console
      - Applies to all HIPAA-eligible services in the account
      - Must restrict PHI to eligible services only
    azure:
      - Microsoft BAA is part of Online Services Terms
      - Automatically applies when using qualifying services
    gcp:
      - Sign Google Cloud BAA via Google Workspace Admin or Cloud console
      - Covers HIPAA-eligible GCP services

  review_schedule:
    - [ ] Annual review of all active BAAs
    - [ ] Verify vendor compliance certifications are current
    - [ ] Confirm subcontractor BAAs are in place
    - [ ] Update BAA registry with any vendor changes
    - [ ] Assess vendor security posture annually
```

## Risk Analysis Automation

```bash
#!/usr/bin/env bash
# hipaa-risk-scan.sh - Technical risk analysis checks for HIPAA

echo "=== HIPAA Technical Safeguard Checks ==="

echo "--- Encryption at Rest ---"
# Check for unencrypted RDS instances
UNENCRYPTED_RDS=$(aws rds describe-db-instances \
  --query 'DBInstances[?StorageEncrypted==`false`].DBInstanceIdentifier' --output text)
[ -z "$UNENCRYPTED_RDS" ] && echo "PASS: All RDS instances encrypted" || \
  echo "FAIL: Unencrypted RDS: $UNENCRYPTED_RDS"

# Check for unencrypted S3 buckets
for bucket in $(aws s3api list-buckets --query 'Buckets[*].Name' --output text); do
  enc=$(aws s3api get-bucket-encryption --bucket "$bucket" 2>/dev/null)
  [ -z "$enc" ] && echo "FAIL: S3 bucket $bucket has no default encryption"
done

# Check for unencrypted EBS volumes
UNENCRYPTED_EBS=$(aws ec2 describe-volumes \
  --query 'Volumes[?Encrypted==`false`].VolumeId' --output text)
[ -z "$UNENCRYPTED_EBS" ] && echo "PASS: All EBS volumes encrypted" || \
  echo "FAIL: Unencrypted EBS: $UNENCRYPTED_EBS"

echo "--- Access Control ---"
# Check for users without MFA
aws iam generate-credential-report > /dev/null 2>&1 && sleep 5
aws iam get-credential-report --output text --query Content | base64 -d | \ <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
  awk -F, '$4=="true" && $8=="false" {print "FAIL: User without MFA: "$1}'

# Check for unused access keys (90+ days)
THRESHOLD=$(date -d '90 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v-90d +%Y-%m-%dT%H:%M:%S)
aws iam get-credential-report --output text --query Content | base64 -d | \ <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
  awk -F, -v t="$THRESHOLD" 'NR>1 && $11!="N/A" && $11<t {print "WARN: Stale access key for "$1}'

echo "--- Audit Controls ---"
# Verify CloudTrail is logging
CT_STATUS=$(aws cloudtrail get-trail-status --name hipaa-audit-trail --query 'IsLogging' --output text)
[ "$CT_STATUS" = "True" ] && echo "PASS: CloudTrail active" || echo "FAIL: CloudTrail not logging"

# Verify VPC flow logs
for vpc in $(aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output text); do
  fl=$(aws ec2 describe-flow-logs --filter "Name=resource-id,Values=$vpc" --query 'FlowLogs[0].FlowLogId' --output text)
  [ "$fl" = "None" ] && echo "FAIL: No flow logs for VPC $vpc"
done

echo "--- Transmission Security ---"
# Check for ALBs without HTTPS listener
for alb in $(aws elbv2 describe-load-balancers --query 'LoadBalancers[*].LoadBalancerArn' --output text); do
  HTTPS=$(aws elbv2 describe-listeners --load-balancer-arn "$alb" \
    --query 'Listeners[?Protocol==`HTTPS`].ListenerArn' --output text)
  [ -z "$HTTPS" ] && echo "FAIL: ALB without HTTPS: $alb"
done

echo "=== Scan complete ==="
```

## HIPAA Compliance Checklist

```yaml
hipaa_compliance_checklist:
  administrative:
    - [ ] Risk analysis conducted and documented
    - [ ] Risk management plan implemented
    - [ ] Security officer designated
    - [ ] Privacy officer designated
    - [ ] Workforce security awareness training completed
    - [ ] Sanction policy documented and communicated
    - [ ] Contingency plan (backup, DR, emergency mode) documented
    - [ ] Business associate agreements signed for all applicable vendors
    - [ ] Periodic evaluation/audit scheduled

  technical:
    - [ ] Unique user identification enforced
    - [ ] MFA enabled for all PHI system access
    - [ ] Automatic logoff configured (15-minute timeout)
    - [ ] Encryption at rest (AES-256) for all PHI stores
    - [ ] Encryption in transit (TLS 1.2+) for all PHI transmission
    - [ ] Audit logging enabled for all PHI access
    - [ ] Log retention configured for 6+ years
    - [ ] Integrity controls on PHI (checksums, signatures)
    - [ ] Emergency access (break-glass) procedure tested

  physical:
    - [ ] Facility access controls documented
    - [ ] Workstation use policy in place
    - [ ] Device and media disposal procedures documented
    - [ ] Media re-use procedures documented

  breach_response:
    - [ ] Breach notification procedure documented
    - [ ] Breach risk assessment methodology defined
    - [ ] Individual notification template prepared
    - [ ] HHS notification process understood
    - [ ] Breach log maintained
    - [ ] Annual breach assessment reviewed

  operational:
    - [ ] PHI data inventory maintained
    - [ ] Minimum necessary access enforced
    - [ ] Access reviews conducted quarterly
    - [ ] Vendor risk assessments current
    - [ ] Incident response plan tested annually
    - [ ] Policies reviewed and updated annually
```

## Best Practices

- Conduct a thorough risk analysis annually and after significant system changes
- Use only HIPAA-eligible cloud services and sign BAAs before deploying PHI workloads
- Encrypt all PHI at rest and in transit with no exceptions
- Implement the minimum necessary standard: grant access only to the PHI needed for each role
- Maintain audit logs of all PHI access for a minimum of 6 years
- Train all workforce members on HIPAA policies at onboarding and annually
- Test contingency plans (backup restore, DR failover, emergency access) at least annually
- Track all Business Associate Agreements in a central registry with review dates
- Document every addressable specification decision (implement, alternative, or not applicable with rationale)
- Prepare breach notification templates and procedures before an incident occurs

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
