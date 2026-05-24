---
id: 'web-design-guidelines'
name: web-design-guidelines
description: "Review files for compliance with Web Interface Guidelines."
risk: safe
source: community
date_added: "2026-02-27"
category: cloud
tags:
- ai
- ci
- design
- orm
- test
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.

## When to Use
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

