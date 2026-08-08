---
name: wgm
description: "Turns a rough request into working software via a governed build loop: align first, plan, then iterate one task at a time with deterministic backpressure and holdout-scenario judging."
category: meta
risk: safe
source: community
source_repo: agent-frontier/wgm
source_type: official
date_added: "2026-07-05"
author: agent-frontier
tags: [build-loop, spec-driven, ralph-loop, self-improving, agentic-development, methodology]
tools: [claude, cursor, gemini, copilot, codex]
license: "MIT"
license_source: "https://github.com/agent-frontier/wgm/blob/main/LICENSE"
---

# wgm

## Overview

wgm ("well, gosh... make") is a portable build **methodology**, not a domain skill — a single
`SKILL.md` protocol that any agentskills.io-compatible host loads to turn a rough request into
working software. It marries three ideas: a relentless alignment interview before any code is
written, a Ralph-style loop (one task per iteration, a persistent plan as shared state, steered by
deterministic backpressure), and holdout-scenario LLM judging (scenarios the build never sees, so a
high satisfaction score can't be gamed). It also runs its own internal docs-audit and
self-improvement loop, cross-pollinating durable lessons from sibling agent-coding projects back
into its own protocol.

## When to Use This Skill

- Use when building or implementing a feature, app, or prototype from rough or ambiguous intent.
- Use when a task benefits from a governed plan plus iterative, test-validated execution rather
  than one-shot generation.
- Use when you want a build to converge against acceptance criteria an LLM judge scores blind
  (0-100), instead of trusting a single self-reported "looks good."
- Not for trivial one-file edits, pure debugging, research-only questions, or tasks that already
  have complete, unambiguous step-by-step instructions — wgm explicitly stays out of the way there.

## How It Works

### Step 1: Triage
Classify the work onto a scale-adaptive track (Quick / Standard / Full) so ceremony matches risk —
a one-file fix skips holdout scenarios and the docs-audit swarm; a greenfield app gets the full rig.
The deterministic backpressure gate itself is never skipped, only the ceremony around it.

### Step 2: Grill (align)
Interview the user one question at a time, always with a recommended answer, until the goal,
success criteria, and constraints are known — capping interrogation after ~5 questions to avoid
theater. Explore the codebase to self-answer before asking anything a human doesn't need to weigh
in on.

### Step 3: Plan
Produce a project constitution, one spec per coherent slice (each with a magic moment and a demo
path), holdout acceptance scenarios the build must never read, and `IMPLEMENTATION_PLAN.md` — the
persistent shared state across every later iteration. Cross-check every artifact against every other
one before moving on.

### Step 4: Preflight
Score the plan's readiness 0-100 across goal clarity, observable success criteria, scenario
coverage, and backpressure mapping. Below the threshold, return to Grill/Plan and fix the weakest
dimension — do not start building on a shaky plan.

### Step 5: Loop (build)
Run `Analyze -> Implement -> Validate -> Review -> Record`, one task per iteration: pick the single
most important pending task, make the smallest change that completes it, run its deterministic
validation command (green or it isn't done), judge holdout-scenario satisfaction, review the diff
for scope creep, then record status and any durable lesson before advancing exactly one task.

### Step 6: Ship / Handoff
Summarize what shipped and how to validate it, run a mandatory four-persona docs-audit pass
(junior/senior/principal/PM perspectives, consolidated into one paper-trail report), and harvest any
durable, cross-project lesson back into the shared skill's own ledger.

## Examples

### Example 1: Full lifecycle from a rough request

```
User: "Build a CLI todo app with add/list/complete commands, from scratch."
```

wgm states its Track (Standard), grills for the ~3-5 unknowns that actually matter, writes specs +
`IMPLEMENTATION_PLAN.md`, scores Preflight readiness, then loops one task at a time — each task's
own test/lint/build command must exit 0 before it's marked done — and finally ships with a
docs-audit pass.

### Example 2: Scoped planning only

```
User: "/wgm plan: add OAuth login to this existing Express API"
```

wgm writes the specs and plan, then hard-stops at the Plan-exit gate without starting the build loop
— useful when a human wants to review the plan before any code is touched.

## Best Practices

- Do let the plan be the shared state — a fresh agent should be able to resume a build from
  `IMPLEMENTATION_PLAN.md` alone.
- Do keep holdout scenarios genuinely hidden from the generating agent; that's what prevents a
  judged score from being gamed.
- Do map every acceptance criterion to a runnable, deterministic check before calling anything done.
- Don't skip the alignment interview on ambiguous, multi-week, or security/UX-critical work just to
  move faster — misalignment discovered after building is far more expensive.
- Don't treat a high satisfaction score as sufficient on its own — a failing deterministic check
  always overrides it.

## Limitations

- wgm is a protocol, not a runtime: it has no daemon, scheduler, or bundled dashboard — it expects
  an existing agentskills.io-compatible host to load and execute it.
- This skill does not replace environment-specific validation, testing, or expert review.
- Full holdout-scenario judging and the docs-audit swarm add ceremony that a genuinely trivial task
  does not need — wgm's own Triage track exists specifically to right-size this, and the skill
  explicitly says not to use it for one-file edits or pure debugging.

## Common Pitfalls

- **Problem:** Treating wgm's "build" mode the same as a full-lifecycle request.
  **Solution:** `/wgm build` resumes an *existing* `IMPLEMENTATION_PLAN.md`; a bare request like
  "build the auth module" (more text after "build") is a full-lifecycle request, not `build` mode.
- **Problem:** Letting the agent peek at holdout scenarios while implementing.
  **Solution:** Scenarios are read only during Validate/Review, never during Implement — that's the
  entire point of a holdout set.

## Related Skills

- `@grill-me` - the narrower alignment-interview primitive wgm's Grill phase is adapted from.
- `@skill-creator` - useful for authoring/evaluating the skill itself; wgm ships its own eval
  fixture (`evals/evals.json`) using the same eval-driven-iteration discipline.

## Additional Resources

- [Repository](https://github.com/agent-frontier/wgm)
- [Full protocol (`SKILL.md`)](https://github.com/agent-frontier/wgm/blob/main/SKILL.md)
- [Reference library](https://github.com/agent-frontier/wgm/tree/main/references)
