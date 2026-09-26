# Signal field glossary

## `get_signals` → `data[]`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Pass to `get_signal_details` |
| `strategyName` | string | Preset display name. The timeframe is usually in the name, e.g. "(4H)" |
| `importance` | high / medium / low | Preset tier, not a per-signal confidence |
| `action` | buy / sell | Direction |
| `signalStrength` | weak / moderate / strong / very_strong | How many optional conditions matched; capped at `strong` unless the entry was fresh |
| `coin` | string | Binance Futures pair, e.g. `WCTUSDT` |
| `timeframe` | 1h / 4h / 1d | Chart timeframe the preset evaluated |
| `price` | number | Price when the signal was published; targets are measured from it |
| `targets[]` | `{label, type, pct}` | `type` is `tp1` / `tp2` / `tp3` / `sl`; `pct` is unsigned distance from `price` |
| `triggeredConditions[]` | string | Plain-language conditions that fired, e.g. "Volume 2.2x average" |
| `resolutionStatus` | see table in SKILL.md | `pending` when nothing has resolved yet |
| `createdAt` | ISO date | Publication time |

`pagination` = `{ limit, skip, total, hasMore }`. `total` is the count matching the filter — it is
the size of the whole public archive when no filter is given, not "signals today".

## `get_signal_details` adds

| Field | Notes |
| --- | --- |
| `livePrice` | Current price of the pair at call time — the number that decides whether the idea still stands |
| `indicatorValues` | Readings captured at trigger time. Common keys: `rsi`, `macd_histogram`, `adx`, `obv_slope`, `obv_flow_pct`, `volume_ratio`, `williams_r`, plus `validation_*` keys written by the publisher's scoring pass (`validation_score` 0–100, `validation_confidence`, `validation_rsi`, `validation_atr_pct`, `validation_btc_trend_1d`, `validation_btc_rsi_4h`, `validation_directional_move_pct` = how far price had already moved in the trade's direction when it was published) |
| `aiReview` | `{ score, decision, analysis }` or null. Null is the normal case |
| `history.entryPrice` | Price at entry (equals `price` unless recalibrated) |
| `history.currentPrice` | Last tracked price; may be null on a fresh signal |
| `history.highestPrice` / `lowestPrice` | Extremes seen since entry on 1-minute data |
| `history.resolution` | `{ status, price, time }` once resolved; `price` is the level that was hit, so realised move = (resolution.price − entryPrice) / entryPrice, sign-flipped for sells |

Interpretation notes:

- `validation_score` around 70–80 has historically been the sweet spot; the very highest scores
  tended to be late entries. Do not rank signals by score alone.
- `validation_directional_move_pct` above ~1.5% means the move was already under way at
  publication — worth mentioning as "the entry chased the move".
- The published TP2/TP3 are a ladder (≈1.7× and 2.4× TP1); they exist so a winner can be
  graded beyond TP1, not as three independent forecasts.

## `get_signal_stats`

`{ total, targetHits, stopped, pending, highCount, winRate }` over signals created in the period.

- `targetHits` counts `tp1_hit`, `tp2_hit`, `tp3_hit` and `profit_locked`.
- `pending` = total − hits − stops (so it also contains `expired` rows).
- `winRate` = round(hits ÷ (hits + stops) × 100), null when nothing has resolved.
- `highCount` = how many were high importance.

The 4h and 8h windows are small samples; treat single-digit `total` as noise.

## Resolution mechanics worth knowing

- Tracking window = 1×, 4× and 24× the signal timeframe (1h → 1h/4h/1d; 4h → 4h/16h/4d).
- TP and SL are judged on 1-minute highs/lows starting the minute after entry; on a same-minute
  ambiguity the stop is recorded first (conservative).
- TP2 and TP3 count only after TP1; after TP1 a later stop touch does not downgrade the result.
- `profit_locked` is set when a trend-exhaustion check fires before TP1 and locks a partial gain.
- Only a subset of signals is ever marked `expired`; a signal that finishes its window untouched
  can stay `pending` indefinitely. Treat old `pending` rows as roughly flat outcomes, not as open
  ideas.
