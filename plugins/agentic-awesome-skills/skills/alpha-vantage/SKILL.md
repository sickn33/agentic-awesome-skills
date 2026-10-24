---
name: alpha-vantage
description: "Access 20+ years of global financial data: equities, options, forex, crypto, commodities, economic indicators, and 50+ technical indicators."
risk: critical
source: community
date_added: "2026-03-06"
metadata:
    skill-author: K-Dense Inc.
---

# Alpha Vantage — Financial Market Data

Access 20+ years of global financial data: equities, options, forex, crypto, commodities, economic indicators, and 50+ technical indicators.

## API Key Setup (Required)

1. Get a free key at https://www.alphavantage.co/support/#api-key (premium plans available for higher rate limits)
2. Set as environment variable:

```bash
read -rsp "Alpha Vantage API key: " ALPHAVANTAGE_API_KEY
echo
export ALPHAVANTAGE_API_KEY
```

## Installation

```bash
uv pip install requests pandas
```

## Base URL & Request Pattern

All requests go to:

```
https://www.alphavantage.co/query?function=FUNCTION_NAME&apikey=YOUR_KEY&...params
```

```python
import requests
import os

API_KEY = os.environ.get("ALPHAVANTAGE_API_KEY")
BASE_URL = "https://www.alphavantage.co/query"

def av_get(function, **params):
    if not API_KEY:
        raise ValueError("Set ALPHAVANTAGE_API_KEY before requesting data")
    if "apikey" in params or "function" in params:
        raise ValueError("Reserved request parameters")
    try:
        response = requests.get(
            BASE_URL, params={**params, "function": function, "apikey": API_KEY},
            timeout=30,
        )
    except requests.RequestException:
        raise RuntimeError("Alpha Vantage transport failure; request URL redacted") from None
    # Avoid logging request URLs or raw HTTP exceptions: URLs contain the key.
    if not response.ok:
        raise RuntimeError(f"Alpha Vantage HTTP status {response.status_code}")
    try:
        data = response.json()
    except ValueError:
        raise RuntimeError("Alpha Vantage returned invalid JSON") from None
    if not isinstance(data, dict):
        raise RuntimeError("Alpha Vantage returned an unexpected response shape")
    if any(key in data for key in ("Error Message", "Note", "Information")):
        raise RuntimeError("API returned an error, quota, or entitlement message; inspect a redacted response")
    return data
```

## Quick Start Examples

```python
# Stock quote (latest price)
quote = av_get("GLOBAL_QUOTE", symbol="AAPL")
price = quote["Global Quote"]["05. price"]

# Daily OHLCV
daily = av_get("TIME_SERIES_DAILY", symbol="AAPL", outputsize="compact")
ts = daily["Time Series (Daily)"]

# Company fundamentals
overview = av_get("OVERVIEW", symbol="AAPL")
print(overview["MarketCapitalization"], overview["PERatio"])

# Income statement
income = av_get("INCOME_STATEMENT", symbol="AAPL")
annual = income["annualReports"][0]  # Most recent annual

# Crypto price
crypto = av_get("DIGITAL_CURRENCY_DAILY", symbol="BTC", market="USD")

# Economic indicator
gdp = av_get("REAL_GDP", interval="annual")

# Technical indicator
rsi = av_get("RSI", symbol="AAPL", interval="daily", time_period=14, series_type="close")
```

## API Categories

| Category | Key Functions |
|----------|--------------|
| **Time Series (Stocks)** | GLOBAL_QUOTE, TIME_SERIES_INTRADAY, TIME_SERIES_DAILY, TIME_SERIES_WEEKLY, TIME_SERIES_MONTHLY |
| **Options** | REALTIME_OPTIONS, HISTORICAL_OPTIONS |
| **Alpha Intelligence** | NEWS_SENTIMENT, EARNINGS_CALL_TRANSCRIPT, TOP_GAINERS_LOSERS, INSIDER_TRANSACTIONS, ANALYTICS_FIXED_WINDOW |
| **Fundamentals** | OVERVIEW, ETF_PROFILE, INCOME_STATEMENT, BALANCE_SHEET, CASH_FLOW, EARNINGS, DIVIDENDS, SPLITS |
| **Forex (FX)** | CURRENCY_EXCHANGE_RATE, FX_INTRADAY, FX_DAILY, FX_WEEKLY, FX_MONTHLY |
| **Crypto** | CURRENCY_EXCHANGE_RATE, CRYPTO_INTRADAY, DIGITAL_CURRENCY_DAILY |
| **Commodities** | WTI (crude oil), BRENT, NATURAL_GAS, COPPER, WHEAT, CORN, COFFEE, ALL_COMMODITIES |
| **Economic Indicators** | REAL_GDP, TREASURY_YIELD, FEDERAL_FUNDS_RATE, CPI, INFLATION, UNEMPLOYMENT, NONFARM_PAYROLL |
| **Technical Indicators** | SMA, EMA, MACD, RSI, BBANDS, STOCH, ADX, ATR, OBV, VWAP, and 40+ more |

## Common Parameters

| Parameter | Values | Notes |
|-----------|--------|-------|
| `outputsize` | `compact` / `full` | For applicable time-series endpoints; depth and entitlement vary |
| `datatype` | `json` / `csv` | Default: json |
| `interval` | `1min`, `5min`, `15min`, `30min`, `60min`, `daily`, `weekly`, `monthly` | Depends on endpoint |
| `adjusted` | `true` / `false` | Adjust for splits/dividends |

## Rate Limits

- Free tier: 25 requests/day (as of 2026)
- Premium plans: higher limits, real-time data, intraday access
- Quota or entitlement messages may arrive in JSON even with HTTP 200; check `Note` and `Information` as well as HTTP status.
- A short delay cannot satisfy a daily quota. Cache results, track the account request budget, and stop when exhausted. Verify current limits and endpoint entitlements in [official support](https://www.alphavantage.co/support/) and [API documentation](https://www.alphavantage.co/documentation/).

## Error Handling

```python
data = av_get("GLOBAL_QUOTE", symbol="AAPL")

# Check for API errors
if "Error Message" in data:
    raise ValueError(f"API Error: {data['Error Message']}")
if "Note" in data:
    print(f"Rate limit warning: {data['Note']}")
if "Information" in data:
    print(f"API info: {data['Information']}")
```


## When to Use
Use this skill when tackling tasks related to its primary domain or functionality as described above.

## Limitations
- Quotes may be end-of-day or delayed depending on entitlement. Report timestamps and adjustment basis; market-data retrieval is not investment advice. API responses and empty reports need schema checks before indexing.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
