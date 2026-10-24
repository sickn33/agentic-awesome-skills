---
name: disaster-recovery
description: Implement disaster recovery strategies and runbooks. Configure RPO/RTO
  targets and failover procedures. Use when planning for business continuity.
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

# Disaster Recovery

Implement disaster recovery strategies including RTO/RPO planning, AWS cross-region failover patterns, DR testing procedures, and automated failover scripts.

## RTO/RPO Planning

```yaml
recovery_metrics:
  RTO:
    definition: "Recovery Time Objective - maximum acceptable downtime"
    measurement: "From the agreed service disruption point to verified recovery; record detection/declaration separately"
    factors:
      - Failover automation maturity
      - Data replication lag
      - DNS propagation time
      - Application warm-up time
      - Verification procedures

  RPO:
    definition: "Recovery Point Objective - maximum acceptable data loss"
    measurement: "Gap between latest recoverable consistent data and disruption; backups/replication may be stale or corrupted"
    factors:
      - Backup frequency
      - Replication method (sync vs. async)
      - Transaction log shipping interval
      - Cross-region replication lag

service_tier_targets:
  tier_1_critical:
    examples: "Authentication, payment processing, core API"
    rto: "< 15 minutes"
    rpo: "< 1 minute (near-zero)"
    strategy: "Multi-site active-active or warm standby"
    replication: "Synchronous or near-synchronous"
    testing: "Quarterly failover test"

  tier_2_essential:
    examples: "Customer dashboards, reporting, notifications"
    rto: "< 1 hour"
    rpo: "< 15 minutes"
    strategy: "Warm standby or pilot light"
    replication: "Asynchronous with short interval"
    testing: "Semi-annual failover test"

  tier_3_standard:
    examples: "Internal tools, analytics, batch processing"
    rto: "< 4 hours"
    rpo: "< 1 hour"
    strategy: "Pilot light or backup and restore"
    replication: "Periodic snapshots"
    testing: "Annual failover test"

  tier_4_non_essential:
    examples: "Development environments, documentation sites"
    rto: "< 24 hours"
    rpo: "< 24 hours"
    strategy: "Backup and restore"
    replication: "Daily backups"
    testing: "Annual backup restore verification"
```

## DR Strategies Comparison

```yaml
strategies:
  backup_and_restore:
    rto: "Hours"
    rpo: "Hours (depends on backup frequency)"
    cost: "$"
    description: "Regular backups stored in DR region. Restore from backup when needed."
    aws_services:
      - "S3 cross-region replication for backups"
      - "RDS automated snapshots copied to DR region"
      - "AMI copies in DR region"
      - "Terraform/CloudFormation for infrastructure rebuild"
    pros: "Lowest cost, simplest to maintain"
    cons: "Longest recovery time, highest data loss potential"

  pilot_light:
    rto: "Minutes to hours"
    rpo: "Minutes"
    cost: "$$"
    description: "Core infrastructure running in DR region (databases replicated). Scale up compute on failover."
    aws_services:
      - "RDS cross-region read replica (always running)"
      - "S3 cross-region replication"
      - "AMIs pre-built in DR region"
      - "Auto Scaling groups at zero/minimal capacity"
    pros: "Fast database recovery, moderate cost"
    cons: "Compute scale-up adds to recovery time"

  warm_standby:
    rto: "Minutes"
    rpo: "Seconds to minutes"
    cost: "$$$"
    description: "Scaled-down but functional environment in DR region. Scale up on failover."
    aws_services:
      - "RDS cross-region read replica"
      - "ECS/EKS running at reduced capacity"
      - "Route53 health checks for automated DNS failover"
      - "Global Accelerator for traffic management"
    pros: "Fast failover, reduced risk"
    cons: "Higher baseline cost for idle resources"

  multi_site_active:
    rto: "Near-zero"
    rpo: "Near-zero"
    cost: "$$$$"
    description: "Active-active across regions. Traffic served from both regions simultaneously."
    aws_services:
      - "DynamoDB Global Tables where appropriate; Aurora Global Database normally has one writer region, not multi-region active-active writes"
      - "Route53 latency/weighted routing"
      - "CloudFront with multi-origin"
      - "Global Accelerator"
      - "ECS/EKS in both regions"
    pros: "Minimal downtime and data loss"
    cons: "Highest cost, most complex to operate"
```

## AWS Cross-Region DR Implementation

Fragments below provision or replace paid production configuration: confirm exact
account, engine/version support, target region, KMS/IAM grants, backups and approved
change window first. The listed tier timings/frequencies are planning examples,
not platform guarantees or universal compliance rules. Aurora secondary-cluster
creation also needs supported regional engine/version, subnet/security settings
and instances; a cluster object alone is not a working DR application.
S3 requires versioning on both buckets, replication-role/KMS permissions and
explicit handling of existing objects; put-bucket-replication replaces existing
rules, so merge a reviewed snapshot rather than overwriting it. Replication is not
an immutable backup and can replicate corruption/deletion. Use a private unique
temporary file instead of shared `/tmp/replication-config.json` when implementing.

## AWS Cross-Region DR Implementation

```bash
# === Database Replication ===

# Create cross-region RDS read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier prod-db-dr-replica \
  --source-db-instance-identifier arn:aws:rds:us-east-1:123456789012:db:prod-db \
  --db-instance-class db.r6g.large \
  --region us-west-2 \
  --kms-key-id arn:aws:kms:us-west-2:123456789012:alias/rds-dr-key \
  --multi-az \
  --tags Key=Purpose,Value=DR Key=Environment,Value=production

# Create Aurora Global Database for near-zero RPO
aws rds create-global-cluster \
  --global-cluster-identifier prod-global-db \
  --source-db-cluster-identifier arn:aws:rds:us-east-1:123456789012:cluster:prod-aurora-cluster \
  --region us-east-1

# Add secondary region to Aurora Global Database
aws rds create-db-cluster \
  --db-cluster-identifier prod-aurora-dr \
  --global-cluster-identifier prod-global-db \
  --engine aurora-postgresql \
  --region us-west-2 \
  --kms-key-id arn:aws:kms:us-west-2:123456789012:alias/aurora-dr-key

# === Storage Replication ===

# S3 cross-region replication
cat > /tmp/replication-config.json << 'EOF'
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "ReplicateAll",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::prod-data-dr-usw2",
        "StorageClass": "STANDARD",
        "EncryptionConfiguration": {
          "ReplicaKmsKeyID": "arn:aws:kms:us-west-2:123456789012:alias/s3-dr-key"
        }
      },
      "DeleteMarkerReplication": {"Status": "Disabled"},
      "Priority": 1,
      "SourceSelectionCriteria": {"SseKmsEncryptedObjects": {"Status": "Enabled"}}
    }
  ]
}
EOF

aws s3api put-bucket-replication \
  --bucket prod-data-use1 \
  --replication-configuration file:///tmp/replication-config.json

# === DNS Failover ===

# Route53 health check for primary region
aws route53 create-health-check --caller-reference "prod-health-$(date +%s)" \
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "primary-health.example.com",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 3,
    "EnableSNI": true
  }'

# Configure failover routing
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "primary",
          "Failover": "PRIMARY",
          "AliasTarget": {
            "HostedZoneId": "Z1234PRIMARY",
            "DNSName": "primary-alb.us-east-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          },
          "HealthCheckId": "health-check-id-primary"
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "secondary",
          "Failover": "SECONDARY",
          "AliasTarget": {
            "HostedZoneId": "Z5678SECONDARY",
            "DNSName": "dr-alb.us-west-2.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'
```

## Failover runbook and worked drill

The former executable script promoted a replica and declared success after a
health URL without fencing the primary, updating app DB credentials or verifying
routing/data. Do not automate that sequence unchanged. Use an owner-approved,
service-specific runbook with explicit incident authority and rollback limits:

1. Record disruption/declaration times, intended account/regions and last verified
   recoverable transaction/replication lag. Obtain the loss acceptance decision.
2. Fence the old writer and producers, including jobs/webhooks, and verify fencing;
   a network partition can leave a healthy writer reachable from some clients.
3. Promote the selected replica with service-specific prerequisites; record the
   returned status and wait under bounded operator supervision. A promotion breaks
   the old replication relationship and may not be automatically reversible.
4. Update DR app database endpoint/secret references, migration compatibility,
   queues, session stores and allowlists. Scale approved capacity; verify readiness
   and a synthetic write/read transaction against the intended new writer.
5. Change the approved traffic records only after readiness. Primary health checks
   must identify the primary independently, not follow the failover service name.
   DNS resolution alone is not proof traffic reached DR; inspect region markers,
   TLS/SNI, caches, errors, replication consistency and external dependencies.
6. Mark restoration only after end-to-end checks pass. Notifications require an
   authorized recipient/channel and redact secrets. Report unknowns, not an
   unconditional “Operational” result. Keep the old writer fenced.
7. Fail back only after explicit resynchronization/consistency and write-fencing
   review; never bring both independent databases online as writers.

Worked tabletop: disruption 10:00 UTC, declared 10:04, DR write/read verified
10:18, latest recovered committed transaction 09:58. Measured recovery elapsed
from disruption is 18 minutes and data-age gap is 2 minutes; the 14 minutes from
declaration is a separate interval. These invented times illustrate measurement,
not a successful drill or proof of the example tier targets.

## Contents

- [DR Testing Procedures](references/details.md)
- [Terraform DR Infrastructure](references/details.md)
- [DR Compliance Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Defining RTO and RPO targets for critical systems
- Designing multi-region or multi-cloud disaster recovery architectures
- Implementing automated failover and failback procedures
- Conducting DR tests (tabletop, component, full failover)
- Meeting compliance requirements for contingency planning (SOC 2, HIPAA, FedRAMP, ISO 27001)

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
