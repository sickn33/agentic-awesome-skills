# Tracing integration playbook

## Inputs

Service graph, installed SDK versions, allowed collector endpoint, representative requests and telemetry policy.

## Procedure

1. Map one request through entrypoint, outbound call and downstream handler. Use the same propagation format and distinguish service identity from operation names.
2. Configure the SDK and exporter before instrumented libraries load. Use a bounded batch queue and graceful shutdown. Allowlist attributes and omit credentials, raw SQL values and request bodies.
3. Send one successful and one failed staging request. Verify connected spans, duration units, expected service names and exporter failures. Measure overhead before choosing a sampling rate.

## Worked example

A checkout calls inventory and payment. Locate both calls under the checkout trace and ensure a timeout is visible without recording payment data.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Sampling may drop an error before a later collector sees it. Never promise complete error retention from a head-sampled stream.
