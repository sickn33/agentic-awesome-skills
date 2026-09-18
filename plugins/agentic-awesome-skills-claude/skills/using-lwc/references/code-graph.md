# LWC CodeGraph Index

## Use when

Use CodeGraph for structural questions about checked-out code: symbol definition,
signature, callers/callees, dependency flow, file topology, reachability, or
change impact across symbols/files.

## Skip when

Skip CodeGraph for a single-file literal edit, formatting-only work, docs/config
only work, comments/log strings, or when native text search already proves the
answer. Use `rg` for literal text.

## Minimum workflow

### Code intelligence recommendation

For every nontrivial code task, run:

```bash
lwc --scope project cg status
```

The pinned CodeGraph runtime is installed once globally per version/platform,
while every project owns its separate `.lwc/codegraph` index. If
`initialized=true`, use its read commands proactively: `query`/`node` for
definitions, `callers`/`callees` for direction, `trace` for flow, `impact`
before changing a shared symbol, and `files` for topology.

If `initialized=false`, explain tree-sitter-derived structure, project-local
indexing, telemetry disabled, and single-file document-granular commits. Always
ask for consent before `cg init`; continue the primary task while awaiting the
answer.
After consent:

```bash
lwc --scope project cg init
lwc --scope project cg status
```

If the task depends on current dirty or uncommitted code, run `lwc --scope
project cg sync` before the first structural query, after relevant code edits,
and before a final structural claim. Use CodeGraph to locate the smallest source
surface, then read the exact files that prove behavior.

## Consent boundaries

Querying an existing user-authorized index needs no additional consent.
Downloading the pinned global runtime and creating a project index does. Never
pass another project path, use a `codegraph` from `PATH`, ingest the index, or
edit its database directly.

## Completion evidence

- Status separates global runtime health from project index initialization.
- Structural claims were made against the current synced index.
- Exact checked-out source confirms the relevant behavior; checked-out code is
  the current implementation evidence when memory differs.
- The project index stayed project-local and telemetry stayed disabled.
