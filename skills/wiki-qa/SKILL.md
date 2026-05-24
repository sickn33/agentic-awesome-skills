---
id: 'wiki-qa'
name: wiki-qa
description: "Answer repository questions grounded entirely in source code evidence. Use when user asks a question about the codebase, user wants to understand a specific file, function, or component, or user asks \"how does X work\" or \"where is Y defined\"."
risk: safe
source: community
date_added: "2026-02-27"
category: frontend-frameworks
tags:
- ci
- component
- orm
- test
- testing
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Wiki Q&A

Answer repository questions grounded entirely in source code evidence.

## When to Use
- User asks a question about the codebase
- User wants to understand a specific file, function, or component
- User asks "how does X work" or "where is Y defined"

## Procedure

1. Detect the language of the question; respond in the same language
2. Search the codebase for relevant files
3. Read those files to gather evidence
4. Synthesize an answer with inline citations

## Response Format

- Use `##` headings, code blocks with language tags, tables, bullet lists
- Cite sources inline: `(src/path/file.ts:42)`
- Include a "Key Files" table mapping files to their roles
- If information is insufficient, say so and suggest files to examine

## Rules

- ONLY use information from actual source files
- NEVER invent, guess, or use external knowledge
- Think step by step before answering

### When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

