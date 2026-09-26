# Exchange notes for the smart-money feed

| Exchange | `source` | Trader id looks like | Symbols | Refresh | Notes |
| --- | --- | --- | --- | --- | --- |
| Binance | `binance` | opaque leaderboard id | `BTCUSDT` | positions every 5–10 min | Largest tracked set (~5k positions); leaderboard is opt-in, so it is the traders who chose to be public |
| Hyperliquid | `hyperliquid` | `0x` EVM address | bare coin `BTC`, `kPEPE`-style 1000x coins, `xyz:AVGO` for tokenized stocks | fills live via WebSocket, snapshots every 15 min | Fully on-chain, so positions are exact; `winRate` is null because the venue does not publish it |
| Bybit | `bybit` | opaque id | `BTCUSDT` | every 10–15 min | Smaller tracked set |
| OKX | `okx` | 16-hex id | `BTCUSDT` | every 10 min – 1 h | Copy-trade leaders; names and avatars are public; many high-frequency scalpers with 90%+ win rates and tiny per-trade ROI |

## Elite leaderboard (`get_elite_leaderboard`)

- Recomputed daily (00:10 Europe/Istanbul); `lastRunAt` says when. Not intraday.
- `tier` is the exchange's own badge where one exists (OKX leaders show Silver / Bronze / Regular);
  null on venues without badges.
- `algorithmDetails[]` in the response documents every weight — quote it when the user asks how
  the score works instead of paraphrasing from memory.
- `summary.totalTrackedTraders` vs `tradersWithClosedTrades` tells you how many accounts actually
  have a closed-trade record behind their score.
- A trader can top the score with a negative `effectiveRoi` if their realized PnL is huge — the
  score rewards money made, not percentage. Say which when the two disagree.

## Reading a trader's history for a "should I copy" profile

From `get_trader_position_history` rows (`symbol, side, size, entryPrice, closePrice, leverage,
pnl, roi, openTime, closeTime`):

- win rate = rows with `pnl > 0` ÷ rows
- average hold = mean of `closeTime − openTime`, expressed in hours or days
- concentration = share of rows (or of |pnl|) in the single most-traded symbol
- worst trade = min `pnl`; compare it with the median win to show the shape of the distribution
- leverage habit = median `leverage`; flag anything ≥ 20× explicitly
- recency = share of rows in the last 30 days; a great all-time record with nothing recent is a
  dormant account

Two pages of 50 rows are plenty for a profile. State the sample size.

## Free tier

Position rows are filtered to those older than 15 minutes on a free key. Leaderboards, profiles and
stats are not delayed.
