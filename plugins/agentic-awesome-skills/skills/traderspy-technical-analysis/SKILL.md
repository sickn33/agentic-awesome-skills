---
name: traderspy-technical-analysis
description: "Read one crypto futures pair with TraderSpy: 19 indicators on up to 3 timeframes in one call, key levels, funding, open interest and positioning. Use for \"analyse BTC\" or \"is SOL oversold\"."
category: finance
risk: safe
source: "https://github.com/target1m/traderspy-mcp/tree/069aae5a84640d671f92705a2e3bc0b62efca1e0/skills/technical-analysis"
source_repo: target1m/traderspy-mcp
source_type: official
date_added: "2026-09-25"
author: target1m
tags: [traderspy, crypto, technical-analysis, indicators, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/traderspy-mcp/blob/069aae5a84640d671f92705a2e3bc0b62efca1e0/LICENSE"
---

# TraderSpy Technical Analysis

One good read of a chart is three things in order: where price is in its structure (trend and
levels), what momentum and volatility are doing, and how the derivatives market is positioned
around it. TraderSpy gives all three in at most two calls. Spend the calls well — the user's quota
is finite — and quote the numbers, not adjectives.

## When to Use

- Use when the user asks about a coin's chart, trend, momentum, support and resistance, or where a level such as the 200 EMA sits.
- Use for "analyse BTC", "how does SOL look", "is X overbought / oversold", "what do the indicators say" or "is this a good entry", even when the user only names a coin.
- Use when the question is whether funding is high or open interest is building, or when the user wants price or candle data.
- For scanning many coins by conditions use `@traderspy-market-screener`; for whale positions use `@traderspy-smart-money`.

## Tools

| Tool | Use it for | Key arguments |
| --- | --- | --- |
| `get_technical_indicators` | The chart read | `symbol`, `intervals` (≤ 3) or `interval`, `indicators` (≤ 19), `periods`, `history` 0–20 |
| `get_derivatives` | Funding, open interest, positioning | `symbols` (≤ 5 Binance USDⓈ-M perps; bare `BTC` is fine) |
| `get_price` | Live price, 24h high/low/volume/change | `symbols` (≤ 20) |
| `get_candles` | Raw OHLCV | `symbol`, `interval` 1m/5m/15m/1h/4h/1d, `limit` ≤ 500 |
| `get_tracked_symbols` | Coverage check | none — only when a symbol returns no data |

Symbols are Binance Futures names: `BTCUSDT`, `SOLUSDT`, `1000PEPEUSDT` (1000x-prefixed small
caps), and tokenized equities/ETFs such as `AAPLUSDT` or `SPYUSDT`. Append `USDT` to a bare coin.
Hyperliquid-only perps (e.g. HYPE) are tracked under the same naming.

## Making the call count

- **Multi-timeframe is one quota unit.** For any "how does X look" question pass
  `intervals: ["1h","4h","1d"]` (or `["15m","1h","4h"]` for an intraday user) and get a
  `confluence` verdict — never three separate calls.
- **Pick indicators for the question.** Default `rsi, macd, ema, bollinger` covers momentum and
  trend. Add `levels` + `pivots` whenever the user cares about entries, targets or "where is
  support"; `atr` for stop distance and volatility; `adx` for trend strength; `supertrend` for a
  clean trend state; `obv` / `mfi` when volume confirmation matters; `ichimoku` / `keltner` only
  when asked. Eight to ten well-chosen indicators is a full read; all 19 is noise.
- **`periods`** lets you honour the user's settings (`{"ema":[9,21,55,200],"rsi":7}`); an unknown
  key is rejected, so use the documented names only.
- **Add `get_derivatives`** when the question involves "why is it moving", crowding, funding,
  open interest, leverage, liquidations, or when the user is about to lean on a directional call —
  candles cannot see positioning.
- `get_candles` is for when the user wants the data itself (to chart, export or compute something
  custom). Do not fetch candles to eyeball indicators the technicals tool already computes.

## Reading the response

**Shape.** One timeframe → top-level `indicators` + `summary`. Several → `timeframes[]` (each
with `interval`, `price`, `candles`, `indicators`, `summary`) plus `confluence` `{ aligned, bias,
byInterval }`; the top-level `interval`/`price` then name the first timeframe only. `settings`
echoes what was computed; `warnings[]` lists anything that was thinned or missing.

**Every indicator** carries `value`, `previous`, `direction` (rising / falling / flat) and a short
`series` (oldest → newest), plus its own fields — `zone` on RSI/Stochastic/CCI/MFI/Williams,
`crossover` on MACD/Stochastic, `stack`/`pricePosition` on EMA, `±DI` and `strength` on ADX,
`trend`/`flipped`/`barsSinceFlip` on SuperTrend, `divergence` on RSI/MACD/OBV. `{ value: null,
reason: "insufficient_data" }` means the tape is too short for that period — say so, do not
substitute.

**`summary` is the spine of the read.** `bias` (bullish / bearish / neutral) is computed from a
FIXED set (RSI 14, MACD, EMA 20/50/200, ADX 14, ATR 14, BB 20/2, volume 20) regardless of what
you requested, so it is comparable between calls; `score` is its internal vote (|score| ≥ 30 sets
a bias). `trend` (direction, strength, emaStack, priceVsEma200), `momentum` (rsiZone, macdState),
`volatility` (atrPct, atrPercentile 0–100, squeeze, state), `volume.ratioVsAverage`, `patterns[]`
(candlestick finders on the last two bars) and `notes[]` — plain-language sentences written to be
quoted. Build the answer from the notes, then add the numbers.

**`levels`** (nearest three per side from swing highs/lows over 300 bars): `price`, `touches`,
`distancePct`; `range.positionPct` (0 = at the low of the lookback, 100 = at the high);
`fibonacci` (the dominant leg with `retracedPct` and the nearest level above/below);
`volumeProfile` (`poc`, value area, `pricePosition`). **`pivots`** are classic floor pivots from
the previous DAILY candle whatever the timeframe. Together they give you a levels table; distance
in % is what a user can act on.

**`confluence.aligned`** is true only when every timeframe with data agrees on a non-neutral bias.
"Aligned bearish on 1h/4h/1d" is a strong statement; "4h bullish, 1d neutral" is a pullback
question. Say which.

**Derivatives** (`get_derivatives`): `funding.label` — `extreme_longs_paying` / `longs_paying` /
`neutral` / `shorts_paying` / `extreme_shorts_paying` (longs pay at ≥ +0.03% per 8h, extreme at
≥ +0.10%; shorts pay at ≤ −0.01%, extreme at ≤ −0.05%; Binance's baseline is +0.01%; quote
`annualizedPct`); `openInterest.regime` — `new_longs` / `short_covering` / `new_shorts` /
`long_liquidation` / `flat` (needs ≥ 1% OI and ≥ 0.5% price change over 24h);
`positioning.label` — `long_heavy` (long/short ratio ≥ 1.5, i.e. ≥ 60% long) / `balanced` /
`short_heavy` (≤ 0.67, i.e. ≤ 40% long), read from the top-trader POSITION ratio first;
`takerBuySellRatio` is the last hour's aggressor flow. Data is at most 60 s old. `notes[]` are
quotable. Details in `references/derivatives-guide.md`.

## Presenting

For a single-coin read ALWAYS use this order, and keep it to what the user asked:

1. **Price line** — symbol, price, time of the read, 24h change if you fetched it.
2. **Per timeframe, one line each** — bias, trend (EMA stack and ADX), momentum (RSI zone, MACD
   state), volatility (ATR %, squeeze), with the key number after each label.
3. **Confluence** — aligned or not, and what the disagreement means.
4. **Levels table** — nearest support and resistance with distance %, the pivot, the nearest
   Fibonacci level, the value-area edge if price is near it.
5. **Derivatives line** (if fetched) — funding label + annualized, OI regime, top-trader long %.
6. **What would change the read** — the one or two levels or readings that flip the picture
   (e.g. "a 4h close above 79,325 resistance with OI rising would turn the 4h bias bullish").
7. One plain sentence: crypto derivatives are high-risk; this is market information, not advice.

Use `RSI(14) 41.3 — neutral, falling` style labelling so the period and the direction are always
visible. Percentages to one decimal; prices to the precision the tool returned.

## Conduct

- Describe the chart; do not prescribe the trade. If the user asks "is this a good entry", answer
  with what supports the entry, what argues against it, where the invalidation sits, and hand the
  decision back. Never tell the user to buy, sell, size or leverage.
- Indicators describe the past bars they were computed on; do not present a bias as a forecast or
  imply any outcome is assured.
- Nothing in this connector trades — no order, close, transfer or withdrawal tool exists, by
  design. If asked to execute, say so plainly; the decision and the trade stay with the user.
- Quote only what the tools returned. If an indicator is `insufficient_data` or a symbol is not
  tracked, say so instead of estimating.
- When the answer is about a specific trade idea, end with one plain sentence that crypto
  derivatives are high-risk and this is market information, not financial advice — once per
  answer.

Per-indicator fields and conventional readings: `references/indicator-guide.md`.

## Examples

```text
Analyse BTC on the 1h, 4h and 1d with funding and open interest.
Is SOL overbought? Where are the nearest support and resistance levels?
Where is the 200 EMA on ETH, and is funding stretched?
```

## Limitations

- Needs the hosted TraderSpy MCP server connected in the client (`https://mcp.traderspy.app/mcp`, Streamable HTTP), authorized with OAuth or a personal key from https://traderspy.app/mcp. A free TraderSpy account is enough. Without the server the skill has no data to work from.
- Tool calls are metered per day: 300 on the free tier, 5,000 on premium.
- Every tool is read-only. Nothing here places, closes or modifies an order, and there is no withdrawal or transfer tool.
- The output is market data and analysis for the user's own research, not investment advice.
- A multi-timeframe read is one tool call; adding derivatives makes it two.
- Symbols use Binance Futures naming (`BTCUSDT`, `1000PEPEUSDT`). `get_derivatives` covers Binance USDⓈ-M perpetuals, up to five per call.

## Related Skills

- `@traderspy-market-screener` - many coins at once, and backtests of a condition
- `@traderspy-smart-money` - what tracked top traders hold
- `@traderspy-position-check` - the same read applied to an open position
