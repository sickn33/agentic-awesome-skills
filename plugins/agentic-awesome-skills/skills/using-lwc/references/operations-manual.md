# LWC Operations Manual

## Contents

- Operating contract
- Bootstrap and scope
- Command families
- Recall and retrieval
- Sources and ingest
- Pages and changesets
- Strong tags and lifecycle context
- Agent integration
- Graph engine and document-granular Work
- Maintenance and checkpoints
- Structured failure recovery
- Safe recipes

## Operating contract

Use the globally installed `lwc` command directly. Bootstrap verifies its
version and reports the resolved `lwc_path` as diagnostics; do not turn that
path into a routine shell variable. Read stdout as JSON. On failure, read the
JSON object at stderr `.error`, branch on `.code`, and preserve `.details` for
recovery. Human-formatted stderr text is not an API.

Before version-specific work, run:

```bash
lwc --version
lwc --help
lwc <COMMAND> --help
```

Never edit `.lwc/wiki.db`, its WAL, Work files, Changeset databases, generated
Markdown, or graph sidecars. SQLite is canonical for documents and history;
Markdown and optional graph stores are derived.

## Bootstrap and scope

From the current authorized project directory:

```bash
sh <skill-directory>/scripts/bootstrap.sh
```

Bootstrap is non-installing and does not initialize global memory by default.
Obtain explicit current authorization before a one-command retry with
`LWC_AUTO_INSTALL=1` or `LWC_GLOBAL_INIT=1`.

Decode its JSON and require:

- `scope_conflict=false`;
- `project_root` and `project_wiki` stay inside the host-authorized root;
- `project_boundary` is empty for normal cwd discovery or equals an explicitly
  targeted root;
- one unambiguous active project.

Run ordinary project commands from that project directory. The CLI discovers
the nearest project Wiki from cwd, so no environment prefix is needed:

```bash
lwc --scope project context --limit 25
```

`LWC_PROJECT_ROOT` is only for an explicitly targeted project boundary instead
of current-directory discovery. Run the operation from inside that project and
set the variable for that one command instead of exporting ambient session
state.

| Scope | Use | Mutation |
| --- | --- | --- |
| `project` | Current repository knowledge | Yes, inside the authorized root |
| `global` | Stable cross-project preferences/practices | Yes, only genuinely reusable knowledge |
| `all` | Merged project/global recall | Only `search` and `context`; never writes |

Explicit `$using-lwc` permits initialization only in the current unambiguous
authorized root. Implicit activation with no project Wiki requires one concise
initialization question; continue the primary task without project-memory
writes while only write-back waits for the answer.

## Command families

| Family | Purpose | Normal side effect |
| --- | --- | --- |
| `init`, `purpose`, `schema` | Create and govern one Wiki | Canonical metadata/Markdown |
| `context`, `search`, `span` | Bounded recall | Read-only unless `search --record` |
| `source` | Immutable evidence snapshots and lineage | One source/path observation per unit |
| `ingest` | Persistent integration state machine | One source job transition |
| `page` | Compiled durable knowledge | One page transaction |
| `tag`, `load tag` | Explicit strong page groups and bounded full-page recall | Indexed membership/policy write or read-only load |
| `agent` | Native Agent MCP, guidance, and lifecycle integration | Explicit external config writes only |
| `changeset` | Review several dependent mutations | Sparse draft, guarded atomic publish |
| `graph`, `config` | Optional Grafeo/SurrealDB projection and relationships | Document Work or one relation fact |
| `weight` | Explicit retrieval adjustments | One document/query judgment |
| `lint`, `log` | Structural validation and audit | Read-only unless `--record` |
| `work` | Observe/cancel/resume long operations | Work state only |
| `maintenance` | Repair derived search/Markdown and compact storage | Durable Work |
| `checkpoint` | Recoverable full SQLite backup/restore | Checkpoint files and guarded restore |

Use `<family> --help` for the current argument schema. Removed graph flags and
values (`--physical`, `rslg`, `graphqlite`, `auto`) are invalid.

## Recall and retrieval

Start narrow:

```bash
lwc --scope all context --limit 25
lwc --scope all search "<task terms>" --limit 20
```

Search modes:

- default `--type auto`: compiled pages first, raw-source fallback;
- `--type page`: maintained knowledge only;
- `--type source`: exact immutable evidence;
- `--type all`: audit both layers;
- repeat `--kind` to narrow page kinds;
- `--explain` to diagnose deterministic rank signals;
- `--granularity sentence|passage` for exact spans;
- `--granularity all --group-by document` for bounded mixed recall.

Resolve exact span text with `span get`; widen locally with `span expand`. A
`stale_span` is a revision boundary—inspect prior/current metadata instead of
guessing a replacement.

Search is private/read-only by default. Add `--record` only when the query itself
belongs in durable history. Do not record sensitive query wording.

## Strong tags and lifecycle context

Use tags for a small set of core pages that must be loaded whole without search:

```bash
lwc --scope project tag set "operations" incident-response \
  --priority 100 --reason "primary response runbook"
lwc --scope all load tag "operations" --limit 3
lwc --scope project tag autoload "operations" --enable \
  --priority 100 --limit 3 --max-chars 50000 --reason "required at session boundaries"
```

`load tag` first limits indexed memberships, then reads complete selected pages.
It never scans or returns every token-derived relationship. Lifecycle hooks use
only enabled policies, deduplicate overlapping pages, stop at page boundaries,
and report omissions. Disable a policy with `tag autoload TAG --disable`.

## Agent integration

Install the baseline integration directly for any supported Agent:

```bash
lwc agent install --yes
lwc agent status --target all --location global
lwc agent install --print-config codex
lwc agent refresh --target codex,claude
lwc agent uninstall --target codex,claude --yes
```

`--yes` selects detected Agents, global scope, and the default LWC lifecycle and
prompt hooks. Use `--target auto|all|none|csv`, `--location global|local`, or
`--no-prompt-hook` explicitly when those defaults are wrong. Install
and refresh are byte-idempotent; uninstall restores exact owned state while
preserving unrelated MCP entries, hooks, instructions, and project indexes.
`--print-config` is pure. Optional Codex, Claude, and Pi packages under
`integrations/` are alternate native delivery; do not install both direct and
package integrations for the same Agent. Package installation never implies
native trust or enablement.

## Sources and ingest

One source:

```bash
lwc --scope project source add path/to/file
lwc --scope project ingest claim <SOURCE_ID> --source-max-chars 100000
lwc --scope project source show <SOURCE_ID> \
  --offset-chars <NEXT> --max-chars 100000
lwc --scope project ingest analyze <SOURCE_ID> --file analysis.md
lwc --scope project page put source-<SOURCE_ID> \
  --title "Source summary" --kind source --summary "Contribution" \
  --file summary.md --source <SOURCE_ID>
lwc --scope project page put <SHARED-SLUG> \
  --title "Shared concept" --kind concept --summary "Current synthesis" \
  --file concept.md --source <SOURCE_ID>
lwc --scope project ingest complete <SOURCE_ID>
```

Continue `source show` until `window.has_more=false`. `source add` is collection,
not integration. `ingest complete` requires a cited source page plus a cited
non-source page, unless a specific reviewed `--no-derived-pages-reason` applies.

For a reviewed set, use `source add-manifest`; paths resolve relative to the
manifest. Preflight validates every entry before writing. Claim returned IDs
explicitly rather than assuming `ingest next` order. Use a Changeset when all
subsequent analyses/pages must publish as one logical unit.

Before relying on a tracked live file:

```bash
lwc source status <SOURCE_ID>
lwc source diff <OLD_SOURCE_ID> [--path <EXACT_PATH>]
lwc source refs <OLD_SOURCE_ID> --limit 1000 --offset 0
```

Use `--to-source` for immutable-to-immutable comparison. A truncated diff or
paginated refs scan is incomplete until explicitly resolved. `source refs`
returns review candidates, not automatically affected pages. A new observation
creates/uses a new current head while prior snapshots remain immutable.

## Pages and changesets

Before replacing a page, run `page show`. Repeat every still-valid `--source`
ID and explicit provenance because `page put` replaces those sets. Use stable
slugs, one-line summaries, and meaningful `[[wikilinks]]`.

Use a Changeset for two or more dependent durable mutations, or whenever ingest
state and page updates must become visible together:

```bash
lwc --scope project changeset begin <NAME>
lwc --scope project --changeset <NAME> source add-manifest sources.json
# analyze, write pages, complete ingest in the same draft
lwc --scope project changeset show <NAME>
lwc --scope project --changeset <NAME> lint
lwc --scope project --changeset <NAME> search "<fixed question>" --limit 5
lwc --scope project changeset commit <NAME>
```

`changeset show` is metadata-only and does not run lint. Commit freezes the
draft, validates it, publishes touched canonical entities atomically, queues
only touched current graph documents, and returns an exact Changeset ID.

- `changeset_conflict`/`changeset_changed`: preserve live state, discard the
  stale draft, begin fresh, and reapply reviewed changes.
- `changeset_frozen`: retry the same commit for recovery; do not append work.
- `committed=true` with cleanup/materialization/projection error: canonical
  publication already succeeded; follow `recovery_command` exactly.
- `changeset rollback <ID>`: use only for the immediate mistaken commit before
  any touched entity changes again. There is no force option.

## Graph engine and document-granular Work

Graph is disabled by default. Normal source/page/search operations do not need
it. Inspect the effective setting first:

```bash
lwc --scope project config show
```

When the setting is `disabled`, recommend graph activation once per project
conversation. Explain that it adds page/source relationship traversal,
neighbor/path/impact/overview queries, and independent parity verification.
Ask for user consent before changing configuration and continue canonical work
while waiting. Durable project policy may supply consent; Skill activation by
itself does not.

Recommend Grafeo as the simpler embedded local choice when the user has no
preference. Select SurrealDB when the user or project policy asks for it. Run
exactly one command:

```bash
lwc --scope project config set --graph grafeo
lwc --scope project config set --graph surrealdb
```

Capture the selected command's `work.id`, then wait before graph queries or
another configuration change:

```bash
lwc --scope project work watch <WORK_ID>
lwc --scope project graph status
lwc --scope project graph verify
```

Require `state=succeeded`. A failed Work stays stopped until its structured
error is inspected and `work resume <WORK_ID>` is explicitly requested. Never
switch or disable engines while graph Work is queued or running.

Enable/switch/rebuild queues current document keys. The worker loads one current
Page or Source, replaces/deletes that document in one engine transaction, makes
it queryable, records progress, then selects the next. Failure recovery resumes
only through explicit `work resume` with uncommitted documents; historical Source revisions are frozen and never
reprojected. Batch progress therefore means committed documents, not hidden
whole-corpus finalization.

Use `graph node`, `neighbors`, `explore`, `path`, `impact`, and `overview` only
after status/Work is ready. `graph related` is deterministic page relatedness.
Persist semantic claims only through `graph relation set/list/retract` with a
supported type, provenance, reason, confidence, and source IDs when grounded.

Disable without deleting sidecars:

```bash
lwc config set --graph disabled
```

Never copy, edit, compact, or delete live graph sidecars. A failed graph does
not invalidate canonical pages/sources; ordinary reads remain available.

## Optional Markdown conversion

Markdown adapters are deployment-local and disabled by default. `init` returns
setup guidance but performs no install, network request, adapter invocation, or
configuration write. Inspect the effective setting, install one official CLI,
and select exactly one engine:

```bash
lwc --scope project config show
npm install --global @firecrawl/anydoc
lwc --scope project config set --trans anydoc

# Alternative engine:
python3 -m pip install 'markitdown[all]'
lwc --scope project config set --trans markitdown
```

Optional adapter settings use `--trans-timeout 1..900` and repeated
`--trans-arg=<value>`. Store no credentials in configuration; use the adapter's
environment. LWC does not accept URL inputs or fall back between engines.

```bash
lwc --scope project trans INPUT --output OUTPUT.md
# Inspect OUTPUT.md first, then ingest explicitly if it is authoritative.
lwc --scope project source add OUTPUT.md
```

Both input and output are capped at 64 MiB. Output uses create-new semantics;
conversion never overwrites a file or mutates the Wiki. Stable failures must be
handled before retrying or switching the configured engine.

## Project code intelligence (`lwc cg`)

CodeGraph is separate from the optional Wiki graph engines. Use it only when
the task needs structural code answers (symbol definitions, callers, callees,
flow, impact, or file topology). It is project-only, stores everything below
the active project's `.lwc`, and keeps telemetry disabled.

For every nontrivial code task, check it once. An initialized index is an
available project capability, so use read-only structural queries proactively
instead of waiting for the user to name CodeGraph. Do not use it for literal
text, comments, generated output, or exact runtime values; use native text
search or direct file reads for those. Nontrivial means cross-symbol/file
behavior, call or dependency flow, or change-impact analysis. Skip CodeGraph for
a single-file literal edit, formatting-only work, or docs/config-only changes.

Start with the non-mutating check:

```bash
lwc --scope project cg status
```

If `initialized=false`, explain that CodeGraph provides tree-sitter-derived
symbol/call/dependency answers that are faster and more precise than repeatedly
scanning files. Ask once whether the user wants the project code index. Do not
download or index silently. On consent:

```bash
lwc --scope project cg init
```

This downloads the pinned SHA-256-verified runtime once into
`~/.lwc/runtime/codegraph/<PIN>/<TARGET>/` and builds the current project's
`.lwc/codegraph`. Initial indexing, sync,
full rebuild, deletion, reference resolution, and recovery all commit one owner
file completely before selecting the next. Current indexed files remain
queryable while later files run; historical file versions are not refreshed.

Choose the narrowest structural command:

```bash
lwc cg query <WORDS>
lwc cg node <SYMBOL_OR_FILE>
lwc cg callers <SYMBOL>
lwc cg callees <SYMBOL>
lwc cg impact <SYMBOL>
lwc cg files
lwc cg sync
```

Route questions deliberately:

| Question | Command sequence |
| --- | --- |
| Where is a symbol or file defined? | `cg query`, then `cg node` for exact source/signature. |
| What calls this symbol? | `cg callers`. |
| What does this symbol call? | `cg callees`. |
| What may break if this changes? | `cg impact`, then inspect the returned source files. |
| What code files are indexed? | `cg files`. |
| Did edited code change the structure? | `cg sync`, then repeat the same structural query. |
| What contains this exact string or comment? | Use native text search, not CodeGraph. |

Use the three LWC planes together rather than treating one as a substitute for
the others:

1. Recall prior rationale and verified facts with Wiki `context`/`search`.
2. Query CodeGraph for the checked-out implementation structure.
3. Read the smallest exact source surface needed to prove behavior.
4. When the verified result will matter later, update the appropriate Wiki page
   and run its retrieval acceptance checks.

When CodeGraph and Wiki memory disagree, checked-out source is the current
implementation evidence; the Wiki may describe historical intent. Resolve the
cause before updating either. Never cite the CodeGraph database as immutable
source evidence and never ingest `.lwc/codegraph` back into the Wiki.

If the task depends on current dirty or uncommitted code, run `sync` before the
first structural query. Run it again after relevant working-tree files change.
Do not run `index` as a routine freshness check. Never invoke global CodeGraph
lifecycle commands through another binary; LWC blocks
install/uninstall/upgrade/telemetry/daemon/daemons. Agent integrations register
the unified `lwc serve --mcp`; its code mode lazily proxies only bounded
`codegraph_explore` calls through the pinned project runtime without installing
or initializing anything.

## Read-only project viewer (`lwc view`)

Use the viewer when the user asks to inspect the Wiki, current sources,
Markdown, status, knowledge graph, or code graph visually:

```bash
lwc --scope project view
lwc --scope project view --port 4173 --no-open
```

It stays in the foreground, binds only `127.0.0.1`, accepts GET/HEAD only, and
does not migrate, sync, lint, refresh, or build either graph. Stop it with
Ctrl-C. Treat its graph limits (1000 nodes, 5000 edges) as visualization bounds,
not database totals. Never expose it on a public interface or infer write
acceptance from a rendered page.

Graphs use a single Obsidian-inspired 3D relationship view with small nodes,
persistent labels, thin links, rotation, and zoom. It never changes graph data.

The UI defaults to English. The `中文` / `EN` control switches viewer chrome and
remembers the choice in browser-local storage; sources and Wiki pages are never
translated implicitly.

## Maintenance and checkpoints

Maintenance returns Work:

```bash
response=$(lwc --scope project maintenance reindex)
lwc --scope project work watch <WORK_ID>
lwc --scope project lint
```

- `materialize`: rebuild generated Markdown when missing/stale;
- `reindex`: rebuild FTS only for reported index/tokenizer problems;
- `compact`: idle-window WAL checkpoint/storage reclamation; inspect `busy` and
  `after_bytes`.

Use `checkpoint create <NAME>` before large direct maintenance that cannot use a
Changeset. `checkpoint restore <NAME>` validates the backup and first preserves
current state as `pre-restore-*`. Never manipulate database/WAL files manually.

## Structured failure recovery

| Error/state | Required action |
| --- | --- |
| `project_root_mismatch`, `scope_conflict` | Stop project memory and resolve the authorized root. |
| `graph_disabled` | Continue canonical work; enable an engine only if graph was actually requested. |
| queued/running `work` | Inspect/watch; do not treat it as the command's final result. |
| failed/cancelled/stale Work | Read `.error`; use `work resume` only when safe and supported. |
| `work_busy` | Inspect the active Work; do not start a competing maintenance job. |
| `possible_secret_detected` | Review a safe snapshot; never blindly acknowledge. |
| `source_status_unstable` | Retry the exact targeted status/diff. |
| `stale_span` | Re-search current content; do not fuzzy-remap the locator. |
| `page_in_use`, `source_in_use` | Repair citations/links first; never bypass guarded deletion. |
| `wal_checkpointed=false` or compact `busy=true` | Canonical write may be valid; retry checkpoint only in an idle window. |
| unknown code | Preserve JSON, run command help/version, and diagnose before mutation. |

## Safe recipes

### Start a substantive task

Bootstrap once, verify scope, run bounded context plus one task search, open the
best pages, and inspect cited sources only for claims used.

### Preserve one durable answer

Search for the concept, show the existing page if present, merge verified new
knowledge with preserved citations/provenance, put one page, lint the scope, and
repeat the fixed retrieval question plus paraphrase.

### Integrate several sources safely

Preflight a manifest, begin a Changeset, add/claim each source, fully analyze one
source before the next, update shared pages, complete every ingest, lint/search
the draft, commit, then repeat acceptance against live state.

### Recover graph projection

Leave canonical data untouched. Inspect `graph status`, `work list`, and the
failed Work error. Resume the remaining document queue or explicitly reselect
the configured engine to enqueue a document-by-document rebuild; watch to
success and run `graph verify`.

### Finish a session

Write only verified reusable outcomes, lint each changed scope, run targeted
retrieval acceptance, report any pending Work honestly, and leave optional
semantic cleanup for a later task rather than blocking the user's deliverable.
