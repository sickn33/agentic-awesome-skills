# Technical Frameworks (`nse-trading-skills` Synthesis)

This reference condenses the 9 NSE/BSE technical and risk frameworks from `nse-trading-skills` for Step 2
(Multi-Timeframe Technical Confluence) and trade management.

## 1. The 3-Screen Multi-Timeframe Method

Never fight the higher-timeframe bias without overwhelming structural evidence.

| Screen | Swing / Positional | Intraday | Purpose |
| :--- | :--- | :--- | :--- |
| **Screen 1** | Weekly | Daily (`1d`) | Primary trend direction, 20/50/200 EMA alignment, PDH/PDL/PDC |
| **Screen 2** | Daily | `15m` | Setup zone: anchored VWAP, 15m Opening Range (`09:15-09:30` IST), Fib pocket |
| **Screen 3** | `1H` / `4H` | `5m` | Confirmation candle close, entry price, invalidation stop |

### Confluence Scoring System (0-6 Points)

Award `+1` for each verified condition:

1. Higher timeframe trend (Weekly for swing / Daily for intraday) agrees with direction.
2. Valid setup pattern present on middle timeframe (ORB breakout, pullback to VWAP/Demand/Supply, flag, double bottom/top).
3. `RSI(14)` supports direction (bullish > 50 or oversold divergence; bearish < 50 or overbought divergence).
4. `MACD` / `ADX` confirms momentum (`MACD > Signal` or `ADX > 25` aligned).
5. Clear structural S/R or Fibonacci (`0.382-0.618`) level anchors stop and targets.
6. Volume / Delivery % confirms (`RVOL >= 1.5x` on breakout, or `Delivery % >= 50%` on accumulation day).

| Score | Action |
| :--- | :--- |
| **5-6** | Strong setup — full configured risk (`1.0%`) |
| **4** | Good setup — full configured risk (`1.0%`) |
| **3** | Marginal — reduce risk (`0.5%`) or require higher Time Machine odds |
| **0-2** | Weak / No setup — **NO-TRADE** |

---

## 2. Indicator Dashboard & Volume Interpretation

| Indicator | Bullish | Bearish | Neutral |
| :--- | :--- | :--- | :--- |
| `RSI(14)` | `> 50` or rising out of `< 30` | `< 50` or falling from `> 70` | `40-60` flat |
| `MACD (12,26,9)` | Line `> Signal`, growing histogram | Line `< Signal`, shrinking histogram | Near zero line |
| `Bollinger (20,2)` | Bouncing off lower band / walking upper | Rejecting upper band / walking lower | Mid-band chop |
| `ADX(14)` | `> 25` with `+DI > -DI` | `> 25` with `-DI > +DI` | `< 20` (no trend) |
| `VWAP` | Price holding above anchored VWAP | Price capped below anchored VWAP | Crossing VWAP repeatedly |

### Volume & NSE Delivery Matrix

| Price | Volume | NSE Delivery % | Interpretation |
| :--- | :--- | :--- | :--- |
| Rising | `> 1.5x` 20D avg | `> 50%` | Institutional accumulation — strong trend |
| Rising | `> 1.5x` 20D avg | `< 25%` | Speculative / intraday short-covering squeeze |
| Rising | Falling | Any | Weak rally — prone to bull trap |
| Falling | `> 1.5x` 20D avg | `> 50%` | Institutional distribution — avoid longs |
| Falling | Falling | Any | Pullback / exhaustion — watch support for bounce |

---

## 3. RSI Divergence Rules

- **Regular Bullish (Reversal UP):** Price makes **Lower Low**, `RSI(14)` makes **Higher Low** (strongest when RSI `< 35`).
- **Regular Bearish (Reversal DOWN):** Price makes **Higher High**, `RSI(14)` makes **Lower High** (strongest when RSI
  `> 65`).
- **Hidden Bullish (Continuation UP):** Price makes **Higher Low**, `RSI(14)` makes **Lower Low** in an established uptrend.
- **Hidden Bearish (Continuation DOWN):** Price makes **Lower High**, `RSI(14)` makes **Higher High** in an established
  downtrend.
- **Confirmation Required:** Never enter on divergence alone — wait for confirmation candle close or minor trendline break.

---

## 4. Fibonacci Retracements & Extensions

Compute from the most recent completed significant swing (`Swing Low` to `Swing High` for uptrends):

- **Retracement Entry Zones:** `23.6%` (shallow), `38.2%` (standard), **`50.0%-61.8%` (Golden Pocket)**, `78.6%` (deep
  last defense).
- **Extension Targets:** `100.0%` (measured move), `127.2%` (Target 1 / partial), `161.8%` (Target 2 / primary swing
  extension), `200.0%` (runner).
- **Zone Rule:** Treat Fib levels as zones (`+/- 0.5%` intraday, `+/- 1.0%` swing) backed by VWAP, EMA20/50, or PDH/PDL.

---

## 5. Stop-Loss & Hybrid Trailing Stop Rules

- **Initial Stop Placement:** Beyond structural invalidation (swing low/high, ORB midpoint/low, or unmitigated
  Demand/Supply edge) + noise buffer (`>= 1.0x ATR` or `0.5%` large-cap / `1.0%` mid-cap), rounded away from entry to
  `Rs. 0.05` ticks.
- **Hard Rules:** Never widen a stop after entry; place real system stop-loss orders (`ROBO` / `SL`), never mental stops.
- **4-Stage Progressive Hybrid Trailing Plan:**
  1. `0R to < 1.0R`: Keep fixed initial stop-loss.
  2. `>= 1.0R`: Move stop to **tax-adjusted breakeven** (`entry +/- breakeven_points`).
  3. `>= 2.0R`: Trail by `Highest Close - 1.5 * ATR(14)` (long) or `Lowest Close + 1.5 * ATR(14)` (short).
  4. `>= 3.0R+`: Trail tightly beneath latest confirmed higher swing low (long) / above lower swing high (short).

---

## 6. Portfolio Concentration Guardrails (Swing / Multi-Position)

- Single stock allocation ceiling (unleveraged equity): `<= 20%` of portfolio for swing/delivery holds.
- Single sector allocation ceiling: `<= 35%` of portfolio; max `3` correlated stocks from the same sector.
- Total open portfolio risk across concurrent positions: `<= 6%` of capital.
