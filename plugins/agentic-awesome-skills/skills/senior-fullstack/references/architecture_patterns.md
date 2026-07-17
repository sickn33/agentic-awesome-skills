# Full-Stack Boundary Review

For a proposed change, map:

- user states and accessibility behavior;
- client/server ownership and API contracts;
- authentication, authorization, validation, and trust boundaries;
- data ownership, transactions, concurrency, and migrations;
- cache invalidation, retries, idempotency, and background work;
- external dependencies and partial-failure behavior;
- logs, metrics, traces, alerts, and rollback signals.

Prefer existing project patterns unless a documented requirement justifies a new boundary or dependency. Treat framework examples as hypotheses until checked against the project's installed version, configuration, and tests.
