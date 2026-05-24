---
id: 'e2e-testing-patterns'
name: e2e-testing-patterns
description: "Build reliable, fast, and maintainable end-to-end test suites that provide confidence to ship code quickly and catch regressions before users do."
risk: safe
source: community
date_added: "2026-02-27"
category: devops
tags:
- ai
- cd
- ci
- design
- pipeline
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# E2E Testing Patterns

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

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
3. Implement tests with retries, tracing, and isolation.
4. Run in CI with parallelization and artifact capture.

## Safety

- Avoid running destructive tests against production.
- Use dedicated test data and scrub sensitive output.

## Resources

- `resources/implementation-playbook.md` for detailed E2E patterns and templates.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

