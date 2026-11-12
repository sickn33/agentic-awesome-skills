#!/usr/bin/env python3
"""NSE/BSE IST Market Clock, Price Alerts & Live Watch Monitor (`nse_alerts.py`).
Standard library only. Designed for Indian market workflows:
  - NSE/BSE IST market clock, phases, 2026 holidays, Muhurat & next open
  - Auto-sync stops, targets & 15:10 IST flatten alerts from SQLite `paper_orders`
  - Protects non-bracket broker orders (Zerodha, Upstox, Dhan, Groww, Kotak, ICICI, Shoonya)
  - Supports single-shot cron `check` (exit 0 on ring / 1 quiet) and live `watch` loop

Usage:
    python scripts/nse_alerts.py clock
    python scripts/nse_alerts.py add --from-ledger
    python scripts/nse_alerts.py add --ist-bell
    python scripts/nse_alerts.py add --symbol BANKBARODA --target 265 --stop 235
    python scripts/nse_alerts.py check --beep
    python scripts/nse_alerts.py watch --interval 30 --until 15:15 --beep
"""

from __future__ import annotations

import argparse
import concurrent.futures
import contextlib
import datetime
import json
import re
import sqlite3
import sys
import time
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from nse_common import (
    DEFAULT_STATE_DIR,
    NSETraderError,
    extract_chart_result,
    extract_previous_close,
    fetch_yahoo_chart,
    ist_iso,
    load_json_file,
    load_nse_holidays,
    load_trading_rules,
    next_nse_open,
    normalize_symbol,
    nse_session_info,
    parse_clock_minutes,
    parse_now_ist,
    read_offline_chart,
    round_tick,
    to_ist,
    trading_day_status,
    utc_of,
    write_json_atomic,
)
from nse_ui import UI, format_inr, safe_print

ALERT_TYPES = {"above", "below", "stop", "target", "pct_move", "opening_bell", "time"}
NO_QUOTE_TYPES = {"opening_bell", "time"}
HHMM_RE = re.compile(r"^\d{1,2}:\d{2}$")


def _parse_hhmm(text: Any) -> datetime.time | None:
    raw = str(text or "").strip()
    if not HHMM_RE.match(raw):
        return None
    mins = parse_clock_minutes(raw, label="alert time")
    return datetime.time(mins // 60, mins % 60)


def _format_inr_clean(val: float) -> str:
    num = float(val)
    return str(int(num)) if num == int(num) else f"{num:.2f}"


def get_nse_clock_status(
    now_str: str | None = None,
    rules: dict[str, Any] | None = None,
    holidays_cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rules = rules or load_trading_rules()
    holidays_cfg = holidays_cfg or load_nse_holidays()
    dt_ist = parse_now_ist(now_str)
    sess = nse_session_info(dt_ist, rules=rules, holidays_cfg=holidays_cfg)
    is_trading_day, day_reason = trading_day_status(dt_ist.date(), holidays_cfg=holidays_cfg)

    years: set[int] = set()
    for d_map in (holidays_cfg.get("holidays") or {}, holidays_cfg.get("special_sessions") or {}):
        for k in d_map:
            with contextlib.suppress(ValueError):
                years.add(int(str(k)[:4]))

    sess_cfg = rules["session_ist"]
    return {
        **sess,
        "is_trading_day": is_trading_day,
        "day_reason": day_reason,
        "market_open_ist": sess_cfg["market_open"],
        "opening_range_end_ist": sess_cfg["opening_range_end"],
        "hazard_start_ist": sess_cfg["no_new_intraday_after"],
        "force_squareoff_ist": sess_cfg["force_squareoff_ist"],
        "market_close_ist": sess_cfg["market_close"],
        "next_open_ist": "" if sess["is_market_open"] else next_nse_open(dt_ist, rules=rules, holidays_cfg=holidays_cfg),
        "calendar_years": sorted(years),
        "calendar_known": dt_ist.year in years if years else False,
    }


def _read_offline_quote_text(offline_dir: Path, yahoo_sym: str, base_sym: str) -> str:
    candidates = [
        offline_dir / f"yahoo-{yahoo_sym}.json",
        offline_dir / f"yahoo-{yahoo_sym}.json.gz",
        offline_dir / f"yahoo-{base_sym}.json",
        offline_dir / f"yahoo-{base_sym}.json.gz",
        offline_dir / f"chart-{yahoo_sym}.json",
        offline_dir / f"chart-{yahoo_sym}.json.gz",
    ]
    for cand in candidates:
        if cand.exists():
            return read_offline_chart(cand, yahoo_sym)
    return read_offline_chart(offline_dir, yahoo_sym)


def parse_yahoo_quote(raw_text: str, yahoo_sym: str, base_sym: str) -> dict[str, Any]:
    res = extract_chart_result(raw_text, yahoo_sym)
    meta = res.get("meta") or {}
    quote = ((res.get("indicators") or {}).get("quote") or [{}])[0] or {}
    closes_raw = [float(c) for c in (quote.get("close") or []) if c is not None]
    opens_raw = [float(o) for o in (quote.get("open") or []) if o is not None]

    price = meta.get("regularMarketPrice")
    if price is None and closes_raw:
        price = closes_raw[-1]
    if price is None:
        raise NSETraderError(f"No quote price available for {yahoo_sym}")

    prev_close = extract_previous_close(res)

    mkt_time = meta.get("regularMarketTime")
    quote_ist = ist_iso(to_ist(utc_of(int(mkt_time)))) if mkt_time else ""

    ltp_exact = float(price)
    pdc_exact = float(prev_close) if prev_close else None
    ltp_r = round(ltp_exact, 2)
    pdc_r = round(pdc_exact, 2) if pdc_exact is not None else None
    pct_chg = round(((ltp_exact - pdc_exact) / pdc_exact) * 100.0, 2) if pdc_exact else None

    return {
        "symbol": base_sym,
        "yahoo": yahoo_sym,
        "price": ltp_r,
        "prev_close": pdc_r,
        "open": round(float(opens_raw[-1]), 2) if opens_raw else None,
        "pct_change": pct_chg,
        "quote_time_ist": quote_ist,
        "exchange": str(meta.get("exchangeName") or ("BSE" if yahoo_sym.endswith(".BO") else "NSE")),
        "source": "yahoo",
    }


def fetch_quotes_batch(
    symbols: list[str],
    offline_dir: Path | str | None = None,
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    off = Path(offline_dir) if offline_dir else None
    normed: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in symbols:
        s = raw.strip()
        if not s:
            continue
        ns = normalize_symbol(s)
        if ns["base"] not in seen:
            seen.add(ns["base"])
            normed.append(ns)

    if not normed:
        return {}, []

    def _one(ns: dict[str, Any]) -> tuple[str, dict[str, Any] | None, str | None]:
        ysym = ns["yahoo"]
        base = ns["base"]
        try:
            raw = (
                _read_offline_quote_text(off, ysym, base)
                if off
                else fetch_yahoo_chart(ysym, range_="5d", interval="1d")
            )
            return base, parse_yahoo_quote(raw, ysym, base), None
        except (NSETraderError, OSError, ValueError) as exc:
            return base, None, f"{base}: {exc}"

    quotes: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, max(1, len(normed)))) as ex:
        for base, q, err in ex.map(_one, normed):
            if q is not None:
                quotes[base] = q
            elif err:
                errors.append(err)
    return quotes, errors


def write_prices_cache(
    prices_path: Path,
    quotes: dict[str, dict[str, Any]],
    dt_ist: datetime.datetime,
) -> dict[str, Any]:
    old = load_json_file(prices_path, required=False) or {}
    prices = dict(old.get("prices") or {})
    detail = dict(old.get("detail") or {})
    stamp_ist = ist_iso(dt_ist)
    for sym, q in quotes.items():
        prices[sym] = q["price"]
        detail[sym] = {
            "yahoo": q.get("yahoo"),
            "prev_close": q.get("prev_close"),
            "pct_change": q.get("pct_change"),
            "quote_time_ist": q.get("quote_time_ist"),
            "source": q.get("source"),
            "fetched_ist": stamp_ist,
        }
    doc = {
        "as_of_ist": stamp_ist,
        "source": "yahoo",
        "note": "Delayed free quotes for monitoring & sizing only. Broker fill price is authoritative.",
        "prices": prices,
        "detail": detail,
    }
    write_json_atomic(prices_path, doc)
    return doc


def discover_holdings_symbols(
    state_dir: Path,
    include_watchlist: bool = False,
) -> list[str]:
    """Collect active symbols from open SQLite paper_orders + risk_verdict.json (+ optional watchlist)."""
    syms: list[str] = []
    seen: set[str] = set()

    def _add(val: Any) -> None:
        raw = str(val or "").strip().upper()
        if not raw:
            return
        base = normalize_symbol(raw)["base"]
        if base not in seen:
            seen.add(base)
            syms.append(base)

    db_path = state_dir / "paper_trades.db"
    if db_path.exists():
        with contextlib.closing(sqlite3.connect(str(db_path))) as conn, contextlib.suppress(sqlite3.Error):
            rows = conn.execute(
                "SELECT DISTINCT symbol FROM paper_orders WHERE status = 'OPEN' ORDER BY id DESC"
            ).fetchall()
            for row in rows:
                _add(row[0])

    verdict = load_json_file(state_dir / "risk_verdict.json", required=False)
    if isinstance(verdict, dict):
        _add(verdict.get("symbol"))

    if include_watchlist:
        wl = load_json_file(state_dir / "watchlist.json", required=False)
        if isinstance(wl, dict):
            for hit in wl.get("hits") or []:
                if isinstance(hit, dict):
                    _add(hit.get("symbol") or hit.get("base"))
    return syms


def validate_rule(rule: dict[str, Any]) -> None:
    rtype = rule.get("type")
    rid = rule.get("id")
    if rtype not in ALERT_TYPES:
        raise NSETraderError(f"Rule {rid!r}: unknown type {rtype!r}")
    if rtype not in NO_QUOTE_TYPES and not rule.get("symbol"):
        raise NSETraderError(f"Rule {rid!r}: symbol is required")
    if rtype in ("above", "below", "stop", "target") and not isinstance(rule.get("price"), (int, float)):
        raise NSETraderError(f"Rule {rid!r}: numeric price is required")
    if rtype == "pct_move" and not isinstance(rule.get("pct"), (int, float)):
        raise NSETraderError(f"Rule {rid!r}: numeric pct is required")
    if rtype == "time" and _parse_hhmm(rule.get("at")) is None:
        raise NSETraderError(f"Rule {rid!r}: 'at' must be HH:MM IST")
    if rule.get("side") is not None and str(rule["side"]).lower() not in ("buy", "sell"):
        raise NSETraderError(f"Rule {rid!r}: side must be 'buy' or 'sell'")
    if rule.get("date") and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(rule["date"])):
        raise NSETraderError(f"Rule {rid!r}: date must be YYYY-MM-DD")


def _rang_on_ist_date(stamp_str: str | None, today_ist: str) -> bool:
    if not stamp_str:
        return False
    return str(stamp_str)[:10] == today_ist


def _effective_price_comparator(rule: dict[str, Any]) -> str:
    rtype = str(rule["type"])
    side = str(rule.get("side") or "buy").lower()
    if rtype in ("above", "below"):
        return rtype
    if rtype == "stop":
        return "above" if side == "sell" else "below"
    if rtype == "target":
        return "below" if side == "sell" else "above"
    return rtype


def evaluate_alerts(
    rules_list: list[dict[str, Any]],
    quotes: dict[str, dict[str, Any]],
    clock_status: dict[str, Any],
    alert_state: dict[str, Any],
    dt_ist: datetime.datetime,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Pure evaluation of Indian alert rules against quotes + IST session state."""
    state: dict[str, Any] = json.loads(json.dumps(alert_state or {}))
    rung: dict[str, str] = state.setdefault("rung", {})
    today = str(clock_status["date"])
    stamp_ist = ist_iso(dt_ist)
    cur_time = dt_ist.time().replace(microsecond=0)
    rings: list[dict[str, Any]] = []

    for r in rules_list:
        validate_rule(r)
        rid = str(r.get("id") or f"{r.get('symbol', 'nse')}-{r['type']}")
        if r.get("date") and str(r["date"]) != today:
            continue

        rtype = str(r["type"])
        if rtype == "opening_bell":
            if clock_status["is_market_open"] and not _rang_on_ist_date(rung.get(rid), today):
                rings.append(
                    {
                        "id": rid,
                        "type": "opening_bell",
                        "symbol": "",
                        "message": (
                            f"NSE/BSE Opening Bell: {clock_status['day_reason']} OPEN "
                            f"({clock_status['time_ist']} IST)."
                        ),
                    }
                )
                rung[rid] = stamp_ist
            continue

        if rtype == "time":
            target_t = _parse_hhmm(r.get("at"))
            if (
                target_t is not None
                and clock_status.get("is_trading_day")
                and cur_time >= target_t
                and not _rang_on_ist_date(rung.get(rid), today)
            ):
                label = str(r.get("label") or "IST time alert")
                sym = normalize_symbol(str(r["symbol"]))["base"] if r.get("symbol") else ""
                tid = r.get("trade_id")
                msg = f"{label}: {dt_ist.strftime('%H:%M')} IST (scheduled {target_t.strftime('%H:%M')} IST)."
                if tid and sym:
                    msg += (
                        f" If {sym} paper #{tid} is still open, close it: "
                        f"broker_bridge.py close --trade-id {tid} --exit-price <LTP> --reason EOD"
                    )
                rings.append(
                    {
                        "id": rid,
                        "type": "time",
                        "symbol": sym,
                        "trade_id": tid,
                        "message": msg,
                    }
                )
                rung[rid] = stamp_ist
            continue

        sym = normalize_symbol(str(r["symbol"]))["base"]
        q = quotes.get(sym)
        if not q:
            continue
        ltp = float(q["price"])
        comp = _effective_price_comparator(r)

        if comp in ("above", "below"):
            thresh = float(r["price"])
            hit = ltp >= thresh if comp == "above" else ltp <= thresh
            if hit and rid not in rung:
                word = "at/above" if comp == "above" else "at/below"
                kind_lbl = {"stop": "STOP-LOSS", "target": "TARGET"}.get(rtype, "level")
                note_s = f" ({r['note']})" if r.get("note") else ""
                tid = r.get("trade_id")
                msg = (
                    f"{sym} {'is' if clock_status['is_market_open'] else 'last'} Rs.{ltp:.2f}: "
                    f"{word} your {kind_lbl} Rs.{_format_inr_clean(thresh)}{note_s}."
                )
                if tid and rtype in ("stop", "target"):
                    reason_tag = "STOP" if rtype == "stop" else "TARGET"
                    msg += (
                        f" Suggested close: broker_bridge.py close --trade-id {tid} "
                        f"--exit-price {ltp:.2f} --reason {reason_tag}"
                    )
                rings.append(
                    {
                        "id": rid,
                        "type": rtype,
                        "symbol": sym,
                        "price": ltp,
                        "threshold": thresh,
                        "trade_id": tid,
                        "message": msg,
                    }
                )
                rung[rid] = stamp_ist
            elif not hit and rid in rung and r.get("rearm"):
                del rung[rid]

        elif rtype == "pct_move":
            ref = r.get("ref") or q.get("prev_close") or q.get("open")
            if not ref:
                continue
            ref_f = float(ref)
            move_pct = 100.0 * (ltp / ref_f - 1.0)
            want = r.get("direction")
            hit = abs(move_pct) >= float(r["pct"]) and (not want or (want == "up") == (move_pct > 0))
            if hit and not _rang_on_ist_date(rung.get(rid), today):
                rings.append(
                    {
                        "id": rid,
                        "type": "pct_move",
                        "symbol": sym,
                        "price": ltp,
                        "pct_change": round(move_pct, 2),
                        "message": f"{sym} moved {move_pct:+.2f}% to Rs.{ltp:.2f} (from PDC Rs.{ref_f:.2f}).",
                    }
                )
                rung[rid] = stamp_ist

    state["last_check_ist"] = stamp_ist
    return rings, state


def sync_rules_from_ledger(
    state_dir: Path,
    rules_path: Path,
    alert_state_path: Path,
    flat_ist: str = "15:10",
) -> dict[str, Any]:
    """Create stop/target/(15:10 flatten) rules for every OPEN row in SQLite paper_orders."""
    db_path = state_dir / "paper_trades.db"
    if not db_path.exists():
        raise NSETraderError(f"Paper ledger DB not found: {db_path}")

    with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
        conn.row_factory = sqlite3.Row
        try:
            open_rows = conn.execute(
                "SELECT * FROM paper_orders WHERE status = 'OPEN' ORDER BY id ASC"
            ).fetchall()
        except sqlite3.Error as exc:
            raise NSETraderError(f"Failed reading paper_orders in {db_path}: {exc}") from exc

    doc = load_json_file(rules_path, required=False) or {"rules": []}
    existing: list[dict[str, Any]] = list(doc.get("rules") or [])
    non_ledger = [r for r in existing if not str(r.get("id") or "").startswith("ledger-")]

    new_ledger_rules: list[dict[str, Any]] = []
    for row in open_rows:
        tid = int(row["id"])
        sym = normalize_symbol(str(row["symbol"]))["base"]
        side = str(row["side"] or "buy").lower()
        seg = str(row["segment"] or "EQ_INTRADAY")
        broker = str(row["broker"] or "angel_one")
        sl = float(row["stop_loss"])
        tp = float(row["target_price"])
        tdate = str(row["trade_date"] or "")
        qty = int(row["qty"])
        note_base = f"Paper #{tid} ({broker} {seg}, qty={qty}, {side})"

        new_ledger_rules.append(
            {
                "id": f"ledger-{tid}-{sym.lower()}-stop",
                "symbol": sym,
                "type": "stop",
                "side": side,
                "price": sl,
                "trade_id": tid,
                "note": note_base,
            }
        )
        new_ledger_rules.append(
            {
                "id": f"ledger-{tid}-{sym.lower()}-target",
                "symbol": sym,
                "type": "target",
                "side": side,
                "price": tp,
                "trade_id": tid,
                "note": note_base,
            }
        )
        if seg == "EQ_INTRADAY" and _parse_hhmm(flat_ist) is not None:
            flat_rule: dict[str, Any] = {
                "id": f"ledger-{tid}-{sym.lower()}-flat",
                "symbol": sym,
                "type": "time",
                "at": flat_ist,
                "trade_id": tid,
                "label": f"Flatten intraday {sym} paper #{tid} before broker square-off",
            }
            if tdate:
                flat_rule["date"] = tdate
            new_ledger_rules.append(flat_rule)

    for r in new_ledger_rules:
        validate_rule(r)

    combined = non_ledger + new_ledger_rules
    write_json_atomic(rules_path, {"rules": combined})

    # Clean stale rung state for closed ledger trades
    active_ids = {str(r["id"]) for r in new_ledger_rules}
    st = load_json_file(alert_state_path, required=False) or {}
    if isinstance(st.get("rung"), dict):
        cleaned = {
            k: v
            for k, v in st["rung"].items()
            if not k.startswith("ledger-") or k in active_ids
        }
        if len(cleaned) != len(st["rung"]):
            st["rung"] = cleaned
            write_json_atomic(alert_state_path, st)

    return {
        "open_trades": len(open_rows),
        "added_rules": new_ledger_rules,
        "total_rules": len(combined),
        "rules_path": str(rules_path),
    }


def _rules_from_verdict(verdict_path: Path, flat_ist: str = "15:10") -> list[dict[str, Any]]:
    v = load_json_file(verdict_path, required=True)
    if not isinstance(v, dict) or not v.get("symbol"):
        raise NSETraderError(f"Risk verdict at {verdict_path} has no valid symbol")
    sym = normalize_symbol(str(v["symbol"]))["base"]
    if sym == "UNKNOWN":
        raise NSETraderError("Risk verdict symbol is UNKNOWN; re-run indian_risk_gate.py with --symbol")
    side = str(v.get("side") or "buy").lower()
    seg = str(v.get("segment") or "EQ_INTRADAY")
    broker = str(v.get("broker") or "standard")
    out: list[dict[str, Any]] = [
        {
            "id": f"verdict-{sym.lower()}-stop",
            "symbol": sym,
            "type": "stop",
            "side": side,
            "price": float(v["stop"]),
            "note": f"Risk verdict ({broker} {seg}, qty={v.get('qty')}, {side})",
        },
        {
            "id": f"verdict-{sym.lower()}-target",
            "symbol": sym,
            "type": "target",
            "side": side,
            "price": float(v["target"]),
            "note": f"Risk verdict ({broker} {seg}, qty={v.get('qty')}, {side})",
        },
    ]
    if seg == "EQ_INTRADAY" and _parse_hhmm(flat_ist) is not None:
        out.append(
            {
                "id": f"verdict-{sym.lower()}-flat",
                "symbol": sym,
                "type": "time",
                "at": flat_ist,
                "label": f"Flatten intraday {sym} before broker square-off",
            }
        )
    for r in out:
        validate_rule(r)
    return out


def _resolve_paths(
    state_dir_arg: str | None,
    rules_arg: str | None = None,
    state_arg: str | None = None,
    prices_arg: str | None = None,
) -> tuple[Path, Path, Path, Path]:
    sdir = Path(state_dir_arg) if state_dir_arg else DEFAULT_STATE_DIR
    rules_p = Path(rules_arg) if rules_arg else sdir / "alerts.json"
    state_p = Path(state_arg) if state_arg else sdir / "alerts_state.json"
    prices_p = Path(prices_arg) if prices_arg else sdir / "prices.json"
    return sdir, rules_p, state_p, prices_p


# ---------------------------------------------------------------- Commands


def _describe_alert_rule(r: dict[str, Any]) -> tuple[str, str]:
    rtype = str(r.get("type", ""))
    if rtype in ("above", "below", "stop", "target"):
        side_s = f" ({str(r.get('side', 'buy')).upper()})" if rtype in ("stop", "target") else ""
        cond = f"{rtype.upper()}{side_s} @ {format_inr(r.get('price'))}"
    elif rtype == "pct_move":
        dir_s = str(r.get("direction") or "either").upper()
        ref_s = f" vs {format_inr(r['ref'])}" if r.get("ref") is not None else " vs PDC"
        cond = f"{dir_s} >= {r.get('pct')}%{ref_s}"
    elif rtype == "opening_bell":
        cond = "09:15 IST Market Open Bell"
    elif rtype == "time":
        cond = f"{r.get('at', '')} IST - {r.get('label', 'Time Alert')}"
    else:
        cond = json.dumps({k: v for k, v in r.items() if k not in ("id", "type", "symbol")})
    note = str(r.get("note") or ("Auto-rearm enabled" if r.get("rearm") else ""))
    return cond, note


def cmd_clock(args: argparse.Namespace) -> int:
    st = get_nse_clock_status(now_str=args.now)
    if args.json:
        print(json.dumps(st, indent=2))
    else:
        ui = UI()
        is_open = bool(st["is_market_open"])
        phase = str(st["phase"])
        sched_rows = [
            ("09:00 - 09:15", "PRE_OPEN", "Pre-open auction; observe indicative open only."),
            ("09:15 - 09:30", "OPENING_RANGE", "15m Opening Range discovery; do not enter yet."),
            ("09:30 - 14:30", "PRIMARY_EXECUTION", "Primary intraday trading window (entries allowed)."),
            ("14:30 - 15:10", "HAZARD_WINDOW_NO_NEW_ENTRY", "No new intraday entries; trail & protect stops."),
            ("15:10 - 15:30", "AUTO_SQUAREOFF_ZONE", "Brokers auto-square-off MIS/BO; flatten now."),
            ("15:30 - 09:00", "POST_MARKET", "Market closed; review ledger & plan next session."),
        ]
        table_rows: list[list[str]] = []
        for win, p_key, rule_txt in sched_rows:
            active = phase == p_key
            marker = ui.green(f"{ui.arrow_ch} NOW", bold=True) if active else ""
            p_lbl = ui.cyan(p_key, bold=True) if active else p_key
            table_rows.append([win, p_lbl, marker, rule_txt])

        blocks = [
            ui.banner(
                title=f"NSE / BSE MARKET CLOCK  {ui.dot_ch}  IST {st['time_ist']} ({st['weekday']}, {st['date']})",
                subtitle=f"Session Status: {st['day_reason']}  |  Active Phase: {phase}",
                badge="OPEN" if is_open else "CLOSED",
                badge_tone="open" if is_open else "bad",
                meta_lines=(
                    [f"Next Trading Session Opens: {ui.bold(str(st['next_open_ist']))}"]
                    if st.get("next_open_ist")
                    else [ui.green("Market is LIVE right now.")]
                ),
            ),
            "",
            ui.section("Daily IST Session Timeline & Intraday Rules"),
            ui.table(
                headers=["IST Window", "Session Phase", "Now", "Rule for Traders"],
                rows=table_rows,
                alignments=["center", "left", "center", "left"],
                footer=(
                    None
                    if st["calendar_known"]
                    else f"Note: Holiday table covers {st['calendar_years']} only; verify nseindia.com for this year."
                ),
            ),
        ]
        safe_print("\n".join(blocks))
    return 0 if st["is_market_open"] else 1


def cmd_quote(args: argparse.Namespace) -> int:
    sdir, _, _, default_prices_p = _resolve_paths(args.state_dir)
    dt_ist = parse_now_ist(args.now)

    syms = list(args.symbols)
    if args.holdings or args.watchlist:
        syms.extend(discover_holdings_symbols(sdir, include_watchlist=bool(args.watchlist)))
    if not syms:
        raise NSETraderError("Pass ticker symbols (e.g. quote RELIANCE BANKBARODA) or --holdings")

    quotes, errors = fetch_quotes_batch(syms, offline_dir=args.offline)
    wrote_path: str | None = None
    if args.write and quotes:
        out_p = default_prices_p if args.write == "AUTO" else Path(args.write)
        write_prices_cache(out_p, quotes, dt_ist)
        wrote_path = str(out_p)

    if args.json:
        print(
            json.dumps(
                {"ist_timestamp": ist_iso(dt_ist), "quotes": quotes, "errors": errors, "wrote": wrote_path},
                indent=2,
            )
        )
    else:
        ui = UI()
        if quotes:
            q_rows = [
                [
                    ui.bold(base),
                    str(q["exchange"]),
                    ui.bold(format_inr(q["price"])),
                    format_inr(q.get("prev_close")) if q.get("prev_close") is not None else "N/A",
                    ui.trend_pct(q.get("pct_change")),
                ]
                for base, q in quotes.items()
            ]
            blocks = [
                ui.banner(
                    title="NSE / BSE LIVE QUOTE SNAPSHOT",
                    subtitle=f"IST: {dt_ist.strftime('%Y-%m-%d %H:%M:%S')}  |  Symbols Quoted: {len(quotes)}",
                    badge=f"{len(quotes)} QUOTE{'S' if len(quotes) != 1 else ''}",
                    badge_tone="info",
                ),
                "",
                ui.table(
                    headers=["Symbol", "Exchange", "LTP (INR)", "Prev Close (PDC)", "Day Change"],
                    rows=q_rows,
                    alignments=["left", "center", "right", "right", "right"],
                    nowrap_cols={0, 1, 2, 3, 4},
                    footer=f"Saved snapshot to {wrote_path}" if wrote_path else None,
                ),
            ]
            safe_print("\n".join(blocks))
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
    return 0 if quotes else 1


def cmd_add(args: argparse.Namespace) -> int:
    cfg = load_trading_rules()
    tick = float(cfg["session_ist"]["tick_size_inr"])
    flat_default = str((cfg.get("alerts") or {}).get("default_flat_reminder_ist") or "15:10")
    sdir, rules_p, state_p, _ = _resolve_paths(args.state_dir, rules_arg=args.rules, state_arg=args.state)

    if args.from_ledger:
        res = sync_rules_from_ledger(sdir, rules_p, state_p, flat_ist=flat_default)
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            ui = UI()
            added_r = res["added_rules"]
            blocks = [
                ui.banner(
                    title="LEDGER ALERTS SYNCED",
                    subtitle=f"Open SQLite Paper Trades: {res['open_trades']}  |  Active Alert Rules: {len(added_r)}",
                    badge="SYNCED",
                    badge_tone="pass",
                )
            ]
            if added_r:
                rows = []
                for r in added_r:
                    cond, note = _describe_alert_rule(r)
                    rows.append([str(r["id"]), str(r.get("symbol") or "-"), str(r["type"]), cond, note or "-"])
                blocks.append("")
                blocks.append(ui.table(["Rule ID", "Symbol", "Type", "Trigger / Condition", "Note"], rows))
            safe_print("\n".join(blocks))
        return 0

    doc = load_json_file(rules_p, required=False) or {"rules": []}
    rules_list: list[dict[str, Any]] = list(doc.get("rules") or [])
    added: list[dict[str, Any]] = []

    if args.from_verdict:
        verdict_p = Path(args.verdict) if args.verdict else sdir / "risk_verdict.json"
        new_rules = _rules_from_verdict(verdict_p, flat_ist=flat_default)
        new_ids = {r["id"] for r in new_rules}
        rules_list = [r for r in rules_list if r.get("id") not in new_ids] + new_rules
        st = load_json_file(state_p, required=False) or {}
        if isinstance(st.get("rung"), dict):
            for rid in new_ids:
                st["rung"].pop(rid, None)
            write_json_atomic(state_p, st)
        added = new_rules
    elif args.ist_bell:
        bells = (cfg.get("alerts") or {}).get("bell_schedule_ist") or []
        bell_rules = [
            {
                "id": str(b["id"]),
                "type": "time",
                "at": str(b["at"]),
                "label": str(b["label"]),
            }
            for b in bells
        ]
        if not bell_rules:
            bell_rules = [{"id": "nse-open-bell", "type": "opening_bell"}]
        for br in bell_rules:
            validate_rule(br)
        bell_ids = {r["id"] for r in bell_rules}
        rules_list = [r for r in rules_list if r.get("id") not in bell_ids] + bell_rules
        added = bell_rules
    elif args.opening_bell:
        rule: dict[str, Any] = {"id": args.id or "nse-opening-bell", "type": "opening_bell"}
        if args.date:
            rule["date"] = args.date
        validate_rule(rule)
        rules_list = [r for r in rules_list if r.get("id") != rule["id"]] + [rule]
        added = [rule]
    elif args.at:
        if _parse_hhmm(args.at) is None:
            raise NSETraderError("--at expects HH:MM IST (e.g. 15:10)")
        rule = {
            "id": args.id or f"time-{args.at.replace(':', '')}",
            "type": "time",
            "at": args.at,
            "label": args.label or "IST time alert",
        }
        if args.symbol:
            rule["symbol"] = normalize_symbol(args.symbol)["base"]
        if args.date:
            rule["date"] = args.date
        validate_rule(rule)
        rules_list = [r for r in rules_list if r.get("id") != rule["id"]] + [rule]
        added = [rule]
    else:
        if not args.symbol:
            raise NSETraderError("--symbol is required (or pass --from-ledger, --from-verdict, --ist-bell, --at)")
        sym = normalize_symbol(args.symbol)["base"]
        if args.above is not None:
            rule_core: dict[str, Any] = {"type": "above", "price": round_tick(args.above, tick)}
        elif args.below is not None:
            rule_core = {"type": "below", "price": round_tick(args.below, tick)}
        elif args.stop is not None:
            rule_core = {"type": "stop", "side": args.side, "price": round_tick(args.stop, tick)}
        elif args.target is not None:
            rule_core = {"type": "target", "side": args.side, "price": round_tick(args.target, tick)}
        elif args.pct is not None:
            rule_core = {"type": "pct_move", "pct": float(args.pct)}
            if args.direction:
                rule_core["direction"] = args.direction
            if args.ref is not None:
                rule_core["ref"] = float(args.ref)
        else:
            raise NSETraderError("Specify one of --above, --below, --stop, --target, or --pct")

        val_lbl = rule_core.get("price", rule_core.get("pct"))
        rid = args.id or f"{sym.lower()}-{rule_core['type']}-{_format_inr_clean(float(val_lbl))}"
        rule = {"id": rid, "symbol": sym, **rule_core}
        if args.rearm:
            rule["rearm"] = True
        if args.note:
            rule["note"] = args.note
        if args.date:
            rule["date"] = args.date
        validate_rule(rule)
        rules_list = [r for r in rules_list if r.get("id") != rid] + [rule]
        added = [rule]

    write_json_atomic(rules_p, {"rules": rules_list})
    if args.json:
        print(json.dumps({"added": added, "total_rules": len(rules_list), "rules_path": str(rules_p)}, indent=2))
    else:
        ui = UI()
        rows = []
        for r in added:
            cond, note = _describe_alert_rule(r)
            rows.append([str(r["id"]), str(r.get("symbol") or "-"), str(r["type"]), cond, note or "-"])
        safe_print(
            "\n".join(
                [
                    ui.section(f"Added {len(added)} Alert Rule(s)  (Total Armed: {len(rules_list)})"),
                    ui.table(["Rule ID", "Symbol", "Type", "Trigger / Condition", "Note"], rows),
                ]
            )
        )
    return 0


def _run_single_check(
    sdir: Path,
    rules_p: Path,
    state_p: Path,
    prices_p: Path,
    now_str: str | None,
    offline_dir: str | None,
    write: bool = True,
    sync_ledger_first: bool = False,
) -> dict[str, Any]:
    cfg = load_trading_rules()
    flat_default = str((cfg.get("alerts") or {}).get("default_flat_reminder_ist") or "15:10")

    if sync_ledger_first and (sdir / "paper_trades.db").exists():
        sync_rules_from_ledger(sdir, rules_p, state_p, flat_ist=flat_default)

    doc = load_json_file(rules_p, required=False) or {}
    rules_list: list[dict[str, Any]] = list(doc.get("rules") or [])
    if not rules_list:
        raise NSETraderError(
            f"No alert rules in {rules_p}. Add with `nse_alerts.py add --from-ledger` or `--symbol ...`"
        )

    dt_ist = parse_now_ist(now_str)
    clock_status = get_nse_clock_status(now_str=now_str, rules=cfg)
    today = str(clock_status["date"])
    active_rules = [r for r in rules_list if not r.get("date") or str(r["date"]) == today]

    syms: list[str] = []
    seen_s: set[str] = set()
    for r in active_rules:
        if r.get("type") not in NO_QUOTE_TYPES and r.get("symbol"):
            base = normalize_symbol(str(r["symbol"]))["base"]
            if base not in seen_s:
                seen_s.add(base)
                syms.append(base)

    quotes, errors = fetch_quotes_batch(syms, offline_dir=offline_dir) if syms else ({}, [])
    prev_state = load_json_file(state_p, required=False) or {}
    rings, new_state = evaluate_alerts(rules_list, quotes, clock_status, prev_state, dt_ist)

    if write:
        write_json_atomic(state_p, new_state)
        if quotes:
            write_prices_cache(prices_p, quotes, dt_ist)

    return {
        "market": clock_status,
        "watched_count": len(active_rules),
        "rings": rings,
        "quotes": {k: v["price"] for k, v in quotes.items()},
        "errors": errors,
    }


def cmd_check(args: argparse.Namespace) -> int:
    sdir, rules_p, state_p, prices_p = _resolve_paths(
        args.state_dir, rules_arg=args.rules, state_arg=args.state, prices_arg=args.prices_out
    )
    res = _run_single_check(
        sdir=sdir,
        rules_p=rules_p,
        state_p=state_p,
        prices_p=prices_p,
        now_str=args.now,
        offline_dir=args.offline,
        write=not args.no_write,
        sync_ledger_first=bool(args.sync_ledger),
    )
    rings = res["rings"]
    if rings and args.beep:
        print("\a", end="", flush=True)

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        ui = UI()
        mk = res["market"]
        is_open = bool(mk["is_market_open"])
        blocks: list[str] = [
            ui.banner(
                title=f"NSE / BSE ALERT CHECK  {ui.dot_ch}  {mk['time_ist']} IST ({mk['phase']})",
                subtitle=f"Market: {'OPEN' if is_open else 'CLOSED'}  |  Active Rules Checked: {res['watched_count']}",
                badge=f"{len(rings)} ALERT{'S' if len(rings) != 1 else ''}" if rings else "QUIET",
                badge_tone="warn" if rings else "good",
            )
        ]
        if rings:
            blocks.append("")
            blocks.append(
                ui.callout(
                    f"TRIGGERED ALERTS ({len(rings)})",
                    [f"[{r['id']}] {r['message']}" for r in rings]
                    + ["Reminder: Alerts notify only; place/verify real SL or GTT orders directly on your broker."],
                    tone_name="warn",
                )
            )
        if res["quotes"]:
            q_rows = [[ui.bold(sym), format_inr(px)] for sym, px in res["quotes"].items()]
            blocks.append("")
            blocks.append(ui.table(["Watched Symbol", "Current LTP"], q_rows, alignments=["left", "right"]))
        safe_print("\n".join(blocks))
        for err in res["errors"]:
            print(f"Quote error: {err}", file=sys.stderr)
    return 0 if rings else 1


def cmd_watch(args: argparse.Namespace) -> int:
    sdir, rules_p, state_p, prices_p = _resolve_paths(
        args.state_dir, rules_arg=args.rules, state_arg=args.state, prices_arg=args.prices_out
    )
    until_mins = parse_clock_minutes(args.until, label="--until") if args.until else None
    interval = max(0, int(args.interval)) if args.offline else max(5, int(args.interval))
    max_cycles = int(args.max_cycles)
    cycle = 0

    ui = UI()
    if not args.json:
        safe_print(
            ui.banner(
                title="NSE / BSE LIVE ALERT WATCHER",
                subtitle=f"Polling every {interval}s  |  Auto-stop cutoff: {args.until or 'Manual Ctrl+C'} IST",
                badge="WATCHING",
                badge_tone="info",
            )
        )

    try:
        while True:
            cycle += 1
            cur_dt = parse_now_ist(args.now or None)
            if until_mins is not None and (cur_dt.hour * 60 + cur_dt.minute) > until_mins:
                stop_msg = f"Watch stopped: current IST {cur_dt.strftime('%H:%M')} passed --until {args.until}."
                print(stop_msg, file=sys.stderr if args.json else sys.stdout)
                break

            res = _run_single_check(
                sdir=sdir,
                rules_p=rules_p,
                state_p=state_p,
                prices_p=prices_p,
                now_str=args.now or None,
                offline_dir=args.offline,
                write=not args.no_write,
                sync_ledger_first=bool(args.sync_ledger),
            )
            rings = res["rings"]
            mk = res["market"]
            q_str = ", ".join(f"{s}={format_inr(p)}" for s, p in res["quotes"].items()) or "no-quotes"
            if args.json:
                print(json.dumps({"cycle": cycle, **res}), flush=True)
            else:
                phase_s = ui.green(mk["phase"]) if mk["is_market_open"] else ui.dim(mk["phase"])
                safe_print(f"[{cycle:03d} | {ui.bold(mk['time_ist'])} IST | {phase_s}] {q_str}")
                if rings:
                    safe_print(
                        ui.callout(
                            f"ALERT RING @ {mk['time_ist']} IST",
                            [f"[{r['id']}] {r['message']}" for r in rings],
                            tone_name="warn",
                        )
                    )
                sys.stdout.flush()
            if rings and args.beep:
                print("\a", end="", flush=True)

            if max_cycles > 0 and cycle >= max_cycles:
                break
            if interval > 0:
                time.sleep(interval)
    except KeyboardInterrupt:
        print("\nWatch stopped by user.")

    return 0


def cmd_list(args: argparse.Namespace) -> int:
    _, rules_p, state_p, _ = _resolve_paths(args.state_dir, rules_arg=args.rules, state_arg=args.state)
    doc = load_json_file(rules_p, required=False) or {"rules": []}
    st = load_json_file(state_p, required=False) or {}
    rules_list = doc.get("rules") or []
    rung = st.get("rung") or {}
    if args.json:
        print(json.dumps({"rules": rules_list, "rung": rung}, indent=2))
        return 0
    if not rules_list:
        safe_print(UI().callout("No Alert Rules Configured", ["Add one via nse_alerts.py add --from-ledger --ist-bell or --symbol ... --above ..."], tone_name="info"))
        return 1
    ui = UI()
    rows: list[list[str]] = []
    for r in rules_list:
        rid = str(r.get("id"))
        rang = rung.get(rid)
        status_s = ui.dim(f"RANG {rang}") if rang else ui.green("ARMED", bold=True)
        cond, note = _describe_alert_rule(r)
        rows.append([rid, str(r.get("symbol") or "-"), str(r.get("type") or ""), cond, status_s, note or "-"])
    n_rules = len(rules_list)
    safe_print(
        "\n".join(
            [
                ui.banner(
                    title="CONFIGURED NSE / BSE ALERT RULES",
                    subtitle=f"Rules: {n_rules}  |  Rung Today/Recently: {len(rung)}",
                    badge=f"{n_rules} RULE{'S' if n_rules != 1 else ''}",
                    badge_tone="info",
                ),
                "",
                ui.table(
                    headers=["Rule ID", "Symbol", "Type", "Condition / Trigger", "Status", "Note"],
                    rows=rows,
                    nowrap_cols={0, 1, 2, 4},
                ),
            ]
        )
    )
    return 0


def cmd_remove(args: argparse.Namespace) -> int:
    _, rules_p, state_p, _ = _resolve_paths(args.state_dir, rules_arg=args.rules, state_arg=args.state)
    doc = load_json_file(rules_p, required=False) or {"rules": []}
    rules_list = list(doc.get("rules") or [])
    kept = [r for r in rules_list if r.get("id") != args.id]
    ui = UI()
    if len(kept) == len(rules_list):
        safe_print(f"{ui.yellow(ui.warn_ch)} Rule {args.id!r} not found.")
        return 1
    write_json_atomic(rules_p, {"rules": kept})
    st = load_json_file(state_p, required=False) or {}
    if isinstance(st.get("rung"), dict) and args.id in st["rung"]:
        del st["rung"][args.id]
        write_json_atomic(state_p, st)
    safe_print(f"{ui.green(ui.ok_ch)} Removed alert rule: {ui.bold(str(args.id))}")
    return 0


def cmd_reset(args: argparse.Namespace) -> int:
    _, _, state_p, _ = _resolve_paths(args.state_dir, state_arg=args.state)
    st = load_json_file(state_p, required=False) or {}
    rung = st.get("rung") or {}
    ui = UI()
    if args.all:
        st["rung"] = {}
        write_json_atomic(state_p, st)
        safe_print(f"{ui.green(ui.ok_ch)} Re-armed all alert rules.")
        return 0
    if not args.id:
        raise NSETraderError("Specify a rule id or --all")
    if args.id not in rung:
        safe_print(f"{ui.yellow(ui.warn_ch)} Rule {args.id!r} has not rung.")
        return 1
    del rung[args.id]
    write_json_atomic(state_p, st)
    safe_print(f"{ui.green(ui.ok_ch)} Re-armed alert rule: {ui.bold(str(args.id))}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="NSE/BSE Market Clock, Price Alerts & Live Watch Monitor")
    sub = p.add_subparsers(dest="command", required=True)

    pc = sub.add_parser("clock", help="Check NSE/BSE IST market clock, phase, holidays & next open")
    pc.add_argument("--now", default=None, help="Pin IST timestamp, e.g. '2026-11-11 10:15'")
    pc.add_argument("--json", action="store_true")

    pq = sub.add_parser("quote", help="Fetch latest INR quotes (parallel Yahoo v8)")
    pq.add_argument("symbols", nargs="*")
    pq.add_argument("--holdings", action="store_true", help="Include open SQLite paper_orders + risk_verdict.json")
    pq.add_argument("--watchlist", action="store_true", help="Also include state/watchlist.json hits")
    pq.add_argument("--write", nargs="?", const="AUTO", default=None, help="Save quotes to state/prices.json (or path)")
    pq.add_argument("--state-dir", default=None)
    pq.add_argument("--offline", default=None, help="Offline fixtures directory")
    pq.add_argument("--now", default=None)
    pq.add_argument("--json", action="store_true")

    pa = sub.add_parser("add", help="Add or sync price/IST-time/ledger alert rules")
    pa.add_argument("--rules", default=None)
    pa.add_argument("--state", default=None)
    pa.add_argument("--state-dir", default=None)
    pa.add_argument("--symbol", default=None)
    pa.add_argument("--side", default="buy", choices=["buy", "sell"], help="Direction for stop/target thresholds")
    grp = pa.add_mutually_exclusive_group()
    grp.add_argument("--above", type=float)
    grp.add_argument("--below", type=float)
    grp.add_argument("--stop", type=float)
    grp.add_argument("--target", type=float)
    grp.add_argument("--pct", type=float)
    grp.add_argument("--opening-bell", action="store_true")
    grp.add_argument("--ist-bell", action="store_true", help="Add 09:15, 09:30, 14:30 & 15:10 IST trading bells")
    grp.add_argument("--at", default=None, help="IST time HH:MM (e.g. 15:10)")
    grp.add_argument("--from-ledger", action="store_true", help="Sync all OPEN rows from SQLite paper_trades.db")
    grp.add_argument("--from-verdict", action="store_true", help="Read stop/target from state/risk_verdict.json")
    pa.add_argument("--verdict", default=None, help="Path to risk_verdict.json")
    pa.add_argument("--label", default=None)
    pa.add_argument("--direction", choices=["up", "down"], default=None)
    pa.add_argument("--ref", type=float, default=None, help="Reference price for pct move")
    pa.add_argument("--date", default=None, help="Watch on this YYYY-MM-DD IST date only")
    pa.add_argument("--rearm", action="store_true", help="Re-arm price rule automatically after un-crossing")
    pa.add_argument("--note", default=None)
    pa.add_argument("--id", default=None)
    pa.add_argument("--json", action="store_true")

    pk = sub.add_parser("check", help="Evaluate rules once (exit 0 if any ring, 1 if quiet)")
    pk.add_argument("--rules", default=None)
    pk.add_argument("--state", default=None)
    pk.add_argument("--prices-out", default=None)
    pk.add_argument("--state-dir", default=None)
    pk.add_argument("--offline", default=None)
    pk.add_argument("--now", default=None)
    pk.add_argument("--sync-ledger", action="store_true", help="Re-sync open SQLite paper trades before evaluating")
    pk.add_argument("--no-write", action="store_true")
    pk.add_argument("--beep", action="store_true", help="Ring terminal bell on alert")
    pk.add_argument("--json", action="store_true")

    pw = sub.add_parser("watch", help="Live foreground polling monitor for Angel One / TradingView split-screen")
    pw.add_argument("--interval", type=int, default=30, help="Polling interval in seconds (min 5, default 30)")
    pw.add_argument("--until", default="15:15", help="Stop automatically after this IST clock (default 15:15)")
    pw.add_argument("--max-cycles", type=int, default=0, help="Stop after N polling cycles (0 = until cutoff)")
    pw.add_argument("--rules", default=None)
    pw.add_argument("--state", default=None)
    pw.add_argument("--prices-out", default=None)
    pw.add_argument("--state-dir", default=None)
    pw.add_argument("--offline", default=None)
    pw.add_argument("--now", default=None)
    pw.add_argument("--sync-ledger", action="store_true")
    pw.add_argument("--no-write", action="store_true")
    pw.add_argument("--beep", action="store_true")
    pw.add_argument("--json", action="store_true")

    pl = sub.add_parser("list", help="List configured alert rules and ring history")
    pl.add_argument("--rules", default=None)
    pl.add_argument("--state", default=None)
    pl.add_argument("--state-dir", default=None)
    pl.add_argument("--json", action="store_true")

    prm = sub.add_parser("remove", help="Remove an alert rule by id")
    prm.add_argument("id")
    prm.add_argument("--rules", default=None)
    prm.add_argument("--state", default=None)
    prm.add_argument("--state-dir", default=None)

    prs = sub.add_parser("reset", help="Re-arm one rule or all rules")
    prs.add_argument("id", nargs="?", default=None)
    prs.add_argument("--all", action="store_true")
    prs.add_argument("--state", default=None)
    prs.add_argument("--state-dir", default=None)

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        handlers = {
            "clock": cmd_clock,
            "quote": cmd_quote,
            "add": cmd_add,
            "check": cmd_check,
            "watch": cmd_watch,
            "list": cmd_list,
            "remove": cmd_remove,
            "reset": cmd_reset,
        }
        return handlers[args.command](args)
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if getattr(args, "json", False) else f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
