---
name: brooks-debt
description: 'Tech debt assessment that identifies, classifies, and prioritizes maintainability problems — helping teams build a refactoring roadmap — drawing on twelve classic engineering books. Triggers when: user asks about tech debt, refactoring priorities, what to clean up first, or asks "why...'
risk: unknown
source: https://github.com/hyhmrright/brooks-lint/tree/main/skills/brooks-debt
source_repo: hyhmrright/brooks-lint
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE
---

# Brooks-Lint — Tech Debt Assessment
## When to Use

Use this skill when you need tech debt assessment that identifies, classifies, and prioritizes maintainability problems — helping teams build a refactoring roadmap — drawing on twelve classic engineering books. Triggers when: user asks about tech debt, refactoring priorities, what to clean up first, or asks "why...


## Setup

1. Read `../_shared/common.md` for the Iron Law, Project Config, Report Template, and Health Score rules
2. Read `../_shared/source-coverage.md` for book-level coverage, exceptions, and tradeoffs
3. Read `../_shared/decay-risks.md` for symptom definitions and source attributions
4. Read `debt-guide.md` in this directory for the debt classification framework

## Process

**If the user has not described the codebase or pointed to specific areas:** apply Auto
Scope Detection from `../_shared/common.md` to determine the assessment scope before proceeding.

1. Scan for all six decay risks (Step 1 of the guide); list every finding before scoring
2. Apply the Pain × Spread priority formula and classify debt intent (Steps 2–3 of the guide)
3. Group findings by decay risk (Step 4 of the guide)
4. Output using the Report Template from common.md, plus the Debt Summary Table

**Mode line in report:** `Tech Debt Assessment`

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
