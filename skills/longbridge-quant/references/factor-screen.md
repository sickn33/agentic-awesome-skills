# longbridge-factor-screen

Fundamental multi-factor screener. Applies user-defined thresholds across PE, PB, ROE, revenue growth, profit growth, and dividend yield to filter a candidate list and rank survivors by composite score.

## Supported factors

| Factor         | 简体         | 繁體         | Source CLI                        |
| -------------- | ------------ | ------------ | --------------------------------- |
| PE (TTM)       | 市盈率       | 市盈率       | `calc-index` or `valuation`       |
| PB             | 市净率       | 市淨率       | `calc-index` or `valuation`       |
| PS             | 市销率       | 市銷率       | `calc-index` or `valuation`       |
| ROE            | 净资产收益率 | 淨資產收益率 | `operating` or `financial-report` |
| Revenue YoY    | 营收增速     | 營收增速     | `operating` or `financial-report` |
| Net profit YoY | 净利润增速   | 淨利潤增速   | `operating` or `financial-report` |
| Dividend yield | 股息率       | 股息率       | `dividend` or `calc-index`        |

## Workflow

1. **Collect screening criteria** — ask the user if not given. Example defaults:
   - Value screen: PE < 20, PB < 2, ROE > 12%, dividend yield > 2%
   - Growth screen: revenue YoY > 20%, net profit YoY > 20%, PE < 40
2. **Obtain a candidate universe**. Options (ask user):
   - User provides a list of symbols.
   - Use an index as universe (route to `longbridge-constituent` first):
     ```bash
     longbridge constituent 000300.SH --format json   # run --help for available flags
     ```
3. **Discover exact CLI flags** before calling:
   ```bash
   longbridge calc-index --help
   longbridge operating --help
   longbridge valuation --help
   longbridge dividend --help
   ```
4. **Batch-query each candidate** (call concurrently where possible):
   ```bash
   longbridge calc-index <SYMBOL> --format json
   longbridge operating <SYMBOL> --format json
   longbridge dividend <SYMBOL> --format json
   ```
5. **Filter in-context**: discard symbols that fail any hard threshold.
6. **Score survivors**: normalise each factor to 0–1 range within the passing set; compute weighted composite score. Default weights: ROE 25%, revenue YoY 20%, PE 20%, PB 15%, dividend yield 10%, net profit YoY 10%.
7. **Output** the candidate table sorted by composite score descending (see Output section). Cite Longbridge Securities.

## CLI

```bash
# Step 0: discover flags
longbridge calc-index --help
longbridge operating --help
longbridge valuation --help
longbridge dividend --help

# Step 1: get universe (if using an index)
# NOTE: JSON response uses key "stocks" (not "list") — extract symbols from data["stocks"]
longbridge constituent 000300.SH --format json   # run --help for available flags

# Step 2: per-symbol data (repeat for each candidate)
longbridge calc-index 600519.SH --format json      # PE, PB, PS, dividend yield
# NOTE: `operating` returns data for HK stocks only; for US/A-share use financial-report instead
longbridge operating 700.HK --format json          # ROE, revenue/profit growth (HK only)
longbridge financial-report AAPL.US --format json  # US/A-share fallback; run --help for flags
longbridge dividend 600519.SH --format json        # dividend history
```

## Output

```
Factor Screen Results — Source: Longbridge Securities
Criteria: PE < 20, ROE > 15%, Revenue YoY > 10%
Universe: CSI 300 (300 stocks checked)  |  Passed: N

Rank | Symbol       | Name    | PE   | PB  | ROE   | Rev YoY | NP YoY | Div Yield | Score
-----|-------------|---------|------|-----|-------|---------|--------|-----------|------
  1  | 600519.SH   | Maotai  | 28.1 | 9.5 | 31.2% | +18.4%  | +15.7% | 2.1%      | 0.87
  2  | 601318.SH   | Ping An | 8.2  | 1.2 | 14.8% | +12.1%  | +10.3% | 4.5%      | 0.79
 ...

Notes:
- Score = weighted composite (ROE 25%, Rev YoY 20%, PE 20%, PB 15%, Div 10%, NP YoY 10%)
- PE and PB: lower is better (inverted for scoring); ROE / growth / yield: higher is better
- N/A fields excluded from score denominator

⚠️ 数据仅供参考，不构成投资建议。/ 數據僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

## Limitations

- Screening is applied to a **user-supplied list or index constituents** — this is not a real-time full-market screener.
- Data is point-in-time from the last available report; forward-looking factors require analyst consensus (`longbridge-fundamental`).
- If the candidate list exceeds ~30 symbols, process in batches and note that partial results are shown.

## Error handling

| Situation                       | 简体                                         | 繁體                                         | English                                                               |
| ------------------------------- | -------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `command not found: longbridge` | 回退到 MCP；否则告知安装 longbridge-terminal | 回退到 MCP；否則告知安裝 longbridge-terminal | Fall back to MCP; otherwise tell user to install longbridge-terminal. |
| stderr `not logged in`          | 请运行 `longbridge auth login`               | 請執行 `longbridge auth login`               | Run `longbridge auth login`.                                          |
| `calc-index` returns empty      | 该标的无估值数据，跳过或标注 N/A             | 該標的無估值數據，跳過或標注 N/A             | No valuation data; skip or mark N/A.                                  |
| Candidate list > 30 symbols     | 提示分批处理，优先处理前 30                  | 提示分批處理，優先處理前 30                  | Process in batches of 30; note partial coverage.                      |
| Other stderr                    | 原文显示错误                                 | 原文顯示錯誤                                 | Surface verbatim.                                                     |
