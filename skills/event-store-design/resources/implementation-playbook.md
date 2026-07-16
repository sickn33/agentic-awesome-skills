# Event Store Design Playbook

## Schema and stream strategy

- Use append-only writes with optimistic concurrency.
- Keep per-stream ordering and global ordering indexes.
- Include metadata fields for causation and correlation IDs.

## Operational guardrails

- Never mutate historical events in production.
- Version event schema with explicit upcasters/downcasters policy.
- Define retention and archival strategy by stream type.

## Subscription and projection safety

- Track per-subscriber checkpoint positions.
- Make handlers idempotent and replay-safe.
- Support projection rebuild from a clean checkpoint.

## Performance checklist

- Index stream id + version.
- Index global position.
- Add snapshot policy for long-lived aggregates.
