# Event Store Design Playbook

## Schema and stream strategy

- Use append-only writes with optimistic concurrency.
- Keep per-stream ordering; a global sequence index alone is not commit ordering. Use the writer protocol described in SKILL.md before checkpointing positions.
- Include metadata fields for causation and correlation IDs.

## Operational guardrails

- Preserve event history by default; design authorized retention/redaction and privacy handling explicitly.
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
