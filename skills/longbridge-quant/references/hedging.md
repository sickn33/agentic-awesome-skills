# longbridge-hedging

Design and evaluate hedging strategies for a portfolio or single position using Longbridge market data — from simple Beta hedges to options-based protection and cross-asset tail-risk hedges.

## Workflow

### Step 1 — Identify hedge objective

Clarify with the user:

- What is being hedged: single position, portfolio, or sector exposure?
- Risk to hedge: market Beta, tail event, currency, or volatility?
- Hedge horizon: days, weeks, or months?
- Cost tolerance: zero-cost (collar) or willing to pay premium?

### Step 2 — Fetch data

```bash
longbridge kline --help
longbridge option --help

# Beta calculation (60-day daily returns)
longbridge kline <SYMBOL> --period day --count 60 --format json

# Option chain for hedge instruments
longbridge option chain <SYMBOL> --format json

# Current portfolio positions (requires login with trade scope)
longbridge positions --format json
```

### Step 3 — Beta hedge

**Portfolio Beta**:

```
β_portfolio = Σ(w_i × β_i)
```

Compute individual Beta for each holding from 60-day returns vs benchmark (SPX / HSI / CSI300). Fetch benchmark kline with `longbridge kline <BENCHMARK> --period day --count 60 --format json`.

**Hedge ratio (index futures or inverse ETF)**:

```
Contracts needed = (Portfolio Value × β_portfolio) / (Futures Price × Contract Multiplier)
```

Present: number of contracts, hedge cost, and residual Beta after hedge.

### Step 4 — Options-based protection

**Protective Put** (保护性看跌期权介绍):

- 原理：持有正股的同时持有看跌期权；当标的价格下跌时，期权价值上升，可对冲下行风险。常见做法是选择平值（ATM）或略虚值（OTM）的看跌期权。
- Cost = put premium; protection kicks in below strike.
- Expiry position proceeds net of put premium are at least strike minus premium per covered share (excluding fees); profit/loss floor must also subtract the stock entry price.
- 具体期权合约是否适用，请根据自身持仓情况和风险偏好独立判断。
- Fetch available strikes: `longbridge option chain <SYMBOL> --format json`.

**Collar Strategy** (zero-cost or near-zero):

- Buy OTM put (downside protection) + sell OTM call (cap upside).
- Net premium ≈ 0 if call premium offsets put premium.
- Present: put strike, call strike, net cost, max gain, max loss.

**Selection criteria**:
| Criterion | Protective Put | Collar |
|---|---|---|
| Upside retention | Full | Capped at call strike |
| Cost | Premium paid | Near zero |
| Best for | Bullish with hedge need | Neutral/mild bearish |

### Step 5 — Tail risk hedges

| Tool                     | Instrument            | Mechanism                          |
| ------------------------ | --------------------- | ---------------------------------- |
| VIX-linked exposure      | VIX options / UVXY options | Distinct derivatives; UVXY is a leveraged VIX-futures ETF, not spot VIX       |
| Gold                     | GLD.US / 518880.SH    | Safe-haven in risk-off             |
| Long-dated US Treasuries | TLT.US                | Correlation varies by inflation/rate regime |
| Put on index             | SPY puts / HSI puts   | Direct market hedge                |

Note: fetch current price and recent kline for any hedge instrument before recommending.

### Step 6 — Currency hedge

For HK/US cross-currency portfolios:

- USD/HKD operates in a managed currency band; basis, financing and tail/depeg risks remain.
- CNY exposure: use offshore RMB (CNH) forwards or futures.
- Non-HKD Asian exposure: fetch FX rate via `longbridge fx --format json` (verify flag with `--help`).

Present notional hedge amount, instrument, tenor, and estimated cost.

### Step 7 — Hedge cost assessment

```
Cost efficiency = Protection value / Premium paid
```

Present: premium as % of protected notional, breakeven move, and expected cost per 1% of downside protection.

## CLI

```bash
longbridge kline --help
longbridge option --help
longbridge positions --help

longbridge kline <SYMBOL> --period day --count 60 --format json
longbridge option chain <SYMBOL> --format json
longbridge positions --format json
```

## Output

Present:

1. Hedge objective summary.
2. Recommended strategy with rationale.
3. Implementation details (strikes, contracts, premium).
4. Cost vs protection table.
5. Scenarios: portfolio value if market falls 10% / 20% with and without hedge.
6. Caveats (basis risk, early exercise for American options, liquidity).

Explain the actual payoff: protective puts retain upside before premium/fees, while collars cap it. Hedges may introduce basis, liquidity, rollover and counterparty risks.

> 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。/ The above is for reference only and does not constitute investment advice. Please make investment decisions independently based on your own risk tolerance.

## Error handling

| Situation                       | 简体回复                                                  | 繁體回覆                                                  | English reply                                                      |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `command not found: longbridge` | 请安装 longbridge-terminal 或检查 MCP 配置。              | 請安裝 longbridge-terminal 或檢查 MCP 配置。              | Install longbridge-terminal or check MCP config.                   |
| stderr: `not logged in`         | 请运行 `longbridge auth login`（需 Trade 权限查看持仓）。 | 請執行 `longbridge auth login`（需 Trade 權限查看持倉）。 | Run `longbridge auth login` (Trade scope needed for positions).    |
| No option chain data            | 该标的无期权数据，请尝试对应指数期权或 ETF 期权。         | 該標的無期權數據，請嘗試指數或 ETF 期權。                 | No option chain for this symbol; try index or ETF options instead. |
| Negative or missing Beta        | 不得用默认值替代；核实估计或报告未知。 | 不得用默認值替代；核實估計或報告未知。 | Negative beta may be valid; missing beta is unknown, never silently replace it with 1.                    |
