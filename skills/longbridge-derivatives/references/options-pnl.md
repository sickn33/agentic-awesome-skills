# longbridge-options-pnl

Prompt-only analysis skill. Fetches live option quotes, then computes and explains payoff diagrams, breakevens, max profit/loss, and Greeks sensitivities for single-leg and multi-leg option positions.

## CLI

Run `longbridge <subcommand> --help` to verify exact flags.

```bash
# Fetch option quote (IV, Greeks, premium) for a known OCC symbol
longbridge option quote <OCC_SYMBOL> --format json

# Discover OCC symbol from underlying + expiry
longbridge option chain <SYMBOL> --format json
longbridge option chain <SYMBOL> --date <YYYY-MM-DD> --format json

# Underlying spot price for payoff x-axis range
longbridge quote <SYMBOL> --format json
```

## Workflow

1. **Identify legs** — extract each leg: side (buy/sell), type (call/put), strike, expiry, quantity, premium paid/received.
2. **Fetch live data** — call `longbridge option quote` for each OCC symbol; if not known, use `option chain` to find it. Fetch underlying spot with `longbridge quote`.
3. **Compute at-expiry payoff** for each leg:
   - Long call: `max(S − K, 0) − premium`
   - Short call: `premium − max(S − K, 0)`
   - Long put: `max(K − S, 0) − premium`
   - Short put: `premium − max(K − S, 0)`
   - Net payoff = sum across all legs.
4. **Find breakeven(s)** — stock price(s) where net payoff = 0.
5. **Find max profit and max loss** — scan payoff at key price points (strikes + beyond).
6. **Summarise Greeks** from `option quote` output; compute net Greeks for multi-leg.
7. **Output** payoff table + summary (template below).

## Output template

```
{Strategy name} P&L snapshot — Source: Longbridge Securities

[Position]
Leg 1: {Buy/Sell} {N} {SYMBOL} {YYMMDD} {C/P} K={strike}  Premium={prem}
...

[Payoff at expiry]
S      Net P&L
{S-30%} {$X}
{S-15%} {$X}
{ATM}   {$X}  ← current spot
{S+15%} {$X}
{S+30%} {$X}

[Key metrics]
- Breakeven: ${X} [and ${Y} for two-sided strategies]
- Max profit: ${X} {at S ≥/≤ $Y / unlimited}
- Max loss:   ${X} {at S ≤/≥ $Y / unlimited}

[Net Greeks (current)]
- Delta: {X}  (position moves ~${X} per $1 in underlying)
- Gamma: {X}
- Theta: {X} / day  (time decay per calendar day)
- Vega:  {X} / 1% IV change

⚠️ 以上分析仅供参考，不构成投资建议。/ 以上分析僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

## Error handling

| Situation                       | 简体回复                                         | 繁體回復                                         | English reply                                                 |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------- |
| `command not found: longbridge` | 切换到 MCP；若不可用，请安装 longbridge-terminal | 切換至 MCP；若不可用，請安裝 longbridge-terminal | Fall back to MCP; if unavailable, install longbridge-terminal |
| stderr `not logged in`          | 请执行 `longbridge auth login`                   | 請執行 `longbridge auth login`                   | Run `longbridge auth login`                                   |
| OCC symbol not found in chain   | 请提供到期日和行权价以便查找合约                 | 請提供到期日和行權價以便查找合約                 | Please provide expiry and strike to locate the contract       |
| Greeks missing from quote       | 从 Black-Scholes 近似计算，精度有限              | 從 Black-Scholes 近似計算，精度有限              | Approximated via Black-Scholes; limited accuracy              |
