---
name: claude-win11-speckit-update-skill
description: "Review updates to GitHub SpecKit on Windows 11 with PowerShell, preserving local templates and customizations"
risk: critical
source: "https://github.com/NotMyself/claude-win11-speckit-update-skill"
date_added: "2026-02-27"
---

# Claude Win11 Speckit Update Skill

## Overview

Review updates to GitHub SpecKit on Windows 11 with PowerShell, preserving local templates and customizations

## When to Use This Skill

Use when reviewing a SpecKit project update on Windows 11 while preserving local templates and customizations; not for general Windows administration.

## Instructions

This is a guide to an archived upstream SpecKit updater, not Windows system
administration. No updater scripts are bundled in AAS. Confirm Windows, PowerShell,
Git and the project's existing SpecKit installation before selecting a supported
update path. Record the installed version, current file diff and intended upstream
revision. Preserve a separate copy of local customizations, review the proposed
three-way changes, and apply only the accepted changes within the project scope.
Do not run `specify init --force` as a shortcut or claim preservation before inspecting
the result. If the legacy updater is absent, produce a reviewable migration plan;
do not invent its slash command or execute unreviewed scripts.

## Example

**User request:**

> Use @claude-win11-speckit-update-skill for this task: Review updates to GitHub SpecKit on Windows 11 with PowerShell, preserving local templates and customizations.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
