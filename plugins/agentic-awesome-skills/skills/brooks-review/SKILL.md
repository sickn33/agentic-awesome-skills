---
name: brooks-review
description: "PR code review that surfaces decay risks, design smells, and maintainability issues with concrete Symptom → Source → Consequence → Remedy findings, drawing on twelve classic engineering books."
risk: safe
source: https://github.com/hyhmrright/brooks-lint/tree/main/skills/brooks-review
source_repo: hyhmrright/brooks-lint
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE
---

# Brooks-Lint — PR Review
## When to Use

Use this skill when you need pR code review that surfaces decay risks, design smells, and maintainability issues with concrete Symptom → Source → Consequence → Remedy findings, drawing on twelve classic engineering books. Triggers when: user asks to review code, check a PR, shares a diff or pastes code asking...


## Setup

The referenced sibling `_shared` files are not bundled in this catalog tree. Do not invent their contents or scores. Use the local guide as a heuristic checklist and report only concrete, evidenced findings in this format: file/line → observed symptom → relevant principle (verify exact book quotes/chapters before attribution) → demonstrated consequence → smallest remedy. State scope and omitted areas; numeric thresholds alone are not defects. Do not execute untrusted repository tests merely because the guide calls it a test check; inspect the project’s test command and report execution separately.

For an upstream installation that actually includes the shared files:

1. Read `../_shared/common.md` for the Iron Law, Project Config, Report Template, and Health Score rules
2. Read `../_shared/source-coverage.md` for book-level coverage, exceptions, and tradeoffs
3. Read `../_shared/decay-risks.md` for symptom definitions and source attributions
4. Read `pr-review-guide.md` in this directory for the analysis process

## Process

**If the user has not specified files or pasted code:** apply Auto Scope Detection
from `../_shared/common.md` to determine the review scope before proceeding.

1. Understand the review scope, then scan for each decay risk in the order specified (Steps 1–6 of the guide)
2. Run the Quick Test Check (Step 7 of the guide) — skip for docs-only or non-production changes
3. Apply the Iron Law to every finding
4. Output using the Report Template from common.md

**Mode line in report:** `PR Review`

## Example

**User request:**

> Use @brooks-review for this task: PR code review that surfaces decay risks, design smells, and maintainability issues with concrete Symptom → Source → Consequence → Remedy findings, drawing on twelve classic engineering books.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
