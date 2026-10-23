# longbridge-value-screen

Prompt-only analysis skill. Screens an index constituent universe for stocks meeting value criteria (low PE/PB, high ROE, reasonable dividend yield), ranks candidates by composite value score, and presents a shortlist with rationale.

## Workflow

1. **Identify universe**: ask user for market (A-share / HK / US) and an index as screening pool (e.g. CSI 300, HSI, S&P 500).
2. Fetch constituent list from the chosen index.
3. For each constituent (up to 50 per batch), fetch valuation and financial KPIs concurrently.
4. Apply value filters and score each stock.
5. Present top candidates with supporting data.

## CLI

Run `longbridge <subcommand> --help` to verify exact flags before calling.

```bash
# Step 1: get constituent list (JSON key is "stocks", not "list")
longbridge constituent <INDEX> --format json
# Examples: 000300.SH (CSI300), HSI.HK, SPX.US, IXIC.US

# Step 2: for each constituent symbol (run concurrently, batch of ≤20 at a time)
longbridge calc-index <SYMBOL> --format json       # PE, PB, ROE, dividend yield, market cap
longbridge valuation <SYMBOL> --format json        # current snapshot + historical percentile
longbridge dividend <SYMBOL> --format json         # dividend history and yield
```

## Value Screening Criteria

Apply the following filters (user can adjust thresholds):

| Criterion                | Default threshold         | Rationale                          |
| ------------------------ | ------------------------- | ---------------------------------- |
| PE (TTM)                 | < 20 (A/HK); < 25 (US)    | Below market average               |
| PB                       | < 2.0                     | Below book value or modest premium |
| ROE                      | > 10%                     | Profitability quality gate         |
| Dividend yield           | > 2% (optional)           | Shareholder return signal          |
| PE historical percentile | < 50th pct (if available) | Below own history                  |
| Gross margin             | > 20% (if available)      | Business quality filter            |

**Illustrative composite score**: require positive meaningful denominators; rank valid PE/PB ascending and ROE/yield descending with best rank 1, average ties. Per metric score = 10 * (N - rank) / (N - 1), N > 1; average available comparable metrics with disclosed weights/coverage. A single candidate or missing required metric has no comparative score. Higher = stronger on this chosen screen, not a return prediction.

**Cyclical-industry caveat**: for energy, steel, banks, shipping — low PE near a cycle peak may not signal undervaluation. Flag these and suggest using PB or dividend yield as primary metric.

## Output template

```
Value Screen — <INDEX> (<N> stocks screened)  Source: Longbridge Securities
Date: <today>  Filters: PE<20, PB<2, ROE>10%

Rank  Symbol      Name         PE    PB    ROE    Div.Yield  Score   Note
1     <SYM>       <Name>       <N>   <N>   <N>%   <N>%       <N>/10
2     ...
...
(top 10 candidates)

[Interpretation]
- Top pick: <symbol> — <brief rationale>
- Key risk: <e.g. sector concentration, cyclical exposure>

⚠️ 筛选结果仅供参考，不构成投资建议。/ 篩選結果僅供參考，不構成投資建議。/ Screening results are for reference only. Not investment advice.
```

## Error handling

| Situation                       | 简体回复                                           | 繁體回復                                           | English reply                                                  |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `command not found: longbridge` | 回退到 MCP；若也不可用，请安装 longbridge-terminal | 回退到 MCP；若也不可用，請安裝 longbridge-terminal | Fall back to MCP; if unavailable, install longbridge-terminal. |
| No index specified              | 请告知要筛选的指数，如沪深300、恒生指数、标普500   | 請告知要篩選的指數，如滬深300、恒生指數、標普500   | Please specify an index, e.g. CSI 300, HSI, or S&P 500.        |
| constituent returns empty       | 未能获取成分股列表，请检查指数代码                 | 未能獲取成分股列表，請檢查指數代碼                 | Cannot fetch constituent list; check index symbol.             |
| calc-index missing fields       | 跳过该标的，标注数据缺失                           | 略過該標的，標注數據缺失                           | Skip symbol; note data gap.                                    |
