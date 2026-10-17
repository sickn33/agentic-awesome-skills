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

- MCP deploys are Solana spot only for now. Perps and prediction markets
  return `not_supported`.
- A deploy needs a finished deep test (paper trading needs one too).
- Leverage is always 1 for Solana spot.
- Krexa has a ceiling on max per trade and leverage for MCP deploys. A request
  above it returns `limit_exceeded` with the ceiling.
- The strategy code is frozen at deploy. The agent cannot rewrite its own rule.
- Only markets Krexa lists can be traded. Others are refused.

## What the MCP key cannot do

Withdraw, transfer, fund, delete, resume, or raise a limit. Those happen in the
Krexa app, signed by the owner.

## What Krexa does not have (do not claim it)

- A take-profit field. A rule can still exit on a gain if the strategy says so.
- A cap on the number of open positions.
- News-driven triggers.
