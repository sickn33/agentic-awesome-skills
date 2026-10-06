---
name: fxmacrodata
description: "Query FXMacroData for official-source macro indicators, release calendars, central-bank policy rates, FX rates and CFTC positioning across 22 currencies."
category: finance
risk: safe
source: self
source_type: self
date_added: "2026-10-04"
author: fxmacrodata
tags: [macroeconomics, forex, central-banks, economic-calendar, cot, rest-api]
tools: [claude, cursor, gemini]
---

# FXMacroData: Macro and FX Data

## Overview

FXMacroData is a REST API for macroeconomic data taken from official publishers (statistics offices, central banks, the CFTC). It covers 22 currencies: AUD, BRL, CAD, CHF, CNH, CNY, DKK, EUR, GBP, HUF, ILS, JPY, KRW, MYR, NGN, NOK, NZD, PEN, SEK, THB, TWD and USD. Each series carries its publisher, source URL and the time the number was released, so answers can cite where a figure came from and when it became public.

This skill covers discovering indicator slugs, pulling release history, reading the release calendar, comparing policy rates between two currencies, and the access limits that apply without an API key.

## When to Use

- Use when the user asks for an official macro figure for a country or currency: CPI, core inflation, GDP, unemployment, payrolls, retail sales, business and consumer confidence, trade balance, bond yields.
- Use when the user asks when the next CPI, payrolls, GDP or central-bank decision is due, or wants the release calendar for a week.
- Use when comparing central-bank policy rates or yield differentials between two currencies (for example USD vs JPY carry).
- Use when the user wants daily FX reference rates or CFTC Commitments of Traders positioning for a currency future.
- Do not use for intraday tick data, equities, crypto, or order execution. This is read-only reference data.

## Access and Authentication

- Base URL: `https://api.fxmacrodata.com/v1`
- Authentication is optional. If the user has a key, read it from the `FXMACRODATA_API_KEY` environment variable and send it in the `X-API-Key` header. Never put the key in the URL or print it in output.
- Without a key:
  - USD indicators, the USD release calendar, the USD data catalogue and USD COT data work.
  - USD announcement data is delayed by 15 minutes. Each response includes a `freemium_delay` object with the cutoff time and `withheld_count`, the number of releases newer than the cutoff.
  - History is limited to the most recent 90 days. The `freemium_window` object shows the applied cutoff date, and `requested_start_date` in the response shows the start date actually used.
- Every other currency, `/forex`, `/rate_differentials` and `/commodities` need a key. Without one they return HTTP 401 with `"code": "api_key_required"`. That means the data exists but needs a subscription; do not report it as missing.

```bash
# Keyless (USD only)
curl -s "https://api.fxmacrodata.com/v1/announcements/usd/policy_rate?limit=3"

# With a key, from the environment
curl -s -H "X-API-Key: $FXMACRODATA_API_KEY" \
  "https://api.fxmacrodata.com/v1/announcements/eur/policy_rate?limit=3"
```

## Endpoints

| Endpoint | Purpose | Keyless |
|----------|---------|---------|
| `GET /data_catalogue/{currency}` | Every indicator slug for a currency, with name, unit, frequency, source and coverage | Yes (all currencies) |
| `GET /announcements/{currency}/{indicator}` | Release history for one indicator, most recent first | USD only |
| `GET /announcements/{currency}/latest` | Latest value of every indicator for a currency | USD only |
| `GET /calendar/{currency}` | Upcoming scheduled releases with UTC timestamps | USD only |
| `GET /cot/{currency}` | Weekly CFTC COT positioning (AUD, CAD, CHF, EUR, GBP, JPY, MXN, NZD, USD, XAU) | USD only |
| `GET /forex/{base}/{quote}` | Daily FX reference rates | No |
| `GET /rate_differentials/{base}/{quote}` | Aligned rate spread between two currencies in percentage points and basis points | No |

Currency codes and indicator slugs are lowercase in paths (`usd`, `policy_rate`).

### Common query parameters

| Parameter | Endpoints | Notes |
|-----------|-----------|-------|
| `start_date`, `end_date` | announcements, calendar, cot, forex, rate_differentials | `YYYY-MM-DD`, inclusive |
| `limit`, `offset`, `page` | announcements, cot, forex, rate_differentials | Rows are most recent first. Default `limit` is 20 |
| `timezone` | calendar | IANA name such as `Europe/London`; adds an `announcement_datetime_requested_timezone` field |
| `indicator` | calendar | Filter the calendar to one slug |
| `revisions` | announcements | `latest`, `first`, `final` or `all`, where supported |
| `measure` | rate_differentials | `auto`, `policy_rate`, `risk_free_rate`, `gov_bond_2y`, `gov_bond_10y` |

### Response shape

Announcement responses carry metadata (`source`, `source_url`, `source_series_name`, `seasonal_adjustment`, `pagination`) and a `data` array. Each row has:

- `date`: the reference period the value belongs to.
- `val`: the value, plus `previous_value` and `change_from_previous` when the prior observation is in range.
- `announcement_datetime`: Unix seconds (UTC) when the figure was published; `announcement_datetime_local` gives the publisher's local time.
- `revisions`: earlier vintages of the same observation, where available.

## How It Works

### Step 1: Find the indicator slug

Slugs differ from common names. US CPI is `inflation`, not `cpi`, and payrolls is `non_farm_payrolls`. Check the catalogue before the first query for a currency:

```bash
curl -s "https://api.fxmacrodata.com/v1/data_catalogue/usd" | jq 'keys'
curl -s "https://api.fxmacrodata.com/v1/data_catalogue/usd" | jq '.inflation | {name, unit, frequency, source}'
```

An unknown slug returns HTTP 404 with a suggestion, for example `Did you mean: ppi?`.

### Step 2: Pull the history

```bash
curl -s "https://api.fxmacrodata.com/v1/announcements/usd/unemployment?limit=6" \
  | jq '.data[] | {date, val, announcement_datetime}'
```

Report the reference period (`date`) and the publication time (`announcement_datetime`) separately. A March figure is usually released in April.

### Step 3: Check freshness before calling a value "latest"

```bash
curl -s "https://api.fxmacrodata.com/v1/announcements/usd/non_farm_payrolls?limit=1" \
  | jq '{latest: .data[0].date, val: .data[0].val, delay: .freemium_delay}'
```

If `freemium_delay.withheld_count` is greater than 0, a newer release has been published but is not yet visible to keyless requests. Say so, and do not present the older value as current.

### Step 4: Check the next release

```bash
curl -s "https://api.fxmacrodata.com/v1/calendar/usd?indicator=non_farm_payrolls&timezone=UTC" \
  | jq '.data[0] | {name, reference_period, announcement_datetime_utc, release_date_confirmed}'
```

Use `announcement_datetime_utc` and convert to the user's timezone only when presenting the answer.

## Examples

### Example 1: What did the Fed do at its last meeting?

```bash
curl -s "https://api.fxmacrodata.com/v1/announcements/usd/policy_rate?limit=2" \
  | jq '{name, source, rows: [.data[] | {date, val, previous_value, change_from_previous, source_url}]}'
```

`policy_rate` for USD is the upper bound of the federal funds target range; `policy_rate_target_lower` and `policy_rate_midpoint` are separate slugs. Cite `source_url`, which links the Federal Reserve statement for that decision.

### Example 2: US release calendar for a given week

```bash
curl -s "https://api.fxmacrodata.com/v1/calendar/usd?start_date=2026-10-05&end_date=2026-10-09" \
  | jq '.data[] | {release, name, announcement_datetime_utc, event_importance}'
```

### Example 3: Policy-rate differential for a carry question (key required)

```bash
curl -s -H "X-API-Key: $FXMACRODATA_API_KEY" \
  "https://api.fxmacrodata.com/v1/rate_differentials/usd/jpy?measure=policy_rate&limit=5"
```

Without a key you can still answer the USD side from `/announcements/usd/policy_rate`, and then state that the JPY leg needs an API key.

### Example 4: CFTC positioning in US dollar index futures

```bash
curl -s "https://api.fxmacrodata.com/v1/cot/usd?limit=4" \
  | jq '.data[] | {date, noncommercial_net, noncommercial_net_zscore, open_interest}'
```

`date` is the Tuesday position date; the report is published later that week (`announcement_datetime`).

### Example 5: Python helper

```python
import os
import requests

BASE_URL = "https://api.fxmacrodata.com/v1"

def fxmd_get(path, **params):
    headers = {}
    key = os.environ.get("FXMACRODATA_API_KEY")
    if key:
        headers["X-API-Key"] = key
    resp = requests.get(f"{BASE_URL}{path}", params=params, headers=headers, timeout=30)
    if resp.status_code == 401:
        raise PermissionError(resp.json().get("detail", "API key required"))
    resp.raise_for_status()
    return resp.json()

cpi = fxmd_get("/announcements/usd/inflation", limit=12)
for row in cpi["data"]:
    print(row["date"], row["val"])
```

## MCP Server

FXMacroData also runs a hosted MCP server at `https://fxmacrodata.com/mcp` (Streamable HTTP), listed in the MCP registry as `io.github.fxmacrodata/fxmacrodata`. If the client already has it connected, prefer its tools over raw HTTP calls. The same access rules apply.

## Best Practices

- Do look up slugs in `/data_catalogue/{currency}` instead of guessing them.
- Do quote the publisher (`source`) and the release time with each figure.
- Do keep times in UTC internally and state the timezone when you present them.
- Do send the key only through the `X-API-Key` header from `FXMACRODATA_API_KEY`.
- Don't present keyless USD data as real time; it is 15 minutes behind.
- Don't treat a 401 `api_key_required` response as missing data.
- Don't compare series with different `seasonal_adjustment` or units without saying so.

## Limitations

- Without a key, only USD data is returned, with a 15-minute release delay and 90 days of history. A request for older data is clipped to the last 90 days rather than rejected, so check `requested_start_date` and `freemium_window`.
- All timestamps are UTC (Unix seconds or ISO 8601 with offset). Calendar times are scheduled times and can move; check `release_date_confirmed`.
- FX rates are daily official reference rates, not live dealing quotes.
- COT data is weekly and covers only the contracts listed above.
- Indicator coverage differs by currency; a slug that exists for USD may not exist for another currency.
- This skill reads data only. It does not give investment advice, and figures should be checked against the publisher's own release for anything consequential.

## Security & Safety Notes

- All calls are read-only HTTPS GET requests to `api.fxmacrodata.com`.
- The API key is a secret. Read it from the environment, never hard-code it, never pass it as a query parameter, and never echo it back to the user.

## Common Pitfalls

- **Problem:** `{"detail": "Unsupported currency (USD) or indicator (cpi)..."}`
  **Solution:** Use the slug from the catalogue (`inflation`).
- **Problem:** A request with `start_date=2020-01-01` returns only a few rows.
  **Solution:** Keyless history is limited to 90 days. Use a key for full history.
- **Problem:** `non_farm_payrolls` returns a value around 159 million.
  **Solution:** That slug is the employment level. The monthly change is the difference between consecutive rows.
- **Problem:** The latest row is older than a release you know has happened.
  **Solution:** Check `freemium_delay.withheld_count`; the release may be inside the 15-minute delay window.

## Additional Resources

- [FXMacroData](https://fxmacrodata.com/?utm_source=github&utm_medium=referral&utm_campaign=agentic-awesome-skills&utm_content=docs)
