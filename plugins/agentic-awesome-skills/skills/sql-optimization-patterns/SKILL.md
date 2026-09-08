---
name: sql-optimization-patterns
description: "Diagnose slow SQL with query plans, preserve query results, and verify indexing or query changes against representative data."
risk: critical
source: community
date_added: "2026-02-27"
---

# SQL Optimization Patterns

Diagnose slow SQL with query plans, preserve query results, and verify indexing or query changes against representative data.

## Use this skill when

- Debugging slow-running queries
- Designing performant database schemas
- Optimizing application response times
- Reducing database load and costs
- Improving scalability for growing datasets
- Analyzing EXPLAIN query plans
- Implementing efficient indexes
- Resolving N+1 query problems

## Do not use this skill when

- The task is unrelated to sql optimization patterns
- You need a different domain or tool outside this scope

## Instructions

- Confirm database engine/version, query parameters, expected rows, data distribution and the permitted environment. Start read-only; obtain authorization before DDL, data changes, configuration changes or maintenance.
- Compare result sets before comparing performance. EXPLAIN ANALYZE executes the statement: use approved representative data, account for functions and triggers, and do not assume a transaction rollback undoes every side effect.
- Record the observed plan, timing conditions and correctness checks. Indexes and query rewrites are hypotheses, not universal speed improvements.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Worked example

The playbook includes an executable SQLite batch-loading example with bound values and an empty-input case. The repository test exercises it alongside pagination ties and aggregation equivalence. SQLite correctness checks do not establish PostgreSQL performance or production safety.
