---
name: traderspy-position-check
description: "Health-check crypto futures positions the user describes, with TraderSpy data: liquidation and stop distance, multi-timeframe read, funding and top-trader side. Reports only; never tells the user to close or add."
category: finance
risk: safe
source: "https://github.com/target1m/traderspy-mcp/tree/069aae5a84640d671f92705a2e3bc0b62efca1e0/skills/position-check"
source_repo: target1m/traderspy-mcp
source_type: official
date_added: "2026-09-25"
author: target1m
tags: [traderspy, crypto, risk-management, futures, mcp]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/target1m/traderspy-mcp/blob/069aae5a84640d671f92705a2e3bc0b62efca1e0/LICENSE"
---

# TraderSpy Position Check

A position check answers, in order: how much room is left before this position is taken away
(liquidation), how much before the user's own plan says it is wrong (stop), what the chart and
the derivatives market are doing around it, and who else is positioned the same way. Report those
facts with numbers. The decision — hold, trim, close, add — belongs to the person whose money it
is.

## When to Use

- Use when the user asks "how's my position", "am I in trouble", "how far am I from liquidation", "should I hold or close" or "review my trades", or asks what you think of their long or short.
- Use when the user pastes or describes a position, for example "I'm long ETH from 2,400 at 10x".
- The skill reports and explains. It never tells the user to close, add, hedge or move a stop, and it cannot trade.

## Inputs

The position always comes from the user. TraderSpy has no account tool: it cannot read a balance
or an open position on any exchange, so never offer to "check the account".

Ask for whatever is missing among side, entry, leverage (and stop / target / the exchange's
liquidation price if they have them). Size is optional — the analysis works in percentages. The
current price is the `price` that `get_technical_indicators` returns.

Map the symbol to Binance naming for the data tools: `BTC` → `BTCUSDT`, `kPEPE` → `1000PEPEUSDT`,
`xyz:AVGO` → `AVGOUSDT`.

## Calls per position (keep it to what matters)

1. `get_technical_indicators` — `intervals: ["1h","4h","1d"]`, `indicators: ["rsi","macd","ema",
   "atr","adx","supertrend","levels"]`. One call. This gives the trend on three timeframes, ATR
   for stop sanity and the nearest levels.
2. `get_derivatives` — up to five coins in ONE call for all positions at once. Funding is a cost
   or an income for this position; the OI regime says whether the move is being funded.
3. `get_positions` — `symbol`, `status: "open"`, `limit: 20`. Optional; skip on a tight quota.
   Tells you whether tracked top traders are on the same side.

Three positions ≈ 3 + 1 (+3) calls. If the quota is tight, do derivatives for all coins first,
then technicals for the position with the smallest liquidation distance.

## The math (show it, briefly)

- P&L % on margin = (mark − entry) / entry × leverage, sign-flipped for shorts; P&L % on price =
  the same without leverage. State both when leverage > 1.
- Distance to liquidation = |liq − mark| / mark. With no liquidation price from the user, approximate:
  ≈ 100 / leverage % minus a maintenance buffer (say it is approximate; cross margin makes the
  real distance depend on the whole account).
- Distance to stop = |stop − mark| / mark, and stop distance in ATRs = |stop − mark| / ATR(14) on
  the 4h. Under 1 ATR means the stop sits inside normal noise for that timeframe.
- Funding per day ≈ `funding.ratePct` × 3 on notional; positive rate costs longs and pays shorts.

Bands for the liquidation distance: ≤ 5% →
"at risk", ≤ 15% → "watch", above → "comfortable". These are labels for a distance, not
instructions.

## The report

ALWAYS use this template per position:

**<COIN> <SIDE> · <leverage>x · <marginMode>**

- Entry <entry> → mark <mark> (<±x.x%> on price, <±y%> on margin) · uPnL <$, when the size is known>
- Liquidation <liq> — <d%> away → **<at risk / watch / comfortable>**
- Stop <stop or "none stated"> — <d%> / <n> ATR(4h) away · Target <if any>
- Chart: 1h <bias, RSI, trend> · 4h <…> · 1d <…> · confluence <aligned / mixed>
- Nearest levels: support <price (d%)>, resistance <price (d%)>
- Derivatives: funding <label, annualized → cost or income for this side>, OI <regime>, top
  traders <long %> (same side / opposite side)
- Thesis check: what the position needs to keep working, and the level or reading that would
  say it has stopped working
- Scenarios: if price goes to <nearest level against> the position shows <P&L>; at <liquidation>
  it is gone; at <nearest level for> it shows <P&L>

Then one line naming the position with the least room, and one plain sentence that crypto derivatives are high-risk and this is market information,
not financial advice.

Facts first, labels second, no verbs of instruction. "The stop sits 0.6 ATR away, inside normal 4h
noise" is a report; "move your stop" is not.

## Conduct

- Never tell the user to close, hold, add, hedge, move a stop or change leverage. Present
  distances, scenarios and the invalidation level; the decision is theirs. If they ask "should I
  close", lay out what supports staying in and what argues against, then hand it back.
- Distances and scenarios are arithmetic on current prices and levels the tools returned; they are
  not predictions of where price will go.
- Nothing in this connector trades — no order, close, transfer or withdrawal tool exists, by
  design. Say so when asked to act; the decision and any trade stay with the user.
- Position details the user shares stay in the conversation; do not restate them in later
  unrelated answers.
- Quote only tool results and what the user told you; if a coin is not tracked, say so.

Formulas and worked examples: `references/risk-math.md`.

## Examples

```text
I'm short SOL from 180 at 5x, liquidation around 214. How far is it, and what do the 1h/4h/1d indicators say?
I'm long ETH from 2,400 at 10x with a stop at 2,250. How does it look?
Am I in trouble on my SOL short?
```

## Limitations

- Needs the hosted TraderSpy MCP server connected in the client (`https://mcp.traderspy.app/mcp`, Streamable HTTP), authorized with OAuth or a personal key from https://traderspy.app/mcp. A free TraderSpy account is enough. Without the server the skill has no data to work from.
- Tool calls are metered per day: 300 on the free tier, 5,000 on premium.
- Every tool is read-only. Nothing here places, closes or modifies an order, and there is no withdrawal or transfer tool.
- The output is market data and analysis for the user's own research, not investment advice.
- TraderSpy cannot see anyone's exchange or TraderSpy account, so every position has to be described or pasted in chat.
- Without a `liquidationPrice` the liquidation distance is an approximation; under cross margin it depends on the whole account.

## Related Skills

- `@traderspy-technical-analysis` - a full chart read on one of the coins
- `@traderspy-smart-money` - who else holds the same position
