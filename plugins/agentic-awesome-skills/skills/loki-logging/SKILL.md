---
name: loki-logging
description: Configure Grafana Loki for log aggregation and analysis.
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

# Grafana Loki

Aggregate and query logs with Grafana Loki, the Prometheus-inspired logging system.

## When to Use This Skill

Use this skill when:
- Implementing cost-effective log aggregation
- Building logging for Kubernetes environments
- Integrating logs with Grafana dashboards
- Querying logs with label-based filtering
- Preferring lighter-weight alternative to ELK

## Prerequisites

- Docker or Kubernetes
- Grafana for visualization
- Promtail or other log shipper

## Architecture Overview

```
┌─────────────┐     ┌──────────┐     ┌──────────┐
│ Application │────▶│ Promtail │────▶│   Loki   │
└─────────────┘     └──────────┘     └──────────┘
                                          │
                                          ▼
                                     ┌──────────┐
                                     │ Grafana  │
                                     └──────────┘
```

## Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - ./promtail-config.yaml:/etc/promtail/config.yaml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yaml

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin

volumes:
  loki-data:
  grafana-data:
```

## Loki Configuration

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: filesystem

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_query_series: 5000
  max_query_parallelism: 2

chunk_store_config:
  max_look_back_period: 168h

table_manager:
  retention_deletes_enabled: true
  retention_period: 168h
```

## Promtail Configuration

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*.log

  # Docker container logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'

  # Application logs with parsing
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            timestamp: timestamp
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
```

## Kubernetes Deployment

```bash
# Using Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.enabled=true \
  --set promtail.enabled=true
```

### Promtail DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      containers:
        - name: promtail
          image: grafana/promtail:2.9.0
          args:
            - -config.file=/etc/promtail/promtail.yaml
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: promtail-config
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

## LogQL Queries

### Basic Queries

```logql
# All logs from a job
{job="application"}

# Filter by label
{job="application", level="error"}

# Multiple labels
{namespace="production", container="api"}

# Regex match
{job=~"app.*"}
```

### Log Pipeline

```logql
# Filter by content
{job="application"} |= "error"

# Exclude content
{job="application"} != "debug"

# Regex filter
{job="application"} |~ "user_id=[0-9]+"

# JSON parsing
{job="application"} | json | level="error"

# Line format
{job="application"} | json | line_format "{{.level}}: {{.message}}"
```

### Metric Queries

```logql
# Count logs per second
count_over_time({job="application"}[5m])

# Rate of errors
rate({job="application", level="error"}[5m])

# Sum by label
sum by (level) (count_over_time({job="application"}[5m]))

# Top services by error count
topk(5, sum by (service) (count_over_time({level="error"}[1h])))
```

### Aggregations

```logql
# Average log line length
avg_over_time({job="application"} | unwrap line_length [5m])

# Percentile of numeric field
quantile_over_time(0.95, {job="application"} | json | unwrap response_time [5m])

# Error percentage
sum(rate({job="application", level="error"}[5m])) 
/ 
sum(rate({job="application"}[5m])) * 100
```

## Pipeline Stages

```yaml
# promtail-config.yaml
pipeline_stages:
  # Parse JSON logs
  - json:
      expressions:
        level: level
        message: msg
        trace_id: trace_id

  # Extract with regex
  - regex:
      expression: 'user_id=(?P<user_id>\d+)'

  # Add labels from parsed fields
  - labels:
      level:
      user_id:

  # Modify timestamp
  - timestamp:
      source: timestamp
      format: '2006-01-02T15:04:05.000Z'

  # Filter logs
  - match:
      selector: '{level="debug"}'
      action: drop

  # Add static labels
  - static_labels:
      environment: production

  # Modify log line
  - template:
      source: message
      template: '{{ ToUpper .Value }}'
```

## Grafana Integration

### Data Source Configuration

```yaml
# grafana/provisioning/datasources/loki.yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
    jsonData:
      maxLines: 1000
```

### Dashboard Panel

```json
{
  "title": "Application Logs",
  "type": "logs",
  "datasource": "Loki",
  "targets": [
    {
      "expr": "{job=\"application\"} | json",
      "refId": "A"
    }
  ],
  "options": {
    "showTime": true,
    "showLabels": true,
    "wrapLogMessage": true
  }
}
```

## Recording Rules

```yaml
# loki-rules.yaml
groups:
  - name: error_rates
    interval: 1m
    rules:
      - record: job:log_errors:rate5m
        expr: |
          sum by (job) (rate({level="error"}[5m]))
```

## Alerting

```yaml
# loki-alerts.yaml
groups:
  - name: log_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({level="error"}[5m])) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate in logs"
          description: "Error rate is {{ $value }} errors/second"
```

## Common Issues

### Issue: High Memory Usage
**Problem**: Loki consuming too much memory
**Solution**: Reduce max_query_series, limit query time range

### Issue: Logs Not Appearing
**Problem**: Promtail not shipping logs
**Solution**: Check positions file, verify file paths, check label configuration

### Issue: Query Timeout
**Problem**: LogQL queries timing out
**Solution**: Add more specific label filters, reduce time range

### Issue: Ingestion Rate Limit
**Problem**: Logs being dropped
**Solution**: Increase per_stream_rate_limit in limits_config

## Best Practices

- Use meaningful labels (avoid high cardinality)
- Filter by labels before log content
- Parse logs at collection time with Promtail
- Set appropriate retention periods
- Use recording rules for common queries
- Implement proper multitenancy for large deployments
- Monitor Loki's own metrics
- Use chunk caching for better performance

## Related Skills

- prometheus-grafana (`prometheus-grafana`) - Metrics monitoring
- elk-stack (`elk-stack`) - Alternative logging
- alerting-oncall (`alerting-oncall`) - Alert management

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
