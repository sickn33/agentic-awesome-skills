---
name: ai-code-reviewer
description: "Review AI-generated code for its characteristic failure modes: hallucinated APIs, plausible-but-wrong logic, silent behavior drift, invented requirements, security theater, and over-engineering."
category: development
risk: safe
source: community
source_repo: Hahaknight/claude-skills-pro
source_type: community
date_added: "2026-09-01"
author: Hahaknight
tags: [code-review, ai-generated-code, hallucination, behavior-drift, over-engineering, security, verification]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Hahaknight/claude-skills-pro/blob/main/LICENSE"
---

# AI Code Reviewer — Trust, but Verify Harder

## Overview

AI-generated code has a specific defect profile: it looks right, is idiomatic, passes lints — and is wrong in ways human code usually isn't. This skill reviews code produced by coding agents (Claude, Codex, Copilot, Cursor, Gemini) against the failure modes that are *characteristic* of machine-written code, rather than the style/readability criteria that human review defaults to and that AI code always passes.

Adapted from the free sample of the same name in [Hahaknight/claude-skills-pro](https://github.com/Hahaknight/claude-skills-pro) (MIT).

## When to Use This Skill

- Use when reviewing a diff, PR, or file that was written (fully or partly) by an AI coding agent
- Use when a change was produced fast and nobody has verified it against the original request
- Use when the user asks "can we ship this?" / "AI 写的代码能上线吗" about generated code
- Use when tests, comments, or docs were AI-generated alongside the code (they inherit the same failure modes)

## How It Works

### Step 1: Establish ground truth

Find the user's actual request (the prompt, the issue, the spec). The review target is *that*, nothing more. AI code is graded against the request, not against general quality.

### Step 2: Run it before reading it

Execute the code — tests, a real input, the actual command. Many hallucinations die instantly at runtime, which is far cheaper than discovering them by reading. Reading is for what execution can't catch.

### Step 3: Apply the defect taxonomy, file by file

Check every item; verify unfamiliar symbols against the installed package or official docs, never against memory:

1. **Hallucinated surface** — APIs, flags, env vars, config keys, package names that don't exist or belong to the wrong version. One hallucinated import means audit every import (`pip show`, `node_modules/<pkg>`, official docs).
2. **Plausible-but-wrong logic** — the flow reads naturally but inverts a condition, swaps two variables, uses `<` where `<=` matters, updates the wrong record. Trace data by hand through the 3 most important cases.
3. **Behavior drift** — refactors that "also improved" error messages, defaults, formats, ordering. Diff old vs new behavior explicitly; AI quietly changes contracts while making things "better".
4. **Invented requirements** — retry logic, config options, extra endpoints, defensive branches nobody asked for. Every behavior not in the request gets flagged or deleted.
5. **Security theater** — validation that looks thorough but misses the actual vector: validates type not range, sanitizes the input path but not the echo path, checks auth on GET but not POST.
6. **Copy-paste ghosts** — comments describing different code, variable names from another context, test names that don't match their assertions, dead branches "left just in case".
7. **Over-engineering** — abstraction layers, interfaces, and "future-proofing" for needs that don't exist. Demand deletion.
8. **Dependency sprawl** — new packages for what the stdlib or an existing dependency already does. Each new dependency needs a one-line justification.

### Step 4: Verdict per file

- `TRUSTED` — paths verified by execution or source check
- `FIX` — with a concrete patch, not a suggestion
- `DELETE` — unrequested behavior, speculative generality

Regenerate weak sections rather than negotiating with them — AI code is cheaper to rewrite than to review line-by-line forever.

### Step 5: Report

Summary must state: what was requested vs what was delivered; hallucinations found (each with the real source); behavior drifts; deletions performed; what is verified by execution vs still unverified.

## Examples

### Example 1: Hallucinated API

```python
# AI wrote — plausible, idiomatic, wrong:
from datetime import UTC  # Python 3.11+: this name does NOT exist until 3.13
datetime.now(tz=UTC)
# Real surface: datetime.timezone.utc (all 3.x). One wrong symbol → audit every import in the diff.
```

### Example 2: Invented requirement

```
Request: "add a 5s timeout to the checkout HTTP call"
AI also added: retry ×3 with backoff, a circuit breaker flag,
and a TIMEOUT_CONFIG env var nobody will ever set.
Verdict: keep the timeout; DELETE the rest — each line ships forever.
```

## Best Practices

- ✅ Verify every unfamiliar symbol against the installed package or official docs
- ✅ Trace the 3 most important data paths by hand, even when tests pass
- ✅ Diff old vs new behavior explicitly on any "improvement"
- ✅ State clearly what is verified by execution vs still unverified
- ❌ Don't grade AI code on style or readability — it always reads well; that's the trap
- ❌ Don't accept a passing test run as proof when the tests were also AI-written
- ❌ Don't list suggestions for weak sections — regenerate them

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if the original request cannot be determined, or if the code cannot be executed in the review environment.
- If verification is impossible (no runtime, no docs available), say so loudly: "UNVERIFIED — do not ship blind."

## Security & Safety Notes

- No shell commands, network fetches, credentials, or mutations are required by this skill.
- The verification steps reference read-only inspection commands (`pip show`, reading `node_modules/<pkg>`); run them only in the project's own environment.
