---
name: traderspy-market-briefing
description: "Crypto market briefing from live TraderSpy data: majors, funding, open interest, top-trader lean, fresh AI signals and screener movers. Use for \"what's happening in crypto\" or a recap."
category: finance
risk: safe
source: "https://github.com/target1m/traderspy-mcp/tree/069aae5a84640d671f92705a2e3bc0b62efca1e0/skills/market-briefing"
source_repo: target1m/traderspy-mcp
source_type: official
date_added: "2026-09-25"
author: target1m
tags: [traderspy, crypto, market-briefing, derivatives, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/traderspy-mcp/blob/069aae5a84640d671f92705a2e3bc0b62efca1e0/LICENSE"
---

# TraderSpy Market Briefing

A briefing is a fixed set of questions answered with fresh numbers, in an order a trader can scan
in thirty seconds: where are the majors, how is the market positioned, what is the signal engine
seeing, what stands out on the screener. The value is in the selection and the brevity, not in the
volume of data — every tool call costs the user quota, so the playbook below is deliberately
tight.

## When to Use

- Use when the user asks "what's happening in crypto", for a market update or a morning brief, "how's the market today", "anything interesting right now", an overview or a weekly recap.
- Use when a conversation opens with a vague question about the crypto market, even a casual one.
- Do not use for a deep dive on one coin (`@traderspy-technical-analysis`), one trader (`@traderspy-smart-money`) or one signal (`@traderspy-trading-signals`).

## The playbook (6 calls, all read-only)

1. **Majors** — `get_price` with `["BTCUSDT","ETHUSDT","SOLUSDT"]` plus any coins the user has
   mentioned in the conversation (≤ 20 per call). Price, 24h change, 24h range.
2. **Positioning** — `get_derivatives` with `["BTC","ETH","SOL"]` (add up to two of the user's
   coins). Funding label and annualized rate, open-interest change and regime, top-trader long
   share, taker flow. The `notes[]` are written to be quoted.
3. **Movers** — `screen_symbols` with no conditions, `sortBy: "change24h"`, `limit: 50`, `universe:
   50`, `interval: "4h"`. One call returns all 50 most-traded pairs sorted by 24h change: the top
   five are the gainers, the last five the losers.
4. **What is stretched** — `screen_symbols` with `[{"metric":"rsi","op":"lt","value":30}]` on 4h,
   `limit: 5`. If it returns nothing, flip to `rsi gt 70` — one of the two usually has names.
5. **Signal engine** — `get_signal_stats` with `period: "24h"` (or `7d` for a weekly recap).
6. **Freshest ideas** — `get_signals` with `limit: 5`.

Smart-money lean is already in step 2 (`positioning.topTraderLongPct`); add `get_positions`
(`status: open`, `limit: 20`) only when the user asks who specifically is positioned how.

**Quota-aware variants.** If the user is on a free key or asks for "just the headline", run steps
1, 2 and 5 only (three calls) and say what you skipped. For a weekly recap use `7d` in step 5 and
`interval: "1d"` in steps 3–4.

If any call fails or returns empty, keep the section with a one-line "unavailable right now" note
rather than dropping it silently — a briefing with a hole is more honest than one that quietly
narrowed.

## Reading the pieces

- **Funding**: near the 0.01%/8h baseline is neutral; clearly positive means longs pay shorts (a
  crowded long is a risk, not a signal); negative means shorts pay. Quote the annualized figure —
  it is the number people feel.
- **Open interest regime** (`openInterest.regime`): `new_longs` (OI up, price up), `short_covering`
  (OI down, price up), `new_shorts` (OI up, price down), `long_liquidation` (OI down, price down),
  `flat`. This is the one line that explains WHY the majors moved.
- **Top-trader long share**: the tool labels `long_heavy` at a long/short ratio ≥ 1.5 (≈ 60%+
  long) and `short_heavy` at ≤ 0.67 (≈ 40% or less); in between call it balanced. Top-trader
  positioning is the more informative one; the all-account ratio shows the crowd.
- **Signal stats**: `winRate` is hits ÷ (hits + stops) on signals created in the window; say
  `total` and `pending` next to it, and treat a 24h window with fewer than ~10 resolved signals as
  a small sample.
- **Movers** are the most-traded pairs by 24h volume sorted by change — a liquid-names list, not
  an all-market list. Say so if a small cap the user follows is missing.

## The briefing format

ALWAYS use this structure, in this order, with real numbers from the calls — no placeholders:

**Crypto brief — <date, UTC time of the calls>**

1. **Headline** — one sentence: the majors' direction and the single most notable positioning fact.
2. **Majors** — a table: Symbol · Price · 24h % · 24h range.
3. **Positioning** — per major, one line: funding (label, annualized), OI regime, top-trader long %,
   and one quoted `note`.
4. **Movers** — top 5 gainers and top 5 losers among the most-traded pairs (symbol, price, 24h %).
5. **Stretched** — the oversold or overbought names with their RSI, or "none on the 4h" if empty.
6. **Signal engine** — `total` signals in the window, hit rate with the resolved count, then the
   five freshest signals as one line each: coin, side, timeframe, preset, status.
7. **What to watch** — two or three bullets derived from the data above (a funding extreme, an OI
   regime worth confirming, a stretched name that is also in a signal). Facts and their
   implications, not instructions.
8. One plain sentence: crypto derivatives are high-risk; this is market information for the user's
   own research, not financial advice.

Keep it under ~350 words. Numbers beat adjectives: "BTC −2.1% to 77,300, funding neutral, OI −2.7%
with price flat" is a briefing; "BTC looks weak" is not.

## Conduct

- A briefing reports the market; it does not tell the user what to do in it. "What to watch" names
  facts and what would confirm or invalidate them — never "buy the dip" or "short this".
- Hit rates and past moves describe their sample; do not extend them into predictions.
- Nothing in this connector trades — no order, close, transfer or withdrawal tool exists, by
  design. If asked to act on the briefing, say so plainly; the decision and the trade stay with the
  user.
- Every number comes from a tool result made in this conversation; state the time of the calls so
  the user knows how fresh the brief is, and never reuse figures from an earlier brief as if they
  were current.

## Examples

```text
Give me a crypto market briefing.
Give me a crypto morning brief: what moved, where funding is stretched, and what the AI signals fired overnight.
Just the headline: where are BTC, ETH and SOL, and how is the market positioned?
Weekly recap of the crypto market.
```

## Limitations

- Needs the hosted TraderSpy MCP server connected in the client (`https://mcp.traderspy.app/mcp`, Streamable HTTP), authorized with OAuth or a personal key from https://traderspy.app/mcp. A free TraderSpy account is enough. Without the server the skill has no data to work from.
- Tool calls are metered per day: 300 on the free tier, 5,000 on premium.
- Every tool is read-only. Nothing here places, closes or modifies an order, and there is no withdrawal or transfer tool.
- The output is market data and analysis for the user's own research, not investment advice.
- A full briefing uses six tool calls; the headline variant uses three.
- The movers and stretched lists cover the most-traded pairs by 24h volume, not every listed coin.

## Related Skills

- `@traderspy-technical-analysis` - one coin in depth
- `@traderspy-market-screener` - the full screener and backtests behind the movers list
- `@traderspy-trading-signals` - one signal in detail
- `@traderspy-smart-money` - who specifically is positioned how
