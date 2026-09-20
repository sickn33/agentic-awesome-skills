---
name: new-relic
description: Configure New Relic observability platform for infrastructure and application
  monitoring.
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

# New Relic

Monitor applications and infrastructure with New Relic's observability platform.

## When to Use This Skill

Use this skill when:
- Implementing full-stack observability
- Setting up APM for applications
- Monitoring infrastructure health
- Creating custom dashboards and alerts
- Implementing distributed tracing

## Prerequisites

- New Relic account and license key
- Application access for APM agents
- Infrastructure access for host agents

## Infrastructure Agent

### Linux Installation

```bash
# Add repository and install
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash <!-- security-allowlist: curl-pipe-bash -->

# Configure license key
sudo NEW_RELIC_API_KEY=<YOUR_API_KEY> NEW_RELIC_ACCOUNT_ID=<ACCOUNT_ID> /usr/local/bin/newrelic install

# Or manual configuration
echo "license_key: YOUR_LICENSE_KEY" | sudo tee -a /etc/newrelic-infra.yml
sudo systemctl start newrelic-infra
```

### Docker

```yaml
# docker-compose.yml
version: '3.8'

services:
  newrelic-infra:
    image: newrelic/infrastructure:latest
    cap_add:
      - SYS_PTRACE
    privileged: true
    pid: "host"
    network_mode: "host"
    environment:
      - NRIA_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
      - NRIA_DISPLAY_NAME=docker-host
    volumes:
      - /:/host:ro
      - /var/run/docker.sock:/var/run/docker.sock
```

### Kubernetes

```bash
# Using Helm
helm repo add newrelic https://helm-charts.newrelic.com

helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic \
  --create-namespace \
  --set global.licenseKey=${NEW_RELIC_LICENSE_KEY} \
  --set global.cluster=my-cluster \
  --set newrelic-infrastructure.privileged=true \
  --set ksm.enabled=true \
  --set kubeEvents.enabled=true \
  --set logging.enabled=true
```

## APM Agents

### Node.js

```javascript
// At the very start of your application
require('newrelic');

// newrelic.js configuration
exports.config = {
  app_name: ['My Application'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: {
    enabled: true
  },
  logging: {
    level: 'info'
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404]
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated'
  }
};
```

```bash
# Install agent
npm install newrelic

# Run application
NEW_RELIC_LICENSE_KEY=xxx node -r newrelic app.js
```

### Python

```python
# newrelic.ini
[newrelic]
license_key = YOUR_LICENSE_KEY
app_name = My Application
distributed_tracing.enabled = true
transaction_tracer.enabled = true
error_collector.enabled = true
browser_monitoring.auto_instrument = true
```

```bash
# Install agent
pip install newrelic

# Generate config file
newrelic-admin generate-config YOUR_LICENSE_KEY newrelic.ini

# Run application
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program python app.py

# Or with gunicorn
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program gunicorn app:app
```

### Java

```bash
# Download agent
curl -O https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic-java.zip
unzip newrelic-java.zip

# Configure newrelic.yml
# license_key: YOUR_LICENSE_KEY
# app_name: My Application

# Run with agent
java -javaagent:/path/to/newrelic.jar -jar myapp.jar
```

### Go

```go
package main

import (
    "github.com/newrelic/go-agent/v3/newrelic"
    "net/http"
)

func main() {
    app, err := newrelic.NewApplication(
        newrelic.ConfigAppName("My Application"),
        newrelic.ConfigLicense("YOUR_LICENSE_KEY"),
        newrelic.ConfigDistributedTracerEnabled(true),
    )
    if err != nil {
        panic(err)
    }

    http.HandleFunc(newrelic.WrapHandleFunc(app, "/", indexHandler))
    http.ListenAndServe(":8080", nil)
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
    txn := newrelic.FromContext(r.Context())
    txn.AddAttribute("user_id", "12345")
    w.Write([]byte("Hello, World!"))
}
```

## Custom Instrumentation

### Custom Events

```python
import newrelic.agent

# Record custom event
newrelic.agent.record_custom_event('OrderPlaced', {
    'order_id': '12345',
    'amount': 99.99,
    'customer_id': 'cust_001'
})
```

### Custom Metrics

```python
import newrelic.agent

# Record custom metric
newrelic.agent.record_custom_metric('Custom/OrderValue', 99.99)

# With attributes
newrelic.agent.record_custom_metric('Custom/ProcessingTime', 
    processing_time, 
    {'unit': 'milliseconds'}
)
```

### Custom Spans

```python
import newrelic.agent

@newrelic.agent.function_trace(name='process_payment')
def process_payment(order_id, amount):
    # This creates a custom span in the trace
    pass

# Manual span creation
with newrelic.agent.FunctionTrace(name='custom_operation'):
    # Traced code
    pass
```

## NRQL Queries

### Basic Queries

```sql
-- Transaction throughput
SELECT rate(count(*), 1 minute) FROM Transaction 
WHERE appName = 'My Application' 
SINCE 1 hour ago

-- Average response time
SELECT average(duration) FROM Transaction 
WHERE appName = 'My Application' 
SINCE 1 hour ago

-- Error rate
SELECT percentage(count(*), WHERE error IS true) FROM Transaction 
WHERE appName = 'My Application' 
SINCE 1 hour ago

-- Apdex score
SELECT apdex(duration, t: 0.5) FROM Transaction 
WHERE appName = 'My Application' 
SINCE 1 hour ago
```

### Advanced Queries

```sql
-- Slowest transactions
SELECT average(duration) FROM Transaction 
WHERE appName = 'My Application' 
FACET name 
SINCE 1 hour ago 
ORDER BY average(duration) DESC 
LIMIT 10

-- Error breakdown
SELECT count(*) FROM TransactionError 
WHERE appName = 'My Application' 
FACET error.class 
SINCE 1 hour ago

-- Percentile response times
SELECT percentile(duration, 50, 90, 95, 99) FROM Transaction 
WHERE appName = 'My Application' 
SINCE 1 hour ago TIMESERIES

-- Custom event analysis
SELECT average(amount), count(*) FROM OrderPlaced 
FACET customer_id 
SINCE 1 day ago
```

## Dashboards

### Dashboard JSON

```json
{
  "name": "Application Dashboard",
  "pages": [
    {
      "name": "Overview",
      "widgets": [
        {
          "title": "Throughput",
          "visualization": {"id": "viz.line"},
          "configuration": {
            "nrqlQueries": [
              {
                "accountId": 12345,
                "query": "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'My Application' SINCE 1 hour ago TIMESERIES"
              }
            ]
          }
        },
        {
          "title": "Error Rate",
          "visualization": {"id": "viz.billboard"},
          "configuration": {
            "nrqlQueries": [
              {
                "accountId": 12345,
                "query": "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'My Application' SINCE 1 hour ago"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

## Alerts

### Alert Condition (NRQL)

```json
{
  "name": "High Error Rate",
  "type": "static",
  "nrql": {
    "query": "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'My Application'"
  },
  "valueFunction": "single_value",
  "terms": [
    {
      "threshold": 5,
      "thresholdOccurrences": "all",
      "thresholdDuration": 300,
      "operator": "above",
      "priority": "critical"
    },
    {
      "threshold": 2,
      "thresholdOccurrences": "all",
      "thresholdDuration": 300,
      "operator": "above",
      "priority": "warning"
    }
  ]
}
```

### Alert Policy

```json
{
  "name": "Application Alerts",
  "incident_preference": "PER_CONDITION_AND_TARGET",
  "conditions": [
    {
      "name": "High Response Time",
      "type": "apm_app_metric",
      "entities": ["My Application"],
      "metric": "response_time_web",
      "condition_scope": "application",
      "terms": [
        {
          "duration": "5",
          "operator": "above",
          "threshold": "1",
          "priority": "critical"
        }
      ]
    }
  ]
}
```

## Logs in Context

### Python Configuration

```python
# newrelic.ini
[newrelic]
application_logging.enabled = true
application_logging.forwarding.enabled = true
application_logging.metrics.enabled = true
application_logging.local_decorating.enabled = true
```

### Log Forwarding

```yaml
# newrelic-infra.yml
log:
  - name: application-logs
    file: /var/log/myapp/*.log
    attributes:
      service: myapp
      environment: production
```

## Common Issues

### Issue: No Data Appearing
**Problem**: Agent not reporting to New Relic
**Solution**: Verify license key, check network connectivity, review agent logs

### Issue: Missing Transactions
**Problem**: Some transactions not captured
**Solution**: Check instrumentation coverage, verify framework support

### Issue: High Overhead
**Problem**: APM agent impacting performance
**Solution**: Adjust sampling rate, disable unnecessary features

## Best Practices

- Use meaningful application names
- Implement distributed tracing across services
- Set up service maps for dependency visualization
- Configure appropriate alert thresholds
- Use custom attributes for business context
- Implement logs in context for correlation
- Set up workloads for service grouping
- Regular review of unused dashboards and alerts

## Related Skills

- datadog (`datadog`) - Alternative monitoring platform
- prometheus-grafana (`prometheus-grafana`) - Open source monitoring
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
