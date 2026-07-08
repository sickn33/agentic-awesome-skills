---
name: brooks-test
description: "Test quality review drawing on twelve classic engineering books — with primary focus on xUnit Test Patterns, The Art of Unit Testing, How Google Tests Software, and Working Effectively with Legacy Code — that diagnoses structural problems in an existing test suite: brittleness, mock..."
risk: unknown
source: https://github.com/hyhmrright/brooks-lint/tree/main/skills/brooks-test
source_repo: hyhmrright/brooks-lint
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE
---

# Brooks-Lint — Test Quality Review
## When to Use

Use this skill when you need test quality review drawing on twelve classic engineering books — with primary focus on xUnit Test Patterns, The Art of Unit Testing, How Google Tests Software, and Working Effectively with Legacy Code — that diagnoses structural problems in an existing test suite: brittleness, mock...


## Setup

1. Read `../_shared/common.md` for the Iron Law, Project Config, Report Template, and Health Score rules
2. Read `../_shared/source-coverage.md` for book-level coverage, exceptions, and tradeoffs
3. Read `../_shared/test-decay-risks.md` for test-space symptom definitions and source attributions
4. Read `test-guide.md` in this directory for the test quality review framework

## Process

**If the user has not shared test files or pointed to a test directory:** apply Auto
Scope Detection from `../_shared/common.md` to determine the review scope before proceeding.

1. Build the test suite map (guide's "Before You Start" section)
2. Scan for each test decay risk in the order specified (Steps 1–4 of the guide)
3. Apply the Iron Law and output using the Report Template (Step 5 of the guide)

**Mode line in report:** `Test Quality Review`

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
