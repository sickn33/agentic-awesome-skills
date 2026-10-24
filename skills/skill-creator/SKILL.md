---
name: skill-creator
description: "Create and review reusable skill drafts with bundled Python scaffolding, basic frontmatter validation and ZIP packaging helpers. Use for skill authoring and packaging; verify target-host requirements separately."
category: meta
risk: critical
source: community
tags: "[automation, scaffolding, skill-creation, meta-skill]"
date_added: "2026-02-27"
plugin:
  targets:
    codex: supported
    claude: supported
---

# skill-creator

Modified for the AAS catalog: corrected bundled workflow, validation and packaging safeguards (2026-10-23).

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

This skill should be used when:
- User wants to extend CLI functionality with custom capabilities
- User needs to create a skill following official standards
- User wants to automate repetitive CLI tasks with a reusable skill
- User needs to package domain knowledge into a skill format
- User wants both local and global skill installation options

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
