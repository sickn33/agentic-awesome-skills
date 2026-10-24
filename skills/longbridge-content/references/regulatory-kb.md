# longbridge-regulatory-kb

A structured regulatory knowledge base covering the rules, restrictions, and mechanisms investors face across A-shares, Hong Kong, US equity markets, and cryptocurrency — provides a historical checklist. Verify every applicable rule with the governing exchange/regulator and effective date before answering; this is not a current legal or tax reference.

## A-Share Rules (A股规则)

### Price limits (涨跌停)

| Board                          | Normal stocks             | ST / \*ST stocks |
| ------------------------------ | ------------------------- | ---------------- |
| Shanghai / Shenzhen Main Board | ±10%                      | ±5%              |
| STAR Market (科创板)           | ±20% after the first 5 trading days; no daily price limit during the first 5 | N/A              |
| ChiNext (创业板)               | ±20% after the first 5 trading days; no daily price limit during the first 5 | N/A              |
| Beijing Stock Exchange         | ±30%                      | ±30%             |

Main-board/STAR/ChiNext IPO exceptions must be checked by board and effective rules; do not apply the ordinary daily band during the initial five-day no-limit period. Beijing and relisting cases need separate rules.

### Settlement (交收)

- **T+1**: Sell a stock on the day after purchase. Funds from sales available next day.
- **T+0**: Not permitted for equities (day trading is prohibited for ordinary investors).
- Some ETF/bond products permit same-day trading; eligibility varies by product/exchange.

### Short selling (融券做空)

- Available only via margin accounts through approved brokers.
- Securities in the approved short-list only (maintained by exchanges).
- No naked short selling — must borrow first.
- Transfer fee: typically 0.05–0.10% daily.

### Circuit breakers (熔断)

- Triggered when CSI 300 falls ≥5% (15-min halt) or ≥7% (market close for the day).
- Note: implemented 2016-01-04, suspended 2016-01-08 due to market disruption.

### Delisting rules

The original numeric summary mixed board-specific and historical thresholds. Do not infer ST/*ST or delisting from a generic years-of-losses rule. Verify the current board listing rules, financial definitions, market-cap/price triggers and transition provisions for the exact issuer.

### Stamp duty (印花税)

- Check the current Ministry of Finance/State Taxation Administration notice; do not use the historical 0.1% statement here as a current rate.

## HK Stock Rules (港股规则)

### Price limits

- **No daily price limits** on the Hong Kong Stock Exchange.
- Extreme volatility may trigger Volatility Control Mechanism (VCM): 5-minute cooling-off if price moves ±10% in 5 minutes.

### Settlement (交收)

- **T+2**: Standard settlement. Sell on day T; proceeds settled T+2.
- **T+0 selling**: Allowed — you can sell shares purchased today if settled (e.g. shares transferred to your account already, which typically requires prior holding).

### Short selling (卖空)

- **Designated short-selling stocks only** — SEHK publishes the list.
- No naked short selling — must borrow.
- Short positions must be marked as "short" at order entry.

### Odd-lot trading (碎股)

- Board lot = standard trading unit (varies by stock: 100, 200, 500, 1000, 2000 shares, etc.).
- Odd lots (less than one board lot) trade in the odd-lot market at wider spreads.
- Retail investors often receive odd lots from rights issues or stock dividends.

### Grey market / dark pool (暗盘)

- Pre-IPO grey market: unofficial OTC trading in IPO shares before listing, typically evening before listing day.
- Provides price discovery but is not regulated by SEHK; settlement risk exists.

### Listing criteria / delisting (上市/退市)

- **Listing tests**: Verify current HKEX Main Board Rule 8.05 and the applicable profit/market-cap/revenue/cash-flow test; the historical HK$50M summary is not a current requirement.
- **Delisting**: Prolonged trading suspension (typically > 18 months) triggers delisting review.

### Stamp duty (印花税)

- 0.1% on both buyer and seller (total 0.2% per round trip), effective from 17 November 2023 (reduced from 0.13%).

### Insider dealing (内幕交易条例)

- Securities and Futures Ordinance (SFO) Cap. 571 governs insider dealing and market manipulation.
- Directors must disclose dealings within 3 business days.

## US Stock Rules (美股规则)

Key rules: PDT ($25k minimum, 4 day-trades in 5-day window), Reg T 50% initial margin, T+1 settlement (since May 2024), S&P 500 circuit breakers at -7%/-13%/-20%, Reg SHO short-locate requirement, LULD per-stock bands ±5%.

The upstream us-rules.md file is not bundled; consult current SEC/FINRA/exchange rules, including account-specific day-trading requirements.
The upstream crypto-and-tax.md file is not bundled. Tax/residency questions require current jurisdiction-specific official sources.

## CLI (supplementary)

For live trading session status:

```bash
longbridge market-temp --format json   # session open/closed, market sentiment
```

For symbol-specific board lot or margin tier:

```bash
longbridge static <SYMBOL> --format json   # verify available fields with --help
longbridge static --help
```

## Output

For each regulatory question:

1. Clear rule statement with the governing authority.
2. Numeric thresholds (%, days, amounts).
3. Consequences of violation / breach.
4. Practical tip for the user.
5. Rules evolve: cite the exact official source and effective date, or mark unverified (CSRC / SFC / SEC / FINRA).

## Error handling

| Situation                             | 简体回复                                                           | 繁體回覆                                                           | English reply                                                                     |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `command not found: longbridge`       | 监管知识库无需 CLI。如需实时交易状态，请安装 longbridge-terminal。 | 監管知識庫無需 CLI。如需實時交易狀態，請安裝 longbridge-terminal。 | Regulatory KB needs no CLI. For live session status, install longbridge-terminal. |
| Rule not covered                      | 该规则暂未收录，建议查阅 CSRC/SFC/SEC 官网。                       | 該規則暫未收錄，建議查閱 CSRC/SFC/SEC 官網。                       | Rule not yet covered; consult CSRC / SFC / SEC official website.                  |
| User asks for specific account advice | 请咨询持牌财务顾问，本技能仅提供通用规则说明。                     | 請諮詢持牌財務顧問，本技能僅提供通用規則說明。                     | Consult a licensed financial adviser; this skill provides general rules only.     |
