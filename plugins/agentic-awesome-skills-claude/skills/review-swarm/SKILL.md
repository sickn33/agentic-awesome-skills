---
name: review-swarm
description: Parallel read-only multi-agent review of a current git diff or explicit file scope to find behavioral regressions, security or privacy risks, performance or reliability issues, and contract or test coverage gaps. Use when the user asks for a review swarm, parallel review, diff review,...
risk: unknown
source: https://github.com/Dimillian/Skills/tree/main/review-swarm
source_repo: Dimillian/Skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Dimillian/Skills/blob/main/LICENSE
---

# Review Swarm
## When to Use

Use this skill when you need parallel read-only multi-agent review of a current git diff or explicit file scope to find behavioral regressions, security or privacy risks, performance or reliability issues, and contract or test coverage gaps. Use when the user asks for a review swarm, parallel review, diff review,...


Review a diff with four read-only sub-agents in parallel, then have the main agent filter, order, and summarize only the issues that matter. This skill is review-only: sub-agents do not edit files, and the main agent does not apply fixes as part of this workflow.

## Step 1: Determine Scope and Intent

Prefer this scope order:

1. Files or paths explicitly named by the user
2. Current git changes
3. An explicit branch, commit, or PR diff requested by the user
4. Most recently modified tracked files, only if the user asked for a review and there is no clearer diff

If there is no clear review scope, stop and say so briefly.

When using git changes, choose the smallest correct diff command:

- unstaged work: `git diff`
- staged work: `git diff --cached`
- mixed staged and unstaged work: review both
- explicit branch or commit comparison: use exactly what the user requested

Before launching reviewers, read the closest local instructions and any relevant project docs for the touched area, such as:

- `AGENTS.md`
- repo workflow docs
- architecture or contract docs for the touched module

Build a short intent packet for the reviewers:

1. What behavior is meant to change
2. What behavior should remain unchanged
3. Any stated or inferred constraints, such as compatibility, rollout, security, or migration expectations

If the user did not state the intent clearly, infer it from the diff and say that the inference may be incomplete.

## Step 2: Launch Four Read-Only Reviewers in Parallel

Launch four sub-agents when the scope is large enough for parallel review to help. For a tiny diff or one very small file, it is acceptable to review locally instead.

For every sub-agent:

- give the same scope and the same intent packet
- state that the sub-agent is read-only
- do not let the sub-agent edit files, run `apply_patch`, stage changes, commit, or perform any other state-mutating action
- ask for concise findings only
- ask for: file and line or symbol, issue, why it matters, recommended follow-up, and confidence
- tell the sub-agent to avoid nits, style preferences, and speculative concerns without concrete impact
- tell the sub-agent to send findings back to the main agent only

Use these four review roles.

### Sub-Agent 1: Intent and Regression Review

Review whether the diff matches the intended behavior change without introducing extra behavior drift.

Check for:

1. Unintended behavior changes outside the stated scope
2. Broken edge cases or fallback paths
3. Contract drift between callers and callees
4. Missing updates to adjacent flows that should change together

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

### Sub-Agent 2: Security and Privacy Review

Review the diff for security regressions, privacy risks, and trust-boundary mistakes.

Check for:

1. Missing or weakened authn or authz checks
2. Unsafe input handling, injection risks, or validation gaps
3. Secret, token, or sensitive data exposure
4. Risky defaults, permission expansion, or trust of unverified data

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

### Sub-Agent 3: Performance and Reliability Review

Review the diff for new cost, fragility, or operational risk.

Check for:

1. Duplicate work, redundant I/O, or unnecessary recomputation
2. Added work on startup, render, request, or other hot paths
3. Leaks, missing cleanup, retry storms, or subscription drift
4. Ordering, race, or failure-handling problems that make the change brittle

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

### Sub-Agent 4: Contracts and Coverage Review

Review the diff for compatibility gaps and missing safety nets.

Check for:

1. API, schema, type, config, or feature-flag mismatches
2. Migration or backward-compatibility fallout
3. Missing or weak tests for the changed behavior
4. Missing logs, metrics, assertions, or error paths that make regressions harder to detect

This sub-agent is read-only. It must not edit files, apply patches, or make any other workspace changes.

Recommended sub-agent role: `reviewer`

Report only issues that materially affect correctness, security, privacy, reliability, compatibility, or confidence in the change. It is better to miss a nit than to bury the user in low-value noise.

## Step 3: Aggregate and Filter Findings

The main agent owns synthesis. Treat sub-agent output as raw review input, not final output.

Merge findings across all four reviewers and filter aggressively:

- drop duplicates
- drop weak or speculative claims
- drop issues that conflict with the stated intent
- drop minor style or readability comments unless they hide a real bug or maintenance risk

Normalize surviving findings into this shape:

1. File and line or nearest symbol
2. Category: regression, security, reliability, or contracts
3. Severity: high, medium, or low
4. Why it matters
5. Recommended fix or follow-up
6. Confidence: high, medium, or low

If a reviewer may be correct but the intent is unclear, turn it into an open question instead of a finding.

## Step 4: Order the Output

Present findings in this order:

1. High-severity, high-confidence issues
2. Medium-severity issues that are likely worth fixing before merge
3. Lower-severity issues or follow-ups that can wait

Keep the review concise. Findings should be actionable and evidence-backed.

If there are no material issues, say that directly instead of manufacturing feedback.

## Step 5: Recommend a Clear Path Forward

After the findings, give the user a short path forward:

- what to fix before merge
- what to improve if time permits
- what can safely be left alone

When helpful, group the path forward into:

- `fix now`
- `fix soon`
- `optional follow-up`

Do not implement fixes as part of this skill. The output is a read-only review plus a prioritized recommendation.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
