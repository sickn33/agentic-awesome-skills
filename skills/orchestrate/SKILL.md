---
name: orchestrate
description: "Coordinate focused subagents on substantial work, keep their ownership non-overlapping, and integrate verified results. Use for large-scope Codex tasks; keep trivial work with the coordinator."
category: agent-orchestration
risk: safe
source: https://github.com/provencher/codex-skills/tree/8aa6c42b73781c905c55f8a1253a18127079ac21/orchestrate
source_repo: provencher/codex-skills
source_type: community
date_added: "2026-07-26"
author: provencher
tags: [codex, orchestration, multi-agent, delegation, subagents]
tools: [codex]
license: MIT
license_source: https://github.com/provencher/codex-skills/blob/8aa6c42b73781c905c55f8a1253a18127079ac21/LICENSE
---

# Orchestrate

Coordinate substantial work across focused subagents while remaining available
to the user and retaining responsibility for the integrated result.

## When to Use

- Use when a task has multiple independent research, review, or implementation lanes.
- Use when parallel work will materially reduce elapsed time or improve coverage.
- Use when a coordinator must synthesize several bounded outputs into one verified result.

Keep trivial tasks with the coordinator.

## Workflow

1. Decompose the task into distinct, bounded assignments with explicit outputs.
2. Run narrow, read-only scouts in parallel with low reasoning effort and no
   inherited conversation when the runtime supports those controls. Give each
   scout all scoped context and evidence required to complete its assignment.
3. Use medium reasoning effort for routine implementation and high reasoning
   effort for difficult work.
4. Give each subagent distinct ownership. Prevent overlapping assignments, and
   instruct leaf workers not to delegate.
5. Integrate the outputs, resolve conflicts, and verify the combined result.
6. Keep approvals and externally consequential decisions with the user.

## Examples

- For a repository-wide feature, assign non-overlapping agents to architecture
  inspection, implementation, and test review, then integrate their findings
  and run the final verification from the coordinator.
- For a research brief, assign independent sources or questions to read-only
  scouts, reconcile disagreements, and keep the final judgment with the
  coordinator.

## Limitations

- Requires a runtime that exposes subagent or delegation tools; otherwise keep
  the work with the coordinator.
- Delegation does not authorize file mutations, public actions, purchases, or
  other consequential operations beyond the user's original scope.
- Parallel agents can add cost and coordination overhead, so use them only when
  the task is substantial enough to benefit.
- The coordinator remains responsible for checking claims, changes, tests, and
  the final answer.
