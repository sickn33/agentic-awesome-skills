---
name: gmail-automation
description: "Lightweight Gmail integration with standalone OAuth authentication. No MCP server required."
license: Apache-2.0
risk: critical
source: community
metadata:
  author: sanjay3290
  version: "1.0"
---

# Gmail

Lightweight Gmail integration with standalone OAuth authentication. No MCP server required.

> **⚠️ Requires Google Workspace account.** Personal Gmail accounts are not supported.

## When to Use
- You need to search, read, or send Gmail messages from the command line without an MCP server.
- You are automating inbox workflows for a Google Workspace account.
- You want a lightweight Gmail integration backed by standalone OAuth scripts.

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

All operations via `scripts/gmail.py`. Auto-authenticates on first use if not logged in.

### Search Emails

```bash
# Search with Gmail query syntax
python scripts/gmail.py search "from:someone@example.com is:unread"

# Search recent emails (no query returns all)
python scripts/gmail.py search --limit 20

# Filter by label
python scripts/gmail.py search --label INBOX --limit 10

# Include spam and trash
python scripts/gmail.py search "subject:important" --include-spam-trash
```

### Read Email Content

```bash
# Get full message content
python scripts/gmail.py get MESSAGE_ID

# Get just metadata (headers)
python scripts/gmail.py get MESSAGE_ID --format metadata

# Get minimal response (IDs only)
python scripts/gmail.py get MESSAGE_ID --format minimal
```

### Send Emails

```bash
# Send a simple email
python scripts/gmail.py send --to "user@example.com" --subject "Hello" --body "Message body"

# Send with CC and BCC
python scripts/gmail.py send --to "user@example.com" --cc "cc@example.com" --bcc "bcc@example.com" \
  --subject "Team Update" --body "Update message"

# Send from an alias (must be configured in Gmail settings)
python scripts/gmail.py send --to "user@example.com" --subject "Hello" --body "Message" \
  --from "Mile9 Accounts <accounts@mile9.io>"

# Send HTML email
python scripts/gmail.py send --to "user@example.com" --subject "HTML Email" \
  --body "<h1>Hello</h1><p>HTML content</p>" --html
```

### Draft Management

```bash
# Create a draft
python scripts/gmail.py create-draft --to "user@example.com" --subject "Draft Subject" \
  --body "Draft content"

# Send an existing draft
python scripts/gmail.py send-draft DRAFT_ID
```

### Modify Messages (Labels)

```bash
# Mark as read (remove UNREAD label)
python scripts/gmail.py modify MESSAGE_ID --remove-label UNREAD

# Mark as unread
python scripts/gmail.py modify MESSAGE_ID --add-label UNREAD

# Archive (remove from INBOX)
python scripts/gmail.py modify MESSAGE_ID --remove-label INBOX

# Star a message
python scripts/gmail.py modify MESSAGE_ID --add-label STARRED

# Unstar a message
python scripts/gmail.py modify MESSAGE_ID --remove-label STARRED

# Mark as important
python scripts/gmail.py modify MESSAGE_ID --add-label IMPORTANT

# Multiple label changes at once
python scripts/gmail.py modify MESSAGE_ID --remove-label UNREAD --add-label STARRED
```

### List Labels

```bash
# List all Gmail labels (system and user-created)
python scripts/gmail.py list-labels
```

## Gmail Query Syntax

Gmail supports powerful search operators:

| Query | Description |
|-------|-------------|
| `from:user@example.com` | Emails from a specific sender |
| `to:user@example.com` | Emails to a specific recipient |
| `subject:meeting` | Emails with "meeting" in subject |
| `is:unread` | Unread emails |
| `is:starred` | Starred emails |
| `is:important` | Important emails |
| `has:attachment` | Emails with attachments |
| `after:2024/01/01` | Emails after a date |
| `before:2024/12/31` | Emails before a date |
| `newer_than:7d` | Emails from last 7 days |
| `older_than:1m` | Emails older than 1 month |
| `label:work` | Emails with a specific label |
| `in:inbox` | Emails in inbox |
| `in:sent` | Sent emails |
| `in:trash` | Trashed emails |

Combine with AND (space), OR, or - (NOT):
```bash
python scripts/gmail.py search "from:boss@company.com is:unread newer_than:1d"
python scripts/gmail.py search "subject:urgent OR subject:important"
python scripts/gmail.py search "from:newsletter@example.com -is:starred"
```

## Common Label IDs

| Label | ID |
|-------|-----|
| Inbox | `INBOX` |
| Sent | `SENT` |
| Drafts | `DRAFT` |
| Spam | `SPAM` |
| Trash | `TRASH` |
| Starred | `STARRED` |
| Important | `IMPORTANT` |
| Unread | `UNREAD` |

## Token Management

Tokens stored securely using the system keyring:
- **macOS**: Keychain
- **Windows**: Windows Credential Locker
- **Linux**: Secret Service API (GNOME Keyring, KDE Wallet, etc.)

Service name: `gmail-skill-oauth`

Tokens automatically refresh when expired using Google's cloud function.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
