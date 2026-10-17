# Krexa tools

All tools return structured JSON plus a short text summary. Errors come back
with `isError: true` and `error.code` (see the end of this file).

| Tool | Does | Changes anything? |
|---|---|---|
| `krexa_whoami` | Which Krexa account and wallet this key acts for | no |
| `krexa_decode_strategy` | Reads a post, reel, video or text and extracts the trading rule | saves the decode |
| `krexa_backtest` | Quick backtest of a decode on past prices | no |
| `krexa_deep_backtest_start` | Starts a deep test with real fees, slippage and funding (~6 min) | starts a job |
| `krexa_research_start` | Starts a research job on an open question (1–3 min) | starts a job |
| `krexa_job_get` | Status and result of a deep test or research job | no |
| `krexa_check_idea` | One-line verdict: holds up / does not / cannot test | no |
| `krexa_paper_start` | Runs a decode on live prices with pretend money | starts a paper agent |
| `krexa_paper_status` | P&L and trades of a paper agent | no |
| `krexa_paper_stop` | Stops a paper agent | stops it |
| `krexa_list_agents` | Every agent of this account with balance, P&L, status | no |
| `krexa_agent_status` | One agent: trades, P&L, blocked orders and why | no |
| `krexa_agent_pause` | Pauses a live agent now | pauses it |
| `krexa_deploy_request` | Asks to deploy a live agent; returns an approval link | creates a request only |
| `krexa_deploy_status` | Status of a deploy request | no |
| `krexa_leaderboard` | Public ranking of agents by live results | no |

## Key inputs

- `krexa_decode_strategy`: `{ url }` or `{ text }` (40 to 200,000 characters).
  Links: X, Instagram, YouTube, TikTok, Reddit.
- `krexa_backtest`: `{ decodeId, capital?, from?, to?, symbol? }`.
  If the result has `refused.askForSymbol`, ask the user which market and call
  again with `symbol`.
- `krexa_deep_backtest_start`: `{ decodeId, venue?, maxLeverage?, symbol? }`.
  Venues: `solana`, `hyperliquid`, `polymarket`, `polymarket-perps`,
  `jupiter-perps`.
- `krexa_research_start`: `{ prompt, venue }`. `prompt` is 10 to 2,000
  characters. Both are required.
- `krexa_paper_start`: `{ decodeId, venue, name?, startUsd? }`. `startUsd` is
  100 to 10,000. Default 1,000.
- `krexa_deploy_request`:
  ```json
  { "decodeId": "…", "venue": "solana", "name": "NVDA dip buyer",
    "limits": { "maxTradeUsdc": 50, "dailyBudgetUsdc": 200,
                "maxDailyLossUsd": 20, "stopLossPercent": 10 } }
  ```
  Returns `{ requestId, status: "approval_required", approvalUrl, expiresAt, summary }`.
  `krexa_deploy_status` then returns `approval_required`, `live`, `rejected`
  or `expired`. Approval links last 24 hours.

## Error codes

| Code | Do this |
|---|---|
| `not_logged_in` | The key is missing, expired (30 days) or revoked. Send the user `https://krexa.xyz/mcp/link?client=<your name>` for a new one. |
| `rate_limited` | Wait `retryAfterSec`, then retry once. |
| `refused` | Tell the user the reason. Ask for a symbol if asked. |
| `limit_exceeded` | Tell the user the ceiling. Do not retry with tricks. |
| `not_supported` | Say Krexa does not support it. |
| `not_found` | The id is wrong or not this user's. |
| `harness_unavailable` | Deep test is down. Offer the quick backtest. |
