---
name: backup-recovery
description: Implement backup and recovery strategies. Configure rsync, Restic, and
  cloud backups. Use when designing data protection solutions.
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

# Backup and Recovery

Implement comprehensive backup and recovery strategies using rsync, Restic, and cloud storage backends. Covers the 3-2-1 rule, automated scheduling, S3/B2 backends, encryption, restore procedures, and verification testing.

## When to Use

- Designing a backup strategy for servers, databases, or application data
- Setting up Restic for encrypted, deduplicated backups to local or cloud storage
- Automating backups with systemd timers or cron
- Restoring data after accidental deletion, corruption, or disaster
- Migrating data between environments using backup/restore workflows
- Verifying backup integrity and testing recovery procedures

## Prerequisites

- `rsync` installed (included in most Linux distributions)
- `restic` installed (v0.16+ recommended)
- Cloud CLI configured for the backend: AWS CLI for S3, `b2` CLI for Backblaze B2
- Sufficient storage at the backup destination (2-3x source size for retention)
- SSH access for remote rsync targets
- `systemd` or `cron` for scheduling

## The 3-2-1 Backup Rule

- **3** copies of your data (1 primary + 2 backups)
- **2** different storage media or types (e.g., local disk + cloud)
- **1** copy offsite (cloud storage, remote datacenter)

## rsync Backups

### Basic Operations

```bash
# Sync a local directory to a backup location
rsync -avz --delete /data/ /backup/data/

# Flags explained:
# -a  archive mode (preserves permissions, ownership, timestamps, symlinks)
# -v  verbose output
# -z  compress data during transfer
# --delete  remove files at destination that no longer exist at source

# Sync to a remote server over SSH
rsync -avz -e "ssh -i ~/.ssh/backup_key" /data/ backup@remote:/backups/server01/

# Exclude patterns
rsync -avz --delete \
  --exclude='*.tmp' \
  --exclude='*.log' \
  --exclude='.cache/' \
  --exclude='node_modules/' \
  /data/ /backup/data/

# Use an exclude file for complex patterns
rsync -avz --delete --exclude-from=/etc/backup-excludes.txt /data/ /backup/data/

# Dry run (preview what would change)
rsync -avzn --delete /data/ /backup/data/

# Limit bandwidth to 50 MB/s and show progress
rsync -avz --bwlimit=50000 --progress /data/ backup@remote:/backups/
```

### Incremental Backups with Hard Links

```bash
# Incremental: unchanged files hard-linked to previous backup (saves space)
rsync -avz --delete \
  --link-dest=/backup/daily/latest \
  /data/ /backup/daily/$(date +%Y-%m-%d)/

# Update the 'latest' symlink
ln -snf /backup/daily/$(date +%Y-%m-%d) /backup/daily/latest

# Remove backups older than 30 days
find /backup/daily -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \;
```

## Restic Backup

### Installation

```bash
# Debian / Ubuntu
apt install -y restic

# RHEL / CentOS
dnf install -y restic

# Or download the latest binary
curl -L https://github.com/restic/restic/releases/latest/download/restic_0.17.3_linux_amd64.bz2 \
  | bunzip2 > /usr/local/bin/restic
chmod +x /usr/local/bin/restic

# Verify installation
restic version
```

### Initialize a Repository

```bash
# Local repository
restic init --repo /backup/restic-repo

# AWS S3 backend
export AWS_ACCESS_KEY_ID="AKIAEXAMPLE"
export AWS_SECRET_ACCESS_KEY="secretkey"
restic init --repo s3:s3.amazonaws.com/my-backup-bucket

# S3-compatible (MinIO)
export AWS_ACCESS_KEY_ID="minioadmin"
export AWS_SECRET_ACCESS_KEY="miniosecret"
restic init --repo s3:http://minio.example.com:9000/backup-bucket

# Backblaze B2 backend
export B2_ACCOUNT_ID="accountid"
export B2_ACCOUNT_KEY="accountkey"
restic init --repo b2:my-backup-bucket:server01

# SFTP backend
restic init --repo sftp:backup@remote:/backups/server01

# Restic will prompt for a repository password -- store it securely
# Use a password file for automation
echo "my-secure-repo-password" > /etc/restic/password.txt
chmod 600 /etc/restic/password.txt
```

### Backup Operations

```bash
# Basic backup
restic backup /data --repo /backup/restic-repo --password-file /etc/restic/password.txt

# Backup multiple directories
restic backup /data /etc /var/lib/postgresql \
  --repo s3:s3.amazonaws.com/my-backup-bucket \
  --password-file /etc/restic/password.txt

# Backup with exclusions
restic backup /data \
  --exclude='*.tmp' \
  --exclude='*.log' \
  --exclude-file=/etc/restic/excludes.txt \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt

# Backup with tags (useful for filtering snapshots later)
restic backup /data \
  --tag server01 --tag production --tag daily \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt

# Backup stdin (e.g., database dump)
pg_dump -U postgres mydb | restic backup --stdin --stdin-filename mydb.sql \
  --repo s3:s3.amazonaws.com/my-backup-bucket \
  --password-file /etc/restic/password.txt

# Verbose output showing files processed
restic backup /data -v \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt
```

### Snapshot Management

```bash
# List all snapshots (add --tag <tag> to filter)
restic snapshots --repo /backup/restic-repo --password-file /etc/restic/password.txt

# Browse files in the latest snapshot
restic ls latest --repo /backup/restic-repo --password-file /etc/restic/password.txt

# Compare two snapshots
restic diff abc123 def456 --repo /backup/restic-repo --password-file /etc/restic/password.txt
```

### Retention Policy (forget + prune)

```bash
# Apply retention policy and reclaim space
restic forget \
  --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --keep-yearly 3 \
  --prune \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt

# Dry run to preview what would be removed
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 \
  --dry-run --repo /backup/restic-repo --password-file /etc/restic/password.txt
```

### Restore Procedures

```bash
# Restore the latest snapshot to a target directory
restic restore latest --target /restore \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt

# Restore a specific snapshot by ID
restic restore abc123 --target /restore \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt

# Restore only specific files or directories
restic restore latest --target /restore --include "/data/config" \
  --repo /backup/restic-repo \
  --password-file /etc/restic/password.txt

# Mount a snapshot as a FUSE filesystem (browse and copy individual files)
mkdir -p /mnt/restic
restic mount /mnt/restic --repo /backup/restic-repo --password-file /etc/restic/password.txt &
# Browse: ls /mnt/restic/snapshots/latest/
# Unmount when done: umount /mnt/restic
```

### Verification

```bash
# Verify repository integrity (checks all data and metadata)
restic check --repo /backup/restic-repo --password-file /etc/restic/password.txt

# Full data verification (reads all pack files -- slow but thorough)
restic check --read-data --repo /backup/restic-repo --password-file /etc/restic/password.txt

# Verify a random subset of data (faster than full read)
restic check --read-data-subset=5% --repo /backup/restic-repo --password-file /etc/restic/password.txt
```

## Automated Backup with Environment File

### /etc/restic/env

```bash
# Repository configuration
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/my-backup-bucket"
export RESTIC_PASSWORD_FILE="/etc/restic/password.txt"
export AWS_ACCESS_KEY_ID="AKIAEXAMPLE"
export AWS_SECRET_ACCESS_KEY="secretkey"

# Optional: set cache directory
export RESTIC_CACHE_DIR="/var/cache/restic"
```

### Backup Script

```bash
#!/bin/bash
# /usr/local/bin/restic-backup.sh
set -euo pipefail
source /etc/restic/env
LOG="/var/log/restic-backup.log"

echo "$(date): Starting backup" >> "$LOG"

restic backup /data /etc /var/lib/postgresql \
  --exclude-file=/etc/restic/excludes.txt \
  --tag "$(hostname)" --tag daily \
  --verbose >> "$LOG" 2>&1

restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 \
  --prune >> "$LOG" 2>&1

# Weekly integrity check (Sundays)
[ "$(date +%u)" -eq 7 ] && restic check --read-data-subset=10% >> "$LOG" 2>&1

echo "$(date): Backup completed" >> "$LOG"
```

```bash
chmod +x /usr/local/bin/restic-backup.sh
```

## Scheduled Backups

### Systemd Timer (Recommended)

```ini
# /etc/systemd/system/restic-backup.service
[Unit]
Description=Restic backup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/local/bin/restic-backup.sh
Nice=10
IOSchedulingClass=idle
```

```ini
# /etc/systemd/system/restic-backup.timer
[Unit]
Description=Run Restic backup daily at 2 AM

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=900

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
systemctl daemon-reload
systemctl enable --now restic-backup.timer

# Check timer status
systemctl list-timers restic-backup.timer

# Run manually for testing
systemctl start restic-backup.service
journalctl -u restic-backup.service -f
```

## Database Backups with Restic

```bash
# PostgreSQL: stream dump directly into restic (no temp file)
pg_dump -U postgres -Fc mydb | restic backup --stdin --stdin-filename mydb.dump \
  --tag postgres --tag mydb \
  --repo s3:s3.amazonaws.com/my-backup-bucket \
  --password-file /etc/restic/password.txt

# MySQL / MariaDB: stream dump into restic
mysqldump --all-databases --single-transaction | \
  restic backup --stdin --stdin-filename all-databases.sql \
  --tag mysql \
  --repo s3:s3.amazonaws.com/my-backup-bucket \
  --password-file /etc/restic/password.txt

# Restore PostgreSQL from restic
restic dump latest mydb.dump \
  --repo s3:s3.amazonaws.com/my-backup-bucket \
  --password-file /etc/restic/password.txt \
  | pg_restore -U postgres -d mydb --clean --if-exists
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| "repository not initialized" | `restic cat config --repo <repo>` | Run `restic init --repo <repo>` first |
| "wrong password" | Check env vars / password file | Verify RESTIC_PASSWORD_FILE contents and permissions |
| Backup is slow | `restic backup -v` for progress | Check network bandwidth; exclude large unneeded dirs |
| S3 permission denied | `aws s3 ls s3://bucket/` | Check IAM policy includes s3:GetObject, s3:PutObject |
| "unable to create lock" | `restic unlock --repo <repo>` | A previous backup crashed; unlock the repository |
| Restore shows empty dirs | `restic ls <snapshot-id>` | Verify correct snapshot ID; check --include path syntax |
| Repository growing too large | `restic stats --repo <repo>` | Run `restic forget --prune` with stricter retention |
| Check fails with pack errors | `restic check --read-data` | Rebuild index: `restic rebuild-index`; restore from another copy |

## Related Skills

- `linux-administration` -- Server maintenance and log management
- `systemd-services` -- Scheduling backups with systemd timers
- `object-storage` -- S3 and MinIO as backup destinations
- `block-storage` -- LVM snapshots for consistent backups
- `nfs-storage` -- Backing up NFS-shared data

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

