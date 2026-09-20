---
name: gcp-audit-logs
description: Configure GCP Cloud Audit Logs for compliance. Set up log routing and
  BigQuery analysis. Use when auditing GCP activity.
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

# GCP Audit Logs

Audit GCP activity with Cloud Audit Logs for compliance, security investigation, and operational monitoring.

## Audit Log Types

```yaml
log_types:
  admin_activity:
    description: API calls that modify resource configuration or metadata
    enabled: Always (cannot be disabled)
    retention: 400 days (default)
    cost: No charge
    examples:
      - Creating or deleting VM instances
      - Changing IAM policies
      - Modifying firewall rules

  data_access:
    description: API calls that read resource configuration, metadata, or user data
    enabled: Must be explicitly enabled (except BigQuery)
    retention: 30 days (default)
    cost: Can be significant at high volume
    subtypes:
      ADMIN_READ: Read resource configuration/metadata
      DATA_READ: Read user-provided data
      DATA_WRITE: Write user-provided data

  system_event:
    description: Actions performed by GCP systems on behalf of resources
    enabled: Always (cannot be disabled)
    retention: 400 days (default)
    cost: No charge
    examples:
      - Live migration of VM instances
      - Automatic scaling events

  policy_denied:
    description: Actions denied by VPC Service Controls or organization policies
    enabled: Always (cannot be disabled)
    retention: 400 days (default)
    cost: No charge
```

## Enable Data Access Logs for an Organization

```bash
# Get current org IAM policy
gcloud organizations get-iam-policy ORG_ID --format=json > org-policy.json

# Add audit config to org-policy.json:
# {
#   "auditConfigs": [
#     {
#       "service": "allServices",
#       "auditLogConfigs": [
#         {"logType": "ADMIN_READ"},
#         {"logType": "DATA_READ"},
#         {"logType": "DATA_WRITE"}
#       ]
#     }
#   ],
#   ...existing bindings...
# }

# Apply the updated policy
gcloud organizations set-iam-policy ORG_ID org-policy.json

# Enable data access logs for specific services at project level
gcloud projects get-iam-policy PROJECT_ID --format=json > project-policy.json

# Example: enable only for Cloud Storage and BigQuery
# {
#   "auditConfigs": [
#     {
#       "service": "storage.googleapis.com",
#       "auditLogConfigs": [
#         {"logType": "DATA_READ"},
#         {"logType": "DATA_WRITE"}
#       ]
#     },
#     {
#       "service": "bigquery.googleapis.com",
#       "auditLogConfigs": [
#         {"logType": "DATA_READ"},
#         {"logType": "DATA_WRITE"}
#       ]
#     }
#   ]
# }

gcloud projects set-iam-policy PROJECT_ID project-policy.json
```

## Configure Log Sinks for Export

```bash
# Create BigQuery dataset for audit log export
bq mk --dataset \
  --description "Audit log export" \
  --default_table_expiration 0 \
  --location US \
  PROJECT_ID:audit_logs

# Create organization-level log sink to BigQuery
gcloud logging sinks create org-audit-bigquery \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/audit_logs \
  --organization=ORG_ID \
  --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'

# Get the sink writer identity and grant BigQuery access
SINK_SA=$(gcloud logging sinks describe org-audit-bigquery \
  --organization=ORG_ID --format='value(writerIdentity)')

bq add-iam-policy-binding \
  --member="$SINK_SA" \
  --role="roles/bigquery.dataEditor" \
  PROJECT_ID:audit_logs

# Create Cloud Storage sink for long-term archive
gsutil mb -l US -b on gs://org-audit-logs-archive
gsutil retention set 7y gs://org-audit-logs-archive

gcloud logging sinks create org-audit-storage \
  storage.googleapis.com/org-audit-logs-archive \
  --organization=ORG_ID \
  --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'

STORAGE_SA=$(gcloud logging sinks describe org-audit-storage \
  --organization=ORG_ID --format='value(writerIdentity)')

gsutil iam ch "$STORAGE_SA:objectCreator" gs://org-audit-logs-archive

# Create Pub/Sub sink for real-time streaming to SIEM
gcloud pubsub topics create audit-log-stream

gcloud logging sinks create org-audit-pubsub \
  pubsub.googleapis.com/projects/PROJECT_ID/topics/audit-log-stream \
  --organization=ORG_ID \
  --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com" AND (protoPayload.methodName:"delete" OR protoPayload.methodName:"setIamPolicy" OR severity>=WARNING)'

PUBSUB_SA=$(gcloud logging sinks describe org-audit-pubsub \
  --organization=ORG_ID --format='value(writerIdentity)')

gcloud pubsub topics add-iam-policy-binding audit-log-stream \
  --member="$PUBSUB_SA" \
  --role="roles/pubsub.publisher"
```

## Logging Queries (Cloud Logging Explorer)

```bash
# View admin activity logs for the last 24 hours
gcloud logging read 'logName:"cloudaudit.googleapis.com/activity"
  AND timestamp>="2024-01-01T00:00:00Z"' \
  --project=PROJECT_ID \
  --format=json \
  --limit=100

# Find IAM policy changes
gcloud logging read 'logName:"cloudaudit.googleapis.com/activity"
  AND protoPayload.methodName="SetIamPolicy"' \
  --project=PROJECT_ID \
  --freshness=7d

# Find resource deletions
gcloud logging read 'logName:"cloudaudit.googleapis.com/activity"
  AND protoPayload.methodName=~"delete"
  AND severity>=NOTICE' \
  --project=PROJECT_ID \
  --freshness=7d

# Data access audit log entries
gcloud logging read 'logName:"cloudaudit.googleapis.com/data_access"
  AND protoPayload.serviceName="storage.googleapis.com"
  AND protoPayload.methodName="storage.objects.get"' \
  --project=PROJECT_ID \
  --freshness=24h

# Failed authorization attempts
gcloud logging read 'logName:"cloudaudit.googleapis.com/policy"' \
  --project=PROJECT_ID \
  --freshness=7d
```

## BigQuery Analysis Queries

```sql
-- All destructive operations in the last 30 days
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS principal,
  protopayload_auditlog.methodName AS method,
  protopayload_auditlog.resourceName AS resource,
  resource.labels.project_id AS project,
  protopayload_auditlog.status.code AS status_code,
  protopayload_auditlog.status.message AS status_message
FROM `project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  AND protopayload_auditlog.methodName LIKE '%delete%'
ORDER BY timestamp DESC
LIMIT 500;

-- IAM policy changes across the organization
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS changed_by,
  resource.labels.project_id AS project,
  protopayload_auditlog.resourceName AS resource,
  protopayload_auditlog.servicedata_v1_iam.policyDelta.bindingDeltas
FROM `project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  AND protopayload_auditlog.methodName = 'SetIamPolicy'
ORDER BY timestamp DESC;

-- Activity per principal (detect anomalous usage)
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS principal,
  COUNT(*) AS action_count,
  COUNT(DISTINCT protopayload_auditlog.methodName) AS unique_methods,
  COUNT(DISTINCT protopayload_auditlog.requestMetadata.callerIp) AS unique_ips,
  MIN(timestamp) AS first_activity,
  MAX(timestamp) AS last_activity
FROM `project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
GROUP BY principal
ORDER BY action_count DESC
LIMIT 50;

-- Service account key creation events (security risk indicator)
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS created_by,
  protopayload_auditlog.resourceName AS service_account,
  protopayload_auditlog.requestMetadata.callerIp AS source_ip
FROM `project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
  AND protopayload_auditlog.methodName = 'google.iam.admin.v1.CreateServiceAccountKey'
ORDER BY timestamp DESC;

-- Data access patterns for sensitive Cloud Storage buckets
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS accessor,
  protopayload_auditlog.resourceName AS object_path,
  protopayload_auditlog.methodName AS access_type,
  protopayload_auditlog.requestMetadata.callerIp AS source_ip
FROM `project.audit_logs.cloudaudit_googleapis_com_data_access_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
  AND protopayload_auditlog.resourceName LIKE '%sensitive-bucket%'
ORDER BY timestamp DESC
LIMIT 1000;

-- Failed operations indicating permission issues
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS principal,
  protopayload_auditlog.methodName AS method,
  protopayload_auditlog.status.code AS error_code,
  protopayload_auditlog.status.message AS error_message,
  protopayload_auditlog.requestMetadata.callerIp AS source_ip
FROM `project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
  AND protopayload_auditlog.status.code != 0
ORDER BY timestamp DESC
LIMIT 500;
```

## Alerting Policies

```bash
# Alert on service account key creation
gcloud alpha monitoring policies create \
  --display-name="SA Key Created" \
  --condition-display-name="Service Account Key Creation" \
  --condition-filter='resource.type="audited_resource" AND protoPayload.methodName="google.iam.admin.v1.CreateServiceAccountKey"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=0s \
  --notification-channels=projects/PROJECT_ID/notificationChannels/CHANNEL_ID \
  --combiner=OR

# Create a log-based metric for IAM changes
gcloud logging metrics create iam-policy-changes \
  --description="Count of IAM policy changes" \
  --log-filter='logName:"cloudaudit.googleapis.com/activity" AND protoPayload.methodName="SetIamPolicy"'

# Create alerting policy using the log-based metric
gcloud alpha monitoring policies create \
  --display-name="IAM Policy Changes" \
  --condition-display-name="IAM Changes Detected" \
  --condition-filter='metric.type="logging.googleapis.com/user/iam-policy-changes"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=0s \
  --notification-channels=projects/PROJECT_ID/notificationChannels/CHANNEL_ID

# Create log-based metric for firewall changes
gcloud logging metrics create firewall-rule-changes \
  --description="Count of firewall rule changes" \
  --log-filter='logName:"cloudaudit.googleapis.com/activity"
    AND (protoPayload.methodName="v1.compute.firewalls.insert"
    OR protoPayload.methodName="v1.compute.firewalls.delete"
    OR protoPayload.methodName="v1.compute.firewalls.patch")'

# Create log-based metric for VPC network changes
gcloud logging metrics create vpc-network-changes \
  --description="Count of VPC network changes" \
  --log-filter='logName:"cloudaudit.googleapis.com/activity"
    AND resource.type="gce_network"
    AND (protoPayload.methodName=~"insert$" OR protoPayload.methodName=~"delete$")'
```

## Terraform Configuration

```hcl
# Organization-level audit log sink to BigQuery
resource "google_logging_organization_sink" "audit_bigquery" {
  name             = "org-audit-bigquery"
  org_id           = var.org_id
  destination      = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.audit_logs.dataset_id}"
  filter           = "logName:\"cloudaudit.googleapis.com\""
  include_children = true

  bigquery_options {
    use_partitioned_tables = true
  }
}

resource "google_bigquery_dataset" "audit_logs" {
  dataset_id    = "audit_logs"
  project       = var.project_id
  location      = "US"
  description   = "Organization audit log export"

  default_table_expiration_ms = null  # No auto-expiry

  access {
    role          = "WRITER"
    user_by_email = google_logging_organization_sink.audit_bigquery.writer_identity
  }

  access {
    role          = "READER"
    group_by_email = "security-auditors@example.com"
  }
}

# Retention bucket with bucket lock
resource "google_storage_bucket" "audit_archive" {
  name          = "org-audit-logs-archive"
  location      = "US"
  force_destroy = false
  project       = var.project_id

  uniform_bucket_level_access = true

  retention_policy {
    is_locked        = true
    retention_period = 220752000  # 7 years in seconds
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}

# Log-based alerting
resource "google_logging_metric" "iam_changes" {
  name    = "iam-policy-changes"
  project = var.project_id
  filter  = "logName:\"cloudaudit.googleapis.com/activity\" AND protoPayload.methodName=\"SetIamPolicy\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "iam_changes" {
  display_name = "IAM Policy Changes Detected"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "IAM policy change count"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/iam-policy-changes\" AND resource.type=\"global\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
    }
  }

  notification_channels = [var.notification_channel_id]
}
```


## Contents

- [Setup Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Enabling organization-wide audit logging across GCP projects
- Meeting compliance requirements for SOC 2, HIPAA, PCI DSS, or FedRAMP
- Investigating unauthorized access or suspicious API activity
- Setting up alerting on administrative and data access events
- Exporting logs to BigQuery for long-term analysis and reporting

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
