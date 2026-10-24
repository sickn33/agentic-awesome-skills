# longbridge-fx-carry

FX carry-trade analysis — evaluate interest-rate differential, historical carry returns, and key risks for currency pairs.

## Pair selection

Choose the pair and horizon requested by the user. Examples such as AUD/JPY or MXN/JPY are identifiers, not fixed high/low-yield classifications; rates and financing terms change. Do not choose a portfolio or leverage amount for the user.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## Workflow

1. Identify the carry pair(s) from the user's prompt; ask for a pair and horizon if unspecified.
2. Fetch current spot rates for all relevant currencies.
3. Fetch dated benchmark rates from current primary sources or supported provider data. Label them as proxies; executable deposit/borrowing or forward/swap terms are required for actual carry. Never use embedded knowledge for current rates.
4. Calculate the same-horizon rate differential with declared units. It is not total return: include financing spreads, forward points, spot FX change and costs for an executable scenario.
5. Fetch historical FX price data (60 days) to estimate realised volatility.
6. If useful, show rate-differential / annualised spot-volatility as a proxy with a declared return convention and sampling method. It is not a strategy Sharpe ratio: that requires excess strategy returns including financing/costs, not a static differential.
7. Assess tail-risk scenarios (rapid JPY strength / EM stress / risk-off unwind).
8. Output structured summary.

## CLI

```bash
# Spot exchange rates
longbridge exchange-rate --format json

# Historical FX price series (if supported by the CLI)
longbridge kline <FX_PAIR> --period day --count 60 --format json
```

## Output

The following is a fictional formatting example; replace it with dated observations or mark inputs unavailable:

```
Pair      Carry Yield   60d Volatility   Carry/spot-vol proxy   Illustration
─────────────────────────────────────────────────────────────
AUD/JPY      3.2%           8.4%            0.38       Moderate
NZD/USD      2.1%           6.2%            0.34       Moderate
MXN/JPY      8.5%          14.1%            0.60       High / Risky
```

Follow with a narrative covering: current macro environment, carry unwind risks, horizon, liquidity, leverage and gap-risk assumptions; do not issue an order.

## Error handling

| Situation                       | 简体回复                                     | 繁體回復                                     | English reply                                                         |
| ------------------------------- | -------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| FX pair not supported           | 该货币对暂不支持，请尝试其他主要货币对。     | 該貨幣對暫不支援，請嘗試其他主要貨幣對。     | This FX pair is not supported — try a major currency pair.            |
| Historical FX data unavailable  | 历史汇率数据不可用，仅提供当前利差分析。     | 歷史匯率數據不可用，僅提供當前利差分析。     | Historical FX data unavailable — providing current differential only. |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。 | 請安裝 longbridge-terminal 或透過 MCP 連線。 | Install longbridge-terminal or connect via MCP.                       |
| `not logged in`                 | 请运行 `longbridge auth login`。             | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                                          |

Carry trades can unwind abruptly; see [BIS analysis](https://www.bis.org/publications/sizing-carry-trades-bis-statistics). Short realized-volatility windows do not bound tail losses.
