---
name: ecl-harness-engineer
description: "Create or audit ECL Agent Harness infrastructure: AGENTS.md, change tracking, repository guidance, lint checks, CI gates, and agent handoff docs."
category: development
risk: safe
source: community
source_repo: qinghui316/ecl-harness-engineer
source_type: community
date_added: "2026-06-13"
author: qinghui316
tags: [codex, agent-harness, ecl, workflow, ci]
tools: [codex, claude, cursor, gemini, antigravity]
license: MIT
license_source: "https://github.com/qinghui316/ecl-harness-engineer/blob/main/LICENSE"
---

# ECL Harness Engineer
Design and create Harness Engineering infrastructure so AI agents can work reliably in a codebase.

> **Core Philosophy**: "Intelligence without infrastructure is just a demo." The Agent Harness is the Operating System — the LLM is just the CPU. The repository becomes the single source of truth — if an agent can't see it in context, it doesn't exist.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Use when a repository needs AI-agent collaboration infrastructure such as `AGENTS.md`, `docs/ECL.md`, `docs/STATUS.md`, harness change tracking, or mechanical validation gates.
- Use when auditing an existing Agent Harness for missing ECL lifecycle docs, change templates, lint checks, environment contracts, or CI integration.
- Use when converting repeated agent workflow failures into repository-local documentation, tests, lint rules, or lightweight auto-evolution checks.
- Do not use for ordinary business feature implementation unless the requested work is specifically about creating or improving the repository harness.

## Limitations

- This skill creates or audits harness infrastructure; it does not replace product requirements, implementation planning, code review, or release approval for the target project.
- The generated ECL docs, linters, scripts, and CI examples must be adapted to the repository's actual stack, security model, and existing contributor workflow before enforcement.
- Auto-evolve recommendations are guidance only. Apply harness changes through normal review, validation, and rollback discipline instead of accepting them as autonomous policy changes.
