# Application security review checklist

## Inputs

Identify the feature, trust boundaries, stored data, external effects and authorization scope.

## Procedure and verification

Trace inputs to persistence and outputs. Enforce resource ownership independently from login; test another tenant and a denied role. Allowlist writable fields and response fields. Use parameterized queries and contextual output handling. For outbound URLs, consider resolution, redirects and network egress together. Inspect actual logs and errors for secrets. Test rejected requests for absence of side effects and record reproducible findings.

## Limitations

Use staging or local tests within authorization. A checklist does not prove every vulnerability absent. Keep server-side controls, rollback and any untested integration explicit.
