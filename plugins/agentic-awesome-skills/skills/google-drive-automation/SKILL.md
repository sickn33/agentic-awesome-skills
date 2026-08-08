---
name: google-drive-automation
description: "Lightweight Google Drive integration with standalone OAuth authentication. No MCP server required. Full read/write access."
license: Apache-2.0
risk: critical
source: community
metadata:
  author: sanjay3290
  version: "1.0"
---

# Google Drive

Lightweight Google Drive integration with standalone OAuth authentication. No MCP server required. Full read/write access.

> **Requires Google Workspace account.** Personal Gmail accounts are not supported.

## When to Use
- You need to search, list, upload, download, move, or organize Google Drive files and folders.
- The task requires direct Drive read/write automation through local scripts in a Workspace account.
- You want file-level Drive operations without introducing an MCP server dependency.

## First-Time Setup

Authenticate with Google (opens browser):
```bash
python scripts/auth.py login
```

Check authentication status:
```bash
python scripts/auth.py status
```

Logout when needed:
```bash
python scripts/auth.py logout
```

## Read Commands

All operations via `scripts/drive.py`. Auto-authenticates on first use if not logged in.

```bash
# Search for files (full-text search)
python scripts/drive.py search "quarterly report"

# Search by title only
python scripts/drive.py search "title:budget"

# Search using Google Drive URL (extracts ID automatically)
python scripts/drive.py search "https://drive.google.com/drive/folders/1ABC123..."

# Search files shared with you
python scripts/drive.py search --shared-with-me

# Search with pagination
python scripts/drive.py search "report" --limit 5 --page-token "..."

# Find a folder by exact name
python scripts/drive.py find-folder "Project Documents"

# List files in root Drive
python scripts/drive.py list

# List files in a specific folder
python scripts/drive.py list 1ABC123xyz --limit 20

# Download a file
python scripts/drive.py download 1ABC123xyz ./downloads/report.pdf
```

## Write Commands

```bash
# Upload a file to Drive root
python scripts/drive.py upload ~/Documents/report.pdf

# Upload to a specific folder
python scripts/drive.py upload ~/Documents/report.pdf --folder 1ABC123xyz

# Upload with a custom name
python scripts/drive.py upload ~/Documents/report.pdf --name "Q4 Report.pdf"

# Create a new folder
python scripts/drive.py create-folder "Project Documents"

# Create a folder inside another folder
python scripts/drive.py create-folder "Attachments" --parent 1ABC123xyz

# Move a file to a different folder
python scripts/drive.py move FILE_ID DESTINATION_FOLDER_ID

# Copy a file
python scripts/drive.py copy FILE_ID
python scripts/drive.py copy FILE_ID --name "Report Copy" --folder 1ABC123xyz

# Rename a file or folder
python scripts/drive.py rename FILE_ID "New Name.pdf"

# Move a file to trash
python scripts/drive.py trash FILE_ID
```

## Search Query Formats

The search command supports multiple query formats:

| Format | Example | Description |
|--------|---------|-------------|
| Full-text | `"quarterly report"` | Searches file contents and names |
| Title | `"title:budget"` | Searches file names only |
| URL | `https://drive.google.com/...` | Extracts and uses file/folder ID |
| Folder ID | `1ABC123...` | Lists folder contents (25+ char IDs) |
| Native query | `mimeType='application/pdf'` | Pass-through Drive query syntax |

## File ID Format

Google Drive uses long IDs like `1ABC123xyz_-abc123`. Get IDs from:
- `search` results
- `find-folder` results
- `list` results
- Google Drive URLs

## Download Limitations

- Regular files (PDFs, images, etc.) download directly
- Google Docs/Sheets/Slides cannot be downloaded via this tool
- For Google Workspace files, use export or dedicated tools

## Token Management

Tokens stored securely using the system keyring:
- **macOS**: Keychain
- **Windows**: Windows Credential Locker
- **Linux**: Secret Service API (GNOME Keyring, KDE Wallet, etc.)

Service name: `google-drive-skill-oauth`

Automatically refreshes expired tokens using Google's cloud function.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
