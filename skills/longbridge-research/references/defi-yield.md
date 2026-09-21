# longbridge-defi-yield

DeFi yield analysis framework — covers lending rates (AAVE / Compound), liquidity provision (LP) returns, staking yields, yield farming strategies, and risk-adjusted return comparison across DeFi protocols.

> **Data scope notice**: Longbridge provides real-time spot prices for major cryptocurrencies (`.HAS` suffix, e.g. `BTCUSD.HAS`, `ETHUSD.HAS`). DeFi protocol metrics (APY, TVL, utilisation rates) are **not available** via the Longbridge CLI — they must be sourced via WebSearch (DefiLlama, CoinGecko, protocol dashboards).

## Workflow

1. **Identify asset and protocol** from the prompt (e.g. ETH + AAVE, USDC + Compound).
2. **Fetch spot price** from Longbridge for the underlying crypto asset (as price reference):
   ```bash
   longbridge quote ETHUSD.HAS --format json
   ```
3. **Fetch DeFi protocol data** via WebSearch from canonical sources:
   - DefiLlama (`defillama.com`) for TVL, protocol APY, pool yields.
   - CoinGecko (`coingecko.com`) for staking yields and token data.
   - Protocol-native dashboards (app.aave.com, app.compound.finance) for live rates.
4. **Compute risk-adjusted yield**:
   - Nominal APY vs. inflation-adjusted real yield.
   - IL (impermanent loss) risk for LP positions.
   - Smart contract risk / audit status (note qualitatively).
5. **Present comparison table** across protocols/strategies, ranked by risk-adjusted return.

## CLI

```bash
# Spot price for underlying crypto (price reference only)
longbridge quote BTCUSD.HAS --format json
longbridge quote ETHUSD.HAS --format json
longbridge quote SOLUSD.HAS --format json
```

> Run `longbridge quote --help` to see supported `.HAS` crypto symbols.

DeFi protocol data is **not available** via the Longbridge CLI. Use WebSearch to retrieve live APY/TVL from DefiLlama, CoinGecko, or protocol dashboards.

## Output

Present a DeFi yield comparison table:

| Field          | 简体         | 繁體         | English       |
| -------------- | ------------ | ------------ | ------------- |
| Protocol       | 协议         | 協議         | Protocol      |
| Asset          | 资产         | 資產         | Asset         |
| Strategy type  | 策略类型     | 策略類型     | Strategy type |
| Nominal APY    | 名义年化收益 | 名義年化收益 | Nominal APY   |
| Estimated risk | 风险等级     | 風險等級     | Risk level    |
| TVL            | 总锁仓量     | 總鎖倉量     | TVL           |
| Notes          | 备注         | 備註         | Notes         |

Always include a risk disclaimer: _"DeFi 投资存在智能合约风险、无常损失和流动性风险，不构成投资建议。"_ / _"DeFi investing carries smart contract, impermanent loss, and liquidity risks. This is not investment advice."_

## Error handling

| Situation                       | 简体回复                                       | 繁體回覆                                       | English reply                                      |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `command not found: longbridge` | 请先安装 longbridge-terminal（仅用于现货价格） | 請先安裝 longbridge-terminal（僅用於現貨價格） | Install longbridge-terminal (for spot prices only) |
| `.HAS` symbol not found         | 提示该加密货币暂不支持，尝试标准格式           | 提示該加密貨幣暫不支援                         | Crypto symbol not supported; check `.HAS` format   |
| DeFi APY data unavailable       | 提示需通过 WebSearch 获取协议数据              | 提示需透過 WebSearch 取得協議數據              | DeFi APY requires WebSearch (DefiLlama/CoinGecko)  |
| Other stderr                    | 原样展示，不重试                               | 原樣展示，不重試                               | Surface verbatim, do not retry                     |
