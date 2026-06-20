---
name: ui-a11y
description: "Audit a StyleSeed-based component or page for WCAG 2.2 AA issues and apply practical accessibility fixes where the code makes them safe."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ui, accessibility, wcag, audit, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UI Accessibility Audit

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill audits components and pages for accessibility issues with an emphasis on the Toss seed's mobile UI patterns. It combines WCAG 2.2 AA checks with practical code fixes for touch targets, focus states, contrast, labels, and reduced motion.

## When to Use
- Use when reviewing a page or component for accessibility regressions
- Use when a StyleSeed UI looks polished but has uncertain keyboard or contrast behavior
- Use when adding new interactive controls to a mobile-first screen
- Use when you want a prioritized list of issues and fixable items

## Audit Areas

### Perceivable

- text contrast
- non-text contrast for controls and graphics
- alt text for images
- labels for meaningful icons
- no information conveyed by color alone

### Operable

- touch targets at least 44x44px
- keyboard reachability for all interactive controls
- logical tab order
- visible focus indicators
- reduced-motion support for nonessential animation

### Understandable

- visible labels or `aria-label` on inputs
- error text associated with the correct field
- clear wording for errors and validation
- document language set appropriately

### Robust

- semantic HTML where possible
- correct use of ARIA when semantics alone are insufficient
- no faux buttons or links without the right roles and behavior

## Output

Return:
1. Issues found, grouped by severity
2. Safe autofixes that can be applied directly
3. Items that need manual review or product judgment
4. A short summary of the accessibility risk level

## Best Practices

- Fix semantics before layering on ARIA
- Use the design system tokens only if they still meet contrast requirements
- Treat touch target failures as real usability defects, not polish issues
- Prefer partial, verified fixes over speculative accessibility changes

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ui-a11y/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
