---
name: opentelemetry
description: Instrument applications and infrastructure with OpenTelemetry for unified
  traces, metrics, and logs.
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

# OpenTelemetry

Adopt vendor-neutral telemetry with consistent instrumentation across services.

## Prerequisites

- Application services running in containers or on VMs
- Backend for traces (Jaeger, Tempo, Datadog, or any OTLP receiver)
- Backend for metrics (Prometheus, Mimir, or OTLP receiver)
- Kubernetes cluster (for collector deployment) or VM with systemd
- Network access from services to collector, and collector to backends

## Core Workflow

1. Define semantic conventions for services, environments, and versions.
2. Add SDK or auto-instrumentation in each service.
3. Run an OpenTelemetry Collector to receive, transform, and export telemetry.
4. Validate cardinality and sampling to control cost.
5. Create golden signals dashboards and alerting from collected data.

## Collector Production Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Scrape Prometheus endpoints
  prometheus:
    config:
      scrape_configs:
        - job_name: "kubernetes-pods"
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: "true"
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
              action: replace
              target_label: __address__
              regex: (.+)
              replacement: $$1

  # Host metrics for infrastructure monitoring
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}
      load: {}

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: upsert

  # Drop high-cardinality attributes to control cost
  filter/drop-debug:
    traces:
      span:
        - 'attributes["http.request.header.x-debug"] == "true"'

  # Reduce cardinality on URL paths
  transform/normalize-routes:
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["url.path"], "/users/[0-9]+", "/users/{id}")
          - replace_pattern(attributes["url.path"], "/orders/[0-9]+", "/orders/{id}")

  # Resource detection for cloud environments
  resourcedetection:
    detectors: [env, system, gcp, aws, azure]
    timeout: 5s

exporters:
  # Send traces to Tempo/Jaeger
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true

  # Send metrics to Prometheus via remote write
  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push
    tls:
      insecure: true

  # Send logs to Loki
  otlp/logs:
    endpoint: loki:4317
    tls:
      insecure: true

  # Debug exporter for development
  debug:
    verbosity: basic

service:
  telemetry:
    logs:
      level: info
    metrics:
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, transform/normalize-routes, batch, attributes]
      exporters: [otlp/traces]
    metrics:
      receivers: [otlp, prometheus, hostmetrics]
      processors: [memory_limiter, resourcedetection, batch, attributes]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch, attributes]
      exporters: [otlp/logs]
```

## Collector Kubernetes Deployment

```yaml
# otel-collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.98.0
          args: ["--config=/etc/otel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8888
              name: metrics
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
          volumeMounts:
            - name: config
              mountPath: /etc/otel
          livenessProbe:
            httpGet:
              path: /
              port: 13133
          readinessProbe:
            httpGet:
              path: /
              port: 13133
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
    - name: metrics
      port: 8888
      targetPort: 8888
```

## Python SDK Instrumentation

```python
# tracing_setup.py
"""Initialize OpenTelemetry tracing and metrics for a Python service."""
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
import os

def init_telemetry(service_name: str, service_version: str):
    """Initialize OTel SDK with traces and metrics."""
    resource = Resource.create({
        "service.name": service_name,
        "service.version": service_version,
        "deployment.environment": os.getenv("DEPLOY_ENV", "development"),
    })

    # Traces
    trace_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317"),
        insecure=True,
    )
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_exporter = OTLPMetricExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317"),
        insecure=True,
    )
    metric_reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=15000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Auto-instrument common libraries
    RequestsInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()

    return trace.get_tracer(service_name), metrics.get_meter(service_name)

# Usage example
tracer, meter = init_telemetry("order-service", "1.2.0")

# Custom span
with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", order_id)
    span.set_attribute("order.total", total)
    # ... business logic ...

# Custom metric
request_counter = meter.create_counter(
    "app.requests",
    description="Total application requests",
)
request_counter.add(1, {"route": "/api/orders", "method": "POST"})
```

## Node.js SDK Instrumentation

```javascript
// tracing.js
// Initialize OpenTelemetry for a Node.js service.
// Load this file BEFORE any other imports: node -r ./tracing.js app.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-grpc");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "node-service",
  [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || "1.0.0",
  "deployment.environment": process.env.DEPLOY_ENV || "development",
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel-collector:4317",
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel-collector:4317",
    }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingPaths: ["/health", "/ready"],
      },
      "@opentelemetry/instrumentation-express": { enabled: true },
      "@opentelemetry/instrumentation-pg": { enabled: true },
      "@opentelemetry/instrumentation-redis": { enabled: true },
    }),
  ],
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
```

## Auto-Instrumentation with Kubernetes Operator

```yaml
# otel-auto-instrumentation.yaml
# Install the OTel Operator first:
#   helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
#     --namespace observability --create-namespace

# Define instrumentation for Python services
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: python-instrumentation
  namespace: default
spec:
  exporter:
    endpoint: http://otel-collector.observability:4317
  propagators:
    - tracecontext
    - baggage
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:0.44b0
    env:
      - name: OTEL_PYTHON_LOG_CORRELATION
        value: "true"
---
# Define instrumentation for Node.js services
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: nodejs-instrumentation
  namespace: default
spec:
  exporter:
    endpoint: http://otel-collector.observability:4317
  propagators:
    - tracecontext
    - baggage
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:0.49.1
```

To instrument a pod, add the annotation:

```yaml
# For Python:
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-python: "true"

# For Node.js:
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"
```


## Contents

- [Sampling Strategies](references/details.md)
- [Best Practices](references/details.md)
- [Troubleshooting](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

- Debugging latency across microservices
- Standardizing observability data model and naming
- Sending telemetry to Prometheus, Grafana, Datadog, or OTLP backends
- Building SLO dashboards with trace-to-log correlation
- Instrumenting Python or Node.js applications with tracing and metrics
- Setting up auto-instrumentation for existing services without code changes

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
