---
name: closed-loop-delivery
description: Use when a coding task must be completed against explicit acceptance criteria with minimal user re-intervention across implementation, review feedback, deployment, and runtime verification.
risk: safe
source: community
date_added: "2026-03-12"
---

# Closed-Loop Delivery

## Overview

Treat each task as incomplete until acceptance criteria are verified in evidence, not until code is merely changed.

Core rule: **deliver against DoD (Definition of Done), not against code diff size.**

## When to Use
Use this skill when:
- user gives a coding/fix task and expects end-to-end completion
- task spans code + tests + PR comments + dev deploy + runtime checks
- repeated manual prompts like "now test", "now deploy", "now re-check PR" should be avoided

Do not use this skill for:
- pure Q&A/explanations
- prod deploy requests without explicit human approval
- tasks blocked by missing secrets/account access that cannot be inferred

## Required Inputs

Before execution, define these once:
- task goal
- acceptance criteria (DoD)
- target environment (`dev` by default)
- max iteration rounds (default `2`)

If acceptance criteria are missing, request them once. If user does not provide, propose a concrete default and proceed.

## Issue Gate Dependency

Before execution, prefer using `create-issue-gate`.

- If issue status is `ready` and execution gate is `allowed`, continue.
- If issue status is `draft`, do not execute implementation/deploy/review loops.
- Require user-provided, testable acceptance criteria before starting execution.

## Default Workflow

1. **Define DoD**
   - Convert request into testable criteria.
   - Example: checkout task DoD = "checkout endpoint returns a valid, openable third-party payment URL in dev".

2. **Implement minimal change**
   - Keep scope tight to task goal.

3. **Verify locally**
   - Run focused tests first, then broader checks if needed.

4. **Review loop**
   - Fetch PR comments/reviews.
   - Classify valid vs non-actionable.
   - Fix valid items, re-run verification.

5. **Dev deploy + runtime verification**
   - Deploy to `dev` when runtime behavior matters.
   - Verify via real API/Lambda/log evidence against DoD.

6. **Completion decision**
   - Only report "done" when all DoD checks pass.
   - Otherwise continue loop until pass or stop condition.

## PR Comment Polling Policy

Avoid noisy short polling by default. Use batched windows:

- **Round 1:** wait `3m`, collect delta comments/reviews
- **Round 2:** wait `6m`, collect delta again
- **Final round:** wait `10m`, collect all remaining visible comments/reviews

At each round:
- process all new comments in one batch
- avoid immediate re-poll after each single comment
- after the `10m` round, stop waiting and proceed with all comments visible at that point

If CI is still running, align polling to check completion boundaries instead of fixed rapid polling.

## Human Gate Rules (Must Ask)

Require explicit user confirmation for:
- production/staging deploy beyond agreed scope
- destructive operations (history rewrite, force push, data-destructive ops)
- actions with billing/security posture changes
- secret values not available in repo/runtime
- ambiguous DoD that materially changes outcome

## Iteration/Stop Conditions

Stop and escalate with a concise blocker report when:
- DoD still fails after max rounds (`2` default)
- external dependency blocks progress (provider outage, missing creds, account permission)
- conflicting review instructions cannot both be satisfied

Escalation report must include:
- what passed
- what failed
- evidence (commands/logs/API result)
- smallest decision needed from user

## Output Contract

When claiming completion, always include:
- acceptance criteria checklist with pass/fail
- commands/tests run
- runtime evidence (endpoint/Lambda/log key lines)
- PR status (new actionable comments count)

Do not claim success without evidence.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
