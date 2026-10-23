---
name: footval-value-and-compare-players
description: "Explain what a footballer is worth with FootVal: its own transfer value next to the market value, the factors behind the gap, and comparisons of two to four players."
category: data
risk: safe
source: "https://github.com/target1m/footval-mcp/tree/e852de8dd9b714a8b159e8d349d8f397f8f35870/skills/value-and-compare-players"
source_repo: target1m/footval-mcp
source_type: official
date_added: "2026-10-22"
author: target1m
tags: [footval, football, soccer, player-valuation, transfer-value, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/footval-mcp/blob/e852de8dd9b714a8b159e8d349d8f397f8f35870/LICENSE"
---

# Value a player, then explain the number

Tools: `get_player` (one profile), `compare_players` (2–4 players), and `search_football` only
when a name is ambiguous or partial — `get_player` and `compare_players` take plain names
directly. Full argument list: [`references/tools.md`](references/tools.md).

## When to Use

- Use when the user asks what a footballer is worth, whether a price or fee is fair, or why FootVal's value differs from the market value.
- Use when the user wants two to four players compared on value, age, contract and the valuation factors.
- Use for "is Osimhen overpriced?", "Güler or Wirtz?" or "what is Lamine Yamal worth?".
- Not for scouting lists or rankings (`@footval-scout-and-rank-players`), and not for scores or tables (`@footval-follow-matches-and-tables`).

## Read the two numbers correctly

- **FootVal value** is our estimate; **market value** is the public consensus figure it is
  anchored to. The gap (`deltaPct`) is the point: positive means FootVal sees more than the market
  (the market *undervalues* the player), negative means the market *overvalues* him.
- Inside **±5 %** the verdict is **fair** — say "in line with the market", not "slightly
  undervalued".
- Values are in **euros**. Quote them the way the card does (€85M, €1.2M). Convert only when
  asked, and say that it is a conversion.
- It is an estimate, not a price tag and not a forecast of a fee — clubs pay what a negotiation
  produces. Never present it as betting or investment advice.

## Explain the gap with the factors

Each factor multiplies the value: above ×1.00 pushes it up, below pulls it down. Explain the two
or three that move most, in plain words:

- **performance** — output against price inside the player's position and league-strength
  cohort. Performing above his price lifts the value; below it, discounts it. With few minutes
  the effect is deliberately scaled down.
- **potential** — the age curve around each position's prime (forwards 25, midfielders 26,
  defenders 27, goalkeepers 29): younger and performing earns a development premium; past the
  prime, a discount.
- **contract** — close to expiry the selling club loses leverage (a soft Bosman discount).
- **durability** — injuries and availability over the last two seasons.
- **reputation** — international caps and trophies; a small band.
- **form** — the latest season against the previous one, capped at ±15 %.

When a player has little or no recent data, FootVal keeps the value close to the market. Say so
instead of inventing reasons for a gap that isn't there.

## Comparing

`compare_players` puts 2–4 players on one card. Lead with the value-for-money story — value
against market, age, contract — rather than reading every row aloud. If a name can't be resolved
the tool says which; offer the `search_football` matches for that one.

## Follow-ups that work

- "Who is similar?" → the `similar` list in the `get_player` result.
- "Is he cheaper than X?" → `compare_players`.
- "Who in his league is undervalued?" → the `scout-and-rank-players` skill.

## Examples

```text
What is Lamine Yamal really worth, and why?
Is Victor Osimhen overpriced?
Compare Arda Güler, Florian Wirtz and Jamal Musiala.
```

## Limitations

- Needs the hosted FootVal MCP server connected in the client (`https://api.footval.com/mcp`, Streamable HTTP), authorized with OAuth (sign in with a Google account) or a personal API key from https://footval.com/en/mcp. Without the server the skill has no data to work from.
- Tool calls are metered per account and day; every account has a free daily allowance.
- Every tool is read-only. Nothing here writes, posts, buys or changes anything.
- FootVal values the players of the leagues it covers (Europe's top divisions, MLS and the Saudi Pro League); a player elsewhere has no FootVal value.
- A value is a model estimate anchored to the market value, not an offer, a fee forecast, or betting or investment advice.

## Related Skills

- `@footval-scout-and-rank-players` (called `scout-and-rank-players` in the text above, its upstream ID) - shortlists, rankings and squads
- `@footval-stats-and-transfer-news` - season leaderboards and transfer news with reported fees
