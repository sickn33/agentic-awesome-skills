---
name: lint-and-validate
description: "Run configured lint and type checks, distinguish failures from checks that did not run, and report concrete validation results."
risk: critical
source: community
date_added: "2026-02-27"
---

# Lint and Validate

## When to Use

Use after behavior or configuration changes when a repository has relevant lint or type checks. Read the repository's instructions and package scripts first. Run focused checks during development and the required checks before completion.

## Procedure

1. Identify the changed languages, configured commands, and installed tools. Inspect package scripts before executing them: a script named `lint` can modify files or run arbitrary project code.
2. Run the project's read-only lint/type-check commands. For Node projects, prefer declared scripts such as `npm run lint` and `npm run typecheck`. Do not use `npx` to silently fetch an absent checker.
3. For Python, use configured, already installed tools such as `ruff check .` or `mypy .`. Do not assume every `pyproject.toml` configures both. Never add `--fix` without inspecting the proposed changes and the task's authorization.
4. Fix relevant failures without deleting user work, weakening rules, or raising timeouts just to pass. If a required tool is unavailable, report the exact check that did not run.
5. Report commands, exit results, scope and remaining limitations. Passing lint does not prove the absence of runtime or security defects.

## Example

After correcting a TypeScript behavior, inspect `package.json`, run the configured focused regression test, then `npm run lint` and `npm run typecheck` if those scripts exist. If TypeScript is declared but not installed, report the missing local checker; do not substitute a downloaded package or call the result a pass.

## Bundled helpers

- `python scripts/lint_runner.py /absolute/project`: runs a conservative set of candidate checks. Node fallback checkers must exist in local `node_modules/.bin`; Python candidates must be installed. Inspect the project scripts first. A missing command or failing check exits 1; no configured checks or invalid project metadata exits 2. Exit 0 means the invoked checks passed, not that every needed check was discovered. Python detection is heuristic and may suggest unconfigured Ruff/MyPy commands.
- `python scripts/type_coverage.py /absolute/project`: read-only annotation inventory, despite its retained compatibility filename. Samples at most 30 files per language, skips links and build/dependency directories, and bounds file reads. Python uses AST nodes to avoid double-counting functions. TypeScript reports lexical `: any` occurrences, including possible comments and strings. No quality percentage or pass/fail threshold is inferred. Exit 2 means no applicable files; parse/read errors exit 1.

## Limitations

The runner executes trusted project commands, which may mutate files or access the network. It does not install dependencies, detect every monorepo configuration, or replace the project's CI contract. The inventory is a bounded source sample, not semantic type coverage; inferred types, generics, decorator behavior and correctness require the actual type checker. Do not label unrun checks as successful.
