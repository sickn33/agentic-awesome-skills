---
name: production-runtime-certification
description: "Certify a deployed service with fresh evidence across source, CI, migrations, runtime health, readiness, and critical routes; use before declaring a release production-ready."
category: devops
risk: safe
source: self
source_type: self
date_added: "2026-09-12"
author: mosinlshaikh
tags: [production, deployment, verification, reliability, devops]
tools: [claude, cursor, codex, gemini]
---

# Production Runtime Certification

## Overview

Produce an evidence-backed release verdict that distinguishes code quality, CI success, deployment success, and live runtime health. The skill prevents a green pipeline or successful deploy event from being treated as proof that a service is usable in its target environment.

## When to Use This Skill

- Before declaring a release, environment, or migration production-ready.
- After a deployment when CI is green but runtime health is unknown or failing.
- During release audits that require a concise PASS, FAIL, or BLOCKED decision with reproducible evidence.
- When handing a deployed service from engineering to operations or a client.

Do not use this skill as a substitute for feature acceptance, security review, load testing, disaster-recovery exercises, or regulatory approval.

## Certification Contract

Agree on these inputs before testing:

- exact source revision, repository, and target environment;
- deployment identifier and expected artifact or image digest when available;
- health and readiness endpoints plus expected success semantics;
- migration mechanism and expected schema version;
- critical user journeys or routes;
- authorized, non-destructive probes and credential boundaries.

If the target, authorization, or success criteria are ambiguous, stop and request clarification. Never probe an unrelated environment, expose credentials in output, or modify production data merely to obtain a passing result.

## Evidence Model

Record every gate as one of:

- **PASS** — fresh evidence satisfies the agreed criterion.
- **FAIL** — fresh evidence disproves the criterion.
- **BLOCKED** — the gate could not be tested because access, tooling, configuration, or an upstream dependency is unavailable.
- **NOT APPLICABLE** — the gate is deliberately excluded with a written reason.

`BLOCKED` is not `PASS`. An overall certification can be **GREEN** only when every required gate passes. Any required failure produces **RED**; any required blocked gate with no failure produces **BLOCKED**.

## Workflow

### 1. Pin the Subject

Capture the immutable source revision and intended runtime artifact. Confirm that the deployed artifact maps to that revision. A branch name, local working tree, or “latest deployment” label is not immutable evidence.

### 2. Verify Source and CI

Run the repository's current validation and test commands on the pinned revision. Inspect the required CI jobs for the same revision, including conclusion and timestamp. Do not infer full CI success from one job or from an older run.

### 3. Verify Deployment Identity

Confirm that the target environment reports the expected deployment, revision, or artifact digest. Record the environment and deployment identifiers without copying secrets or sensitive configuration values.

### 4. Verify Database State

Use the application's supported migration status or a read-only schema-version query. Confirm migrations completed on the target database and that the application is not running against an unexpected database or schema.

Do not apply, roll back, repair, or stamp migrations unless the user separately authorizes that mutation and a recovery plan exists.

### 5. Probe Liveness and Readiness

Test liveness and readiness separately when both exist:

- **Liveness** shows that the process can respond.
- **Readiness** shows that the service can handle intended traffic and required dependencies are available.

Record timestamp, target, status code, bounded response summary, and latency. Redact tokens, cookies, internal hostnames, database addresses, and response fields that contain secrets or personal data.

### 6. Exercise Critical Routes

Run the smallest authorized smoke suite that proves the agreed critical journeys. Prefer synthetic or test records and read-only probes. For authenticated routes, use designated test identities with least privilege and never place credentials in commands, logs, or the report.

### 7. Check Operational Signals

Inspect the bounded deployment window for crash loops, unhandled exceptions, dependency failures, elevated error rates, or resource exhaustion. Absence of log access is `BLOCKED`, not proof of health.

### 8. Issue the Verdict

Publish the evidence matrix, unresolved risks, and exact overall verdict. Keep observations separate from inference. Include enough identifiers and timestamps for another engineer to reproduce the decision without exposing sensitive data.

## Report Template

```text
PRODUCTION RUNTIME CERTIFICATION
Environment: <target>
Source revision: <immutable revision>
Deployment/artifact: <immutable identifier>
Observed at: <UTC timestamp>

SOURCE VALIDATION: PASS | FAIL | BLOCKED | NOT APPLICABLE
CI: PASS | FAIL | BLOCKED | NOT APPLICABLE
DEPLOYMENT IDENTITY: PASS | FAIL | BLOCKED | NOT APPLICABLE
DATABASE MIGRATIONS: PASS | FAIL | BLOCKED | NOT APPLICABLE
LIVENESS: PASS | FAIL | BLOCKED | NOT APPLICABLE
READINESS: PASS | FAIL | BLOCKED | NOT APPLICABLE
CRITICAL ROUTES: PASS | FAIL | BLOCKED | NOT APPLICABLE
OPERATIONAL SIGNALS: PASS | FAIL | BLOCKED | NOT APPLICABLE

OVERALL: GREEN | RED | BLOCKED
Evidence: <commands/checks, run IDs, timestamps, bounded results>
Unresolved risks: <none or explicit list>
```

## Examples

### CI Green, Runtime Unavailable

```text
SOURCE VALIDATION: PASS — revision 8f31c2a, tests 146/146
CI: PASS — required run 72814 completed at 2026-09-12T10:06:00Z
DEPLOYMENT IDENTITY: PASS — artifact maps to revision 8f31c2a
DATABASE MIGRATIONS: BLOCKED — target database access unavailable
LIVENESS: FAIL — HTTP 503 at 2026-09-12T10:14:22Z
READINESS: FAIL — HTTP 503 at 2026-09-12T10:14:24Z
CRITICAL ROUTES: BLOCKED — smoke checks stopped after readiness failure
OPERATIONAL SIGNALS: BLOCKED — log access unavailable

OVERALL: RED
Unresolved risks: runtime cause and database state remain unverified
```

### Fully Supported Verdict

```text
SOURCE VALIDATION: PASS
CI: PASS
DEPLOYMENT IDENTITY: PASS
DATABASE MIGRATIONS: PASS
LIVENESS: PASS
READINESS: PASS
CRITICAL ROUTES: PASS
OPERATIONAL SIGNALS: PASS

OVERALL: GREEN
Unresolved risks: none within the agreed certification scope
```

## Best Practices

- Use fresh, timestamped evidence for the exact revision and environment.
- Prefer immutable run, deployment, and artifact identifiers over screenshots or labels.
- Set bounded timeouts and request counts for runtime probes.
- Report partial success precisely; preserve FAIL and BLOCKED gates in summaries.
- Keep the certification read-only unless a separate change request authorizes remediation.
- Re-run affected gates after any code, configuration, migration, or infrastructure change.

## Common Pitfalls

- **Problem:** CI is green, so the release is declared healthy.
  **Solution:** Verify deployment identity, migrations, readiness, routes, and operational signals independently.

- **Problem:** A liveness response is treated as readiness.
  **Solution:** Test dependency-aware readiness criteria or record readiness as BLOCKED when none exist.

- **Problem:** Smoke tests accidentally create or alter customer data.
  **Solution:** Use non-destructive probes or designated synthetic records with an explicit cleanup policy.

- **Problem:** Missing access is reported as success because no error was observed.
  **Solution:** Mark the affected gate BLOCKED and keep the overall verdict BLOCKED unless another required gate fails.

- **Problem:** Credentials or internal configuration are copied into evidence.
  **Solution:** Record identifiers and bounded outcomes; redact secrets, personal data, and sensitive topology.

## Limitations

- Certification is a point-in-time result for one revision and environment.
- Passing smoke checks do not establish performance capacity, security, resilience, or business correctness beyond the agreed scope.
- Provider dashboards and health endpoints can be incomplete; state evidence gaps explicitly.
- A GREEN verdict expires when the deployed artifact, configuration, schema, dependencies, or target environment changes.

## Security & Safety Notes

- Obtain authorization for the exact target and probes before accessing a live environment.
- Use least-privilege, designated test identities and read-only checks wherever possible.
- Never print, store, or transmit secrets, session material, personal data, or full sensitive responses in certification evidence.
- Stop when a check would require destructive data changes, privilege escalation, or a scope expansion that was not authorized.

## Related Skills

- `@verification-before-completion` — verifies that any completion claim has fresh supporting evidence; use this skill for the production-specific gate model and verdict.
- `@deployment-procedures` — use for executing a deployment; return here afterward to certify the deployed runtime.
