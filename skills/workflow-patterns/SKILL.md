---
id: 'workflow-patterns'
name: workflow-patterns
description: Use this skill when implementing tasks according to Conductor's TDD workflow, handling phase checkpoints, managing git commits for tasks, or understanding the verification protocol.
risk: safe
source: community
date_added: '2026-02-27'
category: frontend-frameworks
tags:
- ai
- ci
- tdd
- test
- testing
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Workflow Patterns

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

Guide for implementing tasks using Conductor's TDD workflow, managing phase checkpoints, handling git commits, and executing the verification protocol that ensures quality throughout implementation.

## Use this skill when

- Implementing tasks from a track's plan.md
- Following TDD red-green-refactor cycle
- Completing phase checkpoints
- Managing git commits and notes
- Understanding quality assurance gates
- Handling verification protocols
- Recording progress in plan files

## Do not use this skill when

- The task is unrelated to workflow patterns
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
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

