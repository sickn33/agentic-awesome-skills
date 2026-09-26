# Condition cookbook

Ready-made `conditions` arrays for the intents users actually voice. Combine at most three.

## Mean reversion

| Intent | Conditions |
| --- | --- |
| Oversold | `[{"metric":"rsi","op":"lt","value":30}]` |
| Oversold, wider net | `[{"metric":"rsi","op":"lt","value":35}]` |
| Deeply oversold (outside lower band) | `[{"metric":"rsi","op":"lt","value":30},{"metric":"bbPercentB","op":"lt","value":0}]` |
| Oversold in an uptrend (pullback) | `[{"metric":"rsi","op":"lt","value":40},{"metric":"priceVsEma","op":"gt","value":0,"period":200}]` |
| Overbought | `[{"metric":"rsi","op":"gt","value":70}]` |
| Overbought and stretched | `[{"metric":"rsi","op":"gt","value":70},{"metric":"bbPercentB","op":"gt","value":1}]` |
| Washed out on volume | `[{"metric":"williamsR","op":"lt","value":-90},{"metric":"volumeRatio","op":"gt","value":2}]` |
| Dumped 5%+ in a day (on 1h) | `[{"metric":"changePct","op":"lt","value":-5,"period":24}]` |
| Dumped 5%+ in a day (on 4h) | `[{"metric":"changePct","op":"lt","value":-5,"period":6}]` |

## Trend

| Intent | Conditions |
| --- | --- |
| Above the 200 EMA | `[{"metric":"priceVsEma","op":"gt","value":0,"period":200}]` |
| Strong uptrend | `[{"metric":"priceVsEma","op":"gt","value":0,"period":200},{"metric":"adx","op":"gt","value":25},{"metric":"supertrend","op":"gt","value":0}]` |
| Strong downtrend | `[{"metric":"priceVsEma","op":"lt","value":0,"period":200},{"metric":"adx","op":"gt","value":25},{"metric":"supertrend","op":"lt","value":0}]` |
| Golden cross (event) | `[{"metric":"emaSpread","op":"crossAbove","value":0,"period":50,"period2":200}]` |
| Death cross (event) | `[{"metric":"emaSpread","op":"crossBelow","value":0,"period":50,"period2":200}]` |
| Fast EMA stack turning up | `[{"metric":"emaSpread","op":"crossAbove","value":0,"period":9,"period2":21}]` |
| SuperTrend just flipped up | `[{"metric":"supertrend","op":"crossAbove","value":0}]` |
| Pullback to the 50 EMA in an uptrend | `[{"metric":"priceVsEma","op":"lt","value":1,"period":50},{"metric":"priceVsEma","op":"gt","value":-1,"period":50},{"metric":"priceVsEma","op":"gt","value":0,"period":200}]` |

## Momentum

| Intent | Conditions |
| --- | --- |
| MACD bullish cross (event) | `[{"metric":"macdHistogram","op":"crossAbove","value":0}]` |
| MACD bearish cross (event) | `[{"metric":"macdHistogram","op":"crossBelow","value":0}]` |
| Momentum burst | `[{"metric":"roc","op":"gt","value":5},{"metric":"volumeRatio","op":"gt","value":1.5}]` |
| Stochastic oversold cross up (event) | `[{"metric":"stochastic","op":"crossAbove","value":20}]` |
| Money flow drying up in an uptrend (divergence hint) | `[{"metric":"mfi","op":"lt","value":40},{"metric":"priceVsEma","op":"gt","value":0,"period":200}]` |

## Volatility

| Intent | Conditions |
| --- | --- |
| Bollinger squeeze (4h) | `[{"metric":"bbWidthPct","op":"lt","value":4}]` — sort by metric ascending |
| Bollinger squeeze (1h) | `[{"metric":"bbWidthPct","op":"lt","value":2.5}]` |
| Quiet, low-ATR names | `[{"metric":"atrPct","op":"lt","value":1.5}]` |
| High-ATR names | `[{"metric":"atrPct","op":"gt","value":5}]` |
| Volume spike right now | `[{"metric":"volumeRatio","op":"gt","value":3}]` |

## Price

| Intent | Conditions |
| --- | --- |
| Sub-dollar coins in an uptrend | `[{"metric":"price","op":"lt","value":1},{"metric":"priceVsEma","op":"gt","value":0,"period":200}]` |

## Backtest pairings that read well

- Oversold bounce: `rsi lt 30` on 4h, default horizons → answers "does buying the dip work here".
- Golden cross: `emaSpread crossAbove 0 (50,200)` on 1d, horizons `[5, 10, 20, 40]`.
- Capitulation day: `changePct lt -8 period 1` on 1d, horizons `[1, 3, 7, 14]`.
- Squeeze release: `bbWidthPct lt 3` on 4h — note that a squeeze predicts a move, not a
  direction; expect small average returns with large excursions both ways.

## Reading `values`

Every row's `values` map is keyed by the tool's label (`RSI(14)`, `EMA spread(50,200)`,
`Price vs EMA(200)`), and the same labels appear in the `conditions` echo — use them in the table
header so the user can see exactly what was tested.
