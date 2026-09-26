---
name: traderspy-smart-money
description: "Track what top crypto futures traders hold on Binance, Hyperliquid, Bybit and OKX with TraderSpy: elite leaderboard, positions, trader profiles and history. Use for \"what are whales doing\"."
category: finance
risk: safe
source: "https://github.com/target1m/traderspy-mcp/tree/069aae5a84640d671f92705a2e3bc0b62efca1e0/skills/smart-money"
source_repo: target1m/traderspy-mcp
source_type: official
date_added: "2026-09-25"
author: target1m
tags: [traderspy, crypto, smart-money, whale-tracking, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/traderspy-mcp/blob/069aae5a84640d671f92705a2e3bc0b62efca1e0/LICENSE"
---

# TraderSpy Smart Money

TraderSpy follows thousands of top-ranked accounts on four exchanges and records their positions as
they open, change and close. This skill turns that feed into answers about positioning and about
individual traders. Positions are observations of what other people did with their own money —
present them as evidence, never as instructions.

## When to Use

- Use when the user asks what whales or top traders are buying, shorting or holding, or whether big accounts are long or short a coin.
- Use when the user asks who ranks highest on an exchange or across exchanges, or wants to research one trader's record and open positions.
- Use for "smart money", "whale watch" or "what are the pros doing".
- Not for funding rate, open interest or long/short ratios of the whole market (`@traderspy-technical-analysis`), and not for AI signals (`@traderspy-trading-signals`).

## Tools

| Tool | Use it for | Key arguments |
| --- | --- | --- |
| `get_elite_leaderboard` | The cross-exchange top 10 by smart score, with the scoring rationale | none |
| `get_top_traders` | Ranked traders per exchange and window | `source` all / binance / hyperliquid / bybit / okx, `timeRange` 24h / 3D / 7D / 30D, `rankingType` ROI / PNL, `sortBy` ROI / PNL / SCORE, `limit` ≤ 200 |
| `get_positions` | The position feed | `status` open / closed / all, `source`, `symbol`, `limit` ≤ 50, `offset` |
| `get_trader_profile` | One trader: metrics + latest positions | `traderId` AND `source` (see below), `timeRange`, `rankingType` |
| `get_trader_position_history` | One trader's closed trades, paged | `traderId`, `source`, `page`, `limit` ≤ 50 |
| `get_market_stats` | Aggregate counts and PnL across all tracked positions | `source`, `period` 4h / 8h / 24h / 7d |
| `get_exchanges` | Which exchanges are currently tracked | none |

**Always pass `source` with a trader id.** `get_trader_profile` and `get_trader_position_history`
default to Binance; a Hyperliquid address (`0x…`) or an OKX id looked up on the wrong exchange
returns nothing. Take `source` from the row you got the id from.

## Reading the data

**Symbols differ per exchange.** Hyperliquid rows use bare coins (`BTC`, `ZEC`) and prefix
tokenized stocks with `xyz:` (`xyz:AVGO`); Binance, Bybit and OKX rows use `BTCUSDT`. When the
user asks about "BTC positions", pass `symbol: "BTC"` — the filter matches both `BTC` and
`BTCUSDT` exactly — and read the `symbol` field before summing anything. Tokenized stocks
(`xyz:AVGO`) are not reachable through the filter; fetch without `symbol` and pick them out.

**Position rows**: `side` LONG / SHORT, `size` in coins, `entryPrice`, `markPrice`, `leverage`,
`unrealizedPnl` (open rows) or `pnl` + `roi` (closed rows), `openTime` / `closeTime`, `isOpen`,
`lastEvent` (`increase`, `partial_close`, or null when the last change was the open itself). Notional ≈ `size × markPrice`; use
notional, not row count, when you say "whales are net long".

**Freshness.** Binance and Bybit snapshots refresh every 5–15 minutes, Hyperliquid every 15 minutes
plus live fills, OKX every 10–60 minutes. On a free-tier key the feed is delayed 15 minutes — if
`get_positions` returns nothing newer than that, say the feed is delayed rather than "no activity".

**Leaderboard rows** (`get_top_traders`) carry the exchange's own ranking snapshot: `roi`, `pnl`,
`assets` (account size), `winRate` (null on Hyperliquid — the exchange does not publish it),
`rankings[]` with the same trader across every window, and `smartScore` when TraderSpy has scored
them. `traderName` is a shortened address when the account has no public name. A trader who is
#1 on 30-day ROI with `assets` of $5k is a different animal from #19 with $3.4M — quote both.

**Smart score** (`get_elite_leaderboard`, 0–100, recomputed daily): realized PnL 30% (all-time
blended with the last 30 days), effective win rate 22%, ROI edge 18%, consistency 14%, longevity
10%, trade depth 6%, plus a recency bonus (up to +9) and a staleness penalty (down to −12 after
about three weeks idle). `scoreBreakdown` shows each part, `rationale[]` is a ready-made
plain-language justification, `metrics` has the raw counts (`closedTrades`, `profitFactor`,
`realizedPnl30d`, `openPositionCount`, `worstDayPnl`). `reliabilityMultiplier` below 1 means a
short history dragged the score down — say so when a 6-day-old account ranks top-5.

**Market stats** aggregate every tracked position, thousands of them, so `realizedPnl` can be a
large negative number even when the leaders are winning; the tracked universe includes traders
who fell off the leaderboard. Use it for counts and the exchange split, not as "smart money is
losing".

## Workflows

**"What are whales doing in SOL?"** → `get_positions` with `symbol`, `status: open`, `limit` 50.
Sum notional by side, name the largest two or three accounts with entry and leverage, and note
how recent the newest entries are. If open rows are few, add `status: closed` for the last day to
show whether they have been exiting.

**"Who are the best traders right now?"** → `get_elite_leaderboard` first (it is cross-exchange
and score-based), then `get_top_traders` for a specific exchange or window if the user wants raw
ROI/PnL. Explain that 7-day ROI rankings reward one lucky week; the smart score is built to
penalise exactly that.

**"Should I copy trader X?" / "Research this trader"** → `get_trader_profile` + one or two pages of
`get_trader_position_history`. From the history compute what the user actually needs: win rate
from closed rows, typical hold time (`closeTime − openTime`), typical leverage, how concentrated
in one coin, worst single trade, and whether the recent month looks like the all-time record.
Present it as a profile. Copying is the user's decision — this connector cannot follow anyone.

**"Are the pros long or short?" (whole market)** → `get_positions` `status: open` on the majors
plus `get_market_stats`; for exchange-wide long/short ratios of ALL accounts use
`get_derivatives` from technical-analysis instead, which answers that directly.

## Presenting

Positions: one row per position —

| Trader | Exchange | Side | Size (notional) | Entry | Mark | Lev | uPnL | Opened |

Traders: name, exchange, score or rank, window, ROI, PnL, account size, win rate (or "n/a" on
Hyperliquid), then the two-line rationale. Lead with the number that answers the question, keep
addresses shortened as returned, and always say which window a ROI belongs to.

## Conduct

- Positions are what other traders did, with their capital, their hedges and their exits, which
  you cannot see in full. Present them as evidence about positioning, never as a recommendation to
  mirror them; a leader's long can be one leg of a hedge.
- Past ROI and win rates describe a past sample — do not present a leaderboard as a forecast of
  who will win next. Point out short histories and small samples.
- Nothing in this connector trades or copies. There is no order, follow, transfer or withdrawal
  tool, by design. If asked to copy or execute a trade, say so plainly; the decision and the trade stay
  with the user.
- Quote only what the tools returned; say when data is delayed or a field is null.
- When the answer is about a specific trade idea, end with one plain sentence that crypto
  derivatives are high-risk and this is market information, not financial advice.

For exchange-specific quirks and refresh cadences read `references/exchange-notes.md`.

## Examples

```text
What are the top traders long and short right now?
What are whales doing in SOL?
Who is at the top of the Hyperliquid leaderboard right now, and what are they positioned in? Then show me the position history of the top one.
```

## Limitations

- Needs the hosted TraderSpy MCP server connected in the client (`https://mcp.traderspy.app/mcp`, Streamable HTTP), authorized with OAuth or a personal key from https://traderspy.app/mcp. A free TraderSpy account is enough. Without the server the skill has no data to work from.
- Tool calls are metered per day: 300 on the free tier, 5,000 on premium.
- Every tool is read-only. Nothing here places, closes or modifies an order, and there is no withdrawal or transfer tool.
- The output is market data and analysis for the user's own research, not investment advice.
- On a free key, position rows are delayed 15 minutes. Leaderboards, profiles and stats are not delayed.
- It sees only the accounts TraderSpy tracks on Binance, Hyperliquid, Bybit and OKX, not what the same traders hold elsewhere, so a tracked long can be one leg of a hedge.

## Related Skills

- `@traderspy-technical-analysis` (called `technical-analysis` in the text above, its upstream ID) - `get_derivatives` for exchange-wide funding, open interest and long/short ratios
- `@traderspy-trading-signals` - AI signals rather than trader positions
