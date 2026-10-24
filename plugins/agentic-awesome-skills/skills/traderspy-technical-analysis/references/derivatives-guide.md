# Derivatives guide — `get_derivatives`

Source: Binance USDⓈ-M perpetual futures public endpoints, snapshot cached 60 s. One entry per
symbol; an unknown or non-Binance symbol comes back as `{ symbol, error, message }`.

## Fields

- `markPrice`, `indexPrice`, `premiumPct` — mark vs index; a persistent positive premium is
  another face of long crowding.
- `funding`: `rate` (raw, verify actual funding interval), `ratePct`, `annualizedPct`, `nextFundingTime`,
  `minutesToNextFunding`, `avg24hPct`, `avg3dPct`, `label`.
- `openInterest`: `contracts`, `valueUsd`, `change4hPct`, `change24hPct`, `priceChange24hPct`,
  `regime`.
- `positioning`: `globalLongShortRatio`, `globalLongPct` (all accounts), `topTraderLongShortRatio`,
  `topTraderLongPct` (top traders, by position size), `takerBuySellRatio` (last hour),
  `label`.
- `notes[]` — the interpretation in sentences; quote them.

## Labels

These are provider heuristic labels, not verified causal diagnoses. The table's
8-hour thresholds apply only if that interval is confirmed; do not apply them to
one-/four-hour settlement schedules. Position-ratio percentages refer to the
specified top-trader position cohort, not a percentage of all market participants.
See [Binance market-data definitions](https://developers.binance.info/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/market-data).


| `funding.label` | Rule (per 8h) | Reading |
| --- | --- | --- |
| `extreme_shorts_paying` | ≤ −0.05% | Shorts crowded and paying heavily; squeeze risk |
| `shorts_paying` | ≤ −0.01% | Shorts paying longs |
| `neutral` | between −0.01% and +0.03% (Binance's baseline is +0.01%) | No crowding signal |
| `longs_paying` | ≥ +0.03% | Longs paying shorts — leverage leaning long |
| `extreme_longs_paying` | ≥ +0.10% | Longs crowded and paying heavily; long-squeeze / flush risk |

For a verified 8-hour interval, 0.05% × 3 × 365 ≈ 54.75% simple annualized rate. This assumes an unchanged rate and is not compounded yield; intervals can change.

| `openInterest.regime` | OI 24h | Price 24h | Reading |
| --- | --- | --- | --- |
| `new_longs` | up | up | OI/price both increased; not proof of new longs alone |
| `short_covering` | down | up | OI decreased while price rose; short covering is one hypothesis |
| `new_shorts` | up | down | OI rose while price fell; new shorts are one hypothesis |
| `long_liquidation` | down | down | OI and price fell; liquidations need separate evidence |
| `flat` | < 1% OI or < 0.5% price | No meaningful OI story |

| `positioning.label` | Rule | Reading |
| --- | --- | --- |
| `long_heavy` | long/short ratio ≥ 1.5 (≈ 60%+ long) | Leaders leaning long |
| `balanced` | between | No lean |
| `short_heavy` | ratio ≤ 0.67 (≈ 40% or less long) | Leaders leaning short |

Top-trader positioning (by position size) is read first as a separately defined cohort, not evidence it is informed; the
all-account ratio shows the crowd. When they disagree ("top traders 69% long, all accounts 45%
long"), that disagreement is the interesting sentence.

## Combining with the chart

- Chart bullish + `new_longs` + `neutral` funding: a trend with fuel and no crowding.
- Chart bullish + `extreme_longs_paying`: extended; flush risk is the caveat to state.
- Chart bearish + `short_covering` bounce: a relief rally, not a reversal, until OI rebuilds.
- `long_liquidation` with `extreme_shorts_paying` afterwards: the flush may be done; watch whether
  OI rebuilds.

These are conventional readings to explain the data, not predictions.
