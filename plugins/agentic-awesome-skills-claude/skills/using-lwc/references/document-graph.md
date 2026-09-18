# LWC Physical Document Graph

## Use when

Use the physical document graph for relationships among current Wiki pages and
sources: neighbors, paths, dependencies, support/contradiction, relationship
impact, or broad topology when lexical recall is insufficient.

## Skip when

Skip graph traversal for a direct page lookup, literal text search, or a task
answered by one known source. Canonical search/read/write continues to work while
the graph is disabled, pending, or failed.

## Minimum workflow

### Graph activation recommendation

Check `lwc --scope project config show`. If the effective graph is disabled,
explain its benefit and ask for consent once. Never enable it automatically.
With consent and no engine preference, choose embedded Grafeo:

```bash
lwc --scope project config set --graph grafeo
# or only when selected/policy requires it:
lwc --scope project config set --graph surrealdb
```

Capture the returned Work ID, use `work watch <ID>`, require
`state=succeeded`, then run:

```bash
lwc --scope project graph status
lwc --scope project graph verify
```

Every rebuild, update, and delete commits one complete current document before
the next; historical revisions remain frozen. The document store remains
readable throughout graph Work.

Route questions deliberately: `graph overview`/`explore` for unknown topology,
`node`/`neighbors` for immediate structure, `path` for reachability, `impact` for
blast radius, and `related` for structurally supported ranking. Use `relation
set/list/retract` only for explicit evidence-backed semantic relationships.

## Consent boundaries

Graph detection is not consent. Enabling or switching Grafeo/SurrealDB mutates
project configuration and projection state. Never switch or disable engines
while graph Work is active, and never edit/copy/delete the owned sidecar.

## Completion evidence

- Configuration reports the selected engine and origin.
- Projection Work succeeded rather than merely queued/running.
- `graph status` reports document-granular parity and `graph verify` succeeds.
- Any explicit relation has supported type, concise reason, confidence,
  provenance, and required source IDs without secrets.
