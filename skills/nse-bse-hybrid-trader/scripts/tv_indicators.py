#!/usr/bin/env python3
"""Zero-compute TradingView cloud technical indicator scanner for NSE/BSE equities & indices.

Queries TradingView's cloud scanner API directly (https://scanner.tradingview.com/india/scan).
All mathematical calculations (RSI, MACD, EMAs, Stochastics, ADX, Bollinger, Ichimoku)
are performed on TradingView's cloud infrastructure in ~100-200ms.
Zero CPU strain on local PC, zero mandatory external pip dependencies (stdlib only).
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any

from nse_common import normalize_symbol
from nse_ui import UI, format_inr, format_pct

# Mapping of user-friendly timeframes to TradingView scanner column suffixes
TIMEFRAME_SUFFIXES: dict[str, str] = {
    "1m": "|1",
    "5m": "|5",
    "15m": "|15",
    "30m": "|30",
    "1h": "|60",
    "60m": "|60",
    "2h": "|120",
    "4h": "|240",
    "1d": "",
    "daily": "",
    "1w": "|1W",
    "weekly": "|1W",
    "1mth": "|1M",
    "monthly": "|1M",
}

# Catalog of known TradingView cloud scanner indicator columns
KNOWN_INDICATORS: dict[str, dict[str, Any]] = {
    "RSI": {
        "col": "RSI",
        "label": "RSI (14)",
        "unit": "",
        "guide": "Momentum gauge (<=30 oversold bounce zone, >=70 overbought)",
    },
    "MACD": {
        "col": "MACD.macd",
        "label": "MACD Line",
        "unit": "",
        "guide": "Moving average convergence line",
    },
    "MACD_SIGNAL": {
        "col": "MACD.signal",
        "label": "MACD Signal",
        "unit": "",
        "guide": "Signal line; MACD crossing above is bullish",
    },
    "STOCH_K": {
        "col": "Stoch.K",
        "label": "Stochastic %K",
        "unit": "",
        "guide": "Fast momentum line (<=20 oversold, >=80 overbought)",
    },
    "STOCH_D": {
        "col": "Stoch.D",
        "label": "Stochastic %D",
        "unit": "",
        "guide": "Slow stochastic signal average",
    },
    "STOCH_RSI": {
        "col": "Stoch.RSI.K",
        "label": "Stoch RSI",
        "unit": "",
        "guide": "Ultra-sensitive RSI stochastic oscillator",
    },
    "ADX": {
        "col": "ADX",
        "label": "ADX (Trend Str)",
        "unit": "",
        "guide": "Trend power (>25 strong trend, <20 weak sideways chop)",
    },
    "ADX_PLUS_DI": {
        "col": "ADX+DI",
        "label": "+DI Line",
        "unit": "",
        "guide": "Bullish directional component (+DI > -DI is bull)",
    },
    "ADX_MINUS_DI": {
        "col": "ADX-DI",
        "label": "-DI Line",
        "unit": "",
        "guide": "Bearish directional component (-DI > +DI is bear)",
    },
    "CCI": {
        "col": "CCI20",
        "label": "CCI (20)",
        "unit": "",
        "guide": "Commodity Channel Index (>+100 bull, <-100 bear)",
    },
    "MOMENTUM": {
        "col": "Mom",
        "label": "Momentum",
        "unit": "",
        "guide": "10-period rate of price change",
    },
    "AO": {
        "col": "AO",
        "label": "Awesome Osc",
        "unit": "",
        "guide": "Market momentum oscillator (>0 bullish)",
    },
    "WILLIAMS_R": {
        "col": "W.R",
        "label": "Williams %R",
        "unit": "",
        "guide": "Overbought/oversold indicator (>-20 overbought, <-80 oversold)",
    },
    "BB_POWER": {
        "col": "BBPower",
        "label": "Bull Bear Power",
        "unit": "",
        "guide": "Elder-Ray bull vs bear power balance (>0 bulls winning)",
    },
    "ATR": {
        "col": "ATR",
        "label": "ATR (14)",
        "unit": "INR",
        "guide": "Typical price swing; used for volatility-safe stops",
    },
    "VWAP": {
        "col": "VWAP",
        "label": "Volume Wtd Avg",
        "unit": "INR",
        "guide": "Volume-weighted average; buyers dominate above VWAP",
    },
    "EMA10": {
        "col": "EMA10",
        "label": "EMA (10)",
        "unit": "INR",
        "guide": "Fast 10-period exponential moving average",
    },
    "EMA20": {
        "col": "EMA20",
        "label": "EMA (20)",
        "unit": "INR",
        "guide": "Short-term trend average & immediate dynamic support",
    },
    "EMA50": {
        "col": "EMA50",
        "label": "EMA (50)",
        "unit": "INR",
        "guide": "Medium-term swing health trendline",
    },
    "EMA100": {
        "col": "EMA100",
        "label": "EMA (100)",
        "unit": "INR",
        "guide": "Intermediate major trend hurdle",
    },
    "EMA200": {
        "col": "EMA200",
        "label": "EMA (200)",
        "unit": "INR",
        "guide": "Institutional spine: Price > EMA200 signals bull market",
    },
    "SMA20": {
        "col": "SMA20",
        "label": "SMA (20)",
        "unit": "INR",
        "guide": "Standard 20-period simple moving average (Bollinger mid)",
    },
    "SMA50": {
        "col": "SMA50",
        "label": "SMA (50)",
        "unit": "INR",
        "guide": "50-day simple moving average",
    },
    "SMA200": {
        "col": "SMA200",
        "label": "SMA (200)",
        "unit": "INR",
        "guide": "200-day simple moving average (Golden/Death Cross baseline)",
    },
    "BB_UPPER": {
        "col": "BB.upper",
        "label": "Bollinger Upper",
        "unit": "INR",
        "guide": "+2 standard deviation resistance band",
    },
    "BB_LOWER": {
        "col": "BB.lower",
        "label": "Bollinger Lower",
        "unit": "INR",
        "guide": "-2 standard deviation support band",
    },
    "PIVOT_R1": {
        "col": "Pivot.M.Classic.R1",
        "label": "Classic R1",
        "unit": "INR",
        "guide": "Monthly Classic Pivot Resistance 1",
    },
    "PIVOT_S1": {
        "col": "Pivot.M.Classic.S1",
        "label": "Classic S1",
        "unit": "INR",
        "guide": "Monthly Classic Pivot Support 1",
    },
}

DEFAULT_COLUMNS = [
    "close",
    "change",
    "open",
    "high",
    "low",
    "volume",
    "Recommend.All",
    "Recommend.MA",
    "Recommend.Other",
]


def resolve_tv_symbol(ticker: str) -> str:
    """Map common Indian ticker inputs to TradingView scanner ticker format (e.g. NSE:BANKBARODA)."""
    raw = (ticker or "").strip().upper()
    if raw.startswith("NSE:") or raw.startswith("BSE:"):
        return raw

    # Check indices
    if raw in ("NIFTY", "NIFTY50", "NIFTY_50"):
        return "NSE:NIFTY"
    if raw in ("BANKNIFTY", "NIFTYBANK"):
        return "NSE:BANKNIFTY"
    if raw in ("FINNIFTY", "NIFTYFIN"):
        return "NSE:FINNIFTY"
    if raw == "SENSEX":
        return "BSE:SENSEX"

    norm = normalize_symbol(raw)
    base = norm["base"]
    exch = norm["exchange"] or "NSE"
    return f"{exch}:{base}"


def fetch_tv_technicals(
    symbols: list[str],
    timeframe: str = "1d",
    requested_indicators: list[str] | None = None,
    timeout: float = 10.0,
) -> list[dict[str, Any]]:
    """Query TradingView's India scanner cloud API in a single HTTP request (zero local math)."""
    tf_clean = (timeframe or "1d").lower().strip()
    suffix = TIMEFRAME_SUFFIXES.get(tf_clean, "")

    # Base columns
    cols_to_request = [f"{c}{suffix}" for c in DEFAULT_COLUMNS]

    # Map requested indicators
    ind_keys: list[str] = []
    if not requested_indicators or "all" in [i.lower() for i in requested_indicators]:
        ind_keys = list(KNOWN_INDICATORS.keys())
    else:
        for r in requested_indicators:
            r_up = r.strip().upper()
            matched = False
            for k, meta in KNOWN_INDICATORS.items():
                if r_up in (k, meta["col"].upper()):
                    ind_keys.append(k)
                    matched = True
                    break
            if not matched:
                # Custom column passed directly
                ind_keys.append(r_up)

    for k in ind_keys:
        col_name = KNOWN_INDICATORS[k]["col"] if k in KNOWN_INDICATORS else k
        target = f"{col_name}{suffix}"
        if target not in cols_to_request:
            cols_to_request.append(target)

    tv_symbols = [resolve_tv_symbol(s) for s in symbols]
    payload = {
        "symbols": {"tickers": tv_symbols},
        "columns": cols_to_request,
    }

    url = "https://scanner.tradingview.com/india/scan"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise RuntimeError(f"TradingView cloud scanner request failed: {e}") from e

    results: list[dict[str, Any]] = []
    for item in data.get("data", []):
        ticker_sym = item.get("s", "")
        row_vals = dict(zip(cols_to_request, item.get("d", [])))

        close = row_vals.get(f"close{suffix}")
        change = row_vals.get(f"change{suffix}")
        rec_all = row_vals.get(f"Recommend.All{suffix}")
        rec_ma = row_vals.get(f"Recommend.MA{suffix}")
        rec_other = row_vals.get(f"Recommend.Other{suffix}")

        # Interpret TradingView rating (-1.0 to +1.0)
        rating_label = "NEUTRAL"
        if rec_all is not None:
            if rec_all >= 0.5:
                rating_label = "STRONG_BUY"
            elif rec_all >= 0.1:
                rating_label = "BUY"
            elif rec_all <= -0.5:
                rating_label = "STRONG_SELL"
            elif rec_all <= -0.1:
                rating_label = "SELL"

        parsed_indicators: dict[str, dict[str, Any]] = {}
        for k in ind_keys:
            col_name = KNOWN_INDICATORS[k]["col"] if k in KNOWN_INDICATORS else k
            val = row_vals.get(f"{col_name}{suffix}")
            meta = KNOWN_INDICATORS.get(k, {"label": k, "unit": "", "guide": "Technical indicator"})
            parsed_indicators[k] = {
                "label": meta["label"],
                "value": val,
                "unit": meta["unit"],
                "guide": meta["guide"],
            }

        results.append({
            "ticker": ticker_sym,
            "timeframe": tf_clean,
            "close": close,
            "change_pct": change,
            "recommendation": {
                "score": rec_all,
                "stance": rating_label,
                "ma_score": rec_ma,
                "oscillators_score": rec_other,
            },
            "indicators": parsed_indicators,
        })

    return results


def format_human_tv_report(report: dict[str, Any], ui: UI | None = None) -> str:
    """Format TradingView technical results using nse_ui tables with zero local compute."""
    ui = ui or UI()
    ticker = report.get("ticker", "N/A")
    tf = report.get("timeframe", "1d").upper()
    close = report.get("close")
    chg = report.get("change_pct")
    rec = report.get("recommendation", {})
    stance = rec.get("stance", "NEUTRAL")
    score = rec.get("score")

    tone_map = {
        "STRONG_BUY": "good",
        "BUY": "good",
        "NEUTRAL": "warn",
        "SELL": "bad",
        "STRONG_SELL": "bad",
    }
    badge_tone = tone_map.get(stance, "info")

    chg_str = format_pct(chg, signed=True) if chg is not None else "N/A"
    price_str = format_inr(close) if close is not None else "N/A"
    score_str = f"{score:+.2f}" if score is not None else "N/A"

    meta_lines = [
        f"LTP: {price_str} ({chg_str})  |  TradingView Stance: {stance} (Score: {score_str})",
        f"Timeframe: {tf}  |  Calculated 100% on TradingView Cloud (Zero PC compute load)",
    ]

    out = [
        ui.banner(
            title=f"TRADINGVIEW CLOUD TECHNICALS  •  {ticker}",
            badge=stance,
            badge_tone=badge_tone,
            meta_lines=meta_lines,
        ),
        "",
        ui.section("Cloud Technical Indicators (TradingView Computed)"),
    ]

    table_rows: list[list[str]] = []
    indicators = report.get("indicators", {})

    for key, data in indicators.items():
        label = data.get("label", key)
        val = data.get("value")
        unit = data.get("unit", "")
        guide = data.get("guide", "")

        # Value string & reading interpretation
        if val is None:
            v_str = "N/A"
            reading = "N/A"
        elif isinstance(val, (int, float)):
            if unit == "INR":
                v_str = format_inr(val)
            else:
                v_str = f"{val:.2f}"

            # Smart readings for key indicators
            if key == "RSI":
                reading = "OVERBOUGHT (>=70)" if val >= 70 else ("OVERSOLD (<=30)" if val <= 30 else "NEUTRAL")
            elif key.startswith("EMA") or key.startswith("SMA"):
                if close is not None:
                    reading = "ABOVE_MA (Bull)" if close >= val else "BELOW_MA (Bear)"
                else:
                    reading = "MA Level"
            elif key == "ADX":
                reading = "STRONG (>=25)" if val >= 25 else "WEAK (<25)"
            elif key == "MACD":
                reading = "POSITIVE (+)" if val > 0 else "NEGATIVE (-)"
            elif key in ("STOCH_K", "STOCH_D", "STOCH_RSI"):
                reading = "OVERBOUGHT (>=80)" if val >= 80 else ("OVERSOLD (<=20)" if val <= 20 else "NEUTRAL")
            elif key == "BB_POWER":
                reading = "BULLS DOMINANT" if val > 0 else "BEARS DOMINANT"
            elif key == "VWAP":
                reading = "ABOVE_VWAP" if (close and close >= val) else "BELOW_VWAP"
            else:
                reading = "VALUE"
        else:
            v_str = str(val)
            reading = "INFO"

        table_rows.append([label, v_str, reading, guide])

    out.append(
        ui.table(
            headers=["Indicator", "Value", "Reading", "Beginner Guide"],
            rows=table_rows,
            alignments=["left", "right", "left", "left"],
            col_widths=[18, 14, 18, 38],
        )
    )

    out.append("")
    out.append(
        ui.callout(
            "TradingView Cloud Stance Takeaway",
            [
                f"Overall consensus is {stance} on the {tf} timeframe.",
                "TradingView computes these values across thousands of historical bars on its cloud servers.",
                "Combine this cloud momentum check with the local Risk Gate before sizing real capital.",
            ],
            tone_name=badge_tone,
        )
    )
    out.append("")
    out.append(ui.disclaimer())

    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Query TradingView cloud scanner technical indicators with zero PC compute load."
    )
    parser.add_argument(
        "--symbol",
        "-s",
        nargs="+",
        required=True,
        help="One or more ticker symbols (e.g. BANKBARODA, SUZLON, RELIANCE, NIFTY)",
    )
    parser.add_argument(
        "--timeframe",
        "-t",
        default="1d",
        choices=list(TIMEFRAME_SUFFIXES.keys()),
        help="Timeframe (1m, 5m, 15m, 30m, 1h, 1d, 1w, monthly). Default: 1d",
    )
    parser.add_argument(
        "--indicators",
        "-i",
        nargs="*",
        default=["RSI", "MACD", "EMA20", "EMA50", "EMA200", "ADX", "ATR", "VWAP", "STOCH_K", "BB_POWER"],
        help="Specific indicators to fetch (or 'all'). Default: core 10 indicators.",
    )
    parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args(argv)

    try:
        results = fetch_tv_technicals(
            symbols=args.symbol,
            timeframe=args.timeframe,
            requested_indicators=args.indicators,
        )
    except Exception as e:
        print(f"Error fetching TradingView technicals: {e}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(results, indent=2))
        return 0

    ui = UI()
    for res in results:
        print(format_human_tv_report(res, ui=ui))
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
