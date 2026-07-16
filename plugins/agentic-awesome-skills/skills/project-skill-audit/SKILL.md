---
name: project-skill-audit
description: Audit a project and recommend the highest-value skills to add or update.
risk: safe
source: "Dimillian/Skills (MIT)"
date_added: "2026-03-25"
---

# Project Skill Audit

## Overview

Audit the project's real recurring workflows before recommending skills. Prefer evidence from memory, rollout summaries, existing skill folders, and current repo conventions over generic brainstorming.

Recommend updates before new skills when an existing project skill is already close to the needed behavior.

## When to Use
- When the user asks what skills a project needs or which existing skills should be updated.
- When recommendations should be grounded in project history, memory files, and local conventions.

## Workflow

1. Map the current project surface.
   Identify the repo root and read the most relevant project guidance first, such as `AGENTS.md`, `README.md`, roadmap/ledger files, and local docs that define workflows or validation expectations.

2. Build the memory/session path first.
   Resolve the memory base as `$CODEX_HOME` when set, otherwise default to `~/.codex`.
   Use these locations:
   - memory index: `$CODEX_HOME/memories/MEMORY.md` or `~/.codex/memories/MEMORY.md`
   - rollout summaries: `$CODEX_HOME/memories/rollout_summaries/`
   - raw sessions: `$CODEX_HOME/sessions/` or `~/.codex/sessions/`

3. Read project past sessions in this order.
   If the runtime prompt already includes a memory summary, start there.
   Then search `MEMORY.md` for:
   - repo name
   - repo basename
   - current `cwd`
   - important module or file names
   Open only the 1-3 most relevant rollout summaries first.
   Fall back to raw session JSONL only when the summaries are missing the exact evidence you need.

4. Scan existing project-local skills before suggesting anything new.
   Check these locations relative to the current repo root:
   - `.agents/skills`
   - `.codex/skills`
   - `skills`
   Read both `SKILL.md` and `agents/openai.yaml` when present.

5. Compare project-local skills against recurring work.
   Look for repeated patterns in past sessions:
   - repeated validation sequences
   - repeated failure shields
   - recurring ownership boundaries
   - repeated root-cause categories
   - workflows that repeatedly require the same repo-specific context
   If the pattern appears repeatedly and is not already well captured, it is a candidate skill.

6. Separate `new skill` from `update existing skill`.
   Recommend an update when an existing skill is already the right bucket but has stale triggers, missing guardrails, outdated paths, weak validation instructions, or incomplete scope.
   Recommend a new skill only when the workflow is distinct enough that stretching an existing skill would make it vague or confusing.

7. Check for overlap with global skills only after reviewing project-local skills.
   Use `$CODEX_HOME/skills` and `$CODEX_HOME/skills/public` to avoid proposing project-local skills for workflows already solved well by a generic shared skill.
   Do not reject a project-local skill just because a global skill exists; project-specific guardrails can still justify a local specialization.

## Session Analysis

### 1. Search memory index first

- Search `MEMORY.md` with `rg` using the repo name, basename, and `cwd`.
- Prefer entries that already cite rollout summaries with the same repo path.
- Capture:
  - repeated workflows
  - validation commands
  - failure shields
  - ownership boundaries
  - milestone or roadmap coupling

### 2. Open targeted rollout summaries

- Open the most relevant summary files under `memories/rollout_summaries/`.
- Prefer summaries whose filenames, `cwd`, or `keywords` match the current project.
- Extract:
  - what the user asked for repeatedly
  - what steps kept recurring
  - what broke repeatedly
  - what commands proved correctness
  - what project-specific context had to be rediscovered

### 3. Use raw sessions only as a fallback

- Only search `sessions/` JSONL files if rollout summaries are missing a concrete detail.
- Search by:
  - exact `cwd`
  - repo basename
  - thread ID from a rollout summary
  - specific file paths or commands
- Use raw sessions to recover exact prompts, command sequences, diffs, or failure text, not to replace the summary pass.

### 4. Turn session evidence into skill candidates

- A candidate `new skill` should correspond to a repeated workflow, not just a repeated topic.
- A candidate `skill update` should correspond to a workflow already covered by a local skill whose triggers, guardrails, or validation instructions no longer match the recorded sessions.
- Prefer concrete evidence such as:
  - "this validation sequence appeared in 4 sessions"
  - "this ownership confusion repeated across extractor and runtime fixes"
  - "the same local script and telemetry probes had to be rediscovered repeatedly"

## Recommendation Rules

- Recommend a new skill when:
  - the same repo-specific workflow or failure mode appears multiple times across sessions
  - success depends on project-specific paths, scripts, ownership rules, or validation steps
  - the workflow benefits from strong defaults or failure shields

- Recommend an update when:
  - an existing project-local skill already covers most of the need
  - `SKILL.md` and `agents/openai.yaml` drift from each other
  - paths, scripts, validation commands, or milestone references are stale
  - the skill body is too generic to reflect how the project is actually worked on

- Do not recommend a skill when:
  - the pattern is a one-off bug rather than a reusable workflow
  - a generic global skill already fits with no meaningful project-specific additions
  - the workflow has not recurred enough to justify the maintenance cost

## What To Scan

- Past sessions and memory:
  - memory summary already in context, if any
  - `$CODEX_HOME/memories/MEMORY.md` or `~/.codex/memories/MEMORY.md`
  - the 1-3 most relevant rollout summaries for the current repo
  - raw `$CODEX_HOME/sessions` or `~/.codex/sessions` JSONL files only if summaries are insufficient

- Project-local skill surface:
  - `./.agents/skills/*/SKILL.md`
  - `./.agents/skills/*/agents/openai.yaml`
  - `./.codex/skills/*/SKILL.md`
  - `./skills/*/SKILL.md`

- Project conventions:
  - `AGENTS.md`
  - `README.md`
  - roadmap, ledger, architecture, or validation docs
  - current worktree or recent touched areas if needed for context

## Output Expectations

Return a compact audit with:

1. `Existing skills`
   List the project-local skills found and the main workflow each one covers.

2. `Suggested updates`
   For each update candidate, include:
   - skill name
   - why it is incomplete or stale
   - the highest-value change to make

3. `Suggested new skills`
   For each new skill, include:
   - recommended skill name
   - why it should exist
   - what would trigger it
   - the core workflow it should encode

4. `Priority order`
   Rank the top recommendations by expected value.

## Naming Guidance

- Prefer short hyphen-case names.
- Use project prefixes for project-local skills when that improves clarity.
- Prefer verb-led or action-oriented names over vague nouns.

## Failure Shields

- Do not invent recurring patterns without session or repo evidence.
- Do not recommend duplicate skills when an update to an existing skill would suffice.
- Do not rely on a single memory note if the current repo clearly evolved since then.
- Do not bulk-load all rollout summaries; stay targeted.
- Do not skip rollout summaries and jump straight to raw sessions unless the summaries are insufficient.
- Do not recommend skills from themes alone; recommendations should come from repeated procedures, repeated validation flows, or repeated failure modes.
- Do not confuse a project's current implementation tasks with its reusable skill needs.

## Follow-up

If the user asks to actually create or update one of the recommended skills, switch to `$skill-creator` and implement the chosen skill rather than continuing the audit.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
