---
name: neon-postgres-egress-optimizer
description: Diagnose and fix excessive Postgres egress (network data transfer) in a codebase. Use when a user mentions high database bills, unexpected data transfer costs, network transfer charges, egress spikes, "why is my Neon bill so high", "database costs jumped", SELECT * optimization, query...
risk: unknown
source: https://github.com/neondatabase/agent-skills/tree/main/skills/neon-postgres-egress-optimizer
source_repo: neondatabase/agent-skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/neondatabase/agent-skills/blob/main/LICENSE
---

# Postgres Egress Optimizer
## When to Use

Use this skill when you need diagnose and fix excessive Postgres egress (network data transfer) in a codebase. Use when a user mentions high database bills, unexpected data transfer costs, network transfer charges, egress spikes, "why is my Neon bill so high", "database costs jumped", SELECT * optimization, query...


Guide the user through diagnosing and fixing application-side query patterns that cause excessive data transfer (egress) from their Postgres database. Most high egress bills come from the application fetching more data than it uses.

## Step 1: Diagnose

Identify which queries transfer the most data. The primary tool is the `pg_stat_statements` extension.

### Check if pg_stat_statements is available

```sql
SELECT 1 FROM pg_stat_statements LIMIT 1;
```

If this errors, the extension needs to be created:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

On Neon, it is available by default but may need this CREATE EXTENSION step.

### Handle empty stats

Stats are cleared when a Neon compute scales to zero and restarts. If the stats are empty or the compute recently woke up:

1. Reset the stats to start a clean measurement window: `SELECT pg_stat_statements_reset();`
2. Let the application run under representative traffic for at least an hour.
3. Return and run the diagnostic queries below.

If the user has stats from a production database, use those. If they have no access to production stats, proceed to Step 2 and analyze the codebase directly — code-level patterns are often sufficient to identify the worst offenders.

### Diagnostic queries

Run these to identify the top egress contributors. Focus on queries that return many rows, return wide rows (JSONB, TEXT, BYTEA columns), or are called very frequently.

**Queries returning the most total rows:**

```sql
SELECT query, calls, rows AS total_rows, rows / calls AS avg_rows_per_call
FROM pg_stat_statements
WHERE calls > 0
ORDER BY rows DESC
LIMIT 10;
```

**Queries returning the most rows per execution** (poorly scoped SELECTs, missing pagination):

```sql
SELECT query, calls, rows AS total_rows, rows / calls AS avg_rows_per_call
FROM pg_stat_statements
WHERE calls > 0
ORDER BY avg_rows_per_call DESC
LIMIT 10;
```

**Most frequently called queries** (candidates for caching):

```sql
SELECT query, calls, rows AS total_rows, rows / calls AS avg_rows_per_call
FROM pg_stat_statements
WHERE calls > 0
ORDER BY calls DESC
LIMIT 10;
```

**Longest running queries** (not a direct egress measure, but helps identify problem queries during a spike):

```sql
SELECT query, calls, rows AS total_rows,
  round(total_exec_time::numeric, 2) AS total_exec_time_ms
FROM pg_stat_statements
WHERE calls > 0
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Interpret the results

Rank findings by estimated egress impact:

- **High row count + wide rows** = biggest egress. A query returning 1,000 rows where each row includes a 50KB JSONB column transfers ~50MB per call.
- **Extreme call frequency** on even small queries adds up. A query called 50,000 times/day returning 10 rows each = 500,000 rows/day.
- **Cross-reference with the schema** to identify which columns are wide. Look for JSONB, TEXT, BYTEA, and large VARCHAR columns.

## Step 2: Analyze codebase

For each query identified in Step 1, or for each database query in the codebase if no stats are available, check:

- Does it select only the columns the response needs?
- Does it return a bounded number of rows (LIMIT/pagination)?
- Is it called frequently enough to benefit from caching?
- Does it fetch raw data that gets aggregated in application code?
- Does it use a JOIN that duplicates parent data across child rows?

## Step 3: Fix

Apply the appropriate fix for each problem found. Below are the most common egress anti-patterns and how to fix them.

### Unused columns (SELECT \*)

**Problem:** The query fetches all columns but the application only uses a few. Large columns (JSONB blobs, TEXT fields) get transferred over the wire and discarded.

**Before:**

```sql
SELECT * FROM products;
```

**After:**

```sql
SELECT id, name, price, image_urls FROM products;
```

### Missing pagination

**Problem:** A list endpoint returns all rows with no LIMIT. This is an unbounded egress risk — every new row in the table increases data transfer on every request. Flag this regardless of current table size.

This is easy to miss because the application may work fine with small datasets. But at scale, an unpaginated endpoint returning 10,000 rows with even moderate column widths can transfer hundreds of megabytes per day.

**Before:**

```sql
SELECT id, name, price FROM products;
```

**After:**

```sql
SELECT id, name, price FROM products
ORDER BY id
LIMIT 50 OFFSET 0;
```

When adding pagination, check whether the consuming client already supports paginated responses. If not, pick sensible defaults and document the pagination parameters in the API.

### High-frequency queries on static data

**Problem:** A query is called thousands of times per day but returns data that rarely changes. Every call transfers the same rows from the database. This pattern is only visible from `pg_stat_statements` — the code itself looks normal.

Look for queries with extremely high call counts relative to other queries. Common examples: configuration tables, category lists, feature flags, user role definitions.

**Fix:** Add a caching layer between the application and the database so it avoids hitting the database on every request.

### Application-side aggregation

**Problem:** The application fetches all rows from a table and then computes aggregates (averages, counts, sums, groupings) in application code. The full dataset transfers over the wire even though the result is a small summary.

**Fix:** Push the aggregation into SQL.

**Before:** The application fetches entire tables and aggregates in code with loops or `.reduce()`.

**After:**

```sql
SELECT p.category_id,
       AVG(r.rating) AS avg_rating,
       COUNT(r.id) AS review_count
FROM reviews r
INNER JOIN products p ON r.product_id = p.id
GROUP BY p.category_id;
```

### JOIN duplication

**Problem:** A JOIN between a wide parent table and a child table duplicates all parent columns across every child row. If a product has 200 reviews and the product row includes a 50KB JSONB column, the join sends that 50KB × 200 = ~10MB for a single request.

This is distinct from the SELECT \* problem. Even if you select only needed columns, a JOIN still repeats the parent data for every child row. The fix is structural: avoid the join entirely.

**Before:**

```sql
SELECT * FROM products
LEFT JOIN reviews ON reviews.product_id = products.id
WHERE products.id = 1;
```

**After (two separate queries):**

```sql
SELECT id, name, price, description, image_urls FROM products WHERE id = 1;
SELECT id, user_name, rating, body FROM reviews WHERE product_id = 1;
```

Two queries instead of one JOIN. The product data is fetched once. The reviews are fetched once. No duplication.

## Step 4: Verify

After applying fixes:

1. **Run existing tests** to confirm nothing broke.
2. **Check the responses** — make sure the API still returns the same data shape. Column selection and pagination changes can break clients that depend on specific fields or full result sets.
3. **Measure the improvement** — if pg_stat_statements data is available, reset it (`SELECT pg_stat_statements_reset();`), let traffic run, then re-run the diagnostic queries to compare before and after.

## Neon Infrastructure as Code (`neon.ts`)

The fixes above cut **egress** (data transferred out of Postgres). The other big non-prod cost lever is **compute**, and you can codify it durably in `neon.ts` — Neon's infrastructure-as-code file (see the `neon` skill for the full reference) — so dev, preview, and CI branches stay cheap by default instead of relying on per-branch flags:

```bash
npm i @neon/config
```

```typescript
// neon.ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  branch: (branch) => {
    if (branch.exists || branch.isDefault) return {}; // don't touch prod
    return {
      ttl: "7d", // ephemeral branches auto-expire instead of accruing storage
      postgres: {
        computeSettings: {
          autoscalingLimitMinCu: 0.25, // scale to zero when idle
          autoscalingLimitMaxCu: 1, // cap autoscaling on throwaway branches
          suspendTimeout: "5m",
        },
      },
    };
  },
});
```

```bash
neon config apply   # apply to the current branch (neon deploy is an alias)
```

This is complementary, not a substitute: query-pattern fixes are what actually reduce egress charges, while these settings keep non-production compute and storage from quietly inflating the same bill. Because `neon checkout` applies the policy when it creates a branch, new dev/preview branches inherit the cheap profile automatically.

## Further reading

- https://neon.com/docs/introduction/network-transfer.md
- https://neon.com/docs/introduction/cost-optimization.md

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
