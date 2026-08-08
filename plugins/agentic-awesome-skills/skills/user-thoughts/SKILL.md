---
name: user-thoughts
description: >-
  Persist user decisions and project constraints to mdbase across sessions.
  Trigger on /user-thoughts or /ustht, or when the user discusses architecture,
  tech stack, rules, UI/UX, or project memory.
license: MIT
source: "https://github.com/JularDepick/user-thoughts.SKILL"
source_repo: JularDepick/user-thoughts.SKILL
source_type: community
date_added: "2026-05-31"
author: JularDepick
tags: [userthoughts, documentation, project-management, mdbase]
tools: [claude, cursor, gemini]
risk: safe
allowed-tools: read write bash
metadata:
  author: JularDepick
  category: productivity
  supported_agents: "[claude, cursor, gemini]"
---

# user-thoughts.SKILL

## Overview

Across sessions and across agents, project decisions and user constraints are easy to lose. `user-thoughts` persists those decisions into a project-local `mdbase` so any future agent can recover the user's intent without re-deriving it from scratch.

The skill records user intent. It does not replace normal task execution. If the user says, "make the button red," the agent should both make the change and record the preference when persistent project memory is useful.

## When to Use

Use this skill when the user states or revises:

- Project rules, constraints, preferences, or requirements.
- Architecture, tech-stack, data-model, deployment, or workflow decisions.
- UI/UX direction, copy standards, visual preferences, or design rationale.
- Backlog items, planned work, rejected options, or decisions that future agents should inherit.
- A direct command beginning with `/user-thoughts` or `/ustht`.

Do not use it for unrelated small talk, transient chatter, or content the user explicitly asks to ignore.

## Language Policy

- All bundled skill files, scripts, templates, and reference docs are written in English.
- Agent-facing command output should follow the user's current conversation language when the agent can reasonably do so.
- Raw user thoughts should preserve the user's original wording. Do not translate, summarize, or clean the user's intent unless the user asks for that.

## Core Workflow

```text
User message -> Agent identifies persistent project intent -> write to #raw/
             -> /ustht sortin groups raw entries into #mdbase/
             -> /ustht mdbase show exposes the organized memory base
```

## Runtime Modes

- Passive mode: `INSTANT_STATUS=off`; only explicit skill commands run.
- Instant mode: `INSTANT_STATUS=on` and `SKILL_STATUS=on`; project-relevant user thoughts are written to `#raw/` as they appear.
- Ignore mode: `ignore start` and `ignore end` mark a temporary interval that should not be recorded.
- Read-only mode: if required read/write/bash tools are unavailable, show commands can still work but write commands should explain that the environment cannot persist data.

`SKILL_STATUS=off` pauses instant capture even when `INSTANT_STATUS=on`. Ignore intervals are context-local and do not persist across sessions.

## Path Definitions

- `@/`: the installed `user-thoughts/` skill directory.
- `~/`: the current project working directory.
- `#ustht/`: `~/.ustht/`.
- `#mdbase/`: `~/.ustht/mdbase/`.
- `#ignored/`: `~/.ustht/ignored/`.
- `#raw/`: `~/.ustht/raw/`.
- `#export/`: `~/.ustht/export/`.

## Runtime Directory Layout

```text
.ustht/
├── define.ini
├── README.ai.md
├── raw/
│   └── yyyy-mm-dd.md
├── ignored/
│   └── yyyy-mm-dd.md
├── mdbase/
│   ├── backlog.md
│   ├── README.ai.md
│   └── details/
│       ├── rules.md
│       ├── plans.md
│       ├── ui/
│       │   ├── outline.md
│       │   └── details.md
│       ├── dev-stack.md
│       └── general.md
└── export/
```

## Tools and Environment

Required tools:

- read/write: read and update files under `#ustht/`.
- bash: create directories and run bundled scripts.

Optional tool:

- SubAgent: when available, use it for semantic `sortin` or `resort` maintenance that spans many files. Use the main agent directly only when subagents are unavailable.

## Bundled Scripts

The `scripts/` directory provides small Python helpers for mechanical operations:

| Script | Purpose | Example |
|---|---|---|
| `common.py` | Shared helpers | Imported by other scripts |
| `status.py` | Show current runtime state | `python @/scripts/status.py` |
| `init.py` | Initialize `.ustht/` | `python @/scripts/init.py` |
| `show_raw.py` | Show unprocessed raw entries | `python @/scripts/show_raw.py` |
| `show_mdbase.py` | Show mdbase index or a dimension | `python @/scripts/show_mdbase.py show --all` |
| `sortin.py` | Soft-maintain raw entries into mdbase | `python @/scripts/sortin.py --dry` |
| `write_raw.py` | Append one raw thought | `python @/scripts/write_raw.py "Use REST APIs" --dim dev-stack` |
| `toggle.py` | Toggle skill or instant mode | `python @/scripts/toggle.py instant on` |
| `ignore_ops.py` | Manage ignored entries | `python @/scripts/ignore_ops.py show` |

`resort` has no standalone script because it requires semantic review, deduplication, and restructuring by an agent.

## define.ini

`define.ini` stores simple key/value runtime state:

| Key | Value | Meaning |
|---|---|---|
| `SKILL_STATUS` | `on` or `off` | Whether the skill accepts write operations |
| `INSTANT_STATUS` | `on` or `off` | Whether instant capture is enabled |
| `LAST_SORTIN` | `yyyy-mm-dd HH:MM` or empty | Last soft-maintenance time |

Write the file atomically by replacing its complete contents. Do not append partial key/value fragments.

## Commands

Commands may use either `/user-thoughts` or `/ustht`.

### Status and Toggles

- `/ustht init`: create `.ustht/` and copy templates.
- `/ustht status`: show status, raw counts, and dimension counts.
- `/ustht skill`: show skill status.
- `/ustht skill on|off`: enable or disable writes.
- `/ustht instant`: show instant-capture status.
- `/ustht instant on|off`: enable or disable instant capture.

### Maintenance

- `/ustht sortin [--dry]`: append unprocessed raw entries into mdbase.
- `/ustht resort [--dry]`: semantically review and reorganize all mdbase content.

### Ignore Management

- `/ustht ignore start|end`: start or end an ignore interval.
- `/ustht ignore --last`: remove the last raw entry and record it in `#ignored/`.
- `/ustht ignore`: same as `--last` when used as a standalone command.
- `/ustht ignore show`: list ignored entries.
- Any message ending in `/ustht ignore` or `/user-thoughts ignore`: ignore that message.

### Content Review and Export

- `/ustht raw`: show unprocessed raw entries.
- `/ustht mdbase show [--all|--dimension]`: show the index, all dimensions, or one dimension.
- `/ustht mdbase export [--all|--dimension]`: export mdbase content to `#export/`.
- `/ustht import <path>`: scan markdown files under a safe project-local path and merge project-relevant decisions into mdbase.

Chain commands with `&&`, for example `/ustht skill on && instant on`.

## Instant Capture

When instant mode is active:

1. Decide whether the user message contains project-relevant intent.
2. Write one raw line per independent thought using `- [HH:MM] original text | suggested-dim:dimension`.
3. Do not update mdbase directly; wait for `sortin`.
4. Skip ignored messages and ignore intervals.
5. Keep normal user work moving. Recording should not block task execution.
6. If one day accumulates more than five raw entries, suggest `/ustht sortin`.

## Sortin and Resort

`sortin` is soft maintenance:

1. Read unprocessed `#raw/*.md` files.
2. Parse entries and their suggested dimensions.
3. Append them to matching `#mdbase/` files grouped by date.
4. Mark processed raw files with `<!-- processed -->` on the first line.
5. Update `LAST_SORTIN` and the mdbase index.

`resort` is hard maintenance:

1. Review all mdbase files.
2. Deduplicate overlapping records.
3. Move entries into better dimensions when justified by the user's own wording.
4. Mark deprecated dimensions instead of deleting them unless the user explicitly requests deletion.
5. Preserve provenance and user wording.

## Best Practices

- Record explicit user decisions faithfully.
- Do not over-infer. Store only what the user said or what follows directly from it.
- Preserve original wording, including negations, numbers, links, constraints, and tradeoffs.
- Split one message into multiple records when it contains independent decisions.
- Resolve conflicts by treating the newest user statement as current while preserving the older record as historical context.
- Put unmatched project-relevant items in `general.md` instead of inventing too many dimensions.
- Do not record unrelated conversation.

## Limitations

- The skill records intent; it does not validate whether the user's idea is correct, feasible, secure, or internally consistent.
- Dimension assignment depends on agent judgment and may need user correction through `resort`.
- Ignore intervals are context-local and do not persist across sessions.
- `.ustht/` can contain sensitive information. The skill does not redact content; users must use ignore commands or repository hygiene to manage sensitive data.
- The workflow is not file-lock based. In multi-agent environments, agents must coordinate to avoid conflicting writes.

## Safety Rules

- Keep all runtime writes inside `#ustht/`.
- Validate dimension names: lowercase letters, digits, hyphens, and `/` subdirectories only; no `..`, backslashes, spaces, absolute paths, or reserved names.
- Do not execute user-provided shell commands.
- Do not recursively copy directories with shell commands during initialization; copy known template files safely.
- Treat `<!-- processed -->` as meaningful only when it is the first line of a raw file.
- Never silently delete dimension files; mark deprecated content unless the user explicitly asks for deletion.

More detail is available in `references/safety.md`, `references/sortin.md`, `references/commands.md`, and `references/edge-cases.md`.

## Related Skills

None. This skill is intentionally focused on project-local user intent persistence.
