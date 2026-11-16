---
name: zm-pro
description: "Discipline playbook for AI coding agents: rules, gates, evidence-first delivery, project memory, privacy and releases — 13 Markdown guides."
category: development
risk: none
source: self
source_repo: leonccunha21/zm-skills
source_type: self
date_added: "2026-11-16"
author: leonccunha21
tags: [agent-skills, project-standards, code-quality, evidence-first, lgpd]
tools: [claude, cursor, gemini, codex, opencode]
license: "MIT"
license_source: "https://github.com/leonccunha21/zm-skills/blob/main/LICENSE"
---

# zm-pro — the professional project playbook for AI agents

## Overview

AI coding agents do not fail for lack of intelligence — they fail for lack of method: they start without reading, "fix" the wrong file, declare done without running anything, and re-ask settled questions. `zm-pro` is an open-source Agent Skill (MIT, zero dependencies, English + pt-BR) that turns any coding agent into a disciplined project professional. A router (`SKILL.md`) picks the task track and loads **only** the 1–2 reference guides it needs (13 total: code rules, project standards, UI, multi-agent, project memory, privacy/LGPD, security, testing, git delivery, operations, architecture, performance, token economy). Every task follows the same cycle: read the ground first, smallest safe change, verify for real, deliver with an evidence record.

Distinction from existing catalog entries: this is a **full-lifecycle process playbook**, not a single-task helper. Items like `test-driven-development` or `brainstorming` are individual disciplines; `zm-pro` is the surrounding operating system — standards, gates, delivery and memory — into which those disciplines plug.

## When to Use This Skill

- Use when an AI coding agent (OpenCode, Claude Code, Codex, Cursor, Gemini CLI) will work inside a software project and the owner wants consistent, reviewable behavior instead of improvised output.
- Use for kickoff, implementation, review, delivery (commit → PR → release), and incident work on projects without strong internal rules.
- Use instead of ad-hoc "best practice" prompting when the team cares about evidence (test output, checklists, delivery logs).
- Prefer a narrower skill when the task is a single isolated capability (e.g., browser automation, CSV analysis) — this skill is a method, not a feature.

## Prerequisites

- Any Agent-Skills-compatible harness (OpenCode, Claude Code, Codex, Cursor, Gemini CLI).
- `git` and Node ≥ 18 on the host (used by the bundled zero-dependency validator and installer — the skill itself ships Markdown only).
- No network, no accounts, no cost. A copy-paste install works: project `.agents/skills/zm-pro` or global the harness's skills directory.

## How It Works

### 1. Establish the inputs

The owner states the objective, in-scope files and acceptance criteria. If missing, the agent asks — it does not guess. `RULES.md` and `AGENTS.md` (templates provided and copyable) are read before any edit; they override the skill when they conflict.

### 2. Perform the task

The router reads `SKILL.md`, selects the track (implement / fix / review / deliver / privacy), loads the relevant 1–2 references only, and proceeds: smallest safe change → run the project's verification commands → quote the real output. Confirmation is required before destructive or irreversible actions; if verification is impossible in the environment, that is reported explicitly, never papered over.

### 3. Verify the result

Observable success = the project's checks green, plus a short delivery record: files changed, commands with outputs, risks, explicitly what was **not** tested. No quoted evidence, no "done".

## Examples

The 0.4.0 pilot (2026-11-16): an empty repo, a task for a dependency-free BRL money module (`formatBRL`, `applyDiscount`), 9 deterministic tests. The agent read the ground rules, picked the implement track, wrote module + tests, ran `node --test` — `tests 9 · pass 9 · fail 0 · duration_ms 215` — quoted the output, and listed what was not tested (other Node versions, coverage, integration). Quoted from the pilot's DELIVERY-LOG.

```
User request: Build a pure money utility — formatBRL(centavos) and applyDiscount.
Inputs: empty repo with AGENTS.md/RULES.md copied from the kit.
Expected result: module + 9 green tests, evidence quoted, explicit limits.
```

## Limitations

- It is documentation for agents, not executable tooling — quality of output still depends on the host model/agent and on honest reporting.
- OpenCode 2.3.0 is verified end-to-end; other harnesses are listed on the compatibility matrix as verified or not (not all are verified — see repository docs).
- LGPD/privacy guidance produces engineering drafts, not legal advice; DPO/counsel decides.

## Safety and side effects

No network calls, no writes beyond the user's project tree, no telemetry, no external services. The skill never asks for secrets or customer data; secret scanning is part of the gates it teaches. `risk: none` — pure reasoning and text.

## Sources and related skills

Upstream: https://github.com/leonccunha21/zm-skills (MIT), releases 0.1.0 → 0.7.0. Local install: `node scripts/install.mjs opencode` from the repo. Related: `test-driven-development` (implement track pairs well), `brainstorming` (pre-design), `using-git-worktrees` (parallel tracks).
