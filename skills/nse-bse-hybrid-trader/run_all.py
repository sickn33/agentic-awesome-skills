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



def print_trade_decision_brief(symbol: str) -> None:
    """Print comprehensive structured conclusion analyzing each decision factor."""
    ui = UI(color=None)
    import nse_common, tv_indicators
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
    lot_size: int | None = None,
) -> int:
    import nse_common
    sym_info = nse_common.normalize_symbol(symbol)
    norm_symbol = sym_info["base"]
    full_symbol = sym_info["yahoo"]
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
            if lot_size is not None and lot_size > 0:
                rg_argv.extend(["--lot-size", str(lot_size)])
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

    # STEP 8 - Final Actionable Trade Decision & Conclusion
    print_step_header(8, f"Final Actionable Trade Decision & Conclusion ({norm_symbol})")
    print_trade_decision_brief(norm_symbol)

    # STEP 9 - Mandatory Regulatory Disclaimer
    safe_print("")
    safe_print(ui.disclaimer())
    safe_print("")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="NSE/BSE Hybrid Trader - Unified Master Pipeline Runner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("symbol", nargs="?", default=None, help="NSE/BSE ticker symbol (e.g. SUZLON, RELIANCE, BANKBARODA, NIFTY)")
    p.add_argument("--symbol", dest="symbol_opt", default=None, help="Explicit ticker symbol argument")
    p.add_argument("--entry", type=float, default=None, help="Planned entry price in INR")
    p.add_argument("--stop", type=float, default=None, help="Stop loss price in INR")
    p.add_argument("--target", type=float, default=None, help="Target price in INR")
    p.add_argument("--lot-size", type=int, default=None, help="Contract lot size for F&O (e.g. 25 for NIFTY, 15 for BANKNIFTY)")
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
    resolved_symbol = args.symbol_opt or args.symbol
    if not resolved_symbol:
        parser.error("Ticker symbol required (positional or --symbol)")
    return run_all(
        symbol=resolved_symbol,
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
        lot_size=args.lot_size,
    )


if __name__ == "__main__":
    raise SystemExit(main())
