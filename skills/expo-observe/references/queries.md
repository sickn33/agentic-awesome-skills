# EAS Observe CLI

EAS Observe collects app performance telemetry and custom events from Expo apps and exposes them through five EAS CLI commands. Pass the `--help` flag to any command for the latest API.

## Commands Overview

| Command | Purpose |
|---------|---------|
| `eas observe:metrics-summary` | Per-version statistical aggregates for app-startup performance metrics (median, p90, etc.) |
| `eas observe:metrics` | Individual performance metric samples ordered by value or timestamp (paginated) |
| `eas observe:routes` | Per-route statistical aggregates for navigation metrics (Cold TTR, Warm TTR, Nav TTI) |
| `eas observe:events` | Custom events emitted by the app via `logEvent` — name summary, all events, or filtered by event name (paginated) |
| `eas observe:versions` | App version hierarchy with build numbers, OTA update IDs, and event counts |

All five commands share these common flags:

- `--platform ios` or `--platform android` — filter by platform (default: both)
- `--start <ISO date>` and `--end <ISO date>` — explicit time range
- `--days <N>` — show data from the last N days (mutually exclusive with `--start`/`--end`)
- `--project-id <id>` — run against a specific project without needing a project directory. When passed, the command will not try to create a new EAS project where one is unneeded.
- `--json` — machine-readable output (implies `--non-interactive`)
- `--non-interactive` — fail instead of prompting

Default time range is the last 60 days when none of `--days`, `--start`, `--end` is given.

## Supported Metrics

### App-startup metrics

Used by `observe:metrics-summary` and `observe:metrics`.

| Alias | Full name | Display |
|-------|-----------|---------|
| `tti` | `expo.app_startup.tti` | Startup TTI (time to interactive) |
| `ttr` | `expo.app_startup.ttr` | Startup TTR (time to render) |
| `cold_launch` | `expo.app_startup.cold_launch_time` | Cold Launch |
| `warm_launch` | `expo.app_startup.warm_launch_time` | Warm Launch |
| `bundle_load` | `expo.app_startup.bundle_load_time` | Bundle Load |
| `update_download` | `expo.updates.download_time` | Update Download |

### Navigation metrics

Used by `observe:routes`. Measured per route name.

| Alias | Full name | Display |
|-------|-----------|---------|
| `cold_ttr` | `expo.navigation.cold_ttr` | Nav Cold TTR |
| `warm_ttr` | `expo.navigation.warm_ttr` | Nav Warm TTR |
| `nav_tti` | `expo.navigation.tti` | Nav TTI |

## `eas observe:metrics-summary`

Shows per-version statistical aggregates for one or more metrics, with separate tables per platform.

```bash
# All default metrics, last 60 days, both platforms
eas observe:metrics-summary

# Single metric
eas observe:metrics-summary --metric tti

# Multiple metrics — each renders as its own table
eas observe:metrics-summary --metric tti --metric cold_launch

# Choose which statistics to display
eas observe:metrics-summary --metric tti --stat median --stat p90 --stat eventCount

# Narrow time range and platform
eas observe:metrics-summary --metric tti --days 14 --platform ios
```

**Stat flags:** `min`, `max`, `median` (alias `med`), `average` (alias `avg`), `p80`, `p90`, `p99`, `eventCount` (alias `count`).

**Default stats:** `median` + `eventCount` in the table; all stats in JSON.

**Table layout:**
- One table per metric (with merged value + event count cells, e.g. `0.45s (150)`)
- Each table shows iOS and Android in separate sections
- App Version column includes build numbers in parentheses (e.g. `1.2.0 (42)`)
- Footer row per platform shows total events per metric
- **Update IDs are omitted from the table** to keep output readable when a version has many updates; they are included in the JSON output as an array per version

**JSON output shape:**
```json
{
  "versions": [
    {
      "appVersion": "1.2.0",
      "platform": "IOS",
      "buildNumbers": ["42"],
      "updateIds": ["abc-def-...", "..."],
      "metrics": {
        "expo.app_startup.tti": { "median": 0.45, "p90": 0.9, "...": "..." }
      }
    }
  ],
  "totalEventCounts": {
    "expo.app_startup.tti": { "IOS": 1234, "ANDROID": 890 }
  }
}
```

## `eas observe:metrics`

Shows individual performance metric samples, paginated. The metric is a positional argument, not a flag. If omitted and running interactively, prompts for selection; in non-interactive mode it throws an error.

```bash
# Interactive: prompts for metric
eas observe:metrics

# Specify metric as positional arg
eas observe:metrics tti

# Filter by version or update, sort by slowest
eas observe:metrics tti --app-version 1.2.0 --sort slowest --limit 20

# Pagination — pass the endCursor from the previous run
eas observe:metrics tti --after <cursor>
```

**Sample-specific flags:**
- `--sort <oldest|newest|slowest|fastest>` — defaults to `oldest`
- `--limit <N>` — samples per page (default 10, max 100)
- `--after <cursor>` — pagination cursor from the previous run
- `--app-version <version>` — filter by app version string
- `--update-id <id>` — filter by EAS update ID

**Table layout:**
- Summary header shows the metric name, time range, and total sample count across all versions (e.g. `TTI samples for the last 60 days — 1,234 total events`)
- Columns: Value, App Version (with build number), Update (only when any sample has one), Platform, Device, Country, Timestamp
- When `hasNextPage` is true, prints `Next page: --after <endCursor>` hint below the table
- JSON output also includes `sessionId`, `easClientId`, and a `customParams` object per sample

## `eas observe:routes`

Shows per-route statistical aggregates for navigation metrics (Cold TTR, Warm TTR, Nav TTI), grouped by route name with separate sections per platform.

```bash
# All three navigation metrics, default stats, last 60 days, both platforms
eas observe:routes

# Single metric, last 7 days, iOS only
eas observe:routes --metric nav_tti --days 7 --platform ios

# Multiple metrics and stats
eas observe:routes --metric cold_ttr --metric warm_ttr --stat median --stat p90 --stat count

# Filter to a single build
eas observe:routes --app-version 1.2.0 --build-number 42

# Narrow to specific routes (repeat the flag for multiple routes)
eas observe:routes --route-name /new --route-name /settings

# Pagination — each platform has its own cursor; pass the relevant endCursor
eas observe:routes --after <cursor>
```

**Routes-specific flags:**
- `--metric <cold_ttr|warm_ttr|nav_tti>` — navigation metric(s) to display, can be repeated. Defaults to all three.
- `--stat <median|p90|count>` — statistic(s) per metric. Aliases: `med` → `median`, `event_count` / `eventCount` → `count`.
- `--limit <N>` — routes per page (default **50**, max **200**, different from `metrics`/`events` which default to 10).
- `--after <cursor>` — pagination cursor from the previous run.
- `--app-version <version>` — filter by app version string.
- `--build-number <number>` — filter by app build number (routes-only).
- `--route-name <name>` — filter by route name. Repeatable; only the listed routes are returned across both platforms. Duplicates are de-duplicated; omitting the flag returns all routes.
- `--update-id <id>` — filter by EAS update ID.

**Default stats:** `median` + `count` in the table; `median`, `p90`, `count` in JSON.

**Table layout:**
- Summary header with the chosen stats and time range, e.g. `Med, P90 values (navigation count) for the last 7 days`.
- Separate iOS and Android sections.
- First column is **Route**, followed by one column per metric/stat. With both display stats and `count`, cells are merged like `0.32s (1240)`.
- Each platform has its own pagination hint: `Next page (iOS): --after <endCursor>`.

**JSON output shape:**
```json
{
  "routes": [
    {
      "routeName": "(tabs)/home",
      "platform": "IOS",
      "metrics": {
        "expo.navigation.cold_ttr": { "median": 0.32, "p90": 0.85, "count": 1240 },
        "expo.navigation.tti":       { "median": 0.55, "p90": 1.10, "count": 1240 }
      }
    }
  ],
  "pageInfoByPlatform": {
    "IOS":     { "hasNextPage": true,  "endCursor": "..." },
    "ANDROID": { "hasNextPage": false, "endCursor": null }
  }
}
```

## `eas observe:events`

Shows custom events emitted by the app via the `logEvent` API in `expo-observe`. Behavior depends on what is passed:

| Invocation | Result |
|---|---|
| `observe:events` | Summary table of available event names with counts |
| `observe:events --all-events` | Full list of events across **all** event names |
| `observe:events <event-name>` | Full list of events filtered by that event name |

```bash
# List the available custom event names and their counts (last 60 days)
eas observe:events

# All events across all names, last 7 days, iOS only
eas observe:events --all-events --days 7 --platform ios

# Only events with the given name
eas observe:events login_failed --limit 50

# Drill into a single session
eas observe:events --all-events --session-id <session-id>

# Pagination
eas observe:events login_failed --after <cursor>
```

**Events-specific flags:**
- `--all-events` — when no event name argument is given, list all events instead of the name summary. Cannot be combined with an event name argument.
- `--session-id <id>` — filter to events from a single session (events-only)
- `--app-version <version>` — filter by app version string
- `--update-id <id>` — filter by EAS update ID
- `--limit <N>` — events per page (default 10, max 100)
- `--after <cursor>` — pagination cursor

**Table layout (event listings):**
- Summary header: `<event-name> events <time range>` or `Custom events <time range>` for `--all-events`, with a total event count when available
- Columns: Timestamp, Event (only when listing across multiple names), Severity (only when at least one event in the page has a severity), App Version (with build number), Platform, Device, Country
- `Next page: --after <endCursor>` hint below the table when there is a next page

**Empty-result helper:** if a specific event name is queried and returns no events, the command prints a yellow `No events found matching "<name>"` warning followed by the available event names + counts in the same time range — useful for fixing typos.

**Truncation note:** the event-names summary may flag `Result is truncated; not all event names are shown.` when there are more names than the server returns in a single response.

**JSON output shape (event listing):**
```json
{
  "events": [
    {
      "id": "...",
      "eventName": "login_failed",
      "timestamp": "2026-...",
      "sessionId": "...",
      "severityNumber": 13,
      "severityText": "WARN",
      "properties": [{ "key": "reason", "value": "bad_password", "type": "string" }],
      "appVersion": "1.2.0",
      "appBuildNumber": "42",
      "appUpdateId": null,
      "appEasBuildId": null,
      "deviceModel": "...",
      "deviceOs": "iOS",
      "deviceOsVersion": "17.4",
      "countryCode": "US",
      "environment": "production",
      "easClientId": "..."
    }
  ],
  "pageInfo": { "hasNextPage": true, "endCursor": "..." }
}
```

The name-summary mode returns `{ "names": [{ "eventName": "...", "count": 123 }], "isTruncated": false }`.

## `eas observe:versions`

Shows app version hierarchy with build numbers, OTA update IDs, and event counts per version.

```bash
# Both platforms, last 60 days
eas observe:versions

# iOS only, last 14 days
eas observe:versions --days 14 --platform ios
```

No metric-related flags. Output shows separate iOS and Android tables with columns: **App Version, First Seen, Events, Users, Builds (count), Updates (count)**.

JSON output returns the full nested hierarchy with `buildNumbers[].easBuilds[]` and `updates[].easBuilds[]`, including `firstSeenAt`, `eventCount`, and `uniqueUserCount` at every level.

## Common Workflows

**"What are my app's startup times right now?"**
```bash
eas observe:metrics-summary --days 7 --stat median --stat p90
```

**"Which TTI samples were slowest this week?"**
```bash
eas observe:metrics tti --sort slowest --days 7 --limit 20
```

**"How fast are over-the-air updates downloading in the field?"**
```bash
eas observe:metrics-summary --metric update_download --days 7
```

**"Which screens are slowest to navigate to?"**
```bash
eas observe:routes --metric nav_tti --stat median --stat p90 --days 7
```

**"How does navigation perform on just the routes I care about?"**
```bash
eas observe:routes --route-name /home --route-name /checkout --days 7
```

**"What custom events is my app emitting?"**
```bash
eas observe:events --days 7
```

**"Show me every error event from one user's session."**
```bash
eas observe:events --all-events --session-id <session-id>
```

**"What versions of my app are in the field?"**
```bash
eas observe:versions
```

**"Show me metrics for a specific project without needing to be in the repo"**
```bash
eas observe:metrics-summary --project-id <uuid> --metric tti
```

**"Get JSON for scripting"**
```bash
eas observe:metrics-summary --metric tti --json --non-interactive
```

## Notes

- Requires the user to be logged in (`eas login`).
- When `--project-id` is provided, the command does not require running inside an EAS project directory; otherwise the project ID is read from the local `app.config` / `app.json`. If using this option, ensure that you are logged in as a user that has access to the specified project.
- `observe:metrics-summary` does not print update IDs in the table but still returns them in JSON for scripting or piping into other commands.
