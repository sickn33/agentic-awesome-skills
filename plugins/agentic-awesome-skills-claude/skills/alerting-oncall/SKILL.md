---
name: alerting-oncall
description: Set up alerting rules, configure on-call rotations, and manage incident
  response workflows.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Alerting & On-Call

Configure effective alerting and on-call management for production systems.

## Prerequisites

- Monitoring system (Prometheus, Datadog, etc.)
- On-call platform (PagerDuty, Opsgenie, Grafana OnCall)
- Communication channels (Slack, email)

## Alerting Best Practices

### Alert Categories

```yaml
# Severity levels
critical:
  - Service completely down
  - Data loss imminent
  - Security breach
  response: Immediate page, wake people up

high:
  - Service degraded significantly
  - Error rate above SLO
  - Capacity near limit
  response: Page during business hours, notify after hours

medium:
  - Performance degradation
  - Non-critical component failure
  - Warning thresholds exceeded
  response: Notify via Slack, review next business day

low:
  - Informational alerts
  - Capacity planning triggers
  - Routine maintenance needed
  response: Email notification, weekly review
```

### Alert Design Principles

```yaml
# Good alert characteristics
alerts:
  actionable:
    - Every alert should require human action
    - Include runbook links
    - Clear remediation steps

  relevant:
    - Alert on symptoms, not causes
    - Focus on user impact
    - Avoid alerting on expected behavior

  timely:
    - Appropriate thresholds
    - Suitable evaluation windows
    - Account for normal variance

  unique:
    - No duplicate alerts
    - Proper alert grouping
    - Clear ownership
```

## Prometheus Alerting

### Alert Rules

```yaml
# prometheus/rules/alerts.yml
groups:
  - name: service_alerts
    rules:
      # High-level service health
      - alert: ServiceDown
        expr: up{job="myapp"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.job }} on {{ $labels.instance }} has been down for more than 1 minute."
          runbook_url: "https://wiki.example.com/runbooks/service-down"

      # Error rate alert
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

      # Latency alert (SLO-based)
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 0.5
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "P95 latency above 500ms for {{ $labels.service }}"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    # Critical alerts go to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      group_wait: 0s
      repeat_interval: 1h

    # High severity during business hours
    - match:
        severity: high
      receiver: 'slack-high'
      active_time_intervals:
        - business-hours

    # Route by team
    - match_re:
        team: platform.*
      receiver: 'platform-team'

receivers:
  - name: 'default-receiver'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'xxx'
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.firing" . }}'

  - name: 'slack-high'
    slack_configs:
      - channel: '#alerts-high'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
        actions:
          - type: button
            text: 'Runbook'
            url: '{{ .CommonAnnotations.runbook_url }}'
          - type: button
            text: 'Dashboard'
            url: '{{ .CommonAnnotations.dashboard_url }}'

  - name: 'platform-team'
    slack_configs:
      - channel: '#platform-alerts'

time_intervals:
  - name: business-hours
    time_intervals:
      - weekdays: ['monday:friday']
        times:
          - start_time: '09:00'
            end_time: '17:00'

inhibit_rules:
  - source_match:
      severity: critical
    target_match:
      severity: high
    equal: ['service']
```

## PagerDuty Integration

### Service Configuration

```yaml
# Terraform example
resource "pagerduty_service" "myapp" {
  name                    = "MyApp Production"
  description             = "Production application service"
  escalation_policy       = pagerduty_escalation_policy.default.id
  alert_creation          = "create_alerts_and_incidents"
  auto_resolve_timeout    = 14400  # 4 hours
  acknowledgement_timeout = 600    # 10 minutes

  incident_urgency_rule {
    type    = "use_support_hours"
    
    during_support_hours {
      type    = "constant"
      urgency = "high"
    }
    
    outside_support_hours {
      type    = "constant"
      urgency = "low"
    }
  }
}

resource "pagerduty_escalation_policy" "default" {
  name      = "Default Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }
  }

  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "user_reference"
      id   = pagerduty_user.manager.id
    }
  }
}
```

### Schedule Configuration

```yaml
resource "pagerduty_schedule" "primary" {
  name      = "Primary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Weekly Rotation"
    start                        = "2024-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2024-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 1 week
    users                        = [for user in pagerduty_user.oncall : user.id]
  }

  # Override layer for holidays
  layer {
    name                         = "Holiday Coverage"
    start                        = "2024-01-01T00:00:00-05:00"
    rotation_virtual_start       = "2024-01-01T00:00:00-05:00"
    rotation_turn_length_seconds = 86400
    users                        = [pagerduty_user.holiday_coverage.id]

    restriction {
      type              = "daily_restriction"
      start_time_of_day = "00:00:00"
      duration_seconds  = 86400
      start_day_of_week = 0  # Sunday
    }
  }
}
```

## Grafana OnCall

### Integration Setup

```yaml
# docker-compose.yml addition
services:
  oncall:
    image: grafana/oncall
    environment:
      - SECRET_KEY=your-secret-key
      - BASE_URL=http://oncall:8080
      - GRAFANA_API_URL=http://grafana:3000
    ports:
      - "8080:8080"
```

### Escalation Chain

```yaml
# Example escalation chain structure
escalation_chains:
  - name: "Production Critical"
    steps:
      - step: 1
        type: notify
        persons:
          - "@oncall-primary"
        wait_delay: 0
        
      - step: 2
        type: notify
        persons:
          - "@oncall-secondary"
        wait_delay: 5m
        
      - step: 3
        type: notify
        persons:
          - "@engineering-manager"
        wait_delay: 10m
        
      - step: 4
        type: trigger_action
        action: "escalate_to_incident_commander"
        wait_delay: 15m
```

## Alert Templates

### Slack Alert Template

```go
{{ define "slack.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
{{ end }}

{{ define "slack.text" }}
{{ range .Alerts }}
*Alert:* {{ .Annotations.summary }}
*Severity:* {{ .Labels.severity }}
*Description:* {{ .Annotations.description }}
*Runbook:* {{ .Annotations.runbook_url }}
{{ end }}
{{ end }}
```

### PagerDuty Details Template

```go
{{ define "pagerduty.firing" }}
{{ range .Alerts.Firing }}
Alert: {{ .Labels.alertname }}
Service: {{ .Labels.service }}
Instance: {{ .Labels.instance }}
Value: {{ .Annotations.value }}
Started: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
{{ end }}
{{ end }}
```

## On-Call Best Practices

### Rotation Guidelines

```yaml
on_call_guidelines:
  rotation_length: 1 week
  handoff_time: "10:00 AM Monday"
  
  responsibilities:
    - Monitor alerts during shift
    - Respond within SLA (critical: 5min, high: 15min)
    - Document incidents
    - Handoff unresolved issues
    
  support:
    - Secondary on-call for backup
    - Clear escalation path
    - Manager availability for major incidents
    
  wellness:
    - Maximum 1 week on-call per month
    - Comp time after high-alert periods
    - No-interrupt recovery day after shift
```

### Runbook Template

```markdown
# Alert: High Error Rate

## Summary
Error rate has exceeded the threshold of 5% for the service.

## Impact
Users may experience errors when accessing the application.

## Investigation Steps
1. Check service logs: `kubectl logs -l app=myapp -n production`
2. Review recent deployments: `kubectl rollout history deployment/myapp`
3. Check database connectivity: `kubectl exec -it myapp -- nc -zv postgres 5432`
4. Review error traces in APM dashboard


## Contents

- [Remediation](references/details.md)
- [Escalation](references/details.md)
- [Alert Fatigue Reduction](references/details.md)
- [Common Issues](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Setting up alerting rules and thresholds
- Configuring on-call rotations and schedules
- Implementing alert routing and escalation
- Reducing alert fatigue
- Managing incident response workflows

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
