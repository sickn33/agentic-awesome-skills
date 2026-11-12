# SQL Optimization Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# SQL Optimization Patterns

Preserve the query result before assessing performance. PostgreSQL-specific examples target PostgreSQL 18 unless marked otherwise; use an authorized test database with matching tables. DDL, configuration and maintenance examples require explicit authorization. EXPLAIN ANALYZE executes the statement, including possible function side effects.

## Do not use this skill when

- The task is unrelated to sql optimization patterns
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Debugging slow-running queries
- Designing performant database schemas
- Optimizing application response times
- Reducing database load and costs
- Improving scalability for growing datasets
- Analyzing EXPLAIN query plans
- Implementing efficient indexes
- Resolving N+1 query problems

## Core Concepts

### 1. Query Execution Plans (EXPLAIN)

Understanding EXPLAIN output is fundamental to optimization.

**PostgreSQL EXPLAIN:**
```sql
-- Basic explain
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- With actual execution stats
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- Verbose output with more details
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT u.*, o.order_total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days';
```

**Key Metrics to Watch:**
- **Seq Scan**: May be appropriate for small tables or queries returning much of a table
- **Index Scan**: Assess selectivity and heap reads, not just the node name
- **Index Only Scan**: Check heap fetches and visibility; not automatically fastest
- **Nested Loop**: Join method (okay for small datasets)
- **Hash Join**: Join method (good for larger datasets)
- **Merge Join**: Join method (good for sorted data)
- **Cost**: Estimated query cost (lower is better)
- **Rows**: Estimated rows returned
- **Actual Time**: Real execution time

### 2. Index Strategies

Indexes are the most powerful optimization tool.

**Index Types:**
- **B-Tree**: Default, good for equality and range queries
- **Hash**: Only for equality (=) comparisons
- **GIN**: Full-text search, array queries, JSONB
- **GiST**: Geometric data, full-text search
- **BRIN**: Block Range INdex for very large tables with correlation

```sql
-- Standard B-Tree index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (order matters!)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index (index subset of rows)
CREATE INDEX idx_active_users ON users(email)
WHERE status = 'active';

-- Expression index
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Covering index (include additional columns)
CREATE INDEX idx_users_email_covering ON users(email)
INCLUDE (name, created_at);

-- Full-text search index
CREATE INDEX idx_posts_search ON posts
USING GIN(to_tsvector('english', title || ' ' || body));

-- JSONB index
CREATE INDEX idx_metadata ON events USING GIN(metadata);
```

### 3. Query Optimization Patterns

**Avoid SELECT \*:**
```sql
-- Bad: Fetches unnecessary columns
SELECT * FROM users WHERE id = 123;

-- Good: Fetch only what you need
SELECT id, email, name FROM users WHERE id = 123;
```

**Use WHERE Clause Efficiently:**
```sql
-- Bad: Function prevents index usage
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- Good: Create functional index or use exact match
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Then:
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- Or store normalized data
SELECT * FROM users WHERE email = 'user@example.com';
```

**Optimize JOINs:**
```sql
-- Equivalent inner-join spelling; the optimizer may produce the same plan
SELECT u.name, o.total
FROM users u, orders o
WHERE u.id = o.user_id AND u.created_at > '2024-01-01';

-- Explicit JOIN improves readability, not necessarily execution
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01';

-- Equivalent subquery form; only users are filtered here
SELECT u.name, o.total
FROM (SELECT * FROM users WHERE created_at > '2024-01-01') u
JOIN orders o ON u.id = o.user_id;
```

## Optimization Patterns

### Pattern 1: Eliminate N+1 Queries

**Problem: N+1 Query Anti-Pattern**
```python
# Bad: Executes N+1 queries
users = db.query("SELECT * FROM users LIMIT 10")
for user in users:
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id)
    # Process orders
```

**Solution: Use JOINs or Batch Loading**
```sql
-- Solution 1: JOIN
SELECT
    u.id, u.name,
    o.id as order_id, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.id IN (1, 2, 3, 4, 5);

-- Solution 2: Batch query
SELECT * FROM orders
WHERE user_id IN (1, 2, 3, 4, 5);
```

**Executable SQLite batch loading** (an existing connection and table are required):

```python
# batch-loading-example

def load_orders(connection, user_ids):
    if not user_ids:
        return []
    if len(user_ids) > 500:
        raise ValueError("Batch limit is 500 IDs; split larger inputs")
    placeholders = ",".join("?" for _ in user_ids)
    return connection.execute(
        f"SELECT id, user_id, total FROM orders WHERE user_id IN ({placeholders}) ORDER BY id",
        tuple(user_ids),
    ).fetchall()
```

Values are bound, never interpolated. A single `IN (?)` parameter does not expand a Python list. Other drivers use different placeholders. Preserve parents with no orders when reconstructing parent/child results; a JOIN duplicates parent rows when multiple children match.

### Pattern 2: Optimize Pagination

**Bad: OFFSET on Large Tables**
```sql
-- Slow for large offsets
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 100000;  -- Very slow!
```

**Good: Cursor-Based Pagination**
```sql
-- Single-column cursor is valid only when created_at is unique and non-null
SELECT * FROM users
WHERE created_at < '2024-01-15 10:30:00'  -- Last cursor
ORDER BY created_at DESC
LIMIT 20;

-- For timestamp ties, use both non-null created_at and unique id from the last row
SELECT * FROM users
WHERE (created_at, id) < ('2024-01-15 10:30:00', 12345)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Requires index
CREATE INDEX idx_users_cursor ON users(created_at DESC, id DESC);
```

### Pattern 3: Aggregate Efficiently

**Optimize COUNT Queries:**
```sql
-- Bad: Counts all rows
SELECT COUNT(*) FROM orders;  -- Slow on large tables

-- Approximate count only; not equivalent to exact COUNT(*)
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE oid = 'public.orders'::regclass;

-- Good: Filter before counting
SELECT COUNT(*) FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- Better: Use index-only scan
CREATE INDEX idx_orders_created ON orders(created_at);
SELECT COUNT(*) FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Optimize GROUP BY:**
```sql
-- Bad: Group by then filter
SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 10;

-- DIFFERENT REQUIREMENT: count only completed orders; not an equivalent rewrite
SELECT user_id, COUNT(*) as order_count
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(*) > 10;

-- Candidate index; compare the actual plan and write overhead
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### Pattern 4: Subquery Optimization

**Transform Correlated Subqueries:**
```sql
-- Bad: Correlated subquery (runs for each row)
SELECT u.name, u.email,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
FROM users u;

-- Good: JOIN with aggregation
SELECT u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name, u.email;

-- Alternative window form; may process more rows, measure before choosing
SELECT DISTINCT ON (u.id)
    u.name, u.email,
    COUNT(o.id) OVER (PARTITION BY u.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

**Use CTEs for Clarity:**
```sql
-- Using Common Table Expressions
WITH recent_users AS (
    SELECT id, name, email
    FROM users
    WHERE created_at > NOW() - INTERVAL '30 days'
),
user_order_counts AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT ru.name, ru.email, COALESCE(uoc.order_count, 0) as orders
FROM recent_users ru
LEFT JOIN user_order_counts uoc ON ru.id = uoc.user_id;
```

### Pattern 5: Batch Operations

**Batch INSERT:**
```sql
-- Bad: Multiple individual inserts
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
INSERT INTO users (name, email) VALUES ('Carol', 'carol@example.com');

-- Good: Batch insert
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com'),
    ('Carol', 'carol@example.com');

-- Better: Use COPY for bulk inserts (PostgreSQL)
COPY users (name, email) FROM '/tmp/users.csv' CSV HEADER;
```

**Batch UPDATE:**
```sql
-- Bad: Update in loop
UPDATE users SET status = 'active' WHERE id = 1;
UPDATE users SET status = 'active' WHERE id = 2;
-- ... repeat for many IDs

-- Good: Single UPDATE with IN clause
UPDATE users
SET status = 'active'
WHERE id IN (1, 2, 3, 4, 5);

-- Better: Use temporary table for large batches
CREATE TEMP TABLE temp_user_updates (id INT, new_status VARCHAR);
INSERT INTO temp_user_updates VALUES (1, 'active'), (2, 'active');

UPDATE users u
SET status = t.new_status
FROM temp_user_updates t
WHERE u.id = t.id;
```

## Advanced Techniques

### Materialized Views

Pre-compute expensive queries.

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW user_order_summary AS
SELECT
    u.id,
    u.name,
    COUNT(o.id) as total_orders,
    SUM(o.total) as total_spent,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Add index to materialized view
CREATE INDEX idx_user_summary_spent ON user_order_summary(total_spent DESC);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW user_order_summary;

-- Concurrent refresh requires a populated view and a non-partial UNIQUE index on plain columns.
CREATE UNIQUE INDEX idx_user_summary_id ON user_order_summary(id);
REFRESH MATERIALIZED VIEW CONCURRENTLY user_order_summary;

-- Query materialized view (very fast)
SELECT * FROM user_order_summary
WHERE total_spent > 1000
ORDER BY total_spent DESC;
```

### Partitioning

Split large tables for better performance.

```sql
-- Range partitioning by date (PostgreSQL)
CREATE TABLE orders (
    id SERIAL,
    user_id INT,
    total DECIMAL,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Queries automatically use appropriate partition
SELECT * FROM orders
WHERE created_at >= '2024-02-01' AND created_at < '2024-03-01';
-- Only scans orders_2024_q1 partition
```

### Query Hints and Optimization

```sql
-- Restrict candidate indexes (MySQL); USE INDEX does not force an index scan
SELECT * FROM users
USE INDEX (idx_users_email)
WHERE email = 'user@example.com';

-- Parallel query (PostgreSQL)
SET max_parallel_workers_per_gather = 4;
SELECT * FROM large_table WHERE id = 123;

-- Join hints (PostgreSQL)
SET enable_nestloop = OFF;  -- Discourage nested loops for diagnosis; not an absolute prohibition
```

## Best Practices

1. **Index Selectively**: Too many indexes slow down writes
2. **Monitor Query Performance**: Use slow query logs
3. **Keep Statistics Updated**: Run ANALYZE regularly
4. **Use Appropriate Data Types**: Smaller types = better performance
5. **Normalize Thoughtfully**: Balance normalization vs performance
6. **Cache Frequently Accessed Data**: Use application-level caching
7. **Connection Pooling**: Reuse database connections
8. **Regular Maintenance**: VACUUM, ANALYZE, rebuild indexes

```sql
-- Update statistics
ANALYZE users;
ANALYZE VERBOSE orders;

-- Vacuum (PostgreSQL)
VACUUM ANALYZE users;
VACUUM FULL users;  -- Reclaim space (locks table)

-- Reindex
REINDEX INDEX idx_users_email;
REINDEX TABLE users;
```

## Common Pitfalls

- **Over-Indexing**: Each index slows down INSERT/UPDATE/DELETE
- **Unused Indexes**: Waste space and slow writes
- **Missing Indexes**: Slow queries, full table scans
- **Implicit Type Conversion**: Prevents index usage
- **OR Conditions**: May combine indexes; inspect the plan
- **LIKE with Leading Wildcard**: Ordinary B-tree indexes often do not help; specialized indexes may
- **Function in WHERE**: Prevents index usage unless functional index exists

## Monitoring Queries

```sql
-- Requires an already configured pg_stat_statements extension and suitable privileges.
-- Query text can contain sensitive values; do not export it without permission.
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Find missing indexes (PostgreSQL)
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;

-- Zero scans are observations since statistics reset, not permission to drop an index.
SELECT
    schemaname,
    tablename,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Verified reference material

- [PostgreSQL 18 EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html): execution, estimates and observed plans.
- [PostgreSQL 18 materialized-view refresh](https://www.postgresql.org/docs/18/sql-refreshmaterializedview.html): populated view and unique-index requirements.
- [PostgreSQL 18 statement statistics](https://www.postgresql.org/docs/18/pgstatstatements.html): extension prerequisites and current time columns.

The former references to unbundled local guides and scripts have been removed. Examples above assume application tables and permissions; they are not one migration script. Performance, locks, concurrent changes, extension setup and production-provider behavior require separate environment-specific verification.
