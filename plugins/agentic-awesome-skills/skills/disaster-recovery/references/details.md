# Details (moved from SKILL.md)

> Extended reference content for `disaster-recovery`, kept under `references/` so the entrypoint stays within the audit budget.

## DR Testing Procedures

```yaml
dr_test_types:
  tabletop_exercise:
    frequency: Quarterly
    duration: "1-2 hours"
    participants: "Engineering, SRE, management, communications"
    process:
      - Present a disaster scenario (region outage, data corruption, etc.)
      - Walk through the response step by step
      - Identify gaps in runbooks and communication plans
      - Document action items
    output: "Tabletop exercise report with findings and action items"

  component_failover:
    frequency: Monthly
    duration: "1-4 hours"
    scope: "Individual component failover (database, single service)"
    process:
      - Select component for testing
      - Execute failover procedure from runbook
      - Measure actual RTO and RPO
      - Execute failback procedure
      - Document results
    output: "Component test report with measured RTO/RPO"

  full_failover:
    frequency: Annually
    duration: "4-8 hours (scheduled maintenance window)"
    scope: "Complete regional failover of all tier 1 and tier 2 services"
    process:
      1_preparation:
        - Schedule maintenance window and notify stakeholders
        - Verify DR environment is healthy
        - Brief all participating teams
        - Set up war room communication channel
      2_execute:
        - Simulate primary region failure
        - Execute failover runbooks for all services
        - Record timestamps at each milestone
      3_verify:
        - Run end-to-end test suite against DR environment
        - Verify data consistency
        - Check monitoring and alerting in DR region
        - Confirm external integrations work
      4_failback:
        - Restore primary region
        - Re-establish replication
        - Execute failback to primary
        - Verify data consistency post-failback
      5_report:
        - Document actual RTO and RPO for each service
        - Compare against targets
        - List all issues encountered
        - Create action items for improvements
    output: "Full DR test report with measured vs. target metrics"

dr_test_checklist:
  before_test:
    - [ ] Test plan documented and approved
    - [ ] Maintenance window scheduled and communicated
    - [ ] All DR runbooks reviewed and updated
    - [ ] DR environment health verified
    - [ ] Monitoring configured in DR region
    - [ ] Communication channel established
    - [ ] Rollback plan confirmed

  during_test:
    - [ ] Timestamps recorded for each step
    - [ ] Screenshots captured for evidence
    - [ ] Issues logged in real-time
    - [ ] Data consistency verified
    - [ ] External integrations tested
    - [ ] Health checks passing in DR

  after_test:
    - [ ] Failback completed successfully
    - [ ] Primary region replication re-established
    - [ ] Data consistency verified post-failback
    - [ ] Test report written with metrics
    - [ ] Action items created and assigned
    - [ ] Runbooks updated based on findings
    - [ ] Results presented to management
```


## Terraform DR Infrastructure

```hcl
# DR region infrastructure
provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

resource "aws_db_instance" "dr_replica" {
  provider               = aws.dr
  identifier             = "prod-db-dr-replica"
  replicate_source_db    = aws_db_instance.primary.arn
  instance_class         = "db.r6g.large"
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.dr_rds.arn
  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false

  tags = {
    Purpose     = "DR"
    Environment = "production"
  }
}

resource "aws_route53_health_check" "primary" {
  fqdn              = "primary-alb.us-east-1.elb.amazonaws.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10
  enable_sni         = true

  tags = {
    Name = "primary-health-check"
  }
}

resource "aws_route53_record" "failover_primary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.primary.id
}

resource "aws_route53_record" "failover_secondary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.dr.dns_name
    zone_id                = aws_lb.dr.zone_id
    evaluate_target_health = true
  }
}
```


## DR Compliance Checklist

```yaml
dr_compliance_checklist:
  planning:
    - [ ] RTO and RPO targets defined per service tier
    - [ ] DR strategy selected based on targets and budget
    - [ ] DR architecture documented with diagrams
    - [ ] Failover and failback runbooks written
    - [ ] Communication plan for DR events documented
    - [ ] DR roles and responsibilities assigned

  implementation:
    - [ ] Cross-region database replication configured
    - [ ] Storage replication configured (S3, EBS snapshots)
    - [ ] DNS failover routing configured
    - [ ] DR region infrastructure provisioned (IaC)
    - [ ] Monitoring and alerting configured in DR region
    - [ ] Secrets and credentials available in DR region

  testing:
    - [ ] Tabletop exercises conducted quarterly
    - [ ] Component failover tests conducted monthly
    - [ ] Full failover test conducted annually
    - [ ] Actual RTO/RPO measured and compared to targets
    - [ ] Test results documented and reviewed
    - [ ] Runbooks updated based on test findings

  operational:
    - [ ] Replication lag monitored with alerting
    - [ ] DR environment health checked regularly
    - [ ] Backup integrity verified monthly
    - [ ] DR runbooks reviewed and updated quarterly
    - [ ] DR test evidence archived for compliance audits
```


## Best Practices

- Define RTO and RPO targets based on business impact analysis, not technical convenience
- Choose the DR strategy that matches your targets and budget: do not over-engineer or under-invest
- Automate failover as much as possible to reduce human error and recovery time
- Test DR procedures regularly at increasing levels of complexity (tabletop, component, full)
- Measure actual RTO and RPO during tests and compare against targets every time
- Include failback procedures in your DR plan: getting back to normal is as important as failing over
- Monitor replication lag continuously and alert when it exceeds RPO thresholds
- Keep DR infrastructure managed by the same IaC as production to prevent configuration drift
- Practice DR in non-emergency conditions so the team is prepared when a real disaster occurs
- Archive DR test results as compliance evidence for SOC 2, HIPAA, and other frameworks

