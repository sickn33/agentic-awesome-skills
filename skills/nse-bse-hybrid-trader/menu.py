#!/usr/bin/env python3
"""
NSE/BSE Interactive Skill Selector & Indicator Menu (`menu.py`).
Standard library only. Allows users to:
  1. Interactively choose which pipeline modules/skills to run
  2. Interactively select technical indicators from TradingView Cloud Scanner
  3. View ready-to-run CLI commands or execute them immediately
  4. Display quick references & guides for all Indian trader skills
"""
from __future__ import annotations

import os
import sys
from typing import Any

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
import tv_indicators

# Available skill modules in the Indian Day Trader Suite
AVAILABLE_SKILLS = [
    {
        "id": "clock",
        "name": "Market Clock & Session Timeline",
        "script": "nse_alerts.py clock",
        "desc": "Check NSE/BSE IST time, market status (OPEN/CLOSED), holiday calendar, and auto-squareoff window (15:10 IST).",
        "default": True,
    },
    {
        "id": "news",
        "name": "Financial News & Sentiment Feed",
        "script": "nse_news.py",
        "desc": "Multi-source news scanner (Google News, NSE/BSE corporate filings, SEBI press releases) with sentiment scoring.",
        "default": True,
    },
    {
        "id": "tv",
        "name": "TradingView Cloud Indicators",
        "script": "tv_indicators.py",
        "desc": "Fetch 32+ indicators (RSI, MACD, ADX, VWAP, EMAs, Stoch, Pivots) calculated on TradingView servers (0% PC CPU).",
        "default": True,
    },
    {
        "id": "structure",
        "name": "Local Confluence & Market Structure",
        "script": "nse_data_loader.py",
        "desc": "Multi-timeframe EMAs (9/21/50/200), intraday VWAP, 15m ORH/ORL, Volume, and NSE Delivery % confluence.",
        "default": True,
    },
    {
        "id": "scanner",
        "name": "Daily Setup & 15m ORB Scanner",
        "script": "nse_scanner.py",
        "desc": "Fast market scanner for NIFTY50, NIFTY NEXT50, NIFTY500, or F&O universe (Daily setups & 15m ORB breakouts).",
        "default": False,
    },
    {
        "id": "timemachine",
        "name": "Monte Carlo Time Machine",
        "script": "nse_timemachine.py",
        "desc": "10,000-path probabilistic Monte Carlo simulation using historical Indian drift & ATR volatility.",
        "default": True,
    },
    {
        "id": "riskgate",
        "name": "Indian Risk Gate & 2026 Statutory Tax Sizing",
        "script": "indian_risk_gate.py",
        "desc": "Hard capital preservation gate calculating 2026 STT, GST (18%), Stamp Duty, SEBI turnover fees, and net R:R.",
        "default": True,
    },
    {
        "id": "staging",
        "name": "Multi-Broker Order Staging",
        "script": "broker_bridge.py",
        "desc": "Generates staged paper/live tickets for 9 Indian brokers (Zerodha, Angel One, Upstox, Dhan, Groww, etc.).",
        "default": True,
    },
    {
        "id": "alerts",
        "name": "Price Alerts & Live Watch Monitor",
        "script": "nse_alerts.py watch",
        "desc": "Monitors target, stop loss, and 15:10 IST square-off alerts with terminal audio beeps.",
        "default": False,
    },
]


def print_indicator_catalog() -> None:
    """Print the complete formatted catalog of available TradingView indicators."""
    ui = UI(color=None)
    safe_print("")
    safe_print(ui.bold(ui.yellow("=" * 86)))
    safe_print(ui.bold(ui.yellow("   AVAILABLE TRADINGVIEW CLOUD INDICATORS (0% LOCAL CPU / CALCULATED IN CLOUD)")))
    safe_print(ui.bold(ui.yellow("=" * 86)))

    categories: dict[str, list[tuple[str, str, str]]] = {
        "MOMENTUM & OSCILLATORS": [
            ("RSI", "RSI (14)", "Momentum gauge (<=30 oversold bounce zone, >=70 overbought)"),
            ("MACD", "MACD Line", "Moving average convergence divergence line"),
            ("MACD_SIGNAL", "MACD Signal", "Signal line; MACD crossing above is bullish"),
            ("STOCH_K", "Stochastic %K", "Fast momentum line (<=20 oversold, >=80 overbought)"),
            ("STOCH_D", "Stochastic %D", "Slow stochastic signal average line"),
            ("STOCH_RSI", "Stoch RSI", "Ultra-sensitive RSI stochastic oscillator"),
            ("CCI", "CCI (20)", "Commodity Channel Index (>+100 bullish, <-100 bearish)"),
            ("MOMENTUM", "Momentum", "10-period rate of price change"),
            ("AO", "Awesome Osc", "Market momentum oscillator (>0 bullish)"),
            ("WILLIAMS_R", "Williams %R", "Overbought/oversold indicator (>-20 overbought, <-80 oversold)"),
            ("BB_POWER", "Bull Bear Power", "Elder-Ray bull vs bear power balance (>0 bulls in control)"),
        ],
        "TREND & MOVING AVERAGES": [
            ("ADX", "ADX (14)", "Trend strength filter (>25 strong trend, <20 weak sideways chop)"),
            ("ADX_PLUS_DI", "+DI Line", "Bullish directional component (+DI > -DI is bull trend)"),
            ("ADX_MINUS_DI", "-DI Line", "Bearish directional component (-DI > +DI is bear trend)"),
            ("EMA10", "EMA (10)", "Fast 10-period exponential moving average"),
            ("EMA20", "EMA (20)", "Short-term trend average & immediate dynamic support/resistance"),
            ("EMA50", "EMA (50)", "Medium-term swing health trendline"),
            ("EMA100", "EMA (100)", "Intermediate major trend hurdle"),
            ("EMA200", "EMA (200)", "Institutional spine: Price > EMA200 signals bull market"),
            ("SMA20", "SMA (20)", "Standard 20-period simple moving average (Bollinger mid-band)"),
            ("SMA50", "SMA (50)", "50-day simple moving average"),
            ("SMA200", "SMA (200)", "200-day simple moving average (Golden/Death Cross baseline)"),
        ],
        "VOLATILITY, VOLUME & BANDS": [
            ("ATR", "ATR (14)", "Average True Range in INR; used for volatility-safe stops"),
            ("VWAP", "VWAP", "Volume-Weighted Average Price; intraday institutional benchmark"),
            ("BB_UPPER", "Bollinger Upper", "+2 standard deviation resistance band"),
            ("BB_LOWER", "Bollinger Lower", "-2 standard deviation support band"),
            ("PIVOT_R1", "Classic R1", "Monthly Classic Pivot Resistance 1"),
            ("PIVOT_S1", "Classic S1", "Monthly Classic Pivot Support 1"),
        ],
    }

    for cat_name, items in categories.items():
        safe_print("")
        safe_print(ui.bold(ui.cyan(f"── {cat_name} ────────────────────────────────────────────────────────")))
        rows = [[code, label, desc] for code, label, desc in items]
        safe_print(
            ui.table(
                headers=["Code", "Indicator Name", "Trader Guide / Beginner Interpretation"],
                rows=rows,
                alignments=["left", "left", "left"],
                nowrap_cols={0, 1},
            )
        )
    safe_print("")
    safe_print(ui.dim("  Supported Timeframes: 1m, 5m, 15m, 30m, 1h, 1d (daily), 1w (weekly), 1mth (monthly)"))
    safe_print("")


def print_skill_menu() -> None:
    """Print the interactive skill modules menu."""
    ui = UI(color=None)
    safe_print("")
    safe_print(ui.bold(ui.yellow("=" * 86)))
    safe_print(ui.bold(ui.yellow("   NSE/BSE HYBRID TRADER -- SKILL MODULES & CLI REFERENCE")))
    safe_print(ui.bold(ui.yellow("=" * 86)))

    rows = []
    for i, s in enumerate(AVAILABLE_SKILLS, 1):
        def_mark = ui.green("[Included in Full Pipeline]") if s["default"] else ui.dim("[Standalone / Optional]")
        rows.append([str(i), s["name"], s["script"], def_mark])

    safe_print(
        ui.table(
            headers=["#", "Skill Module Name", "Underlying CLI Script", "Pipeline Status"],
            rows=rows,
            alignments=["center", "left", "left", "left"],
            nowrap_cols={0, 2},
        )
    )
    safe_print("")


def execute_skill_direct(skill_num: int, symbol: str) -> None:
    """Execute a single skill directly using its Python module API without subprocess quirks."""
    norm_symbol = symbol.upper().replace(".NS", "").replace(".BO", "")
    full_symbol = f"{norm_symbol}.NS"
    ui = UI(color=None)

    if skill_num == 1:  # Clock
        import nse_alerts
        nse_alerts.main(["clock"])
    elif skill_num == 2:  # News
        import nse_news
        nse_news.main(["--tickers", norm_symbol, "--hours", "72"])
    elif skill_num == 3:  # TV Indicators
        import tv_indicators
        tv_indicators.main(["--symbol", norm_symbol])
    elif skill_num == 4:  # Market structure
        import nse_data_loader
        nse_data_loader.main(["--symbol", norm_symbol])
    elif skill_num == 5:  # Scanner
        import nse_scanner
        safe_print("Running NIFTY50 Daily Setup Scanner...")
        nse_scanner.main(["daily", "--pool", "nifty50"])
    elif skill_num == 6:  # Time machine
        import nse_timemachine, nse_alerts
        quotes, _ = nse_alerts.fetch_quotes_batch([full_symbol])
        p = quotes.get(norm_symbol, {}).get("price", 100.0)
        e, s, t = round(p, 2), round(p * 0.95, 2), round(p * 1.10, 2)
        safe_print(ui.cyan(f"Running Time Machine on {full_symbol} with auto-levels (Entry: {e}, Stop: {s}, Target: {t})..."))
        nse_timemachine.main(["--symbol", full_symbol, "--entry", str(e), "--stop", str(s), "--target", str(t), "--mode", "SWING"])
    elif skill_num == 7:  # Risk gate
        import indian_risk_gate, nse_alerts
        quotes, _ = nse_alerts.fetch_quotes_batch([full_symbol])
        p = quotes.get(norm_symbol, {}).get("price", 100.0)
        e, s, t = round(p, 2), round(p * 0.95, 2), round(p * 1.10, 2)
        safe_print(ui.cyan(f"Running 2026 Risk Gate on {norm_symbol} (Entry: {e}, Stop: {s}, Target: {t})..."))
        indian_risk_gate.main(["--symbol", norm_symbol, "--capital", "50000", "--entry", str(e), "--stop", str(s), "--target", str(t)])
    elif skill_num == 8:  # Broker staging
        import broker_bridge
        broker_bridge.main(["brokers"])
    elif skill_num == 9:  # Alerts quote
        import nse_alerts
        nse_alerts.main(["quote", full_symbol])


def interactive_menu() -> None:
    """Interactive loop for user to choose actions in terminal."""
    ui = UI(color=None)

    while True:
        print_skill_menu()
        print_indicator_catalog()

        safe_print(ui.bold("  Menu Options:"))
        safe_print("    [1] Run All Skills (Full End-to-End Pipeline with Auto/Custom Coords)")
        safe_print("    [2] Run Specific Skill Script")
        safe_print("    [3] Run TradingView Indicator Query with Custom Indicators")
        safe_print("    [4] Print Command Line Reference & Cheat Sheet")
        safe_print("    [Q] Quit")
        safe_print("")

        try:
            choice = input("  Select an option (1-4 or Q): ").strip().upper()
        except (KeyboardInterrupt, EOFError):
            safe_print("\nExiting.")
            break

        if choice in ("Q", "QUIT", "EXIT"):
            safe_print("Goodbye!")
            break

        if choice == "1":
            try:
                sym = input("  Enter Symbol (e.g. SUZLON, RELIANCE, BANKBARODA, NYKAA): ").strip().upper()
                if not sym:
                    continue
                entry_in = input("  Enter Entry price (INR) [or press Enter for auto-LTP coords]: ").strip()
                stop_in = input("  Enter Stop price (INR) [or press Enter for auto-LTP coords]: ").strip()
                target_in = input("  Enter Target price (INR) [or press Enter for auto-LTP coords]: ").strip()

                import run_all
                entry = float(entry_in) if entry_in else None
                stop = float(stop_in) if stop_in else None
                target = float(target_in) if target_in else None

                run_all.run_all(symbol=sym, entry=entry, stop=stop, target=target)
            except Exception as exc:
                safe_print(ui.red(f"Error executing pipeline: {exc}"))
            input("\nPress Enter to return to menu...")

        elif choice == "2":
            safe_print("\nSelect skill number to run (1-9):")
            for i, s in enumerate(AVAILABLE_SKILLS, 1):
                safe_print(f"  [{i}] {s['name']} (`{s['script']}`)")
            try:
                s_idx = input("  Skill number: ").strip()
                if not s_idx.isdigit() or not (1 <= int(s_idx) <= len(AVAILABLE_SKILLS)):
                    safe_print(ui.red("Invalid skill selection."))
                    continue
                num = int(s_idx)
                sym = "NIFTY"
                if num not in (1, 5, 8):
                    sym = input("  Enter Symbol (e.g. SUZLON, NYKAA): ").strip().upper() or "SUZLON"
                execute_skill_direct(num, sym)
            except Exception as exc:
                safe_print(ui.red(f"Error: {exc}"))
            input("\nPress Enter to return to menu...")

        elif choice == "3":
            try:
                sym = input("  Enter Symbol (e.g. SUZLON, NYKAA): ").strip().upper()
                if not sym:
                    continue
                tf = input("  Timeframe (1m, 5m, 15m, 1h, 1d, 1w) [Default: 1d]: ").strip().lower() or "1d"
                safe_print("\n  Default Indicators: RSI MACD EMA20 EMA50 EMA200 ADX ATR VWAP STOCH_K BB_POWER")
                custom_inds = input("  Enter indicator codes separated by space (or press Enter for default): ").strip().upper()
                ind_list = custom_inds.split() if custom_inds else ["RSI", "MACD", "EMA20", "EMA50", "EMA200", "ADX", "ATR", "VWAP", "STOCH_K", "BB_POWER"]

                argv = ["--symbol", sym, "--timeframe", tf, "--indicators"] + ind_list
                tv_indicators.main(argv)
            except Exception as exc:
                safe_print(ui.red(f"Error: {exc}"))
            input("\nPress Enter to return to menu...")

        elif choice == "4":
            safe_print("\n" + ui.bold(ui.yellow("=" * 80)))
            safe_print(ui.bold(ui.yellow("   NSE/BSE HYBRID TRADER -- QUICK COMMAND REFERENCE")))
            safe_print(ui.bold(ui.yellow("=" * 80)))
            safe_print("""
  Full All-In-One Pipeline (Auto or Manual Coords):
    python run_all.py SUZLON
    python run_all.py NYKAA --entry 360 --stop 345 --target 390
    .\\trade.ps1 SUZLON -Entry 54.81 -Stop 50.0 -Target 62.0

  TradingView Cloud Indicators (Zero Local Compute):
    python scripts/tv_indicators.py --symbol SUZLON --indicators RSI MACD ADX VWAP EMA200
    python scripts/tv_indicators.py --symbol NIFTY --timeframe 15m --indicators RSI STOCH_K VWAP

  Market Scanners:
    python scripts/nse_scanner.py daily --pool nifty50
    python scripts/nse_scanner.py orb   --pool nifty50

  Financial & Regulatory News:
    python scripts/nse_news.py --tickers SUZLON --hours 72

  Monte Carlo Time Machine:
    python scripts/nse_timemachine.py --symbol SUZLON.NS --entry 54.81 --stop 50.0 --target 62.0

  Risk Gate & 2026 Statutory Charges:
    python scripts/indian_risk_gate.py --symbol SUZLON --capital 50000 --entry 54.81 --stop 50.0 --target 62.0

  Order Staging (Paper / Live):
    python scripts/broker_bridge.py stage --broker zerodha --symbol SUZLON --entry 54.81 --stop 50.0 --target 62.0 --paper
    python scripts/broker_bridge.py ledger

  Market Clock & Alerts:
    python scripts/nse_alerts.py clock
    python scripts/nse_alerts.py watch --interval 30 --until 15:15 --beep
""")
            safe_print(ui.disclaimer())
            input("\nPress Enter to return to menu...")

        else:
            safe_print(ui.yellow("Invalid choice. Please select 1, 2, 3, 4, or Q."))


def main(argv: list[str] | None = None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description="NSE/BSE Hybrid Trader - Interactive Skill & Indicator Selector Menu")
    parser.add_argument("--catalog", action="store_true", help="Print available TradingView indicators and exit")
    parser.add_argument("--skills", action="store_true", help="Print available skills menu and exit")
    args = parser.parse_args(argv)

    if args.catalog:
        print_indicator_catalog()
        safe_print(UI().disclaimer())
        return 0

    if args.skills:
        print_skill_menu()
        safe_print(UI().disclaimer())
        return 0

    interactive_menu()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
