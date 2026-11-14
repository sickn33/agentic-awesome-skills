#!/usr/bin/env python3
"""
NSE/BSE Interactive Skill Selector & Custom Pipeline Curator (`menu.py`).
Standard library only. Allows users to:
  1. Interactively choose which pipeline modules/skills to run
  2. Multi-Select Custom Pipeline: Curate specific sub-modules to run sequentially
  3. Watchlist Opportunity Scanner: Automatic Entry, SL, Target & Holding Timeframe
  4. Query custom technical indicators from TradingView Cloud Scanner (0% CPU)
  5. Print quick references & command cheat sheet
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
import nse_common
import tv_indicators
import scan_watchlist

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
    {
        "id": "option_chain",
        "name": "Live Option Chain, Greeks & Max Pain Engine",
        "script": "nse_option_chain.py",
        "desc": "Real-time option chain for NIFTY, BANKNIFTY, F&O stocks with PCR, Max Pain, and Black-Scholes Greeks.",
        "default": False,
    },
    {
        "id": "sector_heatmap",
        "name": "Sector Rotation & Market Breadth Heatmap",
        "script": "nse_sector_scanner.py",
        "desc": "Relative Strength (RS) scanner comparing NIFTY BANK, IT, AUTO, METAL against NIFTY 50 benchmark.",
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
    sym_info = nse_common.normalize_symbol(symbol)
    norm_symbol = sym_info["base"]
    full_symbol = sym_info["yahoo"]
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
    elif skill_num == 10:  # Option Chain & Greeks
        import nse_option_chain
        nse_option_chain.main([norm_symbol])
    elif skill_num == 11:  # Sector Heatmap
        import nse_sector_scanner
        nse_sector_scanner.main([])



def print_trade_decision_brief(symbol: str) -> None:
    """Print comprehensive structured conclusion analyzing each decision factor."""
    ui = UI(color=None)
    sym_info = nse_common.normalize_symbol(symbol)
    norm_symbol = sym_info["base"]
    
    try:
        res = tv_indicators.fetch_tv_technicals(
            [norm_symbol], 
            requested_indicators=["RSI", "MACD", "EMA20", "EMA50", "EMA200", "ADX", "ATR", "VWAP", "PIVOT_R1", "PIVOT_S1"]
        )
        if not res:
            return
        data = res[0]
        ltp = float(data.get("close") or 0.0)
        rec = data.get("recommendation", {})
        score = float(rec.get("score") or 0.0)
        inds = data.get("indicators", {})
        rsi = float(inds.get("RSI", {}).get("value") or 50.0)
        adx = float(inds.get("ADX", {}).get("value") or 20.0)
        ema20 = float(inds.get("EMA20", {}).get("value") or ltp)
        ema50 = float(inds.get("EMA50", {}).get("value") or ltp)
        ema200 = float(inds.get("EMA200", {}).get("value") or ltp)
        vwap = float(inds.get("VWAP", {}).get("value") or ltp)
        atr = float(inds.get("ATR", {}).get("value") or (ltp * 0.02))

        # Decision synthesis
        trend_status = "BULLISH (Above 200 EMA)" if ltp >= ema200 else "BEARISH (Below 200 EMA)"
        control_status = "BUYER CONTROL (Above VWAP)" if ltp >= vwap else "SELLER PRESSURE (Below VWAP)"
        momentum_status = "STRONG (+)" if rsi >= 60 else ("WEAK (-)" if rsi <= 40 else "NEUTRAL (Chop)")
        trend_power = "CONFIRMED TREND (ADX > 25)" if adx >= 25 else "WEAK / SIDEWAYS CHOP (ADX < 25)"

        if score >= 0.20 or (ltp > ema200 and rsi > 55 and ltp > vwap):
            final_action = "BUY / LONG SETUP"
            action_tone = "good"
            entry_zone = f"Rs. {ltp:,.2f}"
            sl_val = nse_common.round_tick(max(ltp - (1.5 * atr), ema50 * 0.98))
            tgt_val = nse_common.round_tick(ltp + (2.5 * atr))
            timeframe_rec = "Delivery Swing (1 to 3 Weeks) or Intraday until 15:15 IST"
            verdict_summary = (
                f"{norm_symbol} exhibits institutional buyer sponsorship across both Daily trend and intraday VWAP. "
                f"Holding above the EMA 200 spine with RSI={rsi:.1f} gives high probability of upward continuation."
            )
        elif score <= -0.20 or (ltp < ema200 and rsi < 45 and ltp < vwap):
            final_action = "SELL / SHORT SETUP"
            action_tone = "bad"
            entry_zone = f"Rs. {ltp:,.2f}"
            sl_val = nse_common.round_tick(ltp + (1.5 * atr))
            tgt_val = nse_common.round_tick(max(0.05, ltp - (2.5 * atr)))
            timeframe_rec = "Intraday Short (Exit by 15:15 IST) or Futures Swing"
            verdict_summary = (
                f"{norm_symbol} is trading in distribution territory below both its 200 EMA spine and session VWAP. "
                f"Sellers dominate rallies; avoid holding unhedged delivery longs."
            )
        else:
            final_action = "NO-TRADE / WAIT FOR BREAKOUT"
            action_tone = "warn"
            entry_zone = "Wait for breakout above " + f"Rs. {max(ema20, vwap):,.2f}"
            sl_val = nse_common.round_tick(min(ltp - atr, ema50))
            tgt_val = nse_common.round_tick(ltp + (2.0 * atr))
            timeframe_rec = "Watchlist only — do not allocate capital yet"
            verdict_summary = (
                f"{norm_symbol} is currently compressing in a consolidation squeeze. Indicators show mixed signals. "
                f"Conserve risk capital until price resolves decisively above VWAP/EMAs with volume."
            )

        dec_rows = [
            ["1. Institutional Spine (200 EMA)", f"Rs. {ema200:,.2f}", trend_status],
            ["2. Session Control (Intraday VWAP)", f"Rs. {vwap:,.2f}", control_status],
            ["3. Relative Strength (RSI 14)", f"{rsi:.1f}", momentum_status],
            ["4. Trend Strength Power (ADX 14)", f"{adx:.1f}", trend_power],
            ["5. Volatility Buffer (Daily ATR)", f"Rs. {atr:,.2f}", f"Normal expected daily swing: +/- Rs.{atr:,.2f}"],
            ["6. Planned Entry & Timing", entry_zone, timeframe_rec],
            ["7. Structural Stop-Loss", f"Rs. {sl_val:,.2f}", f"Risk: {abs(ltp - sl_val)/ltp*100:.1f}% (Sized using ATR cushion)"],
            ["8. Calculated Target", f"Rs. {tgt_val:,.2f}", f"Reward: {abs(tgt_val - ltp)/ltp*100:.1f}% (Minimum 1:1.6 to 1:2.0 R:R)"],
        ]

        safe_print("")
        safe_print(ui.banner(
            title=f"FINAL ACTIONABLE TRADE DECISION & CONCLUSION  •  {norm_symbol}",
            subtitle=f"Synthesized conclusion for user decision-making across all active indicators",
            badge=final_action,
            badge_tone=action_tone,
        ))
        safe_print("")
        safe_print(ui.table(
            headers=["Decision Checkpoint", "Key Technical Value", "Trader Interpretation & Verdict"],
            rows=dec_rows,
            alignments=["left", "left", "left"],
            nowrap_cols={0, 1},
        ))
        safe_print("")
        safe_print(ui.callout(
            f"Strategic Takeaway for {norm_symbol}",
            [verdict_summary, "Rule: Always confirm live order tickets on your SEBI-registered broker terminal before placing orders."],
            tone_name="info",
        ))
    except Exception as exc:
        safe_print(ui.yellow(f"  [Decision synthesis note: {exc}]"))


def curate_custom_pipeline() -> None:
    """Allow user to select multiple sub-modules and run their tailored pipeline."""
    ui = UI(color=None)
    safe_print("")
    safe_print(ui.bold(ui.yellow("── MULTI-SELECT CUSTOM PIPELINE BUILDER ─────────────────────────────────")))
    safe_print("  Choose which sub-modules you want to include in your customized run:")
    for i, s in enumerate(AVAILABLE_SKILLS, 1):
        safe_print(f"    [{i}] {s['name']}")
    safe_print("")

    try:
        choices_raw = input("  Enter module numbers separated by spaces (e.g. 1 3 6 7): ").strip()
        if not choices_raw:
            safe_print(ui.yellow("No modules selected. Returning to main menu."))
            return
        selected_indices = [int(x) for x in choices_raw.split() if x.isdigit() and 1 <= int(x) <= len(AVAILABLE_SKILLS)]
        if not selected_indices:
            safe_print(ui.red("Invalid selections."))
            return

        sym = input("  Enter Stock / Index Symbol (e.g. SUZLON, RELIANCE, NIFTY): ").strip().upper()
        if not sym:
            return

        safe_print("")
        safe_print(ui.bold(ui.green(f"  Executing Curated Pipeline for {sym} ({len(selected_indices)} modules)...")))
        for idx in selected_indices:
            s_obj = AVAILABLE_SKILLS[idx - 1]
            safe_print(ui.bold(ui.cyan(f"\n>> Running [{idx}] {s_obj['name']}...")))
            try:
                execute_skill_direct(idx, sym)
            except Exception as exc:
                safe_print(ui.red(f"Error in {s_obj['name']}: {exc}"))

        # Render comprehensive decision-making conclusion
        print_trade_decision_brief(sym)

    except (KeyboardInterrupt, EOFError):
        safe_print("\nCancelled.")
    input("\nPress Enter to return to menu...")


def interactive_watchlist_scanner() -> None:
    """Launch the Watchlist Opportunity & Trade Setup Scanner from menu."""
    ui = UI(color=None)
    safe_print("")
    safe_print(ui.bold(ui.yellow("── WATCHLIST OPPORTUNITY SCANNER (AUTO SL, TARGET & TIMEFRAME) ─────────")))
    safe_print("  Scan options:")
    safe_print("    [1] Scan Built-in NIFTY 50 Pool")
    safe_print("    [2] Scan Built-in NIFTY BANK Pool")
    safe_print("    [3] Scan Custom Watchlist Text File")
    safe_print("    [4] Enter Custom Stock Symbols Manually")
    safe_print("")

    try:
        opt = input("  Select source (1-4): ").strip()
        pool_arg = None
        file_arg = None
        syms_arg = None

        if opt == "1":
            pool_arg = "nifty50"
        elif opt == "2":
            pool_arg = "niftybank"
        elif opt == "3":
            file_arg = input("  Enter path to watchlist text file: ").strip()
        elif opt == "4":
            raw_s = input("  Enter symbols separated by space (e.g. RELIANCE TCS SUZLON): ").strip().upper()
            syms_arg = raw_s.split() if raw_s else ["RELIANCE", "SUZLON"]
        else:
            safe_print(ui.yellow("Invalid choice."))
            return

        safe_print("\n  Select Trading Segment:")
        safe_print("    [1] EQ_DELIVERY (Swing 1 to 3 Weeks, ATR Trend Targets)")
        safe_print("    [2] EQ_INTRADAY (Day Trading 15m to 3 Hours, Exit by 15:15 IST)")
        safe_print("    [3] FNO_FUT     (Futures Swing 1 to 5 Days)")
        safe_print("    [4] FNO_OPT     (Options Momentum Scalp 15m to 1 Day)")
        seg_opt = input("  Choice (1-4, Default: 1): ").strip()
        seg_map = {"1": "EQ_DELIVERY", "2": "EQ_INTRADAY", "3": "FNO_FUT", "4": "FNO_OPT"}
        segment = seg_map.get(seg_opt, "EQ_DELIVERY")

        tf_default = "15m" if segment in ("EQ_INTRADAY", "FNO_OPT") else "1d"
        tf = input(f"  Timeframe (15m, 1h, 1d, 1w) [Default: {tf_default}]: ").strip().lower() or tf_default

        filter_in = input("  Filter stance (BUY / SELL / ALL) [Default: ALL]: ").strip().upper() or "ALL"

        symbols = scan_watchlist.load_symbols_from_source(symbols_arg=syms_arg, file_path=file_arg, pool=pool_arg)
        if not symbols:
            safe_print(ui.red("No symbols found to scan."))
            return

        opps = scan_watchlist.scan_watchlist_opportunities(
            symbols=symbols,
            segment=segment,
            timeframe=tf,
            filter_stance=None if filter_in == "ALL" else filter_in,
        )
        safe_print(scan_watchlist.format_scanner_table(opps, segment=segment))

    except (KeyboardInterrupt, EOFError):
        safe_print("\nCancelled.")
    input("\nPress Enter to return to menu...")


def interactive_custom_trade_sizer() -> None:
    """Guided Custom Trade Sizer & 2026 Risk Gate across all segments."""
    ui = UI(color=None)
    safe_print("")
    safe_print(ui.bold(ui.yellow("── CUSTOM TRADE SIZER & 2026 RISK GATE (ALL SEGMENTS) ──────────────────")))
    safe_print("  Choose how you want to provide trade coordinates:")
    safe_print("    [1] Paste One-Line Command String (e.g. --symbol NIFTY26NOV25600CE --segment FNO_OPT ...)")
    safe_print("    [2] Step-by-Step Interactive Prompts (Guided Q&A)")
    safe_print("")

    import shlex
    import indian_risk_gate

    try:
        mode_choice = input("  Choice (1 or 2, Default: 1): ").strip() or "1"
        if mode_choice == "1":
            safe_print("\n  Paste your parameter string below and press Enter:")
            safe_print(ui.dim("  Example: --symbol NIFTY26NOV25600CE --segment FNO_OPT --entry 65 --stop 45 --target 105 --lot-size 25 --capital 100000 --risk-pct 1.0 --broker zerodha"))
            cmd_line = input("  >> ").strip()
            if not cmd_line:
                safe_print(ui.yellow("No input provided."))
                return
            cleaned = cmd_line.replace("`", " ").replace("\\", " ")
            argv = shlex.split(cleaned)
            if argv and argv[0].endswith(".py"):
                argv = argv[1:]
            elif argv and argv[0].lower() in ("python", "python3"):
                argv = [a for a in argv[1:] if not a.endswith(".py")]

            safe_print(ui.cyan("\nExecuting Custom Risk Gate Calculation...\n"))
            indian_risk_gate.main(argv)
        else:
            safe_print("\n  Select Segment:")
            safe_print("    [1] EQ_DELIVERY (Equity Delivery / Swing)")
            safe_print("    [2] EQ_INTRADAY (Equity Day Trading / MIS)")
            safe_print("    [3] FNO_FUT     (Futures Contract)")
            safe_print("    [4] FNO_OPT     (Options Contract CE/PE)")
            seg_map = {"1": "EQ_DELIVERY", "2": "EQ_INTRADAY", "3": "FNO_FUT", "4": "FNO_OPT"}
            seg_choice = input("  Choice (1-4, Default: 1): ").strip() or "1"
            segment = seg_map.get(seg_choice, "EQ_DELIVERY")

            sym = input("  Symbol (e.g. SUZLON, RELIANCE, NIFTY26NOV25600CE): ").strip().upper()
            if not sym:
                safe_print(ui.red("Symbol is required."))
                return

            entry_str = input("  Planned Entry Price (INR): ").strip()
            stop_str = input("  Stop Loss Price (INR): ").strip()
            target_str = input("  Target Price (INR): ").strip()
            if not (entry_str and stop_str and target_str):
                safe_print(ui.red("Entry, Stop, and Target are all required."))
                return

            default_lot = 1
            if "NIFTY" in sym and "BANK" not in sym:
                default_lot = 25
            elif "BANKNIFTY" in sym:
                default_lot = 15
            elif "FINNIFTY" in sym:
                default_lot = 25
            elif "SENSEX" in sym:
                default_lot = 10

            lot_str = input(f"  Lot Size [Default: {default_lot}]: ").strip() or str(default_lot)
            cap_str = input("  Account Capital INR [Default: 100000]: ").strip() or "100000"
            risk_str = input("  Max Capital Risk % (0.5 to 2.0) [Default: 1.0]: ").strip() or "1.0"
            broker_str = input("  Broker (zerodha, angel_one, upstox, dhan, groww) [Default: zerodha]: ").strip().lower() or "zerodha"

            argv = [
                "--symbol", sym,
                "--segment", segment,
                "--entry", entry_str,
                "--stop", stop_str,
                "--target", target_str,
                "--lot-size", lot_str,
                "--capital", cap_str,
                "--risk-pct", risk_str,
                "--broker", broker_str,
            ]
            safe_print(ui.cyan("\nExecuting Custom Risk Gate Calculation...\n"))
            indian_risk_gate.main(argv)

    except (KeyboardInterrupt, EOFError):
        safe_print("\nCancelled.")
    except Exception as exc:
        safe_print(ui.red(f"\nError processing custom trade: {exc}"))
    input("\nPress Enter to return to menu...")


def interactive_menu() -> None:
    """Interactive loop for user to choose actions in terminal."""
    ui = UI(color=None)

    while True:
        print_skill_menu()
        print_indicator_catalog()

        safe_print(ui.bold("  Menu Options:"))
        safe_print("    [1] Run All Skills (Full End-to-End Pipeline with Auto/Custom Coords)")
        safe_print("    [2] Curate Custom Pipeline (Multi-Select Sub-Modules to Run in Sequence)")
        safe_print("    [3] Watchlist Opportunity Scanner (Auto Entry, Stop, Target, Timeframe & Setup)")
        safe_print("    [4] Custom Trade Sizer & 2026 Risk Gate (All Segments: EQ, Intraday, Futures, Options)")
        safe_print("    [5] Live NSE Option Chain, Greeks & Max Pain Engine (PCR, Max Pain, Black-Scholes)")
        safe_print("    [6] Sector Rotation & Market Breadth Heatmap Scanner (Leaderboards & A/D Breadth)")
        safe_print("    [7] Run Specific Single Skill Script (1-11)")
        safe_print("    [8] Run TradingView Indicator Query with Custom Indicators")
        safe_print("    [9] Print Command Line Reference & Cheat Sheet")
        safe_print("    [Q] Quit")
        safe_print("")

        try:
            choice = input("  Select an option (1-9 or Q): ").strip().upper()
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
            curate_custom_pipeline()

        elif choice == "3":
            interactive_watchlist_scanner()

        elif choice == "4":
            interactive_custom_trade_sizer()

        elif choice == "5":
            try:
                sym = input("  Enter Index or F&O Symbol (NIFTY, BANKNIFTY, FINNIFTY, RELIANCE) [Default: NIFTY]: ").strip().upper() or "NIFTY"
                import nse_option_chain
                nse_option_chain.analyze_option_chain(symbol=sym)
            except Exception as exc:
                safe_print(ui.red(f"Error executing Option Chain: {exc}"))
            input("\nPress Enter to return to menu...")

        elif choice == "6":
            try:
                import nse_sector_scanner
                nse_sector_scanner.scan_sectors()
            except Exception as exc:
                safe_print(ui.red(f"Error executing Sector Scanner: {exc}"))
            input("\nPress Enter to return to menu...")

        elif choice == "7":
            safe_print("\nSelect skill number to run (1-11):")
            for i, s in enumerate(AVAILABLE_SKILLS, 1):
                safe_print(f"  [{i}] {s['name']} (`{s['script']}`)")
            try:
                s_idx = input("  Skill number: ").strip()
                if not s_idx.isdigit() or not (1 <= int(s_idx) <= len(AVAILABLE_SKILLS)):
                    safe_print(ui.red("Invalid skill selection."))
                    continue
                num = int(s_idx)
                sym = "NIFTY"
                if num not in (1, 5, 8, 11):
                    sym = input("  Enter Symbol (e.g. SUZLON, NYKAA, NIFTY): ").strip().upper() or "SUZLON"
                execute_skill_direct(num, sym)
            except Exception as exc:
                safe_print(ui.red(f"Error: {exc}"))
            input("\nPress Enter to return to menu...")

        elif choice == "8":
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

        elif choice == "9":
            safe_print("\n" + ui.bold(ui.yellow("=" * 80)))
            safe_print(ui.bold(ui.yellow("   NSE/BSE HYBRID TRADER -- QUICK COMMAND REFERENCE")))
            safe_print(ui.bold(ui.yellow("=" * 80)))
            safe_print("""
  Full All-In-One Pipeline (Auto or Manual Coords):
    python run_all.py SUZLON
    python run_all.py NYKAA --entry 360 --stop 345 --target 390
    .\\trade.ps1 SUZLON -Entry 54.81 -Stop 50.0 -Target 62.0

  Watchlist Opportunity Scanner (Dynamic Entry, SL, Target & Timeframe):
    python scan_watchlist.py --pool nifty50 --segment EQ_DELIVERY
    python scan_watchlist.py --pool niftybank --segment EQ_INTRADAY --timeframe 15m
    python scan_watchlist.py --file my_stocks.txt --segment FNO_OPT

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

  Option Chain, Greeks & Max Pain Analytics:
    python scripts/nse_option_chain.py NIFTY
    python scripts/nse_option_chain.py BANKNIFTY --expiry-days 3
    python scripts/nse_option_chain.py RELIANCE

  Sector Rotation & Market Breadth Heatmap Scanner:
    python scripts/nse_sector_scanner.py
""")
            safe_print(ui.disclaimer())
            input("\nPress Enter to return to menu...")

        else:
            safe_print(ui.yellow("Invalid choice. Please select 1-9 or Q."))


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
