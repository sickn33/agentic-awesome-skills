---
name: cross-platform-contract-propagation-audit
description: "Use when auditing whether a field, enum, flag, or API contract propagates consistently across storage, services, clients, analytics, and tests."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-08-18"
author: Whxuan0701
tags: [contract-audit, cross-platform, api, schema, feature-flags]
tools: [claude, cursor, gemini, codex]
---

# Cross-Platform Contract Propagation Audit

## Overview

Audit a contract change from its source through every transformation and consumer before release. Treat a field that exists in one schema as incomplete until its meaning, defaults, wire behavior, rollout controls, client handling, analytics, and tests are proven across all relevant paths.

This is a read-only evidence workflow. It reports propagation gaps; it does not implement them.

## When to Use This Skill

- Use when adding or changing a field, enum value, status, capability, or feature flag shared by multiple components.
- Use when database, backend, API, Web, Android, iOS, jobs, events, or analytics may interpret the same value differently.
- Use when a change must preserve existing records, older clients, or a default-off rollout.
- Use when a change looks complete in one endpoint but may be missing from alternate entry points or generated models.

## How It Works

### Step 1: Write the semantic contract

Before tracing files, state the business invariant and define every observable state. Distinguish values that languages and serializers often collapse:

| State | Questions to answer |
|---|---|
| missing | Is the property absent on the wire or in an old record? |
| `null` | Is it unknown, inherited, unsupported, or invalid? |
| `false` or zero | Is this an explicit disabled value or a default? |
| `true` or non-zero | What behavior becomes available? |
| unknown enum | Must old consumers ignore, preserve, or reject it? |

Record compatibility requirements, ownership, rollout condition, and the exact user-visible or system behavior for each state. Do not accept `optional`, `nullable`, and `default false` as equivalent without evidence.

### Step 2: Enumerate the propagation graph

List every relevant node before judging completeness:

```text
source of truth
  -> persistence and migration
  -> domain model and mapper
  -> service or policy computation
  -> every API, event, cache, and job projection
  -> generated or handwritten client model
  -> client state and presentation logic
  -> analytics and operational observability
  -> tests, rollout, and rollback checks
```

Include alternate read/write endpoints, list/detail projections, background consumers, offline caches, admin surfaces, older app versions, and feature-flag evaluation points when they are in scope. Mark a node `not applicable` only with a reason.

### Step 3: Trace evidence edge by edge

For each edge, cite the producer, transformation, consumer, and test using file paths, symbols, schema names, or other inspectable evidence. Assign one status:

| Status | Meaning |
|---|---|
| `proven` | Producer and consumer agree, with direct evidence and relevant test coverage. |
| `partial` | Some paths or states agree, but coverage is incomplete. |
| `missing` | A required propagation edge or consumer is absent. |
| `conflict` | Two layers implement different semantics. |
| `unknown` | Evidence is unavailable or ambiguous. |
| `not_applicable` | The layer is outside scope, with a stated reason. |

Do not upgrade `likely`, convention, type compatibility, or a framework default to `proven`. A declaration proves shape, not runtime mapping or behavior.

### Step 4: Check the high-risk boundaries

Inspect these boundaries explicitly:

- **Migration and existing data:** default, backfill, nullability, rollback, mixed-version reads and writes.
- **Domain mapping:** missing/null coercion, enum fallbacks, validation, derived values, serialization symmetry.
- **Fan-out surfaces:** list and detail DTOs, events, caches, jobs, search indexes, SDKs, and alternate API versions.
- **Client compatibility:** missing and explicit-null decoding, unknown enums, generated-model drift, cached payloads, release or minified builds.
- **Rollout control:** flag default, evaluation location, cohort consistency, kill switch, and behavior when stored data disagrees with the flag.
- **Analytics:** offered, rendered, attempted, succeeded, and failed events carry enough contract and version context to join reliably.

### Step 5: Build a state-by-path test matrix

Cross the semantic states from Step 1 with every material path from Step 2. At minimum, include existing-data defaults, enabled and disabled values, flag on and off, alternate endpoints, current clients, and representative older clients.

For each cell, record the expected result, evidence, and status. A unit test at one layer does not prove an end-to-end cell. Use `unknown` for unexecuted cells.

### Step 6: Decide against explicit release gates

Derive gates from the stated contract, not from intuition. A release is blocked when an edge or compatibility invariant that the contract explicitly requires is `missing`, `conflict`, or `unknown`, or when rollback cannot contain the new behavior. Use `inconclusive` only when the release contract itself is absent or ambiguous, so the audit cannot determine which edges or invariants are required. Do not downgrade a known required but unproven gate from `blocked` to `inconclusive`.

Return the smallest verification or repair set that would change the verdict. Keep implementation suggestions separate from proven findings.

## Example

For a nullable `can_complete` field that should expose an action only when both the stored capability and server flag are true:

```text
Invariant: show action = (feature_flag == on) AND (can_complete == true)

Path                                      Status    Evidence
DB null -> domain false -> detail API     partial   mapper exists; null case untested
DB true + flag off -> detail API          unknown   flag branch not tested
DB true + flag on -> list API             missing   list DTO omits field
missing field -> Web hidden               proven    client test covers missing
explicit null -> Android hidden           unknown   decoder behavior untested
impression -> click attribution           missing   click event lacks capability/cohort

Verdict: blocked by the missing list projection and incomplete flag enforcement;
older-client and explicit-null compatibility remain unverified.
```

## Best Practices

- Start from behavior and state semantics, then trace code; do not start from a filename guess.
- Search for field names, serialized aliases, enum values, DTOs, mappers, flags, and analytics events.
- Cite negative searches with their scope and revision; absence claims require a bounded search.
- Separate source-of-truth behavior from client presentation and telemetry.
- Verify all entry points that can produce the same user-visible state.
- Keep findings reproducible: contract, revision, evidence, status, impact, and next check.

## Limitations

- Static evidence cannot prove runtime configuration, deployed schema state, generated-code freshness, or client behavior that was not exercised.
- Repository access may omit private services, analytics schemas, remote flags, or older released clients; mark those edges `unknown`.
- This skill finds propagation and semantic gaps, not every security, performance, or product-design defect.
- A complete graph does not prove the underlying business rule is correct.

## Security & Safety Notes

- Keep the audit read-only unless the user separately authorizes implementation or runtime testing.
- Redact production records, credentials, user identifiers, and sensitive payload fields from evidence.
- Do not enable flags, mutate data, publish schemas, or exercise production actions merely to fill an evidence gap.

## Common Pitfalls

- **Problem:** The field exists in the database and one response, so the change is called complete.
  **Solution:** Trace every projection and consumer, including alternate endpoints and events.
- **Problem:** Missing, null, and false are treated as the same state.
  **Solution:** Define and test each state at every serialization boundary.
- **Problem:** Type declarations are treated as runtime proof.
  **Solution:** Require mapping, decoding, behavior, and test evidence before using `proven`.
- **Problem:** The feature flag hides UI but not data or alternate APIs.
  **Solution:** Map every flag evaluation point and test stored-value/flag combinations.
- **Problem:** A green unit test suite is presented as cross-platform coverage.
  **Solution:** Build the state-by-path matrix and preserve unexecuted cells as `unknown`.

## Related Skills

- `@api-analyzer` - Validate the correctness of an individual API request.
- `@spec-to-code-compliance` - Compare formal blockchain specifications with implementations.
- `@technical-change-tracker` - Record implementation progress and handoff state across sessions.
