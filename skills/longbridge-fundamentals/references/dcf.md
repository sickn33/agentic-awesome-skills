# longbridge-dcf

Build a step-by-step DCF model for any listed company using Longbridge financial data, arriving at an intrinsic value per share and margin of safety versus the current price.

## Workflow

### Step 1 — Fetch raw financial data

```bash
# Cash flow statement (FCF inputs)
longbridge financial-report <SYMBOL> --kind CF --format json

# Income statement (revenue growth, margins)
longbridge financial-report <SYMBOL> --kind IS --format json

# Beta and market cap for WACC
longbridge calc-index <SYMBOL> --format json
```

Run `longbridge financial-report --help` and `longbridge calc-index --help` to verify available flags.

### Step 2 — Calculate historical FCF

`FCFF = EBIT * (1 - tax rate) + D&A - capex outflow - change in operating working capital`

Use unlevered FCFF with WACC. Reported OCF minus capex may be levered and must be reconciled for interest/tax classification; do not discount an equity cash flow at WACC. Normalize capex sign, units, fiscal periods and nonrecurring items. Do not compute CAGR across nonpositive endpoints.

Extract the last 3–5 years of operating cash flow and capex from the CF statement. Compute FCF for each year and derive the compound annual growth rate (CAGR).

### Step 3 — Project FCF

Use a two-stage model:

- **Stage 1 (years 1–5)**: Apply an analyst-estimated or CAGR-derived growth rate. Ask the user if they want a bull / base / bear case.
- **Stage 2 (terminal)**: Apply a long-run growth rate `g` (explicit scenario assumption consistent with cash-flow currency, nominal/real basis and mature long-run economics; require WACC > g).

### Step 4 — Estimate WACC

```
WACC = Wd × Rd × (1 − t) + We × Re
Re  = Rf + β × ERP
```

| Input                     | Source                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| Beta (β)                  | `longbridge calc-index <SYMBOL> --format json`                                    |
| Risk-free rate (Rf)       | Dated risk-free benchmark consistent with cash-flow currency and duration |
| Equity risk premium (ERP) | Dated, cited equity risk premium with country/exposure assumptions                               |
| Debt ratio (Wd)           | From balance sheet (total debt / (total debt + market cap))                       |
| Cost of debt (Rd)         | Interest expense / total debt from IS + BS                                        |
| Tax rate (t)              | Effective tax rate from IS                                                        |

### Step 5 — Terminal value

`TV = FCF₅ × (1 + g) / (WACC − g)`

Common alternative: exit multiple method — apply an EV/EBITDA multiple consistent with mature peers.

### Step 6 — Intrinsic value

1. Discount each projected FCF to present value at WACC.
2. Discount terminal value to present value.
3. Sum all PVs → Enterprise Value.
4. Subtract gross debt and other senior/noncontrolling claims, add excess cash/nonoperating assets once → Equity Value. If using net debt, do not add the same cash again.
5. Divide by diluted shares outstanding → Intrinsic Value per Share.

### Step 7 — Margin of safety

`Margin of Safety = (Intrinsic Value − Current Price) / Intrinsic Value × 100%`

Positive = undervalued; negative = overvalued. Show sensitivity table for ±1% WACC and ±1% terminal growth.

## CLI

```bash
longbridge financial-report --help
longbridge calc-index --help

longbridge financial-report <SYMBOL> --kind CF --format json
longbridge financial-report <SYMBOL> --kind IS --format json
longbridge calc-index <SYMBOL> --format json
```

## Output

Present results as:

1. Historical FCF table (3–5 years).
2. Projected FCF table (5 years, 3 scenarios if requested).
3. WACC components breakdown.
4. Intrinsic value per share.
5. Margin of safety vs current price.
6. Sensitivity matrix (WACC × terminal growth rate).
7. Key assumptions and caveats.

Always include a disclaimer: DCF is highly sensitive to assumptions; treat output as a range, not a precise target.

## Error handling

| Situation                       | 简体回复                                               | 繁體回覆                                     | English reply                                                                            |
| ------------------------------- | ------------------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `command not found: longbridge` | 请安装 longbridge-terminal 或检查 MCP 配置。           | 請安裝 longbridge-terminal 或檢查 MCP 配置。 | Install longbridge-terminal or check MCP config.                                         |
| stderr: `not logged in`         | 请运行 `longbridge auth login`。                       | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                                                             |
| No CF data available            | 该标的暂无现金流数据，可能是上市不足三年或非标准财报。 | 該標的暫無現金流數據，可能是上市不足三年。   | No cash flow data; the company may be too recently listed or use non-standard reporting. |
| Negative FCF history            | 历史 FCF 为负，DCF 模型需用户提供未来盈利假设。        | 歷史 FCF 為負，需用戶提供未來盈利假設。      | Historical FCF is negative; DCF requires user-supplied future profitability assumptions. |
