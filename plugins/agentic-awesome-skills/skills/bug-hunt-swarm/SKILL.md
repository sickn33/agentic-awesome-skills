---
name: bug-hunt-swarm
description: Parallel read-only multi-agent root-cause investigation for bugs, regressions, crashes, flaky behavior, or unexplained failures. Use when the user asks to investigate a bug, find the root cause, trace a regression, understand why something broke, or wants a ranked diagnosis with the...
risk: unknown
source: https://github.com/Dimillian/Skills/tree/main/bug-hunt-swarm
source_repo: Dimillian/Skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Dimillian/Skills/blob/main/LICENSE
---

# Bug Hunt Swarm
## When to Use

Use this skill when you need parallel read-only multi-agent root-cause investigation for bugs, regressions, crashes, flaky behavior, or unexplained failures. Use when the user asks to investigate a bug, find the root cause, trace a regression, understand why something broke, or wants a ranked diagnosis with the...


Investigate a bug with four read-only sub-agents in parallel, then have the main agent rank the likely causes and recommend the fastest path to prove or fix the issue. This skill is diagnosis-first: do not edit files or implement fixes as part of this workflow.

## Step 1: Build the Bug Packet

Start by collecting the smallest useful investigation packet:

1. Symptom
2. Expected behavior
3. Actual behavior
4. Reproduction steps, if known
5. Scope of impact
6. Relevant evidence, such as logs, stack traces, failing tests, screenshots, recent diffs, or environment details

Prefer this source order:

1. Direct user description
2. Explicit files, stack traces, logs, tests, or screenshots provided by the user
3. Current git changes or recent repo history when the bug appears regression-like
4. The smallest relevant code path or subsystem surrounding the failure

If the bug report is underspecified, infer a minimal problem statement and say what is still unknown.

Before launching sub-agents, read the closest project instructions and relevant docs for the touched area, such as:

- `AGENTS.md`
- repo workflow docs
- architecture, state, routing, schema, or runtime docs for the affected subsystem

## Step 2: Bound the Investigation

Write a short investigation brief for the swarm:

1. What appears broken
2. What is not yet proven
3. What part of the system is most likely involved
4. What evidence already exists
5. What kind of proof would count as confirmation

Use read-only evidence gathering where useful:

- `rg`, `git diff`, `git log`, `git show`
- reading logs, crash traces, and config
- existing test runs or the smallest safe reproduction command

Do not edit files, inject new instrumentation, or implement fixes as part of this skill.

## Step 3: Launch Four Read-Only Investigators in Parallel

Launch four sub-agents when the problem is large or ambiguous enough that parallel investigation helps. For a tiny and obvious issue, it is acceptable to investigate locally instead.

For every sub-agent:

- give the same bug packet and investigation brief
- state that the sub-agent is read-only
- do not let the sub-agent edit files, run `apply_patch`, stage changes, commit, or perform any other state-mutating action
- ask for concise investigation output only
- ask for: hypothesis, supporting evidence, missing evidence, smallest proof step, and confidence
- tell the sub-agent to avoid generic code quality feedback, nits, or speculative guesses without evidence
- tell the sub-agent to send findings back to the main agent only

Use these four investigation roles.

### Sub-Agent 1: Reproduction and Scope Investigation

Clarify the exact failure shape and its boundaries.

Check for:

1. The narrowest reliable trigger
2. Conditions that make the bug appear or disappear
3. Expected versus actual behavior at the failure boundary
4. Whether the impact is local, cross-cutting, deterministic, or flaky

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

### Sub-Agent 2: Code Path and Failure Seam Investigation

Trace the most likely execution path and identify the seam where behavior diverges.

Check for:

1. State transitions, lifecycle edges, or ordering problems
2. Mismatched assumptions between caller and callee
3. Data-flow or control-flow breaks
4. The smallest code region most likely responsible for the failure

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `explorer` for broad tracing, or `reviewer` when a stronger local reasoning pass is more useful

### Sub-Agent 3: Recent Change and Regression Investigation

Look for likely regressors in nearby history or changed contracts.

Check for:

1. Recent diffs that correlate with the symptom
2. Config, flag, dependency, schema, or migration drift
3. Partial updates where several entry points should have changed together
4. Behavior changes that fit the timing of the bug report

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

### Sub-Agent 4: Proof Plan and Observability Investigation

Determine the fastest way to confirm or reject the leading hypotheses.

Check for:

1. The smallest existing test or reproduction that should fail
2. The most useful current logs, traces, metrics, or assertions
3. A minimal non-mutating command that could raise confidence quickly
4. What evidence is missing and how to collect it without broad churn

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

Report only hypotheses that materially improve the odds of finding the real cause. It is better to return two evidence-backed theories than six vague guesses.

## Step 4: Synthesize Ranked Hypotheses

The main agent owns synthesis. Treat sub-agent output as raw investigation input, not final output.

Merge and rank the hypotheses:

- combine duplicates
- discard weak speculation
- prefer evidence over elegance
- separate likely root causes from mere contributing factors
- keep alternate theories only when they remain plausible

Normalize the surviving hypotheses into this shape:

1. Hypothesis
2. Supporting evidence
3. Missing or conflicting evidence
4. Smallest proof step
5. Confidence: high, medium, or low

If the evidence is too weak for a real ranking, say so directly and present the leading open questions instead.

## Step 5: Output a Clear Diagnosis Path

Present the result in this order:

1. Most likely root cause
2. Plausible alternate causes, if any
3. Fastest proof step
4. Recommended fix path
5. Open questions or blockers

When the fix is not yet clear, recommend the next proving step instead of pretending the diagnosis is complete.

When helpful, group actions into:

- `prove now`
- `fix next`
- `follow up later`

Do not implement fixes as part of this skill. The output is a read-only diagnosis with a prioritized path forward.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
