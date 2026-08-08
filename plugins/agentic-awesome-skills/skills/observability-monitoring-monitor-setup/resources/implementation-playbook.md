# Monitoring and Observability Setup Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Monitoring and Observability Setup

You are a monitoring and observability expert specializing in implementing comprehensive monitoring solutions. Set up metrics collection, distributed tracing, log aggregation, and create insightful dashboards that provide full visibility into system health and performance.

## Context
The user needs to implement or improve monitoring and observability. Focus on the three pillars of observability (metrics, logs, traces), setting up monitoring infrastructure, creating actionable dashboards, and establishing effective alerting strategies.

## Requirements
$ARGUMENTS

## Instructions

### 1. Prometheus & Metrics Setup

**Prometheus Configuration**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    region: 'us-east-1'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alerts/*.yml"
  - "recording_rules/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'application'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

**Custom Metrics Implementation**
```typescript
// metrics.ts
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export class MetricsCollector {
    private registry: Registry;
    private httpRequestDuration: Histogram<string>;
    private httpRequestTotal: Counter<string>;

    constructor() {
        this.registry = new Registry();
        this.initializeMetrics();
    }

    private initializeMetrics() {
        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });

        this.httpRequestTotal = new Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });

        this.registry.registerMetric(this.httpRequestDuration);
        this.registry.registerMetric(this.httpRequestTotal);
    }

    httpMetricsMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const start = Date.now();
            const route = req.route?.path || req.path;

            res.on('finish', () => {
                const duration = (Date.now() - start) / 1000;
                const labels = {
                    method: req.method,
                    route,
                    status_code: res.statusCode.toString()
                };

                this.httpRequestDuration.observe(labels, duration);
                this.httpRequestTotal.inc(labels);
            });

            next();
        };
    }

    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }
}
```

### 2. Grafana Dashboard Setup

**Dashboard Configuration**
```typescript
// dashboards/service-dashboard.ts
export const createServiceDashboard = (serviceName: string) => {
    return {
        title: `${serviceName} Service Dashboard`,
        uid: `${serviceName}-overview`,
        tags: ['service', serviceName],
        time: { from: 'now-6h', to: 'now' },
        refresh: '30s',

        panels: [
            // Golden Signals
            {
                title: 'Request Rate',
                type: 'graph',
                gridPos: { x: 0, y: 0, w: 6, h: 8 },
                targets: [{
                    expr: `sum(rate(http_requests_total{service="${serviceName}"}[5m])) by (method)`,
                    legendFormat: '{{method}}'
                }]
            },
            {
                title: 'Error Rate',
                type: 'graph',
                gridPos: { x: 6, y: 0, w: 6, h: 8 },
                targets: [{
                    expr: `sum(rate(http_requests_total{service="${serviceName}",status_code=~"5.."}[5m])) / sum(rate(http_requests_total{service="${serviceName}"}[5m]))`,
                    legendFormat: 'Error %'
                }]
            },
            {
                title: 'Latency Percentiles',
                type: 'graph',
                gridPos: { x: 12, y: 0, w: 12, h: 8 },
                targets: [
                    {
                        expr: `histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{service="${serviceName}"}[5m])) by (le))`,
                        legendFormat: 'p50'
                    },
                    {
                        expr: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="${serviceName}"}[5m])) by (le))`,
                        legendFormat: 'p95'
                    },
                    {
                        expr: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service="${serviceName}"}[5m])) by (le))`,
                        legendFormat: 'p99'
                    }
                ]
            }
        ]
    };
};
```

### 3. Distributed Tracing

**OpenTelemetry Configuration**
```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export class TracingSetup {
    private sdk: NodeSDK;

    constructor(serviceName: string, environment: string) {
        const jaegerExporter = new JaegerExporter({
            endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        });

        this.sdk = new NodeSDK({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
            }),

            traceExporter: jaegerExporter,
            spanProcessor: new BatchSpanProcessor(jaegerExporter),

            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });
    }

    start() {
        this.sdk.start()
            .then(() => console.log('Tracing initialized'))
            .catch((error) => console.error('Error initializing tracing', error));
    }

    shutdown() {
        return this.sdk.shutdown();
    }
}
```

### 4. Log Aggregation

**Fluentd Configuration**
```yaml
# fluent.conf
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  <parse>
    @type json
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<filter kubernetes.**>
  @type kubernetes_metadata
  kubernetes_url "#{ENV['KUBERNETES_SERVICE_HOST']}"
</filter>

<filter kubernetes.**>
  @type record_transformer
  <record>
    cluster_name ${ENV['CLUSTER_NAME']}
    environment ${ENV['ENVIRONMENT']}
    @timestamp ${time.strftime('%Y-%m-%dT%H:%M:%S.%LZ')}
  </record>
</filter>

<match kubernetes.**>
  @type elasticsearch
  host "#{ENV['FLUENT_ELASTICSEARCH_HOST']}"
  port "#{ENV['FLUENT_ELASTICSEARCH_PORT']}"
  index_name logstash
  logstash_format true
  <buffer>
    @type file
    path /var/log/fluentd-buffers/kubernetes.buffer
    flush_interval 5s
    chunk_limit_size 2M
  </buffer>
</match>
```

**Structured Logging Library**
```python
# structured_logging.py
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

class StructuredLogger:
    def __init__(self, name: str, service: str, version: str):
        self.logger = logging.getLogger(name)
        self.service = service
        self.version = version
        self.default_context = {
            'service': service,
            'version': version,
            'environment': os.getenv('ENVIRONMENT', 'development')
        }

    def _format_log(self, level: str, message: str, context: Dict[str, Any]) -> str:
        log_entry = {
            '@timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'message': message,
            **self.default_context,
            **context
        }

        trace_context = self._get_trace_context()
        if trace_context:
            log_entry['trace'] = trace_context

        return json.dumps(log_entry)

    def info(self, message: str, **context):
        log_msg = self._format_log('INFO', message, context)
        self.logger.info(log_msg)

    def error(self, message: str, error: Optional[Exception] = None, **context):
        if error:
            context['error'] = {
                'type': type(error).__name__,
                'message': str(error),
                'stacktrace': traceback.format_exc()
            }

        log_msg = self._format_log('ERROR', message, context)
        self.logger.error(log_msg)
```

### 5. Alert Configuration

**Alert Rules**
```yaml
# alerts/application.yml
groups:
  - name: application
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          ) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time on {{ $labels.service }}"

  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: avg(rate(container_cpu_usage_seconds_total[5m])) by (pod) > 0.8
        for: 15m
        labels:
          severity: warning

      - alert: HighMemoryUsage
        expr: |
          container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.9
        for: 10m
        labels:
          severity: critical
```

**Alertmanager Configuration**
```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: '$SLACK_API_URL'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    - match:
        severity: critical
      receiver: pagerduty
      continue: true

    - match_re:
        severity: critical|warning
      receiver: slack

receivers:
  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '$PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
```

### 6. SLO Implementation

**SLO Configuration**
```typescript
// slo-manager.ts
interface SLO {
    name: string;
    target: number; // e.g., 99.9
    window: string; // e.g., '30d'
    burnRates: BurnRate[];
}

export class SLOManager {
    private slos: SLO[] = [
        {
            name: 'API Availability',
            target: 99.9,
            window: '30d',
            burnRates: [
                { window: '1h', threshold: 14.4, severity: 'critical' },
                { window: '6h', threshold: 6, severity: 'critical' },
                { window: '1d', threshold: 3, severity: 'warning' }
            ]
        }
    ];

    generateSLOQueries(): string {
        return this.slos.map(slo => this.generateSLOQuery(slo)).join('\n\n');
    }

    private generateSLOQuery(slo: SLO): string {
        const errorBudget = 1 - (slo.target / 100);

        return `
# ${slo.name} SLO
- record: slo:${this.sanitizeName(slo.name)}:error_budget
  expr: ${errorBudget}

- record: slo:${this.sanitizeName(slo.name)}:consumed_error_budget
  expr: |
    1 - (sum(rate(successful_requests[${slo.window}])) / sum(rate(total_requests[${slo.window}])))
        `;
    }
}
```

### 7. Infrastructure as Code

**Terraform Configuration**
```hcl
# monitoring.tf
module "prometheus" {
  source = "./modules/prometheus"

  namespace = "monitoring"
  storage_size = "100Gi"
  retention_days = 30

  external_labels = {
    cluster = var.cluster_name
    region  = var.region
  }
}

module "grafana" {
  source = "./modules/grafana"

  namespace = "monitoring"
  admin_password = var.grafana_admin_password

  datasources = [
    {
      name = "Prometheus"
      type = "prometheus"
      url  = "http://prometheus:9090"
    }
  ]
}

module "alertmanager" {
  source = "./modules/alertmanager"

  namespace = "monitoring"

  config = templatefile("${path.module}/alertmanager.yml", {
    slack_webhook = var.slack_webhook
    pagerduty_key = var.pagerduty_service_key
  })
}
```

## Output Format

1. **Infrastructure Assessment**: Current monitoring capabilities analysis
2. **Monitoring Architecture**: Complete monitoring stack design
3. **Implementation Plan**: Step-by-step deployment guide
4. **Metric Definitions**: Comprehensive metrics catalog
5. **Dashboard Templates**: Ready-to-use Grafana dashboards
6. **Alert Runbooks**: Detailed alert response procedures
7. **SLO Definitions**: Service level objectives and error budgets
8. **Integration Guide**: Service instrumentation instructions

Focus on creating a monitoring system that provides actionable insights, reduces MTTR, and enables proactive issue detection.
