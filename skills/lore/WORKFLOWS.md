# Workflows

lore has seven workflows. This document explains when to use each one, in plain language. For the operational specification the agent follows when running them, see [`SKILL.md`](SKILL.md).

> [中文版](./WORKFLOWS.zh-CN.md)

## Overview

| Workflow | What it does | Frequency |
|---|---|---|
| [`init`](#init) | Set up `.lore/` and platform mirror files | Once per project |
| [`sync`](#sync) | Update `.lore/` after a code change | After each feature |
| [`query`](#query) | Search `.lore/` for an answer | Every session |
| [`audit`](#audit) | Find stale or contradictory entries | Quarterly |
| [`compress`](#compress) | Rebuild `SUMMARY.md` | When SUMMARY is stale |
| [`mirror`](#mirror) | Regenerate platform files from `.lore/` | After batch of syncs |
| [`history`](#history) | Show git commits for an entry / file / scope | When investigating |

---

## `init`

**One-line**: Create `.lore/` and take over your existing `CLAUDE.md` / `AGENTS.md`.

**When you say it**: "lore init" — once per project, or when adding lore to a project that already has platform files.

**What happens**:
1. Agent scans for existing platform files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, etc.)
2. For each file found, asks you: take over / preserve / abort
3. Detects monorepo structure (pnpm workspaces, Cargo workspace, etc.) and proposes scope list
4. Writes initial `.lore/` draft (entries with `#added:<today>` + deterministic IDs)
5. Shows you a summary of what will be created
6. On your confirm: moves draft to `.lore/`, generates `SUMMARY.md`, refreshes platform files

**Real scenarios**:
- New project, first time using lore → `lore init`
- Old project already has `CLAUDE.md`, want lore to manage it → `lore init` and take over
- Monorepo with separate `frontend/` and `backend/` → init detects both, asks for scope names

**Output**: Full `.lore/` directory + updated platform files + populated `.config.json`.

---

## `sync`

**One-line**: After a code change, update `.lore/` with what changed.

**When you say it**: "lore sync" — after committing a feature, refactor, or new dependency.

**What happens**:
1. Agent runs `git diff --stat HEAD` to see what changed
2. If changes are significant (≥50 lines / ≥2 dirs, or new module/dir/dep), agent proactively proposes
3. For each change, agent classifies it as `[NEW]` / `[STALE]` / `[REFINED]`
4. Emits a proposal with markers
5. You accept or reject per marker
6. Accepted markers get applied to `.lore/*.md`

**Real scenarios**:
- "I just added a new dependency — update lore" → `lore sync`
- "We decided to stop using React Query, switch to SWR" → `lore sync` after the code change
- "There's a new module — capture it" → `lore sync`

**Output**: Updated `.lore/*.md` files with new entries (and `#verified` / `#stale` tags where appropriate).

**Note**: `sync` does NOT update platform mirror files (that's a separate `mirror` command). Reason: keeps `git log` of agent-facing files readable.

---

## `query`

**One-line**: Search `.lore/` for an answer to a question.

**When you say it**: "lore query <term>" — any time you want to know what's in memory.

**What happens**:
1. Agent reads `.lore/SUMMARY.md` (the table of contents)
2. Fuzzy matches your query against entries
3. Returns matched entries with stable `[file#ID]` references
4. Optionally drills into specific scope files for more detail

**Real scenarios**:
- "What database does this project use?" → `lore query database`
- "Why did we pick Zustand?" → `lore query zustand`
- "What are the conventions for backend modules?" → `lore query backend:conventions`

**Output**: Bounded list of matched entries:

```
[_global/DECISIONS.md#DEC-2026-07-11-6137] Picked OpenAI-compatible LLM API
[scopes/backend/CONVENTIONS.md#CONV-2026-07-11-9b89] Embedding has two backends
```

The `[file#ID]` reference lets the agent `cat` the file for full text.

---

## `audit`

**One-line**: Find stale or contradictory entries in `.lore/`.

**When you say it**: "lore audit" — quarterly review, or before a big refactor.

**What happens**:
1. Runs `find_stale.py` to find entries with `#added` > 90 days ago and no `#verified`
2. Runs `find_duplicates.py` to find entries that contradict each other
3. Cross-checks entry-referenced code paths against current filesystem
4. Emits an `[ALERT]` report

**Real scenarios**:
- "Are there any lore entries that contradict the current code?" → `lore audit`
- Quarterly hygiene check → `lore audit`
- Before onboarding a new contributor → `lore audit` to clean up stale entries

**Output**: A report grouped by issue type:

```
[ALERT] 5 entries may be stale (no #verified in >90 days):
  - ARCH-2026-01-15-d7a3  last verified 2026-04-12
  ...

[ALERT] 2 entries contradict current code:
  - CONV-2026-03-01-1f8c  says "use webpack"; project now uses Vite
```

**Note**: `audit` does NOT modify files. To act on findings, run `sync` with proposal-driven updates.

---

## `compress`

**One-line**: Rebuild `.lore/SUMMARY.md` from current entries.

**When you say it**: "lore compress" — when SUMMARY is stale (entries > 500, or > 30 days since last compress), or before sharing lore with someone new.

**What happens**:
1. Enumerates all entries via `list_entries.py`
2. Skips recently-stale entries
3. For each `(scope, layer)` pair, picks 3–5 most important entries
4. Writes `SUMMARY.md` per template
5. If `auto_mirror: true` in config, regenerates platform mirrors; otherwise asks per target and only writes the ones you accept. (This is the second mirror update trigger — `sync` deliberately does not regenerate mirrors.)
6. Stops after mirror regeneration has either written or been declined per target.

**Real scenarios**:
- "Refresh the summary" → `lore compress`
- "I haven't compressed in 2 months" → `lore compress`
- "Onboard a new contributor — make sure SUMMARY is fresh" → `lore compress`

**Output**: Updated `SUMMARY.md` (and possibly mirror files).

**Idempotent**: Running twice produces the same result (modulo date stamp).

---

## `mirror`

**One-line**: Regenerate platform files (`CLAUDE.md`, `AGENTS.md`, etc.) from current `.lore/`.

**When you say it**: "lore mirror" — after a batch of syncs, or to manually sync mirrors after editing `.lore/*.md`.

**What happens**:
1. Reads current `.lore/SUMMARY.md` and scope indices
2. For each target, detects section boundary (`## Lore` / `---` / `## My notes`)
3. Computes new Lore section content
4. **Content-based dedup**: skips write if byte-identical to existing
5. Replaces Lore section; preserves My notes verbatim
6. Writes file back

**Real scenarios**:
- "I just did a batch of syncs — update the agent-facing files" → `lore mirror`
- "I edited `.lore/SUMMARY.md` manually — propagate to mirrors" → `lore mirror`
- "Verify the mirror hasn't drifted" → `lore mirror` (no-op reports confirm)

**Output**: Updated `CLAUDE.md` / `AGENTS.md` / etc., or "No changes needed" if nothing changed.

---

## `history`

**One-line**: Show git commits related to an entry, file, or scope.

**When you say it**: "lore history <entry-id>|<file-path>|--scope=<name>" — when investigating "why does this exist" or "when did this change".

**What happens**:
- **Entry form**: `lore history DEC-2026-02-03-7c19` — finds the entry, derives its `#added` date, runs `git log --since=<date>` on the referenced code file
- **File form**: `lore history frontend/src/store.ts` — runs `git log --since=1970` on that path
- **Scope form**: `lore history --scope=frontend` — runs file form on every `.lore/scopes/frontend/*.md`

**Real scenarios**:
- "Why did we pick Postgres?" → find the entry via `query`, then `lore history <id>`
- "When did this file change?" → `lore history <file>`
- Debugging: "what's the recent history of this module?" → `lore history <path>`

**Output**:

```markdown
# history: [DEC-2026-02-03-7c19]

  abc1234  2026-05-12  refactor: extract chat agent_loop (#87)
  def5678  2026-03-08  feat: switch chat chain to chat_fast (#74)
```

---

## Quick reference

| I want to... | Use |
|---|---|
| Start lore on a project | `init` |
| Update lore after a code change | `sync` |
| Find what's in memory | `query` |
| Find stale entries | `audit` |
| Refresh the summary | `compress` |
| Update agent-facing files | `mirror` |
| Trace why something exists | `history` |

For the operational specification (what the agent actually does step-by-step), see [`SKILL.md`](SKILL.md). For per-platform file mapping (which platforms read which files), see [`references/platform-mirrors.md`](references/platform-mirrors.md).