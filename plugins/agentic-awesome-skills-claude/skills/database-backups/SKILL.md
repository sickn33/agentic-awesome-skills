---
name: database-backups
description: Implement database backup strategies. Configure automated backups, retention,
  and recovery testing. Use when designing backup and recovery procedures.
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

# Database Backups

Implement comprehensive, automated database backup strategies with tested recovery procedures.

## When to Use

- You are deploying a new database and need a backup plan from day one.
- You need to automate nightly or hourly backups for PostgreSQL, MySQL, or MongoDB.
- You want to ship backups to S3-compatible object storage with retention policies.
- You are building or verifying disaster recovery runbooks.

## Prerequisites

- Database client tools installed (`pg_dump`, `mysqldump`, `mongodump`).
- AWS CLI or `restic` for remote storage.
- `cron` or systemd timers for scheduling.
- An S3 bucket (or S3-compatible endpoint) for offsite backups.

## Backup Types

| Type | Description | Frequency | Use Case |
|---|---|---|---|
| Full | Complete database copy | Weekly | Baseline for restores |
| Incremental | Changes since last backup | Daily | Reduce storage and time |
| Transaction log / WAL | Continuous log shipping | Continuous | Point-in-time recovery (PITR) |
| Snapshot | Storage-level snapshot (EBS, ZFS) | Daily | Fast full restores |

## PostgreSQL Backups

### Logical Backup with pg_dump

```bash
#!/bin/bash
# pg_backup.sh — PostgreSQL logical backup
set -euo pipefail

DB_NAME="mydb"
DB_USER="backup_user"
DB_HOST="localhost"
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="${BACKUP_DIR}/${DB_NAME}_${DATE}.dump"

mkdir -p "$BACKUP_DIR"

# Custom compressed format (recommended for selective restore)
pg_dump -h "$DB_HOST" -U "$DB_USER" -Fc -Z6 "$DB_NAME" > "$FILENAME"

echo "[$(date)] PostgreSQL backup complete: $FILENAME ($(du -h "$FILENAME" | cut -f1))"
```

### Physical Backup with pg_basebackup

```bash
#!/bin/bash
# pg_basebackup.sh — PostgreSQL physical backup for PITR
set -euo pipefail

BACKUP_DIR="/backups/postgres/base_$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

pg_basebackup \
  -h localhost \
  -U replicator \
  -D "$BACKUP_DIR" \
  --wal-method=stream \
  --checkpoint=fast \
  --progress \
  --verbose

echo "[$(date)] Base backup complete: $BACKUP_DIR"
```

### PostgreSQL Restore

```bash
# Restore from custom-format dump
pg_restore -h localhost -U myapp -d mydb --clean --if-exists /backups/postgres/mydb_20250115_020000.dump

# Restore a single table
pg_restore -h localhost -U myapp -d mydb -t orders /backups/postgres/mydb_20250115_020000.dump

# Restore from plain SQL
psql -h localhost -U myapp -d mydb < /backups/postgres/mydb_20250115.sql
```

## MySQL Backups

### Logical Backup with mysqldump

```bash
#!/bin/bash
# mysql_backup.sh — MySQL logical backup
set -euo pipefail

DB_NAME="mydb"
DB_USER="backup_user"
DB_PASS="${MYSQL_BACKUP_PASSWORD}"
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

mysqldump -u "$DB_USER" -p"$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" | gzip > "$FILENAME"

echo "[$(date)] MySQL backup complete: $FILENAME ($(du -h "$FILENAME" | cut -f1))"
```

### Physical Backup with Percona XtraBackup

```bash
#!/bin/bash
# xtrabackup.sh — MySQL physical backup
set -euo pipefail

BACKUP_DIR="/backups/mysql/full_$(date +%Y%m%d)"

xtrabackup --backup \
  --user=backup_user \
  --password "$MYSQL_BACKUP_PASSWORD" # from your vault; never hardcode \
  --target-dir="$BACKUP_DIR"

xtrabackup --prepare --target-dir="$BACKUP_DIR"

echo "[$(date)] XtraBackup complete: $BACKUP_DIR"
```

### MySQL Restore

```bash
# Restore from compressed mysqldump
gunzip < /backups/mysql/mydb_20250115_020000.sql.gz | mysql -u root -p mydb

# Restore from XtraBackup
sudo systemctl stop mysql
ls /var/lib/mysql/*  # verify this is the correct data dir first
sudo find /var/lib/mysql -mindepth 1 -delete  # empty the data dir; snapshots must exist (see Limitations)
xtrabackup --move-back --target-dir=/backups/mysql/full_20250115
sudo chown -R mysql:mysql /var/lib/mysql
sudo systemctl start mysql
```

## MongoDB Backups

### Logical Backup with mongodump

```bash
#!/bin/bash
# mongo_backup.sh — MongoDB backup
set -euo pipefail

MONGO_URI="mongodb://backup_user:${MONGO_BACKUP_PASSWORD}@localhost:27017"
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
TARGET="${BACKUP_DIR}/${DATE}"

mkdir -p "$BACKUP_DIR"

# Full backup with compression
mongodump --uri="$MONGO_URI" --gzip --out="$TARGET"

echo "[$(date)] MongoDB backup complete: $TARGET"
```

### MongoDB Restore

```bash
# Restore all databases
mongorestore --uri="mongodb://admin:secret@localhost:27017" \
  --gzip --drop /backups/mongodb/20250115_020000/

# Restore a single database
mongorestore --uri="mongodb://admin:secret@localhost:27017" \
  --gzip --drop --db mydb /backups/mongodb/20250115_020000/mydb/

# Restore a single collection
mongorestore --uri="mongodb://admin:secret@localhost:27017" \
  --gzip --drop --db mydb --collection users \
  /backups/mongodb/20250115_020000/mydb/users.bson.gz
```

## Upload to S3

```bash
#!/bin/bash
# s3_upload.sh — Upload backups to S3
set -euo pipefail

S3_BUCKET="s3://my-backups"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d)

# Upload PostgreSQL backup
aws s3 cp "${BACKUP_DIR}/postgres/" "${S3_BUCKET}/postgres/${DATE}/" \
  --recursive --storage-class STANDARD_IA \
  --sse AES256

# Upload MySQL backup
aws s3 cp "${BACKUP_DIR}/mysql/" "${S3_BUCKET}/mysql/${DATE}/" \
  --recursive --storage-class STANDARD_IA \
  --sse AES256

# Upload MongoDB backup
aws s3 cp "${BACKUP_DIR}/mongodb/" "${S3_BUCKET}/mongodb/${DATE}/" \
  --recursive --storage-class STANDARD_IA \
  --sse AES256

echo "[$(date)] S3 upload complete for ${DATE}"
```

### S3 Lifecycle Policy for Retention

```json
{
  "Rules": [
    {
      "ID": "BackupRetention",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Transitions": [
        { "Days": 30, "StorageClass": "GLACIER" }
      ],
      "Expiration": { "Days": 365 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-backups \
  --lifecycle-configuration file://lifecycle.json
```

## Restic Backup (Encrypted, Deduplicated)

```bash
# Initialize a restic repository on S3
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export RESTIC_PASSWORD="..." # set a strong restic password via your vault
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/my-backups-restic"

restic init

# Backup the local backup directory
restic backup /backups/postgres /backups/mysql /backups/mongodb

# List snapshots
restic snapshots

# Prune old snapshots — keep 7 daily, 4 weekly, 6 monthly
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

# Restore a snapshot
restic restore latest --target /restore/
```

## Cron Schedules

```bash
# /etc/cron.d/db-backups

# PostgreSQL: nightly at 02:00
0 2 * * * backup /opt/scripts/pg_backup.sh >> /var/log/backup-pg.log 2>&1

# MySQL: nightly at 02:30
30 2 * * * backup /opt/scripts/mysql_backup.sh >> /var/log/backup-mysql.log 2>&1

# MongoDB: nightly at 03:00
0 3 * * * backup /opt/scripts/mongo_backup.sh >> /var/log/backup-mongo.log 2>&1

# Upload to S3: daily at 04:00
0 4 * * * backup /opt/scripts/s3_upload.sh >> /var/log/backup-s3.log 2>&1

# Local cleanup: keep 7 days of local backups
0 5 * * * backup find /backups -type f -mtime +7 -delete >> /var/log/backup-cleanup.log 2>&1

# Restic prune: weekly on Sunday at 06:00
0 6 * * 0 backup /opt/scripts/restic_prune.sh >> /var/log/backup-restic.log 2>&1
```

## Automated Recovery Testing

```bash
#!/bin/bash
# verify_backup.sh — weekly restore test
set -euo pipefail

BACKUP_FILE=$(ls -t /backups/postgres/mydb_*.dump | head -1)

echo "[$(date)] Starting backup verification with $BACKUP_FILE"

# Spin up a temporary PostgreSQL container
docker run -d --name pg-restore-test \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=testdb \
  postgres:16-alpine

# Wait for container to be ready
sleep 5
until docker exec pg-restore-test pg_isready -U testuser; do
  sleep 2
done

# Copy backup into container and restore
docker cp "$BACKUP_FILE" pg-restore-test:/tmp/backup.dump
docker exec pg-restore-test pg_restore -U testuser -d testdb --clean --if-exists /tmp/backup.dump

# Run verification queries
USERS_COUNT=$(docker exec pg-restore-test psql -U testuser -d testdb -tAc "SELECT COUNT(*) FROM users;")
ORDERS_COUNT=$(docker exec pg-restore-test psql -U testuser -d testdb -tAc "SELECT COUNT(*) FROM orders;")

echo "[$(date)] Verification: users=$USERS_COUNT, orders=$ORDERS_COUNT"

# Cleanup
docker rm -f pg-restore-test

# Alert on failure
if [ "$USERS_COUNT" -lt 1 ]; then
  echo "ALERT: Backup verification failed — users table is empty" >&2
  exit 1
fi

echo "[$(date)] Backup verification PASSED"
```

## Unified Backup Script

```bash
#!/bin/bash
# backup_all.sh — unified backup orchestrator
set -euo pipefail

LOG="/var/log/backup-all.log"
ALERT_EMAIL="ops@example.com"
ERRORS=0

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }

run_backup() {
  local name="$1" script="$2"
  log "Starting $name backup..."
  if bash "$script" >> "$LOG" 2>&1; then
    log "$name backup succeeded."
  else
    log "ERROR: $name backup FAILED."
    ERRORS=$((ERRORS + 1))
  fi
}

run_backup "PostgreSQL" /opt/scripts/pg_backup.sh
run_backup "MySQL"      /opt/scripts/mysql_backup.sh
run_backup "MongoDB"    /opt/scripts/mongo_backup.sh
run_backup "S3 Upload"  /opt/scripts/s3_upload.sh

if [ "$ERRORS" -gt 0 ]; then
  log "Backup run completed with $ERRORS error(s). Sending alert."
  mail -s "BACKUP ALERT: $ERRORS failure(s)" "$ALERT_EMAIL" < "$LOG"
  exit 1
fi

log "All backups completed successfully."
```

## Best Practices

- **3-2-1 Rule**: Keep 3 copies of data, on 2 different media types, with 1 offsite.
- **Encrypt backups at rest**: Use `restic` (built-in encryption), AWS SSE, or `gpg`.
- **Test restores regularly**: A backup that has never been restored is not a backup.
- **Monitor backup jobs**: Alert immediately on any failure; do not rely on silent cron jobs.
- **Document RTOs and RPOs**: Define Recovery Time Objective and Recovery Point Objective for each database.
- **Version your backup scripts**: Store them in Git alongside your infrastructure code.
- **Use `--single-transaction`**: For MySQL and PostgreSQL logical backups to get a consistent snapshot.
- **Separate backup credentials**: Use a dedicated read-only database user for backups.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `pg_dump: too many clients` | Backup connection competes with app pool | Schedule during low traffic; increase `max_connections` by 5 for backup user |
| `mysqldump` hangs on large table | Table lock contention | Use `--single-transaction` (InnoDB) or schedule during maintenance window |
| `mongodump` slow on replica | Reading from secondary under load | Use `--readPreference=secondaryPreferred` and schedule off-peak |
| S3 upload fails with timeout | Large file over slow connection | Use `aws s3 cp --expected-size` or multipart with `aws s3api` |
| Restic prune takes hours | Too many snapshots accumulated | Run `restic forget --prune` more frequently; limit snapshot count |
| Restore fails with "role does not exist" | Backup includes role-dependent objects | Create roles first or use `--no-owner --no-privileges` on restore |

## Related Skills

- postgresql (`postgresql-devsec`) - PostgreSQL administration and pg_dump details
- mysql (`mysql`) - MySQL administration and mysqldump details
- mongodb (`mongodb`) - MongoDB administration and mongodump details
- redis (`redis`) - Redis RDB/AOF persistence and backup

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

