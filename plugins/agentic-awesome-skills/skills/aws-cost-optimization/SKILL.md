---
name: aws-cost-optimization
description: Reduce AWS spend with rightsizing, autoscaling, commitment planning,
  and storage lifecycle policies. Use when running FinOps reviews, lowering cloud
  bills, or improving cost-per-request metrics.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# AWS Cost Optimization

Apply practical FinOps controls to reduce AWS spend without sacrificing reliability or performance.

## When to Use This Skill

- Monthly AWS bill spikes unexpectedly or exceeds budget thresholds
- Preparing cost reviews with engineering and finance teams
- Rightsizing EC2, RDS, EKS, or Lambda workloads after load testing
- Choosing between Savings Plans, Reserved Instances, or on-demand pricing
- Setting up automated budget alerts and anomaly detection
- Cleaning up unused resources (unattached EBS, idle load balancers, old snapshots)
- Optimizing data transfer costs across regions and AZs

## Prerequisites

- AWS CLI v2 installed and configured (`aws configure`)
- IAM permissions: `ce:*`, `budgets:*`, `ec2:Describe*`, `cloudwatch:PutMetricAlarm`, `s3:PutLifecycleConfiguration`
- Cost Explorer enabled in the AWS billing console (takes 24 hours to populate)
- Cost allocation tags activated in the Billing console

## Cost Review Workflow

1. Tag every resource by team, service, environment, and cost center.
2. Enable Cost Explorer and activate Cost and Usage Reports (CUR) to S3.
3. Identify top spend drivers by service, account, and tag.
4. Rightsize underutilized compute and storage based on CloudWatch metrics.
5. Apply commitment discounts (Savings Plans or RIs) for stable baseline usage.
6. Set budgets, anomaly alerts, and build KPI dashboards.
7. Review monthly and iterate.

## Cost Explorer CLI Commands

```bash
# Get cost and usage for the last 30 days grouped by service
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-03-01 \
  --granularity MONTHLY \
  --metrics "BlendedCost" "UnblendedCost" "UsageQuantity" \
  --group-by Type=DIMENSION,Key=SERVICE

# Get cost forecast for the next 30 days
aws ce get-cost-forecast \
  --time-period Start=2026-03-24,End=2026-04-24 \
  --metric UNBLENDED_COST \
  --granularity MONTHLY

# Get cost grouped by a specific tag (e.g., team)
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-03-01 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=TAG,Key=team

# Get rightsizing recommendations for EC2
aws ce get-rightsizing-recommendation \
  --service "AmazonEC2" \
  --configuration '{"RecommendationTarget":"SAME_INSTANCE_FAMILY","BenefitsConsidered":true}'

# Get Savings Plans purchase recommendation
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS

# Get Savings Plans utilization
aws ce get-savings-plans-utilization \
  --time-period Start=2026-02-01,End=2026-03-01 \
  --granularity MONTHLY

# Get Reserved Instance utilization
aws ce get-reservation-utilization \
  --time-period Start=2026-02-01,End=2026-03-01 \
  --granularity MONTHLY
```

## Budget Alerts

```bash
# Create a monthly cost budget with email alert at 80% and 100%
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "monthly-total",
    "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {},
    "CostTypes": {
      "IncludeTax": true,
      "IncludeSubscription": true,
      "UseBlended": false
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "finops@example.com"}]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "finops@example.com"}]
    }
  ]'

# List all budgets
aws budgets describe-budgets --account-id 123456789012

# Enable Cost Anomaly Detection monitor for all services
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "all-services",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'

# Create anomaly subscription (alert when impact > $50)
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "cost-alerts",
    "MonitorArnList": ["arn:aws:ce::123456789012:anomalymonitor/monitor-id"],
    "Subscribers": [{"Type": "EMAIL", "Address": "finops@example.com"}],
    "Threshold": 50,
    "Frequency": "DAILY"
  }'
```

## CloudWatch Cost Alarm

```bash
# Create alarm for estimated charges exceeding $4000
aws cloudwatch put-metric-alarm \
  --alarm-name "billing-alarm-4000" \
  --alarm-description "Alert when estimated charges exceed $4000" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 4000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=Currency,Value=USD \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:billing-alerts" \
  --treat-missing-data notBreaching
```

## Find and Clean Unused Resources

```bash
# List unattached EBS volumes (wasted storage spend)
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query "Volumes[].{ID:VolumeId,Size:Size,Created:CreateTime}" \
  --output table

# Find old EBS snapshots (older than 90 days)
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime<='2025-12-24'].{ID:SnapshotId,Size:VolumeSize,Date:StartTime}" \
  --output table

# List unused Elastic IPs (charged when not associated)
aws ec2 describe-addresses \
  --query "Addresses[?AssociationId==null].{IP:PublicIp,AllocId:AllocationId}" \
  --output table

# Find idle load balancers (zero healthy targets)
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/abc123

# List RDS instances and their utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=mydb \
  --start-time 2026-03-17T00:00:00Z \
  --end-time 2026-03-24T00:00:00Z \
  --period 86400 \
  --statistics Average
```

## S3 Lifecycle Cost Optimization

```bash
# Apply tiered lifecycle policy to reduce storage costs
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-data-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "TierDownOldData",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Transitions": [
          {"Days": 30, "StorageClass": "STANDARD_IA"},
          {"Days": 90, "StorageClass": "GLACIER"},
          {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
        ],
        "NoncurrentVersionTransitions": [
          {"NoncurrentDays": 30, "StorageClass": "GLACIER"}
        ],
        "NoncurrentVersionExpiration": {"NoncurrentDays": 90}
      },
      {
        "ID": "CleanupIncompleteUploads",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
      }
    ]
  }'
```

## Terraform Budget and Alarm Example

```hcl
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-total"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com"]
  }
}

resource "aws_cloudwatch_metric_alarm" "billing" {
  alarm_name          = "billing-alarm-4000"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = 4000
  alarm_description   = "Billing exceeds $4000"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}
```

## Scheduling Non-Production Shutdowns

```bash
# Stop all dev instances tagged Environment=dev (run via EventBridge + Lambda)
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].InstanceId" \
  --output text | xargs -n1 aws ec2 stop-instances --instance-ids

# Scale down dev ECS services to zero at night
aws ecs update-service \
  --cluster dev-cluster \
  --service dev-api \
  --desired-count 0
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Cost Explorer returns empty data | CE not enabled or < 24h old | Enable in Billing console, wait 24h |
| Budget alert not firing | SNS subscription not confirmed | Check email and confirm subscription |
| Rightsizing shows no recommendations | Not enough usage data | Wait 14 days for sufficient metrics |
| Savings Plans utilization low | Over-purchased or workload changed | Review and adjust SP coverage |
| Unattached EBS not showing | Wrong region queried | Loop through all active regions |
| Billing alarm never triggers | Billing metrics only in us-east-1 | Create alarm in us-east-1 region |
| CUR data missing in S3 | Report not configured or bucket policy wrong | Verify CUR setup in Billing console |
| Tag-based cost allocation empty | Tags not activated | Activate cost allocation tags in Billing |

## Related Skills

- aws-ec2 (`aws-ec2`) - EC2 operations, sizing, and Spot instances
- aws-s3 (`aws-s3`) - S3 storage classes and lifecycle controls
- aws-rds (`aws-rds`) - RDS instance sizing and reserved instances
- aws-lambda (`aws-lambda`) - Lambda pricing and concurrency tuning
- terraform-aws (`terraform-aws`) - Codifying cost guardrails in IaC

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

