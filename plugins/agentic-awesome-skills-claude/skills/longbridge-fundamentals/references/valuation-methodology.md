# longbridge-valuation-methodology

A structured framework for selecting and applying valuation methods to listed companies using Longbridge data — from quick relative multiples to full DCF/SOTP builds.

## Workflow

1. Identify the company's industry and growth stage to select the appropriate method.
2. Fetch current valuation multiples: run `longbridge valuation <SYMBOL> --format json` (verify flags with `--help`).
3. Fetch industry context: run `longbridge industry-valuation <SYMBOL> --format json`.
4. Fetch income statement for margin/growth inputs: run `longbridge financial-report <SYMBOL> --kind IS --format json`.
5. Apply the framework table below; explain selected method(s), assumptions, and output.

## Valuation method selection guide

| Scenario                                | Preferred method | Why                                     |
| --------------------------------------- | ---------------- | --------------------------------------- |
| Stable earnings, mature company         | PE-Band / PB     | Simple; market-anchored                 |
| Asset-heavy (banks, insurance)          | PB-ROE           | Book value reflects true asset base     |
| Capital-intensive (telecom, utilities)  | EV/EBITDA        | Strips out D&A and leverage differences |
| High-growth, pre-profit (biotech, SaaS) | PS / DCF         | No earnings yet; revenue is the anchor  |
| Conglomerate / multi-segment            | SOTP             | Each segment deserves its own multiple  |
| Dividend-paying mature company          | DDM              | Intrinsic value from future dividends   |
| Asset-rich company (property)           | NAV              | Book value adjusted to market prices    |

## Method details

### Relative valuation

**PE-Band**: Plot trailing/forward PE against 1–3 year historical mean ± 1SD. An illustrative low-relative-multiple flag when PE < mean - 1SD, not a buy signal, stretched when > mean + 1SD. Use `longbridge valuation <SYMBOL> --format json` for historical percentile.

**PB-ROE**: High ROE justifies high PB. Plot PB vs ROE scatter across peers. Companies above the regression line are expensive; below are cheap. Fetch ROE from `longbridge financial-report <SYMBOL> --kind IS --format json`.

**EV/EBITDA**: Enterprise-value based; less directly affected by financing than equity multiples, but sensitive to debt, leases and enterprise-value adjustments. Use for cross-border comparisons. EV = market cap + net debt; EBITDA from IS + D&A line.

**PS**: Revenue multiple. Useful when earnings are negative. Compress to gross-profit multiple (EV/GP) for SaaS with different gross margins.

### Absolute valuation

**DCF**: Project free cash flows → discount at WACC → add terminal value. Full workflow in `longbridge-dcf`.

**DDM**: `P = D₁ / (r - g)` with r > g and compatible currency/nominal assumptions. Best for high-dividend stocks (utilities, HK REITs). Inputs: next dividend (D₁), cost of equity (r), long-run dividend growth (g).

**SOTP**: Segment A value + Segment B value + Net cash − Holding discount. Requires segment-level revenue/EBIT from financial reports.

## Common pitfalls

- Using PE for loss-making companies — use PS or EV/Sales instead.
- Anchoring WACC to an arbitrary 10% — verify Beta and risk-free rate.
- Ignoring net debt in EV/EBITDA — EV must include all debt and minority interests.
- Applying a single PE without cyclicality adjustment — use normalized or mid-cycle earnings.
- SOTP double-counting — ensure holding-company cash is not counted twice.

## CLI

```bash
# Verify available flags first
longbridge valuation --help
longbridge industry-valuation --help
longbridge financial-report --help

# Fetch current multiples
longbridge valuation <SYMBOL> --format json

# Industry context
longbridge industry-valuation <SYMBOL> --format json

# Income statement for margin/growth
longbridge financial-report <SYMBOL> --kind IS --format json
```

## Output

Present:

1. Recommended valuation method(s) with rationale.
2. Current multiple vs historical percentile vs industry median.
3. Fair-value range under each method with key assumptions.
4. Summary: cheap / fair / expensive verdict with caveats.

## Error handling

| Situation                       | 简体回复                                           | 繁體回覆                                      | English reply                                                              |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| `command not found: longbridge` | 请安装 longbridge-terminal，或检查 MCP 配置。      | 請安裝 longbridge-terminal，或檢查 MCP 配置。 | Install longbridge-terminal or check MCP config.                           |
| stderr: `not logged in`         | 请运行 `longbridge auth login`。                   | 請執行 `longbridge auth login`。              | Run `longbridge auth login`.                                               |
| No valuation data for symbol    | 该标的暂无估值数据，请检查代码格式（如 AAPL.US）。 | 該標的暫無估值數據，請確認代碼格式。          | No valuation data for this symbol; check the ticker format (e.g. AAPL.US). |
