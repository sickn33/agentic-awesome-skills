---
name: cost-optimization
description: "Strategies and patterns for optimizing cloud costs across AWS, Azure, and GCP."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Cloud Cost Optimization

Strategies and patterns for optimizing cloud costs across AWS, Azure, and GCP.

## Do not use this skill when

- The task is unrelated to cloud cost optimization
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Purpose

Implement systematic cost optimization strategies to reduce cloud spending while maintaining performance and reliability.

## Use this skill when

- Reduce cloud spending
- Right-size resources
- Implement cost governance
- Optimize multi-cloud costs
- Meet budget constraints

## Cost Optimization Framework

### 1. Visibility
- Implement cost allocation tags
- Use cloud cost management tools
- Set up budget alerts
- Create cost dashboards

### 2. Right-Sizing
- Analyze resource utilization
- Downsize over-provisioned resources
- Use auto-scaling
- Remove idle resources

### 3. Pricing Models
- Use reserved capacity
- Leverage spot/preemptible instances
- Implement savings plans
- Use committed use discounts

### 4. Architecture Optimization
- Use managed services
- Implement caching
- Optimize data transfer
- Use lifecycle policies

## AWS Cost Optimization

### Reserved Instances
```
Savings: 30-72% vs On-Demand
Term: 1 or 3 years
Payment: All/Partial/No upfront
Flexibility: Standard or Convertible
```

### Savings Plans
```
Compute Savings Plans: 66% savings
EC2 Instance Savings Plans: 72% savings
Applies to: EC2, Fargate, Lambda
Flexible across: Instance families, regions, OS
```

### Spot Instances
```
Savings: Up to 90% vs On-Demand
Best for: Batch jobs, CI/CD, stateless workloads
Risk: 2-minute interruption notice
Strategy: Mix with On-Demand for resilience
```

### S3 Cost Optimization
```hcl
resource "aws_s3_bucket_lifecycle_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}
```

## Azure Cost Optimization

### Reserved VM Instances
- 1 or 3 year terms
- Up to 72% savings
- Flexible sizing
- Exchangeable

### Azure Hybrid Benefit
- Use existing Windows Server licenses
- Up to 80% savings with RI
- Available for Windows and SQL Server

### Azure Advisor Recommendations
- Right-size VMs
- Delete unused resources
- Use reserved capacity
- Optimize storage

## GCP Cost Optimization

### Committed Use Discounts
- 1 or 3 year commitment
- Up to 57% savings
- Applies to vCPUs and memory
- Resource-based or spend-based

### Sustained Use Discounts
- Automatic discounts
- Up to 30% for running instances
- No commitment required
- Applies to Compute Engine, GKE

### Preemptible VMs
- Up to 80% savings
- 24-hour maximum runtime
- Best for batch workloads

## Tagging Strategy

### AWS Tagging
```hcl
locals {
  common_tags = {
    Environment = "production"
    Project     = "my-project"
    CostCenter  = "engineering"
    Owner       = "team@example.com"
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "example" {
  ami           = "ami-12345678"
  instance_type = "t3.medium"

  tags = merge(
    local.common_tags,
    {
      Name = "web-server"
    }
  )
}
```

**Reference:** See `references/tagging-standards.md`

## Cost Monitoring

### Budget Alerts
```hcl
# AWS Budget
resource "aws_budgets_budget" "monthly" {
  name              = "monthly-budget"
  budget_type       = "COST"
  limit_amount      = "1000"
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team@example.com"]
  }
}
```

### Cost Anomaly Detection
- AWS Cost Anomaly Detection
- Azure Cost Management alerts
- GCP Budget alerts

## Architecture Patterns

### Pattern 1: Serverless First
- Use Lambda/Functions for event-driven
- Pay only for execution time
- Auto-scaling included
- No idle costs

### Pattern 2: Right-Sized Databases
```
Development: t3.small RDS
Staging: t3.large RDS
Production: r6g.2xlarge RDS with read replicas
```

### Pattern 3: Multi-Tier Storage
```
Hot data: S3 Standard
Warm data: S3 Standard-IA (30 days)
Cold data: S3 Glacier (90 days)
Archive: S3 Deep Archive (365 days)
```

### Pattern 4: Auto-Scaling
```hcl
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]
}
```

## Cost Optimization Checklist

- [ ] Implement cost allocation tags
- [ ] Delete unused resources (EBS, EIPs, snapshots)
- [ ] Right-size instances based on utilization
- [ ] Use reserved capacity for steady workloads
- [ ] Implement auto-scaling
- [ ] Optimize storage classes
- [ ] Use lifecycle policies
- [ ] Enable cost anomaly detection
- [ ] Set budget alerts
- [ ] Review costs weekly
- [ ] Use spot/preemptible instances
- [ ] Optimize data transfer costs
- [ ] Implement caching layers
- [ ] Use managed services
- [ ] Monitor and optimize continuously

## Tools

- **AWS:** Cost Explorer, Cost Anomaly Detection, Compute Optimizer
- **Azure:** Cost Management, Advisor
- **GCP:** Cost Management, Recommender
- **Multi-cloud:** CloudHealth, Cloudability, Kubecost

## Reference Files

- `references/tagging-standards.md` - Tagging conventions
- `assets/cost-analysis-template.xlsx` - Cost analysis spreadsheet

## Related Skills

- `terraform-module-library` - For resource provisioning
- `multi-cloud-architecture` - For cloud selection

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
