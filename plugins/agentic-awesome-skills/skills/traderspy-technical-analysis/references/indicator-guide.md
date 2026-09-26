# Indicator guide — fields and conventional readings

Every indicator object carries `value`, `previous`, `direction` (rising / falling / flat) and
`series` (history + 1 values, oldest → newest). Extra fields per indicator below. "Reading" is
the conventional interpretation, not a prediction.

| Key | Extra fields | Reading |
| --- | --- | --- |
| `rsi` | `period`, `zone` (oversold < 30, neutral, overbought > 70), `divergence` `{type, barsAgo, priceFrom, priceTo, oscillatorFrom, oscillatorTo}` or null | 40–60 is neutral; a rising RSI from 30 is recovering momentum, not "still oversold". A bearish divergence (price higher high, RSI lower high) within the last ~60 bars is worth one sentence |
| `macd` | `periods {fast, slow, signal}`, `macd`, `signal`, `histogram`, `previous {…}`, `crossover` (bullish / bearish / null — on the latest bar only), `divergence` | Histogram sign + direction is the state (`summary.momentum.macdState`: positive_rising, positive_falling, negative_rising, negative_falling). A cross on the latest bar is an event; report it as such |
| `ema` / `sma` | `values[] {period, value, previous, direction, priceAbove, distancePct, series}`, `stack` (bullish = fast > mid > slow, bearish, mixed), `pricePosition` (above_all / between / below_all) | Stack + price position is the trend structure. `distancePct` from the 200 is the "how extended" number |
| `bollinger` | `upper`, `middle`, `lower`, `bandwidthPct`, `percentB`, `position` (above_upper / upper_half / lower_half / below_lower), `squeeze` | %B > 1 or < 0 = outside the bands; `squeeze` true = bands inside the Keltner channel (TTM) — expect expansion, direction unknown |
| `atr` | `period`, `atrPct` | Volatility in price units and as % of price. A stop tighter than ~1 ATR is inside noise on that timeframe |
| `adx` | `plusDI`, `minusDI`, `strength` (absent / weak / strong / very_strong), `diBias` (bullish when +DI > −DI) | ADX measures strength, not direction; the DI bias gives the direction |
| `stochastic` | `k`, `d`, `zone`, `crossover` | < 20 oversold, > 80 overbought; a %K/%D cross inside a zone is the classic trigger |
| `obv` | `average`, `slopePct`, `divergence` (bullish / bearish / none) | Volume confirmation. `divergence: bullish` = price fell but OBV rose (accumulation). Use the direction and the divergence, not the raw level, which depends on where the window starts |
| `vwap` | `period`, `priceAbove`, `distancePct` | Rolling VWAP over `period` bars (default 48); above = buyers in control over that window |
| `cci` | `zone` | > 100 / < −100 = extended |
| `mfi` | `zone` | Volume-weighted RSI; < 20 / > 80 |
| `williamsR` | `zone` | −100…0; < −80 oversold, > −20 overbought |
| `roc` | `period` | % change over the period; sign and direction |
| `supertrend` | `trend` (up / down), `previousTrend`, `flipped`, `barsSinceFlip`, `distancePct` | A clean trend state with a trailing level; `flipped: true` is an event, `barsSinceFlip` says how mature the trend is |
| `ichimoku` | `tenkan`, `kijun`, `tkCross`, `tkAboveKijun`, `cloud {spanA, spanB, top, bottom, color}`, `futureCloud {spanA, spanB, color}`, `pricePosition` (above_cloud / in_cloud / below_cloud), `chikouAbovePrice`, `signal` (bullish / bearish / neutral) | Price vs cloud is the trend, `futureCloud.color` is where the cloud is heading, TK cross is the trigger; `signal` is bullish only when all three agree |
| `keltner` | `periods {ema, atr, multiplier}`, `upper`, `middle`, `lower` | Volatility channel (EMA ± ATR × multiplier); Bollinger inside it is the TTM squeeze |
| `pivots` | `basis: previous_day`, `source {openTime, high, low, close}`, `pivot`, `r1…r3`, `s1…s3`, `priceAbovePivot`, `nearestResistance`, `nearestSupport` | Classic floor pivots from yesterday's daily candle regardless of the requested timeframe |
| `levels` | `resistance[]` / `support[]` `{price, touches, swingHighs, swingLows, barsSinceLastTouch, distancePct}`, `range {high, low, positionPct}`, `fibonacci {leg, legStart, legEnd, retracedPct, levels[], nearestAbove, nearestBelow}`, `volumeProfile {poc, pocVolumePct, valueAreaHigh, valueAreaLow, pricePosition, nodes[]}` | More `touches` = more respected level. `range.positionPct` says where price sits in its 300-bar range. The Fibonacci leg is the dominant swing of the lookback; `retracedPct` is how much of it has been given back |

## `summary` fields

- `bias`: bullish / bearish / neutral; `score`: signed vote sum (|score| ≥ 30 sets a bias).
- `trend`: `direction` (up / down / sideways), `strength` (absent / weak / moderate / strong),
  `adx`, `emaStack`, `priceVsEma200`.
- `momentum`: `rsi`, `rsiZone`, `macdHistogram`, `macdState`.
- `volatility`: `atrPct`, `atrPercentile` (rank of today's ATR% in the last 100 bars — 90 means
  unusually volatile), `bollingerBandwidthPct`, `state` (compressed / normal / expanded),
  `squeeze`, `squeezeBars`.
- `volume.ratioVsAverage`: current bar ÷ 20-bar average (the current bar is partial on the live
  candle — a ratio of 0.2 early in a 4h bar is normal).
- `patterns[]`: `{name, bias, barsAgo}` from 18 candlestick finders (engulfing, hammer, doji
  variants, morning/evening star…). Patterns add notes, not score.
- `notes[]`: quotable sentences; use them.

## Timeframe defaults that read well

- Intraday question → `["15m","1h","4h"]`
- "How does X look" with no horizon → `["1h","4h","1d"]`
- Position / investor framing → `["4h","1d"]` plus `levels` and `pivots`
