# longbridge-pairs-trading

Statistical-arbitrage strategy for a pair of correlated securities. Tests for cointegration, estimates hedge ratio, computes spread Z-score, and outputs actionable long/short signals with half-life and position sizing guidance.

## Workflow

1. Fetch 252 daily candles for each symbol:
   ```
   longbridge kline <SYMBOL_A> --period day --count 252 --format json
   longbridge kline <SYMBOL_B> --period day --count 252 --format json
   ```
2. Align on `time`, drop unmatched rows (different trading calendars).
3. **Cointegration test (Engle-Granger)**:
   - OLS regress `ln(close_A)` on `ln(close_B)` → hedge ratio β
   - Compute residuals (spread) = `ln(close_A) − β × ln(close_B)`
   - Run ADF test on residuals; if p-value < 0.05, declare cointegrated
4. **Spread statistics**:
   - Spread mean μ, std σ
   - Z-score = (spread_current − μ) / σ
   - Half-life λ = −ln(2) / OLS*slope of Δspread ~ spread*{t-1} (AR(1))
5. **Signal**:
   - Z > 2.0: 价差处于历史高位区间（统计上偏离均值偏大）/ Spread at historical high (statistically elevated)
   - Z < −2.0: 价差处于历史低位区间（统计上偏离均值偏小）/ Spread at historical low (statistically depressed)
   - |Z| < 0.5: 价差回归均值区间 / Spread near historical mean
6. Position sizing: suggest equal-dollar or volatility-scaled sizing; note that execution must be simultaneous.

Run `longbridge kline --help` to confirm current flag names before calling.

## CLI

```bash
longbridge kline --help

longbridge kline <SYMBOL_A> --period day --count 252 --format json
longbridge kline <SYMBOL_B> --period day --count 252 --format json
```

## Output

| Metric                | 简体         | 繁體         | English               |
| --------------------- | ------------ | ------------ | --------------------- |
| Hedge ratio β         | 对冲比率     | 對沖比率     | Hedge ratio           |
| Cointegration p-value | 协整 p 值    | 協整 p 值    | Cointegration p-value |
| Spread Z-score        | 价差 Z 分    | 價差 Z 分    | Spread Z-score        |
| Half-life             | 半衰期（天） | 半衰期（天） | Half-life (days)      |
| Signal                | 交易信号     | 交易訊號     | Trade signal          |

Output: cointegration verdict → spread statistics table → current signal → position guidance. Add a risk note if p-value > 0.05 (not cointegrated). Cite **Longbridge Securities** / **数据来源：长桥证券** / **數據來源：長橋證券**.

> 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。
> The above is for reference only and does not constitute investment advice. Investment decisions should be made based on your own risk tolerance.

## Error handling

| Situation                        | 简体回复                                  | 繁體回復                                  | English reply                                   |
| -------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP 或提示安装 longbridge-terminal | 回退到 MCP 或提示安裝 longbridge-terminal | Fall back to MCP or install longbridge-terminal |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`            | 請執行 `longbridge auth login`            | Run `longbridge auth login`                     |
| ADF p-value > 0.05               | 两标的未通过协整检验，配对交易风险较高    | 兩標的未通過協整檢驗，配對交易風險較高    | Not cointegrated; pairs trade is high-risk      |
| Insufficient overlapping dates   | 两标的历史数据重叠不足，无法建立配对      | 兩標的歷史數據重疊不足                    | Insufficient overlapping history                |
| Other stderr                     | 直接显示原始错误                          | 直接顯示原始錯誤                          | Surface verbatim                                |
