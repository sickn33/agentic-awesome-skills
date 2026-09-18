---
name: laravel-development-workflow
description: "Build and fix existing Laravel applications through root-cause diagnosis, repository-native implementation, regression coverage, and risk-based verification."
category: development
risk: critical
source: community
source_repo: Junaid-PK/laravel-development-workflow
source_type: community
date_added: "2026-09-02"
author: Junaid-PK
tags: [laravel, php, debugging, testing, development]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Junaid-PK/laravel-development-workflow/blob/main/LICENSE"
---

# Laravel Development Workflow

Make the requested Laravel behavior correct, maintainable within the existing application, and supported by evidence that matches the change's risk.

## When to Use

- Use when implementing a feature in an existing Laravel application.
- Use when diagnosing and fixing a Laravel bug at its actionable root cause.
- Use when a Laravel change needs regression coverage and proportionate verification.
- Use when the project already has architectural or testing conventions that must be preserved.

## Establish the Contract

Before editing:

- Read the repository instructions and inspect the relevant routes, models, controllers, actions or services, requests, policies, jobs, events, tests, and schema.
- Trace the current behavior far enough to identify the actual change boundary and existing conventions.
- Turn the request into a compact set of scenarios, important edge cases, and verifiable acceptance criteria. Keep this analysis in the working notes unless the user requests a separate artifact.
- Identify authorization, validation, transaction, queue, cache, and concurrency concerns only where they can affect this behavior.

Scale the analysis to the task. A focused validation fix does not need the same ceremony as a new multi-role workflow.

## Fix Bugs at the Cause

For a bug:

1. Reproduce the failure through the narrowest reliable path.
2. Trace the data and control flow to the actionable root cause.
3. Add or update a regression test that fails for that cause when practical.
4. Implement the smallest fix that restores the intended invariant.
5. Demonstrate that the regression test passes and that nearby behavior still works.

Do not substitute retries, broad exception handling, disabled validation, extra timeouts, or error suppression for a root-cause fix. If the failure cannot be reproduced locally, state what evidence is missing and use the strongest available static or targeted verification.

## Build Features in the Existing Shape

- Reuse the application's established patterns and naming.
- Keep business rules in the layer where this codebase already places comparable rules.
- Use Eloquent relationships, form requests, policies, actions, services, events, or jobs when they improve this change or match local conventions—not as mandatory ceremony.
- Treat authorization and validation as explicit behavior at the system boundary.
- Preserve backwards compatibility unless the request requires a breaking change.
- Keep migrations reversible and safe for the application's supported database engines.

Create factories, seeders, fixtures, or a disposable command only when realistic data is needed for development or durable test coverage. Do not leave one-off scaffolding in the product solely to exercise a small change.

## Verify Proportionately

Discover the project's supported commands from its configuration and documentation. Prefer this order:

1. Run the narrowest affected test or reproduce the original failure.
2. Run the relevant feature, unit, or integration test group.
3. Run static analysis, formatting, and linting configured by the repository.
4. Run the broader suite when the change's reach or project policy warrants it.

Cover the critical observable behavior, including the happy path and whichever edge cases, validation rules, permissions, database effects, events, notifications, jobs, or API contracts are actually affected. Avoid tests that only mirror implementation details.

Common commands may include:

```bash
php artisan test --filter=RelevantTest
vendor/bin/pest --filter=RelevantTest
vendor/bin/phpstan analyse
vendor/bin/pint --dirty
```

Use the commands the project provides; do not install or configure tools merely because they appear in this example.

## Preserve the User's Environment

- Keep the change inside the requested application behavior and preserve unrelated working-tree changes.
- Do not run destructive database operations, production commands, deployments, credential changes, or external account actions unless the user or repository instructions explicitly place them in scope.
- Avoid exposing secrets in commands, logs, test output, or completion evidence.
- Prefer local, reversible verification and narrowly targeted data changes.

## Completion Evidence

Before handing off, verify each acceptance criterion against current behavior. Report:

- what changed and why it fixes or implements the requested behavior;
- the scenarios and important edge cases covered;
- the exact checks run and their results;
- any check that could not run, with the concrete reason and remaining risk.

Do not claim completion from code inspection alone when executable verification is available.

## Limitations

- This workflow requires an existing Laravel application and adapts to that repository's architecture and tooling; it does not impose a complete project structure.
- It cannot prove production behavior when the required services, data, credentials, or environment are unavailable, so any unverified risk must be reported explicitly.
- It does not authorize destructive database work, production changes, deployments, credential changes, or external account actions.
