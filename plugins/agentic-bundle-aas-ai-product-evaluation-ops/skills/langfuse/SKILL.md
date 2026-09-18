---
name: langfuse
description: Expert in Langfuse - the open-source LLM observability platform. Covers tracing, prompt management, evaluation, datasets, and integration with LangChain, LlamaIndex, and OpenAI. Essential for debugging, monitoring, and improving LLM applications in production.
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# Langfuse

Instrument an existing LLM application with traceable, minimized observations and versioned evaluation inputs. Modified by AAS maintainers on 2026-09-05 to replace mixed legacy SDK examples with a current, bounded setup procedure; existing source attribution is preserved.

## When to Use

Use when an application already needs Langfuse tracing, prompt management or evaluation, or when debugging missing/duplicated spans. Do not add an observability service merely because an LLM is present; start from the incident or product decision the data must support.

## Inputs and prerequisites

- Installed Python or JS SDK version, framework and runtime lifecycle.
- The explicitly authorized Langfuse project/endpoint, credentials supplied through the project’s secret mechanism, and data retention/access policy.
- An allowlist of observable fields and a synthetic request that contains no private content.
- A defined verifier: expected parent/child spans, status, timing, model/prompt version and flush behavior.

## Procedure

1. Inspect the dependency lock and existing instrumentation. Do not mix old `langfuse.trace()`, `langfuse.decorators` or `langfuse.callback` examples with the current SDK without checking its migration guide.
2. Choose one integration layer: direct SDK spans, a framework callback or OpenTelemetry instrumentation. Avoid tracing the same call twice through overlapping wrappers.
3. Configure the approved endpoint and credentials outside source. Verify export permission before running an example: instrumentation can send inputs, outputs, metadata and exceptions externally.
4. Start with explicit observations containing only synthetic or allowlisted values. Add correlation IDs only when their scope and privacy treatment are defined.
5. Execute one success and one failure request; inspect the actual exported span tree and verify no sensitive fields escaped through nested metadata or third-party instrumentation.
6. Flush in short-lived processes and test shutdown/timeouts. A returned SDK call does not by itself prove ingestion.
7. Add prompt/evaluation metadata only after the trace boundary works. Pin the prompt version or record the exact resolved version; a mutable production label is not an immutable experiment input.

## Minimal Python observation

The current [Python SDK overview](https://langfuse.com/docs/observability/sdk/overview) documents `get_client()` and context-managed observations. Use the API matching the installed SDK. After configuration and export authorization, this synthetic example creates one span and no LLM call:

```python
from langfuse import get_client

client = get_client()
with client.start_as_current_observation(as_type="span", name="synthetic-health-check") as span:
    span.update(output={"status": "ok"})
client.flush()
```

Expected observation: one completed `synthetic-health-check` span in the intended project with the fixed status value. This skill does not claim that a live ingestion check has run. A wrong endpoint, missing credentials or exporter failure must be reported as a failed/unverified check.

## Privacy and masking

Do not treat truncation as redaction. Prefer omitting raw prompts, user messages and tool payloads; inspect all configured exporters. Current Python SDKs provide `mask_otel_spans` for export-time transformation; the legacy `mask` hook covers a narrower set of SDK-created attributes. Choose the installed-version mechanism using the [masking documentation](https://langfuse.com/docs/observability/features/masking), and test a synthetic secret in nested metadata and an exception. Collector-side filtering occurs after data leaves the application, so place it within the approved trust boundary.

## Prompt management and evaluation

Record dataset revision, prompt version, model identifier, tool configuration and evaluator definition. Keep evaluator errors distinct from low scores. A judge response must pass a bounded schema and finite-range validation; never convert arbitrary model text directly with `float()` and call it measured quality. Calibrate judgments against reviewed examples and report disagreement. Separate user feedback from an automatic judge score.

Worked comparison: run the same fixed support examples against prompt versions A and B, record each output and verifier outcome, then inspect regressions and cost/latency. Expected: a reproducible comparison with failures retained, not an automatic production-label change after the highest average score.

## Limitations

- SDK methods and integrations evolve; server version, Python SDK version and JS package versions are separate compatibility facts.
- Traces expose observable operations, not hidden chain-of-thought or proof of answer correctness.
- Masking one exporter does not sanitize every log or exporter in the application.
- Sampling, queue loss and shutdown behavior affect trace completeness; evaluate them explicitly.
- This skill does not create accounts, change production prompt labels, upload datasets or configure external telemetry without task authorization.

## References

- [Tracing setup](https://langfuse.com/docs/observability/get-started)
- [SDK overview](https://langfuse.com/docs/observability/sdk/overview)
- [Advanced SDK features](https://langfuse.com/docs/observability/sdk/advanced-features)
- [Masking](https://langfuse.com/docs/observability/features/masking)
