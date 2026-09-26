---
name: traderspy-market-screener
description: "Scan the most-traded crypto futures pairs for up to 3 technical conditions in one TraderSpy call, compare coins, and backtest what followed a condition. Use for \"which coins are oversold\"."
category: finance
risk: safe
source: "https://github.com/target1m/traderspy-mcp/tree/069aae5a84640d671f92705a2e3bc0b62efca1e0/skills/market-screener"
source_repo: target1m/traderspy-mcp
source_type: official
date_added: "2026-09-25"
author: target1m
tags: [traderspy, crypto, screener, backtesting, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/traderspy-mcp/blob/069aae5a84640d671f92705a2e3bc0b62efca1e0/LICENSE"
---

# TraderSpy Market Screener

Two tools, one vocabulary. `screen_symbols` evaluates up to three AND-ed conditions across the
most-traded pairs (or a list you give it) on one timeframe, in ONE quota unit. `backtest_condition`
takes the same conditions, one symbol and one timeframe, and reports what price did after every
past occurrence — with the unconditional baseline so the edge is separated from the tape's drift.

Together they answer the two questions traders actually ask: "what fits this pattern right now?"
and "has this pattern meant anything before?"

## When to Use

- Use when the user wants to find, filter, rank or compare several coins by technical conditions: "which coins are oversold on the 4h", "what is above its 200 EMA with rising volume", "show me Bollinger squeezes", "find me setups".
- Use for side-by-side comparison tables such as "compare BTC, ETH and SOL".
- Use when the user asks what happened after a condition in the past: "how did ETH do after RSI dropped below 30", "is a golden cross on BTC daily actually bullish".
- Never answer these by calling `get_technical_indicators` coin by coin. For a deep read of one coin use `@traderspy-technical-analysis`.

## The condition vocabulary

A condition is `{ metric, op, value, period?, period2? }`. `op` is `lt` / `gt` (latest value) or
`crossAbove` / `crossBelow` (a one-bar event: the previous bar was on the other side).

| Metric | Default period | Unit / meaning |
| --- | --- | --- |
| `rsi` | 14 | 0–100 |
| `stochastic` | 14, %D 3 | slow %K, 0–100 |
| `cci` | 20 | Commodity Channel Index (±100 typical bands) |
| `mfi` | 14 | 0–100, volume-weighted RSI |
| `williamsR` | 14 | −100…0 (−80 oversold, −20 overbought) |
| `adx` | 14 | trend strength; > 25 strong, < 20 absent |
| `roc` | 12 | rate of change, % |
| `macdHistogram` | 12, 26 (signal 9) | histogram in price units; `crossAbove 0` = bullish MACD cross |
| `atrPct` | 14 | ATR as % of price — volatility |
| `volumeRatio` | 20 | bar volume ÷ average of the previous N bars |
| `bbPercentB` | 20 (2σ) | 0 = lower band, 1 = upper band; < 0 or > 1 = outside |
| `bbWidthPct` | 20 | band width as % of the middle — small = squeeze |
| `priceVsEma` | 50 | % distance of close from EMA(period); > 0 above |
| `emaSpread` | 50, 200 | % of EMA(period) over EMA(period2); `crossAbove 0` = golden cross |
| `supertrend` | 10 (×3) | +1 up-trend, −1 down-trend |
| `changePct` | 24 | % change of close over the last N BARS (on 1h, 24 = one day) |
| `price` | — | close |

Periods clamp to 2–200. Conditions are AND-ed; there is no OR — run two scans for an OR and merge.
Unknown metrics are rejected, so stick to the table (the full recipe list is in
`references/condition-cookbook.md`).

## Screening (`screen_symbols`)

Arguments: `interval` (default 4h), `conditions` (≤ 3), `universe` (5–100 most-traded by 24h
volume, default 50) OR `symbols` (≤ 100, explicit), `limit` (≤ 50 rows), `sortBy` volume /
change24h / metric, `sortOrder`.

Choose the timeframe from the user's horizon: intraday → `1h` (or `15m`), swing → `4h`, position →
`1d`. Widen `universe` to 100 when the user wants small caps or the first scan matched little.

Every result row carries the metric values under their labels (`values["RSI(14)"]`), plus `price`,
`change24hPct`, `volume24hUsd`, `bias`, `trend`, `rsi14`, `adx14`, `atrPct`, `volumeRatio`,
`squeeze`. When `matched` > `returned`, say so and offer to raise `limit`.

**Comparison mode**: `symbols` with no `conditions` returns every listed symbol as a table — this is
how you answer "compare BTC, ETH and SOL" or "how do my five coins look on the daily".

**Translate intent to conditions before calling**, and say what you translated it to:

- "oversold" → `rsi lt 30` (or 35 for a wider net); "deeply oversold" add `bbPercentB lt 0`
- "overbought" → `rsi gt 70`
- "in an uptrend" → `priceVsEma gt 0 period 200` + `supertrend gt 0`
- "with rising volume" → `volumeRatio gt 1.5`
- "squeezing" → `bbWidthPct lt 4` on 4h (lower on 1h) — then sort by metric ascending
- "dumped today" → `changePct lt -5 period 24` on 1h, or `period 6` on 4h
- "golden cross" → `emaSpread crossAbove 0 period 50 period2 200` on 1d

## Backtesting (`backtest_condition`)

Arguments: `symbol`, `interval`, `conditions` (same vocabulary), `horizons` in bars (≤ 4; defaults
≈ 4h / 1d / 3d: 1h → [4, 24, 72], 4h → [6, 18, 42], 1d → [1, 3, 7]).

The study runs over the whole stored tape — up to 1000 candles, so roughly 41 days on 1h, 166
days on 4h, 3 years on 1d. An "occurrence" is the FIRST bar of each run where the condition held
(ten consecutive oversold bars are one episode). For each horizon you get `samples`,
`avgReturnPct`, `medianReturnPct`, `winRatePct`, `avgMaxUpPct` / `avgMaxDownPct` (average best and
worst excursion, wick-accurate), `bestPct` / `worstPct`, `baselineAvgReturnPct` (every bar on the
same tape) and `edgePct` = average − baseline. Also `activeNow`, `currentValues`, `lastOccurrence`,
and `recent[]` with the last five episodes and their realised returns.

How to read it honestly:

- **Edge and sample size travel together.** `edgePct +1.8 on 27 samples` is a statement;
  `+6 on 4 samples` is an anecdote, and the tool says so in `warnings`. Never quote the edge alone.
- **Median vs average**: a positive average with a negative median means a few big winners carried
  it. Say which.
- **Excursions are the risk picture**: `avgMaxDownPct −5.1` on a "bullish" setup means the average
  episode went 5% against you before the horizon ended. That belongs next to the win rate.
- **Horizons that disagree** (positive at 1d, negative at 3d) usually mean a bounce that fades —
  report the shape, do not pick the flattering horizon.
- Recent episodes newer than a horizon are excluded from that horizon (`null` in `recent`), never
  counted as zero.
- Coverage limits what the study can see: 41 days of 1h data contains one market regime. A 1d
  study is the only one that spans cycles.

## Workflows

**"What's oversold right now?"** → one `screen_symbols`. Present the table, then (optional, one more
call) `backtest_condition` the same condition on the top match so the answer carries "and here is
what that has meant on this coin before".

**"Find me setups" / "watchlist"** → decide the archetype with the user in one line (mean-reversion
vs trend-continuation vs breakout), run one scan per archetype (2–3 calls), and present each list
with the conditions it was built from. Do not promise an outcome for any row.

**"Is X actually bullish?"** → one `backtest_condition` on the coin and timeframe in question;
if the user names no coin, BTC on 1d is the most meaningful default and say why (longest tape).

**"Compare A, B, C"** → `screen_symbols` with `symbols`, no conditions, on the timeframe they care
about. Add `get_derivatives` (technical-analysis) only if the question includes funding or
positioning.

## Presenting

Screen: state the conditions in words and in the tool's labels, the timeframe, and the universe
("50 most-traded pairs"), then one row per symbol:

| Symbol | Price | 24h % | <metric labels…> | Bias | Trend | ADX | ATR% |

Backtest: one header line (symbol, timeframe, condition, occurrences, coverage), a horizon table —

| Horizon | Samples | Avg % | Median % | Win % | Avg best % | Avg worst % | Baseline % | Edge % |

— then the last episodes and whether the condition is active now. Close with the sample-size
caveat in your own words.

## Conduct

- A screen is a list of things that are true about the chart right now; a backtest is a sample of
  what followed in the past. Neither is a recommendation. Present the evidence, note what would
  invalidate the setup, and leave the trade — and the sizing — to the user.
- Never turn "70% win rate on 12 samples" into a forecast; historical stats describe their sample.
- Nothing in this connector trades — no order, close, transfer or withdrawal tool exists by design.
  If asked to execute, say so plainly; the decision and the trade stay with the user.
- Quote only what the tools returned; when a symbol is missing from the universe say it was not
  scanned rather than implying it failed the filter.
- When a specific trade idea is under discussion, end with one plain sentence that crypto
  derivatives are high-risk and this is market information, not financial advice.

## Examples

```text
Which coins are oversold on the 4h?
Run the screener: RSI under 30 and ADX above 25 on the 4h, top 100 by volume.
Compare BTC, ETH and SOL on the daily.
Historically, what happened on SOLUSDT 4h after RSI crossed above 30? Compare it against the baseline over the same tape.
```

## Limitations

- Needs the hosted TraderSpy MCP server connected in the client (`https://mcp.traderspy.app/mcp`, Streamable HTTP), authorized with OAuth or a personal key from https://traderspy.app/mcp. A free TraderSpy account is enough. Without the server the skill has no data to work from.
- Tool calls are metered per day: 300 on the free tier, 5,000 on premium.
- Every tool is read-only. Nothing here places, closes or modifies an order, and there is no withdrawal or transfer tool.
- The output is market data and analysis for the user's own research, not investment advice.
- Conditions are AND-ed, at most three per scan, from the fixed metric list above. An OR needs two scans.
- A scan covers up to the 100 most-traded pairs or an explicit list of up to 100 symbols. A backtest sees at most 1000 stored candles, about 41 days on 1h.

## Related Skills

- `@traderspy-technical-analysis` (called `technical-analysis` in the text above, its upstream ID) - one coin in depth, and `get_derivatives` for funding and positioning
- `@traderspy-market-briefing` - a market overview that includes a movers scan
