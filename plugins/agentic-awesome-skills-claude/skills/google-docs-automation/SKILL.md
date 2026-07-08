---
name: google-docs-automation
description: "Lightweight Google Docs integration with standalone OAuth authentication. No MCP server required."
license: Apache-2.0
risk: critical
source: community
metadata:
  author: sanjay3290
  version: "1.0"
---

# Google Docs

Lightweight Google Docs integration with standalone OAuth authentication. No MCP server required.

> **⚠️ Requires Google Workspace account.** Personal Gmail accounts are not supported.

## When to Use
- You need to create, search, read, or edit Google Docs from local automation scripts.
- The task involves document text extraction, append/insert operations, or content replacement in Workspace docs.
- You want direct Docs automation without relying on an MCP server.

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

## Commands

All operations via `scripts/docs.py`. Auto-authenticates on first use if not logged in.

```bash
# Create a new document
python scripts/docs.py create "Meeting Notes"

# Create a document with initial content
python scripts/docs.py create "Project Plan" --content "# Overview\n\nThis is the project plan."

# Find documents by title
python scripts/docs.py find "meeting" --limit 10

# Get text content of a document
python scripts/docs.py get-text 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# Get text using a full URL
python scripts/docs.py get-text "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"

# Append text to end of document
python scripts/docs.py append-text 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms "New paragraph at the end."

# Insert text at beginning of document
python scripts/docs.py insert-text 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms "Text at the beginning.\n\n"

# Replace text in document
python scripts/docs.py replace-text 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms "old text" "new text"
```

## Document ID Format

Google Docs uses document IDs like `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`. You can:
- Use the full URL (the ID will be extracted automatically)
- Use just the document ID
- Get document IDs from the `find` command results

## Token Management

Tokens stored securely using the system keyring:
- **macOS**: Keychain
- **Windows**: Windows Credential Locker
- **Linux**: Secret Service API (GNOME Keyring, KDE Wallet, etc.)

Service name: `google-docs-skill-oauth`

Access tokens are automatically refreshed when expired using Google's cloud function.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
