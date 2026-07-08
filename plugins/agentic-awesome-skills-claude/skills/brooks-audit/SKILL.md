---
name: brooks-audit
description: "Architecture audit that maps module dependencies, checks layering integrity, and flags structural decay across a codebase, drawing on twelve classic engineering books. Triggers when: user asks to audit architecture, review folder/module structure, check for circular imports, understand..."
risk: unknown
source: https://github.com/hyhmrright/brooks-lint/tree/main/skills/brooks-audit
source_repo: hyhmrright/brooks-lint
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE
---

# Brooks-Lint — Architecture Audit
## When to Use

Use this skill when you need architecture audit that maps module dependencies, checks layering integrity, and flags structural decay across a codebase, drawing on twelve classic engineering books. Triggers when: user asks to audit architecture, review folder/module structure, check for circular imports, understand...


## Setup

1. Read `../_shared/common.md` for the Iron Law, Project Config, Report Template, and Health Score rules
2. Read `../_shared/source-coverage.md` for book-level coverage, exceptions, and tradeoffs
3. Read `../_shared/decay-risks.md` for symptom definitions and source attributions
4. Read `architecture-guide.md` in this directory for the audit framework

## Process

**Onboarding mode:** If the user asks for an onboarding report, codebase tour, or
"explain this codebase to a new developer", read `onboarding-guide.md` from this
directory and follow it instead of `architecture-guide.md`. This mode explains rather
than diagnoses — no Health Score, no Iron Law findings.

**If the user has not specified files or a directory to audit:** apply Auto Scope
Detection from `../_shared/common.md` to determine the audit scope before proceeding.

1. Gather codebase context and draw the module dependency graph as Mermaid (Steps 0–1 of the guide)
2. Scan for each decay risk in the order specified (Steps 2–4 of the guide)
3. Assign node colors in the Mermaid diagram based on findings (red/yellow/green) — after Step 4
4. Run the Testability Seam Assessment (Step 5 of the guide)
5. Run the Conway's Law check (Step 6 of the guide)
6. Output using the Report Template from common.md — Mermaid graph FIRST, then Findings

**Mode line in report:** `Architecture Audit`

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
