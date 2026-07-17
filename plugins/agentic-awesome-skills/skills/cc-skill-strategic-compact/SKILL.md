---
name: cc-skill-strategic-compact
description: "Preserve useful context in long coding sessions by compacting only at logical phase boundaries after durable state is saved. Use around research, planning, implementation, testing, and debugging transitions."
risk: none
source: https://github.com/affaan-m/everything-claude-code
source_repo: affaan-m/everything-claude-code
source_type: community
date_added: "2026-02-27"
---

# Strategic Compact

Recommend context compaction at deliberate boundaries, not in the middle of tightly coupled work.

## When to Use

- A long task has completed a research, planning, implementation, testing, or debugging phase.
- The next phase can recover from durable files, commits, test output, or a written worklog.
- The conversation contains substantial dead-end exploration that is no longer needed.
- Context pressure is reducing coherence and the current state can be summarized safely.

Do not compact during an unfinished edit, unresolved failure, approval exchange, or any step whose important state exists only in conversation.

## Workflow

1. Confirm that the current phase has a clear terminal state.
2. Persist the information needed to resume: objective, decisions, changed files, commands and outcomes, blockers, and exact next action.
3. Verify the persisted state by reading it back and checking the working tree or task tracker.
4. Separate still-relevant context from completed exploration and dead ends.
5. Recommend compaction with a concise resume focus. Do not invoke a compaction command automatically.
6. After compaction, reload the durable state before making further changes.

## Decision Guide

- Research to planning: compact after findings and constraints are written down.
- Planning to implementation: compact after the accepted plan and verification gates are durable.
- Implementation to testing: compact only if tests can be run from the saved code state without conversational details.
- Debugging to unrelated work: compact after the cause, fix, and regression proof are recorded.
- Mid-implementation or mid-approval: do not compact.

## Limitations

- Compaction can discard nuance, intermediate reasoning, and user preferences not saved elsewhere.
- A large context is not by itself a reason to compact; recoverability is the deciding condition.
- Tool-specific compaction behavior may differ, so treat the recommendation as advisory.
