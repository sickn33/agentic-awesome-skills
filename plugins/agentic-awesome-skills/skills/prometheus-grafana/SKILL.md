---
name: prometheus-grafana
description: Set up metrics collection and visualization with Prometheus and Grafana.
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

# Prometheus & Grafana

Collect metrics and visualize system performance with the Prometheus-Grafana stack.

## When to Use This Skill

Use this skill when:
- Setting up metrics collection infrastructure
- Creating monitoring dashboards
- Writing PromQL queries for analysis
- Configuring alerting rules
- Monitoring Kubernetes clusters

## Prerequisites

- Docker or Kubernetes for deployment
- Network access to monitored targets
- Basic understanding of metrics concepts

## Prometheus Setup

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.48.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./rules:/etc/prometheus/rules
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus-data:
  grafana-data:
```

### Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets:
          - 'node-exporter:9100'

  - job_name: 'applications'
    static_configs:
      - targets:
          - 'app1:8080'
          - 'app2:8080'
    metrics_path: /metrics
```

## Kubernetes Deployment

### Using Helm

```bash
# Add Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin
```

### ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
  namespaceSelector:
    matchNames:
      - default
```

## PromQL Queries

### Basic Queries

```promql
# Current CPU usage
node_cpu_seconds_total{mode="idle"}

# Rate of HTTP requests per second
rate(http_requests_total[5m])

# Average response time
avg(http_request_duration_seconds_sum / http_request_duration_seconds_count)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

### Aggregations

```promql
# Sum requests by status code
sum by (status_code) (rate(http_requests_total[5m]))

# Average CPU by instance
avg by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m]))

# Top 5 endpoints by request count
topk(5, sum by (endpoint) (rate(http_requests_total[5m])))

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Time-Based Queries

```promql
# Compare to 1 hour ago
http_requests_total - http_requests_total offset 1h

# Predict disk space in 4 hours
predict_linear(node_filesystem_avail_bytes[1h], 4 * 3600)

# Changes in last 5 minutes
changes(up[5m])

# Average over 24 hours
avg_over_time(http_requests_total[24h])
```

## Alerting Rules

```yaml
# rules/alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"

      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
```

## Alertmanager

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'xxx'
        severity: critical
```

## Grafana Dashboards

### Dashboard JSON Structure

```json
{
  "dashboard": {
    "title": "Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (status_code)",
            "legendFormat": "{{ status_code }}"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8}
      },
      {
        "title": "Latency P95",
        "type": "gauge",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 8}
      }
    ]
  }
}
```

### Provisioning Dashboards

```yaml
# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

### Data Source Provisioning

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

## Recording Rules

```yaml
# rules/recording.yml
groups:
  - name: aggregations
    interval: 30s
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))

      - record: instance:node_cpu:avg_rate5m
        expr: |
          avg by (instance) (
            rate(node_cpu_seconds_total{mode!="idle"}[5m])
          )

      - record: job:http_latency:p95
        expr: |
          histogram_quantile(0.95,
            sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
          )
```

## Application Instrumentation

### Go Application

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var httpRequests = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total HTTP requests",
    },
    []string{"method", "endpoint", "status"},
)

func init() {
    prometheus.MustRegister(httpRequests)
}

// Expose metrics endpoint
http.Handle("/metrics", promhttp.Handler())
```

### Node.js Application

```javascript
const client = require('prom-client');

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'endpoint', 'status']
});

// Middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequests.inc({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode
    });
  });
  next();
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

## Common Issues

### Issue: Targets Not Discovered
**Problem**: Prometheus not scraping targets
**Solution**: Check network connectivity, verify target labels

### Issue: High Memory Usage
**Problem**: Prometheus using excessive memory
**Solution**: Reduce retention, use recording rules, limit cardinality

### Issue: Slow Queries
**Problem**: PromQL queries timing out
**Solution**: Use recording rules, limit time ranges, optimize queries

### Issue: Missing Data Points
**Problem**: Gaps in metrics data
**Solution**: Check scrape interval, verify target availability

## Best Practices

- Use recording rules for frequently-used queries
- Limit label cardinality to prevent memory issues
- Set appropriate retention based on storage capacity
- Use histogram metrics for latency measurement
- Implement proper alerting thresholds
- Version control dashboards as code
- Use federation for large-scale deployments
- Regularly review and prune unused metrics

## Related Skills

- alerting-oncall (`alerting-oncall`) - Alert management
- loki-logging (`loki-logging`) - Log aggregation
- kubernetes-ops (`kubernetes-ops`) - K8s monitoring

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
