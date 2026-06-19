---
name: avalonia-zafiro-development
description: "Mandatory skills, conventions, and behavioral rules for Avalonia UI development using the Zafiro toolkit."
risk: safe
source: community
date_added: "2026-02-27"
---

# Avalonia Zafiro Development

This skill defines the mandatory conventions and behavioral rules for developing cross-platform applications with Avalonia UI and the Zafiro toolkit. These rules prioritize maintainability, correctness, and a functional-reactive approach.

## Core Pillars

1.  **Functional-Reactive MVVM**: Pure MVVM logic using DynamicData and ReactiveUI.
2.  **Safety & Predictability**: Explicit error handling with `Result` types and avoidance of exceptions for flow control.
3.  **Cross-Platform Excellence**: Strictly Avalonia-independent ViewModels and composition-over-inheritance.
4.  **Zafiro First**: Leverage existing Zafiro abstractions and helpers to avoid redundancy.

## Guides

- [Core Technical Skills & Architecture](core-technical-skills.md): Fundamental skills and architectural principles.
- [Naming & Coding Standards](naming-standards.md): Rules for naming, fields, and error handling.
- [Avalonia, Zafiro & Reactive Rules](avalonia-reactive-rules.md): Specific guidelines for UI, Zafiro integration, and DynamicData pipelines.
- [Zafiro Shortcuts](zafiro-shortcuts.md): Concise mappings for common Rx/Zafiro operations.
- [Common Patterns](patterns.md): Advanced patterns like `RefreshableCollection` and Validation.

## Procedure Before Writing Code

1.  **Search First**: Search the codebase for similar implementations or existing Zafiro helpers.
2.  **Reusable Extensions**: If a helper is missing, propose a new reusable extension method instead of inlining complex logic.
3.  **Reactive Pipelines**: Ensure DynamicData operators are used instead of plain Rx where applicable.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
