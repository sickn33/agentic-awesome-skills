---
name: aws-cloudtrail
description: Configure AWS CloudTrail for audit logging. Set up organization trails
  and event analysis. Use when auditing AWS activity.
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

# AWS CloudTrail

Audit AWS account activity with CloudTrail for compliance, security investigation, and operational troubleshooting.

## When to Use

- Enabling organization-wide audit logging across all AWS accounts
- Investigating security incidents or unauthorized API activity
- Meeting compliance requirements for SOC 2, HIPAA, PCI DSS, or FedRAMP
- Setting up automated alerting on sensitive AWS API calls
- Querying historical AWS activity for forensic analysis

## Prerequisites and Change Scope

Verify the AWS identity, partition, region and organization management/delegated-administrator permissions before mutation. All names, account IDs and ARNs below are synthetic placeholders; choose a globally unique owned bucket. Have a working KMS key policy permitting the selected CloudTrail trail and authorized readers, an existing CloudWatch log group and scoped role/trust policy before passing their ARNs. The snippets do not provision those dependencies. Review paid data-event/Lake/Athena scope and retention costs first. Export existing policies/selectors/lifecycle settings and merge intended changes; put-* operations can replace existing configuration. Never apply expiration to audit evidence under a legal hold.

## Create an Organization Trail

```bash
# Create the S3 bucket for log storage
aws s3api create-bucket \
  --bucket org-cloudtrail-audit-logs \
  --region us-east-1
# Apply bucket policy allowing CloudTrail to write
aws s3api put-bucket-policy \
  --bucket org-cloudtrail-audit-logs \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AWSCloudTrailAclCheck",
        "Effect": "Allow",
        "Principal": {"Service": "cloudtrail.amazonaws.com"},
        "Action": "s3:GetBucketAcl",
        "Resource": "arn:aws:s3:::org-cloudtrail-audit-logs",
        "Condition": {"StringEquals": {"aws:SourceArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/org-audit-trail"}}
      },
      {
        "Sid": "AWSCloudTrailWrite",
        "Effect": "Allow",
        "Principal": {"Service": "cloudtrail.amazonaws.com"},
        "Action": "s3:PutObject",
        "Resource": ["arn:aws:s3:::org-cloudtrail-audit-logs/AWSLogs/123456789012/*", "arn:aws:s3:::org-cloudtrail-audit-logs/AWSLogs/o-exampleorgid/*"],
        "Condition": {
          "StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control", "aws:SourceArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/org-audit-trail"}
        }
      }
    ]
  }'
# Block public access on the audit bucket
aws s3api put-public-access-block \
  --bucket org-cloudtrail-audit-logs \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
# Enable version history (not WORM/tamper prevention)
aws s3api put-bucket-versioning \
  --bucket org-cloudtrail-audit-logs \
  --versioning-configuration Status=Enabled
# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket org-cloudtrail-audit-logs \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms", "KMSMasterKeyID": "alias/cloudtrail-key"}}]
  }'
# Set lifecycle policy for log retention
aws s3api put-bucket-lifecycle-configuration \
  --bucket org-cloudtrail-audit-logs \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "TransitionToGlacier",
        "Status": "Enabled",
        "Filter": {"Prefix": "AWSLogs/"},
        "Transitions": [
          {"Days": 90, "StorageClass": "GLACIER"}
        ]
      },
      {
        "ID": "ExpireOldLogs",
        "Status": "Enabled",
        "Filter": {"Prefix": "AWSLogs/"},
        "Expiration": {"Days": 2555}
      }
    ]
  }'
# Create the organization trail
aws cloudtrail create-trail \
  --name org-audit-trail \
  --s3-bucket-name org-cloudtrail-audit-logs \
  --is-organization-trail \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:alias/cloudtrail-key \
  --cloud-watch-logs-log-group-arn arn:aws:logs:us-east-1:123456789012:log-group:CloudTrail:* \
  --cloud-watch-logs-role-arn arn:aws:iam::123456789012:role/CloudTrail-CWLogs-Role
# Start logging
aws cloudtrail start-logging --name org-audit-trail
```

The organization prefix must use the real organization ID and the trail ARN must use the management account ID. Log-file validation detects changes; it does not prevent deletion. Versioning alone is not immutable retention. Validate Object Lock/legal-hold design separately where required.

## Event Selectors for Management and Data Events

```bash
# Configure advanced event selectors for granular control
aws cloudtrail put-event-selectors \
  --trail-name org-audit-trail \
  --advanced-event-selectors '[
    {
      "Name": "AllManagementEvents",
      "FieldSelectors": [
        {"Field": "eventCategory", "Equals": ["Management"]}
      ]
    },
    {
      "Name": "S3DataEventsForSensitiveBuckets",
      "FieldSelectors": [
        {"Field": "eventCategory", "Equals": ["Data"]},
        {"Field": "resources.type", "Equals": ["AWS::S3::Object"]},
        {"Field": "resources.ARN", "StartsWith": [
          "arn:aws:s3:::sensitive-data-bucket/",
          "arn:aws:s3:::pii-bucket/",
          "arn:aws:s3:::financial-data/"
        ]}
      ]
    },
    {
      "Name": "LambdaInvocations",
      "FieldSelectors": [
        {"Field": "eventCategory", "Equals": ["Data"]},
        {"Field": "resources.type", "Equals": ["AWS::Lambda::Function"]}
      ]
    },
    {
      "Name": "DynamoDBDataEvents",
      "FieldSelectors": [
        {"Field": "eventCategory", "Equals": ["Data"]},
        {"Field": "resources.type", "Equals": ["AWS::DynamoDB::Table"]}
      ]
    }
  ]'
```

## CloudWatch Alerts for Sensitive Activity

```bash
# Create metric filter for unauthorized API calls
aws logs put-metric-filter \
  --log-group-name CloudTrail \
  --filter-name UnauthorizedAPICalls \
  --filter-pattern '{ ($.errorCode = "*UnauthorizedAccess*") || ($.errorCode = "AccessDenied*") }' \
  --metric-transformations \
    metricName=UnauthorizedAPICalls,metricNamespace=CloudTrailMetrics,metricValue=1
# Create alarm for unauthorized calls
aws cloudwatch put-metric-alarm \
  --alarm-name UnauthorizedAPICallsAlarm \
  --metric-name UnauthorizedAPICalls \
  --namespace CloudTrailMetrics \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
# Root account usage alarm
aws logs put-metric-filter \
  --log-group-name CloudTrail \
  --filter-name RootAccountUsage \
  --filter-pattern '{ ($.userIdentity.type = "Root") && ($.userIdentity.invokedBy NOT EXISTS) && ($.eventType != "AwsServiceEvent") }' \
  --metric-transformations \
    metricName=RootAccountUsage,metricNamespace=CloudTrailMetrics,metricValue=1
aws cloudwatch put-metric-alarm \
  --alarm-name RootAccountUsageAlarm \
  --metric-name RootAccountUsage \
  --namespace CloudTrailMetrics \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
# Console login without MFA
aws logs put-metric-filter \
  --log-group-name CloudTrail \
  --filter-name ConsoleLoginWithoutMFA \
  --filter-pattern '{ ($.eventName = "ConsoleLogin") && ($.additionalEventData.MFAUsed != "Yes") && ($.userIdentity.type = "IAMUser") }' \
  --metric-transformations \
    metricName=ConsoleLoginWithoutMFA,metricNamespace=CloudTrailMetrics,metricValue=1
# IAM policy changes
aws logs put-metric-filter \
  --log-group-name CloudTrail \
  --filter-name IAMPolicyChanges \
  --filter-pattern '{ ($.eventName=CreatePolicy) || ($.eventName=DeletePolicy) || ($.eventName=AttachRolePolicy) || ($.eventName=DetachRolePolicy) || ($.eventName=AttachUserPolicy) || ($.eventName=PutUserPolicy) }' \
  --metric-transformations \
    metricName=IAMPolicyChanges,metricNamespace=CloudTrailMetrics,metricValue=1
# Security group changes
aws logs put-metric-filter \
  --log-group-name CloudTrail \
  --filter-name SecurityGroupChanges \
  --filter-pattern '{ ($.eventName=AuthorizeSecurityGroupIngress) || ($.eventName=RevokeSecurityGroupIngress) || ($.eventName=CreateSecurityGroup) || ($.eventName=DeleteSecurityGroup) }' \
  --metric-transformations \
    metricName=SecurityGroupChanges,metricNamespace=CloudTrailMetrics,metricValue=1
```

## Athena Queries for CloudTrail Analysis

```sql
-- Create Athena table for CloudTrail logs
CREATE EXTERNAL TABLE IF NOT EXISTS cloudtrail_logs (
  eventVersion STRING,
  userIdentity STRUCT<
    type: STRING,
    principalId: STRING,
    arn: STRING,
    accountId: STRING,
    invokedBy: STRING,
    accessKeyId: STRING,
    userName: STRING,
    sessionContext: STRUCT<
      attributes: STRUCT<mfaAuthenticated: STRING, creationDate: STRING>,
      sessionIssuer: STRUCT<type: STRING, principalId: STRING, arn: STRING, accountId: STRING, userName: STRING>
    >
  >,
  eventTime STRING,
  eventSource STRING,
  eventName STRING,
  awsRegion STRING,
  sourceIPAddress STRING,
  userAgent STRING,
  errorCode STRING,
  errorMessage STRING,
  requestParameters STRING,
  responseElements STRING,
  additionalEventData STRING,
  requestId STRING,
  eventId STRING,
  readOnly STRING,
  resources ARRAY<STRUCT<arn: STRING, accountId: STRING, type: STRING>>,
  eventType STRING,
  recipientAccountId STRING
)
PARTITIONED BY (region STRING, year STRING, month STRING, day STRING)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://org-cloudtrail-audit-logs/AWSLogs/o-exampleorgid/123456789012/CloudTrail/';
-- Add a known delivered partition before querying (repeat for required account/dates).
ALTER TABLE cloudtrail_logs ADD IF NOT EXISTS
PARTITION (region='us-east-1', year='2026', month='10', day='22')
LOCATION 's3://org-cloudtrail-audit-logs/AWSLogs/o-exampleorgid/123456789012/CloudTrail/us-east-1/2026/10/22/';
-- Find all delete operations in the last 7 days
SELECT eventTime, userIdentity.arn, eventName, sourceIPAddress,
       requestParameters
FROM cloudtrail_logs
WHERE eventName LIKE '%Delete%'
  AND eventTime > date_format(date_add('day', -7, current_date), '%Y-%m-%dT%H:%i:%sZ')
ORDER BY eventTime DESC
LIMIT 100;
-- Identify console logins outside a synthetic exact-IP allowlist (not CIDR matching)
SELECT eventTime, userIdentity.userName, sourceIPAddress,
       additionalEventData
FROM cloudtrail_logs
WHERE eventName = 'ConsoleLogin'
  AND sourceIPAddress NOT IN ('198.51.100.10', '203.0.113.20')
  AND eventTime > date_format(date_add('day', -30, current_date), '%Y-%m-%dT%H:%i:%sZ')
ORDER BY eventTime DESC;
-- Access key usage patterns per principal
SELECT userIdentity.arn,
       count(*) AS api_call_count,
       count(DISTINCT eventName) AS unique_actions,
       count(DISTINCT sourceIPAddress) AS unique_ips,
       min(eventTime) AS first_seen,
       max(eventTime) AS last_seen
FROM cloudtrail_logs
WHERE eventTime > date_format(date_add('day', -30, current_date), '%Y-%m-%dT%H:%i:%sZ')
GROUP BY userIdentity.arn
ORDER BY api_call_count DESC
LIMIT 50;
-- Failed API calls indicating permission issues or reconnaissance
SELECT eventTime, userIdentity.arn, eventName, errorCode, errorMessage,
       sourceIPAddress
FROM cloudtrail_logs
WHERE errorCode IN ('AccessDenied', 'UnauthorizedAccess', 'Client.UnauthorizedAccess')
  AND eventTime > date_format(date_add('day', -7, current_date), '%Y-%m-%dT%H:%i:%sZ')
ORDER BY eventTime DESC
LIMIT 200;
-- Track KMS key usage
SELECT eventTime, userIdentity.arn, eventName, requestParameters,
       resources[1].arn AS key_arn
FROM cloudtrail_logs
WHERE eventSource = 'kms.amazonaws.com'
  AND eventName IN ('Decrypt', 'Encrypt', 'GenerateDataKey', 'DisableKey', 'ScheduleKeyDeletion')
  AND eventTime > date_format(date_add('day', -7, current_date), '%Y-%m-%dT%H:%i:%sZ')
ORDER BY eventTime DESC;
```

For production query volumes, register/project all intended partitions and constrain region/year/month/day to prune scan cost; eventTime alone does not prune these partitions. This DDL covers one organization/account prefix, not every member account. Values such as AWS service names or IPv6 addresses need an explicit policy when classifying unusual source IPs.

## CloudTrail Lake (Existing Eligible Customers Only)

CloudTrail Lake closed to new customers on May 31, 2026. Verify existing eligibility and organization/account event-store coverage before using this optional example; new customers should choose a supported CloudWatch or S3/Athena design. Trails remain supported. See [AWS availability change](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake-service-availability-change.html).

```bash
# Create an event data store for long-term queryable storage
aws cloudtrail create-event-data-store \
  --name org-audit-event-store \
  --multi-region-enabled \
  --organization-enabled \
  --retention-period 2555 \
  --advanced-event-selectors '[
    {
      "Name": "AllManagementEvents",
      "FieldSelectors": [
        {"Field": "eventCategory", "Equals": ["Management"]}
      ]
    }
  ]'
```

```sql
-- CloudTrail Lake SQL queries (run in console or via StartQuery API)
-- Investigate a specific user's activity
SELECT eventTime, eventName, eventSource, sourceIPAddress,
       errorCode, requestParameters
FROM EVENT_DATA_STORE_ID
WHERE userIdentity.arn = 'arn:aws:iam::123456789012:user/suspicious-user'
  AND eventTime > '2024-01-01 00:00:00'
ORDER BY eventTime DESC;
-- Cross-account activity summary
SELECT recipientAccountId, userIdentity.arn,
       count(*) AS event_count
FROM EVENT_DATA_STORE_ID
WHERE eventTime > '2024-01-01 00:00:00'
GROUP BY recipientAccountId, userIdentity.arn
ORDER BY event_count DESC;
```

## Validate Trail Integrity

```bash
# Validate log file integrity for a date range
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:us-east-1:123456789012:trail/org-audit-trail \
  --start-time "2024-01-01T00:00:00Z" \
  --end-time "2024-01-31T23:59:59Z"

# Check trail status
aws cloudtrail get-trail-status --name org-audit-trail

# Describe the trail configuration
aws cloudtrail describe-trails --trail-name-list org-audit-trail
```

## Terraform Configuration

```hcl
resource "aws_cloudtrail" "org_trail" {
  name                          = "org-audit-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_organization_trail         = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_cw.arn
  include_global_service_events = true

  advanced_event_selector {
    name = "AllManagementEvents"
    field_selector {
      field  = "eventCategory"
      equals = ["Management"]
    }
  }

  advanced_event_selector {
    name = "SensitiveS3DataEvents"
    field_selector {
      field  = "eventCategory"
      equals = ["Data"]
    }
    field_selector {
      field  = "resources.type"
      equals = ["AWS::S3::Object"]
    }
    field_selector {
      field       = "resources.ARN"
      starts_with = ["arn:aws:s3:::sensitive-data-bucket/"]
    }
  }

  tags = {
    Environment = "production"
    Compliance  = "soc2,hipaa"
  }
}
```

The Terraform fragment references externally defined bucket/key/log-role resources and policies; it is not standalone. Plan and inspect changes before applying. For an organization-wide rollout, verify representative member-account/region delivery and CloudWatch access as well as the management account. A metric filter without an alarm does not notify anyone; the example only creates two alarms and the remaining checklist alarms must be implemented and tested separately.

## Setup Checklist

```yaml
cloudtrail_checklist:
  trail_configuration:
    - "Organization trail enabled across all accounts"
    - "Multi-region trail enabled"
    - "Log file validation enabled"
    - "KMS encryption configured with dedicated key"
    - "CloudWatch Logs integration active"
    - "S3 bucket policy restricts access to CloudTrail service only"

  s3_bucket_hardening:
    - "Public access blocked"
    - "Versioning enabled"
    - "Server-side encryption enabled"
    - "Lifecycle policy set for retention and archival"
    - "Access logging enabled on the bucket itself"
    - "Object Lock enabled for WORM compliance (if required)"

  monitoring_and_alerting:
    - "Metric filters for unauthorized API calls"
    - "Alarm on root account usage"
    - "Alarm on console login without MFA"
    - "Alarm on IAM policy changes"
    - "Alarm on security group and NACL changes"
    - "Alarm on CloudTrail configuration changes"
    - "Alarm on S3 bucket policy changes"

  analysis:
    - "Athena table created for ad-hoc queries"
    - "CloudTrail Lake event data store for long-term queries"
    - "Regular review of high-risk API patterns"
    - "Automated reports for compliance evidence"

  operational:
    - "Trail status health check automated"
    - "Log delivery latency monitored"
    - "Log file validation run periodically"
    - "SNS notification for trail configuration changes"
```

## Verification

After the authorized change, inspect get-trail-status for delivery errors and delivered object/digest timestamps. Use a harmless authorized management event in a test account, find its event ID in S3 and the selected query system, and test alarm routing without disclosing sensitive log bodies. Retain the before/after configuration and unresolved regions/accounts. Compliance tags and a green trail status do not establish complete event coverage or certification.

## Best Practices

- Enable organization-wide trails from the management account for full coverage
- Always enable log file validation to detect tampering
- Encrypt logs with a customer-managed KMS key and restrict key usage
- Use advanced event selectors to capture data events on sensitive resources without logging everything
- Integrate with CloudWatch Logs for real-time metric filters and alarms
- Set up Athena or CloudTrail Lake for efficient querying during investigations
- Apply S3 lifecycle policies to transition old logs to Glacier and enforce retention
- Monitor the trail itself (delivery errors, configuration changes) as a meta-control
- Validate log integrity periodically as part of compliance evidence collection
- Restrict access to the CloudTrail S3 bucket and KMS key with least-privilege IAM policies

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
