---
name: production-code-audit
description: "Audit an explicitly scoped codebase for evidenced security, correctness and performance issues; implement authorized targeted repairs and report validation plus residual readiness gaps."
risk: critical
source: community
date_added: "2026-02-27"
---

# Production Code Audit

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Use when user says "make this production-ready"
- Use when user says "audit my codebase"
- Use when user says "make this professional/corporate-level"
- Use when user says "optimize everything"
- Use when user wants enterprise-grade quality
- Use when preparing for production deployment
- Use when code needs to meet corporate standards

## Worked Example: Query Repair

For a request-controlled email used in a concatenated PostgreSQL query, trace the input and confirm the driver, then replace concatenation with its parameter-binding API:

```typescript
// pg-compatible example; driver and database fixtures must be supplied.
const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
```

Validate a normal match, no match and a synthetic quote-containing input. Record actual commands and results; do not assert the test passed from the snippet alone. If a credential was found, removing it from source does not revoke it: report rotation and history/artifact exposure to the authorized owner without copying the value.

## Output Example (Illustrative Structure)

```markdown
Scope: repository, base/head, files fully read, excluded/unavailable files.
Finding: path:line, trigger, observed behavior, impact and severity rationale.
Repair: minimal change and why it preserves the intended behavior.
Validation: command/environment/result, or explicitly not run with reason.
Remaining gaps: unsupported runtime, unreviewed deployment, external configuration.
Readiness: evidence available and specific unresolved criteria; no blanket certification.
```

Any metrics must come from reproducible measurements with dataset, environment and baseline/head. Zero scanner findings does not mean zero vulnerabilities, and OWASP Top 10 is an awareness list rather than a “compliance” certificate. An audit request does not authorize deploying, provisioning telemetry/caches or contacting third parties.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
