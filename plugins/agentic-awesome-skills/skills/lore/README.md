# lore

<p align="center">
  <img src="docs/lore-poster.svg" alt="lore" width="100%">
</p>

<p align="center"><em><strong>lore</strong> (noun) — a body of traditions and knowledge on a subject, passed from person to person. — Oxford English Dictionary</em></p>

<p align="right"><a href="README.zh-CN.md">简体中文</a> · English (this page)</p>

> Framework-agnostic project memory for AI coding agents.

A long-term knowledge base for software projects, maintained by AI agents. Captures the kind of context that normally lives only in the original developer's head — architecture, decisions, conventions — and persists it as plain Markdown files that any agent can consume.

> **lore is a SKILL, not a CLI tool.** It is a Markdown spec ([`SKILL.md`](SKILL.md)) that AI coding agents — Claude Code, Cursor, OpenCode, Cline, Aider, GitHub Copilot — read to gain long-term project memory. You do not `npm install` or `pip install` lore; you give your agent the URL and ask it to install the skill. From then on, phrases like `lore init` and `lore sync` are commands you say to your agent, **not** commands you type in a terminal. There is no `lore` binary on your `PATH`.

## Installation

```bash
git clone https://github.com/TheaDust/lore.git <your-agent-skills-dir>
```

Or, simpler — tell your agent:

> Install https://github.com/TheaDust/lore as a skill.

Each agent host loads skills from its own directory (`~/.claude/skills/` for Claude Code, `<project>/.claude/skills/` for project-scoped, etc.). Your agent knows its own skills directory and can clone the repo into the right place.

> Looking for a specific doc? Jump to: [Quick start](#quick-start) · [What it looks like](#what-this-looks-like) · [What lives in `.lore/`](#what-lives-in-lore) · [Seven workflows](#seven-workflows) · [Platform mirrors](#platform-mirrors) · [Configuration](#configuration) · [Upgrading](#upgrading) · [FAQ](#faq). Full reference docs live in [`references/`](references/). **Want plain-language "when to use each workflow"?** See [`WORKFLOWS.md`](WORKFLOWS.md) (also in [中文](WORKFLOWS.zh-CN.md)).

## What it solves

When you work on a project across multiple AI tools (Claude Code, Cursor, Cline, GitHub Copilot, Aider, LangGraph agents, DeepAgents) and across many sessions, context gets lost:

- **Every new session re-explains the project.** "We're using Next.js App Router, not Pages. Use Zustand, not Redux. Don't commit secrets."
- **Decisions are forgotten.** "Why did we pick X over Y?" → "I don't remember, let me ask the team."
- **Agents disagree with each other.** Cursor follows `.cursorrules`, Claude Code follows `CLAUDE.md`, but the two files drift apart.
- **Onboarding takes weeks.** New members / new agents need to learn the conventions from scratch.

lore maintains a single source of truth (`.lore/`) and projects it into whatever config files your agents already read. It tracks *why* decisions were made, not just *what* the code does, and keeps that history across sessions and tools.

## Quick start

The commands below are **phrases you say to your agent** — there is no `lore` binary. With this skill loaded, your agent runs each phrase through the workflow defined in [`SKILL.md`](SKILL.md). Anything you'd normally type into a terminal goes to the agent instead.

```bash
# 1. Initialize (run once per project)
lore init
# Walks the project, drafts entries, asks for confirmation, creates .lore/

# 2. After a non-trivial change
lore sync
# Detects code diffs, proposes [NEW]/[STALE]/[REFINED] entries, waits for your call

# 3. After many changes, refresh the agent-facing summary
lore compress
# Regenerates SUMMARY.md and updates CLAUDE.md / .cursorrules / etc.

# 4. Force a mirror refresh (e.g. after hand-editing .lore/)
lore mirror
# Rewrites CLAUDE.md and other platform files from current state
```

Three read-only commands round out the toolkit:

```bash
lore query                          # Answer a question from memory, cite entry IDs
lore audit                          # Check memory vs. reality, write report to .lore/audit/
lore history DEC-2026-02-03-7c19    # Show git commits that touched an entry's code
lore history frontend/src/store.ts  # ...or a file
lore history --scope=frontend       # ...or every lore file in a scope
lore history --json                 # machine-readable
```

## What this looks like

### Querying memory

> You: "How does this project authenticate API requests?"
> Agent (uses `lore query auth`):

```
Found 6 entries matching 'auth':

  [_global/DECISIONS.md#DEC-2026-07-10-6d9c]
    Opaque base64 tokens over JWT; reason: simpler revocation, no library dep.

  [scopes/backend/ARCHITECTURE.md#ARCH-2026-07-10-59ac]
    Auth helpers in backend/app/auth.py:
    hash_password, issue_token, login_required decorator.

  [scopes/backend/CONVENTIONS.md#CONV-2026-07-10-84e3]
    Missing/invalid token returns 401; resource not found returns 404.

  [scopes/frontend/ARCHITECTURE.md#ARCH-2026-07-10-6de2]
    Auth token stored in localStorage under todo.auth.token key.

  [scopes/frontend/DECISIONS.md#DEC-2026-07-10-c1ea]
    Axios over raw fetch; reason: interceptors for auth header injection.
```

Every answer cites the exact `[file#ID]` so you can `cat` the entry or run `lore history <ID>` to see why the decision exists.

### What `CLAUDE.md` looks like

`lore` keeps per-session cost flat by emitting a small index, not the full memory:

```markdown
## Lore (auto-managed)

Project memory. Read deeper on demand.

**Structure**:
- Digest: `.lore/SUMMARY.md` (top-level overview)
- Global: `.lore/_global/` (architecture, decisions, conventions)
- Scopes: `.lore/scopes/`
  - `.lore/scopes/backend/` (Flask 3 + SQLAlchemy 2 + pytest; Python 3.11+)
  - `.lore/scopes/frontend/` (React 18 + TypeScript + Vite + Zustand + Axios)
  - `.lore/scopes/shared/` (TypeScript types mirrored as Python dataclasses)

**Query**: `lore query <term>` or `lore query <scope>:<term>`
**Update**: see the `lore` skill (init / sync / query / audit / compress / mirror)

---
## My notes (free edit)

- Anything you write here is preserved verbatim across every sync.
```

### Git traceability with `lore history`

> `lore history DEC-2026-07-10-e45d` (asking "why did we choose bcrypt?")

```
# history: [DEC-2026-07-10-e45d]

> Entry: scopes\backend\DECISIONS.md
> Since: 2026-07-10 (entry #added date)
> File: backend
> Commits: 2 (showing all)

## 9f264f4 (2026-07-10, Lore Tester)
feat(backend): add alembic migrations and switch password hashing to bcrypt

## ed2b288 (2026-07-10, Lore Tester)
feat(backend): password hashing and JWT-style auth tokens

## Suggested next step
Run `lore sync` to check whether any of these commits
introduce a [REFINED] candidate for this entry.
```

The agent reads the commit messages and tells you *why* — without you having to manually dig through `git log`.

## What lives in `.lore/`

```
.lore/
├── SUMMARY.md                    # Top-level digest; new agents read this first
├── _global/                      # Cross-scope facts
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── CONVENTIONS.md
├── scopes/                       # Per-scope facts (frontend / backend / shared)
│   └── <scope>/
│       ├── ARCHITECTURE.md
│       ├── DECISIONS.md
│       └── CONVENTIONS.md
├── draft/                        # Used by `init` for proposals pending confirmation
├── audit/                        # Used by `audit` for reports
└── archive/                      # Old/superseded entries
```

Each entry is a single Markdown bullet (≤ 2 lines) with a deterministic ID and inline status tags:

```markdown
- [ARCH-2026-07-09-a3f2] Use Next.js App Router; reason: streaming + RSC. #added:2026-07-09
- [DEC-2026-02-03-7c19] Chose Zustand over Redux; reason: 60% less boilerplate. #added:2026-02-03 #verified:2026-06-15
- [CONV-2026-01-20-b1e8] Never commit secrets; use `dotenv` + `.env.local` (gitignored). #added:2026-01-20
```

For the full format spec (ID generation, tags, splitting rules), see [`references/entry-format.md`](references/entry-format.md).

## Seven workflows

| Command | What it does | Writes | Reference |
|---|---|---|---|
| `init` | First-time project scan; drafts entries; user confirms | `.lore/*` + platform mirrors | [SKILL.md](SKILL.md#init--initialize-the-memory-bank) |
| `sync` | Detects code changes; proposes updates; user approves | `.lore/*` only (not mirrors) | [SKILL.md](SKILL.md#sync--update-after-a-change) |
| `query` | Read-only; answers from memory with entry IDs | nothing | [SKILL.md](SKILL.md#query--answer-from-memory) |
| `audit` | Read-only; checks memory vs. current code; writes report | `.lore/audit/*` only | [`references/audit-template.md`](references/audit-template.md) |
| `compress` | Generates `SUMMARY.md` from current entries | `SUMMARY.md` + platform mirrors | [`references/summary-template.md`](references/summary-template.md) |
| `mirror` | Force-regenerate platform mirrors (with content dedup) | `CLAUDE.md`, `.cursorrules`, etc. | [`references/platform-mirrors.md`](references/platform-mirrors.md) |
| `history` | Read-only; lists git commits related to an entry / file / scope | nothing | [`references/history-command.md`](references/history-command.md) |

For a plain-language explanation of each workflow (when you'd actually use each one, with real scenarios), see [`WORKFLOWS.md`](WORKFLOWS.md) (中文版: [`WORKFLOWS.zh-CN.md`](WORKFLOWS.zh-CN.md)).

`sync` deliberately does **not** update platform mirrors. Mirror files are agent-facing entry points, not per-change logs. Regenerating them on every `sync` would clutter `git log` and dilute the "human-merged" signal they're supposed to provide. Run `lore mirror` (or `compress`) when you want the agent-facing view to catch up.

To restore old behavior (mirror updates on every `sync`), set `"sync_updates_mirror": true` in `.lore/.config.json`.

## Sync trust levels

`sync` can auto-apply or require confirmation depending on the change type and the configured trust level:

| Change type | `high` | `medium` (default) | `low` |
|---|---|---|---|
| De-duplicate hit | auto | auto | confirm |
| Equivalent REFINED | auto | auto | confirm |
| `NEW` entry | auto | confirm | confirm |
| `STALE` mark | auto | confirm | confirm |
| `ALERT` | confirm | confirm | confirm |

The default `medium` is a balance: low-risk changes apply silently, real additions or contradictions still get your sign-off. Switch to `high` for high-confidence projects (you trust the agent fully) or `low` if you want to review every change.

## Platform mirrors

lore's canonical store is `.lore/*`, but it projects into the config files agents already read. Targets are resolved by scanning the repo root for existing platform files (auto-detect). When none are present, `lore init` asks via multi-select which agents to write for. Setting `mirror_targets` in `.lore/.config.json` overrides this with an explicit list (Replace semantics).

| Platform | File | Auto-detected? |
|---|---|---|
| Claude Code | `CLAUDE.md` | ✅ |
| Cursor | `.cursorrules` (or `.cursor/rules/*.mdc`) | ✅ |
| Cline | `.clinerules` | ✅ |
| Aider / Codex / OpenCode | `AGENTS.md` (or `CONVENTIONS.md`) | ✅ |
| Windsurf | `.windsurfrules` | ✅ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ |
| Continue.dev | `.continue/rules/lore.md` | ✅ |
| LangGraph / DeepAgents | (no file — read `.lore/*.md` directly) | n/a |

Each mirror file is split into two sections by a `---` separator:

```markdown
## Lore (auto-managed)
... Skill-managed content from .lore/ ...

---

## My notes (free edit)
... your hand-written notes, preserved verbatim across syncs ...
```

The Skill only writes inside the `## Lore` section. Everything under `## My notes` is yours to edit freely. The Skill preserves it verbatim across every `sync` and `compress`.

## Token cost

lore's token model has five components. Only the mirror file is per-session; everything else is on-demand or per-invocation.

| Component | Loaded when | Typical size | Per-session? |
|---|---|---|---|
| **Mirror file** (CLAUDE.md, AGENTS.md, etc.) | Every session start | ~500 bytes (index mode) | yes |
| **SKILL.md** (the lore spec itself) | Every `lore <cmd>` invocation | ~10 KB | no, per-invocation |
| **`.lore/SUMMARY.md`** | Agent reads on demand as the table of contents | 1–30 KB | no, on demand |
| **`scopes/<scope>/{ARCH,DEC,CON}.md`** | Agent reads only the relevant scope | 1–5 KB each | no, on demand |
| **`lore query <term>`** result | Agent runs a query | bounded by matches | no, per query |

### The mirror is constant-cost

`CLAUDE.md` and equivalent platform files are loaded by your agent on **every session**. lore keeps this cost flat by emitting an index (~500 bytes) rather than the project digest content. This is the only line item that scales with session count.

| Project size | Mirror size | Per-session context cost |
|---|---|---|
| Empty / new | ~200 bytes | negligible |
| Small (~30 entries) | ~500 bytes | negligible |
| Medium (~120 entries) | ~500 bytes | negligible |
| Large (~250 entries) | ~500 bytes | negligible |

### Memory is on-demand

`.lore/*.md` files are **not** pre-loaded. The agent reads `SUMMARY.md` as a table of contents, then drills into the specific scope or entry it needs (`cat [file#ID]`). A 250-entry project costs the agent ~500 bytes at session start, plus only the entries it actively reads.

### SKILL.md is per-invocation

Every time you say `lore sync` or `lore query`, the agent loads `SKILL.md` (~10 KB) to follow the workflow. Outside of lore invocations, no lore content sits in the agent's context.

### Queries are bounded

`lore query <term>` returns matched entries with stable IDs and one-line summaries, not the full text of `.lore/`. A single query is bounded by the number of matches regardless of total project size.

### Ambient vs on-demand knowledge

**Ambient** knowledge is already in the agent's context at session start — no fetch needed. **On-demand** knowledge is read only when the agent asks (`cat [file#ID]`, `lore query <term>`).

lore's mirror file (`CLAUDE.md`, `AGENTS.md`, etc.) is ambient — the agent sees it every session. Everything under `.lore/` is on-demand: `SUMMARY.md` is the table of contents, and entries are fetched when the agent actually needs them.

Default is on-demand. If you'd rather dump the full `SUMMARY.md` into `CLAUDE.md` every session (true ambient), that works but isn't recommended — it trades session-start cost for zero fetch. See [`references/platform-mirrors.md`](references/platform-mirrors.md) for the index template.

## Scripts

Helper scripts in `scripts/` reduce repetitive mechanical work:

```bash
python scripts/id_hash.py "Use Next.js App Router"        # → a3f2 (4-char ID hash)
python scripts/list_entries.py                            # List all entries (text)
python scripts/list_entries.py --scope=frontend --json    # Filtered JSON
python scripts/find_duplicates.py                          # Find potential duplicates
python scripts/find_stale.py --days=90                    # Find stale entries
python scripts/history.py DEC-2026-02-03-7c19             # Show git history for an entry
```

All scripts are cross-platform Python 3.6+ with no third-party dependencies. See [`scripts/README.md`](scripts/README.md) (English) or [`scripts/README.zh-CN.md`](scripts/README.zh-CN.md) (Chinese) for details.

## Configuration

`.lore/.config.json` is optional. The defaults work for most projects.

```json
{
  "schema_version": 1,
  "auto_mirror": false,
  "sync_updates_mirror": false,
  "sync_trust": "medium",
  "mirror_targets": ["CLAUDE.md"], // optional — auto-detected if absent
  "mirror_mode": "index",
  "compress_thresholds": { "max_entries": 500, "max_days_since_compress": 30 },
  "sync_thresholds": { "min_lines_changed": 50, "min_directories_changed": 2 }
}
```

Field semantics: see [`references/config.md`](references/config.md). New configs include `schema_version: 1`; old configs without it still work but trigger a warning. See [`references/compatibility.md`](references/compatibility.md) for the compatibility policy.

## Upgrading

`git pull` (or re-clone) is the normal upgrade path; your `.lore/` is preserved verbatim across upgrades. If a future release ships a breaking config change, that release will include `scripts/migrate.py`; run it once after pulling. The current schema is `schema_version: 1`; no migration has shipped yet, so you don't need to run anything today. See [`references/compatibility.md`](references/compatibility.md) for the versioning policy and deprecation workflow.

## When NOT to use lore

lore is built for long-term projects. It's overkill for:

- **Short-lived scripts / one-off demos.** The maintenance overhead exceeds the value.
- **Rapid prototyping** where decisions change weekly. The decision-tracking machinery gets in the way.
- **Tiny single-file projects.** Just use a `README.md`.
- **Projects where you never want AI to make decisions.** If you want a pure read-only agent, lore adds no value.
- **Massive monorepos with 50+ packages.** The scope tree becomes unwieldy; consider splitting per-package or using a sub-skill per cluster.

## FAQ

**Q: Does lore work without git?**
A: Partially. Most of lore is **agent workflow** described in `SKILL.md` — the agent reads your files, drafts entries, edits `.lore/*.md`, and (when asked) regenerates mirrors. Without git, the agent can still do `init` / `query` / `audit` / `compress` / `mirror` by reading files directly. What you lose: `sync` uses `git diff` to detect changes (no diff → the agent asks you what changed), and `lore history` requires a git repo (it runs `git log`). The helper scripts (`list_entries.py`, `find_stale.py`, etc.) work either way.

**Q: Can I hand-edit `.lore/*.md` directly?**
A: Yes. The files are plain Markdown. Use `id_hash.py` if you're adding new entries (to keep IDs deterministic). After hand-editing, run `lore mirror` to update agent-facing files.

**Q: What if I don't want a mirror file at all (just `.lore/`)?**
A: Set `mirror_targets: []` in `.config.json`. The `compress` and `mirror` commands will be no-ops on the file system; only `SUMMARY.md` and the entry files matter.

**Q: How is this different from Cursor's `.cursorrules` or Aider's `AGENTS.md`?**
A: Those are flat lists of rules. lore is structured (architecture / decisions / conventions), atomic (one fact per entry), and historical (every entry has `#added` and `#verified` tags). It also produces those files for you.

**Q: Does lore talk to the agent's API?**
A: No. lore is pure file I/O. The agent invoking lore does the semantic work (scanning code, deciding what to extract, classifying changes); lore provides the file layout, the ID scheme, the markers, and the verification scripts.

**Q: What about the agent's native `/init` or `/compact` commands?**
A: They serve different purposes. `/init` is a one-shot project scan → `CLAUDE.md`. `/compact` compresses conversation context. lore `init` and `compress` manage long-term project knowledge, not session context. If you run `lore init` on a project that already has a non-lore `CLAUDE.md`, the takeover check (init step 0) handles integration.

**Q: What's the difference between `sync` and `mirror`?**
A: `sync` updates `.lore/` from code changes (run after a feature or refactor). `mirror` updates agent-facing files (`CLAUDE.md`, `.cursorrules`, etc.) from current `.lore/`. `sync` deliberately does **not** update mirrors — mirror files should be human-merged, not regenerated on every commit, so `git log` stays readable. Run `mirror` (or `compress`) explicitly when you want agent-facing files to catch up.

**Q: How is lore different from ADRs (Architecture Decision Records)?**
A: ADRs are documents — one markdown file per decision. lore is structured project memory: one fact per entry, with a stable ID and `#added` / `#verified` / `#stale` markers. The `DEC` layer can replace `docs/adr/` (one DEC entry per decision), but lore also covers `ARCH` (architecture) and `CON` (conventions) in the same store, plus generates agent-facing summaries via `compress` / `mirror`. Use lore **instead of** ADRs, or **alongside** them (one DEC entry pointing to the existing ADR document).

**Q: What if I disagree with an entry the agent wrote?**
A: Edit `.lore/*.md` directly — it's plain Markdown. The next `mirror` / `compress` will reflect your edit, and the helper scripts keep the ID stable as long as the entry text is unchanged. To revert to pre-AI state, `git checkout .lore/` like any tracked file.

**Q: Can I sync `.lore/` across multiple machines without git?**
A: Git is the recommended transport (`.lore/` is plain text in your repo; `git push` / `git pull` carry it). Other transports (Dropbox, OneDrive, Syncthing) work as long as you trust their text-file conflict resolution — they won't understand lore's ID scheme or `#added` markers. **Don't run two agents on the same `.lore/` simultaneously**; last-writer-wins, and IDs aren't protected by a remote lock.

## License

[MIT](./LICENSE) — use, modify, redistribute, sublicense, and sell, including commercially. No warranty.

---

<p align="center">
  <a href="SKILL.md">SKILL.md</a> ·
  <a href="references/entry-format.md">entry-format</a> ·
  <a href="references/summary-template.md">summary-template</a> ·
  <a href="references/audit-template.md">audit-template</a> ·
  <a href="references/monorepo-detection.md">monorepo-detection</a> ·
  <a href="references/stale-new-markers.md">stale-new-markers</a> ·
  <a href="references/platform-mirrors.md">platform-mirrors</a> ·
  <a href="references/config.md">config</a> ·
  <a href="references/history-command.md">history-command</a> ·
  <a href="references/compatibility.md">compatibility</a> ·
  <a href="scripts/README.md">scripts</a>
</p>
