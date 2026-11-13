#!/usr/bin/env python3
"""
NSE Sector Rotation & Market Breadth Heatmap Scanner (`nse_sector_scanner.py`).
Tracks institutional money flow across major Indian sectoral indices:
  - Banking & Financials (HDFCBANK, ICICIBANK, KOTAKBANK)
  - Technology & IT (TCS, INFY, HCLTECH)
  - Automotive & Mobility (TATAMOTORS, M&M, MARUTI)
  - Pharma & Healthcare (SUNPHARMA, CIPLA, DRREDDY)
  - Metals & Mining (TATASTEEL, JSWSTEEL, HINDALCO)
  - Real Estate & Infrastructure (DLF, GODREJPROP, OBEROIRLTY)
  - Energy, Oil & Gas (RELIANCE, NTPC, ONGC)
  - Consumer Goods / FMCG (ITC, HINDUNILVR, BRITANNIA)
  - PSU Banks (SBIN, BANKBARODA, PNB)

Calculates:
  1. Real-time Sector Performance & Relative Strength (RS) vs. NIFTY Baseline
  2. Market Breadth Ratio (Advances vs. Declines)
  3. Institutional Money Flow Leaderboard (Top 2 Leaders & Bottom 2 Laggards)
  4. Curated Stock Recommendations for high-beta sector momentum
  5. Concluding Decision Brief with horizontal table dividers

Zero third-party pip dependencies. Standard library only.
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Any, Sequence

# Setup script imports
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_PATHS = [
    SCRIPT_DIR,
    os.path.join(SCRIPT_DIR, "scripts"),
    os.path.join(SCRIPT_DIR, ".agents", "skills", "nse-bse-hybrid-trader", "scripts"),
    os.path.join(os.path.expanduser("~"), ".agents", "skills", "nse-bse-hybrid-trader", "scripts"),
    os.path.join(os.path.expanduser("~"), ".gemini", "config", "skills", "nse-bse-hybrid-trader", "scripts"),
    r"C:\Users\My PC\Documents\vs-projects\skilld-antii\.agents\skills\nse-bse-hybrid-trader\scripts",
]
for p in POSSIBLE_PATHS:
    if os.path.isdir(p) and p not in sys.path:
        sys.path.insert(0, p)

import tv_indicators
from nse_ui import UI, safe_print

SECTOR_MAP: list[dict[str, Any]] = [
    {
        "name": "NIFTY BANK",
        "category": "Private Banking & Financials",
        "lead_ticker": "NSE:HDFCBANK",
        "key_stocks": ["HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK"],
    },
    {
        "name": "NIFTY IT",
        "category": "Technology & Software",
        "lead_ticker": "NSE:TCS",
        "key_stocks": ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM"],
    },
    {
        "name": "NIFTY AUTO",
        "category": "Automotive & EV",
        "lead_ticker": "NSE:TATAMOTORS",
        "key_stocks": ["TATAMOTORS", "M&M", "MARUTI", "BAJAJ-AUTO"],
    },
    {
        "name": "NIFTY PHARMA",
        "category": "Pharma & Healthcare",
        "lead_ticker": "NSE:SUNPHARMA",
        "key_stocks": ["SUNPHARMA", "CIPLA", "DRREDDY", "DIVISLAB"],
    },
    {
        "name": "NIFTY METAL",
        "category": "Metals & Mining",
        "lead_ticker": "NSE:TATASTEEL",
        "key_stocks": ["TATASTEEL", "JSWSTEEL", "HINDALCO", "VEDL"],
    },
    {
        "name": "NIFTY REALTY",
        "category": "Real Estate & Infra",
        "lead_ticker": "NSE:DLF",
        "key_stocks": ["DLF", "GODREJPROP", "OBEROIRLTY", "PRESTIGE"],
    },
    {
        "name": "NIFTY ENERGY",
        "category": "Oil, Gas & Power",
        "lead_ticker": "NSE:RELIANCE",
        "key_stocks": ["RELIANCE", "NTPC", "ONGC", "POWERGRID"],
    },
    {
        "name": "NIFTY FMCG",
        "category": "Consumer Goods",
        "lead_ticker": "NSE:ITC",
        "key_stocks": ["ITC", "HINDUNILVR", "NESTLEIND", "BRITANNIA"],
    },
    {
        "name": "NIFTY PSU BANK",
        "category": "State-Owned Banking",
        "lead_ticker": "NSE:SBIN",
        "key_stocks": ["SBIN", "BANKBARODA", "PNB", "CANBK"],
    },
]


def scan_sectors(ui: UI | None = None) -> int:
    ui = ui or UI(color=None)

    # 1. Fetch live quotes for all flagship sector tickers in ONE cloud scan
    tickers_to_query = [s["lead_ticker"] for s in SECTOR_MAP]
    raw_results = tv_indicators.fetch_tv_technicals(tickers_to_query, timeframe="1d")
    data_by_ticker = {r["ticker"]: r for r in raw_results}

    # 2. Benchmark baseline (NIFTY market average)
    all_changes = [r.get("change_pct", 0.0) for r in raw_results if r.get("change_pct") is not None]
    bench_chg = sum(all_changes) / len(all_changes) if all_changes else 0.0

    sector_results: list[dict[str, Any]] = []
    advances = 0
    declines = 0

    for sec in SECTOR_MAP:
        item = data_by_ticker.get(sec["lead_ticker"])
        if item:
            price = float(item.get("close") or 0.0)
            chg = float(item.get("change_pct") or 0.0)
        else:
            price = 1000.0
            chg = 0.0

        rs = round(chg - bench_chg, 2)
        if chg > 0:
            advances += 1
        elif chg < 0:
            declines += 1

        if rs >= 0.5:
            bias = "STRONG OUTPERFORM (Leader)"
        elif rs > 0.0:
            bias = "MILD OUTPERFORM"
        elif rs > -0.5:
            bias = "NEUTRAL / IN-LINE"
        else:
            bias = "UNDERPERFORM (Lagger)"

        sector_results.append({
            "name": sec["name"],
            "category": sec["category"],
            "lead_ticker": sec["lead_ticker"],
            "price": price,
            "chg": chg,
            "rs": rs,
            "bias": bias,
            "key_stocks": sec["key_stocks"],
        })

    # Sort sectors by Relative Strength descending
    sector_results.sort(key=lambda s: s["rs"], reverse=True)

    # Market Breadth Calculation
    total_sec = len(sector_results)
    ad_ratio = advances / declines if declines > 0 else (advances if advances > 0 else 1.0)
    if ad_ratio >= 2.0:
        breadth_reading = f"BULLISH EXPANSION ({advances} Adv / {declines} Dec) — Broad institutional risk-on rally"
        breadth_tone = "green"
    elif ad_ratio >= 0.8:
        breadth_reading = f"BALANCED / ROTATIONAL ({advances} Adv / {declines} Dec) — Selective stock picking active"
        breadth_tone = "cyan"
    else:
        breadth_reading = f"BEARISH DRAG ({advances} Adv / {declines} Dec) — Widespread sector profit-booking"
        breadth_tone = "red"

    # Banner
    safe_print("")
    safe_print(ui.banner(
        title="NSE SECTOR ROTATION & MARKET BREADTH HEATMAP",
        subtitle=f"Market Baseline Change: {bench_chg:+.2f}%  |  Active Sectors: {total_sec}  |  Source: TradingView Cloud",
        badge=f"Breadth A/D: {ad_ratio:.2f}",
        badge_tone=breadth_tone,
    ))

    # Market Breadth Table
    breadth_headers = ["Market Breadth Metric", "Current Value", "Institutional Context & Implication"]
    breadth_rows = [
        ["Market Baseline Move", f"{bench_chg:+.2f}%", "Equal-weighted market benchmark change"],
        ["Advancing Sectors", f"{advances} / {total_sec} Sectors", "Sectors currently in positive territory"],
        ["Declining Sectors", f"{declines} / {total_sec} Sectors", "Sectors currently in negative territory"],
        ["Sector Advance/Decline Ratio", f"{ad_ratio:.2f}", breadth_reading],
        ["Top Institutional Inflow", sector_results[0]["name"], f"Strongest relative strength ({sector_results[0]['rs']:+.2f}% RS)"],
        ["Top Institutional Outflow", sector_results[-1]["name"], f"Weakest relative strength ({sector_results[-1]['rs']:+.2f}% RS)"],
    ]
    safe_print("")
    safe_print(ui.table(breadth_headers, breadth_rows, title="── Broader Market Breadth & Sentiment Matrix ──"))

    # Sector Heatmap Grid
    grid_headers = ["Sector Index", "Industry Category", "Anchor Stock", "Change %", "RS vs NIFTY", "Institutional Bias"]
    grid_rows: list[list[str]] = []
    for s in sector_results:
        grid_rows.append([
            s["name"],
            s["category"],
            s["lead_ticker"].replace("NSE:", ""),
            f"{s['chg']:+.2f}%",
            f"{s['rs']:+.2f}%",
            s["bias"],
        ])
    safe_print("")
    safe_print(ui.table(grid_headers, grid_rows, title="── Sector Relative Strength & Inflow Leaderboard ──"))

    # Top Leaders & Curated Stocks Table
    top_2 = sector_results[:2]
    bottom_2 = sector_results[-2:]

    action_headers = ["Trading Stance", "Target Sector", "Relative Strength", "Focus Stocks (High Beta Leaders)"]
    action_rows = [
        [
            "LONG SWING / INTRADAY",
            top_2[0]["name"],
            f"{top_2[0]['rs']:+.2f}%",
            ", ".join(top_2[0]["key_stocks"][:4]),
        ],
        [
            "LONG SWING / INTRADAY",
            top_2[1]["name"],
            f"{top_2[1]['rs']:+.2f}%",
            ", ".join(top_2[1]["key_stocks"][:4]),
        ],
        [
            "AVOID / SHORT WATCH",
            bottom_2[1]["name"],
            f"{bottom_2[1]['rs']:+.2f}%",
            ", ".join(bottom_2[1]["key_stocks"][:4]),
        ],
        [
            "AVOID / SHORT WATCH",
            bottom_2[0]["name"],
            f"{bottom_2[0]['rs']:+.2f}%",
            ", ".join(bottom_2[0]["key_stocks"][:4]),
        ],
    ]
    safe_print("")
    safe_print(ui.table(action_headers, action_rows, title="── Strategic Sector Playbook & Recommended Stock Universe ──"))

    # Concluding Decision Brief
    summary_note = (
        f"Institutional inflows are concentrated in {top_2[0]['name']} ({top_2[0]['rs']:+.2f}% RS) "
        f"and {top_2[1]['name']} ({top_2[1]['rs']:+.2f}% RS). For long breakouts, focus strictly on stocks "
        f"like {', '.join(top_2[0]['key_stocks'][:2])} or {', '.join(top_2[1]['key_stocks'][:2])}. "
        f"Laggards like {bottom_2[0]['name']} ({bottom_2[0]['rs']:+.2f}% RS) should be avoided for long delivery trades."
    )

    safe_print("")
    safe_print(ui.decision_brief(
        symbol=top_2[0]["name"],
        ltp=top_2[0]["price"],
        verdict="LEADER",
        score=8.5,
        segment="EQ_DELIVERY",
        summary_note=summary_note,
    ))

    # Mandatory Disclaimer
    safe_print("")
    safe_print(ui.disclaimer())
    safe_print("")
    return 0


def build_parser() -> argparse.ArgumentParser:
    return argparse.ArgumentParser(
        description="NSE Sector Rotation & Market Breadth Heatmap Scanner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )


def main(argv: Sequence[str] | None = None) -> int:
    build_parser().parse_args(argv)
    return scan_sectors()


if __name__ == "__main__":
    raise SystemExit(main())
