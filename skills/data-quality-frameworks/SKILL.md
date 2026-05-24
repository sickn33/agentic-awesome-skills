---
id: 'data-quality-frameworks'
name: data-quality-frameworks
description: "Implement data quality validation with Great Expectations, dbt tests, and data contracts. Use when building data quality pipelines, implementing validation rules, or establishing data contracts."
risk: critical
source: community
date_added: "2026-02-27"
category: devops
tags:
- ai
- cd
- ci
- pipeline
- schema
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Data Quality Frameworks

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

Production patterns for implementing data quality with Great Expectations, dbt tests, and data contracts to ensure reliable data pipelines.

## Use this skill when

- Implementing data quality checks in pipelines
- Setting up Great Expectations validation
- Building comprehensive dbt test suites
- Establishing data contracts between teams
- Monitoring data quality metrics
- Automating data validation in CI/CD

## Do not use this skill when

- The data sources are undefined or unavailable
- You cannot modify validation rules or schemas
- The task is unrelated to data quality or contracts

## Instructions

- Identify critical datasets and quality dimensions.
- Define expectations/tests and contract rules.
- Automate validation in CI/CD and schedule checks.
- Set alerting, ownership, and remediation steps.
- If detailed patterns are required, open `resources/implementation-playbook.md`.

## Safety

- Avoid blocking critical pipelines without a fallback plan.
- Handle sensitive data securely in validation outputs.

## Resources

- `resources/implementation-playbook.md` for detailed frameworks, templates, and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

