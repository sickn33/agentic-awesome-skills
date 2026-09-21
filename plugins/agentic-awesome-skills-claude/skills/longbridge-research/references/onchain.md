# longbridge-onchain

On-chain data analysis framework — MVRV, NVT, SOPR, whale behaviour, TVL, and DEX liquidity.

## Workflow

1. Fetch crypto spot quote and recent price history from Longbridge.
2. Ask the user to provide on-chain data, or guide them to a public source:
   - Glassnode: MVRV, NVT, SOPR, active addresses
   - Dune Analytics: DEX volume, TVL by protocol
   - Nansen: whale wallet labels and flows
   - DefiLlama: cross-chain TVL
3. Interpret the metrics using standard thresholds:
   - MVRV > 3.0 → historically overheated; < 1.0 → historically undervalued
   - NVT > 90th percentile → overvalued relative to transaction throughput
   - SOPR > 1 → holders selling at profit (potential distribution)
   - SOPR < 1 → holders selling at loss (potential capitulation)
4. Synthesise a verdict: Undervalued / Fair Value / Overheated / Distribution Zone.
5. Cross-reference with price trend from Longbridge kline data.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Crypto spot quote
longbridge quote BTCUSD.HAS --format json

# Recent daily price trend (ETH example); run --help for period/count flags
longbridge kline ETHUSD.HAS --format json   # run --help for available flags
```

Supported crypto symbols use the `.HAS` suffix (e.g. `BTCUSD.HAS`, `ETHUSD.HAS`, `SOLUSD.HAS`).

## Output structure

```
ON-CHAIN ANALYSIS — <TOKEN>  <Date>

PRICE CONTEXT (Longbridge)
Current: $xx,xxx   7d: +x.x%   30d: +x.x%
90d Range: $xx,xxx – $xx,xxx

ON-CHAIN METRICS (from <source>)
MVRV:   x.xx  → [Undervalued | Fair | Overheated]
NVT:    xxx   → [Low | Normal | High]
SOPR:   x.xxx → [Accumulation | Neutral | Distribution]
Active Addresses (7d avg): xxx,xxx

DEFI / TVL (if provided)
Total TVL: $xxB   7d change: +x.x%
Top Protocol: <Name>  $xxB

VERDICT
<2–3 sentence synthesis combining price trend and on-chain signals>
Signal: [Bullish | Neutral | Bearish | Cautious]

DATA SOURCES
Price: Longbridge Securities
On-chain: <Glassnode | Dune | User-supplied>
```

## Error handling

| Situation                       | 简体回复                                            | 繁體回復                                            | English reply                                                  |
| ------------------------------- | --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| Crypto symbol not found         | 请使用 .HAS 后缀格式，如 BTCUSD.HAS。               | 請使用 .HAS 後綴格式，如 BTCUSD.HAS。               | Use the .HAS suffix format, e.g. BTCUSD.HAS.                   |
| No on-chain data provided       | 链上原始数据请从 Glassnode 或 Dune 获取后提供给我。 | 鏈上原始數據請從 Glassnode 或 Dune 取得後提供給我。 | Please provide on-chain data from Glassnode or Dune Analytics. |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。        | 請安裝 longbridge-terminal 或透過 MCP 連線。        | Install longbridge-terminal or connect via MCP.                |
| `not logged in`                 | 请运行 `longbridge auth login`。                    | 請執行 `longbridge auth login`。                    | Run `longbridge auth login`.                                   |
