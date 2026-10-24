# longbridge-valuation

Prompt-only analysis skill. Orchestrates Longbridge CLI commands to answer _"is X expensive?"_ across three dimensions: current snapshot, historical percentile, industry context.

## CLI

Run `longbridge --help` to see all available subcommands, then `longbridge <subcommand> --help` before calling. Types of data needed (run concurrently):

- Current valuation snapshot + peer comparison
- Historical valuation series (PE, PB — run `--help` for available indicators and range flags)
- Daily industry percentile rank for PE / PB / PS (run `--help` for date range flags)
- Industry median + distribution
- Industry percentile distribution
- Optional intraday valuation correction (for live mid-day prices — run `--help` for the relevant subcommand)

```bash
longbridge <subcommand> TSLA.US --format json   # run --help for available flags and subcommand names
```

## Workflow

1. **Resolve symbol** to `<CODE>.<MARKET>` (rules in `longbridge-quote`). Multiple symbols → route to `longbridge-peer-comparison`.
2. **Concurrently call** CLI commands above. If `longbridge` is not installed, fall back to MCP (see MCP fallback section).
3. Optional intraday correction (only when needed): run `longbridge --help` to find the subcommand for live intraday valuation — note that the standard valuation subcommand is often EOD only.

4. **Compute** in the LLM:

   | Quantity                 | Method                                                                                                         |
   | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
   | Historical PE percentile | rank current PE against the same stock historical PE series; industry valuation-rank history is not an own-history percentile |
   | Historical PB percentile | same                                                                                                           |
   | Industry premium         | `(current PE − industry median PE) / industry median PE`                                                       |
   | Industry rank            | bucket from industry valuation distribution data                                                               |

   If history is sparse (< 1y) or the industry has fewer than 5 peers, **degrade gracefully** — show snapshot + relative-to-industry only, drop the percentile claim.

5. **Output the three sections** (template below). Cite **Longbridge Securities**.

## Output template

```
{Symbol} ({code}) valuation snapshot — Source: Longbridge Securities

[Current snapshot]
- PE (TTM): X
- PB:        X
- PS:        X
- EV/EBITDA: X (if available)
- Dividend yield: X%

[Historical (past 3y)]
- PE in N-th percentile (low / mid / high)
- PB in N-th percentile

[Industry (N peers)]
- Industry median PE: X → currently {premium/discount} of N%
- Industry rank: {position} / N (high / mid / low bucket)

[Combined]
From historical + industry views, valuation is {low / neutral / high} — historical N-th pct, {N% above/below} industry median.

⚠️ 以上数据仅供参考，不构成投资建议。/ 以上數據僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

(Translate into the user's language; keep numeric values as-is.)

## Cyclical industries — special handling

Energy / chemicals / steel / shipping / banks / property are cyclical: PE inverts (high PE near troughs because earnings are depressed; low PE near peaks may signal a top). When the symbol is in such an industry, **add the caveat**: _"Cyclical industry — PE percentile must be interpreted alongside industry cycle position; do not read 'high PE = expensive' mechanically."_

## Output constraints

- **Must** include three dimensions (snapshot + historical + industry); state "data unavailable" if a dimension fails.
- **Must** cite "Longbridge Securities" / "数据来源:长桥证券" / "數據來源:長橋證券".
- **Must** end with the not-investment-advice disclaimer.
- **May** characterise combinations like "high-historical + high-industry" and give a view; qualify with data.

## Error handling

| Situation                       | Reply                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `command not found: longbridge` | Fall back to MCP; if MCP also unavailable, tell user to install longbridge-terminal. |
| stderr `not logged in`          | Tell user to run `longbridge auth login`.                                            |
| Valuation data returns empty    | "{symbol} has no valuation data (likely an obscure or newly listed name)."           |
| history < 1 year                | Degrade to snapshot + industry-only                                                  |
| Industry < 5 peers              | Caveat: "industry sample sparse; industry percentile is indicative only"             |
