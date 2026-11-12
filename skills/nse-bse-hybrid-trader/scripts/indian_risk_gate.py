#!/usr/bin/env python3
"""Deterministic Indian Position Sizing, Statutory Tax Engine & Hard Risk Gate.
Standard library only. Emits PASS or BLOCK with SHA-256 order fingerprint.

Usage:
    python scripts/indian_risk_gate.py --capital 50000 --risk-pct 1.0 --entry 785 --stop 778 --target 798 --segment EQ_INTRADAY
    python scripts/indian_risk_gate.py --symbol RELIANCE --capital 50000 --risk-pct 1.0 --entry 1324 --stop 1310 --target 1352 --segment EQ_INTRADAY --write --json
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from nse_common import (
    DEFAULT_STATE_DIR,
    SUPPORTED_BROKERS,
    NSETraderError,
    load_json_file,
    load_nse_holidays,
    load_trading_rules,
    normalize_broker,
    normalize_symbol,
    nse_session_info,
    parse_now_ist,
    round_tick,
    write_json_atomic,
)
from nse_ui import UI, format_inr, safe_print

VALID_SEGMENTS = ("EQ_INTRADAY", "EQ_DELIVERY", "FNO_FUT", "FNO_OPT")


def infer_side(entry: float, stop: float, target: float, explicit_side: str | None = None) -> str:
    if entry <= 0 or stop <= 0 or target <= 0:
        raise NSETraderError(f"entry, stop, and target must be > 0 (got {entry}, {stop}, {target})")
    if explicit_side:
        side = explicit_side.strip().lower()
        if side not in ("buy", "sell"):
            raise NSETraderError(f"side must be 'buy' or 'sell', got {explicit_side!r}")
    elif stop < entry < target:
        side = "buy"
    elif target < entry < stop:
        side = "sell"
    else:
        raise NSETraderError(
            f"Cannot infer side from entry={entry}, stop={stop}, target={target}; "
            "long requires stop < entry < target, short requires target < entry < stop"
        )

    if side == "buy" and not (stop < entry < target):
        raise NSETraderError(f"Long trade requires stop < entry < target (got {stop}, {entry}, {target})")
    if side == "sell" and not (target < entry < stop):
        raise NSETraderError(f"Short trade requires target < entry < stop (got {target}, {entry}, {stop})")
    return side


def calculate_indian_charges(
    qty: int,
    entry_price: float,
    exit_price: float,
    side: str,
    segment: str,
    rules: dict[str, Any] | None = None,
    broker: str | None = None,
) -> dict[str, float]:
    """Compute exact round-trip Indian statutory taxes & brokerage in INR."""
    if segment not in VALID_SEGMENTS:
        raise NSETraderError(f"Unsupported segment {segment!r}; expected one of {VALID_SEGMENTS}")
    if qty <= 0:
        return {
            "buy_turnover": 0.0,
            "sell_turnover": 0.0,
            "total_turnover": 0.0,
            "brokerage": 0.0,
            "stt": 0.0,
            "exchange_txn": 0.0,
            "sebi_fee": 0.0,
            "stamp_duty": 0.0,
            "dp_charge": 0.0,
            "gst": 0.0,
            "total_charges": 0.0,
        }

    rules = rules or load_trading_rules()
    ch_cfg = rules["charges"]
    seg: dict[str, Any] = dict(ch_cfg["segments"][segment])
    if broker:
        broker_key = normalize_broker(broker)
        broker_seg = rules.get("brokers", {}).get(broker_key, {}).get("brokerage", {}).get(segment)
        if isinstance(broker_seg, dict):
            seg.update(broker_seg)
    gst_rate = float(ch_cfg["gst_rate"])
    sebi_rate = float(ch_cfg["sebi_turnover_rate"])

    buy_val = qty * (entry_price if side == "buy" else exit_price)
    sell_val = qty * (exit_price if side == "buy" else entry_price)
    turnover = buy_val + sell_val

    mode = str(seg["brokerage_mode"])
    flat = float(seg["brokerage_flat_inr"])
    pct = float(seg["brokerage_pct"])
    min_inr = float(seg.get("brokerage_min_inr", 0.0))

    def _leg_brok(val: float) -> float:
        if val <= 0:
            return 0.0
        if mode == "min_flat_or_pct":
            raw = min(flat, val * pct)
        elif mode == "pct":
            raw = val * pct
        else:
            raw = flat
        return max(min_inr, raw) if min_inr > 0 else raw

    brokerage = _leg_brok(buy_val) + _leg_brok(sell_val)

    stt = buy_val * float(seg["stt_buy_rate"]) + sell_val * float(seg["stt_sell_rate"])
    exchange_txn = turnover * float(seg["exchange_txn_rate"])
    sebi_fee = turnover * sebi_rate
    stamp_duty = buy_val * float(seg["stamp_duty_buy_rate"])
    dp_charge = float(seg["dp_charge_sell_inr"]) if segment == "EQ_DELIVERY" else 0.0
    gst = gst_rate * (brokerage + exchange_txn + sebi_fee)
    total = brokerage + stt + exchange_txn + sebi_fee + stamp_duty + dp_charge + gst

    return {
        "buy_turnover": round(buy_val, 2),
        "sell_turnover": round(sell_val, 2),
        "total_turnover": round(turnover, 2),
        "brokerage": round(brokerage, 2),
        "stt": round(stt, 2),
        "exchange_txn": round(exchange_txn, 2),
        "sebi_fee": round(sebi_fee, 2),
        "stamp_duty": round(stamp_duty, 2),
        "dp_charge": round(dp_charge, 2),
        "gst": round(gst, 2),
        "total_charges": round(total, 2),
    }


def _read_daily_ledger_state(date_str: str, state_dir: Path) -> tuple[float, float, int]:
    """Read (realized_pnl_today, open_risk_today, trades_today) from paper_trades.db if present."""
    db_path = state_dir / "paper_trades.db"
    if not db_path.exists():
        return 0.0, 0.0, 0
    try:
        with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT COALESCE(SUM(realized_net_pnl_inr), 0.0), COUNT(*) "
                "FROM paper_orders WHERE trade_date = ? AND status LIKE 'CLOSED%'",
                (date_str,),
            )
            realized, closed_cnt = cur.fetchone()
            cur.execute(
                "SELECT COALESCE(SUM(max_risk_inr), 0.0), COUNT(*) "
                "FROM paper_orders WHERE trade_date = ? AND status = 'OPEN'",
                (date_str,),
            )
            open_risk, open_cnt = cur.fetchone()
            return float(realized or 0.0), float(open_risk or 0.0), int((closed_cnt or 0) + (open_cnt or 0))
    except sqlite3.Error:
        return 0.0, 0.0, 0


def compute_verdict_fingerprint(payload: dict[str, Any]) -> str:
    core = {
        "symbol": payload["symbol"],
        "segment": payload["segment"],
        "side": payload["side"],
        "qty": payload["qty"],
        "lot_size": payload["lot_size"],
        "entry": payload["entry"],
        "stop": payload["stop"],
        "target": payload["target"],
        "verdict": payload["verdict"],
    }
    if "broker" in payload:
        core["broker"] = payload["broker"]
    blob = json.dumps(core, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def evaluate_risk_gate(
    capital_inr: float,
    risk_pct: float,
    entry: float,
    stop: float,
    target: float,
    segment: str = "EQ_INTRADAY",
    symbol: str = "UNKNOWN",
    side: str | None = None,
    lot_size: int = 1,
    leverage: float | None = None,
    margin_per_lot: float | None = None,
    daily_realized_pnl: float | None = None,
    open_trades_today: int | None = None,
    upper_circuit: float | None = None,
    lower_circuit: float | None = None,
    fno_ban: bool = False,
    asm_gsm: bool = False,
    timemachine_result: dict[str, Any] | None = None,
    tm_gate_mode: str | None = None,
    now_str: str | None = None,
    strict_session: bool = False,
    include_taxes_in_sizing: bool = True,
    rules_path: Path | str | None = None,
    state_dir: Path | str | None = None,
    broker: str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    resolved_broker = normalize_broker(broker) if broker else None
    holidays = load_nse_holidays()
    risk_cfg = rules["risk"]
    sess_cfg = rules["session_ist"]
    tick = float(sess_cfg["tick_size_inr"])
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR

    if capital_inr <= 0:
        raise NSETraderError(f"capital must be > 0, got {capital_inr}")
    if risk_pct <= 0:
        raise NSETraderError(f"risk_pct must be > 0, got {risk_pct}")
    if segment not in VALID_SEGMENTS:
        raise NSETraderError(f"Unsupported segment {segment!r}")
    if lot_size < 1:
        raise NSETraderError(f"lot_size must be >= 1, got {lot_size}")

    side = infer_side(entry, stop, target, explicit_side=side)
    entry_r = round_tick(entry, tick)
    stop_r = round_tick(stop, tick, mode="down" if side == "buy" else "up")
    target_r = round_tick(target, tick)
    risk_per_unit = abs(entry_r - stop_r)
    reward_per_unit = abs(target_r - entry_r)
    if risk_per_unit <= 0:
        raise NSETraderError("Risk per unit cannot be zero after tick rounding")

    dt_ist = parse_now_ist(now_str)
    session_info = nse_session_info(dt_ist, rules=rules, holidays_cfg=holidays)
    sym_info = normalize_symbol(symbol, default_exchange="NSE") if symbol != "UNKNOWN" else {
        "raw": "UNKNOWN",
        "base": "UNKNOWN",
        "yahoo": "UNKNOWN",
        "exchange": "NSE",
        "smartapi_eq": "UNKNOWN",
    }

    eff_leverage = leverage if leverage is not None else float(rules["segment_leverage"][segment])
    if eff_leverage <= 0:
        raise NSETraderError(f"leverage must be > 0, got {eff_leverage}")

    ledger_realized, ledger_open_risk, ledger_trades = _read_daily_ledger_state(session_info["date"], sdir)
    realized_pnl = ledger_realized if daily_realized_pnl is None else daily_realized_pnl
    trades_count = ledger_trades if open_trades_today is None else open_trades_today

    available_capital = capital_inr + realized_pnl
    max_risk_inr = round(capital_inr * (risk_pct / 100.0), 2)

    # Capital/margin constrained quantity
    if available_capital <= 0:
        qty_by_margin = 0
    elif margin_per_lot is not None and margin_per_lot > 0:
        lots_cap = int(available_capital // margin_per_lot)
        qty_by_margin = lots_cap * lot_size
    else:
        max_notional = available_capital * eff_leverage * (float(risk_cfg["max_single_stock_allocation_pct"]) / 100.0)
        qty_by_margin = (int(max_notional // entry_r) // lot_size) * lot_size

    qty_by_risk = (int(max_risk_inr // risk_per_unit) // lot_size) * lot_size
    qty = min(qty_by_margin, qty_by_risk)

    # Adjust quantity down so stop-loss + statutory charges stay inside max_risk_inr
    if include_taxes_in_sizing and qty > 0:
        while qty > 0:
            ch_stop = calculate_indian_charges(qty, entry_r, stop_r, side, segment, rules, broker=resolved_broker)
            if qty * risk_per_unit + ch_stop["total_charges"] <= max_risk_inr:
                break
            qty -= lot_size

    charges_at_target = calculate_indian_charges(qty, entry_r, target_r, side, segment, rules, broker=resolved_broker)
    charges_at_stop = calculate_indian_charges(qty, entry_r, stop_r, side, segment, rules, broker=resolved_broker)
    charges_at_be = calculate_indian_charges(qty, entry_r, entry_r, side, segment, rules, broker=resolved_broker)

    notional = round(qty * entry_r, 2)
    margin_required = round((qty // lot_size) * margin_per_lot, 2) if margin_per_lot else round(notional / eff_leverage, 2)

    gross_profit = round(qty * reward_per_unit, 2)
    gross_loss = round(qty * risk_per_unit, 2)
    net_profit = round(gross_profit - charges_at_target["total_charges"], 2)
    net_loss = round(gross_loss + charges_at_stop["total_charges"], 2)

    gross_rr = round(reward_per_unit / risk_per_unit, 3)
    net_rr = round(net_profit / net_loss, 3) if net_loss > 0 else 0.0
    breakeven_move = round(charges_at_be["total_charges"] / qty, 4) if qty > 0 else 0.0
    breakeven_price = round_tick(entry_r + breakeven_move if side == "buy" else entry_r - breakeven_move, tick)
    tax_drag_pct = round((charges_at_target["total_charges"] / gross_profit) * 100.0, 2) if gross_profit > 0 else 0.0

    # Hard Circuit Breakers
    blocks: list[str] = []
    warnings: list[str] = []

    hard_cap_pct = float(risk_cfg["hard_max_risk_per_trade_pct"])
    if risk_pct > hard_cap_pct:
        blocks.append(f"RISK_CAP_EXCEEDED: Requested {risk_pct}% > hard ceiling {hard_cap_pct}%")

    if qty <= 0:
        blocks.append("ZERO_QUANTITY: Capital, margin, or stop-loss distance cannot accommodate >= 1 unit/lot within risk limit")

    min_net_rr = float(risk_cfg["min_net_rr"])
    if qty > 0 and net_rr < min_net_rr:
        blocks.append(f"NET_RR_TOO_LOW: Tax-adjusted Net R:R {net_rr:.2f} < minimum {min_net_rr:.2f} (gross {gross_rr:.2f})")

    max_daily_dd_inr = capital_inr * (float(risk_cfg["max_daily_drawdown_pct"]) / 100.0)
    projected_worst_day_loss = max(0.0, -realized_pnl) + ledger_open_risk + net_loss
    if realized_pnl <= -max_daily_dd_inr:
        blocks.append(
            f"DAILY_DRAWDOWN_LOCK: Realized P&L Rs. {realized_pnl:.2f} breaches -{risk_cfg['max_daily_drawdown_pct']}% (Rs. -{max_daily_dd_inr:.2f}) daily limit"
        )
    elif projected_worst_day_loss > max_daily_dd_inr and qty > 0:
        blocks.append(
            f"DAILY_RISK_BUDGET_EXCEEDED: Realized/open/new worst-case Rs. {projected_worst_day_loss:.2f} > daily limit Rs. {max_daily_dd_inr:.2f}"
        )

    max_trades = int(risk_cfg["max_open_trades_per_day"])
    if trades_count >= max_trades:
        blocks.append(f"MAX_TRADES_EXCEEDED: {trades_count} trades today >= limit {max_trades}")

    # Regulatory checks
    if fno_ban and segment in ("FNO_FUT", "FNO_OPT"):
        blocks.append("FNO_BAN: Security is in NSE F&O ban (>95% MWPL); new F&O positions prohibited")

    if asm_gsm and segment == "EQ_INTRADAY":
        blocks.append("SEBI_ASM_GSM: Stock under ASM/GSM surveillance; intraday MIS/BO entries prohibited")

    prox_pct = float(sess_cfg["circuit_proximity_block_pct"])
    if side == "buy" and upper_circuit and upper_circuit > 0:
        dist_uc = ((upper_circuit - entry_r) / upper_circuit) * 100.0
        if dist_uc <= prox_pct:
            blocks.append(f"UPPER_CIRCUIT_LOCK_RISK: Entry {entry_r:.2f} is {dist_uc:.2f}% from Upper Circuit {upper_circuit:.2f}")
    if side == "sell" and lower_circuit and lower_circuit > 0:
        dist_lc = ((entry_r - lower_circuit) / lower_circuit) * 100.0
        if dist_lc <= prox_pct:
            blocks.append(f"LOWER_CIRCUIT_LOCK_RISK: Entry {entry_r:.2f} is {dist_lc:.2f}% from Lower Circuit {lower_circuit:.2f}")

    # IST Session window checks
    phase = session_info["phase"]
    if segment == "EQ_INTRADAY":
        if phase in ("PRE_OPEN", "OPENING_RANGE", "HAZARD_WINDOW_NO_NEW_ENTRY", "AUTO_SQUAREOFF_ZONE"):
            # During active trading day, enforce opening range / pre-open / 14:30 hazard blocks
            if phase == "OPENING_RANGE":
                blocks.append("INITIAL_BALANCE_WAIT: 09:15-09:30 IST opening range still forming; wait until 09:30 IST")
            elif phase == "PRE_OPEN":
                blocks.append("PRE_OPEN_BLOCK: Do not stage market/intraday orders during 09:00-09:15 IST pre-open")
            else:
                blocks.append(f"INTRA_HAZARD_WINDOW: New intraday entries blocked during {phase} ({session_info['time_ist']} IST)")
        elif not session_info["is_market_open"]:
            msg = f"Market currently {phase} ({session_info['ist_timestamp']}): valid for planning/paper simulation only; live dispatch blocked"
            if strict_session:
                blocks.append(f"MARKET_CLOSED: {msg}")
            else:
                warnings.append(msg)
    elif strict_session and not session_info["is_market_open"]:
        blocks.append(f"MARKET_CLOSED: {phase} ({session_info['ist_timestamp']})")

    # Optional Time Machine Gate integration
    if timemachine_result:
        tm_broker = timemachine_result.get("broker")
        if resolved_broker and tm_broker not in (None, "standard") and tm_broker != resolved_broker:
            warnings.append(
                f"BROKER_MISMATCH_WARNING: Time Machine used {tm_broker!r} while risk gate uses {resolved_broker!r}"
            )
        active_tm_gate = (
            tm_gate_mode
            or timemachine_result.get("gate_mode")
            or risk_cfg.get("timemachine_gate_mode")
            or "r_breakeven"
        ).strip().lower()
        if active_tm_gate not in ("r_breakeven", "strict_55"):
            raise NSETraderError(f"tm_gate_mode must be 'r_breakeven' or 'strict_55', got {active_tm_gate!r}")

        raw_tm_prob = timemachine_result.get("target_first_resolved_pct")
        tm_prob = float(raw_tm_prob if raw_tm_prob is not None else 0.0)
        raw_tm_ev = timemachine_result.get("avg_net_r")
        if raw_tm_ev is None:
            raw_tm_ev = timemachine_result.get("avg_gross_r")
        tm_ev = float(raw_tm_ev if raw_tm_ev is not None else 0.0)
        if active_tm_gate == "strict_55":
            min_prob = float(risk_cfg["min_timemachine_target_prob_pct"])
        else:
            r_val = float(timemachine_result.get("r_at_target") or gross_rr)
            tax_drag_r = float(timemachine_result.get("estimated_tax_drag_r") or 0.0)
            default_be = round(min(100.0, 100.0 * (1.0 + tax_drag_r) / (1.0 + r_val)), 2)
            min_prob = float(timemachine_result.get("breakeven_prob_net_pct") or default_be)

        if tm_prob < min_prob:
            blocks.append(f"TIMEMACHINE_PROB_LOW: Target-First prob {tm_prob:.2f}% < {min_prob:.2f}% ({active_tm_gate})")
        if tm_ev <= 0:
            blocks.append(f"TIMEMACHINE_NEGATIVE_EV: Net Expected Value {tm_ev:+.3f}R <= 0")

    verdict = "BLOCK" if blocks else "PASS"
    result: dict[str, Any] = {
        "verdict": verdict,
        "broker": resolved_broker or "standard",
        "symbol": sym_info["base"],
        "yahoo_symbol": sym_info["yahoo"],
        "exchange": sym_info["exchange"],
        "segment": segment,
        "side": side,
        "entry": entry_r,
        "stop": stop_r,
        "target": target_r,
        "qty": qty,
        "lot_size": lot_size,
        "lots": qty // lot_size if lot_size > 0 else 0,
        "capital_inr": round(capital_inr, 2),
        "available_capital_inr": round(available_capital, 2),
        "risk_pct": risk_pct,
        "max_risk_allowed_inr": max_risk_inr,
        "notional_value_inr": notional,
        "leverage_used": eff_leverage,
        "margin_required_inr": margin_required,
        "gross_profit_at_target_inr": gross_profit,
        "net_profit_at_target_inr": net_profit,
        "gross_loss_at_stop_inr": gross_loss,
        "net_loss_at_stop_inr": net_loss,
        "gross_rr": gross_rr,
        "net_rr": net_rr,
        "breakeven_move_inr": breakeven_move,
        "breakeven_price_inr": breakeven_price,
        "tax_drag_pct_of_gross": tax_drag_pct,
        "charges_at_target": charges_at_target,
        "charges_at_stop": charges_at_stop,
        "daily_state": {
            "date": session_info["date"],
            "realized_pnl_inr": round(realized_pnl, 2),
            "open_risk_inr": round(ledger_open_risk, 2),
            "trades_today": trades_count,
            "daily_drawdown_limit_inr": round(max_daily_dd_inr, 2),
        },
        "session": session_info,
        "blocks": blocks,
        "warnings": warnings,
    }
    result["fingerprint"] = compute_verdict_fingerprint(result)
    return result


def format_human_verdict(res: dict[str, Any], color: bool | None = None) -> str:
    ui = UI(color=color)
    ch = res["charges_at_target"]
    verdict = str(res["verdict"]).upper()
    v_tone = "pass" if verdict == "PASS" else "block"
    sess = res.get("session") or {}
    ds = res.get("daily_state") or {}
    ts_short = str(sess.get("ist_timestamp", "")).replace("T", " ")[:19] + " IST"

    qty_desc = (
        f"{res['side'].upper()} {res['qty']} shares"
        if int(res.get("lot_size", 1)) <= 1
        else f"{res['side'].upper()} {res['qty']} qty ({res['lots']} lots x {res['lot_size']})"
    )

    blocks: list[str] = [
        ui.banner(
            title=f"INDIAN RISK & TAX GATE  {ui.dot_ch}  {res['symbol']} ({res['segment']})",
            subtitle=f"Broker: {res.get('broker', 'standard')}  |  {ts_short} ({sess.get('phase', 'N/A')})  |  ID: {res['fingerprint']}",
            badge=verdict,
            badge_tone=v_tone,
            meta_lines=[
                f"Position: {ui.bold(qty_desc)}   |   Max Allowed Risk: {ui.bold(format_inr(res['max_risk_allowed_inr']))} ({res['risk_pct']:.2f}% of capital)",
            ],
        )
    ]

    # Table 1: Position Sizing & Capital
    stop_num = f"{float(res['stop']):,.2f}"
    targ_num = f"{float(res['target']):,.2f}"
    pos_rows = [
        [
            "Action & Quantity",
            ui.tone(qty_desc, "good" if res["side"] == "buy" else "bad", bold=True),
            "Auto-sized so even a stop-loss + taxes stays inside your risk budget.",
        ],
        [
            "Entry / Stop / Target",
            f"{format_inr(res['entry'])} / {ui.red(stop_num)} / {ui.green(targ_num)}",
            "Planned Entry, Stop-Loss & Target prices (Rs. 0.05 tick grid).",
        ],
        [
            "Tax Breakeven Price",
            f"{format_inr(res['breakeven_price_inr'])} (+{format_inr(res['breakeven_move_inr'])}/unit)",
            "Price must move past this just to cover brokerage & Indian taxes.",
        ],
        [
            "Notional Value",
            format_inr(res["notional_value_inr"]),
            "Total market value of shares/contracts controlled.",
        ],
        [
            f"Margin Required ({res['leverage_used']}x)",
            ui.bold(format_inr(res["margin_required_inr"])),
            "Cash blocked in your broker account for this trade.",
        ],
    ]
    blocks.append("")
    blocks.append(ui.section("1. Exact Position Size & Capital Required"))
    blocks.append(
        ui.table(
            headers=["Parameter", "Value", "Beginner Explanation"],
            rows=pos_rows,
            alignments=["left", "left", "left"],
            nowrap_cols={0, 1},
        )
    )

    # Table 2: Gross vs Net P&L and R:R
    net_rr = float(res["net_rr"])
    rr_ok = net_rr >= 1.5
    pnl_rows = [
        [
            "Target Hit (Profit)",
            ui.green(format_inr(res["gross_profit_at_target_inr"], signed=True)),
            ui.red(f"-{format_inr(ch['total_charges'])}"),
            ui.green(format_inr(res["net_profit_at_target_inr"], signed=True), bold=True),
        ],
        [
            "Stop-Loss Hit (Loss)",
            ui.red(format_inr(-abs(float(res.get("gross_loss_at_stop_inr", 0.0))), signed=True)),
            ui.red(f"-{format_inr(res['charges_at_stop']['total_charges'])}"),
            ui.red(format_inr(-abs(float(res["net_loss_at_stop_inr"])), signed=True), bold=True),
        ],
    ]
    blocks.append("")
    blocks.append(ui.section("2. Profit, Loss & Tax-Adjusted Risk-to-Reward"))
    blocks.append(
        ui.table(
            headers=["Scenario", "Gross P&L", "Broker + Taxes", "Net P&L (In Pocket)"],
            rows=pnl_rows,
            alignments=["left", "right", "right", "right"],
            footer=(
                f"Gross R:R = {res['gross_rr']:.2f}  ->  Net R:R = {net_rr:.2f} "
                f"({'OK >= 1.50' if rr_ok else 'TOO LOW < 1.50'})  |  Tax Drag = {res['tax_drag_pct_of_gross']:.2f}% of gross profit"
            ),
        )
    )

    # Table 3: Fee Breakdown
    total_ch = max(float(ch["total_charges"]), 0.01)
    fee_items = [
        ("Brokerage", float(ch["brokerage"]), "Fee charged by your broker (buy + sell)."),
        ("STT (2026 Rate)", float(ch["stt"]), "Securities Transaction Tax paid to Govt of India."),
        ("NSE Exchange Txn", float(ch["exchange_txn"]), "NSE/BSE exchange turnover fee."),
        ("SEBI Turnover Fee", float(ch["sebi_fee"]), "SEBI regulatory fee (Rs. 10 per Crore)."),
        ("Stamp Duty", float(ch["stamp_duty"]), "State stamp duty charged on the buy side."),
        ("DP Charge", float(ch["dp_charge"]), "Depository charge when selling delivery shares."),
        ("GST (18%)", float(ch["gst"]), "18% GST on brokerage + exchange + SEBI fees."),
    ]
    fee_rows = [
        [
            name,
            format_inr(amt),
            f"{(amt / total_ch) * 100.0:5.1f}%",
            note,
        ]
        for name, amt, note in fee_items
        if amt > 0 or name in ("Brokerage", "STT (2026 Rate)", "GST (18%)")
    ]
    fee_rows.append(
        [
            ui.bold("TOTAL CHARGES (At Target)"),
            ui.bold(format_inr(ch["total_charges"])),
            ui.bold("100.0%"),
            "Round-trip cost deducted automatically from P&L.",
        ]
    )
    blocks.append("")
    blocks.append(ui.section("3. Indian Tax & Brokerage Breakdown (2026 Schedule)"))
    blocks.append(
        ui.table(
            headers=["Charge Line Item", "Amount (INR)", "Share", "What It Is"],
            rows=fee_rows,
            alignments=["left", "right", "right", "left"],
        )
    )

    # Table 4: Daily Risk Budget
    dd_lim = float(ds.get("daily_drawdown_limit_inr") or 0.0)
    used_risk = max(0.0, -min(0.0, float(ds.get("realized_pnl_inr") or 0.0)) + float(ds.get("open_risk_inr") or 0.0))
    dd_bar = ui.bar(used_risk, dd_lim if dd_lim > 0 else 1.0, width=10, tone_name="warn" if used_risk < dd_lim else "bad")
    blocks.append("")
    blocks.append(ui.section("4. Daily Account Guardrails (Paper Ledger Synced)"))
    blocks.append(
        ui.table(
            headers=["Trades Today", "Today Realized P&L", "Open Risk", "Daily DD Limit", "Budget Used"],
            rows=[
                [
                    str(ds.get("trades_today", 0)),
                    ui.pnl_inr(ds.get("realized_pnl_inr", 0.0)),
                    format_inr(ds.get("open_risk_inr", 0.0)),
                    format_inr(dd_lim),
                    f"[{dd_bar}] {format_inr(used_risk)}",
                ]
            ],
            alignments=["center", "right", "right", "right", "left"],
            nowrap_cols={0, 1, 2, 3, 4},
        )
    )

    if res["warnings"]:
        blocks.append("")
        blocks.append(ui.callout("Risk Gate Warnings", res["warnings"], tone_name="warn"))
    if res["blocks"]:
        blocks.append("")
        blocks.append(
            ui.callout(
                "BLOCKED - DO NOT TRADE",
                [
                    *res["blocks"],
                    "Rule: Never override a BLOCK verdict. Fix the setup or skip today.",
                ],
                tone_name="bad",
            )
        )
    elif verdict == "PASS":
        blocks.append("")
        blocks.append(
            ui.callout(
                "Approved - Next Step",
                [
                    f"Gate PASSED (Fingerprint: {res['fingerprint']}).",
                    "Stage a risk-free paper order: python scripts/broker_bridge.py stage --risk-json state/risk_verdict.json --paper",
                ],
                tone_name="good",
            )
        )

    return "\n".join(blocks)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Deterministic Indian Risk Sizing & Statutory Tax Gate")
    p.add_argument("--symbol", default="UNKNOWN", help="Ticker symbol (e.g., TATAMOTORS, RELIANCE.NS)")
    p.add_argument("--capital", type=float, default=50000.0, help="Account capital in INR (default 50000)")
    p.add_argument("--risk-pct", type=float, default=1.0, help="Capital risk %% per trade (default 1.0, ceiling 2.0)")
    p.add_argument("--entry", type=float, required=True, help="Planned entry price in INR")
    p.add_argument("--stop", type=float, required=True, help="Stop-loss price in INR")
    p.add_argument("--target", type=float, required=True, help="Target price in INR")
    p.add_argument("--segment", default="EQ_INTRADAY", choices=VALID_SEGMENTS, help="Trading segment")
    p.add_argument("--side", default=None, choices=["buy", "sell"], help="Trade side (auto-inferred if omitted)")
    p.add_argument("--lot-size", type=int, default=1, help="NSE lot size (1 for equities, contract lot for F&O)")
    p.add_argument("--leverage", type=float, default=None, help="Margin multiplier override")
    p.add_argument("--margin-per-lot", type=float, default=None, help="Explicit SPAN+Exposure margin per F&O lot in INR")
    p.add_argument("--daily-realized-pnl", type=float, default=None, help="Today's realized P&L in INR (defaults to paper ledger)")
    p.add_argument("--open-trades-today", type=int, default=None, help="Trades already placed today")
    p.add_argument("--upper-circuit", type=float, default=None, help="Exchange upper circuit price")
    p.add_argument("--lower-circuit", type=float, default=None, help="Exchange lower circuit price")
    p.add_argument("--fno-ban", action="store_true", help="Flag if ticker is in NSE F&O ban (>95%% MWPL)")
    p.add_argument("--asm-gsm", action="store_true", help="Flag if ticker is under SEBI ASM/GSM surveillance")
    p.add_argument("--timemachine-json", default=None, help="Path to Time Machine JSON output for combined gating")
    p.add_argument(
        "--tm-gate",
        default=None,
        choices=["r_breakeven", "strict_55"],
        help="Override Time Machine probability gate (r_breakeven or strict_55)",
    )
    p.add_argument(
        "--broker",
        default=None,
        choices=SUPPORTED_BROKERS,
        help="Optional broker fee schedule override (zerodha, angel_one, upstox, dhan, fyers, groww, kotak_neo, icici_breeze, shoonya)",
    )
    p.add_argument("--now", default=None, help="Pin IST timestamp, e.g. '2026-11-09 10:15'")
    p.add_argument("--strict-session", action="store_true", help="Block if market is currently closed")
    p.add_argument("--no-tax-sizing", action="store_true", help="Do not reduce qty for stop-loss statutory tax buffer")
    p.add_argument("--write", action="store_true", help="Persist risk verdict JSON to state/risk_verdict.json")
    p.add_argument("--state-dir", default=None, help="Custom state directory")
    p.add_argument("--json", action="store_true", help="Output JSON")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        tm_data = load_json_file(args.timemachine_json, required=True) if args.timemachine_json else None

        res = evaluate_risk_gate(
            capital_inr=args.capital,
            risk_pct=args.risk_pct,
            entry=args.entry,
            stop=args.stop,
            target=args.target,
            segment=args.segment,
            symbol=args.symbol,
            side=args.side,
            lot_size=args.lot_size,
            leverage=args.leverage,
            margin_per_lot=args.margin_per_lot,
            daily_realized_pnl=args.daily_realized_pnl,
            open_trades_today=args.open_trades_today,
            upper_circuit=args.upper_circuit,
            lower_circuit=args.lower_circuit,
            fno_ban=args.fno_ban,
            asm_gsm=args.asm_gsm,
            timemachine_result=tm_data,
            tm_gate_mode=args.tm_gate,
            broker=args.broker,
            now_str=args.now,
            strict_session=args.strict_session,
            include_taxes_in_sizing=not args.no_tax_sizing,
            state_dir=args.state_dir,
        )
        if args.write:
            sdir = Path(args.state_dir) if args.state_dir else DEFAULT_STATE_DIR
            write_json_atomic(sdir / "risk_verdict.json", res)
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if args.json else f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        safe_print(format_human_verdict(res))
    return 0 if res["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

