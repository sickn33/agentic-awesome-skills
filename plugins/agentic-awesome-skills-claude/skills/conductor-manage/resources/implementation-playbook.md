# Track Manager Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Pre-flight Checks

1. Verify Conductor is initialized:
   - Check `conductor/product.md` exists
   - Check `conductor/tracks.md` exists
   - Check `conductor/tracks/` directory exists
   - If missing: Display error and suggest running `/conductor:setup` first

2. Ensure archive directory exists (for archive/restore operations):
   - Check if `conductor/tracks/_archive/` exists
   - Create if needed when performing archive operation

## Mode Detection

Parse arguments to determine operation mode:

| Argument               | Mode         | Description                                             |
| ---------------------- | ------------ | ------------------------------------------------------- |
| `--list [filter]`      | List         | Show all tracks (optional: active, completed, archived) |
| `--archive <id>`       | Archive      | Move completed track to archive                         |
| `--archive --bulk`     | Bulk Archive | Multi-select completed tracks                           |
| `--restore <id>`       | Restore      | Restore archived track to active                        |
| `--delete <id>`        | Delete       | Permanently remove a track                              |
| `--rename <old> <new>` | Rename       | Change track ID                                         |
| `--cleanup`            | Cleanup      | Detect and fix orphaned artifacts                       |
| (none)                 | Interactive  | Menu-driven operation selection                         |

---

## Interactive Mode (no argument)

When invoked without arguments, display the main menu:

### 1. Gather Quick Stats

Read `conductor/tracks.md` and scan directories:

- Count active tracks (status `[ ]` or `[~]`)
- Count completed tracks (status `[x]`, not archived)
- Count archived tracks (in `_archive/` directory)

### 2. Display Main Menu

```
================================================================================
                          TRACK MANAGER
================================================================================

What would you like to do?

1. List all tracks
2. Archive a completed track
3. Restore an archived track
4. Delete a track permanently
5. Rename a track
6. Cleanup orphaned artifacts
7. Exit

Quick stats:
- {N} active tracks
- {M} completed (ready to archive)
- {P} archived

Select option:
```

### 3. Handle Selection

- Option 1: Execute List Mode
- Option 2: Execute Archive Mode (without argument)
- Option 3: Execute Restore Mode (without argument)
- Option 4: Execute Delete Mode (without argument)
- Option 5: Execute Rename Mode (without argument)
- Option 6: Execute Cleanup Mode
- Option 7: Exit with "Track management cancelled."

---

## List Mode (`--list`)

Display comprehensive track overview with optional filtering.

### 1. Data Collection

**For Active Tracks:**

- Read `conductor/tracks.md`
- For each track with status `[ ]` or `[~]`:
  - Read `conductor/tracks/{trackId}/metadata.json` for type, dates
  - Read `conductor/tracks/{trackId}/plan.md` for task counts
  - Calculate progress percentage

**For Completed Tracks:**

- Find tracks with status `[x]` not in `_archive/`
- Read metadata for completion dates

**For Archived Tracks:**

- Scan `conductor/tracks/_archive/` directory
- Read each `metadata.json` for archive reason and date

### 2. Output Format

**Full list (no filter):**

```
================================================================================
                          TRACK MANAGER
================================================================================

ACTIVE TRACKS ({count})
| Status | Track ID           | Type    | Progress    | Updated    |
|--------|-------------------|---------|-------------|------------|
| [~]    | dashboard_20250112| feature | 7/15 (47%)  | 2025-01-15 |
| [ ]    | nav-fix_20250114  | bug     | 0/4 (0%)    | 2025-01-14 |

COMPLETED TRACKS ({count})
| Track ID           | Type    | Completed  | Duration |
|-------------------|---------|------------|----------|
| auth_20250110     | feature | 2025-01-12 | 2 days   |

ARCHIVED TRACKS ({count})
| Track ID              | Type    | Reason     | Archived   |
|-----------------------|---------|------------|------------|
| old-feature_20241201  | feature | Superseded | 2025-01-05 |

================================================================================
Commands: /conductor:manage --archive | --restore | --delete | --rename | --cleanup
================================================================================
```

**Filtered list (`--list active`, `--list completed`, `--list archived`):**

Show only the requested section with the same format.

### 3. Empty States

**No tracks at all:**

```
================================================================================
                          TRACK MANAGER
================================================================================

No tracks found.

To create your first track: /conductor:new-track

================================================================================
```

**No tracks in filter:**

```
================================================================================
                          TRACK MANAGER
================================================================================

No {filter} tracks found.

================================================================================
```

---

## Archive Mode (`--archive`)

Move completed tracks to the archive directory.

### With Argument (`--archive <track-id>`)

#### 1. Validate Track

- Check track exists in `conductor/tracks/{track-id}/`
- If not found, display error with available tracks:

  ```
  ERROR: Track not found: {track-id}

  Available tracks:
  - auth_20250110 (completed)
  - dashboard_20250112 (in progress)

  Usage: /conductor:manage --archive <track-id>
  ```

- Check track is not already archived (not in `_archive/`)
- If archived:

  ```
  ERROR: Track '{track-id}' is already archived.

  Archived: {archived_at}
  Reason:   {archive_reason}
  Location: conductor/tracks/_archive/{track-id}/

  To restore: /conductor:manage --restore {track-id}
  ```

#### 2. Verify Completion Status

Read `conductor/tracks/{track-id}/metadata.json` and `plan.md`:

- If status is not `completed` or `[x]`:

  ```
  Track '{track-id}' is not marked as complete.

  Current status: {status}
  Tasks: {completed}/{total} complete

  Options:
  1. Archive anyway (not recommended)
  2. Cancel and complete the track first
  3. View track status

  Select option:
  ```

- If option 1 selected, proceed with warning
- If option 2 or 3 selected, exit or show status

#### 3. Prompt for Archive Reason

```
Why are you archiving this track?

1. Completed - Work finished successfully
2. Superseded - Replaced by another track
3. Abandoned - No longer needed
4. Other (specify)

Select reason:
```

If "Other" selected, prompt for custom reason.

#### 4. Display Confirmation

```
================================================================================
                          ARCHIVE CONFIRMATION
================================================================================

Track:    {track-id} - {title}
Type:     {type}
Status:   {status}
Tasks:    {completed}/{total} complete
Reason:   {reason}

Actions:
- Move conductor/tracks/{track-id}/ to conductor/tracks/_archive/{track-id}/
- Update conductor/tracks.md (move to Archived Tracks section)
- Update metadata.json with archive info
- Create git commit: chore(conductor): Archive track '{title}'

================================================================================

Type 'YES' to proceed, or anything else to cancel:
```

**CRITICAL: Require explicit 'YES' confirmation.**

#### 5. Execute Archive

1. Create `conductor/tracks/_archive/` if not exists:

   ```bash
   mkdir -p conductor/tracks/_archive
   ```

2. Move track directory:

   ```bash
   mv conductor/tracks/{track-id} conductor/tracks/_archive/
   ```

3. Update `conductor/tracks/_archive/{track-id}/metadata.json`:

   ```json
   {
     "archived": true,
     "archived_at": "ISO_TIMESTAMP",
     "archive_reason": "{reason}",
     "status": "archived"
   }
   ```

4. Update `conductor/tracks.md`:
   - Remove entry from Active Tracks or Completed Tracks section
   - Add entry to Archived Tracks section with format:
     ```markdown
     ### {track-id}: {title}

     **Reason:** {reason}
     **Archived:** YYYY-MM-DD
     **Folder:** ./tracks/\_archive/{track-id}/
     ```

5. Git commit:
   ```bash
   git add conductor/tracks/_archive/{track-id} conductor/tracks.md
   git commit -m "chore(conductor): Archive track '{title}'"
   ```

#### 6. Success Output

```
================================================================================
                          ARCHIVE COMPLETE
================================================================================

Track archived: {track-id} - {title}

Location:  conductor/tracks/_archive/{track-id}/
Reason:    {reason}
Commit:    {sha}

To restore: /conductor:manage --restore {track-id}
To list:    /conductor:manage --list archived

================================================================================
```

### Without Argument (`--archive`)

#### 1. Find Archivable Tracks

Scan for completed tracks not yet archived:

- Status `[x]` in tracks.md
- Not in `_archive/` directory

#### 2. Display Selection Menu

```
================================================================================
                          ARCHIVE TRACKS
================================================================================

Completed tracks available for archiving:

1. [x] auth_20250110 - User Authentication (completed 2025-01-12)
2. [x] setup-ci_20250108 - CI Pipeline Setup (completed 2025-01-09)

Already archived: {N} tracks

--------------------------------------------------------------------------------

Options:
1-{N}. Select a track to archive
A.     Archive all completed tracks
C.     Cancel

Select option:
```

- If numeric, proceed with single archive flow
- If 'A', proceed with bulk archive
- If 'C', exit

#### 3. No Archivable Tracks

```
================================================================================
                          ARCHIVE TRACKS
================================================================================

No completed tracks available for archiving.

Current tracks:
- [~] nav-fix_20250114 - In progress
- [ ] api-v2_20250115 - Pending

Already archived: {N} tracks (use --list archived to view)

================================================================================
```

### Bulk Archive (`--archive --bulk`)

#### 1. Display Multi-Select

```
================================================================================
                       BULK ARCHIVE SELECTION
================================================================================

Select tracks to archive (comma-separated numbers, or 'all'):

Completed Tracks:
[ ] 1. auth_20250110 - User Authentication (completed 2025-01-12)
[ ] 2. setup-ci_20250108 - CI Pipeline Setup (completed 2025-01-09)
[ ] 3. docs-update_20250105 - Documentation Update (completed 2025-01-06)

Enter selection (e.g., "1,3" or "all"):
```

#### 2. Confirm Selection

```
================================================================================
                       BULK ARCHIVE CONFIRMATION
================================================================================

Tracks to archive:

1. auth_20250110 - User Authentication
2. setup-ci_20250108 - CI Pipeline Setup

Archive reason for all: Completed

Actions:
- Move 2 track directories to conductor/tracks/_archive/
- Update conductor/tracks.md
- Create git commit: chore(conductor): Archive 2 completed tracks

================================================================================

Type 'YES' to proceed, or anything else to cancel:
```

#### 3. Execute Bulk Archive

- Archive each track sequentially
- Single git commit for all:
  ```bash
  git add conductor/tracks/_archive/ conductor/tracks.md
  git commit -m "chore(conductor): Archive {N} completed tracks"
  ```

---

## Restore Mode (`--restore`)

Restore archived tracks back to active status.

### With Argument (`--restore <track-id>`)

#### 1. Validate Track

- Check track exists in `conductor/tracks/_archive/{track-id}/`
- If not found:

  ```
  ERROR: Archived track not found: {track-id}

  Available archived tracks:
  - old-feature_20241201 (archived 2025-01-05)

  Usage: /conductor:manage --restore <track-id>
  ```

#### 2. Check for Conflicts

- Verify no active track with same ID exists in `conductor/tracks/`
- If conflict:

  ```
  ERROR: Cannot restore '{track-id}' - a track with this ID already exists.

  Active track: conductor/tracks/{track-id}/

  Options:
  1. Delete existing track first
  2. Restore with different ID (will prompt for new ID)
  3. Cancel

  Select option:
  ```

#### 3. Display Confirmation

```
================================================================================
                          RESTORE CONFIRMATION
================================================================================

Restoring archived track:

Track:    {track-id} - {title}
Type:     {type}
Archived: {archived_at}
Reason:   {archive_reason}

Actions:
- Move conductor/tracks/_archive/{track-id}/ to conductor/tracks/{track-id}/
- Update conductor/tracks.md (move to Completed Tracks section)
- Update metadata.json
- Create git commit: chore(conductor): Restore track '{title}'

Note: Track will be restored with status 'completed'. Use /conductor:implement
to resume work if needed.

================================================================================

Type 'YES' to proceed, or anything else to cancel:
```

#### 4. Execute Restore

1. Move track directory:

   ```bash
   mv conductor/tracks/_archive/{track-id} conductor/tracks/
   ```

2. Update `conductor/tracks/{track-id}/metadata.json`:

   ```json
   {
     "archived": false,
     "restored_at": "ISO_TIMESTAMP",
     "status": "completed"
   }
   ```

3. Update `conductor/tracks.md`:
   - Remove entry from Archived Tracks section
   - Add entry to Completed Tracks section

4. Git commit:
   ```bash
   git add conductor/tracks/{track-id} conductor/tracks.md
   git commit -m "chore(conductor): Restore track '{title}'"
   ```

#### 5. Success Output

```
================================================================================
                          RESTORE COMPLETE
================================================================================

Track restored: {track-id} - {title}

Location:  conductor/tracks/{track-id}/
Status:    completed

Next steps:
- Run /conductor:status {track-id} to see track details
- Run /conductor:implement {track-id} to resume work (if needed)

================================================================================
```

### Without Argument (`--restore`)

Display menu of archived tracks for selection:

```
================================================================================
                          RESTORE TRACKS
================================================================================

Archived tracks available for restoration:

1. old-feature_20241201 - Old Feature (archived 2025-01-05, reason: Superseded)
2. cleanup-api_20241215 - API Cleanup (archived 2025-01-10, reason: Completed)

--------------------------------------------------------------------------------

Options:
1-{N}. Select a track to restore
C.     Cancel

Select option:
```

---

## Delete Mode (`--delete`)

Permanently remove tracks with safety confirmations.

### With Argument (`--delete <track-id>`)

#### 1. Find Track

Search for track in:

1. `conductor/tracks/{track-id}/` (active/completed)
2. `conductor/tracks/_archive/{track-id}/` (archived)

If not found:

```
ERROR: Track not found: {track-id}

Available tracks:
Active:
- dashboard_20250112

Archived:
- old-feature_20241201

Usage: /conductor:manage --delete <track-id>
```

#### 2. Check In-Progress Status

If track status is `[~]` (in progress):

```
================================================================================
                          !! WARNING !!
================================================================================

Track '{track-id}' is currently IN PROGRESS.

Current task: Task 2.3 - {description}
Progress:     7/15 tasks (47%)

Deleting an in-progress track may result in lost work.

Options:
1. Delete anyway (use --force to skip this warning)
2. Archive instead (recommended)
3. Cancel

Select option:
```

Without `--force` flag, require explicit selection.

#### 3. Display Full Warning

```
================================================================================
                     !! PERMANENT DELETION WARNING !!
================================================================================

Track:    {track-id} - {title}
Type:     {type}
Status:   {status}
Location: conductor/tracks/{track-id}/ (or _archive/)
Created:  {created_date}
Files:    {count} (spec.md, plan.md, metadata.json, index.md)
Commits:  {count} related commits (will NOT be deleted)

This action CANNOT be undone. The track directory and all contents
will be permanently removed.

Consider archiving instead: /conductor:manage --archive {track-id}

================================================================================

Type 'DELETE' to permanently remove, or anything else to cancel:
```

**CRITICAL: Require exact 'DELETE' string, not 'yes' or 'y'.**

#### 4. Execute Delete

1. Remove track directory:

   ```bash
   rm -rf conductor/tracks/{track-id}
   # or
   rm -rf conductor/tracks/_archive/{track-id}
   ```

2. Update `conductor/tracks.md`:
   - Remove entry from appropriate section (Active, Completed, or Archived)

3. Git commit:
   ```bash
   git add conductor/tracks.md
   git commit -m "chore(conductor): Delete track '{title}'"
   ```

Note: The git commit records the deletion but does not remove historical commits.

#### 5. Success Output

```
================================================================================
                          DELETE COMPLETE
================================================================================

Track permanently deleted: {track-id} - {title}

Note: Git history still contains commits referencing this track.
      The track directory and registry entry have been removed.

================================================================================
```

### Without Argument (`--delete`)

Display menu of all tracks for selection:

```
================================================================================
                          DELETE TRACKS
================================================================================

!! This will PERMANENTLY delete a track !!

Select a track to delete:

Active/Completed:
1. [ ] nav-fix_20250114 - Navigation Bug Fix
2. [x] auth_20250110 - User Authentication

Archived:
3. old-feature_20241201 - Old Feature

--------------------------------------------------------------------------------

Options:
1-{N}. Select a track to delete
C.     Cancel

Select option:
```

---

## Rename Mode (`--rename`)

Change track IDs with full reference updates.

### With Arguments (`--rename <old-id> <new-id>`)

#### 1. Validate Old Track Exists

Check track exists in:

- `conductor/tracks/{old-id}/`
- `conductor/tracks/_archive/{old-id}/`

If not found:

```
ERROR: Track not found: {old-id}

Available tracks:
- auth_20250110
- dashboard_20250112

Usage: /conductor:manage --rename <old-id> <new-id>
```

#### 2. Validate New ID

**Check format** (must match `{shortname}_{YYYYMMDD}`):

```
ERROR: Invalid track ID format: {new-id}

Track IDs must follow the pattern: {shortname}_{YYYYMMDD}
Examples:
- user-auth_20250115
- fix-login_20250114
- api-v2_20250110
```

**Check no conflict:**

```
ERROR: Track '{new-id}' already exists.

Choose a different ID or delete the existing track first.
```

#### 3. Display Confirmation

```
================================================================================
                          RENAME TRACK
================================================================================

Current:  {old-id} - {title}
New ID:   {new-id}

Changes:
- Rename conductor/tracks/{old-id}/ to {new-id}/
- Update tracks.md entry
- Update metadata.json id field
- Update plan.md track ID header

Note: Git commit history will retain original track ID references.
      Related commits cannot be renamed.

================================================================================

Type 'YES' to proceed, or anything else to cancel:
```

#### 4. Execute Rename

1. Rename directory:

   ```bash
   mv conductor/tracks/{old-id} conductor/tracks/{new-id}
   # or for archived:
   mv conductor/tracks/_archive/{old-id} conductor/tracks/_archive/{new-id}
   ```

2. Update `conductor/tracks/{new-id}/metadata.json`:

   ```json
   {
     "id": "{new-id}",
     "previous_ids": ["{old-id}"],
     "renamed_at": "ISO_TIMESTAMP"
   }
   ```

   If `previous_ids` already exists, append the old ID.

3. Update `conductor/tracks/{new-id}/plan.md`:
   - Change track ID in header line

4. Update `conductor/tracks.md`:
   - Update the track ID in the appropriate section
   - Update folder link path

5. Git commit:
   ```bash
   git add conductor/tracks/{new-id} conductor/tracks.md
   git commit -m "chore(conductor): Rename track '{old-id}' to '{new-id}'"
   ```

#### 5. Success Output

```
================================================================================
                          RENAME COMPLETE
================================================================================

Track renamed: {old-id} → {new-id}

New location: conductor/tracks/{new-id}/

Note: Historical git commits still reference '{old-id}'.

================================================================================
```

### Without Arguments (`--rename`)

Interactive mode:

```
================================================================================
                          RENAME TRACK
================================================================================

Select a track to rename:

1. auth_20250110 - User Authentication
2. dashboard_20250112 - Dashboard Feature
3. nav-fix_20250114 - Navigation Bug Fix

--------------------------------------------------------------------------------

Options:
1-{N}. Select a track
C.     Cancel

Select option:
```

After selection:

```
Enter new track ID for '{old-id}':

Format: {shortname}_{YYYYMMDD}
Current: {old-id}

New ID:
```

---

## Cleanup Mode (`--cleanup`)

Detect and fix orphaned track artifacts.

### 1. Scan for Issues

**Directory Orphans:**

- Scan `conductor/tracks/` for directories
- Check each against tracks.md entries
- Flag directories not in registry

**Registry Orphans:**

- Parse tracks.md for all track entries
- Check each has a corresponding directory
- Flag entries without directories

**Incomplete Tracks:**

- For each track directory, verify required files exist:
  - `spec.md`
  - `plan.md`
  - `metadata.json`
- Flag tracks missing required files

**Stale In-Progress:**

- Find tracks with status `[~]`
- Check `metadata.json` `updated` timestamp
- Flag if untouched for > 7 days

### 2. Display Results

```
================================================================================
                          TRACK CLEANUP
================================================================================

Scanning for issues...

ORPHANED DIRECTORIES (not in tracks.md):
  1. conductor/tracks/test-feature_20241201/
  2. conductor/tracks/experiment_20241220/

REGISTRY ORPHANS (no matching folder):
  3. broken-track_20250101 (listed in tracks.md)

INCOMPLETE TRACKS (missing files):
  4. partial_20250105/ - missing: metadata.json, index.md

STALE IN-PROGRESS (untouched >7 days):
  5. old-work_20250101 - last updated: 2025-01-02

================================================================================

Found {N} issues.

Actions:
1. Add orphaned directories to tracks.md
2. Remove registry orphans from tracks.md
3. Create missing files from templates
4. Archive stale tracks
A. Fix all issues automatically
S. Skip and review manually
C. Cancel

Select action:
```

### 3. Handle No Issues

```
================================================================================
                          TRACK CLEANUP
================================================================================

Scanning for issues...

No issues found.

All tracks are properly registered and complete.

================================================================================
```

### 4. Execute Fixes

**For Directory Orphans (Action 1):**

```
Adding orphaned directories to tracks.md...

For each directory:
- Read metadata.json if exists for track info
- If no metadata, prompt for track details:

  Found: conductor/tracks/test-feature_20241201/

  Enter track title (or 'skip' to ignore):
  Enter track type (feature/bug/chore/refactor):

- Add entry to appropriate section in tracks.md
- Create metadata.json if missing
```

**For Registry Orphans (Action 2):**

```
Removing registry orphans from tracks.md...

Removed entries:
- broken-track_20250101

Note: No files were deleted, only tracks.md was updated.
```

**For Incomplete Tracks (Action 3):**

```
Creating missing files from templates...

partial_20250105/:
- Created metadata.json from template
- Created index.md from template

Note: You may need to populate these files with actual content.
```

**For Stale In-Progress (Action 4):**

```
Archiving stale tracks...

old-work_20250101:
- Archived with reason: Stale (untouched since 2025-01-02)
```

**For All Issues (Action A):**

Execute all applicable fixes in sequence, then:

```bash
git add conductor/
git commit -m "chore(conductor): Clean up {N} orphaned track artifacts"
```

### 5. Completion Output

```
================================================================================
                          CLEANUP COMPLETE
================================================================================

Fixed {N} issues:
- Added {X} orphaned directories to tracks.md
- Removed {Y} registry orphans
- Created missing files for {Z} incomplete tracks
- Archived {W} stale tracks

Commit: {sha}

================================================================================
```

---

## Error Handling

### Git Operation Failures

```
GIT ERROR: {error message}

The operation partially completed:
- Directory moved: Yes/No
- tracks.md updated: Yes/No
- Commit created: No

You may need to manually:
1. Complete the git commit
2. Restore files from their current locations

Current state:
- Track location: {path}
- tracks.md: {status}

To retry the commit:
  git add conductor/tracks.md conductor/tracks/{track-id}
  git commit -m "{intended message}"
```

### File System Errors

```
ERROR: Failed to {operation}: {error}

Possible causes:
- Permission denied
- Disk full
- File in use

No changes were made. Please resolve the issue and try again.
```

### Invalid Arguments

```
ERROR: Invalid argument: {argument}

Usage: /conductor:manage [--archive | --restore | --delete | --rename | --list | --cleanup]

Examples:
  /conductor:manage                     # Interactive mode
  /conductor:manage --list              # List all tracks
  /conductor:manage --list archived     # List archived tracks only
  /conductor:manage --archive track-id  # Archive specific track
  /conductor:manage --restore track-id  # Restore archived track
  /conductor:manage --delete track-id   # Delete track permanently
  /conductor:manage --rename old new    # Rename track ID
  /conductor:manage --cleanup           # Fix orphaned artifacts
```

---

## Critical Rules

1. **ALWAYS verify track existence** before any operation
2. **REQUIRE explicit confirmation** for destructive operations:
   - 'YES' for archive, restore, rename
   - 'DELETE' for permanent deletion
3. **HALT on any error** - Do not attempt to continue past failures
4. **UPDATE tracks.md** - Keep registry in sync with file system
5. **COMMIT changes** - Create git commits for traceability
6. **PRESERVE history** - Git commits are never modified or deleted
7. **WARN for in-progress** - Extra caution when modifying active work
8. **OFFER alternatives** - Suggest archive before delete
