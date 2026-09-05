# Scoped worked-example review — 2026-09-05 follow-up

This second, deliberately bounded cohort covers the complete `lint-and-validate` and `sql-optimization-patterns` trees. They were selected because they offer executable validation/SQL examples central to everyday maintenance. No popularity or usage data was collected. This is not a whole-catalog certification.

## Repairs and observed evidence

- **Lint runner:** no configured checks previously returned `passed: true` and exit 0. It now reports `not-checked` and exit 2. Invalid package metadata is an explicit failure. Node fallback checkers resolve installed local binaries instead of allowing `npx` to download a checker. A real subprocess test exercises empty and malformed projects; a temporary project confirms a missing local checker fails without fetching it.
- **Annotation inventory:** the Python regex counted a function with parameter and return annotations twice; source sampling could claim all discovered files were analyzed. AST counting now counts each function once; deterministic samples report the actual successful file count, truncation and parse errors. TypeScript observations are explicitly lexical; removed unsupported type-safety scores and acceptance thresholds. A 31-file fixture verifies the 30-file bound and one-function/one-count behavior.
- **SQL:** replaced driver-ambiguous `IN (?)` list binding with a complete bounded SQLite function that binds each value and handles empty input. Tests execute the published code against an in-memory database, including multiple rows and an injection-like string treated as data.
- **SQL result preservation:** executed the published composite cursor against tied timestamps and compared the correlated-count and LEFT JOIN aggregation examples for parents with zero, one and multiple children. Clarified that filtering completed orders changes the question, JOIN spelling alone does not guarantee a new plan, and approximate counts are not exact counts.
- **PostgreSQL guidance:** corrected statement-statistics column names, index statistics naming, and the unique-index prerequisite for concurrent materialized-view refresh. Corrected the half-open timestamp interval and removed nonexistent bundled-reference links. Declared mutation risk and EXPLAIN ANALYZE execution explicitly.

Run the six observed cases from the repository root:

```sh
python3 tools/scripts/tests/test_skill_worked_examples.py
```

The tests use Python's standard library and SQLite; they do not connect to a live database, run an external linter or establish query speed. PostgreSQL-specific corrections were checked against the official PostgreSQL 18 documentation linked from the playbook. No PostgreSQL server, extension setup, DDL locking behavior or production-provider integration was exercised. Python and Node project detection remains heuristic; inspect commands and use the repository's own check contract.

## Content and provenance

Both original skills declare community provenance; no new upstream identity, license or endorsement is inferred. All five tracked files were read, including both Python helpers and the SQL playbook; none is a symlink, binary or executable-mode file. Exact content fingerprints follow below. Later edits invalidate these byte-specific fingerprints. The protected merge's full-head review attestation remains separate.

The earlier `content-review-2026-09-05.md` is a historical snapshot from before warning cleanup, not a statement of the current warning count.

| File | SHA-256 |
| --- | --- |
| `skills/lint-and-validate/SKILL.md` | `6756e4dd35b4b62cab9ebe4bcd3d9b3839ebe1ea87030ea0a8d758c828240483` |
| `skills/lint-and-validate/scripts/lint_runner.py` | `fe1230c95c7a38c11fd330b8b2ba57ab4e2744dc423e84637d3ca31c4562a20d` |
| `skills/lint-and-validate/scripts/type_coverage.py` | `b61ed59396a30f0da730f7686971d6697e4caf62785f3da78e70335a7f44c348` |
| `skills/sql-optimization-patterns/SKILL.md` | `e5e212280c58e04ed35df715b093f6e95ef0c382235104e3b4477fd9920bbd03` |
| `skills/sql-optimization-patterns/resources/implementation-playbook.md` | `a42a1614aafa56f50dac45735a87b982a1c437ca57d876b570dcbd072d09c648` |
