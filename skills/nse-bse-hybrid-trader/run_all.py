#!/usr/bin/env python3
"""
NSE/BSE Hybrid Trader - Unified Cross-Platform Pipeline Runner
Executes the full end-to-end Indian trading analysis workflow:
  Step 0: IST Market Clock & Session Phase
  Step 1: Financial & Regulatory News / Sentiment (Google News, NSE, BSE, SEBI)
  Step 2: TradingView Cloud Technical Indicators (32+ Cloud Indicators, 0% CPU)
  Step 3: Multi-Timeframe Confluence (EMAs, VWAP, RSI, MACD, Volume, Delivery)
  Step 4: 10,000-Path Monte Carlo Time Machine
  Step 5: Indian Risk Gate, Tax Calculator & Position Sizer (2026 STT/GST/SEBI/Stamp Duty)
  Step 6: Paper Order Staging
  Step 7: Live Quotes & Price Alerts
  Step 8: Mandatory Regulatory & Financial Risk Disclaimer
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Sequence

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


def print_banner(symbol: str, segment: str, mode: str, capital: float, risk_pct: float, broker: str) -> None:
    ui = UI(color=None)
    w = 68
    safe_print("")
    safe_print(ui.bold(ui.yellow("=" * w)))
    safe_print(ui.bold(ui.yellow("   NSE/BSE HYBRID TRADER -- UNIFIED MASTER PIPELINE")))
    safe_print(ui.bold(ui.yellow("=" * w)))
    safe_print(f"   Symbol   : {ui.bold(symbol)}")
    safe_print(f"   Segment  : {segment}   |   Mode : {mode}")
    safe_print(f"   Capital  : Rs.{capital:,.2f}   |   Risk : {risk_pct}%   |   Broker : {broker}")
    safe_print(ui.bold(ui.yellow("=" * w)))
    safe_print("")


def print_step_header(step_num: int, title: str) -> None:
    ui = UI(color=None)
    safe_print("")
    safe_print(ui.cyan("-" * 64))
    safe_print(ui.bold(ui.cyan(f"  STEP {step_num} : {title}")))
    safe_print(ui.cyan("-" * 64))
    safe_print("")


def run_all(
    symbol: str,
    entry: float | None = None,
    stop: float | None = None,
    target: float | None = None,
    capital: float = 50000.0,
    risk_pct: float = 1.0,
    segment: str = "EQ_DELIVERY",
    mode: str = "SWING",
    broker: str = "zerodha",
    exchange: str = "NSE",
    skip_news: bool = False,
    replays: int = 10000,
    now: str | None = None,
    fno_ban: bool = False,
    asm_gsm: bool = False,
    circuit_band: str | None = None,
    delivery_pct: str | None = None,
) -> int:
    norm_symbol = symbol.upper().replace(".NS", "").replace(".BO", "")
    full_symbol = f"{norm_symbol}.NS" if exchange.upper() == "NSE" else f"{norm_symbol}.BO"
    has_coords = (entry is not None) and (stop is not None) and (target is not None)
    ui = UI(color=None)

    print_banner(norm_symbol, segment, mode, capital, risk_pct, broker)

    # STEP 0 - Clock
    print_step_header(0, "NSE/BSE Market Clock & Session Phase")
    try:
        import nse_alerts
        clock_argv = ["clock"]
        if now:
            clock_argv.extend(["--now", now])
        nse_alerts.main(clock_argv)
    except Exception as exc:
        safe_print(ui.yellow(f"  [Clock check warning: {exc}]"))

    # STEP 1 - News
    if not skip_news:
        print_step_header(1, f"Financial & Regulatory News ({norm_symbol})")
        try:
            import nse_news
            news_argv = ["--tickers", norm_symbol, "--hours", "72"]
            if now:
                news_argv.extend(["--now", now])
            nse_news.main(news_argv)
        except Exception as exc:
            safe_print(ui.yellow(f"  [News warning: {exc}]"))
    else:
        print_step_header(1, "Financial News")
        safe_print(ui.dim("  >> Skipped via --skip-news"))

    # STEP 2 - TradingView Cloud Indicators
    print_step_header(2, "TradingView Cloud Technical Indicators (32+ Indicators, 0% CPU)")
    try:
        import tv_indicators
        tv_argv = ["--symbol", norm_symbol]
        tv_indicators.main(tv_argv)
    except Exception as exc:
        safe_print(ui.yellow(f"  [TradingView scanner warning: {exc}]"))

    # STEP 3 - Local Confluence & Market Structure
    print_step_header(3, "Local Multi-Timeframe Confluence & Market Structure")
    try:
        import nse_data_loader
        dl_argv = ["--symbol", norm_symbol, "--exchange", exchange]
        if now:
            dl_argv.extend(["--now", now])
        if fno_ban:
            dl_argv.append("--fno-ban")
        if asm_gsm:
            dl_argv.append("--asm-gsm")
        if circuit_band:
            dl_argv.extend(["--circuit-band", circuit_band])
        if delivery_pct:
            dl_argv.extend(["--delivery-pct", delivery_pct])
        nse_data_loader.main(dl_argv)
    except Exception as exc:
        safe_print(ui.red(f"  [Data loader error: {exc}]"))

    # STEP 4 - Monte Carlo Time Machine
    print_step_header(4, f"Time Machine: {replays:,}-Path Monte Carlo Simulation")
    tm_result_path = None
    if not has_coords:
        # Auto-derive default baseline swing coordinates around LTP
        try:
            import nse_alerts
            quotes_res, _ = nse_alerts.fetch_quotes_batch([full_symbol])
            curr_price = None
            if quotes_res and norm_symbol in quotes_res:
                curr_price = quotes_res[norm_symbol].get("price")
            if curr_price and curr_price > 0:
                calc_entry = round(curr_price, 2)
                calc_stop = round(curr_price * 0.95, 2)
                calc_target = round(curr_price * 1.10, 2)
                safe_print(ui.cyan(f"  [Auto-Coordinates from LTP Rs.{calc_entry}: Entry={calc_entry}, Stop={calc_stop} (-5%), Target={calc_target} (+10%)]"))
                entry, stop, target = calc_entry, calc_stop, calc_target
                has_coords = True
        except Exception:
            pass

    if has_coords:
        try:
            import nse_timemachine
            tm_argv = [
                "--symbol", full_symbol,
                "--entry", str(entry),
                "--stop", str(stop),
                "--target", str(target),
                "--mode", mode,
                "--replays", str(replays),
                "--capital", str(capital),
                "--risk-pct", str(risk_pct),
                "--segment", segment,
                "--broker", broker,
                "--write",
            ]
            if now:
                tm_argv.extend(["--now", now])
            nse_timemachine.main(tm_argv)
            tm_result_path = os.path.join(SKILL_DIR, "..", "state", "timemachine_result.json")
        except Exception as exc:
            safe_print(ui.red(f"  [Time Machine error: {exc}]"))
    else:
        safe_print(ui.dim("  >> Skipped: Provide --entry, --stop, and --target to run Monte Carlo simulation."))

    # STEP 5 - Risk Gate & 2026 Statutory Charges
    print_step_header(5, "Indian Risk Gate & Statutory Charges (2026 Tax Rules)")
    risk_result_path = None
    if has_coords:
        try:
            import indian_risk_gate
            rg_argv = [
                "--symbol", norm_symbol,
                "--capital", str(capital),
                "--risk-pct", str(risk_pct),
                "--entry", str(entry),
                "--stop", str(stop),
                "--target", str(target),
                "--segment", segment,
                "--broker", broker,
                "--write",
            ]
            if tm_result_path and os.path.exists(tm_result_path):
                rg_argv.extend(["--timemachine-json", tm_result_path])
            if now:
                rg_argv.extend(["--now", now])
            if fno_ban:
                rg_argv.append("--fno-ban")
            if asm_gsm:
                rg_argv.append("--asm-gsm")
            indian_risk_gate.main(rg_argv)
            risk_result_path = os.path.join(SKILL_DIR, "..", "state", "risk_verdict.json")
        except Exception as exc:
            safe_print(ui.red(f"  [Risk Gate error: {exc}]"))
    else:
        safe_print(ui.dim("  >> Skipped: Provide --entry, --stop, and --target to run Risk Gate."))

    # STEP 6 - Order Staging
    print_step_header(6, "Paper Order Staging Ticket")
    if has_coords:
        safe_print("  To stage this order safely in the local paper ledger, copy and run:")
        safe_print(ui.bold(ui.green(
            f"  python scripts/broker_bridge.py stage --broker {broker} --symbol {norm_symbol} "
            f"--segment {segment} --entry {entry} --stop {stop} --target {target} --paper"
        )))
        safe_print("")
        safe_print(ui.yellow("  (Replace --paper with --live --confirm \"CONFIRM LIVE\" only after manual verification)"))
    else:
        safe_print(ui.dim("  >> No trade coordinates supplied. Staging command skipped."))

    # STEP 7 - Live Alerts / Quotes
    print_step_header(7, f"Live Quote for {norm_symbol}")
    try:
        import nse_alerts
        quote_argv = ["quote", full_symbol]
        if now:
            quote_argv.extend(["--now", now])
        nse_alerts.main(quote_argv)
    except Exception as exc:
        safe_print(ui.yellow(f"  [Live quote warning: {exc}]"))

    # STEP 8 - Mandatory Disclaimer
    safe_print("")
    safe_print(ui.disclaimer())
    safe_print("")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="NSE/BSE Hybrid Trader - Unified Master Pipeline Runner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("symbol", help="NSE/BSE ticker symbol (e.g. SUZLON, RELIANCE, BANKBARODA, NIFTY)")
    p.add_argument("--entry", type=float, default=None, help="Planned entry price in INR")
    p.add_argument("--stop", type=float, default=None, help="Stop loss price in INR")
    p.add_argument("--target", type=float, default=None, help="Target price in INR")
    p.add_argument("--capital", type=float, default=50000.0, help="Account trading capital in INR")
    p.add_argument("--risk-pct", type=float, default=1.0, help="Max capital risk percentage (0.5%% - 2.0%%)")
    p.add_argument("--segment", choices=["EQ_DELIVERY", "EQ_INTRADAY", "FNO_FUT", "FNO_OPT"], default="EQ_DELIVERY", help="Trading segment")
    p.add_argument("--mode", choices=["SWING", "INTRADAY"], default="SWING", help="Holding timeframe mode")
    p.add_argument("--broker", default="zerodha", choices=["angel_one", "zerodha", "upstox", "dhan", "fyers", "groww", "kotak_neo", "icici_breeze", "shoonya"], help="Broker fee profile")
    p.add_argument("--exchange", choices=["NSE", "BSE"], default="NSE", help="Primary exchange")
    p.add_argument("--skip-news", action="store_true", help="Skip RSS/Google News step")
    p.add_argument("--replays", type=int, default=10000, help="Monte Carlo simulated replays")
    p.add_argument("--now", default=None, help="Simulated IST ISO timestamp (for backtesting)")
    p.add_argument("--fno-ban", action="store_true", help="Flag symbol in F&O ban period")
    p.add_argument("--asm-gsm", action="store_true", help="Flag symbol under SEBI ASM/GSM surveillance")
    p.add_argument("--circuit-band", default=None, help="Circuit band percentage (e.g. 5%%, 10%%, 20%%)")
    p.add_argument("--delivery-pct", default=None, help="NSE delivery percentage for the session")
    return p


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return run_all(
        symbol=args.symbol,
        entry=args.entry,
        stop=args.stop,
        target=args.target,
        capital=args.capital,
        risk_pct=args.risk_pct,
        segment=args.segment,
        mode=args.mode,
        broker=args.broker,
        exchange=args.exchange,
        skip_news=args.skip_news,
        replays=args.replays,
        now=args.now,
        fno_ban=args.fno_ban,
        asm_gsm=args.asm_gsm,
        circuit_band=args.circuit_band,
        delivery_pct=args.delivery_pct,
    )


if __name__ == "__main__":
    raise SystemExit(main())
