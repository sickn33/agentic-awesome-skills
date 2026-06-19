---
name: ux-feedback
description: "Add loading, empty, error, and success feedback states to StyleSeed components and pages with practical mobile-first rules."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ux, states, loading, error-handling, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UX Feedback

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill ensures data-dependent UI does not stop at the happy path. It adds the four core feedback states every serious product needs: loading, empty, error, and success.

## When to Use
- Use when a component or page fetches, mutates, or depends on async data
- Use when a flow currently renders only the success path
- Use when a card, list, or page needs better state communication
- Use when the product needs clear recovery and confirmation behavior

## The Four Required States

### Loading

Use skeletons that match the final layout. Avoid spinners inside cards unless the pattern genuinely requires them. Delay skeletons slightly to avoid flashes on fast responses.

### Empty

Provide a friendly explanation and a next action. Zero values should still render meaningfully instead of disappearing.

### Error

Use plain-language failure messages and always offer recovery where possible. Localize failures to the affected card or section if the rest of the page can still work.

### Success

Use toasts or equivalent lightweight confirmation for completed actions. Add undo for reversible destructive changes.

## Output

Return:
1. The data-dependent areas identified
2. The loading, empty, error, and success states added for each one
3. Any reusable empty-state or toast patterns created
4. Follow-up work needed for analytics, retries, or accessibility

## Best Practices

- Match loading placeholders to the real layout
- Keep partial failure isolated whenever possible
- Make recovery obvious, not hidden in logs or developer tools
- Use success feedback sparingly but clearly

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ux-feedback/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
