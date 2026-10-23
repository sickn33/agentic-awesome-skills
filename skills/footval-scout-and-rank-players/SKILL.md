---
name: footval-scout-and-rank-players
description: "Scout and rank footballers with FootVal: shortlists by league, position, age, foot and value; undervalued, overvalued, rising and young players; club, league and national squads."
category: data
risk: safe
source: "https://github.com/target1m/footval-mcp/tree/e852de8dd9b714a8b159e8d349d8f397f8f35870/skills/scout-and-rank-players"
source_repo: target1m/footval-mcp
source_type: official
date_added: "2026-10-22"
author: target1m
tags: [footval, football, soccer, scouting, player-rankings, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/footval-mcp/blob/e852de8dd9b714a8b159e8d349d8f397f8f35870/LICENSE"
---

# Scout, rank, and read squads

## When to Use

- Use for scouting briefs: shortlist players by league, club, national team, position, age, preferred foot and value range.
- Use when the user asks for the most valuable, most undervalued or overvalued players, the biggest risers or fallers, or the best wonderkids.
- Use to open a club squad, a league overview or a nation's strongest squad by value.
- Use for "left-footed centre-backs under 23 in Serie A", "most undervalued players in the Premier League" or "Turkey's strongest squad".
- Not for one player's valuation in depth (`@footval-value-and-compare-players`).

## Which tool

- A brief with attributes → `find_players`.
- A ranking question → `get_rankings` with `type`: `top_value`, `undervalued`, `overvalued`,
  `risers`, `fallers` or `wonderkids`.
- A club → `get_club`. A league overview → `get_league` (for the points table use
  `get_standings`). A nation → `get_national_team`. What is covered → `list_leagues`.

Full argument list:
[`references/tools.md`](references/tools.md).

## Turning a brief into `find_players` filters

- `league`, `club` and `nation` take names or codes ("Serie A" or `IT1`, "Turkey" or `TUR`).
- `position` is a group (`GK`, `DF`, `MF`, `FW`) or an exact role (`CB`, `LB`, `RB`, `DM`, `CM`,
  `AM`, `LM`, `RM`, `LW`, `RW`, `SS`, `ST`). "Full-back" means two calls, `LB` and `RB`; "winger"
  means `LW` and `RW`; "striker" is `ST` (or `FW` for any forward).
- Ages are inclusive: `max_age: 23` is 23 or younger. Values are euros: €30M is `30000000`.
- `sort`: `value` (default), `market_value`, `undervalued`, `overvalued`, `youngest`,
  `performance`, `rising`. "Bargains" means `undervalued`.
- `limit` is at most 25. If a filter set returns nothing, relax one constraint and say which.

## Reading rankings

- `undervalued` and `overvalued` only include players worth **€10M or more** (small values make
  percentages noisy). For cheaper players use `find_players` with `sort: "undervalued"` and a
  `max_value`, and say why.
- `risers` and `fallers` are recent moves in FootVal's own value, not in the market's.
- `wonderkids` are 21 and under.

## National teams

`get_national_team` builds the strongest 26-player squad FootVal can assemble from the players who
represent that nation (3 GK, 8 DF, 8 MF, 7 FW by value). It is **not** the official call-up —
call it "FootVal's strongest squad by value".

## Examples

```text
Find left-footed centre-backs aged 23 or under in Serie A worth less than €30M.
Who are the most undervalued players in the Premier League?
Show me Turkey's strongest squad by value.
```

## Limitations

- Needs the hosted FootVal MCP server connected in the client (`https://api.footval.com/mcp`, Streamable HTTP), authorized with OAuth (sign in with a Google account) or a personal API key from https://footval.com/en/mcp. Without the server the skill has no data to work from.
- Tool calls are metered per account and day; every account has a free daily allowance.
- Every tool is read-only. Nothing here writes, posts, buys or changes anything.
- Rankings and filters cover the leagues FootVal values (Europe's top divisions, MLS and the Saudi Pro League).
- `get_national_team` is FootVal's strongest squad by value, not the official call-up.

## Related Skills

- `@footval-value-and-compare-players` - one player's valuation in depth, and comparisons
- `@footval-follow-matches-and-tables` - the points table (`get_standings`) and a team's fixtures
