# longbridge-multifactor

Cross-sectional multi-factor quantitative stock selection. Scores a universe of stocks on value, momentum, quality, and low-volatility factors; composites the scores; ranks stocks; and outputs a TopN buy list and bottom-N short list with factor-level attribution.

## Workflow

1. **Get universe**: fetch index constituents:
   `longbridge constituent <INDEX> --format json`
   Extract the `stocks` key. If the user provides a custom list, skip this step.

2. **Fetch valuation factors** for each symbol (batched, up to 20 stocks for manageable output):
   `longbridge calc-index <SYMBOL> --format json`
   Extract PE, PB, ROE. Value factors: `f_value = 0.5 × (1/PE) + 0.5 × (1/PB)` (normalised).

3. **Fetch price history** for momentum and low-vol:
   `longbridge kline <SYMBOL> --period day --count 60 --format json`
   - Momentum: (close_today / close_60d_ago) − 1
   - Low-volatility: annualised std of last 60 daily returns × √252 (negate: lower HV → higher score)

4. **Standardise** each factor across the universe to Z-scores (subtract mean, divide by std).

5. **Composite score**:
   - Equal-weight: `score = 0.25 × Z_value + 0.25 × Z_momentum + 0.25 × Z_quality + 0.25 × Z_lowvol`
   - IC-weighted (if the user specifies): weight each factor by its historical IC (information coefficient); if IC data unavailable, default to equal-weight.

6. **Rank and output**:
   - Top 20%: buy / long signal
   - Bottom 20%: avoid / short signal
   - Display top-10 and bottom-10 stocks with individual factor Z-scores and composite score.

Run `longbridge constituent --help`, `longbridge calc-index --help`, and `longbridge kline --help` to verify current flag names.

## CLI

```bash
longbridge constituent --help
longbridge calc-index --help
longbridge kline --help

longbridge constituent <INDEX>  --format json
longbridge calc-index <SYMBOL>  --format json
longbridge kline <SYMBOL> --period day --count 60 --format json
```

Supported index examples: `HSI.HK`, `SPX.US`, `IXIC.US`, `DJI.US`, `000300.SH`.

## Output

| Column          | 简体            | 繁體            | English          |
| --------------- | --------------- | --------------- | ---------------- |
| Composite score | 综合得分        | 綜合得分        | Composite score  |
| Value Z         | 价值因子 Z 值   | 價值因子 Z 值   | Value Z-score    |
| Momentum Z      | 动量因子 Z 值   | 動量因子 Z 值   | Momentum Z-score |
| Quality Z       | 质量因子 Z 值   | 質量因子 Z 值   | Quality Z-score  |
| Low-vol Z       | 低波动因子 Z 值 | 低波動因子 Z 值 | Low-vol Z-score  |
| Signal          | 信号            | 訊號            | Signal           |

Output: top-10 / bottom-10 ranked table → factor dispersion summary → composite methodology note. Add caveat that the universe is limited by API throughput. Cite **Longbridge Securities** / **数据来源：长桥证券** / **數據來源：長橋證券**.

## Error handling

| Situation                        | 简体回复                                  | 繁體回復                                  | English reply                                   |
| -------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP 或提示安装 longbridge-terminal | 回退到 MCP 或提示安裝 longbridge-terminal | Fall back to MCP or install longbridge-terminal |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`            | 請執行 `longbridge auth login`            | Run `longbridge auth login`                     |
| `calc-index` returns null PE/PB  | 跳过该标的，标注"数据缺失"                | 跳過該標的，標注"數據缺失"                | Skip symbol; mark as "data missing"             |
| Universe > 50 stocks             | 自动截取前50只成交额最大的标的            | 自動截取前50只                            | Auto-limit to top-50 by turnover                |
| Other stderr                     | 直接显示原始错误                          | 直接顯示原始錯誤                          | Surface verbatim                                |
