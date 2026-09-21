# longbridge-options-volatility

Prompt-only analysis skill. Compares implied volatility (IV) against historical volatility (HV), computes IV percentile rank, and surfaces the volatility smile / skew for options strategy guidance.

## CLI

Run `longbridge <subcommand> --help` to verify exact flags. Primary calls (may be run concurrently):

```bash
# 1. Option chain — get IV across strikes for a specific expiry
longbridge option chain <SYMBOL> --date <YYYY-MM-DD> --format json

# 2. Option volume — call/put volume for sentiment context
longbridge option volume <SYMBOL> --format json

# 3. Daily kline — compute historical volatility (60-day window typical)
longbridge kline <SYMBOL> --period day --count 60 --format json

# If unsure of exact flags:
longbridge option --help
longbridge kline --help
```

## Workflow

1. **Resolve symbol** to `<CODE>.<MARKET>` format (e.g. `TSLA.US`, `700.HK`).
2. **Fetch option chain** for the nearest liquid expiry to get IV by strike.
3. **Fetch daily kline** (60 bars) and compute HV:
   - Daily log returns: `r_i = ln(close_i / close_{i-1})`
   - HV (annualised): `σ_HV = std(r) × √252`
4. **Compute IV percentile** using the ATM IV from the chain. Compare against the 60-day kline range as a rough proxy if historical IV series is unavailable.
5. **Build smile / skew**:
   - Sort chain rows by strike; extract call IV and put IV at each strike.
   - Put skew = (OTM put IV − ATM IV); if put skew > 0 the market fears downside.
6. **Output** structured report (template below). Cite Longbridge Securities.

## Output template

```
{Symbol} volatility snapshot — Source: Longbridge Securities

[IV vs HV]
- ATM IV (nearest expiry): X%
- 60-day HV: X%
- IV/HV ratio: X  → {rich / fair / cheap}

[IV Percentile (60-day proxy)]
- Estimated percentile: ~N-th  (low <30 / mid 30–70 / high >70)

[Vol Smile / Skew]
- Put skew (OTM put IV − ATM IV): +X pp  → {downside fear / balanced}
- Call skew (OTM call IV − ATM IV): +X pp
- Shape: {positive skew / flat / negative skew}

[Strategy signal]
- IV rich (>70th pct) → consider premium-selling strategies (covered call, short strangle)
- IV cheap (<30th pct) → consider premium-buying strategies (long straddle, long call/put)
- Skew elevated → put spreads may offer better risk/reward than naked puts

⚠️ 以上分析仅供参考，不构成投资建议。/ 以上分析僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

## Error handling

| Situation                       | 简体回复                                                | 繁體回復                                                | English reply                                                 |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `command not found: longbridge` | 切换到 MCP；若 MCP 也不可用，请安装 longbridge-terminal | 切換至 MCP；若 MCP 也不可用，請安裝 longbridge-terminal | Fall back to MCP; if unavailable, install longbridge-terminal |
| stderr `not logged in`          | 请执行 `longbridge auth login`                          | 請執行 `longbridge auth login`                          | Run `longbridge auth login`                                   |
| Chain returns < 5 strikes       | 流动性不足，无法可靠建构波动率微笑                      | 流動性不足，無法可靠建構波動率微笑                      | Insufficient liquidity to build vol smile reliably            |
| Kline < 20 bars                 | 价格历史不足，跳过 HV 计算                              | 價格歷史不足，跳過 HV 計算                              | Insufficient price history; skipping HV calculation           |
