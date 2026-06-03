---
id: skill-issue
name: skill-issue
description: "Find out why a coding-agent skill won't fire — grade each SKILL.md A–F on activation, simulate which skill a prompt triggers, and flag collisions where one silently shadows another."
category: meta
risk: safe
source: community
source_repo: mishanefedov/skill-issue
source_type: community
date_added: "2026-06-02"
author: mishanefedov
tags: [skills, linter, activation, meta, ci]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/mishanefedov/skill-issue/blob/main/LICENSE"
---

# skill-issue — skill activation audit

## Overview

A coding agent decides which skill to run from each skill's always-on `name` +
`description`. A skill can be perfectly implemented and still never fire because
its description is too vague to match how people phrase requests, or because a
more specific sibling silently wins. `skill-issue` audits exactly that surface,
grading each skill A–F, simulating which skill fires for a given prompt, and
reporting collision clusters where one skill shadows another.

## When to Use This Skill

- Use when a skill you wrote never seems to trigger and you don't know why
- Use when the user says "why isn't my skill firing", "which skill fires for X", or "audit my skills"
- Use after writing or installing a new SKILL.md, to confirm it will actually be picked
- Use in CI to fail a PR that adds a skill with empty/duplicate/colliding metadata

## How It Works

Install the CLI (`npm i -g @misha_misha/skill-issue`, `brew install mishanefedov/skill-issue/skill-issue`, or `npx @misha_misha/skill-issue`), then:

```bash
skill-issue ~/.claude/skills                       # grade every skill A–F (+ collisions summary)
skill-issue ~/.codex/skills --why "deploy to prod" # which skill fires for this prompt, and why
skill-issue <dir> --collisions                     # clusters of skills that shadow each other
skill-issue <dir> --fix                            # append a "Use when …" clause to weak descriptions
skill-issue <dir> --json                           # machine-readable; exits non-zero on errors
```

Offline heuristic by default; add `--llm` to judge with a local `claude`/`codex` CLI.

## Examples

### Example 1: Audit installed skills

```bash
skill-issue ~/.claude/skills
# F  deploy-helper  ✗ no description — can never fire
# C  shipit         ! no "use when …" trigger clause
# A  rollback-prod  ✓ will fire on its triggers
```

### Example 2: Diagnose a collision

```bash
skill-issue ~/.claude/skills --why "deploy the app to prod"
#  1. shipit       0.74  ← would fire
#  2. land-deploy  0.69  (margin 0.05 — ambiguous, likely collision)
```

## Limitations

- Offline scoring is heuristic and should be treated as a triage signal, not a final quality verdict.
- Collision reports highlight likely shadowing, but agent-specific routers can weight metadata differently.
- The `--fix` mode can improve weak trigger wording, but generated edits still need maintainer review before committing.
