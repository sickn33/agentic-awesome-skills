---
id: 'bats-testing-patterns'
name: bats-testing-patterns
description: "Master Bash Automated Testing System (Bats) for comprehensive shell script testing. Use when writing tests for shell scripts, CI/CD pipelines, or requiring test-driven development of shell utilities."
risk: critical
source: community
date_added: "2026-02-27"
category: devops
tags:
- ai
- cd
- ci
- orm
- pipeline
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Bats Testing Patterns

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

Comprehensive guidance for writing comprehensive unit tests for shell scripts using Bats (Bash Automated Testing System), including test patterns, fixtures, and best practices for production-grade shell testing.

## Use this skill when

- Writing unit tests for shell scripts
- Implementing TDD for scripts
- Setting up automated testing in CI/CD pipelines
- Testing edge cases and error conditions
- Validating behavior across shell environments

## Do not use this skill when

- The project does not use shell scripts
- You need integration tests beyond shell behavior
- The goal is only linting or formatting

## Instructions

- Confirm shell dialects and supported environments.
- Set up a test structure with helpers and fixtures.
- Write tests for exit codes, output, and side effects.
- Add setup/teardown and run tests in CI.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

