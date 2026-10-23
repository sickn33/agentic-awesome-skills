---
name: tool-use-guardian
description: "Triage tool failures, validate responses and resume bounded workflows using replay-safe retries and explicit handling of unknown write outcomes."
category: reliability
risk: critical
source: community
date_added: "2026-03-13"
author: christopherlhammer11-ai
tags: [reliability, tool-use, error-handling, retries, recovery, agent-infrastructure]
tools: [claude, cursor, codex, gemini, copilot, windsurf, antigravity]
---

# Tool Use Guardian

## Scope

This is a manual recovery procedure, not an installed wrapper, automatic monitor
or learned reliability service. No runtime, checkpoint store or telemetry is
bundled. Preserve the host's tool contracts and the user's action boundaries.

## When to Use This Skill

- A tool response is incomplete, malformed, rate-limited or inconsistent.
- A workflow needs to resume without replaying completed mutations.
- A write timed out and its outcome must be reconciled before any further action.

## Procedure

1. Record the tool, target, exact non-secret parameters, request identity, observed
   error and any confirmed effects. Separate transport status from application
   success. Do not log credentials, private payloads or full conversation context.
2. Validate parameters and responses against the actual tool schema. Do not
   coerce an unknown identifier, invent missing fields, or repair truncated JSON
   by guessing. Fetch complete bounded pages or request a smaller result.
3. Classify the operation before retrying: a read, a documented idempotent write
   using the same operation key, or a potentially non-idempotent mutation. A
   timeout or 429 does not prove that a mutation had no effect.
4. For replay-safe transient reads, follow documented Retry-After/backoff within
   a deadline and at most three total attempts unless the tool contract is
   stricter. Stop on authentication, permission, invalid-input and persistent
   schema failures. Do not change credentials or scope to evade a failure.
5. For an uncertain write, use a supported read-only status lookup bound to the
   same request/operation ID. Resume only after establishing its outcome. If
   lookup is unavailable or ambiguous, preserve the uncertainty and request the
   indispensable decision; never silently repeat a payment, message or delete.
6. Maintain a task-local checkpoint of confirmed completed steps and their
   evidence. Before resuming a dependent step, verify its prerequisites still
   hold. Do not replay earlier writes merely because a later step failed. Return
   completed, failed and unknown steps separately.

## Recovery Examples

| Observation | Bounded next action |
| --- | --- |
| Truncated read-only inventory | Fetch supported pages; reject incomplete inventory as completion evidence. |
| Read timed out | Retry within the read deadline and attempt cap; keep failures visible. |
| Mutation timed out | Inspect status by the original operation ID; do not submit a second mutation. |
| Authentication expired | Report required reauthentication through the supported host flow. |
| HTTP 200 with an error body | Apply the documented result schema; record application failure. |
| Schema mismatch | Retain the original result; investigate contract/version mismatch without lossy coercion. |

```text
Step: publish-message, operation ID op-17
Observation: request timed out; no receipt returned.
Status lookup: unavailable.
Disposition: outcome unknown; no retry sent. Dependent announcement paused.
```

## Limitations

- These instructions cannot enforce retry safety or recover unknown remote state.
- Repeated failures are observations about this task, not proof a tool is globally
  unreliable. Do not write a global denylist or persistent memory automatically.
- Checkpoints can become stale; verify the target state and authorization on resume.
- No automatic interception, free service, learning or guaranteed recovery is
  established by the source links.

## Declared source links

- https://github.com/christopherlhammer11-ai/tool-use-guardian
- https://genesis-node-api.vercel.app
- https://genesis-marketplace.vercel.app
