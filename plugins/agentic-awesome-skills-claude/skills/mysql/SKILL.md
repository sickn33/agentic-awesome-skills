---
name: mysql
description: Administer MySQL/MariaDB databases. Configure replication and optimize
  performance. Use when managing MySQL deployments.
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

# MySQL / MariaDB

Administer, optimize, and secure MySQL and MariaDB databases in development and production environments.

## When to Use

- You need a mature, widely supported relational database.
- Your stack depends on MySQL-specific features or compatibility (WordPress, Magento, many PHP frameworks).
- You are setting up source-replica replication for read scaling.
- You want to tune InnoDB for high-throughput transactional workloads.

## Prerequisites

- Linux server (Debian/Ubuntu or RHEL-based) or Docker.
- Root or sudo access for package installation.
- Familiarity with SQL fundamentals.

## Installation and Setup

```bash
# Debian / Ubuntu — MySQL 8
sudo apt update
sudo apt install -y mysql-server

# RHEL / Amazon Linux
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld

# Run the secure installation wizard
sudo mysql_secure_installation
# Prompts: set root password, remove anonymous users, disable remote root, remove test db

# Verify
mysql --version
sudo systemctl status mysql
```

## Initial User and Database Setup

```bash
sudo mysql -u root -p
```

```sql
-- Create a database
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create an application user with strong auth
CREATE USER 'myapp'@'%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'myapp'@'%';
FLUSH PRIVILEGES;

-- Verify
SHOW GRANTS FOR 'myapp'@'%';
```

## mysql CLI Reference

```bash
# Connect
mysql -u myapp -p -h 127.0.0.1 mydb

# Execute a single statement
mysql -u myapp -p -e "SELECT COUNT(*) FROM orders;" mydb

# Import a SQL file
mysql -u myapp -p mydb < schema.sql

# Export query results to CSV
mysql -u myapp -p -e "SELECT * FROM users" mydb \
  | tr '\t' ',' > users.csv
```

```
-- Inside the mysql shell
SHOW DATABASES;
USE mydb;
SHOW TABLES;
DESCRIBE users;
SHOW CREATE TABLE users\G
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS\G
```

## Configuration Tuning

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` (or `/etc/my.cnf` on RHEL).

```ini
[mysqld]
# -- Networking --
bind-address           = 0.0.0.0
max_connections        = 300
wait_timeout           = 600
interactive_timeout    = 600

# -- InnoDB (most impactful settings) --
innodb_buffer_pool_size   = 4G          # ~70% of RAM on a dedicated server
innodb_buffer_pool_instances = 4        # 1 per GB of pool (up to 64)
innodb_log_file_size      = 1G
innodb_flush_log_at_trx_commit = 1      # 1 = ACID; 2 = faster, slight risk
innodb_flush_method       = O_DIRECT    # avoids double buffering on Linux
innodb_io_capacity        = 2000        # raise for SSD
innodb_io_capacity_max    = 4000

# -- Query cache (disabled in MySQL 8, use ProxySQL or app cache) --
# query_cache_type = 0

# -- Logging --
slow_query_log         = 1
slow_query_log_file    = /var/log/mysql/slow.log
long_query_time        = 1
log_error              = /var/log/mysql/error.log

# -- Binary log (required for replication) --
server-id              = 1
log_bin                = /var/log/mysql/mysql-bin
binlog_expire_logs_seconds = 604800     # 7 days
sync_binlog            = 1

# -- Character set --
character-set-server   = utf8mb4
collation-server       = utf8mb4_unicode_ci
```

```bash
# Apply changes
sudo systemctl restart mysql

# Verify a setting at runtime
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

## Backup and Restore

### Logical Backups with mysqldump

```bash
# Single database
mysqldump -u root -p --single-transaction --routines --triggers \
  mydb > /backups/mydb_$(date +%F).sql

# All databases
mysqldump -u root -p --all-databases --single-transaction \
  > /backups/all_$(date +%F).sql

# Compressed backup
mysqldump -u root -p --single-transaction mydb \
  | gzip > /backups/mydb_$(date +%F).sql.gz

# Restore
mysql -u root -p mydb < /backups/mydb_2025-01-15.sql

# Restore compressed
gunzip < /backups/mydb_2025-01-15.sql.gz | mysql -u root -p mydb
```

### Physical Backups with Percona XtraBackup

```bash
# Install
sudo apt install -y percona-xtrabackup-80

# Full backup
xtrabackup --backup --user=root --password=secret \
  --target-dir=/backups/full_$(date +%F)

# Prepare the backup (apply redo logs)
xtrabackup --prepare --target-dir=/backups/full_2025-01-15

# Restore (stop MySQL first)
sudo systemctl stop mysql
ls /var/lib/mysql/*  # verify this is the correct data dir first
sudo find /var/lib/mysql -mindepth 1 -delete  # empty the data dir; snapshots must exist (see Limitations)
xtrabackup --move-back --target-dir=/backups/full_2025-01-15
sudo chown -R mysql:mysql /var/lib/mysql
sudo systemctl start mysql
```

### Incremental Backup with XtraBackup

```bash
# Incremental based on the full backup
xtrabackup --backup --user=root --password=secret \
  --target-dir=/backups/inc_$(date +%F) \
  --incremental-basedir=/backups/full_2025-01-15

# Prepare: apply full, then incremental
xtrabackup --prepare --apply-log-only --target-dir=/backups/full_2025-01-15
xtrabackup --prepare --target-dir=/backups/full_2025-01-15 \
  --incremental-dir=/backups/inc_2025-01-16
```

## Source-Replica Replication

### Source (Primary)

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
server-id       = 1
log_bin         = /var/log/mysql/mysql-bin
binlog_format   = ROW
```

```sql
-- Create replication user
CREATE USER 'replicator'@'10.0.0.%' IDENTIFIED BY 'repl_secret';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'10.0.0.%';
FLUSH PRIVILEGES;

-- Get current binary log position
SHOW MASTER STATUS\G
```

### Replica

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
server-id  = 2
relay_log  = /var/log/mysql/relay-bin
read_only  = ON
```

```sql
-- Point replica to source (use SHOW MASTER STATUS values)
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST     = '10.0.0.1',
  SOURCE_USER     = 'replicator',
  SOURCE_PASSWORD = '...' # replication secret from your vault,
  SOURCE_LOG_FILE = 'mysql-bin.000003',
  SOURCE_LOG_POS  = 154;

START REPLICA;

-- Verify
SHOW REPLICA STATUS\G
-- Check: Replica_IO_Running = Yes, Replica_SQL_Running = Yes, Seconds_Behind_Source = 0
```

## Monitoring Queries

```sql
-- Connection statistics
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- InnoDB buffer pool hit ratio (should be > 99%)
SELECT
  ROUND(100 - (
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') /
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests')
  ) * 100, 2) AS buffer_pool_hit_pct;

-- Top 10 slow queries (requires performance_schema)
SELECT DIGEST_TEXT, COUNT_STAR, AVG_TIMER_WAIT / 1e12 AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;

-- Table sizes
SELECT table_name,
       ROUND(data_length / 1024 / 1024, 2) AS data_mb,
       ROUND(index_length / 1024 / 1024, 2) AS index_mb,
       table_rows
FROM information_schema.tables
WHERE table_schema = 'mydb'
ORDER BY data_length DESC;

-- Check replication lag
SHOW REPLICA STATUS\G
-- Look at Seconds_Behind_Source
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: mydb
      MYSQL_USER: myapp
      MYSQL_PASSWORD: secret
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    command: >
      --innodb-buffer-pool-size=512M
      --max-connections=200
      --slow-query-log=ON
      --long-query-time=1
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpass"]
      interval: 10s
      timeout: 5s
      retries: 5

  phpmyadmin:
    image: phpmyadmin:latest
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      PMA_HOST: mysql
      PMA_USER: root
      PMA_PASSWORD: rootpass
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:
```

```bash
docker compose up -d
mysql -h 127.0.0.1 -u myapp -psecret mydb
```

## Maintenance Tasks

```bash
# Optimize a fragmented table (locks the table briefly)
mysql -u root -p -e "OPTIMIZE TABLE mydb.orders;"

# Analyze tables to update statistics
mysql -u root -p -e "ANALYZE TABLE mydb.orders;"

# Check and repair a table
mysql -u root -p -e "CHECK TABLE mydb.orders;"
mysql -u root -p -e "REPAIR TABLE mydb.orders;"

# Rotate slow query log
sudo mv /var/log/mysql/slow.log /var/log/mysql/slow.log.old
mysqladmin -u root -p flush-logs
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Too many connections` | Connection limit exceeded | Increase `max_connections`; use connection pooling (ProxySQL) |
| Slow queries across the board | `innodb_buffer_pool_size` too small | Set to ~70% of available RAM and restart |
| Replication stopped (`SQL_Running: No`) | Duplicate key or schema mismatch on replica | Check `SHOW REPLICA STATUS\G` error; skip or fix the row |
| `Table is full` | Disk space exhausted or table limit hit | Free disk space; check `innodb_data_file_path` autoextend |
| `Lock wait timeout exceeded` | Long-running transaction holding row locks | Identify with `SHOW ENGINE INNODB STATUS`; kill the blocking query |
| High IOPS / disk usage | Redo log too small causing frequent flushes | Increase `innodb_log_file_size` (requires restart) |

## Related Skills

- postgresql (`postgresql-devsec`) - Alternative relational database
- database-backups (`database-backups`) - Automated backup strategies
- redis (`redis`) - Caching layer to reduce database load
- planetscale (`planetscale`) - Managed MySQL-compatible with branching

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

