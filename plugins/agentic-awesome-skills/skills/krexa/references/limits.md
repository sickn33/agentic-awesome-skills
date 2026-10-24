# Krexa limits

Krexa checks these in code on its servers. A prompt cannot change them.

## Limits you set on a deploy

| Limit | Field | What it does |
|---|---|---|
| Max per trade | `maxTradeUsdc` | No single buy above this. |
| Daily budget | `dailyBudgetUsdc` | No more buying after this much in one day. |
| Daily loss cap | `maxDailyLossUsd` | Required. When the day's loss reaches it, the agent stops buying. Sells still run. Money withdrawn that day counts toward it. |
| Stop-loss | `stopLossPercent` | 1 to 50. Checked at each decision; sells when the position is this far below the last buy price. |
| Approve each order | `approvalMode: "approve"` | Every order waits for the user to approve it. |

## Limits Krexa sets

- MCP deploys cover Solana spot, Hyperliquid, Jupiter Perps and Polymarket
  Perps. Plain Polymarket (yes/no markets) returns `not_supported`.
- A deploy needs a finished deep test (paper trading needs one too), or a
  paper run, on the same venue. A Solana test does not open a perps deploy. A
  paper run must be at least as leveraged as the deploy.
- Perps have no per-trade or per-day dollar cap. The size is the money in the
  agent's account times `maxLeverage`; the daily loss cap still applies.
- Leverage is always 1 for Solana spot. On the three perps venues set
  `maxLeverage` (1 to 10, default 2). The approval page shows it, and the
  owner's deploy cannot use more.
- Krexa has a ceiling on max per trade and leverage for MCP deploys. A request
  above it returns `limit_exceeded` with the ceiling.
- The strategy is fixed when the user approves the deploy. Only the owner can
  change it, in the Krexa app.
- Only markets Krexa lists can be traded. Others are refused.

## What the MCP key cannot do

Withdraw, transfer, fund, delete, resume, or raise a limit. Those happen in the
Krexa app, signed by the owner.

## What Krexa does not have (do not claim it)

- A take-profit field. A rule can still exit on a gain if the strategy says so.
- A cap on the number of open positions.
- News-driven triggers.

## Control limitations

These are upstream-described controls, not independent enforcement evidence. A
decision-time stop or daily-loss cap cannot guarantee fill price, liquidation
avoidance or maximum realized loss. Confirm venue/account, open orders/positions,
fees and acknowledged limits; perps lack a daily notional cap in this snapshot.
