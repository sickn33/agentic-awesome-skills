---
name: footval-stats-and-transfer-news
description: "Football season leaderboards and transfer news from FootVal: top scorers, assists, minutes and appearances per competition, plus confirmed transfers and rumours with reliability."
category: data
risk: safe
source: "https://github.com/target1m/footval-mcp/tree/e852de8dd9b714a8b159e8d349d8f397f8f35870/skills/stats-and-transfer-news"
source_repo: target1m/footval-mcp
source_type: official
date_added: "2026-10-22"
author: target1m
tags: [footval, football, soccer, statistics, transfer-news, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/footval-mcp/blob/e852de8dd9b714a8b159e8d349d8f397f8f35870/LICENSE"
---

# Leaderboards and the transfer wire

Full argument list:
[`references/tools.md`](references/tools.md).

## When to Use

- Use for season leaderboards: top scorers, assist leaders, goals plus assists, minutes and appearances for a league, a European or domestic cup, national-team competitions or all competitions combined.
- Use for transfer news and rumours with fees and reliability ("latest Galatasaray transfer news", "has X signed?").
- Use for "who is the Champions League top scorer" or "most assists in La Liga last season".
- Not for what a player is worth (`@footval-value-and-compare-players`).

## Leaderboards (`get_stat_leaders`)

- `metric`: `goals` (default), `assists`, `contributions` (goals + assists), `minutes`,
  `appearances`.
- `competition`: a code or name — leagues (`GB1`, `ES1`, `IT1`, `L1`, `FR1`, `TR1`…), cups
  (`UCL`, `UEL`, `UECL`, `FAC`…), `NT` for all national-team competitions together, or `all`
  (the default) for every competition combined. A player who moved mid-season counts once.
- `season` is the start year (2025 = 2025/26). Without it you get the latest season with data —
  say which season your answer covers.
- Leaderboards include players outside the leagues FootVal values; such a player simply has no
  valuation to show.

## Transfer news (`get_transfer_news`)

- Narrow with `query` (a player or club name) and `type`: `confirmed`, `rumors` or `all`.
- Every item carries a **reliability**. Report a rumour as a rumour ("reported", "linked with"),
  never as a done deal; only `confirmed` items are completed transfers.
- Fees are as reported. Undisclosed fees and loans stay undisclosed — don't fill the gap with a
  guess.
- The feed covers recent items. If nothing matches, say FootVal has no recent item, not that no
  transfer happened.

After a reported fee, `get_player` shows whether FootVal thinks the price is fair — see the
`value-and-compare-players` skill.

## Examples

```text
Who are the Champions League top scorers this season?
Who had the most assists in La Liga last season?
Any Galatasaray transfer news?
```

## Limitations

- Needs the hosted FootVal MCP server connected in the client (`https://api.footval.com/mcp`, Streamable HTTP), authorized with OAuth (sign in with a Google account) or a personal API key from https://footval.com/en/mcp. Without the server the skill has no data to work from.
- Tool calls are metered per account and day; every account has a free daily allowance.
- Every tool is read-only. Nothing here writes, posts, buys or changes anything.
- The transfer feed covers recent items only; an empty result means FootVal has no recent item, not that no transfer happened.
- Leaderboards include players outside the leagues FootVal values; such a player has no valuation to show.

## Related Skills

- `@footval-value-and-compare-players` (called `value-and-compare-players` in the text above, its upstream ID) - whether a reported fee is fair
- `@footval-follow-matches-and-tables` - scores, fixtures and league tables
