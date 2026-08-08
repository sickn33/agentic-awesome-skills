---
name: google-sheets-automation
description: "Lightweight Google Sheets integration with standalone OAuth authentication. No MCP server required. Full read/write access."
risk: critical
source: community
license: Apache-2.0
metadata:
  author: sanjay3290
  version: "1.0"
---

# Google Sheets

Lightweight Google Sheets integration with standalone OAuth authentication. No MCP server required. Full read/write access.

> **Requires Google Workspace account.** Personal Gmail accounts are not supported.

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

All operations via `scripts/sheets.py`. Auto-authenticates on first use if not logged in.

```bash
# Get spreadsheet content as plain text (default)
python scripts/sheets.py get-text SPREADSHEET_ID

# Get spreadsheet content as CSV
python scripts/sheets.py get-text SPREADSHEET_ID --format csv

# Get spreadsheet content as JSON
python scripts/sheets.py get-text SPREADSHEET_ID --format json

# Get values from a specific range (A1 notation)
python scripts/sheets.py get-range SPREADSHEET_ID "Sheet1!A1:D10"
python scripts/sheets.py get-range SPREADSHEET_ID "A1:C5"

# Find spreadsheets by search query
python scripts/sheets.py find "budget 2024"
python scripts/sheets.py find "sales report" --limit 5

# Get spreadsheet metadata (sheets, dimensions, etc.)
python scripts/sheets.py get-metadata SPREADSHEET_ID
```

## Write Commands

```bash
# Update a range of cells with values (JSON 2D array)
python scripts/sheets.py update-range SPREADSHEET_ID "Sheet1!A1:B2" '[["Hello","World"],["Foo","Bar"]]'

# Update with RAW input (no formula parsing, treats everything as literal text)
python scripts/sheets.py update-range SPREADSHEET_ID "Sheet1!A1:B1" '[["=SUM(A1:A5)","text"]]' --raw

# Append rows after the last data row
python scripts/sheets.py append-rows SPREADSHEET_ID "Sheet1!A:Z" '[["New Row Col A","New Row Col B"]]'

# Clear values from a range (keeps formatting)
python scripts/sheets.py clear-range SPREADSHEET_ID "Sheet1!A1:B10"

# Batch update (advanced - for formatting, merging, etc.)
python scripts/sheets.py batch-update SPREADSHEET_ID '[{"updateCells":{"range":{"sheetId":0},"fields":"userEnteredValue"}}]'
```

## Spreadsheet ID

You can use either:
- The spreadsheet ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
- The full URL: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`

The script automatically extracts the ID from URLs.

## Output Formats

### Text (default)
Human-readable format with pipe separators:
```
Spreadsheet Title: Sales Data
Sheet Name: Q1
Name | Revenue | Units
Product A | 10000 | 50
Product B | 15000 | 75
```

### CSV
Standard CSV format, suitable for further processing:
```
Name,Revenue,Units
Product A,10000,50
Product B,15000,75
```

### JSON
Structured data format:
```json
{
  "Q1": [
    ["Name", "Revenue", "Units"],
    ["Product A", "10000", "50"]
  ]
}
```

## A1 Notation Examples

- `Sheet1!A1:B10` - Range A1 to B10 on Sheet1
- `Sheet1!A:A` - All of column A on Sheet1
- `Sheet1!1:1` - All of row 1 on Sheet1
- `A1:C5` - Range on the first sheet

## Value Input Options

- **USER_ENTERED** (default): Values are parsed as if typed by a user. Numbers, dates, and formulas are interpreted.
- **RAW** (`--raw` flag): Values are stored exactly as provided. No parsing of formulas or number formatting.

## Token Management

Tokens stored securely using the system keyring:
- **macOS**: Keychain
- **Windows**: Windows Credential Locker
- **Linux**: Secret Service API (GNOME Keyring, KDE Wallet, etc.)

Service name: `google-sheets-skill-oauth`

Tokens automatically refresh when expired using Google's cloud function.


## When to Use
Use this skill when tackling tasks related to its primary domain or functionality as described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
