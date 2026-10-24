---
name: odoo-performance-tuner
description: "Expert guide for diagnosing and fixing Odoo performance issues: slow queries, worker configuration, memory limits, PostgreSQL tuning, and profiling tools."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo Performance Tuner

## Overview

This skill helps diagnose and resolve Odoo performance problems — from slow page loads and database bottlenecks to worker misconfiguration and memory bloat. It covers PostgreSQL query tuning, Odoo worker settings, and built-in profiling tools.

## When to Use This Skill

- Odoo is slow in production (slow page loads, timeouts).
- Getting `MemoryError` or `Worker timeout` errors in logs.
- Diagnosing a slow database query using Odoo's profiler.
- Tuning `odoo.conf` for a specific server spec.

## How It Works

1. **Activate**: Mention `@odoo-performance-tuner` and describe your performance issue.
2. **Diagnose**: Share relevant log lines or config and receive a root cause analysis.
3. **Fix**: Get exact configuration changes with explanations.

## Examples

### Example 1: Recommended Worker Configuration

```ini
# odoo.conf — illustrative values only; measure workload and total memory before use

workers = 4                   # illustrative; budget HTTP, cron, DB and OS memory together
max_cron_threads = 2          # background cron jobs; keep ≤ 2 to preserve user-facing capacity
limit_memory_soft = 1610612736  # 1.5 GB — worker is recycled gracefully after this
limit_memory_hard = 2147483648  # 2.0 GB — worker is killed immediately; prevents OOM crashes
limit_time_cpu = 600          # max CPU seconds per request
limit_time_real = 1200        # max wall-clock seconds per request
limit_request = 8192          # max requests before worker recycles (prevents memory leaks)
```

### Example 2: Find Slow Queries with PostgreSQL

```sql
-- Step 1: Enable pg_stat_statements extension (run once as postgres superuser)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Step 2: Preserve existing preload entries and schedule a server restart when adding this module:
-- shared_preload_libraries = 'pg_stat_statements'
-- log_min_duration_statement = 1000   -- log queries taking > 1 second

-- Step 3: Find the top 10 slowest average queries
SELECT
    LEFT(query, 100) AS query_snippet,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Step 4: Inspect statistics as context; correlation alone does not identify missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'sale_order_line'
  AND correlation < 0.5   -- physical ordering statistic, not an index-quality verdict
ORDER BY n_distinct DESC;
```

### Example 3: Use Odoo's Built-In Profiler

```text
Prerequisites: Run Odoo with ?debug=1 in the URL to enable debug mode.

Menu: Settings → Technical → Profiling

Steps:
  1. Click "Enable Profiling" — set a duration (e.g., 60 seconds)
  2. Navigate to and reproduce the slow action
  3. Return to Settings → Technical → Profiling → View Results

These are investigation hypotheses, not automatic diagnoses. Check query plans, locks, data volume, cache validity and profiler overhead before applying indexes or caches.

What to look for:
  - Total SQL queries > 100 on a single page  → N+1 query problem
  - Single queries taking > 100ms             → missing DB index
  - Same query repeated many times            → missing cache, use @ormcache
  - Python time high but SQL low             → compute field inefficiency
```

## Best Practices

- ✅ **Do:** Batch recordset work and inspect actual SQL counts; accessing uncached fields through `mapped()`, `filtered()` or sorting may trigger database reads.
- ✅ **Do:** Add PostgreSQL B-tree indexes on columns frequently used in domain filters (`partner_id`, `state`, `date_order`).
- ✅ **Do:** Enable Odoo's HTTP caching for static assets and put a CDN (Cloudflare, AWS CloudFront) in front of the website.
- ✅ **Do:** Use `@tools.ormcache` decorator on methods pulled repeatedly with the same arguments.
- ❌ **Don't:** Set `workers = 0` in production — the non-worker server has different concurrency characteristics; use a deployment mode supported by the target OS and measured workload.
- ❌ **Don't:** Ignore `limit_memory_soft` — workers exceeding it are recycled between requests; without the limit they grow unbounded and crash.
- ❌ **Don't:** Directly manipulate `prefetch_ids` on recordsets — rely on Odoo's automatic batch prefetching, which activates by default.

## Limitations

- PostgreSQL tuning (`shared_buffers`, `work_mem`, `effective_cache_size`) is highly server-specific and not covered in depth here — use [PGTune](https://pgtune.leopard.in.ua/) as a starting baseline.
- The built-in Odoo profiler only captures **Python + SQL** traces; JavaScript rendering performance requires browser DevTools.
- **Odoo.sh** managed hosting restricts direct PostgreSQL and `odoo.conf` access — some tuning options are unavailable.
- Does not cover **Redis-based session store** or **Celery task queue** optimizations, which are advanced patterns for very high-traffic instances.
