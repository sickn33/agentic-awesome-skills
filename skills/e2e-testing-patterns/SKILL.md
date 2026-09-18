---
name: e2e-testing-patterns
description: "Build reliable, fast, and maintainable end-to-end test suites that provide confidence to ship code quickly and catch regressions before users do."
risk: safe
source: community
date_added: "2026-02-27"
---

# E2E Testing Patterns

Build reliable, fast, and maintainable end-to-end test suites that provide confidence to ship code quickly and catch regressions before users do.

## Use this skill when

- Implementing end-to-end test automation
- Debugging flaky or unreliable tests
- Testing critical user workflows
- Setting up CI/CD test pipelines
- Testing across multiple browsers
- Validating accessibility requirements
- Testing responsive designs
- Establishing E2E testing standards

## Do not use this skill when

- You only need unit or integration tests
- The environment cannot support stable UI automation
- You cannot provision safe test accounts or data

## Instructions

1. Identify critical user journeys and success criteria.
2. Build stable selectors and test data strategies.
3. Implement isolated tests with observable assertions and tracing; diagnose retries rather than counting a retry as an ordinary pass.
4. Run in CI with parallelization and artifact capture.

## Safety

- Avoid running destructive tests against production.
- Use dedicated test data and scrub sensitive output.

## Resources

- `resources/implementation-playbook.md` for detailed E2E patterns and templates.

## Worked example

Input: invalid login sometimes appears successful because the test reads the error before rendering finishes. Use a dedicated fixture account and assert `await expect(page.getByRole('alert')).toContainText('Invalid credentials')`. Run the test without retries and confirm the dashboard remains inaccessible. Expected: the failure state is observed reliably; a delayed error cannot silently pass.

## Inputs and prerequisites

An authorized test URL, isolated accounts/data, the installed browser runner and known success/failure states. The playbook uses project-specific routes and adapters; install only the dependencies your existing suite needs.

## Limitations

- A mocked backend or payment provider proves only the mocked boundary; retain separate real integration checks.
- Automated accessibility scans miss interaction and assistive-technology problems.
- Retries, larger timeouts and updated snapshots can hide regressions; preserve first-failure evidence.
- Browser tooling cannot validate a locked or unavailable interactive environment. Report that gap and continue independent tests.
