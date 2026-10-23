---
name: footval-follow-matches-and-tables
description: "Football scores, fixtures, match centres and league tables through FootVal: live and past results, a team's next or last matches, events, statistics, line-ups and standings."
category: data
risk: safe
source: "https://github.com/target1m/footval-mcp/tree/e852de8dd9b714a8b159e8d349d8f397f8f35870/skills/follow-matches-and-tables"
source_repo: target1m/footval-mcp
source_type: official
date_added: "2026-10-22"
author: target1m
tags: [footval, football, soccer, live-scores, league-tables, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/footval-mcp/blob/e852de8dd9b714a8b159e8d349d8f397f8f35870/LICENSE"
---

# Scores, matches and tables

## When to Use

- Use for live scores, results and fixtures: "what's the score", "who plays tonight", "how did yesterday's Champions League games go".
- Use for one match's event timeline, team statistics and line-ups, or for a team's next or last matches ("when is Galatasaray's next game").
- Use for a league table with form and qualification or relegation zones ("show me the Süper Lig table").
- Not for season leaderboards or transfer news (`@footval-stats-and-transfer-news`).

## Which tool

- Several matches → `get_matches` with `when` = `live`, `today`, `yesterday`, `tomorrow` or a
  `YYYY-MM-DD` date, optionally narrowed by `competition` or `team`.
- One match in depth → `get_match` with a `match_id` from `get_matches` or `get_team_fixtures`.
- One team's schedule → `get_team_fixtures` (`direction`: `next` or `last`, `count` 1–10; set
  `national: true` when a national team shares its name with a club).
- A table → `get_standings` (current season by default; `season` is the start year).

Full argument list:
[`references/tools.md`](references/tools.md).

## Time and dates

- `when` dates are **UTC days**. A late-evening kick-off in the Americas can fall on the next UTC
  day — if a match seems missing, check the adjacent day.
- Kick-off times are UTC timestamps. Convert them to the user's time zone when you know it and
  name the zone you used.

## Live data

- A score is live at the moment of the call. Never extrapolate or invent a score, scorer or
  minute; for an update, call again.
- A match that hasn't started has no events yet, and line-ups only appear shortly before
  kick-off.
- xG and some team statistics are not available for every competition — leave them out rather
  than estimating.

## Tables

- Qualification and relegation zones come with the table, along with each team's recent form.
- Some competitions return more than one table (groups) — present the one the user asked about.

## Examples

```text
What are today's scores?
When is Galatasaray's next game?
Show me the Süper Lig table.
```

## Limitations

- Needs the hosted FootVal MCP server connected in the client (`https://api.footval.com/mcp`, Streamable HTTP), authorized with OAuth (sign in with a Google account) or a personal API key from https://footval.com/en/mcp. Without the server the skill has no data to work from.
- Tool calls are metered per account and day; every account has a free daily allowance.
- Every tool is read-only. Nothing here writes, posts, buys or changes anything.
- Live data covers the competitions FootVal follows; xG and some team statistics are not available for every competition.
- A score is as fresh as the last call; the skill never estimates or extrapolates one.

## Related Skills

- `@footval-stats-and-transfer-news` - season leaderboards (scorers, assists, minutes) and transfer news
- `@footval-value-and-compare-players` - what a player in the match is worth
