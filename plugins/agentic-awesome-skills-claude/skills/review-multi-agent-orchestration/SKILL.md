---
name: review-multi-agent-orchestration
description: "Use when a supervisor, swarm, graph, planner-worker system, or parallel agent workflow needs review for task boundaries, shared state, branch joins, retries, cancellation, context handoffs, budgets, deadlocks, or human escalation before implementation or production rollout."
risk: safe
source: self
date_added: "2026-08-19"
---

# Review Multi-Agent Orchestration

## Overview

Review an orchestration as a distributed state machine, not as a list of agent roles. The goal is to prove that every task has one owner, every state transition has one authority, and every terminal outcome is reachable without duplicate effects, lost work, or unbounded loops.

This skill reviews a design or implementation. Do not launch workers, mutate queues, cancel runs, change production configuration, or deploy fixes unless the user separately requests implementation.

## When to Use

- Reviewing supervisor/worker, planner/executor, debate, swarm, graph, or hierarchical Agent designs.
- Introducing parallel branches, subagents, MCP tools, durable execution, memory, checkpoints, or human-in-the-loop gates.
- Diagnosing duplicate work, stale context, deadlocks, livelocks, branch races, runaway retries, or ambiguous ownership.
- Deciding whether a complex task should be parallel, sequential, delegated, or kept in one agent.

Do not use it for a single independent tool call or a simple pipeline with no concurrency, shared state, retry, or delegation boundary.

## Capture the Orchestration Contract

Request or derive:

- business goal, success criteria, and non-goals;
- task graph with stable task IDs and dependency edges;
- agent roles, capabilities, permissions, tools, and sandbox boundaries;
- state schema, source of truth, ownership, versioning, and persistence;
- message envelopes and artifact handoff contracts;
- dispatch, join, retry, timeout, cancellation, compensation, and escalation policies;
- token, cost, concurrency, wall-clock, and external-effect budgets;
- terminal states and evidence required to enter them.

Mark each field as declared, inferred, or missing. Never invent framework behavior from role names such as "supervisor" or "validator."

## Decide Whether Multi-Agent Execution Is Justified

Multi-agent execution is justified when tasks have independently verifiable outputs and can be isolated by files, artifacts, permissions, or read-only scopes. Keep work sequential when one branch consumes another's evolving output, all workers must edit the same state, or coordination cost exceeds the expected parallel gain.

Score each candidate task:

| Dimension | Parallel-safe evidence |
|---|---|
| Dependency | Inputs are frozen before dispatch |
| Ownership | One writer owns each artifact or state partition |
| Verification | Output has a local acceptance contract |
| Context | Handoff fits a bounded message or immutable artifact |
| Side effects | Effects are absent, isolated, or idempotent |
| Failure | Failure can be contained without corrupting siblings |

If any dimension is unresolved, recommend serialization or an explicit coordination mechanism rather than optimistic concurrency.

## Model the State Machine

Represent task state explicitly:

```text
pending -> ready -> leased -> running -> succeeded
                         |        |-> retry_wait -> ready
                         |        |-> needs_human
                         |        |-> failed
                         |        |-> cancelled
                         |-> lease_expired -> ready
```

For every transition record:

- authorized actor;
- compare-and-set precondition or expected state version;
- persisted fields and artifact references;
- emitted event and deduplication key;
- budget consumed;
- timeout or lease behavior;
- compensation or recovery path.

Reject designs where workers overwrite the whole shared state object or where "done" is a free-form message rather than a validated transition.

## Review Task and State Ownership

Each task needs one active lease owner, a fencing token or monotonically increasing attempt, and a stable idempotency key for external effects. A retry may repeat computation, but it must not repeat a committed effect.

Use one of these state patterns deliberately:

- **Single-writer coordinator:** workers return proposals or artifacts; only the coordinator mutates canonical state.
- **Partitioned state:** each worker owns a disjoint namespace; a joiner writes the aggregate.
- **Event log with reducers:** workers append immutable events; deterministic reducers derive state.

Flag shared checkout edits, last-write-wins JSON blobs, mutable global memory, and unversioned summaries as collision risks.

## Review Dispatch and Handoffs

A dispatch envelope should bind:

```json
{
  "run_id": "run-7",
  "task_id": "backend-3",
  "attempt": 2,
  "parent_task_id": "migration-1",
  "input_artifacts": [{"uri": "artifact://schema", "digest": "sha256:..."}],
  "expected_output": "backend-contract-v1",
  "deadline": "RFC3339 timestamp",
  "budgets": {"tokens": 20000, "tool_calls": 40},
  "permissions": ["repo:backend:write", "tests:run"],
  "idempotency_key": "run-7:backend-3",
  "trace_parent": "trace-12"
}
```

Handoffs should pass the minimum sufficient context plus immutable artifact references. Verify that summaries preserve decisions, assumptions, unresolved questions, source citations, and version identity. Do not rely on shared conversational context as durable state.

## Review Joins and Completion

Name the join rule for every fan-out:

- `all_required`: continue only when every required branch succeeds;
- `quorum(k)`: continue after `k` valid results and cancel or ignore the rest by policy;
- `first_valid`: continue after the first result that passes an acceptance predicate;
- `best_effort`: collect until deadline and report missing branches;
- `manual_select`: a human chooses among complete candidates.

`first_finished` is not `first_valid`. Define how late results, duplicate completions, branch cancellation, partial failure, and incompatible artifacts are handled. The joiner must validate artifact versions before moving the parent task to a terminal state.

## Review Failure Semantics

Check these paths explicitly:

| Failure | Required policy |
|---|---|
| Worker crash | Lease expiry, checkpoint boundary, reassignment |
| Timeout | Deadline owner, cancellation propagation, late-result handling |
| Transient tool error | Retry classifier, cap, backoff, same idempotency key |
| Permanent error | Fail/skip/escalate decision and downstream propagation |
| Corrupt output | Schema and semantic rejection without state advancement |
| Coordinator restart | Durable queue/state recovery and fencing of stale workers |
| Human timeout | Safe default and bounded escalation |
| Compensation failure | Explicit manual-recovery state |

Look for retry storms, nested retry multiplication, orphaned workers, circular waits, approval deadlocks, and loops whose only exit is a model judgment. Require a deterministic step, time, or budget bound.

## Review Memory and Reflection Loops

Separate:

- task state required for correctness;
- episodic run history;
- reusable semantic memory;
- scratch reasoning and reflection.

Correctness state must be durable and versioned; it must not depend on vector similarity or a model-generated summary. Memory writes need provenance, tenant/run scope, retention, conflict policy, and a rule for stale or poisoned entries.

Reflection loops need a measurable delta predicate, maximum iterations, budget decrement, and terminal action: accept, revise, escalate, or fail. "Reflect until good" is an unbounded loop.

## Review Observability and Evidence

Require stable `run_id`, `task_id`, `attempt`, `agent_id`, `state_version`, `trace_parent`, and artifact digests across logs. The evidence should reconstruct dispatch, tool calls, state transitions, retries, joins, cancellations, approvals, and terminal verdicts without relying on agent narration.

Do not equate rich traces with correctness. Each terminal state still needs an acceptance predicate and an authoritative witness.

## Produce the Review

Return:

1. **Topology summary** — nodes, edges, state owner, storage, external effects, and human gates.
2. **Invariant table** — invariant, enforcement point, evidence, and gap.
3. **Failure-path matrix** — trigger, current behavior, blast radius, and required containment.
4. **Findings** — severity, exact design element, failure scenario, and smallest viable correction.
5. **Recommended topology** — only the components and policies needed to close findings.
6. **Validation plan** — deterministic unit/model tests, concurrency tests, fault injection, replay, and end-to-end evidence.

Core invariants to include:

- at most one active owner per task attempt;
- monotonic state version and terminal-state immutability;
- no committed effect executes more than once;
- parent completion implies its declared join predicate;
- cancellation reaches every owned child or records an orphan;
- every loop and retry consumes a bounded budget;
- a human-assisted outcome is not reported as autonomous success.

## Common Mistakes

- Adding agents for roles that do not own distinct outputs.
- Sharing one writable checkout or mutable state file across parallel workers.
- Using a supervisor's prose summary as the canonical state.
- Retrying the whole graph when only one idempotent task failed.
- Advancing on the first completion without validating it.
- Letting child and parent retries multiply without a global cap.
- Mixing durable task state with long-term vector memory.
- Measuring throughput while ignoring coordination overhead and failure amplification.

## Limitations

- A static review cannot prove runtime scheduling, provider isolation, or exactly-once external effects; validate those claims in a harness.
- Framework names do not establish durability or failure semantics. Inspect the configured runtime contract.
- Recommendations should match the system's actual risk and scale; do not add queues, consensus, or databases when a single writer and immutable artifacts are sufficient.
