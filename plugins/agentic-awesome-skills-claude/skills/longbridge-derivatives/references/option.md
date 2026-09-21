# option

See: `longbridge option --help`

Subcommands: `quote`, `chain`, `volume`

## OCC option symbol format

`<TICKER><YYMMDD><C|P><STRIKE×1000, 8 digits>`

Example: `AAPL240119C190000` = AAPL, expires 2024-01-19, Call, strike $190.00.

## Two-step option discovery

| User input | Strategy |
|---|---|
| Full OCC symbol | `option quote <symbol>` directly |
| Underlying + expiry + strike + call/put | `option chain <UL> --date <d>` to find OCC code → `option quote` |
| Underlying + window only | `option chain <UL>` to list expiries; ask user to pick |

## Term mapping

| User says | Term |
|---|---|
| 认购证 / 牛证 / call | Call |
| 认沽证 / 熊证 / put | Put |
| 行权价 / strike | Strike |
| 到期日 / expiry | Expiry |
| 隐含波动率 / IV | Implied volatility |

## Output fields

- `option quote`: IV, delta, gamma, theta, vega, strike, expiry, last, volume, open_interest
- `option chain` (no date): array of `{expiry_date}`
- `option chain --date`: array of `{strike, call_symbol, put_symbol, standard}`
- `option volume`: real-time call / put volume snapshot
