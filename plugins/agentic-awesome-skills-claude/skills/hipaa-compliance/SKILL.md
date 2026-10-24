---
name: hipaa-compliance
description: Implement HIPAA security and privacy rules. Configure PHI protections
  and BAA requirements. Use when handling healthcare data.
category: security
risk: critical
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

This is a control-mapping aid, not a compliance determination. Establish covered-entity/business-associate applicability and have qualified privacy/security counsel verify current effective rules. Proposed rules are not effective requirements. AES-256, TLS versions, MFA, 15-minute sessions, CMKs and annual/quarterly schedules below are baseline design choices, not universal statutory prescriptions. Addressable does not mean optional without documented risk assessment. Never send PHI to an unapproved service.

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
  individual_notification: "Without unreasonable delay, no later than 60 calendar days after discovery, subject to applicable exceptions"
  hhs_notification: "Fewer than 500 individuals: within 60 days after discovery year ends; 500+: without unreasonable delay and no later than 60 days"
  media_notification: "More than 500 residents of a state/jurisdiction; without unreasonable delay, within 60 days"
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
    - [ ] Log retention set by applicable law, risk analysis and documented policy
    - [ ] Regular log review process documented

  monitoring:
    - [ ] Real-time alerting on unauthorized PHI access attempts
    - [ ] Anomaly detection for unusual data access patterns
    - [ ] Privileged action monitoring
    - [ ] Data export/download alerting
```

## AWS HIPAA-Eligible Architecture

Provisioning examples incur cost and alter account state. Review account, region, names, eligible-service scope, BAA, KMS/network prerequisites and rollback before an authorized change. A HIPAA tag or encryption flag does not establish compliance. `put-event-selectors` replaces existing selectors: read and merge the full desired configuration before applying it.

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
  --manage-master-user-password \
  --allocated-storage 100 \
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

Use bounded, read-only evidence collection in the approved account and regions. A failed/denied API call is **unknown**, never a passing control. For example:

```bash
aws sts get-caller-identity
aws rds describe-db-instances --region us-east-1 \
  --query 'DBInstances[].{ID:DBInstanceIdentifier,Encrypted:StorageEncrypted}' --output json
aws cloudtrail get-trail-status --name hipaa-audit-trail --region us-east-1
```

Record command exit status, account/region, timestamp, resource inventory and coverage gaps before interpreting results. Validate IAM credential-report CSV by named headers with a real CSV parser; fixed field positions and lexicographic dates can misclassify keys. Poll report generation with a bounded deadline and inspect both keys, active state and last-used/rotation fields separately. TLS listener presence does not prove TLS policy, backend encryption or PHI coverage; S3 encryption defaults do not prove every historical object/key policy is adequate. Never label this scan a complete HIPAA risk analysis.


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
    - [ ] Log retention justified and documented; required Security Rule documentation kept for six years from creation or last effective date, whichever is later
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
- Retain required Security Rule documentation for six years from creation or last effective date, whichever is later; determine audit-log retention separately
- Train all workforce members on HIPAA policies at onboarding and annually
- Test contingency plans (backup restore, DR failover, emergency access) at least annually
- Track all Business Associate Agreements in a central registry with review dates
- Document every addressable specification decision (implement, alternative, or not applicable with rationale)
- Prepare breach notification templates and procedures before an incident occurs

## Primary References

- [HHS Security Rule summary](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [HHS encryption guidance](https://www.hhs.gov/hipaa/for-professionals/faq/is-the-use-of-encryption-mandatory-in-the-security-rule/index.html)
- [HHS breach notification](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
