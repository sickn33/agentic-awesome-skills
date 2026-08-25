# lore workflows — operational specification

The step-by-step procedures for all seven lore commands. Load this file when executing any `lore <command>`; [`SKILL.md`](../SKILL.md) routes each user request to the section below. Each section also points to the reference that backs it (entry format, marker conventions, summary/audit templates, config, platform mirrors, history).

### `init` — Initialize the memory bank

Runs once per project (or to start over).

0. **Resolve targets and takeover check.** Targets are determined by the resolution algorithm — see `references/platform-mirrors.md`. `init` **always** asks the user via multi-select which agents they use (pre-selected: agents whose platform files already exist or are already lore mirrors), so additional agents can be added even when files were detected; the resolution algorithm's silent return-on-detect applies to `mirror` / `compress`, not `init`. Explicit `mirror_targets` in `.lore/.config.json` overrides auto-detect (Replace semantics). For each resolved target:
   - If the file does not exist -> no action; it will be created later in step 7.
   - If the file exists AND contains a `## Lore` section -> it's already a lore mirror; note it and continue (its My notes will be processed as seed in step 5).
   - If the file exists AND does NOT contain a `## Lore` section -> it's likely from the agent's native `/init` or hand-written. Show the user:
     - (a) **Take over** — rewrite the file as a two-section mirror. The existing content becomes the My notes section (preserved verbatim, treated as seed knowledge in step 5).
     - (b) **Preserve as-is** — leave the file alone. Remove it from `mirror_targets` for this project (lore won't write to it). `.lore/` is still generated normally; the user can read `SUMMARY.md` directly or merge manually later.
     - (c) **Abort** — exit init. Nothing is created. The user can decide later.
   - Repeat for each resolved target before proceeding.
1. Check if `.lore/` already exists. If yes, warn and ask: archive the current one and re-init, or abort?
2. Detect monorepo structure (per `references/monorepo-detection.md`). Propose scope list to the user; let them rename / merge / split before proceeding. No monorepo -> `_global/` only.
3. Scan the project (per scope if applicable):
   - Top-level structure, entry points, package manager, language version
   - Config files: `package.json`, `pyproject.toml`, `Cargo.toml`, `tsconfig.json`, `Dockerfile`, `Makefile`, CI
   - `README*`, `CONTRIBUTING*`, existing docs
   - Key dependencies from lockfiles
4. Write proposals to `.lore/draft/` mirroring the target layout (`_global/` and per-scope subdirs). Classify scanned facts per the Layer semantics table in `SKILL.md`, and apply the same layer checks as sync step 3: a picked-over-alternative with a reason is a `DEC` entry, not ARCH; a rule future agents must follow is a `CONV` entry, not ARCH or code comments. Every entry gets `#added:<today>` and a deterministic hash-based ID (see `references/entry-format.md`).
5. For any mirror file that already has a `## Lore` section (from step 0), read its My notes section as user-supplied seed knowledge. Parse as atomic bullets into the right layer/scope.
6. **Stop and show the user a summary**: which scopes, how many entries per layer per scope, sample of 5-10 entries, and what mirror files will be (re)generated (or skipped per step 0).
7. On user confirmation: `mv .lore/draft/* .lore/`, run an initial `compress` to generate `SUMMARY.md`, then (re)generate platform mirrors per the two-section structure — auto-create missing files, refresh Lore sections, leave My notes sections intact. Skip any target the user chose "preserve as-is" in step 0.
8. On user rejection: `rm -rf .lore/draft/`. Nothing persists.

The `draft/` directory gives a clean rollback path: nothing in `.lore/` is real until the user approves.

### `sync` — Update after a change

Runs after the user completes a feature, refactor, or bug fix.

**Trigger threshold — only propose sync when at least one is true:**
- `git diff --stat HEAD` shows 50+ changed lines across 2+ directories
- A new top-level module / directory / dependency was added or removed
- A new convention was explicitly discussed (e.g. user said "from now on we use X")
- The user explicitly invokes `sync` regardless of diff size

Pure typo fixes, lockfile-only changes, README rewording, or tweaks below the 50-line / 2-directory threshold do **not** warrant `sync`.

**Compress threshold check (silent, runs before sync proposal):**
- Total entry count across all files > 500, **or**
- `SUMMARY.md` is missing, **or**
- `SUMMARY.md` last `Last compressed:` date is > 30 days ago

If any of these are true, the skill appends a `[COMPRESS NOTICE]` to the sync proposal. It does not block the sync — the user can defer.

**Procedure:**

1. **Detect the delta** from two sources, combined and de-duplicated:
   - `git diff <last_sync_sha>..HEAD` if `.lore/.config.json#last_sync_sha` is set and reachable from any local ref. This captures every commit since the last successful `sync`.
   - `git diff` (working tree vs. `HEAD`) — always included. Catches uncommitted changes that are not yet in any commit.
   - **Re-scan any new files**.
   - **Fallback** when `last_sync_sha` is absent (older config) or no longer reachable (e.g. after `git rebase` or a force-push that orphaned the SHA): use `git diff HEAD` alone and emit a one-line `[WARN]` to stderr noting that incremental sync is degraded. Working tree alone will not pick up commits made before the next sync ran — the user should re-run `sync` after `git pull --rebase` to re-establish the baseline.
   - **Empty repo** (no commits yet): `last_sync_sha` is `null`; only the working tree diff applies.
2. **Determine target scope(s)** for each change. Use `git diff --name-only` paths (over the combined commit + working-tree diff) to map files -> scopes (e.g. `frontend/src/...` -> `scopes/frontend/`). Cross-scope changes (root config files) -> `_global/`. If a change introduces a scope with no directory under `.lore/scopes/` yet, create `scopes/<name>/ARCHITECTURE.md`, `DECISIONS.md`, and `CONVENTIONS.md` (same layout as `init`) and route the entries there.
3. **Classify each change** into one layer:
   - New module, new dependency, new file structure -> `ARCHITECTURE.md`
   - "We picked X over Y because Z" -> `DECISIONS.md`
   - New lint rule, new naming pattern, new "we never do X" -> `CONVENTIONS.md`
   - Boundary: the choice itself ("we use X") -> `ARCHITECTURE.md`; the reasoning ("why X over Y") -> `DECISIONS.md`. If both apply, write two entries and cross-reference them by ID.
   - **Decision check (mandatory before step 4).** Ask explicitly for every change: did we pick one option over an alternative ("use X instead of Y", "we chose X over Y", "reason: ..."), or does any draft `ARCHITECTURE` text explain *why* (signals: `reason:`, `because`, `for <purpose>`, any mention of an alternative)? If yes, that reasoning is a `DEC` candidate and must not be silently folded into an ARCH entry — emit the fact in `ARCHITECTURE.md` and the reasoning in `DECISIONS.md`, cross-referenced by ID. If you conclude no DEC is warranted, state that explicitly in the proposal so the user can veto.
   - **Convention check (mandatory before step 4).** Ask explicitly for every change: does it introduce or change a *rule* future agents must follow — a lint/format/tool-config policy, a naming or structural pattern ("every X must Y"), a "we never do X", or an implicit rule visible in code (guard/validation logic, `must`/`required` checks, new or updated tool config)? If yes, that rule is a `CONV` candidate; it must not be silently folded into an ARCH entry or left only in code and comments. Signals: `must`/`never`/`always`/`required`, changes to lint or tool config (e.g. `.eslintrc*`, `pyproject.toml` tool sections, `tsconfig.json` compiler options), repeated structural patterns, "from now on..." statements. If you conclude no CONV is warranted, state that explicitly in the proposal so the user can veto.
4. **For each candidate entry**:
   - **Contradicts an existing entry** in the same scope/layer -> mark the old one `#stale:<today>` and `#superseded-by:<new-id>` (where `<new-id>` is the entry in this proposal that replaces it). Emit an `ALERT`.
   - **No replacement entry exists yet** (user is removing a fact without substituting) -> mark the old one `#stale:<today>` only; the chain can be backfilled later.
   - **Refines an existing entry** -> if the body is unchanged, update tags only (bump `#verified:<today>`) and keep the ID. If the body changes, write a new entry with a freshly hashed ID and mark the old one `#stale:<today>` + `#superseded-by:<new-id>` — the ID hashes the body, so a body rewrite always produces a new ID (see `references/entry-format.md`).
   - **Genuinely new** -> append with `#added:<today>` and a new hash ID.
5. **De-duplicate**: before appending, run `python skill/scripts/find_duplicates.py --json` (when lore is installed as a skill the path is `<skill>/scripts/find_duplicates.py`) to identify any candidate entry that overlaps with existing entries (same hash, or Jaccard >= `--threshold`). For each match, skip the new entry and bump `#verified` on the existing one. If the new entry is genuinely different in meaning (the script flags but doesn't decide), keep both.
6. **Apply trust level** (controlled by `.lore/.config.json#sync_trust`, default `"medium"`):

   | Change type | `high` | `medium` (default) | `low` |
   |---|---|---|---|
   | De-duplicate hit (same fact already present) | auto-apply | auto-apply | confirm |
   | REFINED, tags only (body unchanged) | auto-apply | auto-apply | confirm |
   | REFINED, body changed (new ID + supersede link) | auto-apply | confirm | confirm |
   | `NEW` entry | auto-apply | confirm | confirm |
   | `STALE` mark | auto-apply | confirm | confirm |
   | `ALERT` | confirm | confirm | confirm |

   Auto-applied changes are written silently and reported at the end. Confirmation-required changes are bundled into a single diff proposal and shown together.
7. **Generate the proposed diff** (for any confirmation-required changes) using the `[NEW]/[STALE]/[REFINED]/[ALERT]/[COMPRESS NOTICE]` markers. See `references/stale-new-markers.md` for the full convention and user reply semantics.
8. **Stop and wait for user confirmation** for any pending changes. Auto-applied changes need no confirmation.
9. After the user accepts, write to `.lore/*` only. **Do not** regenerate platform mirrors from `sync` (unless `sync_updates_mirror: true` is set in `.lore/.config.json`) — this is intentional. See "Mirror update triggers" in `SKILL.md` and the dedicated `lore mirror` command.
10. **Update `.lore/.config.json#last_sync_sha`** to the current `git rev-parse HEAD`. Idempotent: re-running sync without new commits writes the same SHA. If HEAD does not exist (empty repo), set to `null`. The field is optional and additive; older configs without it keep working through the fallback in step 1.

**Source priority** (when sources disagree):

1. Git diff of changed code (most reliable — shows what actually happened)
2. Static scan of new files (reliable for facts, not for intent)
3. Conversation context (lowest priority — see below)
4. Test/build output (auxiliary — only consulted if 1-3 are ambiguous)

**Conversation context is opt-in.** The skill does **not** automatically mine chat messages for memory updates. It only extracts from conversation when the user explicitly says things like "note this down" / "remember this" / "this is important". Reason: chat context is high-noise, and silent extraction creates false entries.

### `query` — Answer from memory

Read-only.

1. Determine which scope(s) the question targets:
   - "this project" / "the whole codebase" / unspecified -> `_global/` first, then SUMMARY.md
   - "frontend" / "in the web app" / "the React side" -> `scopes/frontend/`
   - "backend" / "the API" -> `scopes/backend/`
   - If ambiguous, search SUMMARY.md for clues.
2. Grep the target files for relevant entries. If multi-layer or multi-scope, check all relevant ones.
   - **Skip entries with `#superseded-by:<id>`.** The replacement is current; the superseded entry is historical. Same filter `compress` applies (see `references/summary-template.md` selection rule 0). If the user's question is about how something evolved ("why did we switch from X to Y?"), use the `history` workflow instead — `history --follow-superseded <id>` walks the chain.
   - **SUMMARY is an index, not a source of truth for a claim.** A one-line summary is a locating hint; when citing a fact or making a decision, read the full referenced entry (including its tags) in `_global/` or `scopes/` first.
3. If found: answer concisely, citing fully-qualified entry IDs (e.g. `[scopes/frontend/DECISIONS.md#DEC-2026-02-03-7c19]`). Mention `#verified` date.
4. If not found but inferable from the code: say so explicitly ("Not in memory, but inferable from `frontend/src/store/index.ts`..."). Offer to add it.
5. Never fabricate an entry. If memory doesn't have it, say it doesn't have it.

### `audit` — Check memory vs. reality

Read-only with respect to canonical memory. It reports drift without changing entries or `SUMMARY.md`, but it does write the dated report described below.

1. For each entry in `_global/*` and `scopes/*/*`, find the code/config it claims to describe (scoped to the relevant scope's source tree) and compare against current state.
2. Also flag: entries whose reference date — `#verified` if present, else `#added` — is older than 90 days. Run `python skill/scripts/find_stale.py --days=90 --json` (or `<skill>/scripts/find_stale.py` when installed) to enumerate them mechanically.
3. Write the report to `.lore/audit/audit-YYYY-MM-DD.md`, organized by scope. **Do not** mark anything as stale in the main files. **Do not** emit ALERT blocks. See `references/audit-template.md` for the full report format and severity definitions.
4. **Stop.** User reviews the report and decides what to do. To act on findings, the user runs `sync`.

This separation keeps `audit` honest: it observes, it does not edit. ALERT noise is contained to `sync` and `query`, where the agent is about to act on the memory.

### `compress` — Build the top-level summary

Long-term compression. Generates `SUMMARY.md` and, when `auto_mirror: true` (or the user accepts the per-target prompt), regenerates platform mirrors. Underlying ARCHITECTURE / DECISIONS / CONVENTIONS files are untouched.

1. Run `python skill/scripts/list_entries.py --json` (or `<skill>/scripts/list_entries.py` when installed) to enumerate every entry. Use the JSON output as the input for the selection step.
2. Optionally run `python skill/scripts/find_stale.py --json` to identify entries that shouldn't anchor the summary (recently-stale or long-unverified).
3. For each (scope, layer) pair, pick 3-5 most important entries using the selection rule in `references/summary-template.md`.
4. Write `SUMMARY.md` per the template in `references/summary-template.md`. (This is the only file written on the canonical `.lore/` side.)
5. If `auto_mirror: true` in config, regenerate platform mirrors (this is one of the three mirror update triggers — see "Mirror update triggers" in `SKILL.md`). If `auto_mirror: false`, ask per target and only write the mirrors the user accepts. Content-based dedup: if the new Lore section equals the current one, skip the write. The My notes section is always preserved.
6. **Stop.** Once mirror regeneration has either written or been declined per target, `compress` is done.

**Compress is idempotent.** Running it twice produces the same `SUMMARY.md` content (modulo the date stamp). Re-running after new `sync`s picks up new entries automatically.

### `mirror` — Regenerate platform mirrors

Regenerate all configured platform mirrors from the current state of `.lore/*`. Content-based dedup skips targets whose Lore section is unchanged.

1. Read current `.lore/SUMMARY.md` and the scope-tagged index.
2. For each configured mirror target (per `references/platform-mirrors.md`), read the existing file and detect the section boundary.
3. **Validate the two-section structure** for each target: if it lacks the `---` separator, lacks a `## My notes` section, or is a user-notes-only file without `## Lore`, stop for that target and ask the user how to proceed — never overwrite an anomalous file silently (section detection rules: `references/platform-mirrors.md`).
4. For each target, compare the new Lore section content against the existing one. **Skip writing if content is identical** (content-based dedup; avoids empty `git diff`).
5. If different, replace the Lore section; preserve the My notes section verbatim. If the user asked to wipe My notes, archive it to `.lore/.archive/<file>-<date>.md` first.
6. **Stop.** Report: "Mirror updated: `<file>`" or "No changes needed: `<file>`" per target.

This command exists because most users want `sync` to be fast and unobtrusive, but occasionally need the agent-facing files to reflect recent knowledge. `mirror` is that explicit "publish to agent view" step. Structure validation happens automatically during each regeneration (step 3), and a user-requested My notes wipe is handled as a normal conversation request.

### `history` — Show git commits related to a memory entry

Read-only. Surfaces the git history that backs a memory entry, a file, or a scope, so the agent can answer "why does this decision exist?" with a pointer to the actual commits rather than a guess.

**When to trigger:** only when the user explicitly invokes `lore history` or names a subcommand ("show me the git history", "show me the commits behind this entry"). Generic "history" or "git log" alone does not trigger — defer to the user's intent.

| User says (examples) | Command |
|---|---|
| "lore history DEC-2026-02-03-7c19" | `lore history <entry-id>` |
| "lore history frontend/src/store/index.ts" | `lore history <file-path>` |
| "lore history --scope=frontend" | `lore history --scope=<name>` |

**Procedure (entry form):**

1. Resolve project root (`.lore/` must exist), confirm git repo + git CLI on PATH.
2. Load the entry index (`list_entries.py --json`), locate the entry, derive `#added` as the default `--since` (fallback `1970-01-01`).
3. Resolve the code file (backtick path in entry text -> scope directory -> project root), run `git log`, render Markdown or JSON, print to stdout.
4. **Stop.** No files are written.

**Data source contract:** local git CLI only. No GitHub / GitLab API. No LLM call. The agent invoking the command does the semantic work (interpreting commit messages, deciding relevance).

**Relationship to other commands:** fills the previously-empty cell of "read git history" (other commands read either the current file system or `git diff` only).

Supported flags: `--since=<YYYY-MM-DD>`, `--follow-superseded`, `--json`. Full dispatch rules, `--since` normalization (same-day commit safety), output format, and the error/exit-code table live in `references/history-command.md`.

## Cross-workflow notes

**Who writes what:**

| File | Written by |
|---|---|
| `.lore/SUMMARY.md` | `compress` (and by `init`, via its initial compress) |
| `.lore/{_global,scopes/<scope>}/<LAYER>.md` | `init`, `sync`, manual edits |
| `.lore/.config.json` | `init`, manual edits |
| `.lore/audit/audit-<date>.md` | `audit` |
| `.lore/draft/` | `init` (proposals; moved into `.lore/` on confirm, removed on reject) |
| `<project-root>/<platform files>` | `init`, `mirror`, `compress` (if `auto_mirror: true`), `sync` (if `sync_updates_mirror: true`) |

**What never happens silently:** file mutation (sync proposes; user accepts/rejects); platform mirror rewrite on every sync (separate command); `compress` deleting entries (only writes SUMMARY.md); entry marked as `[STALE]` without proposal; `init` overwriting user-written platform files without explicit takeover.

**Typical sequence:** `init` -> `[sync <-> query <-> audit]` (interchangeable, agent picks by context) -> `compress` (when SUMMARY.md grows stale) -> `mirror` (or auto via `compress` if `auto_mirror: true`).
