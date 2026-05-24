---
id: 'dotnet-backend-patterns'
name: dotnet-backend-patterns
description: "Master C#/.NET patterns for building production-grade APIs, MCP servers, and enterprise backends with modern best practices (2024/2025)."
risk: safe
source: community
date_added: "2026-02-27"
category: security-offensive
tags:
- api
- backend
- design
- frontend
- server
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# .NET Backend Development Patterns

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

Master C#/.NET patterns for building production-grade APIs, MCP servers, and enterprise backends with modern best practices (2024/2025).

## Use this skill when

- Developing new .NET Web APIs or MCP servers
- Reviewing C# code for quality and performance
- Designing service architectures with dependency injection
- Implementing caching strategies with Redis
- Writing unit and integration tests
- Optimizing database access with EF Core or Dapper
- Configuring applications with IOptions pattern
- Handling errors and implementing resilience patterns

## Do not use this skill when

- The project is not using .NET or C#
- You only need frontend or client guidance
- The task is unrelated to backend architecture

## Instructions

- Define architecture boundaries, modules, and layering.
- Apply DI, async patterns, and resilience strategies.
- Validate data access performance and caching.
- Add tests and observability for critical flows.
- If detailed patterns are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed .NET patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

