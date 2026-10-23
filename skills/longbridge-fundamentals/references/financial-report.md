# longbridge-financial-report

Prompt-only analysis skill. Fetches complete three-statement financials from Longbridge and performs cross-statement reconciliation, DuPont decomposition, and earnings-quality analysis in the LLM.

## CLI

Run `longbridge --help` to see all available subcommands, then `longbridge <subcommand> --help` before calling. Types of data needed:

- Financial statements (income statement, balance sheet, cash flow) — single statement or all three at once
- Period selection (annual, semi-annual, quarterly — exact flag values differ by CLI version; check `--help`)
- Raw line-item access with field-level hierarchy (a separate subcommand may exist for this)

```bash
# Always check available flags first:
longbridge <subcommand> --help

# Then fetch financials — example structure (verify flags with --help):
longbridge <subcommand> TSLA.US --format json
longbridge <subcommand> 700.HK --format json
```

## Workflow

1. **Resolve symbol** to `<CODE>.<MARKET>` format (e.g. `TSLA.US`, `700.HK`, `600519.SH`).
2. **Determine scope** from user intent:
   - Single statement requested → fetch that kind only.
   - Reconciliation / DuPont / earnings quality → fetch all three statements (use `--help` to find the flag that requests all statements at once).
3. **Call CLI** (or MCP fallback). If `longbridge` not installed, fall back to MCP.
4. **In-LLM analysis** per requested depth:

   | Analysis                                      | Method                                                                                                                                      |
   | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
   | **三表勾稽 / Cross-statement reconciliation** | Verify: closing retained earnings = opening retained earnings + attributable income - dividends +/- adjustments; OCF = net income + noncash adjustments - working-capital investment; reconcile cash definitions, FX and scope between CF and BS |
   | **杜邦分解 / DuPont decomposition**           | ROE = Net Margin × Asset Turnover × Equity Multiplier                                                                                       |
   | **盈利质量 / Earnings quality**               | Accrual ratio = (Net Income − Operating CF) / Avg Total Assets; high positive ratio → earnings less cash-backed                             |

5. Output structured report; cite **Longbridge Securities**; end with disclaimer.

## Output template

```
{Symbol} ({code}) Financial Statements — Source: Longbridge Securities
Period: {report_period} | Report date: {rpt_date}

[Income Statement (IS)]
- Revenue: X  YoY ±Y%
- Gross profit / margin: X / Y%
- Operating income: X
- Net income: X  YoY ±Y%
- EPS (basic / diluted): X / Y

[Balance Sheet (BS)]
- Total assets: X
- Total liabilities: X  |  Debt-to-equity: Y%
- Cash & equivalents: X
- Shareholders' equity: X  |  Book value per share: Y

[Cash Flow (CF)]
- Operating CF: X
- Investing CF: X
- Financing CF: X
- Free cash flow (OCF − capex): X

[Cross-statement reconciliation]
- IS→BS: Net income, dividends and other adjustments vs ΔRetained earnings: {match / gap of X}
- IS→CF: Net income vs OCF bridge: {match / key non-cash items}
- CF→BS: ΔCash: {match / gap}

[DuPont decomposition]
ROE {X%} = Net margin {Y%} × Asset turnover {Z×} × Equity multiplier {W×}

[Earnings quality]
- Accrual ratio: X% — {low / medium / high} accrual, earnings are {cash-backed / partly accrual-driven / accrual-heavy}

⚠️ 以上数据仅供参考，不构成投资建议。/ 以上數據僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

(Omit sections not requested; state "data unavailable" rather than inventing.)

## Error handling

| Situation                           | 简体中文回复                                                  | 繁體中文 / English                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `command not found: longbridge`     | 回退到 MCP；如 MCP 也不可用，请用户安装 longbridge-terminal。 | 回退到 MCP；如 MCP 也不可用，請安裝 longbridge-terminal。/ Fall back to MCP; if also unavailable, tell user to install longbridge-terminal. |
| stderr `not logged in`              | 请运行 `longbridge auth login` 登录。                         | 請執行 `longbridge auth login`。/ Run `longbridge auth login`.                                                                              |
| Returns empty / no data             | "{symbol} 暂无财务报表数据（可能为新上市或未覆盖标的）。"     | "{symbol} 暫無財務報表數據。" / "{symbol} has no financial statement data (newly listed or not covered)."                                   |
| Only one or two statements returned | 仅展示已返回的报表，注明缺失部分，不做勾稽。                  | 僅展示已返回報表，注明缺失。/ Show available statements only; note missing ones; skip reconciliation.                                       |
| Other stderr                        | 直接显示原始错误，不静默重试。                                | 顯示原始錯誤。/ Surface a redacted error summary — do not retry silently.                                                                                   |
