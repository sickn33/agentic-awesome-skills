---
name: dos-verify-done-claims
description: "Before accepting an agent's 'done / shipped / fixed' claim, verify it against ground truth (git ancestry + the commit's own diff) using the DOS kernel's `dos verify` and `dos commit-audit` — never the agent's own narration."
category: quality
risk: safe
source: community
source_repo: anthony-chaudhary/dos-kernel
source_type: community
date_added: "2026-06-12"
author: anthony-chaudhary
tags: [verification, git, ai-agents, trust, quality-gate]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/anthony-chaudhary/dos-kernel/blob/master/LICENSE"
---

# Verify done-claims against ground truth, not the agent's word

## Overview

When an AI agent says "done", "shipped", or "fixed", that is a **claim**, not a
fact — and a claim the agent checks by re-reading its own work is *consistency,
not grounding*. This skill replaces that self-report with a verdict from a
witness the agent did not author: it shells the **DOS kernel** (`dos verify`,
`dos commit-audit`) to confirm the claimed effect from git ancestry and the
commit's actual diff. DOS is deterministic — no API key, no LLM, no network.

This skill adapts the DOS reference "witness-claim" pattern
(`anthony-chaudhary/dos-kernel`) into a host-agnostic screenplay.

## When to Use This Skill

- Use when an agent reports a task/phase/feature as **complete** and you want
  that "done" confirmed from evidence before building on it.
- Use right after a commit, to confirm the commit's **message matches its diff**
  (catch a `fix:` that only touched a README, or a "tests pass" that deleted the
  assertions).
- Use when folding many sub-agents' results — verify each claimed effect instead
  of trusting the return string.
- **Do not** use it to judge whether code is *correct* — that is what the test
  suite is for. This skill checks did-the-claimed-thing-actually-ship.

## How It Works

### Step 1: Install the kernel (once)

```bash
pip install dos-kernel        # provides the `dos` CLI; deterministic, no key
```

### Step 2: Audit the latest commit's claim vs its diff

A commit subject is forgeable (whoever wrote the message authored it); the files
it touched are not (git did). `dos commit-audit` grades the subject against the
actual diff:

```bash
dos commit-audit --workspace . HEAD --json
```

Read the `verdict` field — the `--json` flag emits it. (Without `--json` the
same verdict prints as a one-line text row: `· OK …`, `⚑ UNWITNESSED …`, or
`· abstain …`; the JSON form is the one to parse.) The verdicts are: `OK` (the
diff backs the claim's *kind*), `CLAIM_UNWITNESSED` (the subject's claim is not
evidenced by the diff — treat the "done" as unproven), or `ABSTAIN`. This judges
the *kind* of change, never correctness — run the tests for that.

### Step 3: Verify a named phase actually shipped

If the agent claims a specific plan/phase landed, confirm it from git history
rather than the transcript:

```bash
dos verify --workspace . PLAN PHASE --json --no-ci
```

`--no-ci` keeps the verdict git-only (see the Security note below). With `--json`
you get the `shipped` and `source` fields. (The default text form prints
`SHIPPED PLAN PHASE (via grep)` or `NOT_SHIPPED PLAN PHASE (via none)` — the same
verdict, and the process exit code is non-zero when not shipped.)

`shipped: true` is real evidence when `source` is `registry` or any value
**starting with `grep`** — git fallback grades itself by forgeability, so you may
see bare `grep`, `grep-artifact` (a non-forgeable artefact/diff rung), or
`grep-subject` (a commit subject carried the phase token — shipped, but forgeable,
so weaker). `source: none` means there is no positive evidence — accept that as
"not shipped", not as a failure of the tool.

### Step 4: Fold only confirmed effects

Accept the agent's "done" **only** when Step 2/3 corroborate it. If
`CLAIM_UNWITNESSED` or `shipped: false`, the work is not done regardless of how
confidently the agent narrated it — send it back.

## Examples

### Example 1: gate an agent's "I fixed the bug" claim

```bash
# The agent committed and said it's fixed. Check the diff backs the claim:
dos commit-audit --workspace . HEAD --json
# verdict OK                -> the change is of the claimed kind; now run the tests
# verdict CLAIM_UNWITNESSED -> the commit doesn't do what it says; reject
```

### Example 2: confirm a feature phase shipped before closing a ticket

```bash
dos verify --workspace . AUTH AUTH2 --json --no-ci
# shipped: true, source: grep-artifact -> a real ship commit exists; safe to close
#   (source: registry, grep, or any grep-* value all count as real evidence)
# shipped: false, source: none -> no evidence; keep the ticket open
```

## Best Practices

- ✅ Run `dos commit-audit HEAD` immediately after every agent commit.
- ✅ Treat `source: none` / `CLAIM_UNWITNESSED` as "not done", not as a tool error.
- ✅ Keep the test suite as the separate correctness gate — this skill checks shipping, not correctness.
- ❌ Don't accept a "done" because the agent's prose was confident.
- ❌ Don't use this to replace code review or testing.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- It checks whether a claimed change *shipped* / matches its diff — not whether the code is *correct*.
- `dos verify` reads git history; in a repo with no commits there is nothing to witness (it will honestly report `source: none`).
- Stop and ask for clarification if required inputs (a git repo, the `dos` CLI) are missing.

## Security & Safety Notes

- This skill runs shell commands: `pip install dos-kernel` and the read-only
  `dos` verbs (`dos commit-audit`, `dos verify`). These verbs never **mutate**
  the repo or push. `dos commit-audit` only reads git history and the working
  tree (no network). `dos verify` is also git-only **unless** the workspace has
  wired a CI oracle (`[verify] non_git_oracle` in its `dos.toml`), in which case
  it may shell a network check (e.g. `gh api`) for the verdict — pass `--no-ci`
  (as the examples above do) to force the git-only path and guarantee no network.
- `pip install dos-kernel` installs from PyPI. The distribution name is
  `dos-kernel` (the bare `dos` on PyPI is an unrelated package — do not install
  it). Pin a version in locked environments.
- Run in the repository you intend to adjudicate; the `--workspace .` argument
  scopes every verdict to that repo.

## Common Pitfalls

- **Problem:** `dos verify` returns `source: none` and it looks like a failure.
  **Solution:** That is the honest "no evidence" verdict — it means the phase has
  no ship commit, so the claim is unproven. Re-stamp the real commit or keep the
  task open.
- **Problem:** Installing the wrong package.
  **Solution:** The PyPI name is `dos-kernel`, not `dos`.

## Related Skills

- The upstream DOS reference screenplays (`dos-witness-claim`, `dos-goal-gate`)
  in `anthony-chaudhary/dos-kernel` cover the multi-agent fan-out and
  self-stopping-agent variants of this same witness discipline.
