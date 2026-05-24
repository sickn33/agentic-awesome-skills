---
id: 'ddd-strategic-design'
name: ddd-strategic-design
description: "Design DDD strategic artifacts including subdomains, bounded contexts, and ubiquitous language for complex business domains."
risk: safe
source: self
tags: "[ddd, strategic-design, bounded-context, ubiquitous-language]"
date_added: "2026-02-27"
category: database
tools:
- claude-code
author: 'emanueleodierna'
---

# DDD Strategic Design

## When to Use This Skill

- When building or reviewing UI components, layouts, or design systems
- When you need help with HTML, CSS, or JavaScript/TypeScript frontend code
- When auditing for accessibility, performance, or responsiveness
- When migrating or refactoring a frontend framework

## Do Not Use This Skill When

- When the task is purely backend or infrastructure-related
- When no UI, design, or browser environment is involved

## Use this skill when

- Defining core, supporting, and generic subdomains.
- Splitting a monolith or service landscape by domain boundaries.
- Aligning teams and ownership with bounded contexts.
- Building a shared ubiquitous language with domain experts.

## Do not use this skill when

- The domain model is stable and already well bounded.
- You need tactical code patterns only.
- The task is purely infrastructure or UI oriented.

## Instructions

1. Extract domain capabilities and classify subdomains.
2. Define bounded contexts around consistency and ownership.
3. Establish a ubiquitous language glossary and anti-terms.
4. Capture context boundaries in ADRs before implementation.

If detailed templates are needed, open `references/strategic-design-template.md`.

## Required artifacts

- Subdomain classification table
- Bounded context catalog
- Glossary with canonical terms
- Boundary decisions with rationale

## Examples

```text
Use @ddd-strategic-design to map our commerce domain into bounded contexts,
classify subdomains, and propose team ownership.
```

## Limitations

- This skill does not produce executable code.
- It cannot infer business truth without stakeholder input.
- It should be followed by tactical design before implementation.
