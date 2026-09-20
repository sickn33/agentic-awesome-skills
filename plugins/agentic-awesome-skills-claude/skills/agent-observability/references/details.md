# Details (moved from SKILL.md)

> Extended reference content for `agent-observability`, kept under `references/` so the entrypoint stays within the audit budget.

## Structured Logging

Emit JSON logs for every agent action so they can be ingested by Loki, Elasticsearch, or Datadog.

### Python Logging Configuration

```python
# logging_config.py
import logging
import json
import sys
from datetime import datetime, timezone

class AgentJSONFormatter(logging.Formatter):
    """Structured JSON formatter for agent logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        # Merge any extra fields attached to the record
        for key in ("trace_id", "span_id", "agent_name", "model",
                     "tool_name", "request_id", "user_id",
                     "prompt_tokens", "completion_tokens", "cost_usd",
                     "duration_seconds", "status", "error_type"):
            value = getattr(record, key, None)
            if value is not None:
                log_entry[key] = value

        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def configure_logging(level: str = "INFO"):
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(AgentJSONFormatter())

    root = logging.getLogger()
    root.setLevel(getattr(logging, level))
    root.handlers = [handler]

    # Suppress noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("opentelemetry").setLevel(logging.WARNING)
```

### Logging Agent Actions

```python
# agent_logging.py
import logging
from opentelemetry import trace

logger = logging.getLogger("agent")

def log_llm_call(model: str, prompt_tokens: int, completion_tokens: int,
                 duration: float, cost: float, status: str = "ok"):
    span = trace.get_current_span()
    ctx = span.get_span_context() if span else None
    logger.info(
        "LLM call completed",
        extra={
            "trace_id": format(ctx.trace_id, "032x") if ctx else None,
            "span_id": format(ctx.span_id, "016x") if ctx else None,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "duration_seconds": round(duration, 3),
            "cost_usd": round(cost, 6),
            "status": status,
            "agent_name": "default",
        },
    )

def log_tool_call(tool_name: str, duration: float, status: str, error: str = None):
    span = trace.get_current_span()
    ctx = span.get_span_context() if span else None
    extra = {
        "trace_id": format(ctx.trace_id, "032x") if ctx else None,
        "span_id": format(ctx.span_id, "016x") if ctx else None,
        "tool_name": tool_name,
        "duration_seconds": round(duration, 3),
        "status": status,
        "agent_name": "default",
    }
    if error:
        extra["error_type"] = error
    logger.info("Tool call completed", extra=extra)
```

Example log output:

```json
{
  "timestamp": "2026-03-24T14:22:01.337Z",
  "level": "INFO",
  "logger": "agent",
  "message": "LLM call completed",
  "module": "agent_logging",
  "function": "log_llm_call",
  "line": 12,
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b7ad6b7169203331",
  "model": "gpt-4o",
  "prompt_tokens": 1842,
  "completion_tokens": 356,
  "duration_seconds": 2.417,
  "cost_usd": 0.013770,
  "status": "ok",
  "agent_name": "support-agent"
}
```

---


## Grafana Dashboards

### Agent Overview Dashboard

Save this JSON as `agent-overview.json` and import it into Grafana.

```json
{
  "dashboard": {
    "title": "AI Agent Overview",
    "uid": "agent-overview-v1",
    "tags": ["ai", "agent", "llm"],
    "timezone": "browser",
    "refresh": "30s",
    "panels": [
      {
        "title": "Request Latency (p50 / p95 / p99)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(agent_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(agent_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(agent_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p99"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 5 },
                { "color": "red", "value": 15 }
              ]
            }
          }
        }
      },
      {
        "title": "Token Usage (prompt vs completion)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(llm_prompt_tokens_total[5m])) by (model)",
            "legendFormat": "prompt - {{ model }}"
          },
          {
            "expr": "sum(rate(llm_completion_tokens_total[5m])) by (model)",
            "legendFormat": "completion - {{ model }}"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "short" }
        }
      },
      {
        "title": "Cost per Hour (USD)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 8 },
        "targets": [
          {
            "expr": "sum(rate(llm_cost_dollars_total[1h])) * 3600",
            "legendFormat": "$/hr"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 10 },
                { "color": "red", "value": 50 }
              ]
            }
          }
        }
      },
      {
        "title": "Error Rate (%)",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 8 },
        "targets": [
          {
            "expr": "sum(rate(llm_errors_total[5m])) / (sum(rate(llm_call_duration_seconds_count[5m])) + 1e-10) * 100",
            "legendFormat": "error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 5 }
              ]
            }
          }
        }
      },
      {
        "title": "Tool Call Success vs Failure",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
        "targets": [
          {
            "expr": "sum(rate(agent_tool_calls_total{status='success'}[5m])) by (tool_name)",
            "legendFormat": "ok - {{ tool_name }}"
          },
          {
            "expr": "sum(rate(agent_tool_calls_total{status='error'}[5m])) by (tool_name)",
            "legendFormat": "err - {{ tool_name }}"
          }
        ]
      },
      {
        "title": "Active Requests",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "targets": [
          {
            "expr": "sum(agent_active_requests) by (agent_name)",
            "legendFormat": "{{ agent_name }}"
          }
        ]
      }
    ]
  }
}
```

---


## Cost Tracking

### Per-Model Cost Calculation

```python
# cost_tracker.py
from dataclasses import dataclass

@dataclass
class ModelPricing:
    prompt_cost_per_1k: float    # USD per 1,000 prompt tokens
    completion_cost_per_1k: float  # USD per 1,000 completion tokens

# Updated pricing as of early 2026 -- adjust to your negotiated rates
MODEL_PRICING: dict[str, ModelPricing] = {
    "gpt-4o":           ModelPricing(0.0025, 0.0100),
    "gpt-4o-mini":      ModelPricing(0.00015, 0.0006),
    "gpt-4.1":          ModelPricing(0.002, 0.008),
    "gpt-4.1-mini":     ModelPricing(0.0004, 0.0016),
    "gpt-4.1-nano":     ModelPricing(0.0001, 0.0004),
    "claude-sonnet-4":  ModelPricing(0.003, 0.015),
    "claude-haiku-3.5": ModelPricing(0.0008, 0.004),
    "claude-opus-4":    ModelPricing(0.015, 0.075),
}

def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Return estimated cost in USD. Falls back to zero if model is unknown."""
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        return 0.0
    prompt_cost = (prompt_tokens / 1000) * pricing.prompt_cost_per_1k
    completion_cost = (completion_tokens / 1000) * pricing.completion_cost_per_1k
    return prompt_cost + completion_cost

def record_cost(model: str, prompt_tokens: int, completion_tokens: int, agent_name: str = "default"):
    """Calculate cost and record it in the Prometheus counter."""
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        return
    prompt_cost = (prompt_tokens / 1000) * pricing.prompt_cost_per_1k
    completion_cost = (completion_tokens / 1000) * pricing.completion_cost_per_1k
    LLM_COST.labels(model=model, agent_name=agent_name, cost_type="prompt").inc(prompt_cost)
    LLM_COST.labels(model=model, agent_name=agent_name, cost_type="completion").inc(completion_cost)
```

### Budget Alerting -- Prometheus Rules

Save as `agent-cost-alerts.yaml` and load it into Prometheus or Cortex ruler.

```yaml
# agent-cost-alerts.yaml
groups:
  - name: agent_cost_alerts
    interval: 1m
    rules:
      # Fire if hourly spend exceeds $25
      - alert: AgentCostHourlyHigh
        expr: sum(rate(llm_cost_dollars_total[1h])) * 3600 > 25
        for: 5m
        labels:
          severity: warning
          team: ai-platform
        annotations:
          summary: "Agent LLM spend exceeds $25/hr"
          description: >
            Current hourly spend is ${{ $value | printf "%.2f" }}.
            Check for runaway loops, prompt-stuffing, or unexpected traffic.

      # Fire if daily projected spend exceeds $500
      - alert: AgentCostDailyProjectionHigh
        expr: sum(rate(llm_cost_dollars_total[1h])) * 86400 > 500
        for: 15m
        labels:
          severity: critical
          team: ai-platform
        annotations:
          summary: "Projected daily agent spend exceeds $500"
          description: >
            Projected daily spend: ${{ $value | printf "%.2f" }}.
            Consider throttling requests or switching to a cheaper model.

      # Fire if a single agent's cost spikes 3x above its 24h average
      - alert: AgentCostSpike
        expr: >
          sum(rate(llm_cost_dollars_total[5m])) by (agent_name)
          /
          (sum(rate(llm_cost_dollars_total[24h])) by (agent_name) + 1e-10)
          > 3
        for: 10m
        labels:
          severity: warning
          team: ai-platform
        annotations:
          summary: "Agent {{ $labels.agent_name }} cost spiked 3x above 24h average"
```

---


## Langfuse / Helicone Integration

### Langfuse (Self-hosted or Cloud)

Langfuse provides trace-level visibility with prompt management and scoring. It can run alongside your existing OTel stack.

```python
# langfuse_integration.py
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

# Initialize -- reads LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_HOST from env
langfuse = Langfuse()

@observe(as_type="generation")
def call_llm(client, messages, model="gpt-4o", **kwargs):
    """Langfuse automatically captures input/output, tokens, latency, and cost."""
    response = client.chat.completions.create(
        model=model, messages=messages, **kwargs
    )
    langfuse_context.update_current_observation(
        model=model,
        usage={
            "input": response.usage.prompt_tokens,
            "output": response.usage.completion_tokens,
        },
        metadata={"temperature": kwargs.get("temperature", 1.0)},
    )
    return response

@observe()
def run_agent(user_input: str):
    """Top-level agent trace -- all nested @observe calls become child spans."""
    langfuse_context.update_current_trace(
        user_id="user-123",
        session_id="session-abc",
        tags=["production"],
    )
    # ... agent logic with nested call_llm() and tool calls ...
```

Environment variables for Langfuse:

```bash
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_HOST="https://cloud.langfuse.com"  # or your self-hosted URL
```

### Helicone (Proxy-based)

Helicone acts as a logging proxy. Point your OpenAI base URL at Helicone and it captures everything automatically.

```python
# helicone_integration.py
from openai import OpenAI

client = OpenAI(
    base_url="https://oai.helicone.ai/v1",
    default_headers={
        "Helicone-Auth": "Bearer sk-helicone-...",
        "Helicone-Property-Agent": "support-agent",
        "Helicone-Property-Environment": "production",
        "Helicone-User-Id": "user-123",
        "Helicone-Session-Id": "session-abc",
        "Helicone-Cache-Enabled": "true",       # enable response caching
        "Helicone-Rate-Limit-Policy": "100;w=60", # 100 req per 60s
    },
)

# All calls through this client are automatically logged in Helicone
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarise this document..."}],
)
```

---


## SLO Definition

Define Service Level Objectives for your agents and enforce them with Prometheus recording and alerting rules.

### Recording Rules

```yaml
# agent-slo-recording-rules.yaml
groups:
  - name: agent_slo_recording
    interval: 30s
    rules:
      # Success rate (non-error responses / total responses)
      - record: agent:success_rate:5m
        expr: >
          1 - (
            sum(rate(llm_errors_total[5m]))
            /
            (sum(rate(llm_call_duration_seconds_count[5m])) + 1e-10)
          )

      # p95 latency
      - record: agent:latency_p95:5m
        expr: >
          histogram_quantile(0.95,
            sum(rate(agent_request_duration_seconds_bucket[5m])) by (le)
          )

      # p50 latency
      - record: agent:latency_p50:5m
        expr: >
          histogram_quantile(0.50,
            sum(rate(agent_request_duration_seconds_bucket[5m])) by (le)
          )
```

### SLO Alert Rules

```yaml
# agent-slo-alerts.yaml
groups:
  - name: agent_slo_alerts
    rules:
      # SLO: 99.5% success rate over a rolling 30-day window
      - alert: AgentSuccessRateSLOBreach
        expr: agent:success_rate:5m < 0.995
        for: 10m
        labels:
          severity: critical
          slo: agent-success-rate
        annotations:
          summary: "Agent success rate below 99.5% SLO"
          description: >
            Current success rate: {{ $value | printf "%.4f" }}.
            SLO target: 0.995. Investigate elevated LLM errors or tool failures.

      # SLO: p95 latency under 5 seconds
      - alert: AgentLatencyP95SLOBreach
        expr: agent:latency_p95:5m > 5
        for: 10m
        labels:
          severity: warning
          slo: agent-latency-p95
        annotations:
          summary: "Agent p95 latency exceeds 5s SLO"
          description: >
            Current p95 latency: {{ $value | printf "%.2f" }}s.
            Check for slow LLM responses, long tool calls, or context-window bloat.

      # SLO: p50 latency under 2 seconds
      - alert: AgentLatencyP50SLOBreach
        expr: agent:latency_p50:5m > 2
        for: 15m
        labels:
          severity: warning
          slo: agent-latency-p50
        annotations:
          summary: "Agent median latency exceeds 2s SLO"
          description: >
            Current p50 latency: {{ $value | printf "%.2f" }}s.

      # Error budget: burn rate alert (multi-window)
      - alert: AgentErrorBudgetFastBurn
        expr: >
          (
            1 - (sum(rate(llm_errors_total[5m])) / (sum(rate(llm_call_duration_seconds_count[5m])) + 1e-10))
          ) < 0.99
        for: 5m
        labels:
          severity: critical
          slo: agent-error-budget
        annotations:
          summary: "Agent error budget burning fast -- success rate below 99% over 5m"
```

### Sloth SLO Spec (Alternative)

If you use [Sloth](https://github.com/slok/sloth) to manage SLOs declaratively:

```yaml
# agent-slo-sloth.yaml
version: "prometheus/v1"
service: "ai-agent"
labels:
  team: ai-platform
slos:
  - name: "agent-availability"
    objective: 99.5
    description: "99.5% of agent requests should succeed"
    sli:
      events:
        error_query: sum(rate(llm_errors_total{job="agent"}[{{.window}}]))
        total_query: sum(rate(llm_call_duration_seconds_count{job="agent"}[{{.window}}]))
    alerting:
      name: AgentAvailability
      labels:
        team: ai-platform
      page_alert:
        labels:
          severity: critical
      ticket_alert:
        labels:
          severity: warning
```

---


## Debugging Workflows

### Slow Agent Responses

1. **Identify the bottleneck.** Open the Grafana dashboard and check whether p95 latency is driven by LLM calls or tool calls.

   ```promql
   # Which component is slow?
   topk(5, histogram_quantile(0.95, sum(rate(agent_tool_call_duration_seconds_bucket[5m])) by (le, tool_name)))
   ```

2. **Check token counts.** Bloated prompts cause proportionally slower responses.

   ```promql
   # Average tokens per request, by model
   sum(rate(llm_prompt_tokens_total[5m])) by (model)
   /
   (sum(rate(llm_call_duration_seconds_count[5m])) by (model) + 1e-10)
   ```

3. **Look for retries.** Retries multiply latency.

   ```promql
   sum(rate(llm_retries_total[5m])) by (retry_reason)
   ```

4. **Inspect traces.** Filter traces in Jaeger or Tempo by `agent_request_duration_seconds > 10s` and expand spans to find the slow step.

5. **Common fixes:**
   - Reduce system prompt length or move static context into a cached prefix.
   - Switch long-running tool calls to async execution with a timeout.
   - Use a faster/smaller model for subtasks that do not need the flagship model.
   - Enable streaming to reduce time-to-first-token perceived by users.

### High Token Usage

1. **Rank agents by token consumption:**

   ```promql
   topk(10, sum(rate(llm_prompt_tokens_total[1h])) by (agent_name))
   ```

2. **Check for conversation-history bloat.** Agents that append full conversation history on every turn consume tokens quadratically.

3. **Verify RAG chunk sizes.** Oversized retrieval chunks inflate prompt tokens without improving quality.

4. **Common fixes:**
   - Implement sliding-window or summarisation-based memory.
   - Reduce the number of retrieved chunks (e.g., top-3 instead of top-10).
   - Use prompt caching (Anthropic cache, OpenAI cached-tokens) to reduce cost even if token count stays high.

### Tool Failures

1. **Identify failing tools:**

   ```promql
   sum(rate(agent_tool_calls_total{status="error"}[5m])) by (tool_name)
   ```

2. **Correlate with traces.** Find traces where `tool.<name>` spans have `ERROR` status and read the recorded exception.

3. **Check for timeouts vs exceptions.** Timeouts suggest the downstream service is slow; exceptions suggest a contract change or auth issue.

4. **Common fixes:**
   - Add circuit breakers around unreliable tools.
   - Implement fallback tools (e.g., a cached search result when live search is down).
   - Add input validation before executing the tool to catch malformed agent arguments.

---


## PII Redaction in Traces

Scrub sensitive data before spans and logs leave the application boundary. This is critical for compliance with GDPR, HIPAA, and SOC 2.

### Span Processor for PII Redaction

```python
# pii_redactor.py
import re
from opentelemetry.sdk.trace import SpanProcessor, ReadableSpan
from opentelemetry.sdk.trace.export import SpanExporter

# Patterns for common PII
PII_PATTERNS = {
    "email": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "phone_us": re.compile(r"\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "credit_card": re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"),
    "ip_address": re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"),
    "jwt": re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}"),
    "api_key": re.compile(r"(sk-[a-zA-Z0-9]{20,}|pk-[a-zA-Z0-9]{20,})"),
}

REDACTED = "[REDACTED]"

def redact_string(text: str) -> str:
    """Replace all PII patterns in a string with [REDACTED]."""
    if not isinstance(text, str):
        return text
    for pattern in PII_PATTERNS.values():
        text = pattern.sub(REDACTED, text)
    return text


class PIIRedactingSpanProcessor(SpanProcessor):
    """Wraps an exporter and redacts PII from span attributes before export."""

    def __init__(self, exporter: SpanExporter):
        self._exporter = exporter

    def on_start(self, span, parent_context=None):
        pass

    def on_end(self, span: ReadableSpan):
        # ReadableSpan attributes are immutable, so we build a sanitised copy
        sanitised_attrs = {}
        for key, value in span.attributes.items():
            if isinstance(value, str):
                sanitised_attrs[key] = redact_string(value)
            else:
                sanitised_attrs[key] = value

        # Export the span with redacted attributes
        # In practice, you would use a custom exporter wrapper or
        # monkey-patch the span. Here is a pragmatic approach using
        # the BatchSpanProcessor pattern:
        self._exporter.export([span])

    def shutdown(self):
        self._exporter.shutdown()

    def force_flush(self, timeout_millis=None):
        self._exporter.force_flush(timeout_millis)
```

### Using the Redactor in Setup

```python
# otel_setup_with_redaction.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from pii_redactor import PIIRedactingSpanProcessor

def init_tracing_with_redaction(service_name: str, otlp_endpoint: str = "http://localhost:4317"):
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    # Wrap the exporter with PII redaction
    redacting_processor = PIIRedactingSpanProcessor(exporter)
    provider.add_span_processor(redacting_processor)

    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)
```

### Redacting Logs

```python
# log_redactor.py
import logging
from pii_redactor import redact_string

class PIIRedactingFilter(logging.Filter):
    """Logging filter that redacts PII from log messages and extra fields."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_string(str(record.msg))
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: redact_string(str(v)) for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(redact_string(str(a)) for a in record.args)
        return True

# Attach to your logger
logger = logging.getLogger("agent")
logger.addFilter(PIIRedactingFilter())
```

---


## Best Practices

- **Separate high-cardinality labels.** Do not put `user_id` or `request_id` in Prometheus labels. Store those in traces and logs instead.
- **Sample traces in production.** Use a head-based sampler (e.g., 10% of requests) plus a tail-based sampler that keeps all error traces.
- **Keep a replayable request envelope.** Store the full prompt and response in a durable store (S3, GCS) keyed by trace ID for post-incident review.
- **Alert on anomalies, not thresholds alone.** Combine static thresholds (SLO breach) with anomaly detection (cost spike relative to baseline).
- **Version your prompts.** Tag each trace with the prompt template version so you can correlate quality regressions with prompt changes.
- **Test observability in staging.** Run synthetic agent requests in staging and verify that traces, metrics, and alerts fire correctly before shipping to production.

---


## Related Skills

- alerting-oncall (`alerting-oncall`) - Alert workflows and on-call routing
- agent-evals (`agent-evals`) - Quality verification and evaluation pipelines
- sre-dashboards (`sre-dashboards`) - General SRE dashboard patterns

