# Architecture pattern selection

Start with the current simple design. Patterns are alternatives, not a maturity ladder.

| Candidate | Useful when | Cost/failure to examine |
| --- | --- | --- |
| Modular monolith | Shared transactions and a small team dominate | Internal module coupling and release coordination |
| Independent service | Ownership/scaling/failure isolation has evidence | Network failures, consistency and operational load |
| Queue worker | Work exceeds request budget or needs controlled concurrency | Duplicate delivery, idempotency, retries, DLQ and visibility |
| Cache | Repeat reads and acceptable freshness are measured | Tenant keys, invalidation, stale values and stampedes |
| Read projection | Read shape differs materially from transactional writes | Rebuilds, lag, schema versions and source-of-truth recovery |

Record the actual flow, data owner and trust boundary. For a queue, show producer → durable broker → authorized consumer → output, plus retry/dead-letter and deduplication paths. For a cache, define scope, TTL, version and authoritative fallback. A diagram does not implement those guarantees.

Validate with a workload and failure scenario that can distinguish options, then capture the evidence in a decision record. Do not infer production capacity from a conceptual pattern.
