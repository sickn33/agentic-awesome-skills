#!/usr/bin/env python3
"""NSE/BSE Intraday & Swing Monte Carlo 'Time Machine'.
Standard library only. Replays 10,000 bootstrapped price paths truncated at 15:15 IST
(intraday) or N trading days (swing), with conservative stop-first checks and
Indian statutory tax-adjusted Expected Value.

Usage:
    python scripts/nse_timemachine.py --symbol "RELIANCE.NS" --entry 1324 --stop 1310 --target 1352 --mode INTRADAY
    python scripts/nse_timemachine.py --symbol "TATAMOTORS.NS" --entry 785 --stop 778 --target 798 --mode INTRADAY --write --json
"""

from __future__ import annotations

import argparse
import json
import random
import statistics
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from indian_risk_gate import VALID_SEGMENTS, calculate_indian_charges, infer_side
from nse_common import (
    DEFAULT_STATE_DIR,
    SUPPORTED_BROKERS,
    NSETraderError,
    extract_chart_result,
    fetch_yahoo_chart,
    format_clock_24,
    load_trading_rules,
    normalize_broker,
    normalize_symbol,
    parse_clock_minutes,
    parse_now_ist,
    read_offline_chart,
    round_stop_away,
    round_tick,
    write_json_atomic,
)
from nse_data_loader import NSE_OPEN_MIN, NSE_SESSION_BARS, parse_bars_from_chart
from nse_ui import UI, format_inr, safe_print

if TYPE_CHECKING:
    import datetime


def _pct(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = min(len(sorted_vals) - 1, max(0, int(q * len(sorted_vals))))
    return sorted_vals[idx]


def _full_intraday_sessions(
    bars_5m: list[dict[str, Any]],
    required_slots: int = 72,
) -> tuple[list[tuple[str, list[dict[str, Any]]]], list[dict[str, Any]]]:
    """Keep sessions having every 5m bar from slot 0 (09:15 IST) through required_slots-1 (default 15:15 cutoff)."""
    by_day: dict[str, dict[int, dict[str, Any]]] = {}
    for b in bars_5m:
        by_day.setdefault(b["date"], {})[b["slot"]] = b
    full: list[tuple[str, list[dict[str, Any]]]] = []
    short: list[dict[str, Any]] = []
    for day in sorted(by_day):
        slots = by_day[day]
        if all(i in slots for i in range(required_slots)):
            full.append((day, [slots[i] for i in range(required_slots)]))
        else:
            short.append({"date": day, "bars": len(slots)})
    return full, short


def _build_intraday_pool(
    sessions: list[tuple[str, list[dict[str, Any]]]],
    num_slots: int,
) -> list[list[tuple[float, float, float, float]]]:
    pool: list[list[tuple[float, float, float, float]]] = [[] for _ in range(num_slots)]
    for _, bars in sessions:
        for i in range(1, num_slots):
            pc = bars[i - 1]["c"]
            if pc <= 0:
                continue
            b = bars[i]
            pool[i].append((b["o"] / pc, b["h"] / pc, b["l"] / pc, b["c"] / pc))
    return pool


def _build_daily_pool(bars_1d: list[dict[str, Any]]) -> list[tuple[float, float, float, float]]:
    pool: list[tuple[float, float, float, float]] = []
    for i in range(1, len(bars_1d)):
        pc = bars_1d[i - 1]["c"]
        if pc <= 0:
            continue
        b = bars_1d[i]
        pool.append((b["o"] / pc, b["h"] / pc, b["l"] / pc, b["c"] / pc))
    return pool


def _resolve_entry_slot(entry_time: str | None, now_ist: datetime.datetime, last_slot: int) -> tuple[int, str, str]:
    """Return (entry_bar_slot, resolved_clock_str, source)."""
    if entry_time:
        mins = parse_clock_minutes(entry_time, label="--entry-time")
        src = "explicit"
    else:
        now_mins = now_ist.hour * 60 + now_ist.minute
        if NSE_OPEN_MIN + 15 <= now_mins <= NSE_OPEN_MIN + last_slot * 5:
            mins = now_mins - ((now_mins - NSE_OPEN_MIN) % 5)
            src = "live_ist"
        else:
            mins = NSE_OPEN_MIN + 15  # 09:30 IST after 15m Opening Range
            src = "default_09:30"

    if mins < NSE_OPEN_MIN or (mins - NSE_OPEN_MIN) % 5 != 0:
        raise NSETraderError(
            f"entry_time {format_clock_24(mins)} must be on the 5-minute NSE grid starting 09:15 IST"
        )
    # Bar k closes at 09:15 + 5*(k+1); slot index of entry bar is (mins - 09:15)//5 - 1 if >= 09:20 else 0
    k = max(0, (mins - NSE_OPEN_MIN) // 5 - 1)
    if k >= last_slot:
        raise NSETraderError(
            f"entry_time {format_clock_24(mins)} leaves no bars before cutoff slot {last_slot}"
        )
    return k, format_clock_24(mins), src


def _historical_orb_replay(
    sessions: list[tuple[str, list[dict[str, Any]]]],
    last_slot: int,
    side: str,
    target_r: float,
    tick: float,
    or_minutes: int = 15,
) -> dict[str, Any]:
    long = side == "buy"
    n_or = or_minutes // 5
    trades: list[dict[str, Any]] = []
    r_values: list[float] = []
    for day, bars in sessions:
        oh = max(b["h"] for b in bars[:n_or])
        ol = min(b["l"] for b in bars[:n_or])
        k = next((i for i in range(n_or, last_slot + 1) if (bars[i]["c"] > oh if long else bars[i]["c"] < ol)), None)
        if k is None:
            continue
        e = round_tick(bars[k]["c"], tick)
        s = round_stop_away((oh + ol) / 2.0, side, tick)
        risk = (e - s) if long else (s - e)
        if risk <= 0:
            continue
        t = round_tick(e + target_r * risk if long else e - target_r * risk, tick)
        oc = None
        for b in bars[k + 1 : last_slot + 1]:
            if (b["l"] <= s) if long else (b["h"] >= s):
                oc = "stop"
                break
            if (b["h"] >= t) if long else (b["l"] <= t):
                oc = "target"
                break
        cl = bars[last_slot]["c"]
        r_val = float(target_r if oc == "target" else -1.0 if oc == "stop" else ((cl - e) if long else (e - cl)) / risk)
        r_rounded = round(r_val, 2)
        r_values.append(r_rounded)
        trades.append({"date": day, "entry_bar": bars[k]["time"], "outcome": oc or "close", "R": r_rounded})

    return {
        "sessions_tested": len(sessions),
        "orb_signals_fired": len(trades),
        "target_hits": sum(1 for x in trades if x["outcome"] == "target"),
        "stop_hits": sum(1 for x in trades if x["outcome"] == "stop"),
        "cutoff_closes": sum(1 for x in trades if x["outcome"] == "close"),
        "avg_R": round(statistics.mean(r_values), 3) if r_values else None,
        "recent_trades": trades[-5:],
    }


def _estimate_tax_drag_in_r(
    entry: float,
    stop: float,
    target: float,
    side: str,
    segment: str,
    capital_inr: float,
    risk_pct: float,
    rules: dict[str, Any],
    broker: str | None = None,
) -> tuple[float, float, int]:
    risk_per_unit = abs(entry - stop)
    max_risk_inr = capital_inr * (risk_pct / 100.0)
    qty = max(1, int(max_risk_inr // risk_per_unit))
    leverage = float(rules["segment_leverage"].get(segment, 1.0))
    max_qty_cap = max(1, int((capital_inr * leverage) // entry))
    qty = min(qty, max_qty_cap)
    charges = calculate_indian_charges(qty, entry, target, side, segment, rules=rules, broker=broker)
    total_risk_inr = qty * risk_per_unit
    tax_drag_r = charges["total_charges"] / total_risk_inr if total_risk_inr > 0 else 0.0
    return round(tax_drag_r, 4), charges["total_charges"], qty


def run_timemachine(
    symbol: str,
    entry: float,
    stop: float,
    target: float,
    mode: str = "INTRADAY",
    side: str | None = None,
    entry_time: str | None = None,
    until_ist: str | None = None,
    replays: int | None = None,
    seed: int | None = None,
    slippage_ticks: int | None = None,
    capital_inr: float | None = None,
    risk_pct: float | None = None,
    segment: str | None = None,
    horizon_days: int | None = None,
    gate_mode: str | None = None,
    offline_path: str | None = None,
    now_str: str | None = None,
    rules_path: Path | str | None = None,
    broker: str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    resolved_broker = normalize_broker(broker) if broker else None
    tm_cfg = rules["timemachine"]
    sess_cfg = rules["session_ist"]
    risk_cfg = rules["risk"]
    tick = float(sess_cfg["tick_size_inr"])

    mode = mode.strip().upper()
    if mode not in ("INTRADAY", "SWING"):
        raise NSETraderError(f"mode must be INTRADAY or SWING, got {mode!r}")

    side = infer_side(entry, stop, target, explicit_side=side)
    long = side == "buy"

    slip_ticks = int(slippage_ticks if slippage_ticks is not None else risk_cfg["default_slippage_ticks"])
    slip_inr = slip_ticks * tick
    eff_entry = round_tick(entry + slip_inr if long else entry - slip_inr, tick)
    if eff_entry <= 0:
        raise NSETraderError(f"Effective entry {eff_entry} must be positive")
    stop_r = round_tick(stop, tick, mode="down" if long else "up")
    target_r = round_tick(target, tick)

    risk_per_unit = (eff_entry - stop_r) if long else (stop_r - eff_entry)
    if risk_per_unit <= 0:
        raise NSETraderError(f"Effective entry {eff_entry} after {slip_ticks}-tick slippage crosses stop {stop_r}")
    r_at_target = round(((target_r - eff_entry) if long else (eff_entry - target_r)) / risk_per_unit, 4)

    n_replays = int(replays if replays is not None else tm_cfg["replays"])
    if n_replays < 1:
        raise NSETraderError(f"replays must be >= 1, got {n_replays}")
    sim_seed = int(seed if seed is not None else tm_cfg["seed"])
    slot_window = int(tm_cfg["slot_window"])
    cap = float(capital_inr if capital_inr is not None else rules["capital_inr"])
    rpct = float(risk_pct if risk_pct is not None else risk_cfg["default_risk_per_trade_pct"])
    if cap <= 0:
        raise NSETraderError(f"capital_inr must be > 0, got {cap}")
    if rpct <= 0:
        raise NSETraderError(f"risk_pct must be > 0, got {rpct}")
    seg = segment or ("EQ_INTRADAY" if mode == "INTRADAY" else "EQ_DELIVERY")
    if seg not in VALID_SEGMENTS:
        raise NSETraderError(f"Unsupported segment {seg!r}; expected one of {VALID_SEGMENTS}")

    sym_info = normalize_symbol(symbol)
    yahoo_sym = sym_info["yahoo"]
    dt_ist = parse_now_ist(now_str)

    rng = random.Random(sim_seed)  # noqa: S311 - deterministic PRNG for Monte Carlo replay
    choice = rng.choice

    outcomes: list[str] = []
    closes: list[float] = []
    rs: list[float] = []
    warnings: list[str] = []
    context: dict[str, Any] = {}

    if mode == "INTRADAY":
        until_str = until_ist or sess_cfg["sim_cutoff_ist"]
        until_min = parse_clock_minutes(until_str, label="--until")
        last_slot = (until_min - NSE_OPEN_MIN) // 5 - 1
        if not 1 <= last_slot < NSE_SESSION_BARS:
            raise NSETraderError(f"--until {until_str} is outside NSE session (09:20 to 15:30 IST)")

        k_slot, entry_clock, entry_src = _resolve_entry_slot(entry_time, dt_ist, last_slot)
        raw_text = read_offline_chart(offline_path, yahoo_sym) if offline_path else fetch_yahoo_chart(yahoo_sym, range_="60d", interval="5m")
        _, bars_5m = parse_bars_from_chart(extract_chart_result(raw_text, yahoo_sym), interval="5m")
        required_slots = last_slot + 1
        sessions, short_days = _full_intraday_sessions(bars_5m, required_slots=required_slots)
        min_sess = int(tm_cfg["min_full_sessions"])
        if len(sessions) < min_sess:
            raise NSETraderError(
                f"Need at least {min_sess} full NSE sessions ({required_slots} bars up to {format_clock_24(until_min)} IST) "
                f"for Monte Carlo pool; found {len(sessions)} for {yahoo_sym}"
            )
        pool = _build_intraday_pool(sessions, num_slots=required_slots)

        for _ in range(n_replays):
            p = eff_entry
            oc = None
            for i in range(k_slot + 1, last_slot + 1):
                s_idx = i if slot_window == 0 else min(last_slot, max(1, i + rng.randint(-slot_window, slot_window)))
                _, hi_r, lo_r, cl_r = choice(pool[s_idx])
                hi, lo, cl = p * hi_r, p * lo_r, p * cl_r
                if oc is None:
                    if long:
                        if lo <= stop_r:
                            oc = "stop"
                        elif hi >= target_r:
                            oc = "target"
                    elif hi >= stop_r:
                        oc = "stop"
                    elif lo <= target_r:
                        oc = "target"
                p = cl
            final_oc = oc or "cutoff"
            outcomes.append(final_oc)
            closes.append(p)
            if final_oc == "target":
                rs.append(r_at_target)
            elif final_oc == "stop":
                rs.append(-1.0)
            else:
                rs.append(((p - eff_entry) if long else (eff_entry - p)) / risk_per_unit)

        orb_hist = _historical_orb_replay(sessions, last_slot, side, r_at_target, tick)
        context = {
            "full_sessions_in_pool": len(sessions),
            "incomplete_sessions_skipped": len(short_days),
            "entry_time_ist": entry_clock,
            "entry_time_source": entry_src,
            "entry_slot": k_slot,
            "cutoff_ist": format_clock_24(until_min),
            "cutoff_slot": last_slot,
            "bars_simulated_per_path": last_slot - k_slot,
            "historical_orb_replay": orb_hist,
        }
    else:
        days_fwd = int(horizon_days if horizon_days is not None else tm_cfg["default_swing_horizon_days"])
        if days_fwd < 1:
            raise NSETraderError(f"horizon_days must be >= 1, got {days_fwd}")
        raw_text = read_offline_chart(offline_path, yahoo_sym) if offline_path else fetch_yahoo_chart(yahoo_sym, range_="2y", interval="1d")
        _, bars_1d = parse_bars_from_chart(extract_chart_result(raw_text, yahoo_sym), interval="1d")
        daily_pool = _build_daily_pool(bars_1d)
        if len(daily_pool) < 60:
            raise NSETraderError(f"Need >= 60 daily return bars for SWING Time Machine; found {len(daily_pool)}")

        for _ in range(n_replays):
            p = eff_entry
            oc = None
            for _d in range(days_fwd):
                _, hi_r, lo_r, cl_r = choice(daily_pool)
                hi, lo, cl = p * hi_r, p * lo_r, p * cl_r
                if oc is None:
                    if long:
                        if lo <= stop_r:
                            oc = "stop"
                        elif hi >= target_r:
                            oc = "target"
                    elif hi >= stop_r:
                        oc = "stop"
                    elif lo <= target_r:
                        oc = "target"
                p = cl
            final_oc = oc or "cutoff"
            outcomes.append(final_oc)
            closes.append(p)
            if final_oc == "target":
                rs.append(r_at_target)
            elif final_oc == "stop":
                rs.append(-1.0)
            else:
                rs.append(((p - eff_entry) if long else (eff_entry - p)) / risk_per_unit)

        context = {
            "daily_bars_in_pool": len(daily_pool),
            "swing_horizon_days": days_fwd,
        }

    cnt_target = outcomes.count("target")
    cnt_stop = outcomes.count("stop")
    cnt_neither = outcomes.count("cutoff")
    green = sum(
        1
        for oc, p in zip(outcomes, closes, strict=True)
        if oc == "target" or (oc == "cutoff" and (p > eff_entry if long else p < eff_entry))
    )

    p_target_pct = round((cnt_target / n_replays) * 100.0, 2)
    p_stop_pct = round((cnt_stop / n_replays) * 100.0, 2)
    p_neither_pct = round((cnt_neither / n_replays) * 100.0, 2)
    resolved = cnt_target + cnt_stop
    target_first_resolved_pct = round((cnt_target / resolved) * 100.0, 2) if resolved > 0 else 0.0

    avg_gross_r = round(statistics.mean(rs), 4)
    tax_drag_r, est_charges_inr, sample_qty = _estimate_tax_drag_in_r(
        eff_entry, stop_r, target_r, side, seg, cap, rpct, rules, broker=resolved_broker
    )
    avg_net_r = round(avg_gross_r - tax_drag_r, 4)
    ev_net_inr = round(avg_net_r * (sample_qty * risk_per_unit), 2)

    srt_closes = sorted(closes)
    active_gate = (gate_mode or risk_cfg.get("timemachine_gate_mode") or "r_breakeven").strip().lower()
    if active_gate not in ("r_breakeven", "strict_55"):
        raise NSETraderError(f"gate_mode must be 'r_breakeven' or 'strict_55', got {active_gate!r}")

    strict_floor_pct = float(risk_cfg["min_timemachine_target_prob_pct"])
    breakeven_gross_pct = round(100.0 / (1.0 + r_at_target), 2)
    breakeven_net_pct = round(min(100.0, 100.0 * (1.0 + tax_drag_r) / (1.0 + r_at_target)), 2)

    passes_r_breakeven = resolved > 0 and target_first_resolved_pct >= breakeven_net_pct and avg_net_r > 0
    passes_strict_55 = resolved > 0 and target_first_resolved_pct >= strict_floor_pct and avg_net_r > 0

    required_prob_pct = strict_floor_pct if active_gate == "strict_55" else breakeven_net_pct

    many_neither = float(tm_cfg["many_neither_warning_pct"])
    if p_neither_pct > many_neither:
        warnings.append(
            f"HIGH_UNRESOLVED_RATE: {p_neither_pct:.1f}% of paths remained open at cutoff without hitting target or stop"
        )

    reasons: list[str] = []
    if resolved == 0:
        reasons.append("Zero simulated paths hit either target or stop before cutoff")
    if target_first_resolved_pct < required_prob_pct:
        reasons.append(
            f"Target-First resolved probability {target_first_resolved_pct:.2f}% < {required_prob_pct:.2f}% ({active_gate})"
        )
    if avg_net_r <= 0:
        reasons.append(f"Tax-adjusted Expected Value {avg_net_r:+.4f}R <= 0")

    verdict = "PASS" if not reasons else "NO-TRADE"

    return {
        "verdict": verdict,
        "gate_mode": active_gate,
        "broker": resolved_broker or "standard",
        "symbol": sym_info["base"],
        "yahoo_symbol": yahoo_sym,
        "mode": mode,
        "segment": seg,
        "side": side,
        "planned_entry": round_tick(entry, tick),
        "effective_entry_with_slippage": eff_entry,
        "slippage_ticks": slip_ticks,
        "stop": stop_r,
        "target": target_r,
        "r_at_target": r_at_target,
        "replays": n_replays,
        "seed": sim_seed,
        "p_target_pct": p_target_pct,
        "p_stop_pct": p_stop_pct,
        "p_neither_pct": p_neither_pct,
        "target_first_resolved_pct": target_first_resolved_pct,
        "breakeven_prob_gross_pct": breakeven_gross_pct,
        "breakeven_prob_net_pct": breakeven_net_pct,
        "strict_prob_floor_pct": strict_floor_pct,
        "passes_r_breakeven": passes_r_breakeven,
        "passes_strict_55": passes_strict_55,
        "p_green_pct": round((green / n_replays) * 100.0, 2),
        "avg_gross_r": avg_gross_r,
        "estimated_tax_drag_r": tax_drag_r,
        "avg_net_r": avg_net_r,
        "sample_qty_for_ev": sample_qty,
        "estimated_charges_inr": est_charges_inr,
        "net_ev_inr": ev_net_inr,
        "median_close": round(_pct(srt_closes, 0.50), 2),
        "p5_close": round(_pct(srt_closes, 0.05), 2),
        "p95_close": round(_pct(srt_closes, 0.95), 2),
        "context": context,
        "warnings": warnings,
        "fail_reasons": reasons,
    }


def format_human_tm(res: dict[str, Any], color: bool | None = None) -> str:
    ui = UI(color=color)
    ctx = res["context"]
    verdict = str(res["verdict"]).upper()
    v_tone = "pass" if verdict == "PASS" else "no-trade"

    blocks: list[str] = [
        ui.banner(
            title=f"NSE/BSE TIME MACHINE  {ui.dot_ch}  {res['yahoo_symbol']} ({res['mode']})",
            subtitle=f"Side: {res['side'].upper()}  |  Broker: {res.get('broker', 'standard')}  |  Gate: {res['gate_mode']}  |  Replays: {res['replays']:,} (seed {res['seed']})",
            badge=verdict,
            badge_tone=v_tone,
            meta_lines=[
                ui.dim("What this does: Replays 10,000 realistic historical price paths to test if your setup actually beats Indian taxes & stop-outs.")
            ],
        )
    ]

    # Table 1: Trade Coordinates
    blocks.append("")
    blocks.append(ui.section("1. Simulated Trade Coordinates (Includes 1-Tick Slippage)"))
    blocks.append(
        ui.table(
            headers=["Planned Entry", "Effective Fill", "Slippage", "Stop-Loss", "Target", "Gross R:R"],
            rows=[
                [
                    format_inr(res["planned_entry"]),
                    ui.bold(format_inr(res["effective_entry_with_slippage"])),
                    f"+{res['slippage_ticks']} tick",
                    ui.red(format_inr(res["stop"])),
                    ui.green(format_inr(res["target"])),
                    ui.cyan(f"{res['r_at_target']:.2f}R", bold=True),
                ]
            ],
            alignments=["right", "right", "center", "right", "right", "right"],
        )
    )

    # Table 2: Simulation Hit Odds
    p_t = float(res["p_target_pct"])
    p_s = float(res["p_stop_pct"])
    p_n = float(res["p_neither_pct"])
    p_res = float(res["target_first_resolved_pct"])
    p_grn = float(res["p_green_pct"])
    req_prob = float(res["strict_prob_floor_pct"] if res["gate_mode"] == "strict_55" else res["breakeven_prob_net_pct"])

    odds_rows = [
        [
            "Target Hit First",
            f"{p_t:6.2f}%",
            ui.bar(p_t, 100.0, width=16, tone_name="good"),
            "Paths that reached your target before hitting stop.",
        ],
        [
            "Stop-Loss Hit First",
            f"{p_s:6.2f}%",
            ui.bar(p_s, 100.0, width=16, tone_name="bad"),
            "Paths that stopped out for a loss (stop checked first).",
        ],
        [
            "Still Open @ Cutoff",
            f"{p_n:6.2f}%",
            ui.bar(p_n, 100.0, width=16, tone_name="warn"),
            "Neither hit by cutoff (15:15 IST intraday / horizon end).",
        ],
        [
            "Target-First (Resolved)",
            ui.tone(f"{p_res:6.2f}%", "good" if p_res >= req_prob else "bad", bold=True),
            ui.bar(p_res, 100.0, width=16, tone_name="good" if p_res >= req_prob else "bad"),
            f"Win rate among decided trades (needs >={req_prob:.1f}% to pass).",
        ],
        [
            "Closed In Profit (Green)",
            f"{p_grn:6.2f}%",
            ui.bar(p_grn, 100.0, width=16, tone_name="info"),
            "% of all replays ending above your effective entry price.",
        ],
    ]
    blocks.append("")
    blocks.append(ui.section("2. 10,000-Path Outcome Odds"))
    blocks.append(
        ui.table(
            headers=["Outcome", "Probability", "Visual Share", "Beginner Explanation"],
            rows=odds_rows,
            alignments=["left", "right", "left", "left"],
        )
    )

    # Table 3: Gates & Expectancy
    rb_pass = bool(res["passes_r_breakeven"])
    st_pass = bool(res["passes_strict_55"])
    net_r = float(res["avg_net_r"])
    net_ev_inr = float(res["net_ev_inr"])
    gate_rows = [
        [
            "R-Breakeven Gate (Net)",
            f">= {res['breakeven_prob_net_pct']:.2f}%",
            f"{p_res:.2f}%",
            ui.green("PASS", bold=True) if rb_pass else ui.red("FAIL", bold=True),
            "Minimum win rate needed to beat taxes at this R:R.",
        ],
        [
            f"Strict {res['strict_prob_floor_pct']:.0f}% Filter",
            f">= {res['strict_prob_floor_pct']:.2f}%",
            f"{p_res:.2f}%",
            ui.green("PASS", bold=True) if st_pass else ui.yellow("FAIL", bold=True),
            "Optional high-win-rate filter (--gate-mode strict_55).",
        ],
        [
            "Gross Expected Value",
            "> 0.0000R",
            f"{res['avg_gross_r']:+.4f}R",
            ui.green("POSITIVE") if res["avg_gross_r"] > 0 else ui.red("NEGATIVE"),
            "Average reward in R-multiples before taxes/brokerage.",
        ],
        [
            "Broker + Statutory Tax Drag",
            "Friction",
            f"-{res['estimated_tax_drag_r']:.4f}R",
            ui.dim("Cost"),
            "Estimated STT, GST, Stamp, SEBI & brokerage drag.",
        ],
        [
            "Net Expected Value (EV)",
            "> 0.0000R",
            ui.tone(f"{net_r:+.4f}R", "good" if net_r > 0 else "bad", bold=True),
            ui.pnl_inr(net_ev_inr),
            f"Expected profit/loss per trade on {res['sample_qty_for_ev']} qty.",
        ],
    ]
    blocks.append("")
    blocks.append(ui.section("3. Probability Gates & Tax-Adjusted Edge (EV)"))
    blocks.append(
        ui.table(
            headers=["Check / Metric", "Required", "Actual", "Status / Value", "What This Means"],
            rows=gate_rows,
            alignments=["left", "right", "right", "left", "left"],
            footer=f"Cutoff Price Range: 5th%={format_inr(res['p5_close'])} | Median={format_inr(res['median_close'])} | 95th%={format_inr(res['p95_close'])}",
        )
    )

    # Table 4: Historical Pool & ORB Backtest
    blocks.append("")
    if res["mode"] == "INTRADAY":
        orb = ctx["historical_orb_replay"]
        blocks.append(ui.section("4. Historical Session Pool & 15m ORB Backtest"))
        blocks.append(
            ui.table(
                headers=["Sessions", "Window (IST)", "ORB Hits", "Targets", "Stops", "Cutoffs", "Avg R"],
                rows=[
                    [
                        str(ctx["full_sessions_in_pool"]),
                        f"{ctx['entry_time_ist']}->{ctx['cutoff_ist']} ({ctx['bars_simulated_per_path']}b)",
                        f"{orb['orb_signals_fired']}/{orb['sessions_tested']}",
                        ui.green(str(orb["target_hits"])),
                        ui.red(str(orb["stop_hits"])),
                        str(orb["cutoff_closes"]),
                        str(orb["avg_R"]),
                    ]
                ],
                alignments=["right", "center", "center", "right", "right", "right", "right"],
                nowrap_cols={0, 1, 2, 3, 4, 5, 6},
            )
        )
    else:
        blocks.append(ui.section("4. Swing Simulation Pool"))
        blocks.append(
            ui.table(
                headers=["Daily Bars in Pool", "Swing Horizon", "Cutoff Distribution (5th / Median / 95th)"],
                rows=[
                    [
                        str(ctx["daily_bars_in_pool"]),
                        f"{ctx['swing_horizon_days']} trading days",
                        f"{format_inr(res['p5_close'])} / {format_inr(res['median_close'])} / {format_inr(res['p95_close'])}",
                    ]
                ],
                alignments=["right", "center", "center"],
            )
        )

    if res["warnings"]:
        blocks.append("")
        blocks.append(ui.callout("Simulation Warnings", res["warnings"], tone_name="warn"))
    if res["fail_reasons"]:
        blocks.append("")
        blocks.append(
            ui.callout(
                "NO-TRADE Reasons (Setup Rejected)",
                [
                    *res["fail_reasons"],
                    "Tip: Try widening stop to true structure, picking a cleaner target >= 1.8R, or wait for better trend alignment.",
                ],
                tone_name="bad",
            )
        )
    elif verdict == "PASS":
        blocks.append("")
        blocks.append(
            ui.callout(
                "Next Step",
                ["Probability & EV edge cleared. Run indian_risk_gate.py --timemachine-json state/timemachine_result.json to size your INR trade."],
                tone_name="good",
            )
        )

    return "\n".join(blocks)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="NSE/BSE Monte Carlo Intraday/Swing Time Machine")
    p.add_argument("--symbol", required=True, help="Ticker (e.g., RELIANCE.NS, TATAMOTORS.NS, NIFTY)")
    p.add_argument("--entry", type=float, required=True, help="Planned entry price")
    p.add_argument("--stop", type=float, required=True, help="Stop-loss price")
    p.add_argument("--target", type=float, required=True, help="Target price")
    p.add_argument("--mode", default="INTRADAY", choices=["INTRADAY", "SWING"], help="Simulation mode")
    p.add_argument("--side", default=None, choices=["buy", "sell"], help="Trade side (inferred if omitted)")
    p.add_argument("--entry-time", default=None, help="IST entry bar close time e.g. 10:15")
    p.add_argument("--until", default=None, help="IST cutoff time (default 15:15)")
    p.add_argument("--replays", type=int, default=None, help="Monte Carlo iterations (default 10000)")
    p.add_argument("--seed", type=int, default=None, help="RNG seed (default 19)")
    p.add_argument("--slippage-ticks", type=int, default=None, help="Adverse entry slippage in Rs. 0.05 ticks")
    p.add_argument("--capital", type=float, default=None, help="Capital in INR for tax EV estimate")
    p.add_argument("--risk-pct", type=float, default=None, help="Risk %% per trade for tax EV estimate")
    p.add_argument("--segment", default=None, help="Segment for tax drag (EQ_INTRADAY, EQ_DELIVERY, FNO_FUT, FNO_OPT)")
    p.add_argument(
        "--broker",
        default=None,
        choices=SUPPORTED_BROKERS,
        help="Optional broker fee schedule for tax drag estimate",
    )
    p.add_argument("--horizon-days", type=int, default=None, help="Trading days horizon for SWING mode")
    p.add_argument(
        "--gate-mode",
        default=None,
        choices=["r_breakeven", "strict_55"],
        help="Probability gate: r_breakeven (tax-adjusted 1/(1+R) + EV>0) or strict_55 (>=55%%)",
    )
    p.add_argument("--offline", default=None, help="Offline Yahoo chart JSON/gz file or folder")
    p.add_argument("--now", default=None, help="Pin IST clock")
    p.add_argument("--write", action="store_true", help="Write result to state/timemachine_result.json")
    p.add_argument("--state-dir", default=None, help="Custom state directory")
    p.add_argument("--json", action="store_true", help="Output JSON")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        res = run_timemachine(
            symbol=args.symbol,
            entry=args.entry,
            stop=args.stop,
            target=args.target,
            mode=args.mode,
            side=args.side,
            entry_time=args.entry_time,
            until_ist=args.until,
            replays=args.replays,
            seed=args.seed,
            slippage_ticks=args.slippage_ticks,
            capital_inr=args.capital,
            risk_pct=args.risk_pct,
            segment=args.segment,
            horizon_days=args.horizon_days,
            gate_mode=args.gate_mode,
            offline_path=args.offline,
            now_str=args.now,
            broker=args.broker,
        )
        if args.write:
            sdir = Path(args.state_dir) if args.state_dir else DEFAULT_STATE_DIR
            write_json_atomic(sdir / "timemachine_result.json", res)
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if args.json else f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        safe_print(format_human_tm(res))
    return 0 if res["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
