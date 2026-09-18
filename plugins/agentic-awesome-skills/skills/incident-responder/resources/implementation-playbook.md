# Incident response handoff

## Inputs

Affected journey, detection time, incident commander, response permissions and approved communication channel.

## Procedure

1. Record impact, uncertainty and the last known healthy state. Establish a single decision owner and a timestamped event log.
2. Prioritize a reversible mitigation supported by evidence. Record expected recovery, abort threshold and rollback before an authorized production change.
3. Validate recovery through the user journey and dependency health over an agreed observation window. Draft the handoff and follow-up actions; send external updates only with authorization.

## Worked example

Checkout failures start after a configuration change. Compare affected instances, propose restoring the prior configuration, and verify successful checkout rather than merely green processes.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Severity labels and response times are organization-specific, not universal SLAs. Never invent a recovery ETA or confirmed root cause.
