# Architecture Pattern Review Prompts

Use patterns as options to evaluate, not defaults to impose.

For each candidate pattern, record:

- the concrete problem and measurable constraint it addresses;
- component ownership, data ownership, trust boundaries, and failure boundaries;
- request, event, and data flows, including retries and idempotency;
- consistency, latency, availability, recovery, and operational trade-offs;
- migration and compatibility requirements;
- evidence that the existing system cannot meet the need more simply;
- observability and rollback signals.

Prefer the least complex design that satisfies observed requirements. Reject a pattern when its operational burden, coupling, or failure modes exceed its demonstrated benefit. Validate assumptions with project-specific tests and runtime evidence.
