---
name: time-machine-recovery
description: "Diagnose failed or stalled macOS Time Machine backups and recover space on local APFS destinations that remain full after backup deletion."
category: development
risk: critical
source: self
source_type: self
date_added: "2026-11-04"
tags: [macos, backup, apfs, troubleshooting]
---

# Time Machine Recovery

## When to Use

Use this when Time Machine reports a full or unavailable destination, or when Finder shows zero completed backups while the volume remains full.

## Identify the failure

- Read `tmutil destinationinfo`, `tmutil status`, and recent unified logs. For example, use `/usr/bin/log show --last 2h --info --style compact --predicate 'subsystem == "com.apple.TimeMachine"'` and narrow the output to the latest attempt and its failure phase.
- For a local destination, use `diskutil list external`, `diskutil info "<mount point>"`, and `df -h "<mount point>"`. Record the destination volume UUID and any sibling partitions. Confirm the current target before every mutation. Keep actions scoped to the verified volume. For a network destination, check mount, connectivity, and server quota. The APFS steps below apply to local APFS volumes.
- If the target is full, distinguish the minimum free space Time Machine logs before copying from the actual space the backup needs. Time Machine preserves the last completed backup during automatic thinning. Check local APFS snapshots with `diskutil apfs listSnapshots "<mount point>"`. Interpret the command result alongside Finder or `tmutil listbackups` when accessible.
- If Finder says “No Completed Backups” while the destination stays full, measure the live files. Use `sudo du -x -h -d 1 "<mount point>"` in a Terminal with Full Disk Access. If access is blocked, ask the user to run the read-only command locally and paste its output. Wait for the final total and prompt before interpreting partial output. Look for `.inprogress`, `.interrupted`, and `.previous` directories. Finder's Time Machine view may omit them.

## Recover the existing destination

- If the evidence shows leftover incomplete backups, Time Machine is idle, and cleanup is authorized, check `man tmutil` for the installed version. Use `sudo tmutil deleteinprogress "<verified machine directory>"`. The machine directory can be the mounted backup volume root on local APFS. Confirm the layout before reusing that argument. The command needs root and Full Disk Access and can revert an APFS destination to its last backup. Explain that it discards incomplete backup data. If the session lacks privileges, have the user run it locally.
- Monitor the process and free space. Multi-gigabyte deletion can remain silent while space increases. Let it finish before retrying or starting a backup. Judge the result from the final message, exit status, remaining files, and measured space together. A cleanup can report deletion alongside a nonzero exit status. A fresh listing can distinguish remaining backup data from the Spotlight index.
- If cleanup leaves unexplained usage, recheck snapshots and live files. If the discrepancy persists, use read-only file-system verification or guide the user through First Aid on the selected volume. Treat permission failures separately from disk faults. Avoid recursive removal of Time Machine internals as a default. Erase only with explicit authorization for the verified volume, after establishing what it contains and respecting any instruction to preserve sibling partitions or avoid formatting.
- With sufficient space, run or guide the user through a fresh backup. Verify a new completed backup timestamp and check the latest logs if it fails. Report recovered capacity separately from successful backup completion.

## Example

For a local APFS destination that stays full after its last completed backup was deleted, compare the snapshot list with a read-only directory size scan. If the scan shows a large incomplete backup, verify the destination and use the scoped cleanup after authorization. Check free space before attempting a fresh backup.

## Limitations

The local cleanup procedure does not apply to network destinations. A successful cleanup establishes available capacity. A new completed backup establishes that Time Machine works again.

Use [Apple's backup troubleshooting guide](https://support.apple.com/102220) and [Disk Utility First Aid instructions](https://support.apple.com/102611) for current macOS behavior.
