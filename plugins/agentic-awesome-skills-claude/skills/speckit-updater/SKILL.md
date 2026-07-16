---
name: speckit-updater
description: SpecKit Safe Update
risk: unknown
source: community
---

# SpecKit Safe Update

This skill provides safe update capabilities for GitHub SpecKit installations, preserving customizations while applying template updates.

**Installation**: Available via plugin (`/plugin marketplace add NotMyself/claude-plugins` then `/plugin install speckit-updater`) or manual Git clone. See README.md for details.

## When to Use
- You need to update or install SpecKit templates while preserving project customizations.
- You want a safe approval flow around update, rollback, or version-specific SpecKit operations.
- The task is to operate the SpecKit updater conversationally instead of running raw commands blindly.

## What to do when this skill is invoked

When the user invokes `/speckit-updater`, you should:

1. **Run the update orchestrator script** without any flags (conversational mode):
   ```powershell
   pwsh -NoProfile -Command "& 'C:\Users\bobby\.claude\skills\speckit-updater\scripts\update-wrapper.ps1'"
   ```

2. **Parse the output** for markers:
   - **`[PROMPT_FOR_APPROVAL]`** - Update scenario (existing SpecKit installation)
   - **`[PROMPT_FOR_INSTALL]`** - Fresh installation scenario (no .specify/ directory)

3. **For Updates** (`[PROMPT_FOR_APPROVAL]` marker found):
   - **Present the Markdown summary** showing:
     - Current version vs. available version
     - Files to update/add/remove
     - Conflicts detected (if any)
     - Files preserved (customized)
     - Backup location
     - Custom commands
   - **Ask the user for approval** to proceed with the update
   - **If approved**, re-run with `-Proceed` flag
   - **If declined**, inform the user the update was cancelled

4. **For Fresh Installations** (`[PROMPT_FOR_INSTALL]` marker found):
   - **Present a natural installation offer** to the user, such as:
     - "SpecKit is not currently installed in this project. Would you like me to install it?"
     - "I can install the latest SpecKit templates for you. This will create the .specify/ directory structure and download the templates from GitHub."
   - **Do NOT mention the `-Proceed` flag** to the user (this is an implementation detail)
   - **If user approves** (says "yes", "proceed", "install it", etc.), re-run with `-Proceed` flag
   - **If user declines**, inform them the installation was cancelled

5. **Execute approved action** by re-running with `-Proceed` flag:
   ```powershell
   pwsh -NoProfile -Command "& 'C:\Users\bobby\.claude\skills\speckit-updater\scripts\update-wrapper.ps1' -Proceed"
   ```

**Special cases:**
- If user requests `-CheckOnly`: run with that flag and show the report
- If user requests `-Rollback`: run with that flag and confirm restoration
- If user requests specific `-Version`: include that parameter

## Commands

### /speckit-updater

Updates SpecKit templates, commands, and scripts while preserving customizations.

**Usage:**
- `/speckit-updater` - Interactive update/install with conversational approval workflow (recommended for Claude Code)
- `/speckit-updater -Proceed` - Proceed with update/install after approval (used by Claude after user confirms)
- `/speckit-updater -CheckOnly` - Check for updates without applying
- `/speckit-updater -Version v0.0.72` - Update to specific version
- `/speckit-updater -Force` - Force overwrite SpecKit files (preserves custom commands)
- `/speckit-updater -Rollback` - Restore from previous backup
- `/speckit-updater -Auto` - DEPRECATED: Use conversational workflow instead (shows warning, maps to -Proceed)

**Fresh Installation (No .specify/ directory):**
- First invocation shows installation offer with `[PROMPT_FOR_INSTALL]` marker
- Claude Code presents natural question to user (e.g., "Would you like me to install SpecKit?")
- User approves via conversational response (e.g., "yes", "proceed", "install it")
- Claude re-invokes with `-Proceed` flag automatically (implementation detail hidden from user)
- Script creates `.specify/` structure, downloads templates, creates manifest
- Exit code 0 throughout (awaiting approval is not an error)
- Consistent with update flow: both use conversational approval workflow

**Process:**
1. Validates prerequisites (Git installed, clean Git state, write permissions)
2. Loads or creates manifest (.specify/manifest.json)
3. Fetches target version from GitHub Releases API
4. Compares file hashes to identify customizations
5. Creates timestamped backup
6. Applies selective updates preserving customized files
7. Opens VSCode merge editor for conflicts (Flow A: one at a time)
8. Automatically invokes /speckit.constitution for constitution updates
9. Updates manifest with new version
10. Manages backup retention (keeps last 5)

**When you invoke this command, I will:**
1. Execute the update-orchestrator.ps1 script
2. Parse output for markers (`[PROMPT_FOR_APPROVAL]` for updates, `[PROMPT_FOR_INSTALL]` for fresh installations)
3. **For updates**: Present Markdown summary of proposed changes
4. **For installations**: Ask naturally if you want to install SpecKit (without mentioning `-Proceed` flag)
5. Wait for your approval via chat conversation
6. After approval: automatically re-invoke with `-Proceed` flag to execute
7. Guide you through conflict resolution one file at a time (updates only)
8. Open VSCode diff/merge tools as needed (updates only)
9. Report results with detailed summary

**Conversational Workflow:** The skill uses a two-step approval process:
- **Step 1**: Outputs summary → script exits → waits for approval
- **Step 2**: After approval, Claude re-invokes with `-Proceed` → applies updates

**Requirements:**
- Git installed and in PATH
- Internet connection for fetching updates from GitHub
- Write permissions to .specify/ and .claude/ directories
- Clean or staged Git working directory

**The script is located at:** `{skill_path}/scripts/update-wrapper.ps1` (entry point) and `{skill_path}/scripts/update-orchestrator.ps1` (main logic)

**Entry point command:**
```powershell
pwsh -NoProfile -Command "& '{skill_path}/scripts/update-wrapper.ps1' [parameters]"
```

**Note:** Both PowerShell-style (`-CheckOnly`) and Linux-style (`--check-only`) flags are supported via the wrapper script.

## Features

- **Customization Preservation**: Automatically detects and preserves user customizations using normalized file hashing
- **Intelligent Conflict Resolution**: Guides through conflicts one-at-a-time with 4 options: merge editor, keep mine, use new, skip
- **Version Tracking**: Maintains `.specify/manifest.json` with file hashes, version info, and backup history
- **Automatic Backups**: Creates timestamped backups in `.specify/backups/` with automatic retention management
- **Fail-Fast with Rollback**: Automatically rolls back on any error, restoring pre-update state
- **Dry-Run Mode**: `--check-only` shows exactly what would change without applying updates
- **Constitution Integration**: Notifies when constitution template has updates (run `/speckit.constitution`)
- **Custom Command Safety**: User-created commands never overwritten, even with `--force`

## Architecture

### Modules
- **HashUtils**: Normalized hashing (handles line endings, trailing whitespace, BOM)
- **VSCodeIntegration**: Context detection, Quick Pick, diff/merge editor integration
- **GitHubApiClient**: GitHub Releases API interaction (unauthenticated, 60 req/hour)
- **ManifestManager**: Manifest CRUD operations with caching
- **BackupManager**: Backup creation, restoration, and retention management
- **ConflictDetector**: File state analysis and conflict detection

### Workflow
1. Prerequisites validation (critical checks must pass, warnings allow continuation)
2. Manifest loading/creation (safe default: assume all files customized if no manifest)
3. GitHub API query for target version
4. File state analysis (6 actions: add/remove/merge/preserve/update/skip)
5. User confirmation with change preview
6. Backup creation (timestamped, excludes backups directory)
7. Selective file updates (fail-fast with automatic rollback)
8. Conflict resolution (Flow A: one-at-a-time, VSCode merge editor)
9. Manifest update (version, file hashes, customization flags)
10. Backup cleanup (keep 5 most recent, requires confirmation)
11. Detailed summary display

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Prerequisites not met |
| 3 | Network/API error |
| 4 | Git error |
| 5 | User cancelled |
| 6 | Rollback required (automatic) |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
