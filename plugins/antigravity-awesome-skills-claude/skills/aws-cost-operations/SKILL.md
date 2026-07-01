---
name: aws-cost-operations
description: AWS cost optimization, monitoring, and operational excellence expert. Use when analyzing AWS bills, estimating costs, setting up CloudWatch alarms, querying logs, auditing CloudTrail activity, or assessing security posture. Essential when user mentions AWS costs, spending, billing,...
risk: unknown
source: https://github.com/zxkane/aws-skills/tree/main/plugins/aws-cost-ops/skills/aws-cost-operations
source_repo: zxkane/aws-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/zxkane/aws-skills/blob/main/LICENSE
---

# AWS Cost & Operations

This skill provides comprehensive guidance for AWS cost optimization, monitoring, observability, and operational excellence with integrated MCP servers.

## AWS Documentation Requirement

Always verify AWS facts using MCP tools (`mcp__aws-mcp__*` or `mcp__*awsdocs*__*`) before answering. The `aws-mcp-setup` dependency is auto-loaded — if MCP tools are unavailable, guide the user through that skill's setup flow.

## Integrated MCP Servers

This plugin provides 3 MCP servers:

### Bundled Servers

#### 1. AWS Pricing MCP Server (`pricing`)
**Purpose**: Pre-deployment cost estimation and optimization
- Estimate costs before deploying resources
- Compare pricing across regions
- Calculate Total Cost of Ownership (TCO)
- Evaluate different service options for cost efficiency

#### 2. AWS Cost Explorer MCP Server (`costexp`)
**Purpose**: Detailed cost analysis and reporting
- Analyze historical spending patterns
- Identify cost anomalies and trends
- Forecast future costs
- Analyze cost by service, region, or tag

#### 3. Amazon CloudWatch MCP Server (`cw`)
**Purpose**: Metrics, alarms, and logs analysis
- Query CloudWatch metrics and logs
- Create and manage CloudWatch alarms
- Troubleshoot operational issues
- Monitor resource utilization

> **Note**: The following servers are available separately via the Full AWS MCP Server (see `aws-mcp-setup` skill) and are not bundled with this plugin:
> - AWS Billing and Cost Management MCP — Real-time billing details
> - CloudWatch Application Signals MCP — APM and SLOs
> - AWS Managed Prometheus MCP — PromQL queries for containers
> - AWS CloudTrail MCP — API activity audit
> - AWS Well-Architected Security Assessment MCP — Security posture assessment

## When to Use This Skill

Use this skill when:
- Optimizing AWS costs and reducing spending
- Estimating costs before deployment
- Monitoring application and infrastructure performance
- Setting up observability and alerting
- Analyzing spending patterns and trends
- Investigating operational issues
- Auditing AWS activity and changes
- Assessing security posture
- Implementing operational excellence

## Cost Optimization Best Practices

### Pre-Deployment Cost Estimation

**Always estimate costs before deploying**:
1. Use **AWS Pricing MCP** to estimate resource costs
2. Compare pricing across different regions
3. Evaluate alternative service options
4. Calculate expected monthly costs
5. Plan for scaling and growth

**Example workflow**:
```
"Estimate the monthly cost of running a Lambda function with
1 million invocations, 512MB memory, 3-second duration in us-east-1"
```

### Cost Analysis and Optimization

**Regular cost reviews**:
1. Use **Cost Explorer MCP** to analyze spending trends
2. Identify cost anomalies and unexpected charges
3. Review costs by service, region, and environment
4. Compare actual vs. budgeted costs
5. Generate cost optimization recommendations

**Cost optimization strategies**:
- Right-size over-provisioned resources
- Use appropriate storage classes (S3, EBS)
- Implement auto-scaling for dynamic workloads
- Leverage Savings Plans and Reserved Instances
- Delete unused resources and snapshots
- Use cost allocation tags effectively

### Budget Monitoring

**Track spending against budgets**:
1. Use **Billing and Cost Management MCP** to monitor budgets
2. Set up budget alerts for threshold breaches
3. Review budget utilization regularly
4. Adjust budgets based on trends
5. Implement cost controls and governance

## Monitoring and Observability Best Practices

### CloudWatch Metrics and Alarms

**Implement comprehensive monitoring**:
1. Use **CloudWatch MCP** to query metrics and logs
2. Set up alarms for critical metrics:
   - CPU and memory utilization
   - Error rates and latency
   - Queue depths and processing times
   - API gateway throttling
   - Lambda errors and timeouts
3. Create CloudWatch dashboards for visualization
4. Use log insights for troubleshooting

**Example alarm scenarios**:
- Lambda error rate > 1%
- EC2 CPU utilization > 80%
- API Gateway 4xx/5xx error spike
- DynamoDB throttled requests
- ECS task failures

### Application Performance Monitoring

**Monitor application health**:
1. Use **CloudWatch Application Signals MCP** for APM
2. Track service-level objectives (SLOs)
3. Monitor application dependencies
4. Identify performance bottlenecks
5. Set up distributed tracing

### Container and Kubernetes Monitoring

**For containerized workloads**:
1. Use **AWS Managed Prometheus MCP** for metrics
2. Monitor container resource utilization
3. Track pod and node health
4. Create PromQL queries for custom metrics
5. Set up alerts for container anomalies

## Audit and Security Best Practices

### CloudTrail Activity Analysis

**Audit AWS activity**:
1. Use **CloudTrail MCP** to analyze API activity
2. Track who made changes to resources
3. Investigate security incidents
4. Monitor for suspicious activity patterns
5. Audit compliance with policies

**Common audit scenarios**:
- "Who deleted this S3 bucket?"
- "Show all IAM role changes in the last 24 hours"
- "List failed login attempts"
- "Find all actions by a specific user"
- "Track modifications to security groups"

### Security Assessment

**Regular security reviews**:
1. Use **Well-Architected Security Assessment MCP**
2. Assess security posture against best practices
3. Identify security gaps and vulnerabilities
4. Implement recommended security improvements
5. Document security compliance

**Security assessment areas**:
- Identity and Access Management (IAM)
- Detective controls and monitoring
- Infrastructure protection
- Data protection and encryption
- Incident response preparedness

## Using MCP Servers Effectively

### Cost Analysis Workflow

1. **Pre-deployment**: Use Pricing MCP to estimate costs
2. **Post-deployment**: Use Billing MCP to track actual spending
3. **Analysis**: Use Cost Explorer MCP for detailed cost analysis
4. **Optimization**: Implement recommendations from Cost Explorer

### Monitoring Workflow

1. **Setup**: Configure CloudWatch metrics and alarms
2. **Monitor**: Use CloudWatch MCP to track key metrics
3. **Analyze**: Use Application Signals for APM insights
4. **Troubleshoot**: Query CloudWatch Logs for issue resolution

### Security Workflow

1. **Audit**: Use CloudTrail MCP to review activity
2. **Assess**: Use Well-Architected Security Assessment
3. **Remediate**: Implement security recommendations
4. **Monitor**: Track security events via CloudWatch

### MCP Usage Best Practices

1. **Cost Awareness**: Check pricing before deploying resources
2. **Proactive Monitoring**: Set up alarms for critical metrics
3. **Regular Reviews**: Analyze costs and performance weekly
4. **Audit Trails**: Review CloudTrail logs for compliance
5. **Security First**: Run security assessments regularly
6. **Optimize Continuously**: Act on cost and performance recommendations

## Operational Excellence Guidelines

### Cost Optimization

- **Tag Everything**: Use consistent cost allocation tags
- **Review Monthly**: Analyze spending trends and anomalies
- **Right-size**: Match resources to actual usage
- **Automate**: Use auto-scaling and scheduling
- **Monitor Budgets**: Set alerts for cost overruns

### Monitoring and Alerting

- **Critical Metrics**: Alert on business-critical metrics
- **Noise Reduction**: Fine-tune thresholds to reduce false positives
- **Actionable Alerts**: Ensure alerts have clear remediation steps
- **Dashboard Visibility**: Create dashboards for key stakeholders
- **Log Retention**: Balance cost and compliance needs

### Security and Compliance

- **Least Privilege**: Grant minimum required permissions
- **Audit Regularly**: Review CloudTrail logs for anomalies
- **Encrypt Data**: Use encryption at rest and in transit
- **Assess Continuously**: Run security assessments frequently
- **Incident Response**: Have procedures for security events

## Additional Resources

For detailed operational patterns and best practices, refer to the comprehensive reference:

**File**: `references/operations-patterns.md`

This reference includes:
- Cost optimization strategies
- Monitoring and alerting patterns
- Observability best practices
- Security and compliance guidelines
- Troubleshooting workflows

## CloudWatch Alarms Reference

**File**: `references/cloudwatch-alarms.md`

Common alarm configurations for:
- Lambda functions
- EC2 instances
- RDS databases
- DynamoDB tables
- API Gateway
- ECS services
- Application Load Balancers

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
