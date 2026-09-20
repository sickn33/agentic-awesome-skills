---
name: agent-observability
description: Instrument AI agents with tracing, token metrics, latency, and cost visibility.
  Use for reliability and debugging.
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
  version: '2.0'
---

# Agent Observability

Monitor AI agent behavior with logs, traces, metrics, and cost telemetry. This skill covers the full observability stack for LLM-powered applications: from raw Prometheus counters to Grafana dashboards, OpenTelemetry tracing, structured logging, cost tracking, SLO definition, and PII redaction.

---

## Core Metrics

Define these metrics at the application layer. All examples use the Prometheus client library naming conventions.

### Latency

```python
from prometheus_client import Histogram

# Total end-to-end latency for a full agent turn (user prompt -> final response)
AGENT_LATENCY = Histogram(
    "agent_request_duration_seconds",
    "End-to-end latency of an agent request",
    labelnames=["agent_name", "model", "status"],
    buckets=(0.25, 0.5, 1, 2, 5, 10, 30, 60, 120),
)

# Latency of a single LLM API call (one completion request)
LLM_CALL_LATENCY = Histogram(
    "llm_call_duration_seconds",
    "Latency of an individual LLM API call",
    labelnames=["model", "provider", "stream"],
    buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10, 30),
)

# Latency of tool/function calls executed by the agent
TOOL_CALL_LATENCY = Histogram(
    "agent_tool_call_duration_seconds",
    "Latency of a tool call executed by the agent",
    labelnames=["tool_name", "agent_name", "status"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10),
)
```

### Token Usage

```python
from prometheus_client import Counter, Histogram

PROMPT_TOKENS = Counter(
    "llm_prompt_tokens_total",
    "Total prompt tokens sent to the model",
    labelnames=["model", "agent_name"],
)

COMPLETION_TOKENS = Counter(
    "llm_completion_tokens_total",
    "Total completion tokens received from the model",
    labelnames=["model", "agent_name"],
)

CACHED_TOKENS = Counter(
    "llm_cached_tokens_total",
    "Prompt tokens served from KV-cache (provider-reported)",
    labelnames=["model", "agent_name"],
)

TOKENS_PER_REQUEST = Histogram(
    "llm_tokens_per_request",
    "Total tokens (prompt + completion) per request",
    labelnames=["model", "agent_name"],
    buckets=(100, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000),
)
```

### Cost

```python
from prometheus_client import Counter

LLM_COST = Counter(
    "llm_cost_dollars_total",
    "Estimated cost in USD for LLM usage",
    labelnames=["model", "agent_name", "cost_type"],  # cost_type: prompt | completion
)
```

### Tool Calls

```python
from prometheus_client import Counter

TOOL_CALLS_TOTAL = Counter(
    "agent_tool_calls_total",
    "Total tool calls made by agents",
    labelnames=["tool_name", "agent_name", "status"],  # status: success | error | timeout
)
```

### Errors and Retries

```python
from prometheus_client import Counter, Gauge

LLM_ERRORS = Counter(
    "llm_errors_total",
    "Errors returned by the LLM provider",
    labelnames=["model", "provider", "error_type"],  # error_type: rate_limit | timeout | 5xx | auth
)

LLM_RETRIES = Counter(
    "llm_retries_total",
    "Retried LLM API calls",
    labelnames=["model", "provider", "retry_reason"],
)

AGENT_ACTIVE_REQUESTS = Gauge(
    "agent_active_requests",
    "Number of agent requests currently in flight",
    labelnames=["agent_name"],
)
```

---

## OpenTelemetry Integration

Use the OpenTelemetry Python SDK to create traces that capture every step of an agent turn: the top-level request, each LLM call, each tool execution, and retrieval operations.

### Setup

```python
# otel_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

def init_tracing(service_name: str, otlp_endpoint: str = "http://localhost:4317"):
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "deployment.environment": "production",
    })
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)
```

### Tracing LLM Calls

```python
# llm_tracing.py
import time
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("agent.llm")

def traced_llm_call(client, messages, model="gpt-4o", **kwargs):
    """Wrap an LLM completion call with a full OpenTelemetry span."""
    with tracer.start_as_current_span("llm.chat_completion") as span:
        span.set_attribute("llm.model", model)
        span.set_attribute("llm.provider", "openai")
        span.set_attribute("llm.message_count", len(messages))
        span.set_attribute("llm.temperature", kwargs.get("temperature", 1.0))
        span.set_attribute("llm.max_tokens", kwargs.get("max_tokens", 0))

        start = time.perf_counter()
        try:
            response = client.chat.completions.create(
                model=model, messages=messages, **kwargs
            )
            elapsed = time.perf_counter() - start

            usage = response.usage
            span.set_attribute("llm.prompt_tokens", usage.prompt_tokens)
            span.set_attribute("llm.completion_tokens", usage.completion_tokens)
            span.set_attribute("llm.total_tokens", usage.total_tokens)
            span.set_attribute("llm.duration_seconds", elapsed)
            span.set_attribute("llm.finish_reason", response.choices[0].finish_reason)
            span.set_status(StatusCode.OK)

            # Update Prometheus counters
            PROMPT_TOKENS.labels(model=model, agent_name="default").inc(usage.prompt_tokens)
            COMPLETION_TOKENS.labels(model=model, agent_name="default").inc(usage.completion_tokens)
            LLM_CALL_LATENCY.labels(model=model, provider="openai", stream="false").observe(elapsed)

            return response

        except Exception as exc:
            elapsed = time.perf_counter() - start
            span.set_status(StatusCode.ERROR, str(exc))
            span.record_exception(exc)
            LLM_ERRORS.labels(model=model, provider="openai", error_type=type(exc).__name__).inc()
            raise
```

### Tracing Tool Execution

```python
# tool_tracing.py
import functools
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("agent.tools")

def traced_tool(tool_name: str):
    """Decorator that wraps a tool function with an OTel span and Prometheus metrics."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            with tracer.start_as_current_span(f"tool.{tool_name}") as span:
                span.set_attribute("tool.name", tool_name)
                span.set_attribute("tool.args_count", len(args) + len(kwargs))

                import time
                start = time.perf_counter()
                try:
                    result = func(*args, **kwargs)
                    elapsed = time.perf_counter() - start
                    span.set_attribute("tool.duration_seconds", elapsed)
                    span.set_status(StatusCode.OK)
                    TOOL_CALLS_TOTAL.labels(
                        tool_name=tool_name, agent_name="default", status="success"
                    ).inc()
                    TOOL_CALL_LATENCY.labels(
                        tool_name=tool_name, agent_name="default", status="success"
                    ).observe(elapsed)
                    return result
                except Exception as exc:
                    elapsed = time.perf_counter() - start
                    span.set_status(StatusCode.ERROR, str(exc))
                    span.record_exception(exc)
                    TOOL_CALLS_TOTAL.labels(
                        tool_name=tool_name, agent_name="default", status="error"
                    ).inc()
                    TOOL_CALL_LATENCY.labels(
                        tool_name=tool_name, agent_name="default", status="error"
                    ).observe(elapsed)
                    raise
        return wrapper
    return decorator

# Usage
@traced_tool("web_search")
def web_search(query: str) -> str:
    # ... tool implementation ...
    pass

@traced_tool("sql_query")
def sql_query(statement: str) -> list:
    # ... tool implementation ...
    pass
```

### Propagating Trace Context Across Services

```python
# context_propagation.py
from opentelemetry import context
from opentelemetry.propagate import inject, extract
import httpx

def call_downstream_service(url: str, payload: dict) -> dict:
    """Propagate the current trace context to a downstream HTTP service."""
    headers = {}
    inject(headers)  # injects traceparent + tracestate headers
    response = httpx.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def extract_context_from_request(request_headers: dict):
    """Extract trace context from incoming request headers (for the receiving service)."""
    ctx = extract(request_headers)
    token = context.attach(ctx)
    return token  # call context.detach(token) when done
```

---


## Contents

- [Structured Logging](references/details.md)
- [Grafana Dashboards](references/details.md)
- [Cost Tracking](references/details.md)
- [Langfuse / Helicone Integration](references/details.md)
- [SLO Definition](references/details.md)
- [Debugging Workflows](references/details.md)
- [PII Redaction in Traces](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use

Apply this skill whenever you operate:

- **Autonomous AI agents** that make multi-step tool calls (e.g., coding agents, support agents, data-pipeline agents).
- **LLM-backed APIs** serving chat completions, summarisation, or classification behind a REST or gRPC gateway.
- **RAG pipelines** where a retriever fetches context from a vector store before prompting a model.
- **Multi-agent orchestrations** (crew-style or graph-based) where several agents collaborate on a single task.
- **Batch inference jobs** that process thousands of prompts against a model endpoint.

Key signals that you need this skill:

1. You cannot answer "what is p95 latency for agent responses this week?"
2. You have no per-request cost attribution.
3. Debugging a bad agent response requires grepping raw application logs.
4. You have no alerting on token-usage spikes or elevated error rates.

---

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
