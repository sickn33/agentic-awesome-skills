---
name: google-calendar
description: Interact with Google Calendar via the Google Calendar API – list upcoming events, create new events, update or delete them. Use this skill when you need programmatic access to your calendar from OpenClaw.
risk: safe
source: community
---

# Google Calendar Skill

## Overview
This skill provides a thin wrapper around the Google Calendar REST API. It lets you:
- **list** upcoming events (optionally filtered by time range or query)
- **add** a new event with title, start/end time, description, location, and attendees
- **update** an existing event by its ID
- **delete** an event by its ID

The skill is implemented in Python (`scripts/google_calendar.py`). It expects the following environment variables to be set (you can store them securely with `openclaw secret set`):
```
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
GOOGLE_REFRESH_TOKEN=…   # obtained after OAuth consent
GOOGLE_CALENDAR_ID=primary   # or the ID of a specific calendar
```
The first time you run the skill you may need to perform an OAuth flow to obtain a refresh token – see the **Setup** section below.

## Commands
```
google-calendar list [--from <ISO> --to <ISO> --max <N>]
google-calendar add   --title <title> [--start <ISO> --end <ISO>]
                     [--desc <description> --location <loc> --attendees <email1,email2>]
google-calendar update --event-id <id> [--title <title> ... other fields]
google-calendar delete --event-id <id>
```
All commands return a JSON payload printed to stdout. Errors are printed to stderr and cause a non‑zero exit code.

## Setup
1. **Create a Google Cloud project** and enable the *Google Calendar API*.
2. **Create OAuth credentials** (type *Desktop app*). Note the `client_id` and `client_secret`.
3. Run the helper script to obtain a refresh token:
   ```bash
   GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… python3 -m google_calendar.auth
   ```
   It will open a browser (or print a URL you can open elsewhere) and ask you to grant access. After you approve, copy the `refresh_token` it prints.
4. Store the credentials securely:
   ```bash
   openclaw secret set GOOGLE_CLIENT_ID <value>
   openclaw secret set GOOGLE_CLIENT_SECRET <value>
   openclaw secret set GOOGLE_REFRESH_TOKEN <value>
   openclaw secret set GOOGLE_CALENDAR_ID primary   # optional
   ```
5. Install the required Python packages (once):
   ```bash
   pip install --user google-auth google-auth-oauthlib google-api-python-client
   ```

## How it works (brief)
The script loads the credentials from the environment, refreshes the access token using the refresh token, builds a `service = build('calendar', 'v3', credentials=creds)`, and then calls the appropriate API method.

## References
- Google Calendar API reference: https://developers.google.com/calendar/api/v3/reference
- OAuth 2.0 for installed apps: https://developers.google.com/identity/protocols/oauth2/native-app

---

**Note:** This skill does not require a GUI; it works entirely via HTTP calls, so it is suitable for headless servers.
