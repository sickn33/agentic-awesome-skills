---
name: ux-audit
description: "Audit screens against Nielsen's heuristics and mobile UX best practices using the StyleSeed Toss design language as the implementation context."
category: design
risk: safe
source: community
source_repo: bitjaru/styleseed
source_type: community
date_added: "2026-04-08"
author: bitjaru
tags: [ux, audit, usability, mobile, styleseed]
tools: [claude, cursor, codex, gemini]
---

# UX Audit

## Overview

Part of [StyleSeed](https://github.com/bitjaru/styleseed), this skill audits usability rather than just visuals. It uses Nielsen's 10 heuristics plus modern mobile UX expectations to find issues in navigation, feedback, recovery, hierarchy, and cognitive load.

## When to Use
- Use when a screen feels awkward even though the code and styling seem correct
- Use when evaluating a flow before or after implementation
- Use when reviewing a mobile-first product for usability regressions
- Use when you want findings framed as user experience problems with remediation

## Audit Framework

Review the target against:
- visibility of system status
- match between system and real-world language
- user control and freedom
- consistency and standards
- error prevention
- recognition rather than recall
- flexibility and efficiency
- aesthetic and minimalist design
- recovery from errors
- help, onboarding, and empty-state guidance

Add mobile-specific checks for reachability, touch ergonomics, input burden, and thumb-friendly action placement.

## Output

Return:
1. A prioritized issue list
2. The heuristic violated by each issue
3. Why the issue matters to real users
4. Specific remediation suggestions for the page, component, or flow

## Best Practices

- Judge the experience from the user's point of view, not the implementer's
- Separate high-severity flow blockers from minor polish issues
- Include recovery and state-management guidance, not only layout comments
- Tie recommendations back to concrete UI changes

## Additional Resources

- [StyleSeed repository](https://github.com/bitjaru/styleseed)
- [Source skill](https://github.com/bitjaru/styleseed/blob/main/seeds/toss/.claude/skills/ux-audit/SKILL.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
