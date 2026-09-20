---
name: postgresql-devsec
description: Administer PostgreSQL databases. Configure replication, backups, and
  performance tuning. Use when managing PostgreSQL deployments.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# PostgreSQL

Administer, optimize, and secure PostgreSQL databases in development and production environments.

## When to Use

- You need a reliable, ACID-compliant relational database.
- Your application requires advanced features such as JSONB, full-text search, or CTEs.
- You are setting up streaming replication or point-in-time recovery.
- You need to tune an existing PostgreSQL deployment for better throughput.

## Prerequisites

- Linux server (Debian/Ubuntu or RHEL-based) or Docker.
- Root or sudo access for package installation.
- Familiarity with SQL fundamentals.

## Installation and Setup

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# RHEL / Amazon Linux
sudo dnf install -y postgresql15-server postgresql15-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Verify
psql --version
sudo systemctl status postgresql
```

## Initial User and Database Setup

```bash
# Switch to the postgres system user
sudo -u postgres psql
```

```sql
-- Create an application user
CREATE USER myapp WITH PASSWORD 'strong_password_here';

-- Create the database owned by that user
CREATE DATABASE mydb OWNER myapp;

-- Grant connection privileges
GRANT ALL PRIVILEGES ON DATABASE mydb TO myapp;

-- Connect to the database and set default privileges
\c mydb
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO myapp;
```

## psql Commands Reference

```
\l              -- list databases
\dt             -- list tables in current database
\d+ tablename   -- describe table with storage info
\du             -- list roles
\x              -- toggle expanded output
\timing on      -- show query execution time
\i file.sql     -- execute SQL from file
\copy           -- fast client-side COPY
```

## Configuration Tuning

Edit `/etc/postgresql/15/main/postgresql.conf` (path varies by OS and version).

```ini
# Connection settings
listen_addresses = '*'
max_connections = 200

# Memory — adjust to ~25% of total RAM for shared_buffers
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB

# WAL / write performance
wal_buffers = 64MB
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 4GB

# Planner
random_page_cost = 1.1          # lower for SSD
effective_io_concurrency = 200  # for SSD

# Logging
log_min_duration_statement = 250   # log queries slower than 250 ms
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

```bash
# Reload configuration without restart
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Some settings (shared_buffers, max_connections) require a full restart
sudo systemctl restart postgresql
```

## pg_hba.conf — Client Authentication

```
# /etc/postgresql/15/main/pg_hba.conf
# TYPE  DATABASE  USER      ADDRESS         METHOD
local   all       postgres                  peer
host    mydb      myapp     10.0.0.0/8      scram-sha-256
host    all       all       0.0.0.0/0       reject
```

```bash
sudo systemctl reload postgresql
```

## Backup and Restore

### Logical Backups with pg_dump

```bash
# Plain SQL backup
pg_dump -U myapp -h localhost mydb > /backups/mydb_$(date +%F).sql

# Custom compressed format (recommended)
pg_dump -U myapp -h localhost -Fc mydb > /backups/mydb_$(date +%F).dump

# Backup a single table
pg_dump -U myapp -h localhost -t orders -Fc mydb > /backups/orders.dump

# Restore from custom format
pg_restore -U myapp -h localhost -d mydb --clean --if-exists /backups/mydb_2025-01-15.dump

# Restore plain SQL
psql -U myapp -h localhost -d mydb < /backups/mydb_2025-01-15.sql
```

### Physical Backups with pg_basebackup

```bash
# Full base backup (used for PITR and replica seeding)
pg_basebackup -h localhost -U replicator -D /backups/base_$(date +%F) \
  --wal-method=stream --checkpoint=fast --progress --verbose

# Verify the backup
pg_verifybackup /backups/base_2025-01-15
```

## Streaming Replication

### Primary Server

```sql
-- Create replication user
CREATE USER replicator WITH REPLICATION LOGIN PASSWORD 'repl_secret';
```

```ini
# postgresql.conf on primary
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB
```

```
# pg_hba.conf on primary
host replication replicator 10.0.0.0/8 scram-sha-256
```

### Replica Server

```bash
# Stop PostgreSQL on the replica
sudo systemctl stop postgresql

# Remove existing data directory
ls /var/lib/postgresql/15/main/*  # verify this is the correct data dir first
sudo find /var/lib/postgresql/15/main -mindepth 1 -delete  # empty the data dir; snapshots must exist (see Limitations)

# Base backup from primary
sudo -u postgres pg_basebackup \
  -h 10.0.0.1 -U replicator \
  -D /var/lib/postgresql/15/main \
  --wal-method=stream --checkpoint=fast --progress

# Create standby signal file
sudo -u postgres touch /var/lib/postgresql/15/main/standby.signal
```

```ini
# postgresql.conf on replica
primary_conninfo = 'host=10.0.0.1 port=5432 user=replicator password=repl_secret'
hot_standby = on
```

```bash
sudo systemctl start postgresql
```

### Verify Replication

```sql
-- On primary
SELECT client_addr, state, sent_lsn, replay_lsn
FROM pg_stat_replication;

-- On replica
SELECT pg_is_in_recovery();           -- should return true
SELECT pg_last_wal_receive_lsn();
SELECT pg_last_wal_replay_lsn();
```

## Monitoring Queries

```sql
-- Active connections by state
SELECT state, COUNT(*)
FROM pg_stat_activity
GROUP BY state;

-- Long-running queries (> 30 seconds)
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '30 seconds'
ORDER BY duration DESC;

-- Table bloat and dead tuples
SELECT relname,
       n_live_tup,
       n_dead_tup,
       ROUND(n_dead_tup::numeric / GREATEST(n_live_tup, 1) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Index usage statistics
SELECT relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 10;

-- Cache hit ratio (should be > 99%)
SELECT ROUND(
  100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2
) AS cache_hit_pct
FROM pg_stat_database;

-- Database size
SELECT pg_database.datname,
       pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    command: >
      postgres
        -c shared_buffers=256MB
        -c work_mem=8MB
        -c maintenance_work_mem=128MB
        -c effective_cache_size=768MB
        -c log_min_duration_statement=250
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: edoburu/pgbouncer:latest
    restart: unless-stopped
    ports:
      - "6432:6432"
    environment:
      DATABASE_URL: postgres://myapp:secret@postgres:5432/mydb
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 500
      DEFAULT_POOL_SIZE: 40
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pg_data:
```

```bash
docker compose up -d
psql -h 127.0.0.1 -p 6432 -U myapp mydb
```

## Maintenance Tasks

```bash
# Manual VACUUM and ANALYZE
sudo -u postgres psql -d mydb -c "VACUUM ANALYZE;"

# Reindex a bloated index
sudo -u postgres psql -d mydb -c "REINDEX INDEX CONCURRENTLY idx_orders_user_id;"

# Check for unused indexes
sudo -u postgres psql -d mydb -c "
  SELECT indexrelname, idx_scan
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  ORDER BY pg_relation_size(indexrelid) DESC;"
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `FATAL: too many connections` | Connection limit reached | Increase `max_connections` or add PgBouncer |
| Slow SELECT on large table | Missing index or stale statistics | Run `EXPLAIN ANALYZE`; add index; run `ANALYZE` |
| High CPU from autovacuum | Large number of dead tuples | Tune `autovacuum_vacuum_cost_delay`; run manual `VACUUM` |
| Replication lag increasing | Replica under-provisioned or network bottleneck | Check `pg_stat_replication`; increase `wal_keep_size` |
| `could not access file "base/..."` | Disk full or corrupt data directory | Free disk space; restore from `pg_basebackup` |
| `FATAL: password authentication failed` | Wrong credentials or pg_hba.conf mismatch | Verify pg_hba.conf entries and reload |

## Related Skills

- mysql (`mysql`) - Alternative relational database
- database-backups (`database-backups`) - Automated backup strategies
- redis (`redis`) - Caching layer to reduce database load
- planetscale (`planetscale`) - Managed MySQL-compatible alternative

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

