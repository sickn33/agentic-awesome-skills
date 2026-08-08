---
name: google-slides-automation
description: "Lightweight Google Slides integration with standalone OAuth authentication. No MCP server required. Full read/write access."
license: Apache-2.0
risk: critical
source: community
metadata:
  author: sanjay3290
  version: "1.0"
---

# Google Slides

Lightweight Google Slides integration with standalone OAuth authentication. No MCP server required. Full read/write access.

> **Requires Google Workspace account.** Personal Gmail accounts are not supported.

## When to Use
- You need to create, inspect, or modify Google Slides presentations from local automation.
- The task involves reading slide text, adding/removing slides, or batch updating presentation content.
- You want Slides automation for Workspace documents without using an MCP server.

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

All operations via `scripts/slides.py`. Auto-authenticates on first use if not logged in.

```bash
# Get all text content from a presentation
python scripts/slides.py get-text "1abc123xyz789"
python scripts/slides.py get-text "https://docs.google.com/presentation/d/1abc123xyz789/edit"

# Find presentations by search query
python scripts/slides.py find "quarterly report"
python scripts/slides.py find "project proposal" --limit 5

# Get presentation metadata (title, slide count, slide object IDs)
python scripts/slides.py get-metadata "1abc123xyz789"
```

## Write Commands

```bash
# Create a new empty presentation
python scripts/slides.py create "Q4 Sales Report"

# Add a blank slide to the end
python scripts/slides.py add-slide "1abc123xyz789"

# Add a slide with a specific layout
python scripts/slides.py add-slide "1abc123xyz789" --layout TITLE_AND_BODY

# Add a slide at a specific position (0-based index)
python scripts/slides.py add-slide "1abc123xyz789" --layout TITLE --at 0

# Find and replace text across all slides
python scripts/slides.py replace-text "1abc123xyz789" "old text" "new text"
python scripts/slides.py replace-text "1abc123xyz789" "Draft" "Final" --match-case

# Delete a slide by object ID (use get-metadata to find IDs)
python scripts/slides.py delete-slide "1abc123xyz789" "g123abc456"

# Batch update (advanced - for formatting, inserting shapes, images, etc.)
python scripts/slides.py batch-update "1abc123xyz789" '[{"replaceAllText":{"containsText":{"text":"foo"},"replaceText":"bar"}}]'
```

## Slide Layouts

Available layouts for `add-slide --layout`:
- `BLANK` - Empty slide (default)
- `TITLE` - Title slide
- `TITLE_AND_BODY` - Title with body text
- `TITLE_AND_TWO_COLUMNS` - Title with two text columns
- `TITLE_ONLY` - Title bar only
- `SECTION_HEADER` - Section divider
- `ONE_COLUMN_TEXT` - Single column text
- `MAIN_POINT` - Main point highlight
- `BIG_NUMBER` - Large number display

## Presentation ID Format

You can use either:
- Direct presentation ID: `1abc123xyz789`
- Full Google Slides URL: `https://docs.google.com/presentation/d/1abc123xyz789/edit`

The scripts automatically extract the ID from URLs.

## Output Format

### get-text
Returns extracted text from all slides, including:
- Presentation title
- Text from shapes/text boxes on each slide
- Table data with cell contents

### find
Returns list of matching presentations:
```json
{
  "presentations": [
    {"id": "1abc...", "name": "Q4 Report", "modifiedTime": "2024-01-15T..."}
  ],
  "nextPageToken": "..."
}
```

### get-metadata
Returns presentation details:
```json
{
  "presentationId": "1abc...",
  "title": "My Presentation",
  "slideCount": 15,
  "pageSize": {"width": {...}, "height": {...}},
  "hasMasters": true,
  "hasLayouts": true
}
```

## Token Management

Tokens stored securely using the system keyring:
- **macOS**: Keychain
- **Windows**: Windows Credential Locker
- **Linux**: Secret Service API (GNOME Keyring, KDE Wallet, etc.)

Service name: `google-slides-skill-oauth`

Automatically refreshes expired tokens using Google's cloud function.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
