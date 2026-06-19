---
name: azure-monitor-opentelemetry-py
description: Azure Monitor OpenTelemetry Distro for Python. Use for one-line Application Insights setup with auto-instrumentation.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Monitor OpenTelemetry Distro for Python

One-line setup for Application Insights with OpenTelemetry auto-instrumentation.

## Installation

```bash
pip install azure-monitor-opentelemetry
```

## Environment Variables

```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://xxx.in.applicationinsights.azure.com/
```

## Quick Start

```python
from azure.monitor.opentelemetry import configure_azure_monitor

# One-line setup - reads connection string from environment
configure_azure_monitor()

# Your application code...
```

## Explicit Configuration

```python
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    connection_string="InstrumentationKey=xxx;IngestionEndpoint=https://xxx.in.applicationinsights.azure.com/"
)
```

## With Flask

```python
from flask import Flask
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    app.run()
```

## With Django

```python
# settings.py
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()

# Django settings...
```

## With FastAPI

```python
from fastapi import FastAPI
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

## Custom Traces

```python
from opentelemetry import trace
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("my-operation") as span:
    span.set_attribute("custom.attribute", "value")
    # Do work...
```

## Custom Metrics

```python
from opentelemetry import metrics
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()

meter = metrics.get_meter(__name__)
counter = meter.create_counter("my_counter")

counter.add(1, {"dimension": "value"})
```

## Custom Logs

```python
import logging
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

logger.info("This will appear in Application Insights")
logger.error("Errors are captured too", exc_info=True)
```

## Sampling

```python
from azure.monitor.opentelemetry import configure_azure_monitor

# Sample 10% of requests
configure_azure_monitor(
    sampling_ratio=0.1
)
```

## Cloud Role Name

Set cloud role name for Application Map:

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

configure_azure_monitor(
    resource=Resource.create({SERVICE_NAME: "my-service-name"})
)
```

## Disable Specific Instrumentations

```python
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    instrumentations=["flask", "requests"]  # Only enable these
)
```

## Enable Live Metrics

```python
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    enable_live_metrics=True
)
```

## Azure AD Authentication

```python
from azure.monitor.opentelemetry import configure_azure_monitor
from azure.identity import DefaultAzureCredential

configure_azure_monitor(
    credential=DefaultAzureCredential()
)
```

## Auto-Instrumentations Included

| Library | Telemetry Type |
|---------|---------------|
| Flask | Traces |
| Django | Traces |
| FastAPI | Traces |
| Requests | Traces |
| urllib3 | Traces |
| httpx | Traces |
| aiohttp | Traces |
| psycopg2 | Traces |
| pymysql | Traces |
| pymongo | Traces |
| redis | Traces |

## Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `connection_string` | Application Insights connection string | From env var |
| `credential` | Azure credential for AAD auth | None |
| `sampling_ratio` | Sampling rate (0.0 to 1.0) | 1.0 |
| `resource` | OpenTelemetry Resource | Auto-detected |
| `instrumentations` | List of instrumentations to enable | All |
| `enable_live_metrics` | Enable Live Metrics stream | False |

## Best Practices

1. **Call configure_azure_monitor() early** — Before importing instrumented libraries
2. **Use environment variables** for connection string in production
3. **Set cloud role name** for multi-service applications
4. **Enable sampling** in high-traffic applications
5. **Use structured logging** for better log analytics queries
6. **Add custom attributes** to spans for better debugging
7. **Use AAD authentication** for production workloads

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
