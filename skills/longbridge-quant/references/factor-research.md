# longbridge-factor-research

A systematic framework for testing whether a quantitative factor adds predictive value for future returns — covering IC analysis, information ratio, decile portfolio construction, and factor decay.

## Workflow

### Step 1 — Define the factor

Clarify with the user:

- Factor name and calculation (e.g. trailing-12M PE, 1M price momentum, ROE YoY change).
- Universe: index constituent (e.g. CSI 300, HSI, S&P 500) or custom list.
- Test period (e.g. 2020-01-01 to 2024-12-31).
- Holding period (e.g. monthly rebalance).

### Step 2 — Fetch universe constituents

```bash
longbridge constituent --help
longbridge constituent <INDEX> --format json
```

Extract the `stocks` array. Common indices: `000300.SH` (CSI 300), `HSI.HK`, `SPX.US`.

### Step 3 — Fetch factor values and returns

For each symbol in the universe:

```bash
longbridge calc-index <SYMBOL> --format json   # valuation, growth metrics
longbridge kline <SYMBOL> --period day --count 252 --format json   # price history for returns
```

Run `--help` on each command to verify available fields before parsing.

### Step 4 — Compute IC at each rebalance date

`IC_t = rank_correlation(factor_value_t, forward_return_t+h)`

Where `h` = holding period. Use Spearman rank correlation (robust to outliers). Winsorize factor values at 1%/99% before ranking.

### Step 5 — Summary statistics

| Metric                 | Formula                   | Good signal threshold |
| ---------------------- | ------------------------- | --------------------- |
| Mean IC                | Average of IC time series | > 0.03 (positive)     |
| IC Std Dev             | Standard deviation of IC  | Lower is better       |
| IR (Information Ratio) | Mean IC / Std Dev IC      | > 0.5 is promising    |
| IC > 0 hit rate        | % of periods IC > 0       | > 55%                 |
| ICIR (annualised)      | IR × √(periods per year)  | > 1.0 strong          |

### Step 6 — Decile portfolio backtest

1. At each rebalance date, sort universe into 10 deciles by factor value.
2. Track equal-weighted returns for each decile over the holding period.
3. Key output: decile 1 vs decile 10 spread (long-short portfolio return).
4. Compute cumulative return, Sharpe ratio, and max drawdown for the long-short portfolio.

### Step 7 — IC decay analysis

Compute IC for multiple forward horizons (1M, 2M, 3M, 6M, 12M). Plot IC vs horizon. Fast decay = short-term factor; slow decay = longer-term signal.

Serial autocorrelation of IC series: `autocorr(IC, lag=1)`. High autocorrelation → smoother signal, lower trading cost.

## CLI

```bash
longbridge constituent --help
longbridge calc-index --help
longbridge kline --help

longbridge constituent <INDEX> --format json
longbridge calc-index <SYMBOL> --format json
longbridge kline <SYMBOL> --period day --count 252 --format json
```

## Output

Present:

1. Factor definition and universe summary.
2. IC time series chart (describe in text if no chart tool).
3. Summary statistics table (Mean IC, IC Std Dev, IR, hit rate).
4. Decile return bar chart description (decile 1 to 10 cumulative return).
5. IC decay table across horizons.
6. Interpretation: is the factor effective? Recommended holding period?

## Error handling

| Situation                       | 简体回复                                               | 繁體回覆                                         | English reply                                                             |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `command not found: longbridge` | 请安装 longbridge-terminal 或检查 MCP 配置。           | 請安裝 longbridge-terminal 或檢查 MCP 配置。     | Install longbridge-terminal or check MCP config.                          |
| stderr: `not logged in`         | 请运行 `longbridge auth login`。                       | 請執行 `longbridge auth login`。                 | Run `longbridge auth login`.                                              |
| Index not found                 | 请检查指数代码格式，如 000300.SH / HSI.HK / SPX.US。   | 請確認指數代碼，如 000300.SH / HSI.HK / SPX.US。 | Check index ticker format, e.g. 000300.SH / HSI.HK / SPX.US.              |
| Insufficient history            | 该标的历史数据不足以进行回测，请缩短测试期或更换标的。 | 歷史數據不足，請縮短測試期或更換標的。           | Insufficient price history; shorten the test period or change the symbol. |
