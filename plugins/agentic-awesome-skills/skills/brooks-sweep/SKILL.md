---
name: brooks-sweep
description: "Full-sweep mode: runs a unified analysis across all quality dimensions — code decay, architecture, tech debt, and test quality — then applies fixes directly to the codebase. Safe changes are auto-applied; risky changes are confirmed before execution. Drawing on twelve classic..."
risk: unknown
source: https://github.com/hyhmrright/brooks-lint/tree/main/skills/brooks-sweep
source_repo: hyhmrright/brooks-lint
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE
---

# Brooks-Lint — Full Sweep & Auto-Fix
## When to Use

Use this skill when you need full-sweep mode: runs a unified analysis across all quality dimensions — code decay, architecture, tech debt, and test quality — then applies fixes directly to the codebase. Safe changes are auto-applied; risky changes are confirmed before execution. Drawing on twelve classic...


## Setup

1. Read `../_shared/common.md` for the Iron Law, Project Config, Report Template, and Health Score rules
2. Read `../_shared/source-coverage.md` for book-level coverage, exceptions, and tradeoffs
3. Read `../_shared/decay-risks.md` for production risk symptom definitions
4. Read `../_shared/test-decay-risks.md` for test risk symptom definitions
5. Read `sweep-guide.md` in this directory for the unified scan and fix process

## Process

**If the user has not specified a project or directory:** apply Auto Scope Detection
from `../_shared/common.md` to determine the review scope before proceeding.

1. Show pre-flight consent notice and wait for the user's one-time approval (Step 0 of the guide)
2. Enumerate scope and initialize the `unresolvable` / `non_critical_rounds` / `fix_log` state (Step 1 of the guide)
3. Run the four dimensions in sequence — review, test, debt, audit — each scanning, classifying, applying Safe + Extended-Safe fixes, and verifying via the project test command (Steps 2–5 of the guide)
4. Iterate: re-scan modified files + same-module + static consumers; converge on a clean round, retire 3-retry failures to the `unresolvable` set, cap non-critical rounds at 3 (Step 6 of the guide)
5. Aggregate residual and unresolvable items and output the Full Sweep Report (Steps 7–8 of the guide)

**Mode line in report:** `Full Sweep`

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
