---
name: google-calendar-automation
description: "Lightweight Google Calendar integration with standalone OAuth authentication. No MCP server required."
license: Apache-2.0
risk: critical
source: community
metadata:
  author: sanjay3290
  version: "1.0"
---

# Google Calendar

Lightweight Google Calendar integration with standalone OAuth authentication. No MCP server required.

> **⚠️ Requires Google Workspace account.** Personal Gmail accounts are not supported.

## When to Use
- You need to list, create, inspect, or update Google Calendar events from local scripts.
- The task requires OAuth-backed calendar automation without standing up an MCP server.
- You need quick operational access to calendars, schedules, attendees, or event details in a Workspace environment.

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

All operations via `scripts/gcal.py`. Auto-authenticates on first use if not logged in.

### List Calendars
```bash
python scripts/gcal.py list-calendars
```

### List Events
```bash
# List events from primary calendar (default: next 30 days)
python scripts/gcal.py list-events

# List events with specific time range
python scripts/gcal.py list-events --time-min 2024-01-15T00:00:00Z --time-max 2024-01-31T23:59:59Z

# List events from a specific calendar
python scripts/gcal.py list-events --calendar "work@example.com"

# Limit results
python scripts/gcal.py list-events --max-results 10
```

### Get Event Details
```bash
python scripts/gcal.py get-event EVENT_ID
python scripts/gcal.py get-event EVENT_ID --calendar "work@example.com"
```

### Create Event
```bash
# Basic event
python scripts/gcal.py create-event "Team Meeting" "2024-01-15T10:00:00Z" "2024-01-15T11:00:00Z"

# Event with description and location
python scripts/gcal.py create-event "Team Meeting" "2024-01-15T10:00:00Z" "2024-01-15T11:00:00Z" \
    --description "Weekly sync" --location "Conference Room A"

# Event with attendees
python scripts/gcal.py create-event "Team Meeting" "2024-01-15T10:00:00Z" "2024-01-15T11:00:00Z" \
    --attendees user1@example.com user2@example.com

# Event on specific calendar
python scripts/gcal.py create-event "Meeting" "2024-01-15T10:00:00Z" "2024-01-15T11:00:00Z" \
    --calendar "work@example.com"
```

### Update Event
```bash
# Update event title
python scripts/gcal.py update-event EVENT_ID --summary "New Title"

# Update event time
python scripts/gcal.py update-event EVENT_ID --start "2024-01-15T14:00:00Z" --end "2024-01-15T15:00:00Z"

# Update multiple fields
python scripts/gcal.py update-event EVENT_ID \
    --summary "Updated Meeting" --description "New agenda" --location "Room B"

# Update attendees
python scripts/gcal.py update-event EVENT_ID --attendees user1@example.com user3@example.com
```

### Delete Event
```bash
python scripts/gcal.py delete-event EVENT_ID
python scripts/gcal.py delete-event EVENT_ID --calendar "work@example.com"
```

### Find Free Time
Find the first available slot for a meeting with specified attendees:
```bash
# Find 30-minute slot for yourself
python scripts/gcal.py find-free-time \
    --attendees me \
    --time-min "2024-01-15T09:00:00Z" \
    --time-max "2024-01-15T17:00:00Z" \
    --duration 30

# Find 60-minute slot with multiple attendees
python scripts/gcal.py find-free-time \
    --attendees me user1@example.com user2@example.com \
    --time-min "2024-01-15T09:00:00Z" \
    --time-max "2024-01-19T17:00:00Z" \
    --duration 60
```

### Respond to Event Invitation
```bash
# Accept an invitation
python scripts/gcal.py respond-to-event EVENT_ID accepted

# Decline an invitation
python scripts/gcal.py respond-to-event EVENT_ID declined

# Mark as tentative
python scripts/gcal.py respond-to-event EVENT_ID tentative

# Respond without notifying organizer
python scripts/gcal.py respond-to-event EVENT_ID accepted --no-notify
```

## Date/Time Format

All times use ISO 8601 format with timezone:
- UTC: `2024-01-15T10:30:00Z`
- With offset: `2024-01-15T10:30:00-05:00` (EST)

## Calendar ID Format

- Primary calendar: Use `primary` or omit the `--calendar` flag
- Other calendars: Use the calendar ID from `list-calendars` (usually an email address)

## Token Management

Tokens stored securely using the system keyring:
- **macOS**: Keychain
- **Windows**: Windows Credential Locker
- **Linux**: Secret Service API (GNOME Keyring, KDE Wallet, etc.)

Service name: `google-calendar-skill-oauth`

Tokens are automatically refreshed when expired using Google's cloud function.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
