# longbridge-financial-planning

Personal financial planning framework — retirement targets, education fund, balance sheet, and portfolio gap analysis.

## Workflow

1. Fetch current account value, positions, and multi-currency cash.
2. Ask the user for planning inputs (or use defaults):
   - Retirement age target (default: 60)
   - Annual living expenses in retirement
   - Children's education fund target (if applicable)
   - Monthly savings capacity
   - Expected portfolio return assumption
3. Build the financial plan:
   - **Net worth snapshot**: investments + cash − liabilities
   - **Retirement gap**: target corpus − current portfolio (compounded)
   - **Education fund gap**: target − dedicated savings
   - **Savings rate**: monthly contribution vs. income
   - **Years to goal**: solve for `n` given current value, rate, contribution
4. Output a structured plan with actionable recommendations.
5. Convert multi-currency assets to a common base using FX rates.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Account portfolio market value
longbridge portfolio --format json

# Current positions (stocks, funds)
longbridge positions --format json

# Multi-currency exchange rates for normalisation
longbridge exchange-rate --format json
```

## Output structure

```
PERSONAL FINANCIAL PLAN  <Date>

NET WORTH SNAPSHOT
Investment Portfolio:  $xxx,xxx (USD equivalent)
Cash & Money Market:  $xx,xxx
Total Net Worth:       $xxx,xxx

RETIREMENT PLANNING
Target Age:      60   Current Age: xx   Years: xx
Annual Expense:  $xx,xxx/yr   Corpus Needed: $x,xxx,xxx
Current Progress: $xxx,xxx (xx% of target)
Gap:             $xxx,xxx
Required Monthly Savings: $x,xxx (at x.x% p.a.)

EDUCATION FUND
Target:       $xxx,xxx  by Year 20xx
Current:      $xx,xxx   Gap: $xx,xxx
Monthly Top-up Needed: $x,xxx

SAVINGS RATE ANALYSIS
Monthly Income (estimated): $x,xxx
Monthly Savings:            $x,xxx  (xx%)
Recommendation: [On track | Increase savings by $x,xxx/month]

ACTION ITEMS
1. ...
2. ...
```

## Error handling

| Situation                       | 简体回复                                           | 繁體回復                                           | English reply                                        |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Not logged in                   | 请运行 `longbridge auth login` 并授予 Trade 权限。 | 請執行 `longbridge auth login` 並授予 Trade 權限。 | Run `longbridge auth login` with Trade scope.        |
| Empty portfolio                 | 账户暂无持仓，请先建立投资组合。                   | 賬戶暫無持倉，請先建立投資組合。                   | No positions found — build a portfolio first.        |
| FX rate unavailable             | 部分货币汇率不可用，已使用近似值。                 | 部分貨幣匯率不可用，已使用近似值。                 | Some FX rates unavailable — approximate values used. |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。       | 請安裝 longbridge-terminal 或透過 MCP 連線。       | Install longbridge-terminal or connect via MCP.      |
