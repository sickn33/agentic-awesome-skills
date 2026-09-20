---
name: datadog
description: Implement Datadog monitoring and APM for infrastructure and applications.
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

# Datadog

Monitor infrastructure and applications with Datadog's unified observability platform.

## When to Use This Skill

Use this skill when:
- Implementing enterprise-grade monitoring
- Setting up APM and distributed tracing
- Creating unified dashboards for infrastructure and apps
- Configuring intelligent alerting
- Monitoring cloud infrastructure (AWS, Azure, GCP)

## Prerequisites

- Datadog account and API key
- Agent installation access
- Application code access for APM

## Agent Installation

### Linux

```bash
# Install agent
DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)"

# Or via package manager
apt-get update && apt-get install datadog-agent

# Configure API key
echo "api_key: YOUR_API_KEY" >> /etc/datadog-agent/datadog.yaml

# Start agent
systemctl start datadog-agent
systemctl enable datadog-agent
```

### Docker

```yaml
# docker-compose.yml
version: '3.8'

services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:7
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_SITE=datadoghq.com
      - DD_LOGS_ENABLED=true
      - DD_APM_ENABLED=true
      - DD_PROCESS_AGENT_ENABLED=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
    ports:
      - "8126:8126"  # APM
      - "8125:8125/udp"  # DogStatsD
```

### Kubernetes

```bash
# Using Helm
helm repo add datadog https://helm.datadoghq.com

helm install datadog datadog/datadog \
  --set datadog.apiKey=${DD_API_KEY} \
  --set datadog.site=datadoghq.com \
  --set datadog.logs.enabled=true \
  --set datadog.apm.portEnabled=true \
  --set datadog.processAgent.enabled=true \
  --namespace datadog \
  --create-namespace
```

## Agent Configuration

```yaml
# /etc/datadog-agent/datadog.yaml
api_key: YOUR_API_KEY
site: datadoghq.com

# Hostname
hostname: myserver.example.com

# Tags applied to all metrics
tags:
  - env:production
  - service:myapp
  - team:platform

# Log collection
logs_enabled: true

# APM
apm_config:
  enabled: true
  apm_dd_url: https://trace.agent.datadoghq.com

# Process monitoring
process_config:
  enabled: true

# Container monitoring
container_collect_all: true
docker_labels_as_tags:
  app: service
  environment: env
```

## Integration Configuration

### MySQL

```yaml
# /etc/datadog-agent/conf.d/mysql.d/conf.yaml
init_config:

instances:
  - host: localhost
    port: 3306
    username: datadog
    password: <PASSWORD>
    tags:
      - env:production
    options:
      replication: true
      extra_status_metrics: true
```

### PostgreSQL

```yaml
# /etc/datadog-agent/conf.d/postgres.d/conf.yaml
init_config:

instances:
  - host: localhost
    port: 5432
    username: datadog
    password: <PASSWORD>
    dbname: mydb
    collect_activity_metrics: true
    collect_database_size_metrics: true
```

### NGINX

```yaml
# /etc/datadog-agent/conf.d/nginx.d/conf.yaml
init_config:

instances:
  - nginx_status_url: http://localhost:80/nginx_status
    tags:
      - env:production
```

## Log Collection

### File-Based Logs

```yaml
# /etc/datadog-agent/conf.d/myapp.d/conf.yaml
logs:
  - type: file
    path: /var/log/myapp/*.log
    service: myapp
    source: python
    sourcecategory: custom
    tags:
      - env:production

  - type: file
    path: /var/log/nginx/access.log
    service: nginx
    source: nginx
    log_processing_rules:
      - type: exclude_at_match
        name: exclude_healthchecks
        pattern: health_check
```

### Docker Logs

```yaml
# docker-compose.yml
services:
  myapp:
    labels:
      com.datadoghq.ad.logs: '[{"source": "python", "service": "myapp"}]'
```

### Kubernetes Logs

```yaml
# Pod annotation
apiVersion: v1
kind: Pod
metadata:
  annotations:
    ad.datadoghq.com/myapp.logs: |
      [{
        "source": "python",
        "service": "myapp",
        "log_processing_rules": [{
          "type": "multi_line",
          "name": "python_tracebacks",
          "pattern": "^Traceback"
        }]
      }]
```

## APM Configuration

### Python

```python
from ddtrace import patch_all, tracer

# Automatic instrumentation
patch_all()

# Configure tracer
tracer.configure(
    hostname='localhost',
    port=8126,
    service='myapp',
    env='production',
    version='1.0.0'
)

# Manual instrumentation
@tracer.wrap(service='myapp', resource='process_order')
def process_order(order_id):
    with tracer.trace('validate_order') as span:
        span.set_tag('order_id', order_id)
        # Validation logic
    
    with tracer.trace('save_order'):
        # Save logic
        pass
```

```bash
# Install library
pip install ddtrace

# Run with auto-instrumentation
ddtrace-run python app.py
```

### Node.js

```javascript
const tracer = require('dd-trace').init({
  service: 'myapp',
  env: 'production',
  version: '1.0.0',
  logInjection: true
});

// Manual instrumentation
const span = tracer.startSpan('custom_operation');
span.setTag('user_id', userId);
// ... operation
span.finish();
```

```bash
# Install library
npm install dd-trace

# Run with auto-instrumentation
DD_TRACE_ENABLED=true node --require dd-trace/init app.js
```

### Go

```go
import (
    "gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func main() {
    tracer.Start(
        tracer.WithService("myapp"),
        tracer.WithEnv("production"),
        tracer.WithServiceVersion("1.0.0"),
    )
    defer tracer.Stop()

    // Manual span
    span, ctx := tracer.StartSpanFromContext(ctx, "process_request")
    defer span.Finish()
    span.SetTag("user_id", userID)
}
```

## Custom Metrics

### DogStatsD

```python
from datadog import DogStatsd

statsd = DogStatsd(host='localhost', port=8125)

# Counter
statsd.increment('myapp.orders.count', tags=['env:production'])

# Gauge
statsd.gauge('myapp.queue.size', queue_size, tags=['queue:orders'])

# Histogram
statsd.histogram('myapp.request.duration', response_time)

# Distribution
statsd.distribution('myapp.response_time', duration, tags=['endpoint:/api/orders'])
```

### API Submission

```python
from datadog_api_client import Configuration, ApiClient
from datadog_api_client.v2.api.metrics_api import MetricsApi
from datadog_api_client.v2.model.metric_payload import MetricPayload
from datadog_api_client.v2.model.metric_series import MetricSeries
from datadog_api_client.v2.model.metric_point import MetricPoint

configuration = Configuration()
with ApiClient(configuration) as api_client:
    api = MetricsApi(api_client)
    
    payload = MetricPayload(
        series=[
            MetricSeries(
                metric="custom.metric.name",
                type=MetricSeries.GAUGE,
                points=[MetricPoint(value=42.0, timestamp=int(time.time()))],
                tags=["env:production"]
            )
        ]
    )
    api.submit_metrics(body=payload)
```

## Dashboards

### Dashboard JSON

```json
{
  "title": "Application Overview",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "Request Rate",
        "requests": [
          {
            "q": "sum:trace.http.request.hits{service:myapp}.as_rate()",
            "display_type": "line"
          }
        ]
      }
    },
    {
      "definition": {
        "type": "query_value",
        "title": "Error Rate",
        "requests": [
          {
            "q": "sum:trace.http.request.errors{service:myapp}.as_rate() / sum:trace.http.request.hits{service:myapp}.as_rate() * 100"
          }
        ],
        "precision": 2
      }
    }
  ]
}
```

## Monitors (Alerts)

### Metric Monitor

```json
{
  "name": "High Error Rate",
  "type": "metric alert",
  "query": "sum(last_5m):sum:trace.http.request.errors{service:myapp}.as_count() / sum:trace.http.request.hits{service:myapp}.as_count() > 0.05",
  "message": "Error rate is {{value}}% for {{service.name}}. @slack-alerts",
  "tags": ["service:myapp", "env:production"],
  "options": {
    "thresholds": {
      "critical": 0.05,
      "warning": 0.02
    },
    "notify_no_data": true,
    "no_data_timeframe": 10
  }
}
```

### APM Monitor

```json
{
  "name": "High Latency Alert",
  "type": "trace-analytics alert",
  "query": "trace-analytics(\"service:myapp @http.status_code:2*\").rollup(\"avg\", \"@duration\").last(\"5m\") > 2000000000",
  "message": "Average latency is above 2 seconds. @pagerduty",
  "options": {
    "thresholds": {
      "critical": 2000000000
    }
  }
}
```

## Common Issues

### Issue: Agent Not Reporting
**Problem**: No data appearing in Datadog
**Solution**: Check API key, verify agent status with `datadog-agent status`

### Issue: Missing Traces
**Problem**: APM traces not appearing
**Solution**: Verify APM is enabled, check tracer configuration, verify port 8126

### Issue: High Cardinality Tags
**Problem**: Custom metrics getting dropped
**Solution**: Reduce unique tag values, use distributions instead of histograms

## Best Practices

- Use consistent service and environment tags
- Implement proper tag naming conventions
- Use unified service tagging (service, env, version)
- Set up service-level monitors
- Create dashboards per service
- Implement log correlation with traces
- Use distributions for latency metrics
- Configure proper alert escalation

## Related Skills

- prometheus-grafana (`prometheus-grafana`) - Open source alternative
- alerting-oncall (`alerting-oncall`) - Alert management
- aws-vpc (`aws-vpc`) - AWS monitoring

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
