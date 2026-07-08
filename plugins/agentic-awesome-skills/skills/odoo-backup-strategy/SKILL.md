---
name: odoo-backup-strategy
description: "Complete Odoo backup and restore strategy: database dumps, filestore backup, automated scheduling, cloud storage upload, and tested restore procedures."
risk: safe
source: "self"
---

# Odoo Backup Strategy

## Overview

A complete Odoo backup must include both the **PostgreSQL database** and the **filestore** (attachments, images). This skill covers manual and automated backup procedures, offsite storage, and the correct restore sequence to bring a down Odoo instance back online.

## When to Use This Skill

- Setting up a backup strategy for a production Odoo instance.
- Automating daily backups with shell scripts and cron.
- Restoring Odoo after a server failure or data corruption event.
- Diagnosing a failed backup or corrupt restore.

## How It Works

1. **Activate**: Mention `@odoo-backup-strategy` and describe your server environment.
2. **Generate**: Receive a complete backup script tailored to your setup.
3. **Restore**: Get step-by-step restore instructions for any failure scenario.

## Examples

### Example 1: Manual Database + Filestore Backup

```bash
#!/bin/bash
# backup_odoo.sh

DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="odoo"
DB_USER="odoo"
FILESTORE_PATH="/var/lib/odoo/.local/share/Odoo/filestore/$DB_NAME"
BACKUP_DIR="/backups/odoo"

mkdir -p "$BACKUP_DIR"

# Step 1: Dump the database
pg_dump -U $DB_USER -Fc $DB_NAME > "$BACKUP_DIR/db_$DATE.dump"

# Step 2: Archive the filestore
tar -czf "$BACKUP_DIR/filestore_$DATE.tar.gz" -C "$FILESTORE_PATH" .

echo "✅ Backup complete: db_$DATE.dump + filestore_$DATE.tar.gz"
```

### Example 2: Automate with Cron (daily at 2 AM)

```bash
# Run: crontab -e
# Add this line:
0 2 * * * /opt/scripts/backup_odoo.sh >> /var/log/odoo_backup.log 2>&1
```

### Example 3: Upload to S3 (after backup)

```bash
# Add to backup script after tar command:
aws s3 cp "$BACKUP_DIR/db_$DATE.dump"        s3://my-odoo-backups/db/
aws s3 cp "$BACKUP_DIR/filestore_$DATE.tar.gz" s3://my-odoo-backups/filestore/

# Optional: Delete local backups older than 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

### Example 4: Full Restore Procedure

```bash
# Step 1: Stop Odoo
docker compose stop odoo  # or: systemctl stop odoo

# Step 2: Recreate and restore the database
# (--clean alone fails if the DB doesn't exist; drop and recreate first)
dropdb -U odoo odoo 2>/dev/null || true
createdb -U odoo odoo
pg_restore -U odoo -d odoo db_YYYYMMDD_HHMMSS.dump

# Step 3: Restore the filestore
FILESTORE=/var/lib/odoo/.local/share/Odoo/filestore/odoo
rm -rf "$FILESTORE"/*
tar -xzf filestore_YYYYMMDD_HHMMSS.tar.gz -C "$FILESTORE"/

# Step 4: Restart Odoo
docker compose start odoo

# Step 5: Verify — open Odoo in the browser and check:
#   - Can you log in?
#   - Are recent records visible?
#   - Are file attachments loading?
```

## Best Practices

- ✅ **Do:** Test restores monthly in a staging environment — a backup you've never restored is not a backup.
- ✅ **Do:** Follow the **3-2-1 rule**: 3 copies, 2 different media types, 1 offsite copy (e.g., S3 or a remote server).
- ✅ **Do:** Back up **immediately before every Odoo upgrade** — this is your rollback point.
- ✅ **Do:** Verify backup integrity: `pg_restore --list backup.dump` should complete without errors.
- ❌ **Don't:** Back up only the database without the filestore — all attachments and images will be missing after a restore.
- ❌ **Don't:** Store backups on the same disk or same server as Odoo — a disk or server failure destroys both.
- ❌ **Don't:** Run `pg_restore --clean` against a non-existent database — always create the database first.

## Limitations

- Does not cover **Odoo.sh built-in backups** — Odoo.sh has its own backup system accessible from the dashboard.
- This script assumes a **single-database** Odoo setup. Multi-database instances require looping over all databases.
- Filestore path may differ between installations (Docker volume vs. bare-metal). Always verify the path with `odoo-bin shell` before running a restore.
- Large filestores (100GB+) may require incremental backup tools like `rsync` or `restic` rather than full `tar.gz` archives.
