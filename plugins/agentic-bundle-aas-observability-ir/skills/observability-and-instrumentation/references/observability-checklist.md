# Instrumentation acceptance checklist

## Inputs

Write the on-call questions and identify the authorized staging environment.

## Procedure and verification

Check structured event names and bounded correlation identifiers; reject or regenerate malformed external identifiers. Confirm redaction on nested errors and request paths. Verify rate, error and duration metrics with bounded labels; follow a request across service boundaries. Exercise an allowed failure and verify its log, metric and trace. Test alert delivery only to an authorized test destination, then restore any changed thresholds.

## Limitations

Record evidence and untested boundaries before launch. Do not send private data to an external telemetry backend without authorization. Head sampling can discard errors before tail sampling sees them; document that coverage limit.
