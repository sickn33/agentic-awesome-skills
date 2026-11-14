#!/usr/bin/env python3
"""
NSE/BSE Watchlist Opportunity & Trade Setup Scanner (`scan_watchlist.py`).
Standard library only. Designed for Indian markets:
  - Scans custom watchlist files, pools (nifty50, niftybank, fno), or ad-hoc tickers
  - Leverages TradingView Cloud Scanner (32+ indicators, 0% local CPU)
  - Automatically calculates Dynamic Entry, Stop-Loss, Target, and R:R
  - Computes Holding Timeframes (Minutes for intraday/options, Days/Weeks for delivery)
  - Brainstorms setup context (EMA200 spine, VWAP control, RSI, ADX trend, Pivots)
  - Supports all 4 Indian segments: EQ_DELIVERY, EQ_INTRADAY, FNO_FUT, FNO_OPT
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Any, Sequence

# Add scripts directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.join(SCRIPT_DIR, ".agents", "skills", "nse-bse-hybrid-trader", "scripts")
if not os.path.isdir(SKILL_DIR):
    SKILL_DIR = os.path.join(os.path.expanduser("~"), ".agents", "skills", "nse-bse-hybrid-trader", "scripts")
if not os.path.isdir(SKILL_DIR):
    SKILL_DIR = SCRIPT_DIR

if SKILL_DIR not in sys.path:
    sys.path.insert(0, SKILL_DIR)

from nse_ui import UI, safe_print
import nse_common
import tv_indicators

# Built-in fallback symbols for NIFTY 50
BUILTIN_NIFTY50 = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO",
    "BAJFINANCE", "BAJAJFINSV", "BEL", "BPCL", "BHARTIARTL", "BRITANNIA",
    "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH",
    "HDFCBANK", "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK",
    "ITC", "INDUSINDBK", "INFY", "JSWSTEEL", "KOTAKBANK", "LT",
    "M&M", "MARUTI", "NTPC", "NESTLEIND", "ONGC", "POWERGRID",
    "RELIANCE", "SBILIFE", "SHRIRAMFIN", "SBIN", "SUNPHARMA", "TCS",
    "TATACONSUM", "TATAMOTORS", "TATASTEEL", "TECHM", "TITAN", "TRENT",
    "ULTRACEMCO", "WIPRO"
]

BUILTIN_NIFTYBANK = [
    "AUBANK", "AXISBANK", "BANDHANBNK", "BANKBARODA", "FEDERALBNK",
    "HDFCBANK", "ICICIBANK", "IDFCFIRSTB", "INDUSINDBK", "KOTAKBANK",
    "PNB", "SBIN"
]


def load_symbols_from_source(
    symbols_arg: list[str] | None = None,
    file_path: str | None = None,
    pool: str | None = None,
) -> list[str]:
    """Resolve symbol list from symbols, file, or pool."""
    syms: list[str] = []
    if symbols_arg:
        for s in symbols_arg:
            syms.extend([x.strip().upper() for x in s.replace(",", " ").split() if x.strip()])

    if file_path and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                clean = line.strip().upper()
                if clean and not clean.startswith("#"):
                    syms.append(clean.split(",")[0].strip())

    if pool:
        p = pool.lower().replace("-", "").replace("_", "")
        if "bank" in p:
            syms.extend(BUILTIN_NIFTYBANK)
        else:
            syms.extend(BUILTIN_NIFTY50)

    # Deduplicate preserving order
    seen = set()
    deduped = []
    for s in syms:
        base = s.replace(".NS", "").replace(".BO", "")
        if base not in seen:
            seen.add(base)
            deduped.append(base)
    return deduped


def calculate_opportunity_setup(
    ticker_data: dict[str, Any],
    segment: str = "EQ_DELIVERY",
) -> dict[str, Any]:
    """
    Calculate dynamic entry, stop loss, target, timeframe, and setup brainstorming
    from technical indicators and market structure.
    """
    symbol = ticker_data["ticker"].replace("NSE:", "").replace("BSE:", "")
    ltp = float(ticker_data.get("close") or 0.0)
    inds = ticker_data.get("indicators", {})

    atr = float(inds.get("ATR", {}).get("value") or (ltp * 0.02))
    vwap = float(inds.get("VWAP", {}).get("value") or ltp)
    ema20 = float(inds.get("EMA20", {}).get("value") or ltp)
    ema50 = float(inds.get("EMA50", {}).get("value") or ltp)
    ema200 = float(inds.get("EMA200", {}).get("value") or ltp)
    rsi = float(inds.get("RSI", {}).get("value") or 50.0)
    adx = float(inds.get("ADX", {}).get("value") or 20.0)
    rec = ticker_data.get("recommendation", {})
    score = float(rec.get("score") or 0.0)

    # Determine Stance & Side
    if score >= 0.15 or (ltp > ema200 and rsi > 55):
        side = "BUY"
    elif score <= -0.15 or (ltp < ema200 and rsi < 45):
        side = "SELL"
    else:
        side = "NEUTRAL"

    # Segment specific rules
    if segment == "EQ_DELIVERY":
        # Delivery Swing (Days to Weeks)
        timeframe_desc = "1 to 3 Weeks"
        if side == "BUY":
            entry = ltp
            stop = nse_common.round_tick(max(ltp - (1.5 * atr), ema50 * 0.98))
            target = nse_common.round_tick(ltp + (2.5 * atr))
        else:
            entry = ltp
            stop = nse_common.round_tick(ltp + (1.5 * atr))
            target = nse_common.round_tick(max(0.05, ltp - (2.5 * atr)))

    elif segment == "EQ_INTRADAY":
        # Intraday Equity (15m to 3 hours, exit before 15:15 IST)
        timeframe_desc = "15m - 3 Hrs (Cut: 15:15 IST)"
        if side == "BUY":
            entry = ltp
            stop = nse_common.round_tick(min(ltp - (1.0 * atr), vwap * 0.995))
            target = nse_common.round_tick(ltp + (1.8 * atr))
        else:
            entry = ltp
            stop = nse_common.round_tick(max(ltp + (1.0 * atr), vwap * 1.005))
            target = nse_common.round_tick(max(0.05, ltp - (1.8 * atr)))

    elif segment == "FNO_FUT":
        # Futures (1 to 5 Days)
        timeframe_desc = "1 to 5 Days (Swing)"
        if side == "BUY":
            entry = ltp
            stop = nse_common.round_tick(ltp - (1.8 * atr))
            target = nse_common.round_tick(ltp + (3.0 * atr))
        else:
            entry = ltp
            stop = nse_common.round_tick(ltp + (1.8 * atr))
            target = nse_common.round_tick(max(0.05, ltp - (3.0 * atr)))

    else:  # FNO_OPT
        # Options Premium (Minutes to 1 Day)
        timeframe_desc = "15m - 1 Day (Theta Risk!)"
        entry = ltp
        if side == "BUY":
            stop = nse_common.round_tick(ltp * 0.75)  # -25% option stop
            target = nse_common.round_tick(ltp * 1.50)  # +50% target
        else:
            stop = nse_common.round_tick(ltp * 1.25)
            target = nse_common.round_tick(max(0.05, ltp * 0.50))

    risk_per_share = abs(entry - stop)
    reward_per_share = abs(target - entry)
    rr_ratio = (reward_per_share / risk_per_share) if risk_per_share > 0 else 1.0

    # Brainstorming setup notes
    notes = []
    if ltp >= ema200:
        notes.append("Above 200 EMA (Bull spine)")
    else:
        notes.append("Below 200 EMA (Bear spine)")

    if ltp >= vwap:
        notes.append("Above VWAP (Buyer control)")
    else:
        notes.append("Below VWAP (Seller pressure)")

    if rsi >= 70:
        notes.append(f"RSI={rsi:.0f} (Overbought/Strong Momentum)")
    elif rsi <= 30:
        notes.append(f"RSI={rsi:.0f} (Oversold bounce watch)")
    else:
        notes.append(f"RSI={rsi:.0f}")

    if adx >= 25:
        notes.append(f"ADX={adx:.0f} (Confirmed Trend)")
    else:
        notes.append(f"ADX={adx:.0f} (Consolidation/Chop)")

    brainstorm_summary = ", ".join(notes)

    return {
        "symbol": symbol,
        "side": side,
        "segment": segment,
        "ltp": ltp,
        "entry": entry,
        "stop": stop,
        "target": target,
        "risk_pct": (risk_per_share / entry * 100.0) if entry > 0 else 0.0,
        "reward_pct": (reward_per_share / entry * 100.0) if entry > 0 else 0.0,
        "rr_ratio": rr_ratio,
        "timeframe": timeframe_desc,
        "score": score,
        "brainstorm": brainstorm_summary,
    }


def scan_watchlist_opportunities(
    symbols: list[str],
    segment: str = "EQ_DELIVERY",
    timeframe: str = "1d",
    indicators: list[str] | None = None,
    filter_stance: str | None = None,
) -> list[dict[str, Any]]:
    """Scan watchlist via TradingView cloud scanner and evaluate opportunities."""
    ui = UI(color=None)
    req_inds = indicators or ["RSI", "MACD", "EMA20", "EMA50", "EMA200", "ADX", "ATR", "VWAP", "PIVOT_R1", "PIVOT_S1"]
    if "ATR" not in req_inds:
        req_inds.append("ATR")
    if "VWAP" not in req_inds:
        req_inds.append("VWAP")
    if "EMA200" not in req_inds:
        req_inds.append("EMA200")

    safe_print(ui.cyan(f"  Fetching cloud technicals for {len(symbols)} symbols from TradingView ({timeframe})..."))
    raw_results = tv_indicators.fetch_tv_technicals(symbols, timeframe=timeframe, requested_indicators=req_inds)

    opportunities = []
    for item in raw_results:
        opp = calculate_opportunity_setup(item, segment=segment)
        if filter_stance:
            if filter_stance.upper() not in opp["side"].upper():
                continue
        opportunities.append(opp)

    # Sort by absolute score descending (highest conviction first)
    opportunities.sort(key=lambda x: abs(x["score"]), reverse=True)
    return opportunities


def format_scanner_table(opportunities: list[dict[str, Any]], segment: str) -> str:
    """Format opportunities into beginner-friendly terminal tables."""
    ui = UI(color=None)
    blocks = []

    blocks.append(
        ui.banner(
            title=f"NSE/BSE WATCHLIST OPPORTUNITY SCANNER  •  {segment}",
            subtitle=f"Found {len(opportunities)} developing setups analyzed via TradingView Cloud",
            badge="ACTIVE",
            badge_tone="good",
        )
    )
    blocks.append("")

    headers = ["Symbol", "Side", "LTP (INR)", "Planned Entry", "Stop-Loss", "Target", "Net R:R", "Holding Timeframe", "Setup Brainstorming"]
    rows = []
    for o in opportunities:
        side_fmt = ui.green("BUY", bold=True) if o["side"] == "BUY" else (ui.red("SELL", bold=True) if o["side"] == "SELL" else ui.dim("NEUTRAL"))
        sl_fmt = f"Rs.{o['stop']:,.2f} (-{o['risk_pct']:.1f}%)"
        tgt_fmt = f"Rs.{o['target']:,.2f} (+{o['reward_pct']:.1f}%)"
        rr_fmt = f"1:{o['rr_ratio']:.1f}"

        rows.append([
            ui.bold(o["symbol"]),
            side_fmt,
            f"Rs.{o['ltp']:,.2f}",
            f"Rs.{o['entry']:,.2f}",
            sl_fmt,
            tgt_fmt,
            rr_fmt,
            o["timeframe"],
            o["brainstorm"],
        ])

    blocks.append(
        ui.table(
            headers=headers,
            rows=rows,
            alignments=["left", "center", "right", "right", "left", "left", "center", "left", "left"],
            nowrap_cols={0, 1, 2, 3, 6, 7},
        )
    )
    blocks.append("")
    blocks.append(
        ui.callout(
            "Beginner Guide to Levels & Holding Timeframes",
            [
                "• Dynamic Stops: Sized using true Average True Range (ATR) so normal noise doesn't stop you out.",
                "• Targets: Set to realistic Fibonacci/Pivot structural barriers with minimum 1:1.5 to 1:2.0 Risk-Reward.",
                "• Options Caution: FNO_OPT setups carry heavy Theta decay; exit quickly or trail stops aggressively.",
            ],
            tone_name="info",
        )
    )
    blocks.append("")
    blocks.append(ui.disclaimer())
    return "\n".join(blocks)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="NSE/BSE Watchlist Opportunity & Trade Setup Scanner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("symbols", nargs="*", help="Ticker symbols (e.g. RELIANCE SUZLON TATAMOTORS)")
    p.add_argument("--file", "-f", default=None, help="Watchlist text file path (one symbol per line)")
    p.add_argument("--pool", "-p", choices=["nifty50", "niftybank", "fno"], default=None, help="Built-in pool of Indian stocks")
    p.add_argument("--segment", choices=["EQ_DELIVERY", "EQ_INTRADAY", "FNO_FUT", "FNO_OPT"], default="EQ_DELIVERY", help="Trading segment")
    p.add_argument("--timeframe", "-t", default="1d", choices=list(tv_indicators.TIMEFRAME_SUFFIXES.keys()), help="Timeframe (15m, 1h, 1d, 1w)")
    p.add_argument("--indicators", "-i", nargs="*", default=None, help="Specific indicators to calculate (or all)")
    p.add_argument("--filter", choices=["BUY", "SELL", "ALL"], default="ALL", help="Filter by stance")
    p.add_argument("--json", action="store_true", help="Output JSON format")
    return p


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    symbols = load_symbols_from_source(symbols_arg=args.symbols, file_path=args.file, pool=args.pool)
    if not symbols:
        symbols = BUILTIN_NIFTY50[:10]  # Default to top 10 Nifty stocks

    filter_s = None if args.filter == "ALL" else args.filter
    opps = scan_watchlist_opportunities(
        symbols=symbols,
        segment=args.segment,
        timeframe=args.timeframe,
        indicators=args.indicators,
        filter_stance=filter_s,
    )

    if args.json:
        import json
        print(json.dumps(opps, indent=2))
    else:
        safe_print(format_scanner_table(opps, segment=args.segment))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
