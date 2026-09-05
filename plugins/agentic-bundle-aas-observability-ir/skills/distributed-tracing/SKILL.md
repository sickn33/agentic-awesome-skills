---
name: distributed-tracing
description: Implement distributed tracing with Jaeger and Tempo for request flow visibility across microservices.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Distributed Tracing

## When to Use

Trace a request across services, diagnose latency and error propagation, or add observable boundaries to a new integration.

## Inputs and prerequisites

Record installed SDK and backend versions, permitted collector endpoints, the service graph and a staging request. Inspect the installed version's primary documentation before selecting exporter APIs or deployment configuration. This bundle does not install a tracing backend.

## Procedure

1. Read `resources/implementation-playbook.md` and identify one user journey.
2. Configure the matching OpenTelemetry SDK and OTLP exporter before loading instrumented frameworks. Use `references/instrumentation.md` for propagation, shutdown and privacy checks.
3. Configure Jaeger using `references/jaeger-setup.md`, or the existing Tempo/collector deployment's supported configuration. Review listeners, authentication, transport protection, storage and retention before any deployment.
4. Propagate context over HTTP and asynchronous messages. Use stable operation names and allowlisted attributes. Do not log credentials, raw request bodies or sensitive query values.
5. Send successful and failing staging requests and verify connected spans in the backend. Record service identity, parentage, duration units and exporter errors.
6. Measure queue loss and overhead. Select sampling based on those observations; no fixed percentage guarantees coverage or performance.

## Example

A checkout calls inventory and payment. Verify that the root request and both downstream operations share a trace, that a simulated payment timeout is recorded, and that no card data is present. Repeat with exporter connectivity unavailable: request handling must retain the application's defined behavior.

## Verification

- Actual trace evidence for each exercised boundary, including queue consumers.
- Allowed fields only; bounded attribute cardinality.
- Shutdown flush and exporter failure behavior observed.
- Access, storage and retention checked independently from UI availability.

## Limitations

Head sampling can discard errors before tail sampling sees them. In-memory demos do not prove durable storage. Context propagation and cross-service clocks need actual integration tests; this guide is not a runnable multi-service application.

## Sources

- [OpenTelemetry exporter documentation](https://opentelemetry.io/docs/languages/python/exporters/) — use the installed SDK's matching documentation.
