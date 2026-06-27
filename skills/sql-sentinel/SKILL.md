---
name: sql-sentinel
description: "Audit SQL for the cost & performance anti-patterns that burn warehouse credits. Scores warehouse health 0-100 and outputs a prioritized cost-reduction plan for BigQuery, Snowflake, Redshift, and Postgres."
category: data
risk: safe
source: community
source_repo: takeaseatventure/sql-sentinel
source_type: community
date_added: "2026-06-26"
author: takeaseat
tags: [sql, bigquery, snowflake, redshift, postgres, data-warehouse, cost-optimization, performance, audit, finops]
tools: [claude, cursor, codex, gemini]
license: "MIT"
license_source: "https://github.com/takeaseatventure/sql-sentinel/blob/main/LICENSE"
---

# sql-sentinel

## Overview

A static-analysis skill that audits SQL for the cost & performance anti-patterns that dominate warehouse bills — `SELECT *`, full-table scans, non-sargable predicates, Cartesian joins, the `NOT IN` NULL trap, and 15 more. It scores warehouse query health 0-100 (A-F) and outputs a prioritized cost-reduction plan, each finding with a `why`, a concrete `fix`, and an estimated savings.

Built for analytics engineers (dbt, Looker), data platform teams running FinOps / "reduce cloud spend" initiatives, and anyone reviewing a SQL pull request before it hits production. Works across BigQuery, Snowflake, Redshift, and Postgres. Zero dependencies, MIT licensed.

The executable engine and full rule set live in the source repository: https://github.com/takeaseatventure/sql-sentinel

## When to Use This Skill

- A user writes or reviews a query for BigQuery, Snowflake, Redshift, Postgres, or Spark SQL.
- A user asks "why is this query so slow?" or "why is my warehouse bill so high?"
- A user is about to promote a dashboard query or dbt model to production.
- A data engineer wants a second pair of eyes before a code review or a cost-optimization sweep.
- A team is running a "reduce cloud spend" or FinOps initiative.

## How It Works

The engine splits a SQL script into statements (honoring quotes and comments), runs 20 rules over each statement, scores health 0-100 weighted by severity (critical 25, high 12, medium 5, low 1), and returns a prioritized cost-reduction plan.

### Step 1: Run the audit

Install or clone the source repository, then run the zero-dependency engine:

```bash
git clone https://github.com/takeaseatventure/sql-sentinel.git
cd sql-sentinel
node scripts/sql-sentinel.js path/to/query.sql
```

Or programmatically:

```javascript
const { auditSql } = require('./scripts/sql-sentinel');
const report = auditSql(yourSqlString, { dialect: 'bigquery' });
console.log(report.healthScore);      // 0-100
console.log(report.grade);            // 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
console.log(report.prioritizedPlan);  // array, worst findings first
```

### Step 2: Read the prioritized plan

The output leads with critical findings (Cartesian joins, mass DELETE) and descends to low-severity style issues. Each finding explains *why* it costs money and *how* to fix it.

## Examples

### Example 1: A messy dashboard query

```sql
SELECT DISTINCT *
FROM user_events, raw_logs
WHERE LOWER(event_name) LIKE '%signup%'
  AND user_id NOT IN (SELECT id FROM deleted_users)
ORDER BY created_at;
```

The audit scores this 17/100 (grade F) and flags 7 findings:
- CRITICAL: comma-join produces a Cartesian product (can turn a $0.02 query into a $200 query)
- HIGH: `SELECT *` forces full column scan (30-90% wasted bytes on wide tables)
- HIGH: leading-wildcard `LIKE '%signup%'` defeats indexes
- HIGH: `LOWER(event_name)` defeats indexes (non-sargable)
- HIGH: `NOT IN (SELECT ...)` — NULL semantics hazard
- MEDIUM: `SELECT DISTINCT` dedup cost
- MEDIUM: `ORDER BY` without `LIMIT` sorts the full result

### Example 2: A clean, sargable query

```sql
-- This scores 90+/100 (grade A) — no findings
SELECT id, email, created_at
FROM users
WHERE created_at >= TIMESTAMP '2026-01-01'
  AND created_at <  TIMESTAMP '2026-02-01'
ORDER BY id
LIMIT 100;
```

## The 20 rules (ruleset v1.0.0)

| Rule | Severity | Catches |
|---|---|---|
| SQL001 | high | `SELECT *` full column scan |
| SQL002 | critical | No `WHERE` → full table scan |
| SQL003 | high | `LIKE '%term'` non-sargable |
| SQL004 | high | Function on column kills index |
| SQL005 | critical | `CROSS JOIN` / comma-join |
| SQL006 | medium | `SELECT DISTINCT` dedup cost |
| SQL007 | medium | `ORDER BY` without `LIMIT` |
| SQL008 | high | `NOT IN (SELECT ...)` NULL trap |
| SQL009 | medium | Implicit type cast |
| SQL010 | low | Many `OR`s (use `IN`/`UNION`) |
| SQL011 | medium | `COUNT(DISTINCT)` at scale (use HLL) |
| SQL012 | low | `LIMIT` without `ORDER BY` |
| SQL013 | medium | Scalar subquery in `SELECT` |
| SQL014 | medium | 5+ JOINs broadcast/spill risk |
| SQL015 | high | Fact table, no partition filter |
| SQL017 | low | String concat in `SELECT` |
| SQL018 | medium | Window `OVER ()` no `PARTITION` |
| SQL020 | critical | `DELETE`/`UPDATE` without `WHERE` |
| SQL021 | low | `SELECT *` in `EXISTS`/`IN` |
| SQL022 | medium | `UNION` vs `UNION ALL` |

Run the test suite to verify each rule fires on real SQL:

```bash
cd scripts && node test.js   # 26 tests, zero dependencies
```

## Limitations

- This is a **static** analyzer. It finds anti-patterns in the *text* of SQL; it does not read query plans, row counts, or billing. A flagged query on a 100-row table is cheap; the same query on a billion-row table is the problem the rule exists to prevent.
- The fact-table heuristic (SQL015) keys off table *names* (`*_events`, `*_log`) and is advisory, not definitive.
- It does not execute SQL — safe to run on any `.sql` file.
