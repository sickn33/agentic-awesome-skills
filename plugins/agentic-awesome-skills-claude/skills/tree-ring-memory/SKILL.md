---
name: tree-ring-memory
description: "Use Tree Ring Memory for local-first AI-agent memory lifecycle work: recall, evidence, audit, forgetting, and consolidation without transcript dumping."
category: development
risk: safe
source: community
source_repo: TerminallyLazy/Tree-Ring-Memory
source_type: community
date_added: "2026-07-08"
author: TerminallyLazy
tags: [agent-memory, local-first, recall, privacy, codex, sqlite, cli]
tools: [claude, codex, cursor, gemini, antigravity, opencode]
license: "Apache-2.0"
license_source: "https://github.com/TerminallyLazy/Tree-Ring-Memory/blob/main/LICENSE"
---

# Tree Ring Memory

## Overview

Tree Ring Memory is a framework-agnostic, local-first memory lifecycle layer for
AI agents. Use this skill when an agent should recall, preserve, audit, or
forget durable project memory without treating raw conversation transcripts as
memory.

The public runtime is a Rust CLI/TUI with local SQLite/FTS storage, scoped
recall, evidence records, audit, deterministic consolidation, maintenance,
DOX/Revolve source adapters, framework discovery, redaction, and explicit
forgetting.

## When to Use This Skill

- Use before resuming a project where prior decisions, warnings, preferences,
  or failed approaches may matter.
- Use before changing architecture, storage, security, privacy, release, or
  agent-memory behavior.
- Use when the user asks to remember, recall, audit, redact, forget, or
  consolidate agent memory.
- Use after tests, reviews, incidents, or production behavior validate a lesson
  future agents should preserve.
- Use when a project contains `.tree-ring/SKILL.md`, `.tree-ring/CLI.md`, or
  other Tree Ring bridge files.

## How It Works

### Step 1: Discover Local Guidance

Check whether the current project already has Tree Ring guidance:

```bash
test -f .tree-ring/SKILL.md && sed -n '1,220p' .tree-ring/SKILL.md
test -f .tree-ring/CLI.md && sed -n '1,220p' .tree-ring/CLI.md
```

Treat project-local `.tree-ring` files as more authoritative than generic
examples in this skill. If the CLI is installed, inspect the current command
surface before assuming flags:

```bash
tree-ring --help
tree-ring recall --help
tree-ring remember --help
tree-ring evidence --help
tree-ring audit --help
tree-ring forget --help
```

If Tree Ring is not installed, do not run remote installer commands
automatically. Point the user to the project repository or install docs and ask
whether they want installation help.

## Step 2: Recall Before Risky Work

Use narrow, project-scoped recall first:

```bash
tree-ring recall "release behavior" --scope project
tree-ring recall "sqlite migration" --scope project
tree-ring recall "user preference" --scope global
```

Use recalled memory as context, not authority. Verify it against current source
files, tests, docs, issues, pull requests, logs, and runtime state before making
changes.

## Step 3: Write Only Durable Memory

Write concise memory only when it is likely to help future agents:

```bash
tree-ring remember "Run project-scoped recall before release changes." --event-type lesson --scope project
```

Prefer specific event types when supported locally:

- `decision`
- `lesson`
- `warning`
- `correction`
- `user_preference`
- `tool_result`
- `summary`
- `hypothesis`

Store the durable lesson, decision, warning, or follow-up. Do not store the
full conversation.

## Step 4: Record Evidence for Evaluated Outcomes

Use evidence records for test runs, incidents, reviewed changes, or other
evaluated outcomes:

```bash
tree-ring evidence \
  --outcome observed \
  --summary "Installer smoke test passed in an isolated HOME." \
  --evidence-ref "ci/install-smoke/2026-07-08"
```

Outcome guidance:

- `promoted`: durable truth backed by strong evidence
- `rejected`: failed or rolled-back approach worth keeping visible
- `deferred`: unresolved idea or future option
- `observed`: normal evaluated result

Do not promote weak, stale, or unreviewed claims to durable truth.

## Step 5: Use Source Adapters Carefully

When a repo has structured source records, run dry runs first:

```bash
tree-ring dox sync --source-root . --dry-run
tree-ring revolve sync --source-root revolve --dry-run
tree-ring integrations scan --source-root .
```

Only write adapter summaries when they are concise, source-linked, useful, and
privacy-safe. Imported memory does not replace the underlying `AGENTS.md`,
Revolve record, test, pull request, issue, or documentation.

## Ring Selection

Use the smallest durable ring that fits:

- `cambium`: active or recent task context
- `outer`: recent decisions and task lessons
- `inner`: older compressed project knowledge
- `heartwood`: durable high-confidence truths
- `scar`: failures, regressions, rejected approaches, warnings
- `seed`: unresolved ideas, hypotheses, follow-ups

Prefer `outer` or `seed` unless the user confirms durability or the evidence is
strong.

## Best Practices

- Recall before risky or repeat work.
- Keep project memory project-scoped unless it is a durable cross-project user
  preference.
- Attach source references such as file paths, issue ids, PR ids, evaluation
  runs, or docs paths.
- Re-check current source files and runtime state before acting on recalled
  memory.
- Ask at closeout what future agents should remember, avoid, or revisit.
- Use redaction, deletion, or supersession when memory is wrong, stale,
  sensitive, or replaced by a newer decision.

## Security & Safety Notes

- Never use Tree Ring Memory as a hidden recorder.
- Do not store secrets, credentials, tokens, private keys, recovery codes, raw
  chain-of-thought, or temporary scratchpad content.
- Do not store sensitive personal data unless the user explicitly asks and the
  retention boundary is safe.
- Do not store copyrighted source text beyond short allowed excerpts.
- Do not run installer, network, destructive, or mutation commands without
  explicit user approval and a clear target environment.
- Treat all examples as commands to adapt after checking local `--help`, not as
  guaranteed command surfaces.

## Limitations

- Tree Ring Memory is not a replacement for source control, issue trackers,
  documentation, tests, logs, or live runtime verification.
- Recalled memory can be stale or wrong. Always verify important claims against
  the current project before using them to make changes.
- The CLI surface can change across releases. Prefer local `.tree-ring`
  guidance and `tree-ring --help` over copied command examples.
- It should not be used for secret storage, comprehensive transcript archives,
  compliance retention, or unreviewed collection of sensitive personal data.
- Cross-agent interoperability depends on each tool's ability to call the local
  CLI or read project-local guidance files.

## Common Pitfalls

- **Problem:** Recalled memory conflicts with current source.
  **Solution:** Treat source files, tests, docs, and runtime evidence as
  authoritative; supersede or forget stale memory.

- **Problem:** Memory starts becoming transcript storage.
  **Solution:** Store only durable decisions, warnings, preferences, outcomes,
  and follow-ups.

- **Problem:** A lesson is useful but contains sensitive detail.
  **Solution:** Store a redacted summary or do not store it.

## Related Skills

- `@agent-memory-systems` - Use for broad agent-memory architecture choices.
- `@agent-memory` - Use for the listed hybrid memory MCP system.
- `@planning-with-files` - Use when simple persistent files are enough.

## Additional Resources

- Tree Ring Memory repository: <https://github.com/TerminallyLazy/Tree-Ring-Memory>
- Codex plugin wrapper: <https://github.com/TerminallyLazy/tree-ring-memory-codex-plugin>
