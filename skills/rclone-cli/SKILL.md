---
name: rclone-cli
description: "Rclone command-line cloud storage manager reference and usage guide. Use this skill whenever the user mentions rclone, or any task involving terminal-based cloud file operations such as upload, download, sync, copy, move, mount, or remote management."
risk: critical
source: https://github.com/chaunsin/agent-skills/tree/master/skills/rclone-cli
source_repo: chaunsin/agent-skills
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/chaunsin/agent-skills/blob/master/LICENSE
---

# rclone — The Swiss Army Knife of Cloud Storage
## When to Use

Use this skill when you need rclone command-line cloud storage manager reference and usage guide. Use this skill whenever the user mentions rclone, or any task involving terminal-based cloud file operations such as upload, download, sync, copy, move, mount, or remote management. Triggers on S3-compatible storage,...


Rclone is a command-line program to manage files on cloud storage. It is a feature-rich alternative to cloud vendors' web storage interfaces. Over 70 cloud storage products support rclone including S3 object stores, business & consumer file storage services, and standard transfer protocols.

Rclone has powerful cloud equivalents to the unix commands rsync, cp, mv, mount, ls, ncdu, tree, rm, and cat. Timestamp preservation and checksum verification depend on backend capabilities and transfer options; they are not guaranteed for every transfer. Transfers can be restarted from the last good file.

**Official resources:** [rclone.org](https://rclone.org/) | [Docs](https://rclone.org/docs/) | [Commands](https://rclone.org/commands/) | [Install](https://rclone.org/install/) | [Forum](https://forum.rclone.org/) | [GitHub](https://github.com/rclone/rclone)

## Prerequisites

Use only a previously installed and reviewed rclone binary. Check its version:

```bash
rclone --version
```

If missing, stop the executable workflow and report the prerequisite. A separate installation task must select an immutable signed release, verify its checksum/signature, stage and inspect it, and obtain approval before installation. Do not pipe a vendor installer to a privileged shell. The historical bundled installer is disabled and does not download or modify anything.

## Security Warnings

> **IMPORTANT**: Rclone is extremely powerful and can irreversibly modify or delete data on cloud storage.
> Pay close attention to the following safety guidelines:

- **Always use `--dry-run` first** when running `sync`, `move`, `delete`, or `purge` commands. This shows what would happen without actually doing it.
- **Use `--interactive` / `-i` flag** while learning rclone to avoid accidental data loss. It asks for confirmation before each destructive operation.
- **Never expose credentials in plain text** on the command line. Use an interactive configuration flow and restrict access to its file; default password obscuring is reversible, not secure encryption. Environment variables can also leak through logs or process inspection.
- **Private keys and tokens** (S3 secret keys, service account JSON, OAuth tokens) must never be committed to version control or logged. The config file `~/.config/rclone/rclone.conf` contains sensitive data — protect it with `chmod 600`.
- **`rclone purge` ignores all filters** — it deletes everything under the specified path. Use with extreme caution.
- **`rclone sync` makes dest identical to source** — files in dest that are not in source will be DELETED. Always verify with `--dry-run` first.
- **Remote control API** (`--rc`) should bind to loopback. For deliberate remote access, require authentication (for example `--rc-htpasswd`), TLS and network restrictions; it can expose powerful operations.
- **Mount operations** can cause data loss if the mount is interrupted during writes. `--vfs-cache-mode full` can support writes but requires adequate local disk and successful upload/flush; it is not a durability guarantee.

## Quick Reference

### Configuration

```bash
# Interactive configuration (recommended)
rclone config

# Show a redacted config; manually inspect for residual secrets before sharing
rclone config redacted

# Print decrypted config, including sensitive values (do not share or log)
rclone config show

# List configured remotes
rclone listremotes

# Create a remote non-interactively
rclone config create myremote s3 provider=AWS env_auth=true region=us-east-1

# Update existing remote
rclone config update myremote region=us-west-2
```

### Basic Syntax

```
rclone subcommand [options] source:path dest:path
```

Source and destination paths use `remote:path` syntax. For local paths, just use `/path/to/dir`.

### Core Commands

```bash
# List files
rclone ls remote:path                    # list all objects with size
rclone lsd remote:path                   # list directories
rclone lsl remote:path                   # list with size, modtime, path
rclone lsf remote:path                   # list in flexible format
rclone size remote:path                  # total size and object count
rclone tree remote:path                  # tree view

# Copy (does not delete files at destination)
rclone copy /local/path remote:path      # local to remote
rclone copy remote:path /local/path      # remote to local
rclone copy remote1:path remote2:path    # remote to remote (server-side if possible)

# Sync (makes destination identical to source — DELETES extra files at dest)
rclone sync --dry-run /local/path remote:path    # ALWAYS dry-run first!
rclone sync -i /local/path remote:path           # interactive mode

# Move (copies then deletes source)
rclone move /local/path remote:path

# Delete operations
rclone delete remote:path                # delete contents of path
rclone purge remote:path                 # delete path AND all contents (ignores filters!)

# Check integrity
rclone check /local/path remote:path     # compare source and dest
rclone checksum SHA256 SHA256SUMS remote:path  # compare with a trusted SUM file
rclone cryptcheck /local/path crypt:path # compare plaintext source with crypt remote

# Directory operations
rclone mkdir remote:path                 # create directory
rclone rmdir remote:path                 # remove empty directory
rclone rmdirs remote:path                # remove empty directories recursively

# Other useful commands
rclone cat remote:path/file.txt          # output file to stdout
rclone dedupe remote:path                # interactively find/delete duplicates
rclone about remote:                     # get quota information
rclone version                           # show version
```

### Filtering

Filter rules determine which files rclone processes. Always test with `--dry-run` and `-vv`.

```bash
# Include only specific patterns
rclone copy /src /dst --include "*.jpg"
rclone copy /src /dst --include-from filter-file.txt

# Exclude specific patterns
rclone copy /src /dst --exclude "*.tmp"
rclone copy /src /dst --exclude-from exclude-file.txt

# Use filter rules (preferred when mixing include/exclude)
rclone sync /src /dst --filter "+ *.jpg" --filter "- *"
rclone sync /src /dst --filter-from rules.txt

# Size-based filtering
rclone copy /src /dst --min-size 1M --max-size 10G

# Age-based filtering
rclone copy /src /dst --min-age 7d --max-age 30d

# IMPORTANT: Do NOT mix --include, --exclude, and --filter flags.
# Use --filter exclusively when combining rules.
```

Filter pattern syntax:
- `*` matches any sequence of non-separator characters
- `**` matches any sequence including separators
- `?` matches any single non-separator character
- `{a,b}` matches pattern alternatives
- `{{regexp}}` matches using Go regexp

### Global Flags (Most Common)

```bash
# Verbosity
-v                                        # info level
-vv                                       # debug level (shows filter matches)
--log-level LEVEL                         # DEBUG|INFO|NOTICE|ERROR

# Safety
--dry-run                                 # preview without doing anything
-i, --interactive                         # ask before each operation
--ignore-existing                         # skip files that exist at dest
-I, --ignore-times                        # transfer all, ignore modtime/size

# Transfer control
--transfers N                             # parallel transfers (default 4)
--checkers N                              # parallel checks (default 8)
--bwlimit RATE                            # bandwidth limit (e.g. 10M)
--max-transfer SIZE                       # stop after transferring this much
-c, --checksum                            # use checksum instead of modtime
--size-only                               # compare by size only

# Performance
--multi-thread-streams N                  # multi-thread downloads (default 4)
-P, --progress                            # show real-time progress

# Config
--config STRING                           # config file path
-C, --no-check-dest                       # skip dest check on copy
```

### Mount

```bash
# Basic mount
rclone mount remote:path /mnt/remote

# Recommended mount with caching
rclone mount remote:path /mnt/remote \
  --vfs-cache-mode full \
  --vfs-cache-max-size 10G \
  --vfs-read-chunk-size 128M

# Unmount
fusermount -u /mnt/remote                # Linux
umount /mnt/remote                        # macOS
```

### Serve

```bash
rclone serve http remote:path             # HTTP file server
rclone serve webdav remote:path           # WebDAV server
rclone serve sftp remote:path             # SFTP server
rclone serve ftp remote:path              # FTP server
rclone serve s3 remote:path               # S3-compatible server
rclone serve dlna remote:path             # DLNA media server
rclone serve restic remote:path           # Restic backup backend
rclone serve docker remote:path           # Docker volume plugin API (not a registry)
```

### Encryption (Crypt Remote)

```bash
# Configure encrypted remote wrapping another remote
rclone config
# Choose "crypt" type, point to an existing remote (e.g., "drive:private")

# Use crypt remote — files are encrypted/decrypted transparently
rclone copy /local/files crypt:path
rclone ls crypt:path

# Check integrity of encrypted files
rclone cryptcheck /local/files crypt:path
```

## Detailed Reference Files

For in-depth information, consult these reference files:

These files are converted from the official Hugo-based rclone documentation under
`testdata/rclone/docs/`. Treat any remaining Hugo shortcode or template syntax
as a conversion bug: replace it with normal Markdown, a static table, or an
official URL before relying on it in an answer.

| File | Content | When to read | Official link |
|------|---------|-------------|---------------|
| `references/usage.md` | Full usage guide: syntax, config, remote paths, options | Understanding advanced rclone behavior | [Docs](https://rclone.org/docs/) |
| `references/flags.md` | Complete global flags reference | Looking up specific flag options | [Flags](https://rclone.org/flags/) |
| `references/filtering.md` | Filtering, includes/excludes, patterns | Building complex filter rules | [Filtering](https://rclone.org/filtering/) |
| `references/rc.md` | Remote control / HTTP API | Using rclone's API for programmatic control | [RC API](https://rclone.org/rc/) |
| `references/bisync.md` | Bidirectional sync between two paths | Setting up two-way sync | [Bisync](https://rclone.org/bisync/) |
| `references/crypt.md` | Encrypted remote configuration | Setting up encrypted cloud storage | [Crypt](https://rclone.org/crypt/) |
| `references/cache.md` | Cache backend and directory caching | Optimizing performance with caching | [Cache](https://rclone.org/cache/) |
| `references/chunker.md` | Transparent file chunking | Handling large files on limited remotes | [Chunker](https://rclone.org/chunker/) |
| `references/union.md` | Union backend (merge multiple remotes) | Combining multiple storage backends | [Union](https://rclone.org/union/) |
| `references/combine.md` | Combine backend (unified namespace) | Unified view of multiple remotes | [Combine](https://rclone.org/combine/) |
| `references/hasher.md` | Hasher backend for checksum handling | Adding hash support to remotes | [Hasher](https://rclone.org/hasher/) |
| `references/overview.md` | Cloud storage system feature comparison | Comparing provider capabilities | [Overview](https://rclone.org/overview/) |
| `references/install.md` | Detailed installation instructions | Troubleshooting installation | [Install](https://rclone.org/install/) |
| `references/docker.md` | Docker usage guide | Running rclone in Docker | [Docker](https://rclone.org/docker/) |
| `references/faq.md` | Frequently asked questions | Troubleshooting common issues | [FAQ](https://rclone.org/faq/) |
| `references/commands/` | Individual command documentation | Detailed command usage | [Commands](https://rclone.org/commands/) |

### Popular Provider References

For configuring specific cloud storage providers, read the corresponding file in
`references/providers/` when present. Some virtual/backing providers, such as
`crypt`, `cache`, `chunker`, `union`, `combine`, and `hasher`, live as top-level
files in `references/` because they are cross-provider backends rather than
single cloud services.
- `s3.md` — Amazon S3 / compatible ([Official](https://rclone.org/s3/))
- `drive.md` — Google Drive ([Official](https://rclone.org/drive/))
- `dropbox.md` — Dropbox ([Official](https://rclone.org/dropbox/))
- `onedrive.md` — Microsoft OneDrive ([Official](https://rclone.org/onedrive/))
- `azureblob.md` — Azure Blob Storage ([Official](https://rclone.org/azureblob/))
- `b2.md` — Backblaze B2 ([Official](https://rclone.org/b2/))
- `googlecloudstorage.md` — Google Cloud Storage ([Official](https://rclone.org/googlecloudstorage/))
- `sftp.md` — SFTP ([Official](https://rclone.org/sftp/))
- `webdav.md` — WebDAV ([Official](https://rclone.org/webdav/))
- `swift.md` — OpenStack Swift ([Official](https://rclone.org/swift/))
- `ftp.md` — FTP ([Official](https://rclone.org/ftp/))
- And 60+ more providers — each has a page at `https://rclone.org/<name>/`

### Command References

For detailed command documentation, read the corresponding file in `references/commands/`:
- `rclone_copy.md`, `rclone_sync.md`, `rclone_move.md` — transfer commands
- `rclone_mount.md` — FUSE mount
- `rclone_serve_*.md` — various serve modes
- `rclone_config*.md` — configuration management
- `rclone_bisync.md` — bidirectional sync
- And 80+ more commands — each has a page at `https://rclone.org/commands/<command>/`

## Common Workflows

### Initial Setup
```bash
rclone config          # interactive setup wizard
rclone lsd remote:     # verify connection works
```

### Mirror Local to Cloud (not a versioned backup)
```bash
rclone sync --dry-run -P /home/user/documents remote:backup/documents
# Review dry-run output carefully, then:
rclone sync -P /home/user/documents remote:backup/documents
```

### Cloud-to-Cloud Migration
```bash
rclone copy --dry-run -P source_remote:path dest_remote:path
rclone copy -P --transfers 8 source_remote:path dest_remote:path
```

### Restore from Cloud
```bash
rclone copy --dry-run remote:backup/documents /home/user/restored
rclone copy -P remote:backup/documents /home/user/restored
```

### Bandwidth-Limited Transfer
```bash
rclone copy --bwlimit 10M -P /data remote:backup
```

### Encrypted Mirror
```bash
# First configure a crypt remote wrapping your storage remote
rclone config
# Then use the crypt remote for all operations
rclone sync -P /sensitive-data crypt:backup
```

### Scheduled Mirror (cron)
```bash
# After reviewing an equivalent dry run and configuring independent versioned backups, add to crontab (daily at 2am). Sync propagates deletions:
0 2 * * * rclone sync -P /data remote:backup >> /var/log/rclone.log 2>&1
```

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
