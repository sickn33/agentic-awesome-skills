---
name: hyperexecute-skill
description: "Operates HyperExecute end-to-end for TestMu AI/LambdaTest cloud test execution: analyze projects, create YAML, validate locally, run CLI jobs, debug failures, and wire CI. Use when the user mentions HyperExecute, hyperexecute.yaml, HyperExecute CLI, autosplit, matrix execution,..."
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# HyperExecute Operator
## When to Use

Use this skill when you need operates HyperExecute end-to-end for TestMu AI/LambdaTest cloud test execution: analyze projects, create YAML, validate locally, run CLI jobs, debug failures, and wire CI. Use when the user mentions HyperExecute, hyperexecute.yaml, HyperExecute CLI, autosplit, matrix execution,...


## Quick Start

1. Locate the HyperExecute CLI. If missing, ask before downloading it unless the user explicitly approved an autonomous HyperExecute session.
2. Run `hyperexecute analyze` when the CLI is available; use local inspection only as fallback.
3. Create or repair `hyperexecute.yaml` from the analyze output, project test commands, and templates in `reference/`.
4. Run `node scripts/doctor.js --config hyperexecute.yaml` and `node scripts/validate-config.js hyperexecute.yaml`.
5. Validate with the official CLI: `./hyperexecute --user "$LT_USERNAME" --key "$LT_ACCESS_KEY" --config hyperexecute.yaml --validate`.
6. Ask before a real cloud job unless the user has explicitly opted into an autonomous HyperExecute session.
7. For failures, download logs/artifacts/reports and use `reference/troubleshooting.md`.

## Operating Rules

- Treat the official HyperExecute CLI as the source of truth for analyze, validation, execution, logs, reports, and artifacts.
- Use `LT_USERNAME` and `LT_ACCESS_KEY` from local environment variables or CI secrets; never hardcode credentials in YAML or docs.
- Use `--job-secret-file` only for extra job-scoped secrets, preferably outside the repo or ignored by `.gitignore`/`.hyperexecuteignore`.
- Prefer template-driven YAML over generator scripts because test commands, paths, and payload boundaries are project-specific.
- Run safe local checks automatically; run real HyperExecute cloud jobs only after confirmation unless the user opted into autonomous mode.
- In autonomous mode, validate first, run, inspect output, download logs/artifacts when useful, and retry only for actionable config/environment fixes.

## Workflow

- First run: analyze project, author YAML, run helper checks, run CLI validate, then request confirmation for the cloud job.
- Debug: reproduce the failing CLI command, add `--verbose` when useful, download logs/artifacts/reports, fix one cause at a time.
- CI: use CI secrets, add a validation stage before execution, set `CI=true` for quieter logs, and keep downloaded artifacts available for failed jobs.
- Performance: tune `autosplit`, `concurrency`, cache keys, retries, smart ordering, and matrix/hybrid scope after one successful run.

## Helper Scripts

- `scripts/doctor.js`: checks CLI readiness, credentials, config presence, and optional official validation.
- `scripts/validate-config.js`: lightweight config linting for common mistakes before official CLI validation.
- `scripts/build-command.js`: prints safe validate/run/debug/download commands using environment variable references.
- `scripts/summarize-artifacts.js`: summarizes downloaded logs, reports, and artifacts for triage.

## References

- CLI usage and flags: [reference/cli.md](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill/reference/cli.md)
- YAML patterns: [reference/yaml-patterns.md](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill/reference/yaml-patterns.md)
- Framework recipes: [reference/frameworks.md](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill/reference/frameworks.md)
- CI/CD integration: [reference/ci-cd.md](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill/reference/ci-cd.md)
- Security rules: [reference/security.md](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill/reference/security.md)
- Troubleshooting: [reference/troubleshooting.md](https://github.com/LambdaTest/agent-skills/tree/main/hyperexecute-skill/reference/troubleshooting.md)

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
