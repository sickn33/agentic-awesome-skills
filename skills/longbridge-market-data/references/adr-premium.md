# longbridge-adr-premium

Cross-market premium / discount analysis for companies dual- or triple-listed as ADR (US), H-share (HK), and/or A-share (CN).

## Workflow

1. Identify all available listing venues for the company (ADR ticker, HK code, A-share code).
2. Fetch real-time quotes for each venue.
3. Fetch USD/HKD and USD/CNY exchange rates.
4. Verify the depositary ratio from the issuer/depositary record; if one ADR represents N local shares, ADR-equivalent USD = local price × N ÷ local-currency-per-USD FX. Match quote and FX times. Convert all prices to a common currency (USD) using the ADR ratio where applicable.
5. Calculate premium / discount between each pair: `(Price_A − Price_B) / Price_B × 100%`.
6. Assess arbitrage constraints: FX repatriation rules, stamp duty, liquidity depth, settlement lag.
7. Output a comparison table and narrative.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Quotes for each listing venue
longbridge quote <ADR_SYMBOL> --format json
longbridge quote <HK_SYMBOL> --format json
longbridge quote <A_SYMBOL> --format json   # omit if no A-share listing

# Exchange rates for currency conversion
longbridge exchange-rate --format json
```

Common examples:

| Company | ADR     | H-share | A-share |
| ------- | ------- | ------- | ------- |
| Alibaba | BABA.US | 9988.HK | —       |
| Baidu   | BIDU.US | 9888.HK | —       |
| JD.com  | JD.US   | 9618.HK | —       |
| NIO     | NIO.US  | 9866.HK | —       |

## Output

Present a summary table then a narrative. The following numbers are fictional ADR-equivalent values, not current quotes or a verified issuer ratio:

```
Symbol        Price (local)   Price (USD)   vs ADR
──────────────────────────────────────────────────
BABA.US        $82.50          $82.50        baseline
9988.HK        HK$638.00 (per ADR-equivalent)       $81.79        −0.9%
```

Then explain:

- Which venue is cheapest / most expensive and why.
- Arbitrage constraints (FX controls, transaction costs, liquidity).
- Whether sufficient executable quotes, conversion, financing and fee data exist to assess the spread; otherwise leave actionability unresolved.

## Error handling

| Situation                       | 简体回复                                        | 繁體回復                                        | English reply                                                    |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Symbol not found                | 未找到该代码，请确认上市交易所和代码格式。      | 找不到該代碼，請確認上市交易所和代碼格式。      | Symbol not found — please verify the exchange and ticker format. |
| No ADR listing                  | 该公司没有美股 ADR，只能比较 H 股和 A 股。      | 該公司沒有美股 ADR，只能比較 H 股和 A 股。      | No US ADR found — comparing H-share vs A-share only.             |
| Exchange rate unavailable       | 汇率数据暂时不可用，无法换算成同一货币。        | 匯率數據暫時不可用，無法換算成同一貨幣。        | Exchange rate unavailable — cannot convert to a common currency. |
| `command not found: longbridge` | 请先安装 longbridge-terminal，或通过 MCP 连接。 | 請先安裝 longbridge-terminal，或透過 MCP 連線。 | Install longbridge-terminal or connect via MCP.                  |
| `not logged in`                 | 请运行 `longbridge auth login` 完成登录。       | 請執行 `longbridge auth login` 完成登入。       | Run `longbridge auth login` to authenticate.                     |
