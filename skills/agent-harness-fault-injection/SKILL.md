---
name: agent-harness-fault-injection
description: "Use when an agent workflow needs deterministic recovery evidence for sandbox, MCP/tool, worker, checkpoint, memory, or orchestration failures."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-08-19"
author: Whxuan0701
tags: [agent-harness, fault-injection, recovery, state-machine, mcp, multi-agent]
tools: [claude, cursor, gemini, codex-cli]
---

# Agent Harness Fault Injection

## Overview

Use a deterministic, non-production fault schedule to test whether an agent
workflow preserves state, budgets, safety boundaries, and evidence when a
dependency fails. The output is a small fault matrix, an event timeline, and a
verdict that distinguishes recovered, contained, unrecoverable, and
inconclusive runs.

## When to Use This Skill

- Use when a multi-step agent, state machine, loop, or multi-agent workflow has a new recovery path.
- Use when sandbox execution, an MCP/tool call, a worker, a checkpoint store, or memory can time out or disappear.
- Use before claiming retry, resume, deadline, isolation, or partial-failure behavior is production-ready.
- Use when a regression needs reproducible failure evidence instead of a random chaos run.

Do not use this skill against a production target, real user data, live credentials,
or an unbounded external service. Convert those cases to a local simulator or an
authorized staging harness first.

## Safety and Boundary Preconditions

1. Freeze the workflow revision, model/prompt configuration, tool schemas, seed,
   input fixture, timeout, retry budget, deadline, and expected terminal states.
2. Run in a disposable sandbox with synthetic inputs and stubbed tools. Keep
   network disabled unless the test explicitly needs a local test server.
3. Make every injected failure an in-memory or fixture-controlled event. Never
   delete real data, revoke real credentials, kill an unrelated process, or
   mutate a live service to create a failure.
4. Record the test scope and a run identifier before starting. A missing scope,
   fixture, or recovery contract makes the verdict `inconclusive`.

## Recovery Contract

Write the invariant before injecting a fault. A useful contract names the state
that must survive and the side effects that must not repeat:

```text
After recovery, resume from the latest durable checkpoint, preserve the task
identity and safety policy, spend no more than the remaining retry/deadline
budget, and commit each externally visible effect at most once.
```

Model the workflow with explicit states. For example:

```text
created -> running -> checkpointed -> waiting_for_tool
                       |                |
                       v                v
                    failed <--------- recovering -> resumed -> completed
```

For each transition, define the owner, durable fields, allowed retry count,
and terminal behavior. In-memory values are not checkpoints unless the harness
proves they survive the simulated restart.

## Fault Matrix

Select the smallest set of faults that covers the new recovery logic. Do not
randomize the schedule until a deterministic schedule has passed.

| Fault | Injection boundary | Required observation | Expected containment |
|---|---|---|---|
| sandbox denial | before a tool starts | no unsafe side effect; reason is retained | retry only when policy allows |
| MCP/tool timeout | after request id is assigned | timeout is attributed to that request | bounded retry with same idempotency key |
| worker restart | after checkpoint write | worker reloads the same task version | resume from latest checkpoint |
| missing/stale checkpoint | before resume | stale data is rejected or marked | stop safely; never invent progress |
| parallel branch failure | one branch after fan-out | sibling status is preserved | join policy decides retry, degrade, or stop |
| memory loss | clear ephemeral context | durable facts are reconstructed | ask or stop when required facts are absent |
| retry/deadline exhaustion | on the final attempt | no extra call is scheduled | terminal `failed` or `timed_out` |

## Deterministic Injection Schedule

Use event numbers rather than wall-clock randomness. A schedule should be
portable across harnesses:

```json
{
  "seed": "harness-fixture-07",
  "faults": [
    {"event": "tool.call", "ordinal": 2, "kind": "timeout", "tool": "search"},
    {"event": "worker.start", "ordinal": 2, "kind": "restart"},
    {"event": "branch.join", "ordinal": 1, "kind": "partial_failure", "branch": "summarize"}
  ]
}
```

The harness should emit the schedule, not merely the seed. Keep fault identity
separate from the observed error so a wrapper cannot accidentally turn a
timeout into a generic failure. Run the same schedule twice and compare the
normalized timeline before trying a different schedule.

## Recovery Rules by Boundary

### Sandbox and MCP/tool failures

- Assign a request id and idempotency key before the call.
- Distinguish timeout, explicit tool error, invalid output, and policy denial.
- Retry only the declared retryable classes; preserve the original error and
  attempt count in the evidence.
- Do not retry a side effect unless the tool contract says the key is safe to
  replay. A read timeout is not proof that a write did not happen.
- When the deadline or retry budget is exhausted, emit one terminal event and
  stop scheduling work.

### Worker restart and checkpoints

- Persist task id, workflow version, state name, completed effects, remaining
  budgets, and the checkpoint sequence before a restart test.
- Reload the newest valid checkpoint and reject a future-version or corrupted
  checkpoint instead of guessing.
- Verify that resumption does not replay a committed effect. If exactly-once
  cannot be proven, downgrade the verdict and require reconciliation.

### Parallel branches

Represent each branch as its own child attempt. The join record must retain
success, failure, timeout, and not-started states. Choose one predeclared join
policy:

- `all_required`: any required branch failure stops the join;
- `best_effort`: continue with an explicit degraded marker;
- `compensate`: run a bounded compensating action and then stop or resume.

Never let a successful sibling erase a failed branch from the final ledger.

### Memory loss

Clear only the ephemeral context named in the schedule. Rebuild from the
checkpoint and durable evidence, then check that the agent does not fabricate
missing user intent, tool output, or approval. If a required fact is absent,
the safe result is `inconclusive` or a human clarification state.

## Budgets and Terminal Verdicts

Track remaining attempts and remaining time after every event. Do not reset a
budget on a worker restart or branch retry. Use these verdicts:

| Verdict | Meaning |
|---|---|
| `recovered` | The declared invariant held and the workflow completed within budget. |
| `contained_failure` | The fault was isolated and the workflow stopped safely as designed. |
| `unrecoverable` | Recovery violated an invariant, repeated a side effect, crossed a boundary, or exceeded budget. |
| `inconclusive` | The fixture, checkpoint, contract, or evidence was insufficient to judge. |

`contained_failure` is not autonomous success. Report it separately from
completed work and include the terminal reason.

## Evidence Output

Produce one machine-readable record and one concise human summary. Every event
should include `run_id`, monotonic `seq`, logical `time`, `state_before`,
`state_after`, `actor`, `event`, `fault_id` (when injected), `attempt`,
`checkpoint_seq`, `retry_remaining`, `deadline_remaining_ms`, and a redacted
`evidence_ref`.

```json
{
  "run_id": "fi-2026-08-19-07",
  "verdict": "recovered",
  "invariants": {"resume_from_checkpoint": "pass", "effect_at_most_once": "pass", "budget": "pass"},
  "faults": [{"id": "f1", "kind": "tool_timeout", "at": "tool.call#2", "handled": true}],
  "timeline": [
    {"seq": 4, "event": "checkpoint.write", "checkpoint_seq": 3},
    {"seq": 5, "event": "tool.timeout", "fault_id": "f1", "retry_remaining": 1},
    {"seq": 8, "event": "workflow.completed", "checkpoint_seq": 4}
  ],
  "limitations": ["Tool output was synthetic; no deployed MCP was exercised."]
}
```

The human summary should state the frozen contract, injected schedule, verdict,
failed invariants, budget consumption, and the narrowest next verification.
Redact prompts, tokens, private records, and tool payloads; stable references
are enough for replay.

## Example: Local Harness Run

```text
Fixture: checkout planner / seed harness-fixture-07
Schedule: search timeout on call 2; worker restart after checkpoint 3
Policy: one retry, 2s deadline, all_required branch join

Result: recovered
Proof: checkpoint 3 reloaded, search request key replayed once, no duplicate
commit, deadline remaining 640ms, final ledger contains both branch outcomes.
```

## Best Practices

- Freeze inputs and schedules so a failure can be replayed from the evidence.
- Test one boundary at a time, then add a combined schedule for interaction risk.
- Assert invariants after every recovery transition, not only at final output.
- Keep attempt-level faults and task-level outcomes in separate ledgers.
- Treat missing evidence as `inconclusive`, never as a passing recovery.

## Limitations

- A local stub cannot prove behavior of a deployed model, MCP server, scheduler,
  filesystem, or network.
- Deterministic schedules cover named paths; they do not estimate random-fault
  frequency or discover unknown failure modes.
- At-most-once effects require an idempotent, observable contract; a timeline
  alone cannot prove an external write was not duplicated.
- This skill does not select production SLOs, repair broken workflows, or grant
  permission to test systems outside the declared sandbox.

## Security & Safety Notes

- Keep tests local-only and read-only by default; use synthetic fixtures and
  fake credentials that cannot access a real account.
- Require explicit authorization and a disposable staging boundary before any
  test that could contact a non-local service.
- Do not include destructive commands, exploit payloads, credential material,
  or automatic cleanup of user data in a harness or report.
- Redact secrets and personal data before storing timelines or attaching them
  to a pull request.

## Common Pitfalls

- **Problem:** A retry clears the original timeout and hides the fault.
  **Solution:** Keep fault id, original class, attempt, and retry lineage in the ledger.
- **Problem:** A restart passes because the test reused in-memory state.
  **Solution:** Serialize, clear, and reload only the declared checkpoint fields.
- **Problem:** A partial fan-out is reported as success.
  **Solution:** Preserve every branch state and apply the predeclared join policy.
- **Problem:** A missing checkpoint is replaced with guessed progress.
  **Solution:** Stop safely and return `inconclusive` or `unrecoverable` with evidence.
- **Problem:** A green final answer hides a deadline or duplicate-effect violation.
  **Solution:** Gate the verdict on invariants and remaining budget, not output text alone.

## Related Skills

- `@agent-evaluation-reporting` - Report autonomous, assisted, failed, timed-out, and invalid outcomes.
- `@cross-platform-contract-propagation-audit` - Trace recovery fields and status contracts across consumers.
- `@multi-agent-patterns` - Choose a multi-agent topology before testing its failure behavior.
