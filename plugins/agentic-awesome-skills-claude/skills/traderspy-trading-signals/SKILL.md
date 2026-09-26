---
name: traderspy-trading-signals
description: "Fetch and explain TraderSpy's AI crypto futures signals: entry, take-profit ladder, stop, triggers, status against the live price, and how recent signals resolved. Use for \"latest signals\"."
category: finance
risk: safe
source: "https://github.com/target1m/traderspy-mcp/tree/069aae5a84640d671f92705a2e3bc0b62efca1e0/skills/trading-signals"
source_repo: target1m/traderspy-mcp
source_type: official
date_added: "2026-09-25"
author: target1m
tags: [traderspy, crypto, trading-signals, futures, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/traderspy-mcp/blob/069aae5a84640d671f92705a2e3bc0b62efca1e0/LICENSE"
---

# TraderSpy Trading Signals

TraderSpy's AI signals are automated reads of the market: a named preset fires when several
technical conditions line up on one crypto futures pair, a validator scores the alignment, and
the published signal carries an entry, a take-profit ladder, a stop and — later — what actually
happened. The signals feed at https://traderspy.app/signals publishes every one with its resolved
outcome. Your job is to fetch,
translate and contextualise them; the decision stays with the user.

## When to Use

- Use when the user mentions crypto signals, AI alerts, "any setups", "what is the AI seeing", long or short ideas, or TraderSpy alerts, even without the word "signal".
- Use to explain one signal's entry, take-profit and stop levels and the conditions that triggered it, or whether it still stands at the current price.
- Use when the user asks how signals have resolved (hits vs stops) over the last 4h to 7d.
- Not for placing trades (no tool can), not for top-trader positioning (`@traderspy-smart-money`), not for indicator reads on a coin (`@traderspy-technical-analysis`).

## Tools

| Tool | Use it for | Key arguments |
| --- | --- | --- |
| `get_signals` | The list: newest first | `limit` 1–50 (default 20), `skip`, `importance` high / medium / low / all, `coin` |
| `get_signal_details` | One signal in full, plus the live price | `signalId` (the `id` from the list) |
| `get_signal_stats` | Aggregate hit rate over a window | `period` 4h / 8h / 24h / 7d |

Three argument behaviours that are easy to get wrong:

- **`importance` is inclusive downward.** `high` returns high only, `medium` returns high AND
  medium, `low` returns everything. To show "medium and above" pass `medium`, not `low`.
- **`coin` is a prefix match** on the pair name. `BTC` matches `BTCUSDT` and also `BTCDOMUSDT`;
  check the `coin` field of each row before presenting "BTC signals".
- **`limit` is what gets rendered.** In hosts that draw signal cards, every fetched row becomes a
  card. If the user asks for "the last 5", pass `limit: 5` — do not fetch 20 and show 5.

## What a signal row contains

`strategyName` (the preset, e.g. "OBV Divergence Buy (4H)") · `action` buy / sell · `timeframe`
1h / 4h / 1d · `price` at trigger · `targets[]` as `{label, type, pct}` where `pct` is measured from
`price` · `triggeredConditions[]` in plain language · `importance` · `signalStrength` weak /
moderate / strong / very_strong · `resolutionStatus` · `createdAt`.

Convert target percentages to prices before showing them — users think in prices:

- buy: TP = price × (1 + pct/100), SL = price × (1 − pct/100)
- sell: TP = price × (1 − pct/100), SL = price × (1 + pct/100)
- reward-to-risk at TP1 = TP1 pct ÷ SL pct (a 0.7 R:R is normal for this system, whose first target
  sits close to entry; read it together with the hit rate from `get_signal_stats`, and do not call a
  sub-1 R:R "bad" on its own).

`resolutionStatus` is the outcome so far:

| Status | Meaning |
| --- | --- |
| `pending` | Still inside its tracking window, nothing hit yet |
| `tp1_hit` / `tp2_hit` / `tp3_hit` | Highest take-profit reached (a later stop touch does not downgrade it) |
| `profit_locked` | Trend exhaustion detected before TP1; a partial gain was locked |
| `stop` | Stop level touched before any take-profit |
| `expired` | Window ended with neither side touched |

Outcomes are judged on 1-minute wicks, so "TP1 hit" means price actually traded there. The
tracking window is 24 × the signal timeframe (24h for a 1h signal, 4 days for a 4h signal); a 1h
signal that is still `pending` two days later is stale rather than alive.

## Workflows

**"Latest signals" / "any setups?"** → `get_signals` with the limit the user implies (default 10 if
they gave no number). Lead with the newest, group by side if several, and make the resolved ones
visible — a list that mixes three winners, two stops and five pending rows should say so.

**"Signals for SOL"** → `get_signals` with `coin`. If the result is empty, say there is no recent
signal on that pair rather than offering a different pair as if it were the same thing.

**"Is this signal still valid?" / "Should I still care about it?"** → `get_signal_details`, then
compare `livePrice` with the entry, TP1 and SL in the same units:

- distance from entry in % (signed the way the trade wants it: for a buy, positive = in profit)
- whether a level has already been crossed (a `pending` buy with `livePrice` below the SL price
  is finished in everything but paperwork — say so)
- `history.highestPrice` / `lowestPrice` show the best and worst it has seen since entry
- `indicatorValues` are the readings at trigger time, not now; if the user wants the current
  picture, hand off to technical-analysis rather than re-reading stale values as if they were live

**"How are the signals doing?"** → `get_signal_stats`. Explain the number honestly: `winRate` is
hits ÷ (hits + stops) over signals CREATED in the window, so it ignores `pending` rows, and a 4h
window is a handful of signals. Prefer `7d` for a track-record question and say how many signals
it rests on (`total`, `pending`).

## Presenting

For a list, ALWAYS use a compact table and keep one signal per row:

| Coin | Side | TF | Entry | TP1 | SL | Preset | Status | Age |

For one signal, use this order: headline (coin, side, timeframe, preset, importance) → the levels
as prices with the % in brackets → what triggered it (the `triggeredConditions`, lightly
rephrased) → where price is now versus entry / TP1 / SL → the outcome so far → the one-line risk
note. Quote `livePrice` with its timestamp when the answer depends on it.

Do not invent an "AI review" if `aiReview` is null — most signals do not carry one. When it exists,
report `score` and `decision` as the reviewer's opinion, not as a verdict.

## Conduct

- These are indicator alignments with published outcomes, not instructions. Report what the
  signal says, what has happened to it and what has happened to signals like it; if the user asks
  whether to take it, lay out what supports and what undercuts it and hand the decision back. Never
  tell the user to buy, sell, size or leverage.
- Historical hit rates describe the sample they were computed on. Never present a win rate as a
  forecast or imply any outcome is assured.
- Nothing in this connector trades. There is no order, close, transfer or withdrawal tool, by
  design. If asked to execute, say so plainly; the decision and the trade stay with the user.
- Every number comes from a tool result; if a field is null, say it is unavailable rather than
  estimating it.
- When the answer is about a specific trade idea, end with one plain sentence that crypto
  derivatives are high-risk and this is market information, not financial advice. Once per answer
  is enough.

For the full field glossary, including the `indicatorValues` keys, read
`references/signal-fields.md`.

## Examples

```text
Show me the latest AI signals.
Any signals on SOL right now?
Is the latest BTC signal still valid? Show me where price is against its entry, targets and stop.
How have the signals resolved over the last 7 days?
```

## Limitations

- Needs the hosted TraderSpy MCP server connected in the client (`https://mcp.traderspy.app/mcp`, Streamable HTTP), authorized with OAuth or a personal key from https://traderspy.app/mcp. A free TraderSpy account is enough. Without the server the skill has no data to work from.
- Tool calls are metered per day: 300 on the free tier, 5,000 on premium.
- Every tool is read-only. Nothing here places, closes or modifies an order, and there is no withdrawal or transfer tool.
- The output is market data and analysis for the user's own research, not investment advice.
- Covers TraderSpy's own AI signals only. Signal statistics describe signals that already resolved; they are not a forecast.

## Related Skills

- `@traderspy-technical-analysis` (called `technical-analysis` in the text above, its upstream ID) - the current chart read on the signal's coin
- `@traderspy-market-briefing` - the freshest signals inside a market overview
