# Instrumentation checks

## Inputs

Choose the installed OpenTelemetry SDK and matching exporter. Initialize before instrumented libraries and use OTLP for the configured collector transport.

## Procedure and verification

Follow one request across two services. Assert trace identity and parent-child relationships, exercise an exception, and flush on orderly shutdown. Allowlist low-cardinality operation attributes; exclude credentials, raw payloads and sensitive query values. Verify exporter failures do not make the application request fail.

## Limitations

A local span is not proof of context propagation. Sampling and queue overflow can discard traces; test the actual failure and shutdown behavior.
