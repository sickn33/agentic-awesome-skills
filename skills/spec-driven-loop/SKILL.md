---
name: spec-driven-loop
description: Freeze PRD, technical design, and acceptance criteria before medium-to-large Codex work; coordinate agents with explicit ownership, then judge delivery from diffs, tests, and evidence.
category: development
risk: safe
source: self
source_repo: Linji-x/spec-driven-loop
source_type: self
license: MIT
license_source: https://github.com/Linji-x/spec-driven-loop/blob/v1.0.0/LICENSE
date_added: "2026-08-25"
author: Linji-x
tags:
  - codex
  - spec-driven-development
  - multi-agent
  - agent-orchestration
  - acceptance-testing
tools:
  - codex
---

# Spec-Driven Loop

Turn an uncertain software request into an approved specification, a controlled implementation, and evidence-backed acceptance. Keep project documents in the repository's established location; otherwise use `docs/spec-driven/<feature-slug>/`.

## When to Use

Use this skill for new products, medium-to-large features, cross-module changes, or requests that need PRD/technical design, active clarification, multi-agent execution, or a main-agent judge. Do not use it for a small single-file change, a tiny bug fix, code explanation, review-only or diagnostic work, pure research, or a simple task whose specification is already complete.

## Quick Example

```text
$spec-driven-loop Build a multi-tenant job dashboard with role-based access and evidence-backed acceptance.
```

## Limitations

- Not intended for small isolated edits, review-only work, diagnosis, or pure research.
- Does not replace environment-specific testing or grant authorization for unrelated changes or external actions.
- Production implementation cannot start until the user explicitly approves the frozen specification and acceptance contract.

Follow repository instructions and authorization boundaries throughout. Match generated project documents to the user's language or the repository's existing documentation language; keep identifiers such as `FR-001` and `AC-001` stable.

## Operating Invariants

- Facts are the agent's responsibility. Decisions belong to the user.
- Investigate discoverable facts before asking questions. Ask only for real product decisions or consequential technical tradeoffs.
- Never write or modify production code until the user explicitly approves the specification, scope, and acceptance contract for implementation.
- Never disguise uncertainty. Mark it `TBD`, `ASSUMPTION`, or `BLOCKED`.
- A subagent's completion report is evidence, not acceptance. The main agent owns integration and the final judgment.
- Freeze shared interfaces, data structures, and public types before parallel work. Assign non-overlapping file ownership; serialize overlapping work.
- Update the durable documents after every decision or implementation loop. A chat transcript is not the source of truth.
- If implementation reveals a requirement change rather than a code defect, stop affected work, revise the specification, obtain renewed user approval, and then resume.
- Preserve the user's authorization scope. A specification approval authorizes the approved implementation, not unrelated changes or external actions.

The requirements-grilling stage is informed by Matt Pocock's MIT-licensed `grill-me` / `grilling` decision-tree and frontier method.

## Document Boundaries

Keep each fact in one authoritative document and reference its stable ID elsewhere:

- `PRD.md`: why and what the product must do; owns scope, user behavior, business rules, assumptions, and product decisions.
- `TECH_DESIGN.md`: how the approved product behavior will work; owns architecture, contracts, data, operations, security, and technical decisions.
- `ACCEPTANCE.md`: observable proof that frozen requirements are met; owns pass/fail criteria and required evidence.
- `AGENT_PLAN.md`: who performs approved implementation work; owns dependencies, file ownership, validation, and agent task contracts.
- `LOOP.md`: current recoverable execution state and append-only loop history; owns attempts, evidence, judgments, rework, risks, and next action.

Read [references/document-templates.md](references/document-templates.md) when creating or updating these five documents. Read [references/agent-and-judge-contracts.md](references/agent-and-judge-contracts.md) before assigning implementation tasks, integrating agent work, judging acceptance, or issuing rework.

## 1. Inspect the Current System

Before asking the user questions:

1. Read applicable `AGENTS.md`, project instructions, existing specifications, and repository conventions.
2. Inspect the relevant architecture, modules, interfaces, database, tests, deployment method, and code conventions.
3. Identify established domain terms and documentation locations.
4. Resolve facts from code, files, tools, and documentation. Record findings and sources in the draft rather than asking the user to rediscover them.
5. Separate product choices from technical choices and note decision dependencies.

If frozen, approved PRD, Tech Design, and Acceptance documents already exist, verify their status, consistency, and applicability. Resume from planning or the current `LOOP.md` instead of repeating resolved grilling. If approval is absent or the request changes frozen behavior, return to the appropriate specification stage.

## 2. Draft `PRD.md`

Create the best initial PRD from the request and inspected system. Include:

- problem and context;
- users and stakeholders;
- product goals and measurable success metrics;
- user flows;
- functional requirements with stable IDs (`FR-001`, `FR-002`, ...);
- business rules and data lifecycle;
- in scope, out of scope, and non-goals;
- assumptions;
- open product decisions;
- decision log.

Do not turn unknowns into requirements. Label each unresolved item `TBD`, `ASSUMPTION`, or `BLOCKED`, and show which FRs it affects.

## 3. Grill Product Decisions

Represent unresolved decisions as a dependency tree. The current **frontier** contains only high-impact questions whose upstream decisions are resolved.

For each round:

1. Select one to three independent frontier questions that the user can answer now.
2. For every question, state why it matters, concrete options, the impact of each option, a recommended option, and the reason for that recommendation.
3. Prefer a reversible explicit assumption for a low-risk issue that does not affect acceptance behavior.
4. After the answer, immediately update `PRD.md` and its decision log, then recompute the frontier.
5. Continue until no important unresolved branch remains. Do not dump a backlog of dependent questions or repeat resolved questions.

Never auto-assume core product behavior, data ownership, permission or security behavior, migrations, external compatibility, payments or money movement, destructive actions, explicit performance targets, or behavior that changes final acceptance. Keep these as blockers.

When the product frontier is clear, summarize confirmed decisions, accepted assumptions, non-goals, deferred items, and remaining risks. Ask the user to confirm that the PRD reflects the shared product understanding before treating it as frozen.

## 4. Draft and Grill `TECH_DESIGN.md`

After product behavior is understood, document:

- current system state and overall approach;
- module boundaries and responsibilities;
- interface contracts;
- data models and migrations;
- state transitions;
- concurrency, consistency, and idempotency;
- authentication, authorization, privacy, and security;
- failures, retries, recovery, and degradation;
- performance and capacity;
- logs, metrics, and alerts;
- compatibility;
- release and rollback;
- test boundaries;
- alternatives and technical decision log;
- technical issues blocked by product decisions.

Mark a design item `BLOCKED` when it depends on an unresolved product decision. Grill consequential technical choices with the same decision-tree/frontier method: one to three answerable questions per round, options and impacts, a recommendation with rationale, immediate document updates, and no hidden high-risk assumptions. Resolve ordinary implementation facts by inspecting the system.

## 5. Freeze `ACCEPTANCE.md` and Request Approval

After the PRD and Tech Design share a stable understanding, write the acceptance contract. Give each criterion a stable ID (`AC-001`, `AC-002`, ...), link it to one or more FRs, and specify:

- scenario and preconditions;
- action or event;
- observable expected result;
- required evidence;
- whether it is release-blocking.

Cover applicable happy paths, boundary and invalid inputs, permissions, failure and recovery, repeated requests and idempotency, concurrency, compatibility, performance and capacity, migration, rollback, regression, and existing quality gates. Distinguish In Scope, Out of Scope, Non-goals, Deferred, Assumptions, Release Blockers, and Definition of Done.

Do not accept subjective criteria such as "good experience", "good performance", "high code quality", or "mostly works". Every blocking AC needs observable evidence such as automated tests, API responses, database state, logs, metrics, screenshots, performance results, or a precise manual check.

Show the user a concise specification summary and ask: **The specification, scope, and acceptance conditions are defined. Do you approve implementation?** Record the answer. Do not write production code without explicit approval.

## 6. Create `AGENT_PLAN.md`

Only after implementation approval, split work into independently verifiable vertical slices rather than mechanically separating frontend, backend, and tests. For each task include:

- Task ID and objective;
- linked FR and AC IDs;
- inputs and dependencies;
- exact allowed files or directories;
- exact forbidden files or directories;
- required code, tests, or documentation;
- required checks and evidence;
- stop-and-report conditions.

Before parallel delegation, freeze shared interfaces, schemas, and public types. Confirm that writes do not overlap. Serialize any tasks with overlapping ownership or unresolved dependencies. Use multiple agents only when at least two tasks are truly independent and delegation is available and authorized; do not create agents merely to display parallelism.

The main agent maintains the specification, approves ownership changes, handles dependencies and conflicts, integrates results, runs system-level verification, and judges final acceptance. Subagents may not expand scope, change acceptance criteria, unilaterally change shared contracts, cross ownership boundaries, lower test requirements, or declare the whole project complete.

## 7. Create and Maintain `LOOP.md`

Create `LOOP.md` before production implementation. Its top section must expose enough state for a new session to resume after reading only the top status and current loop. Use exactly one current state:

`drafting`, `grilling`, `awaiting-spec-approval`, `ready`, `implementing`, `judging`, `changes-requested`, `blocked`, or `accepted`.

Each loop records its Loop ID, objective, FR/AC IDs, assignments, dependencies, outputs, changed files, commands/checks, results, evidence, main-agent judgment, failure conditions, rework requirements, unresolved risks, next state, and next action. Update the top state when reality changes. Never delete or overwrite a failed loop; append the next attempt.

## 8. Execute Approved Work

Give each subagent only the context required by its task contract. Require the completion-report format from [references/agent-and-judge-contracts.md](references/agent-and-judge-contracts.md). Treat contract deviations, new blockers, interface changes, and ownership conflicts as stop-and-report events.

Integrate in dependency order. Inspect actual changes instead of relying on summaries. Keep `LOOP.md` current with files, checks, results, evidence, risks, and status.

## 9. Judge Independently

The main agent must:

1. Compare the actual diff and behavior with the frozen specification.
2. Check ownership compliance and scope expansion.
3. Check cross-module contracts and data structures.
4. Run the highest feasible end-to-end validation plus necessary unit, integration, and regression tests.
5. Exercise applicable failure, permission, idempotency, concurrency, migration, rollback, and recovery behavior.
6. Produce evidence for every blocking AC.
7. Record an acceptance matrix: `Acceptance ID | Result | Evidence | Defect/Caveat`.

Allowed conclusions are `ACCEPTED`, `CHANGES_REQUESTED`, `BLOCKED`, and `ACCEPTED_WITH_CAVEATS`. Missing evidence for a blocking AC is a failure. Existing code, passing unit tests, a subagent's claim, or majority agreement is never sufficient by itself; only the frozen acceptance contract determines the result.

For `CHANGES_REQUESTED`, append a new loop for only the failed ACs, include reproduction evidence, constrain the minimum repair scope, and require regression coverage. Never weaken acceptance to manufacture a pass. After the same AC fails judgment in three consecutive loops, stop automatic rework and ask the user to choose redesign, scope change, accepted limitation, or termination of that part.

## 10. Deliver

Lead with the result, then report completed scope, incomplete or deferred scope, the acceptance matrix, test and validation evidence, key design decisions, remaining risks, accepted assumptions, and suggested next steps. Ensure the final `LOOP.md` state matches the real outcome.
