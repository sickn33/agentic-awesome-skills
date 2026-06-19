---
name: "orchestrate-batch-refactor"
description: "Plan and execute large refactors with dependency-aware work packets and parallel analysis."
risk: safe
source: "Dimillian/Skills (MIT)"
date_added: "2026-03-25"
---

# Orchestrate Batch Refactor

## Overview

Use this skill to run high-throughput refactors safely.
Analyze scope in parallel, synthesize a single plan, then execute independent work packets with sub-agents.

## When to Use
- When a refactor spans many files or subsystems and needs clear work partitioning.
- When you need dependency-aware planning before parallel implementation.

## Inputs

- Repo path and target scope (paths, modules, or feature area)
- Goal type: refactor, rewrite, or hybrid
- Constraints: behavior parity, API stability, deadlines, test requirements

## When to Use Parallelization

- Use this skill for medium/large scope touching many files or subsystems.
- Skip multi-agent execution for tiny edits or highly coupled single-file work.

## Core Workflow

1. Define scope and success criteria.
   - List target paths/modules and non-goals.
   - State behavior constraints (for example: preserve external behavior).
2. Run parallel analysis first.
   - Split target scope into analysis lanes.
   - Spawn `explorer` sub-agents in parallel to analyze each lane.
   - Ask each agent for: intent map, coupling risks, candidate work packets, required validations.
3. Build one dependency-aware plan.
   - Merge explorer output into a single work graph.
   - Create work packets with clear file ownership and validation commands.
   - Sequence packets by dependency level; run only independent packets in parallel.
4. Execute with worker agents.
   - Spawn one `worker` per independent packet.
   - Assign explicit ownership (files/responsibility).
   - Instruct every worker that they are not alone in the codebase and must ignore unrelated edits.
5. Integrate and verify.
   - Review packet outputs, resolve overlaps, and run validation gates.
   - Run targeted tests per packet, then broader suite for integrated scope.
6. Report and close.
   - Summarize packet outcomes, key refactors, conflicts resolved, and residual risks.

## Work Packet Rules

- One owner per file per execution wave.
- No parallel edits on overlapping file sets.
- Keep packet goals narrow and measurable.
- Include explicit done criteria and required checks.
- Prefer behavior-preserving refactors unless user explicitly requests behavior change.

## Planning Contract

Every packet must include:

1. Packet ID and objective.
2. Owned files.
3. Dependencies (none or packet IDs).
4. Risks and invariants to preserve.
5. Required checks.
6. Integration notes for main thread.

Use [`references/work-packet-template.md`](references/work-packet-template.md) for the exact shape.

## Agent Prompting Contract

- Use the prompt templates in [`references/agent-prompt-templates.md`](references/agent-prompt-templates.md).
- Explorer prompts focus on analysis and decomposition.
- Worker prompts focus on implementation and validation with strict ownership boundaries.

## Safety Guardrails

- Do not start worker execution before plan synthesis is complete.
- Do not parallelize across unresolved dependencies.
- Do not claim completion if any required packet check fails.
- Stop and re-plan when packet boundaries cause repeated merge conflicts.

## Validation Strategy

Run in this order:

1. Packet-level checks (fast and scoped).
2. Cross-packet integration checks.
3. Full project safety checks when scope is broad.

Prefer fast feedback loops, but never skip required behavior checks.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
