---
name: squirrel
description: "Full-cycle AI coding skill: plans, builds, tests, lints, fixes bugs, and writes production-grade docs. Auto-detects project state and adapts its 8-phase pipeline."
category: development
risk: safe
source: community
source_repo: flyingsquirrel0419/squirrel-skill
source_type: community
license: "Apache-2.0"
license_source: "https://github.com/flyingsquirrel0419/squirrel-skill/blob/main/LICENSE"
date_added: "2026-04-29"
author: flying_squirrel__
tags: [development, testing, planning, code-review, documentation, ci-cd]
tools: [claude, cursor, codex, antigravity, gemini, windsurf, opencode, copilot]
---

# Squirrel — Full-Cycle Software Development Skill

## Overview

Squirrel is a full-cycle AI coding skill that works across 9 AI coding agents. It auto-detects project state (greenfield, in-progress, or mature) and adapts its 8-phase engineering pipeline accordingly. Instead of a one-size-fits-all workflow, it figures out where the project actually is and jumps in at exactly the right point.

## When to Use This Skill

- Use when starting a new project from scratch (greenfield)
- Use when improving an existing codebase (in-progress or mature)
- Use when fixing bugs, adding features, or refactoring
- Use when adding tests, linting, or CI/CD to a project
- Use when writing production-grade documentation
- Use when the user says "build me", "fix this", "squirrel this project", or any multi-step development task

## How It Works

### Step 0: Detect Mode

Squirrel classifies the project directory:

| Signal | Mode | Entry Point |
|--------|------|-------------|
| Empty directory | Greenfield | All 8 phases from scratch |
| Source files, no tests/docs | In-Progress | Audit first, then improve |
| Source + tests + CI + README | Mature | Targeted improvements |
| "fix this bug / add feature" | Targeted | Scoped work only |

### The 8-Phase Pipeline

1. **Discover** — Understand the project (audit existing code or gather requirements)
2. **Plan** — Concrete task list with dependencies and done-criteria
3. **Build** — Write or modify code (parallel sub-agents when supported)
4. **Test** — Run existing tests, write new ones, 70%+ coverage target
5. **Bug Hunt** — Static analysis + manual review
6. **Polish** — Lint, format, type check, remove dead code
7. **Document** — README + inline docs (update existing, don't overwrite)
8. **Ship** — Final checklist: tests green, no secrets, CI configured

### Failure Recovery (3-Strike Rule)

1. **Strike 1:** Fix the specific error. Run tests. Move on.
2. **Strike 2:** Re-read the code. Try a different approach.
3. **Strike 3:** STOP. Revert. Document what failed. Ask the user.

## Examples

### Example 1: Build a REST API

```text
> build me a REST API for a todo app with TypeScript and Express
```

Squirrel auto-detects greenfield mode and runs all 8 phases.

### Example 2: Fix a bug

```text
> fix this bug in src/auth/login.py
```

Squirrel enters targeted mode — abbreviated audit, scoped fix, verify.

### Example 3: Improve existing project

```text
> squirrel this project — add tests, fix lint errors, write README
```

Squirrel audits the existing codebase, then applies phases 4-8.

## Best Practices

- Respects existing code — matches naming conventions, test framework, import style, and architecture
- Reads 2-3 similar files before writing a new one
- Never suppresses type errors with `as any` or `@ts-ignore`
- Never deletes failing tests to "pass"
- Never leaves code in a broken state

## Platform Compatibility

Squirrel works on: Claude Code, Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot, Windsurf, OpenCode, Aider (9 total).

Install with:

```bash
# Universal installer
npx skills add flyingsquirrel0419/squirrel-skill

```

## Limitations

- Does not replace environment-specific validation or expert review
- CI/CD templates are starting points, not drop-in guarantees
- Parallel sub-agent execution depends on platform support

## Related Skills

- `@brainstorming` - For planning before implementation
- `@test-driven-development` - For TDD-oriented workflows
- `@systematic-debugging` - For methodical problem-solving
