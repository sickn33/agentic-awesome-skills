# psql Tips — Workflows & Patterns

Part of the psql tips reference. See also: tips-advanced.md

Practical workflows and common patterns for getting the most out of psql.

## Table of Contents

- [Pattern Matching in \d Commands](#pattern-matching-in-d-commands)
- [Common Workflows](#common-workflows)
- [Scripting Patterns](#scripting-patterns)
- [Output for Scripts and Automation](#output-for-scripts-and-automation)
- [Data Import/Export Patterns](#data-importexport-patterns)

---

## Pattern Matching in \d Commands

All `\d` commands that accept a pattern parameter use the same matching rules. Understanding these rules is key to efficient database exploration.

### Pattern Syntax

| Pattern | Meaning | Example |
| ------- | ------- | ------- |
| `*` | Any sequence of characters | `\dt user*` matches `users`, `user_accounts` |
| `?` | Any single character | `\dt user?` matches `users` but not `user_accounts` |
| `.` | Separates schema from object | `\dt public.*` lists all tables in `public` |

### How Matching Works

1. **Dot notation**: If the pattern contains a dot, the part before the dot matches schema names, the part after matches object names. `\dt public.users` means schema=`public`, table=`users`.

2. **No dot**: Matches objects in schemas on the current `search_path`. `\dt users` finds `users` in any searchable schema.

3. **Wildcard expansion**: `*` and `?` are expanded into regular expressions:
   - `*` becomes `.*` (any characters)
   - `?` becomes `.` (one character)
   - Advanced regex notations like `[0-9]` work for character classes
   - `.` in pattern position is a schema/object separator (not regex any-char)
   - `$` is matched literally (not regex anchor)

4. **Case folding**: Unquoted letters in patterns are folded to lowercase (matching SQL identifier behavior). `\dt FOO` finds table `foo`. Double quotes prevent folding: `\dt "FOO"` finds table `FOO` (not `foo`).

### Practical Examples

```sql
-- All tables in any schema containing "user"
\dt *.user*

-- All tables in the public schema
\dt public.*

-- All tables starting with "order" in any schema
\dt *.order*

-- Detail view of a specific table
\d+ public.users

-- All indexes on tables starting with "user"
\di user*

-- All functions in the public schema
\df public.*

-- All materialized views
\dm

-- Check table size and description
\dt+ public.*
```

---

## Common Workflows

### Exploring a New Database

```sql
-- Step 1: What databases exist?
\l

-- Step 2: Connect to one
\c mydb

-- Step 3: What schemas are there?
\dn

-- Step 4: What tables exist?
\dt

-- Step 5: What does this table look like?
\d users

-- Step 6: Any indexes?
\di

-- Step 7: Any views?
\dv

-- Step 8: What functions exist?
\df

-- Step 9: What extensions are installed?
\dx

-- Step 10: Check current settings
SHOW all;
```

### Understanding Table Structure

```sql
-- Basic structure: columns, types, nullable, defaults
\d table_name

-- Detailed: everything above plus indexes, constraints, triggers, storage info
\d+ table_name

-- Just the indexes
\di table_name*

-- Just the foreign keys (shown in \d output)
\d table_name
-- Look for "Foreign-key constraints" section

-- Column comments
\dS+ table_name  -- includes system columns

-- Storage details (toast, compression)
\d+ table_name
```

### Checking Query Performance

```sql
-- Enable timing
\timing on

-- See the execution plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- See what the optimizer actually does
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;

-- Check current activity
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Watch a query
SELECT pg_size_pretty(pg_database_size(current_database()));
\watch 60
```

### Managing Transactions Manually

```sql
\set AUTOCOMMIT off

BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

\set AUTOCOMMIT on
```

---

## Scripting Patterns

### Safe Script Template

```sql
-- Always start with this in scripts
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- Optional: echo commands for debugging
\set ECHO all

-- Your migration or operations go here
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(20);

COMMIT;
```

### Conditional Execution

```sql
-- \if evaluates its argument as a boolean (true/false/1/0/on/off/yes/no)
-- For string comparison, use SQL to set a boolean variable:
SELECT current_setting('is_production', true) = 'true' AS is_prod \gset
\if :is_prod
  \echo 'WARNING: Running on PRODUCTION'
  -- \if only accepts boolean values. To check user input for a specific string,
  -- use SQL to produce a boolean result:
  \prompt 'Type YES to continue: ' confirm
  SELECT :'confirm' = 'YES' AS confirmed \gset
  \if :confirmed
    \echo 'Continuing...'
  \else
    \echo 'Aborted.'
  \endif
\endif

-- Check if a variable is defined using :{?varname}
\if :{?required_var}
  \echo 'required_var is set to:' :required_var
\else
  \echo 'ERROR: required_var is not defined. Aborting.'
  \q
\endif
```

### Dynamic SQL with \gexec

```sql
-- Generate and execute ANALYZE for all tables
SELECT 'ANALYZE ' || schemaname || '.' || tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
\gexec

-- Generate GRANT statements
SELECT 'GRANT SELECT ON ' || tablename || ' TO readonly;'
FROM pg_tables
WHERE schemaname = 'public';
\gexec

-- Create partition tables dynamically
SELECT 'CREATE TABLE measurements_' || to_char(d, 'YYYY_MM') ||
       ' PARTITION OF measurements FOR VALUES FROM (''' ||
       to_char(d, 'YYYY-MM-01') || ''') TO (''' ||
       to_char(d + interval '1 month', 'YYYY-MM-01') || ''');'
FROM generate_series('2024-01-01'::date, '2024-12-01'::date, '1 month') AS d;
\gexec
```

### Backquote Expansion (Shell Command Substitution)

Text inside backquotes (`` ` ``) in meta-command arguments is executed as a shell command, and the output replaces the backquoted text. This lets you inject dynamic values from the OS into psql:

```sql
-- Inject current date into a variable
\set report_date `date +%Y-%m-%d`
\echo :report_date
-- outputs: 2026-04-02

-- Use shell output in a file path
\o /tmp/query_output_`date +%Y%m%d_%H%M%S`.csv
SELECT * FROM users;
\o

-- Show system information
\echo 'Running as user: ' `whoami`
\echo 'Hostname: ' `hostname`

-- Use shell arithmetic
\set batch_size `echo 1000`
SELECT * FROM users LIMIT :batch_size;

-- Combine with \setenv for dynamic configuration
\setenv PAGER `which less`
```

**Limitations**:

- Backquote expansion is NOT performed inside single-quoted strings
- Not performed in lines skipped by `\if`/`\else`/`\elif`
- Not performed in `\copy` arguments (the entire line is taken literally)

**Variable expansion inside backquotes**: psql variable references (`:varname`, `:'varname'`) ARE expanded within backquoted text before the shell command is executed. The `:'varname'` form is preferred because it properly escapes special characters for shell safety. However, `:'varname'` will error if the variable value contains carriage return or line feed characters.

```sql
-- Get table count and use it
SELECT count(*) as user_count FROM users;
\gset
\echo 'Total users: ' :user_count

-- Get max ID and use in next query
SELECT max(id) as max_id FROM orders;
\gset
SELECT * FROM orders WHERE id > :max_id - 10;

-- Prefix to avoid collisions
SELECT oid, relname FROM pg_class WHERE relname = 'users';
\gset pg_
\echo 'OID of users table: ' :pg_oid
```

### Include Other Scripts

```sql
-- Relative to current working directory
\i init/001_schema.sql
\i init/002_seed.sql
\i init/003_permissions.sql

-- Relative to this file's location (better for portability)
\ir ../shared/helpers.sql
```

### Loop Pattern (using shell)

```bash
# Not a psql feature, but a common pattern combining shell and psql
for table in users orders products; do
  psql -c "SELECT count(*) FROM $table" mydb
done
```

---

## Output for Scripts and Automation

### Machine-Readable Output

```bash
# CSV output
psql -A -F ',' -t -c "SELECT id, name FROM users" mydb

# TSV output
psql -A -F $'\t' -t -c "SELECT id, name FROM users" mydb

# Single value (no header, no border)
psql -A -t -c "SELECT count(*) FROM users" mydb

# JSON output (use PostgreSQL's JSON functions)
psql -A -t -c "SELECT json_agg(t) FROM (SELECT id, name FROM users) t" mydb

# NUL-separated (for xargs -0)
# WARNING: Ensure filenames from the database are trusted before piping to destructive commands
psql -A -0 -t -c "SELECT filename FROM files_to_process" mydb | xargs -0 process_file
```

### In-Session Output Control

```sql
-- Quick CSV dump
\pset format csv
\o /tmp/output.csv
SELECT id, name, email FROM users;
\o
\pset format aligned

-- Using \g options (no need to change global settings)
SELECT * FROM users \g (format=csv footer=off) /tmp/users.csv

-- Pipe to a command
SELECT pg_database_size(current_database()) \g | numfmt --to=iec

-- Unaligned for quick copy-paste
\a
\t on
SELECT string_agg(column_name, ', ') FROM information_schema.columns WHERE table_name = 'users';
\t off
\a
```

---

## Data Import/Export Patterns

### CSV Import

```sql
-- Standard CSV import
\copy table_name FROM 'data.csv' WITH (FORMAT csv, HEADER true)

-- Custom delimiter
\copy table_name FROM 'data.tsv' WITH (FORMAT csv, HEADER true, DELIMITER E'\t')

-- Handle NULLs
\copy table_name FROM 'data.csv' WITH (FORMAT csv, HEADER true, NULL 'N/A')

-- Specific columns only
\copy table_name (col1, col2, col3) FROM 'partial.csv' WITH (FORMAT csv, HEADER true)
```

### CSV Export

```sql
-- Full table export
\copy table_name TO 'export.csv' WITH (FORMAT csv, HEADER true)

-- Query export
\copy (SELECT id, name, created_at FROM users WHERE active ORDER BY created_at DESC) TO 'active_users.csv' WITH (FORMAT csv, HEADER true)

-- Compressed export (pipe through gzip, no intermediate file)
\copy table_name TO program 'gzip > export.csv.gz' WITH (FORMAT csv, HEADER true)-- Import from compressed (decompress on the fly)
\copy table_name FROM program 'gzip -dc import.csv.gz' WITH (FORMAT csv, HEADER true)
```

### Database Migration Between Servers

```bash
# Dump and restore via pipe (no intermediate file)
pg_dump -Fc source_db | pg_restore -d target_db

# Schema-only dump
pg_dump --schema-only source_db | psql target_db

# Data-only with parallel jobs
pg_dump -j4 -Fd source_db -f /tmp/dump_dir
pg_restore -j4 -d target_db /tmp/dump_dir
```
