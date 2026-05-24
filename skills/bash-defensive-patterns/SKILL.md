---
id: 'bash-defensive-patterns'
name: bash-defensive-patterns
description: "Master defensive Bash programming techniques for production-grade scripts. Use when writing robust shell scripts, CI/CD pipelines, or system utilities requiring fault tolerance and safety."
risk: safe
source: community
date_added: "2026-02-27"
category: devops
tags:
- cd
- ci
- deploy
- orm
- pipeline
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Bash Defensive Patterns

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

Comprehensive guidance for writing production-ready Bash scripts using defensive programming techniques, error handling, and safety best practices to prevent common pitfalls and ensure reliability.

## Use this skill when

- Writing production automation scripts
- Building CI/CD pipeline scripts
- Creating system administration utilities
- Developing error-resilient deployment automation
- Writing scripts that must handle edge cases safely
- Building maintainable shell script libraries
- Implementing comprehensive logging and monitoring
- Creating scripts that must work across different platforms

## Do not use this skill when

- You need a single ad-hoc shell command, not a script
- The target environment requires strict POSIX sh only
- The task is unrelated to shell scripting or automation

## Instructions

1. Confirm the target shell, OS, and execution environment.
2. Enable strict mode and safe defaults from the start.
3. Validate inputs, quote variables, and handle files safely.
4. Add logging, error traps, and basic tests.

## Safety

- Avoid destructive commands without confirmation or dry-run flags.
- Do not run scripts as root unless strictly required.

Refer to `resources/implementation-playbook.md` for detailed patterns, checklists, and templates.

## Resources

- `resources/implementation-playbook.md` for detailed patterns, checklists, and templates.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

