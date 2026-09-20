---
name: disaster-recovery
description: Implement disaster recovery strategies and runbooks. Configure RPO/RTO
  targets and failover procedures. Use when planning for business continuity.
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

# Disaster Recovery

Implement disaster recovery strategies including RTO/RPO planning, AWS cross-region failover patterns, DR testing procedures, and automated failover scripts.

## RTO/RPO Planning

```yaml
recovery_metrics:
  RTO:
    definition: "Recovery Time Objective - maximum acceptable downtime"
    measurement: "From incident declaration to service restoration"
    factors:
      - Failover automation maturity
      - Data replication lag
      - DNS propagation time
      - Application warm-up time
      - Verification procedures

  RPO:
    definition: "Recovery Point Objective - maximum acceptable data loss"
    measurement: "Time gap between last good backup and the incident"
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
      - "DynamoDB Global Tables or Aurora Global Database"
      - "Route53 latency/weighted routing"
      - "CloudFront with multi-origin"
      - "Global Accelerator"
      - "ECS/EKS in both regions"
    pros: "Minimal downtime and data loss"
    cons: "Highest cost, most complex to operate"
```

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
      "DeleteMarkerReplication": {"Status": "Enabled"}
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
    "FullyQualifiedDomainName": "api.example.com",
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

## Failover Script

```bash
#!/usr/bin/env bash
# dr-failover.sh - Execute disaster recovery failover to DR region
set -euo pipefail

DR_REGION="us-west-2"
PRIMARY_REGION="us-east-1"
SLACK_WEBHOOK="${DR_SLACK_WEBHOOK}"
LOG_FILE="/var/log/dr-failover-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" | tee -a "$LOG_FILE"
}

notify() {
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"DR FAILOVER: $1\"}" > /dev/null
}

log "=== DR Failover Initiated ==="
notify "DR failover initiated to $DR_REGION"

# Step 1: Promote RDS read replica
log "Step 1: Promoting RDS read replica in $DR_REGION"
aws rds promote-read-replica \
  --db-instance-identifier prod-db-dr-replica \
  --region "$DR_REGION"
log "Waiting for RDS promotion to complete..."
aws rds wait db-instance-available \
  --db-instance-identifier prod-db-dr-replica \
  --region "$DR_REGION"
log "RDS promotion complete"
notify "RDS read replica promoted to primary in $DR_REGION"

# Step 2: Scale up application in DR region
log "Step 2: Scaling up application in $DR_REGION"
aws ecs update-service \
  --cluster prod-cluster-dr \
  --service api-service \
  --desired-count 4 \
  --region "$DR_REGION"
log "Waiting for ECS service to stabilize..."
aws ecs wait services-stable \
  --cluster prod-cluster-dr \
  --services api-service \
  --region "$DR_REGION"
log "ECS service scaled up and stable"
notify "Application scaled up in $DR_REGION"

# Step 3: Verify health
log "Step 3: Verifying health in $DR_REGION"
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://dr-alb.us-west-2.elb.amazonaws.com/health")
  if [ "$STATUS" = "200" ]; then
    log "Health check passed (attempt $i)"
    break
  fi
  log "Health check failed (attempt $i, status $STATUS), retrying..."
  sleep 10
done

if [ "$STATUS" != "200" ]; then
  log "ERROR: Health check failed after 10 attempts"
  notify "ALERT: DR health check failing - manual intervention required"
  exit 1
fi

# Step 4: Update DNS (if not using automatic Route53 failover)
log "Step 4: DNS failover (Route53 automatic failover should handle this)"
log "Verifying DNS resolution..."
DR_IP=$(dig +short api.example.com)
log "api.example.com resolves to: $DR_IP"

# Step 5: Verify end-to-end
log "Step 5: End-to-end verification"
RESPONSE=$(curl -s "https://api.example.com/health")
log "Health response: $RESPONSE"

log "=== DR Failover Complete ==="
notify "DR failover to $DR_REGION complete. Service restored."

# Generate failover report
cat > "/var/log/dr-failover-report-$(date +%Y%m%d).md" << EOF
# DR Failover Report
- **Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Primary Region:** $PRIMARY_REGION
- **DR Region:** $DR_REGION
- **RTO Actual:** Calculate from incident declaration
- **RPO Actual:** Check replication lag at time of incident
- **Status:** Operational in DR region
- **Actions Required:**
  - [ ] Monitor error rates and latency
  - [ ] Plan failback when primary region is restored
  - [ ] Conduct post-incident review
EOF
```


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
