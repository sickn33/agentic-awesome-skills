# Meteora public APIs used by this skill

No API key. Send `User-Agent` and `Accept: application/json` or Cloudflare returns 403.

Base hosts:

- Discovery (trending + filters): `https://pool-discovery-api.datapi.meteora.ag`
- DLMM datapi (pair query, protocol stats, pool detail): `https://dlmm.datapi.meteora.ag`

## Endpoints

### Trending / filtered universe

```
GET /pools?page_size=50&timeframe=30m&category=trending&filter_by=<filters>
```

`filter_by` is `&&`-joined predicates. Example (volatile preset):

```
pool_type=dlmm
&&base_token_has_critical_warnings=false
&&quote_token_has_critical_warnings=false
&&base_token_has_high_single_ownership=false
&&tvl>=10000&&tvl<=150000
&&dlmm_bin_step>=80&&dlmm_bin_step<=125
&&fee_active_tvl_ratio>=0.05
&&base_token_organic_score>=60
&&base_token_holders>=500
&&volume>=500
```

Response: `{ total, page_size, data[], has_more }`.

Useful `data[]` fields: `pool_address`, `name`, `pool_type`, `tvl`, `active_tvl`,
`fee_active_tvl_ratio`, `volume`, `volatility`, `base_token_holders`,
`dlmm_params.bin_step`, `token_x.{symbol,address,organic_score,market_cap,warnings}`.

### Pair / token query

```
GET /pools?query=<symbol_or_mint>&sort_by=tvl:desc
```

on `dlmm.datapi.meteora.ag`. Response `{ total, data[] }`.

Fee/TVL and volume are **buckets**: `{ "30m", "1h", "2h", "4h", "12h", "24h" }`.
Use the same key as `--timeframe`. Bin step is `pool_config.bin_step`. Address is `address`.

### Protocol snapshot

```
GET https://dlmm.datapi.meteora.ag/stats/protocol_metrics
```

`total_tvl`, `volume_24h`, `fee_24h`, `total_pools`. One-line context only.

### Single pool

```
GET https://dlmm.datapi.meteora.ag/pools/{poolAddress}
GET https://pool-discovery-api.datapi.meteora.ag/pools?page_size=1&filter_by=pool_address={poolAddress}&timeframe=30m
```

Discovery lag: a brand-new pool may exist on DLMM datapi before discovery indexes it.

## Score (keep in sync with scripts/screen.py)

```
score = fee_tvl * 1000 + organic * 10 + volume / 100 + holders / 100
```

`fee_tvl` is the windowed ratio (`fee_active_tvl_ratio` on discovery, bucketed
`fee_tvl_ratio[timeframe]` on pair query).
