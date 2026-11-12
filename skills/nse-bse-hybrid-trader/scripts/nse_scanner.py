#!/usr/bin/env python3
"""Indian NSE Market Scanner (`nse_scanner.py`): Universe, Daily Setups & 15m ORB+VWAP.
Standard library only. Uses fast, free Indian public sources:
  - NiftyIndices & NSE Archives CSVs (`ind_nifty50list.csv`, `ind_nifty200list.csv`,
    `ind_nifty500list.csv`, `fo_mktlots.csv`, `fo_secban.csv`, `EQUITY_L.csv`)
  - 2-Stage Scanner: Yahoo Spark (20 NSE symbols/request) -> Parallel Yahoo v8 OHLCV + RVOL + VWAP

Usage:
    python scripts/nse_scanner.py universe --pool nifty200
    python scripts/nse_scanner.py daily --pool nifty50 --min-turnover-cr 20
    python scripts/nse_scanner.py daily --symbols BANKBARODA,SUZLON,SBIN,RELIANCE --setup all
    python scripts/nse_scanner.py orb --pool nifty50 --now "2026-11-09 10:30"
    python scripts/nse_scanner.py daily --offline path/to/dir --now "2026-11-09 08:45" --json
"""

from __future__ import annotations

import argparse
import concurrent.futures
import contextlib
import csv
import datetime
import gzip
import io
import json
import sys
import time
import urllib.error
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from nse_common import (
    DEFAULT_STATE_DIR,
    NSETraderError,
    extract_chart_result,
    fetch_nse_fno_ban,
    fetch_url_text,
    fetch_yahoo_chart,
    fetch_yahoo_spark,
    ist_iso,
    load_json_file,
    load_nse_holidays,
    load_trading_rules,
    normalize_symbol,
    nse_session_info,
    parse_clock_minutes,
    parse_now_ist,
    round_tick,
    to_ist,
    trading_day_status,
    utc_of,
    write_json_atomic,
)
from nse_ui import UI, format_inr, safe_print
from nse_data_loader import (
    NSE_OPEN_MIN,
    NSE_SESSION_BARS,
    calc_atr,
    calc_rsi_series,
    calc_sma,
    parse_bars_from_chart,
)

BUILTIN_NIFTY50_SYMBOLS = [
    ("ADANIENT", "Adani Enterprises Ltd.", "Metals & Mining"),
    ("ADANIPORTS", "Adani Ports and Special Economic Zone Ltd.", "Services"),
    ("APOLLOHOSP", "Apollo Hospitals Enterprise Ltd.", "Healthcare"),
    ("ASIANPAINT", "Asian Paints Ltd.", "Consumer Durables"),
    ("AXISBANK", "Axis Bank Ltd.", "Financial Services"),
    ("BAJAJ-AUTO", "Bajaj Auto Ltd.", "Automobile and Auto Components"),
    ("BAJAJFINSV", "Bajaj Finserv Ltd.", "Financial Services"),
    ("BAJFINANCE", "Bajaj Finance Ltd.", "Financial Services"),
    ("BEL", "Bharat Electronics Ltd.", "Capital Goods"),
    ("BHARTIARTL", "Bharti Airtel Ltd.", "Telecommunication"),
    ("BPCL", "Bharat Petroleum Corporation Ltd.", "Oil Gas & Consumable Fuels"),
    ("BRITANNIA", "Britannia Industries Ltd.", "Fast Moving Consumer Goods"),
    ("CIPLA", "Cipla Ltd.", "Healthcare"),
    ("COALINDIA", "Coal India Ltd.", "Oil Gas & Consumable Fuels"),
    ("DRREDDY", "Dr. Reddy's Laboratories Ltd.", "Healthcare"),
    ("EICHERMOT", "Eicher Motors Ltd.", "Automobile and Auto Components"),
    ("GRASIM", "Grasim Industries Ltd.", "Construction Materials"),
    ("HCLTECH", "HCL Technologies Ltd.", "Information Technology"),
    ("HDFCBANK", "HDFC Bank Ltd.", "Financial Services"),
    ("HDFCLIFE", "HDFC Life Insurance Company Ltd.", "Financial Services"),
    ("HEROMOTOCO", "Hero MotoCorp Ltd.", "Automobile and Auto Components"),
    ("HINDALCO", "Hindalco Industries Ltd.", "Metals & Mining"),
    ("HINDUNILVR", "Hindustan Unilever Ltd.", "Fast Moving Consumer Goods"),
    ("ICICIBANK", "ICICI Bank Ltd.", "Financial Services"),
    ("INDUSINDBK", "IndusInd Bank Ltd.", "Financial Services"),
    ("INFY", "Infosys Ltd.", "Information Technology"),
    ("ITC", "ITC Ltd.", "Fast Moving Consumer Goods"),
    ("JIOFIN", "Jio Financial Services Ltd.", "Financial Services"),
    ("JSWSTEEL", "JSW Steel Ltd.", "Metals & Mining"),
    ("KOTAKBANK", "Kotak Mahindra Bank Ltd.", "Financial Services"),
    ("LT", "Larsen & Toubro Ltd.", "Construction"),
    ("M&M", "Mahindra & Mahindra Ltd.", "Automobile and Auto Components"),
    ("MARUTI", "Maruti Suzuki India Ltd.", "Automobile and Auto Components"),
    ("NESTLEIND", "Nestle India Ltd.", "Fast Moving Consumer Goods"),
    ("NTPC", "NTPC Ltd.", "Power"),
    ("ONGC", "Oil & Natural Gas Corporation Ltd.", "Oil Gas & Consumable Fuels"),
    ("POWERGRID", "Power Grid Corporation of India Ltd.", "Power"),
    ("RELIANCE", "Reliance Industries Ltd.", "Oil Gas & Consumable Fuels"),
    ("SBILIFE", "SBI Life Insurance Company Ltd.", "Financial Services"),
    ("SBIN", "State Bank of India", "Financial Services"),
    ("SHRIRAMFIN", "Shriram Finance Ltd.", "Financial Services"),
    ("SUNPHARMA", "Sun Pharmaceutical Industries Ltd.", "Healthcare"),
    ("TATACONSUM", "Tata Consumer Products Ltd.", "Fast Moving Consumer Goods"),
    ("TATAMOTORS", "Tata Motors Ltd.", "Automobile and Auto Components"),
    ("TATASTEEL", "Tata Steel Ltd.", "Metals & Mining"),
    ("TCS", "Tata Consultancy Services Ltd.", "Information Technology"),
    ("TECHM", "Tech Mahindra Ltd.", "Information Technology"),
    ("TITAN", "Titan Company Ltd.", "Consumer Durables"),
    ("TRENT", "Trent Ltd.", "Consumer Services"),
    ("ULTRACEMCO", "UltraTech Cement Ltd.", "Construction Materials"),
    ("WIPRO", "Wipro Ltd.", "Information Technology"),
]

VALID_POOLS = ("nifty50", "niftynext50", "niftybank", "nifty200", "nifty500", "fno", "all_eq")
DAILY_SETUPS = (
    ("breakout_20d", "20-day closing high breakout"),
    ("bull_flag", "Bull flag consolidation (+8% prior surge, <=5% 5d range)"),
    ("reclaim_sma20", "Reclaimed 20-day SMA"),
    ("oversold", "Oversold RSI(14) < 30"),
    ("oversold_bounce", "Oversold RSI(14) < 30 yesterday + up close"),
    ("near_high", "Within 3% of 3M closing high"),
)
SETUP_NAMES = {k for k, _ in DAILY_SETUPS}


def _read_text_or_fetch(
    url: str,
    offline_dir: Path | None,
    offline_names: list[str],
    required: bool = False,
) -> str | None:
    if offline_dir:
        for name in offline_names:
            p = offline_dir / name
            if p.exists():
                return p.read_text(encoding="utf-8", errors="replace").lstrip("\ufeff")
        if required:
            raise NSETraderError(f"Offline CSV not found ({offline_names}) in {offline_dir}")
        return None
    if not url:
        return None
    try:
        return fetch_url_text(url, timeout=15)
    except (OSError, urllib.error.URLError, NSETraderError) as exc:
        if required:
            raise NSETraderError(f"Failed downloading {url}: {exc}") from exc
        return None


def parse_nifty_index_csv(raw_text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(raw_text))
    reader.fieldnames = [f.strip() for f in (reader.fieldnames or [])]
    rows: list[dict[str, str]] = []
    for row in reader:
        sym = str(row.get("Symbol") or row.get("SYMBOL") or "").strip().upper()
        if not sym or sym.startswith("DUMMY"):
            continue
        rows.append(
            {
                "symbol": sym,
                "name": str(row.get("Company Name") or "").strip(),
                "industry": str(row.get("Industry") or "").strip(),
                "series": str(row.get("Series") or "EQ").strip().upper(),
                "isin": str(row.get("ISIN Code") or "").strip(),
            }
        )
    return rows


def parse_equity_l_csv(raw_text: str) -> dict[str, dict[str, str]]:
    reader = csv.DictReader(io.StringIO(raw_text))
    reader.fieldnames = [f.strip() for f in (reader.fieldnames or [])]
    out: dict[str, dict[str, str]] = {}
    for row in reader:
        sym = str(row.get("SYMBOL") or "").strip().upper()
        if not sym:
            continue
        out[sym] = {
            "symbol": sym,
            "name": str(row.get("NAME OF COMPANY") or "").strip(),
            "series": str(row.get("SERIES") or "EQ").strip().upper(),
            "isin": str(row.get("ISIN NUMBER") or row.get("ISIN") or "").strip(),
        }
    return out


def parse_fo_mktlots_csv(raw_text: str) -> dict[str, int]:
    """Extract NSE underlying symbol -> active front-month F&O lot size from fo_mktlots.csv."""
    lots: dict[str, int] = {}
    for raw_line in raw_text.splitlines():
        cols = [c.strip() for c in raw_line.split(",")]
        if len(cols) < 3:
            continue
        sym = cols[1].upper()
        if not sym or sym in ("SYMBOL", ""):
            continue
        lot_val: int | None = None
        for col in cols[2:]:
            if col.isdigit():
                lot_val = int(col)
                break
        if lot_val and lot_val > 0:
            lots[sym] = lot_val
    return lots


def build_indian_universe(
    pool: str = "nifty50",
    state_dir: Path | str | None = None,
    offline_dir: Path | str | None = None,
    write: bool = True,
) -> dict[str, Any]:
    """Build enriched NSE stock universe (series, F&O flag, lot size, F&O ban status)."""
    if pool not in VALID_POOLS:
        raise NSETraderError(f"Unsupported pool {pool!r}; choose from {', '.join(VALID_POOLS)}")
    rules = load_trading_rules()
    feeds = rules.get("feeds") or {}
    idx_urls: dict[str, str] = feeds.get("nifty_indices_csv") or {}
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    off = Path(offline_dir) if offline_dir else None

    # Fetch auxiliary NSE metadata (SERIES EQ/BE, F&O lot sizes, F&O ban list)
    eq_raw = _read_text_or_fetch(str(feeds.get("nse_equity_list_csv") or ""), off, ["EQUITY_L.csv"])
    eq_map = parse_equity_l_csv(eq_raw) if eq_raw else {}

    lots_raw = _read_text_or_fetch(str(feeds.get("nse_fno_lots_csv") or ""), off, ["fo_mktlots.csv"])
    lot_map = parse_fo_mktlots_csv(lots_raw) if lots_raw else {}

    ban_info = fetch_nse_fno_ban(rules=rules, offline_file=(off / "fo_secban.csv") if off else None)
    ban_set = set(ban_info.get("symbols") or [])

    entries: list[dict[str, Any]] = []
    source_used = ""

    if pool in idx_urls:
        csv_name = f"ind_{pool}list.csv"
        raw_idx = _read_text_or_fetch(idx_urls[pool], off, [csv_name, f"{pool}.csv"])
        if raw_idx:
            source_used = csv_name
            for row in parse_nifty_index_csv(raw_idx):
                sym = row["symbol"]
                meta = eq_map.get(sym, {})
                lot = lot_map.get(sym)
                entries.append(
                    {
                        "symbol": sym,
                        "yahoo": f"{sym}.NS",
                        "name": row["name"] or meta.get("name", sym),
                        "industry": row["industry"],
                        "series": meta.get("series") or row.get("series") or "EQ",
                        "is_fno": lot is not None,
                        "lot_size": lot,
                        "in_fno_ban": sym in ban_set,
                    }
                )
    elif pool == "fno":
        if not lot_map and off is None:
            raise NSETraderError("Could not download NSE fo_mktlots.csv for F&O stock pool")
        index_roots = {"NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "NIFTYFPI", "SENSEX"}
        source_used = "fo_mktlots.csv"
        for sym, lot in sorted(lot_map.items()):
            if sym in index_roots:
                continue
            meta = eq_map.get(sym, {})
            entries.append(
                {
                    "symbol": sym,
                    "yahoo": f"{sym}.NS",
                    "name": meta.get("name", sym),
                    "industry": "",
                    "series": meta.get("series", "EQ"),
                    "is_fno": True,
                    "lot_size": lot,
                    "in_fno_ban": sym in ban_set,
                }
            )
    elif pool == "all_eq":
        if not eq_map:
            raise NSETraderError("Could not load NSE EQUITY_L.csv for all_eq pool")
        source_used = "EQUITY_L.csv"
        for sym, meta in sorted(eq_map.items()):
            lot = lot_map.get(sym)
            entries.append(
                {
                    "symbol": sym,
                    "yahoo": f"{sym}.NS",
                    "name": meta.get("name", sym),
                    "industry": "",
                    "series": meta.get("series", "EQ"),
                    "is_fno": lot is not None,
                    "lot_size": lot,
                    "in_fno_ban": sym in ban_set,
                }
            )

    if not entries and pool == "nifty50":
        source_used = "builtin_nifty50_fallback"
        for sym, cname, ind in BUILTIN_NIFTY50_SYMBOLS:
            lot = lot_map.get(sym)
            meta = eq_map.get(sym, {})
            entries.append(
                {
                    "symbol": sym,
                    "yahoo": f"{sym}.NS",
                    "name": cname,
                    "industry": ind,
                    "series": meta.get("series", "EQ"),
                    "is_fno": lot is not None,
                    "lot_size": lot,
                    "in_fno_ban": sym in ban_set,
                }
            )

    if not entries:
        raise NSETraderError(f"Universe pool {pool!r} produced 0 symbols")

    payload = {
        "pool": pool,
        "source": source_used,
        "count": len(entries),
        "fno_ban_symbols": sorted(ban_set),
        "updated_ist": ist_iso(parse_now_ist(None)),
        "symbols": entries,
    }
    if write:
        write_json_atomic(sdir / "nse_universe.json", payload)
        txt_lines = ["# SYMBOL|NAME|SERIES|FNO|LOT_SIZE|INDUSTRY"]
        for e in entries:
            txt_lines.append(
                f"{e['symbol']}|{e['name']}|{e['series']}|{'Y' if e['is_fno'] else 'N'}|"
                f"{e['lot_size'] or ''}|{e['industry']}"
            )
        (sdir / "universe.txt").parent.mkdir(parents=True, exist_ok=True)
        (sdir / "universe.txt").write_text("\n".join(txt_lines) + "\n", encoding="utf-8")
    return payload


def _read_offline_json_file(path: Path) -> Any:
    opener = gzip.open if path.name.endswith(".gz") else open
    try:
        with opener(path, "rt", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, EOFError, ValueError) as exc:
        raise NSETraderError(f"Could not read offline scanner JSON {path}: {exc}") from exc


def _load_offline_charts_and_spark(offline_path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Load offline v8 charts and/or spark payloads from a file or directory."""
    v8_by_sym: dict[str, dict[str, Any]] = {}
    spark_by_sym: dict[str, Any] = {}

    def _ingest_obj(obj: Any, hint: str = "") -> None:
        if not isinstance(obj, dict):
            return
        if "chart" in obj:
            results = (obj.get("chart") or {}).get("result") or []
            if results:
                meta_sym = str((results[0].get("meta") or {}).get("symbol") or hint).upper()
                if meta_sym:
                    v8_by_sym[meta_sym] = obj
            return
        # Bundle {"RELIANCE.NS": {"chart": ...}} OR spark response {"RELIANCE.NS": {"timestamp": ..., "close": ...}}
        for k, v in obj.items():
            if not isinstance(v, dict):
                continue
            key_sym = k.upper()
            if "chart" in v:
                v8_by_sym[key_sym] = v
            elif "close" in v and "timestamp" in v:
                spark_by_sym[key_sym] = v

    if offline_path.is_file():
        _ingest_obj(_read_offline_json_file(offline_path), hint=offline_path.stem.split(".")[0])
    elif offline_path.is_dir():
        for p in sorted(offline_path.iterdir()):
            if not p.is_file() or not (p.name.endswith(".json") or p.name.endswith(".json.gz")):
                continue
            hint = p.name.removesuffix(".gz").removesuffix(".json")
            _ingest_obj(_read_offline_json_file(p), hint=hint)
    else:
        raise NSETraderError(f"Offline path not found: {offline_path}")
    return v8_by_sym, spark_by_sym


def _resolve_scan_symbols(
    pool: str,
    symbols_csv: str | None,
    watchlist_path: str | None,
    limit: int | None,
    include_t2t: bool,
    state_dir: Path,
    offline_dir: Path | None,
) -> tuple[list[dict[str, Any]], set[str], list[str]]:
    rules = load_trading_rules()
    exclude_series = set((rules.get("scanner") or {}).get("exclude_t2t_series") or ["BE", "BZ"])

    if symbols_csv:
        raw_syms = [s.strip() for s in symbols_csv.split(",") if s.strip()]
        ban_info = fetch_nse_fno_ban(rules=rules, offline_file=(offline_dir / "fo_secban.csv") if offline_dir else None)
        ban_set = set(ban_info.get("symbols") or [])
        items = []
        for rs in raw_syms:
            ns = normalize_symbol(rs)
            items.append(
                {
                    "symbol": ns["base"],
                    "yahoo": ns["yahoo"],
                    "name": ns["base"],
                    "series": "EQ",
                    "is_fno": False,
                    "lot_size": None,
                    "in_fno_ban": ns["base"] in ban_set,
                }
            )
        return (items[:limit] if limit else items), ban_set, []

    if watchlist_path:
        wl = load_json_file(watchlist_path, required=True)
        ban_info = fetch_nse_fno_ban(rules=rules, offline_file=(offline_dir / "fo_secban.csv") if offline_dir else None)
        ban_set = set(ban_info.get("symbols") or [])
        items = []
        for hit in wl.get("hits") or []:
            sym = str(hit.get("symbol") or hit.get("base") or "").strip()
            if not sym:
                continue
            ns = normalize_symbol(sym)
            items.append(
                {
                    "symbol": ns["base"],
                    "yahoo": ns["yahoo"],
                    "name": str(hit.get("name") or ns["base"]),
                    "series": str(hit.get("series") or "EQ"),
                    "is_fno": bool(hit.get("is_fno")),
                    "lot_size": hit.get("lot_size"),
                    "in_fno_ban": ns["base"] in ban_set,
                }
            )
        return (items[:limit] if limit else items), ban_set, []

    uni_path = state_dir / "nse_universe.json"
    uni = load_json_file(uni_path, required=False)
    if not isinstance(uni, dict) or uni.get("pool") != pool or not uni.get("symbols"):
        uni = build_indian_universe(pool=pool, state_dir=state_dir, offline_dir=offline_dir, write=True)

    ban_info = fetch_nse_fno_ban(rules=rules, offline_file=(offline_dir / "fo_secban.csv") if offline_dir else None)
    ban_set = set(ban_info.get("symbols") or uni.get("fno_ban_symbols") or [])
    items = []
    skipped_t2t: list[str] = []
    for row in uni.get("symbols") or []:
        ser = str(row.get("series") or "EQ").upper()
        if not include_t2t and ser in exclude_series:
            skipped_t2t.append(f"{row['symbol']}({ser})")
            continue
        item = dict(row)
        item["in_fno_ban"] = item["symbol"] in ban_set
        items.append(item)
    return (items[:limit] if limit else items), ban_set, skipped_t2t


def _detect_daily_setups_from_closes(closes: list[float]) -> list[str]:
    """Detect pure-price daily setups (Stage 1) from completed daily closes (min 22 bars)."""
    if len(closes) < 22:
        return []
    hits: list[str] = []
    last_c = closes[-1]
    prev_c = closes[-2]
    prior_20 = closes[-21:-1]
    if last_c > max(prior_20):
        hits.append("breakout_20d")

    if len(closes) >= 16:
        surge_base = closes[-16]
        pre_flag_hi = closes[-6]
        flag_5 = closes[-5:]
        if surge_base > 0 and pre_flag_hi > 0:
            surge_pct = (pre_flag_hi - surge_base) / surge_base
            flag_rng_pct = (max(flag_5) - min(flag_5)) / pre_flag_hi
            if surge_pct >= 0.08 and flag_rng_pct <= 0.05 and last_c >= pre_flag_hi * 0.96:
                hits.append("bull_flag")

    sma20_now = calc_sma(closes, 20)
    sma20_prev = calc_sma(closes[:-1], 20)
    if sma20_now and sma20_prev and prev_c <= sma20_prev and last_c > sma20_now:
        hits.append("reclaim_sma20")

    rsi_series = calc_rsi_series(closes, 14)
    rsi_now = rsi_series[-1]
    rsi_prev = rsi_series[-2] if len(rsi_series) >= 2 else None
    if rsi_now is not None and rsi_now < 30.0:
        hits.append("oversold")
    if rsi_prev is not None and rsi_prev < 30.0 and last_c > prev_c:
        hits.append("oversold_bounce")

    period_hi = max(closes[:-1])
    if period_hi > 0 and last_c >= period_hi * 0.97:
        hits.append("near_high")
    return hits


def scan_daily_indian(
    pool: str = "nifty50",
    symbols_csv: str | None = None,
    watchlist_path: str | None = None,
    setup_filter: str = "all",
    min_price: float | None = None,
    min_volume: int | None = None,
    min_turnover_cr: float | None = None,
    max_confirm: int | None = None,
    limit: int | None = None,
    include_t2t: bool = False,
    now_str: str | None = None,
    state_dir: Path | str | None = None,
    offline_path: Path | str | None = None,
    write: bool = True,
) -> dict[str, Any]:
    rules = load_trading_rules()
    holidays = load_nse_holidays()
    sc_cfg = rules.get("scanner") or {}
    tick = float(rules["session_ist"]["tick_size_inr"])

    if setup_filter != "all" and setup_filter not in SETUP_NAMES:
        raise NSETraderError(f"Unknown setup {setup_filter!r}; expected 'all' or {', '.join(sorted(SETUP_NAMES))}")

    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    off_p = Path(offline_path) if offline_path else None
    dt_ist = parse_now_ist(now_str)
    session_info = nse_session_info(dt_ist, rules=rules, holidays_cfg=holidays)
    mkt_close_min = parse_clock_minutes(rules["session_ist"]["market_close"])
    cur_mins = dt_ist.hour * 60 + dt_ist.minute
    is_open_day, _ = trading_day_status(dt_ist.date(), holidays_cfg=holidays)
    # Drop today's partial daily candle if session hasn't closed yet
    drop_date_str = dt_ist.date().isoformat() if (is_open_day and cur_mins < mkt_close_min) else None

    eff_min_price = float(sc_cfg.get("default_min_price_inr", 50.0) if min_price is None else min_price)
    eff_min_vol = int(sc_cfg.get("default_min_volume", 100000) if min_volume is None else min_volume)
    eff_min_turn_cr = float(sc_cfg.get("default_min_turnover_cr", 10.0) if min_turnover_cr is None else min_turnover_cr)
    eff_max_confirm = int(sc_cfg.get("max_confirm_charts", 100) if max_confirm is None else max_confirm)
    batch_sz = int(sc_cfg.get("spark_batch_size", 20))
    workers = int(sc_cfg.get("parallel_workers", 8))

    off_dir_for_uni = off_p if (off_p and off_p.is_dir()) else None
    items, ban_set, skipped_t2t = _resolve_scan_symbols(
        pool=pool,
        symbols_csv=symbols_csv,
        watchlist_path=watchlist_path,
        limit=limit,
        include_t2t=include_t2t,
        state_dir=sdir,
        offline_dir=off_dir_for_uni,
    )

    off_v8: dict[str, dict[str, Any]] = {}
    off_spark: dict[str, Any] = {}
    if off_p:
        off_v8, off_spark = _load_offline_charts_and_spark(off_p)
        if not symbols_csv and not watchlist_path and (off_v8 or off_spark):
            # Keep symbols matching offline bundle if user scanned with default pool against offline fixtures
            off_keys = set(off_v8) | set(off_spark)
            filtered = [it for it in items if it["yahoo"] in off_keys]
            if filtered:
                items = filtered
            else:
                items = [
                    {
                        "symbol": k.removesuffix(".NS").removesuffix(".BO"),
                        "yahoo": k,
                        "name": k.removesuffix(".NS").removesuffix(".BO"),
                        "series": "EQ",
                        "is_fno": False,
                        "lot_size": None,
                        "in_fno_ban": k.removesuffix(".NS") in ban_set,
                    }
                    for k in sorted(off_keys)
                ]

    stage1_candidates: list[dict[str, Any]] = []
    failed_symbols: list[str] = []

    def _extract_closes_from_spark_item(sp_item: dict[str, Any]) -> list[float]:
        stamps = sp_item.get("timestamp") or []
        closes_raw = sp_item.get("close") or []
        out_c: list[float] = []
        for idx, ts in enumerate(stamps):
            if ts is None or idx >= len(closes_raw) or closes_raw[idx] is None:
                continue
            d_str = to_ist(utc_of(ts)).date().isoformat()
            if drop_date_str and d_str == drop_date_str:
                continue
            out_c.append(float(closes_raw[idx]))
        return out_c

    def _extract_closes_from_v8(raw_v8: dict[str, Any]) -> list[float]:
        res = (raw_v8.get("chart") or {}).get("result") or []
        if not res:
            return []
        _, bars = parse_bars_from_chart(res[0], interval="1d")
        return [b["c"] for b in bars if not (drop_date_str and b["date"] == drop_date_str)]

    # Stage 1: Fast close sweep (Spark 20/req or offline cache)
    if off_p:
        for it in items:
            ysym = it["yahoo"]
            closes: list[float] = []
            if ysym in off_spark:
                closes = _extract_closes_from_spark_item(off_spark[ysym])
            elif ysym in off_v8:
                closes = _extract_closes_from_v8(off_v8[ysym])
            else:
                failed_symbols.append(ysym)
                continue
            if not closes or closes[-1] < eff_min_price:
                continue
            matched = _detect_daily_setups_from_closes(closes)
            if setup_filter != "all":
                matched = [m for m in matched if m == setup_filter]
            if matched:
                stage1_candidates.append({**it, "matched_setups": matched, "stage1_close": closes[-1]})
    else:
        batches = [items[i : i + batch_sz] for i in range(0, len(items), batch_sz)]
        spark_data: dict[str, Any] = {}

        def _fetch_batch(batch: list[dict[str, Any]]) -> dict[str, Any]:
            return fetch_yahoo_spark([b["yahoo"] for b in batch], range_="3mo", interval="1d")

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, max(1, len(batches)))) as ex:
            futs = [ex.submit(_fetch_batch, b) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                with contextlib.suppress(NSETraderError, OSError):
                    spark_data.update(fut.result())

        for it in items:
            ysym = it["yahoo"]
            sp = spark_data.get(ysym)
            if not isinstance(sp, dict):
                failed_symbols.append(ysym)
                continue
            closes = _extract_closes_from_spark_item(sp)
            if not closes or closes[-1] < eff_min_price:
                continue
            matched = _detect_daily_setups_from_closes(closes)
            if setup_filter != "all":
                matched = [m for m in matched if m == setup_filter]
            if matched:
                stage1_candidates.append({**it, "matched_setups": matched, "stage1_close": closes[-1]})

    # Stage 2: Parallel Yahoo v8/chart for exact OHLCV, RVOL, ATR, INR turnover verification
    confirm_pool = stage1_candidates[:eff_max_confirm]
    truncated_confirm = max(0, len(stage1_candidates) - len(confirm_pool))

    def _confirm_one(cand: dict[str, Any]) -> dict[str, Any] | None:
        ysym = cand["yahoo"]
        try:
            if off_p:
                if ysym in off_v8:
                    res = (off_v8[ysym].get("chart") or {}).get("result") or []
                    chart_res = res[0] if res else None
                else:
                    # Pure offline Spark fixture without v8 volume: allow passing if volume filters are 0
                    c_val = cand["stage1_close"]
                    if eff_min_vol > 0 or eff_min_turn_cr > 0:
                        return None
                    return {
                        "symbol": cand["symbol"],
                        "yahoo": ysym,
                        "name": cand["name"],
                        "series": cand["series"],
                        "is_fno": cand["is_fno"],
                        "lot_size": cand["lot_size"],
                        "in_fno_ban": cand["in_fno_ban"],
                        "close": round_tick(c_val, tick),
                        "pct_change": 0.0,
                        "volume": 0,
                        "rvol": None,
                        "turnover_cr": 0.0,
                        "atr14": None,
                        "rsi14": None,
                        "setups": cand["matched_setups"],
                        "date": "",
                    }
            else:
                raw_txt = fetch_yahoo_chart(ysym, range_="3mo", interval="1d")
                chart_res = extract_chart_result(raw_txt, ysym)
            if not chart_res:
                return None
            _, bars = parse_bars_from_chart(chart_res, interval="1d")
            bars = [b for b in bars if not (drop_date_str and b["date"] == drop_date_str)]
            if len(bars) < 22:
                return None
            closes_d = [b["c"] for b in bars]
            vols_d = [b["v"] for b in bars]
            last_b = bars[-1]
            prev_b = bars[-2]
            close_p = round_tick(last_b["c"], tick)
            vol_now = int(last_b["v"])
            turn_cr = round((close_p * vol_now) / 1e7, 2)
            if close_p < eff_min_price or vol_now < eff_min_vol or turn_cr < eff_min_turn_cr:
                return None

            avg_v20 = sum(vols_d[-21:-1]) / 20.0 if len(vols_d) >= 21 else 0.0
            rvol = round(vol_now / avg_v20, 2) if avg_v20 > 0 else None
            atr14 = calc_atr(bars, 14)
            rsi_val = calc_rsi_series(closes_d, 14)[-1]
            pct_chg = round(((close_p - prev_b["c"]) / prev_b["c"]) * 100.0, 2) if prev_b["c"] > 0 else 0.0
            return {
                "symbol": cand["symbol"],
                "yahoo": ysym,
                "name": cand["name"],
                "series": cand["series"],
                "is_fno": cand["is_fno"],
                "lot_size": cand["lot_size"],
                "in_fno_ban": cand["in_fno_ban"],
                "date": last_b["date"],
                "close": close_p,
                "pct_change": pct_chg,
                "volume": vol_now,
                "rvol": rvol,
                "turnover_cr": turn_cr,
                "atr14": round(atr14, 2) if atr14 else None,
                "rsi14": rsi_val,
                "setups": cand["matched_setups"],
            }
        except (OSError, ValueError, KeyError, NSETraderError):
            return None

    hits: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for fut in concurrent.futures.as_completed([ex.submit(_confirm_one, c) for c in confirm_pool]):
            row = fut.result()
            if row:
                hits.append(row)

    hits.sort(
        key=lambda x: (
            len(x["setups"]),
            x.get("rvol") or 0.0,
            x.get("turnover_cr") or 0.0,
        ),
        reverse=True,
    )

    report = {
        "mode": "daily",
        "pool": pool,
        "setup_filter": setup_filter,
        "ist_timestamp": ist_iso(dt_ist),
        "session_phase": session_info["phase"],
        "scanned": len(items),
        "stage1_candidates": len(stage1_candidates),
        "truncated_confirm": truncated_confirm,
        "failed_count": len(failed_symbols),
        "skipped_t2t_count": len(skipped_t2t),
        "filters": {
            "min_price_inr": eff_min_price,
            "min_volume": eff_min_vol,
            "min_turnover_cr": eff_min_turn_cr,
        },
        "hits": hits,
        "note": "A scan is a list of charts that match technical criteria - verify news and run Time Machine + Risk Gate before entering.",
    }
    if write:
        write_json_atomic(sdir / "watchlist.json", report)
    return report


def scan_orb_indian(
    pool: str = "nifty50",
    symbols_csv: str | None = None,
    watchlist_path: str | None = None,
    or_minutes: int = 15,
    min_price: float | None = None,
    min_turnover_cr: float = 0.0,
    max_confirm: int | None = None,
    limit: int | None = None,
    at_ist: str | None = None,
    now_str: str | None = None,
    include_t2t: bool = False,
    state_dir: Path | str | None = None,
    offline_path: Path | str | None = None,
    write: bool = True,
) -> dict[str, Any]:
    rules = load_trading_rules()
    holidays = load_nse_holidays()
    sc_cfg = rules.get("scanner") or {}
    tick = float(rules["session_ist"]["tick_size_inr"])

    dt_ist = parse_now_ist(now_str)
    if at_ist:
        at_mins = parse_clock_minutes(at_ist, label="--at")
        dt_ist = datetime.datetime.combine(dt_ist.date(), datetime.time(at_mins // 60, at_mins % 60))

    session_info = nse_session_info(dt_ist, rules=rules, holidays_cfg=holidays)
    or_bars_req = max(1, or_minutes // 5)
    or_end_mins = NSE_OPEN_MIN + or_bars_req * 5
    cur_mins = dt_ist.hour * 60 + dt_ist.minute
    if cur_mins < or_end_mins:
        raise NSETraderError(
            f"Opening range ({or_minutes}m) completes at {or_end_mins // 60:02d}:{or_end_mins % 60:02d} IST "
            f"(clock is {dt_ist.strftime('%H:%M')} IST)"
        )

    eff_min_price = float(sc_cfg.get("default_min_price_inr", 50.0) if min_price is None else min_price)
    eff_max_confirm = int(sc_cfg.get("max_confirm_charts", 100) if max_confirm is None else max_confirm)
    batch_sz = int(sc_cfg.get("spark_batch_size", 20))
    workers = int(sc_cfg.get("parallel_workers", 8))

    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    off_p = Path(offline_path) if offline_path else None
    off_dir_for_uni = off_p if (off_p and off_p.is_dir()) else None

    items, ban_set, skipped_t2t = _resolve_scan_symbols(
        pool=pool,
        symbols_csv=symbols_csv,
        watchlist_path=watchlist_path,
        limit=limit,
        include_t2t=include_t2t,
        state_dir=sdir,
        offline_dir=off_dir_for_uni,
    )

    off_v8: dict[str, dict[str, Any]] = {}
    off_spark: dict[str, Any] = {}
    if off_p:
        off_v8, off_spark = _load_offline_charts_and_spark(off_p)
        if not symbols_csv and not watchlist_path and (off_v8 or off_spark):
            off_keys = set(off_v8) | set(off_spark)
            filtered = [it for it in items if it["yahoo"] in off_keys]
            if filtered:
                items = filtered
            else:
                items = [
                    {
                        "symbol": k.removesuffix(".NS").removesuffix(".BO"),
                        "yahoo": k,
                        "name": k.removesuffix(".NS").removesuffix(".BO"),
                        "series": "EQ",
                        "is_fno": False,
                        "lot_size": None,
                        "in_fno_ban": k.removesuffix(".NS") in ban_set,
                    }
                    for k in sorted(off_keys)
                ]

    target_date = dt_ist.date().isoformat()
    stage1_cands: list[dict[str, Any]] = []
    failed: list[str] = []

    def _spark_orb_pass(sp_item: dict[str, Any]) -> bool:
        stamps = sp_item.get("timestamp") or []
        closes = sp_item.get("close") or []
        by_slot: dict[int, float] = {}
        for idx, ts in enumerate(stamps):
            if ts is None or idx >= len(closes) or closes[idx] is None or int(ts) % 300 != 0:
                continue
            b_ist = to_ist(utc_of(ts))
            if b_ist.date().isoformat() != target_date:
                continue
            if b_ist + datetime.timedelta(minutes=5) > dt_ist:
                continue
            mins = b_ist.hour * 60 + b_ist.minute - NSE_OPEN_MIN
            if 0 <= mins < NSE_SESSION_BARS * 5:
                by_slot[mins // 5] = float(closes[idx])
        if not all(s in by_slot for s in range(or_bars_req)):
            return False
        or_close_hi = max(by_slot[s] for s in range(or_bars_req))
        last_slot = max(by_slot)
        if by_slot[last_slot] < eff_min_price:
            return False
        return any(by_slot[s] > or_close_hi for s in sorted(by_slot) if s >= or_bars_req)

    if off_p:
        for it in items:
            ysym = it["yahoo"]
            if ysym in off_spark:
                if _spark_orb_pass(off_spark[ysym]):
                    stage1_cands.append(it)
            elif ysym in off_v8:
                stage1_cands.append(it)
            else:
                failed.append(ysym)
    else:
        batches = [items[i : i + batch_sz] for i in range(0, len(items), batch_sz)]
        spark_data: dict[str, Any] = {}

        def _fetch_5m_batch(b: list[dict[str, Any]]) -> dict[str, Any]:
            return fetch_yahoo_spark([x["yahoo"] for x in b], range_="1d", interval="5m")

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, max(1, len(batches)))) as ex:
            for fut in concurrent.futures.as_completed([ex.submit(_fetch_5m_batch, b) for b in batches]):
                with contextlib.suppress(NSETraderError, OSError):
                    spark_data.update(fut.result())

        for it in items:
            ysym = it["yahoo"]
            sp = spark_data.get(ysym)
            if not isinstance(sp, dict):
                failed.append(ysym)
                continue
            if _spark_orb_pass(sp):
                stage1_cands.append(it)

    confirm_pool = stage1_cands[:eff_max_confirm]
    truncated = max(0, len(stage1_cands) - len(confirm_pool))

    def _confirm_orb(cand: dict[str, Any]) -> dict[str, Any] | None:
        ysym = cand["yahoo"]
        try:
            if off_p:
                raw_obj = off_v8.get(ysym)
                if not raw_obj:
                    return None
                res_list = (raw_obj.get("chart") or {}).get("result") or []
                chart_res = res_list[0] if res_list else None
            else:
                raw_txt = fetch_yahoo_chart(ysym, range_="1d", interval="5m")
                chart_res = extract_chart_result(raw_txt, ysym)
            if not chart_res:
                return None
            meta, all_bars = parse_bars_from_chart(chart_res, interval="5m", now_ist=dt_ist)
            day_bars = sorted([b for b in all_bars if b["date"] == target_date], key=lambda x: x["slot"])
            or_bars = [b for b in day_bars if b["slot"] < or_bars_req]
            post_bars = [b for b in day_bars if b["slot"] >= or_bars_req]
            if len(or_bars) < or_bars_req or not post_bars:
                return None

            # Verify no missing 5m bars up to latest slot (catches circuit halts / illiquidity)
            max_slot = day_bars[-1]["slot"]
            if len(day_bars) < max_slot + 1:
                return None

            orh = round_tick(max(b["h"] for b in or_bars), tick)
            orl = round_tick(min(b["l"] for b in or_bars), tick)
            avg_or_vol = sum(b["v"] for b in or_bars) / len(or_bars)

            trigger_bar: dict[str, Any] | None = None
            for b in post_bars:
                if b["c"] > orh:
                    trigger_bar = b
                    break
            if not trigger_bar:
                return None

            # Anchored VWAP up to latest completed bar
            cum_pv = sum(((b["h"] + b["l"] + b["c"]) / 3.0) * (b["v"] if b["v"] > 0 else 1.0) for b in day_bars)
            cum_v = sum((b["v"] if b["v"] > 0 else 1.0) for b in day_bars)
            vwap = round_tick(cum_pv / cum_v, tick) if cum_v > 0 else orh
            ltp = round_tick(day_bars[-1]["c"], tick)
            if ltp < eff_min_price:
                return None

            day_turn_cr = round(sum(b["c"] * b["v"] for b in day_bars) / 1e7, 2)
            if day_turn_cr < min_turnover_cr:
                return None

            pdc = meta.get("chartPreviousClose") or meta.get("previousClose")
            pct_chg = round(((ltp - float(pdc)) / float(pdc)) * 100.0, 2) if pdc else None
            trig_dt = datetime.datetime.combine(dt_ist.date(), datetime.time.fromisoformat(trigger_bar["time"])) + datetime.timedelta(minutes=5)
            trig_rvol = round(trigger_bar["v"] / avg_or_vol, 2) if avg_or_vol > 0 else None

            return {
                "symbol": cand["symbol"],
                "yahoo": ysym,
                "name": cand["name"],
                "series": cand["series"],
                "is_fno": cand["is_fno"],
                "lot_size": cand["lot_size"],
                "in_fno_ban": cand["in_fno_ban"],
                "ltp": ltp,
                "pct_change": pct_chg,
                "orh": orh,
                "orl": orl,
                "orb_range_pct": round(((orh - orl) / orl) * 100.0, 2) if orl > 0 else 0.0,
                "trigger_time_ist": trig_dt.strftime("%H:%M"),
                "trigger_close": round_tick(trigger_bar["c"], tick),
                "trigger_rvol": trig_rvol,
                "anchored_vwap": vwap,
                "above_vwap": ltp >= vwap,
                "session_turnover_cr": day_turn_cr,
            }
        except (OSError, ValueError, KeyError, NSETraderError):
            return None

    hits: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for fut in concurrent.futures.as_completed([ex.submit(_confirm_orb, c) for c in confirm_pool]):
            row = fut.result()
            if row:
                hits.append(row)

    hits.sort(
        key=lambda x: (
            1 if x["above_vwap"] else 0,
            x.get("trigger_rvol") or 0.0,
            x.get("session_turnover_cr") or 0.0,
        ),
        reverse=True,
    )

    warnings: list[str] = []
    if not session_info["intraday_entry_allowed"] and session_info["is_market_open"]:
        warnings.append(
            f"IST phase is {session_info['phase']} ({dt_ist.strftime('%H:%M')} IST): new intraday entries blocked after 14:30 IST"
        )

    report = {
        "mode": "orb",
        "pool": pool,
        "or_minutes": or_minutes,
        "ist_timestamp": ist_iso(dt_ist),
        "session_phase": session_info["phase"],
        "scanned": len(items),
        "stage1_candidates": len(stage1_cands),
        "truncated_confirm": truncated,
        "failed_count": len(failed),
        "skipped_t2t_count": len(skipped_t2t),
        "warnings": warnings,
        "hits": hits,
        "note": "ORB hits confirm a 5m close > ORH only; check news, R:R after taxes, and Time Machine before staging.",
    }
    if write:
        write_json_atomic(sdir / "watchlist.json", report)
    return report


def format_scanner_report(data: dict[str, Any], color: bool | None = None) -> str:
    ui = UI(color=color)
    mode = data.get("mode", "daily")
    if mode == "universe":
        bans = ", ".join(data.get("fno_ban_symbols") or []) or "None"
        return "\n".join(
            [
                ui.banner(
                    title=f"NSE STOCK UNIVERSE CACHED  {ui.dot_ch}  {str(data['pool']).upper()}",
                    badge=f"{data['count']} SYMBOLS",
                    badge_tone="pass",
                ),
                "",
                ui.kv_table(
                    [
                        ("Pool", str(data["pool"]), "Selected index / universe segment."),
                        ("Symbols Cached", f"{int(data['count']):,}", "Ready for fast 2-stage scanning."),
                        ("Data Source", str(data.get("source", "")), "NiftyIndices / NSE Archives CSV."),
                        ("NSE F&O Ban (>95% MWPL)", bans, "Avoid fresh F&O entries on banned stocks."),
                    ],
                    headers=("Field", "Value", "Beginner Note"),
                ),
            ]
        )

    ts_short = str(data.get("ist_timestamp", "")).replace("T", " ")[:19] + " IST"
    hits = data.get("hits") or []
    blocks: list[str] = [
        ui.banner(
            title=f"NSE/BSE MARKET SCANNER [{mode.upper()}]  {ui.dot_ch}  Pool: {str(data['pool']).upper()}",
            subtitle=f"{ts_short}  |  Phase: {data.get('session_phase', 'N/A')}  |  Elapsed: {data.get('elapsed_sec', '-')}s",
            badge=f"{len(hits)} HIT{'S' if len(hits) != 1 else ''}",
            badge_tone="good" if hits else "warn",
        ),
        "",
        ui.table(
            headers=["Scanned", "Stage-1 Passed", "Confirmed Hits", "Skipped T2T (BE/BZ)", "Failed"],
            rows=[
                [
                    str(data.get("scanned", 0)),
                    str(data.get("stage1_candidates", 0)),
                    ui.green(str(len(hits)), bold=True) if hits else ui.yellow("0"),
                    str(data.get("skipped_t2t_count", 0)),
                    str(data.get("failed_count", 0)),
                ]
            ],
            alignments=["right", "right", "right", "right", "right"],
        ),
    ]

    for w in data.get("warnings") or []:
        blocks.append("")
        blocks.append(ui.callout("Session Warning", [str(w)], tone_name="warn"))

    if not hits:
        blocks.append("")
        blocks.append(
            ui.callout(
                "No Setups Matched Filters",
                [
                    "No stocks passed all filters right now. Try --setup all, a wider pool (--pool nifty200), or check again during market hours.",
                ],
                tone_name="warn",
            )
        )
        return "\n".join(blocks)

    blocks.append("")
    if mode == "daily":
        rows: list[list[str]] = []
        for h in hits:
            flags: list[str] = []
            if h.get("is_fno"):
                flags.append(f"F&O:{h['lot_size']}")
            if h.get("in_fno_ban"):
                flags.append(ui.red("FNO_BAN", bold=True))
            rvol_s = f"{h['rvol']:.2f}x" if h.get("rvol") is not None else "N/A"
            rsi_v = h.get("rsi14")
            rsi_s = f"{rsi_v:.1f}" if isinstance(rsi_v, (int, float)) else str(rsi_v or "N/A")
            rows.append(
                [
                    ui.bold(str(h["symbol"])),
                    f"{h['close']:,.2f}",
                    ui.trend_pct(h.get("pct_change")),
                    f"{h['turnover_cr']:.1f}",
                    ui.green(rvol_s, bold=True) if (h.get("rvol") or 0) >= 1.5 else rvol_s,
                    rsi_s,
                    " ".join(flags) or "EQ",
                    ", ".join(h.get("setups") or []),
                ]
            )
        blocks.append(ui.section("Confirmed Daily Setup Hits (Sorted by Setups & RVOL)"))
        blocks.append(
            ui.table(
                headers=["Symbol", "Close (Rs.)", "Day %", "Turn (Cr)", "RVOL", "RSI", "Lot/Flags", "Matched Setups"],
                rows=rows,
                alignments=["left", "right", "right", "right", "right", "right", "left", "left"],
                nowrap_cols={0, 1, 2, 3, 4, 5},
            )
        )
        blocks.append("")
        blocks.append(
            ui.callout(
                "How to Read & What To Do Next (Beginner Guide)",
                [
                    "RVOL >= 1.5x = higher-than-usual buying/selling volume today; RSI 55-70 = strong momentum.",
                    "BE/BZ Trade-to-Trade scrips are auto-filtered out (no intraday leverage allowed by SEBI).",
                    f"Note: {data.get('note', '')}",
                    "Next step: Pick 1 symbol and run: python scripts/nse_data_loader.py --symbol <SYMBOL> --with-news",
                ],
                tone_name="info",
            )
        )
    else:
        rows = []
        for h in hits:
            flags = [ui.red("FNO_BAN", bold=True)] if h.get("in_fno_ban") else ([f"F&O:{h['lot_size']}"] if h.get("is_fno") else ["EQ"])
            vwap_tag = ui.green("ABOVE") if h["above_vwap"] else ui.red("BELOW")
            vwap_s = f"{h['anchored_vwap']:,.2f}\n{vwap_tag}"
            rvol_s = f"{h['trigger_rvol']:.2f}x" if h.get("trigger_rvol") is not None else "N/A"
            rows.append(
                [
                    ui.bold(str(h["symbol"])),
                    f"{h['ltp']:,.2f}",
                    f"H {h['orh']:.2f}\nL {h['orl']:.2f}",
                    f"{h['trigger_time_ist']} IST\n@ {h['trigger_close']:.2f}",
                    rvol_s,
                    vwap_s,
                    f"{h['session_turnover_cr']:.1f}",
                    " ".join(flags),
                ]
            )
        blocks.append(ui.section("15m Opening Range Breakout (ORB) + VWAP Hits"))
        blocks.append(
            ui.table(
                headers=["Symbol", "LTP (Rs.)", "ORH / ORL", "Trigger", "RVOL", "VWAP Bias", "Turn(Cr)", "Flags"],
                rows=rows,
                alignments=["left", "right", "right", "left", "right", "right", "right", "left"],
                nowrap_cols={0, 1, 2, 3, 4, 5, 6},
            )
        )
        blocks.append("")
        blocks.append(
            ui.callout(
                "How to Read 15m ORB + VWAP (Beginner Guide)",
                [
                    "ORH / ORL = highest & lowest price in the first 15 mins (09:15-09:30 IST). Closing above ORH shows early buyer strength.",
                    "ABOVE VWAP confirms buyers are holding control above today's volume-weighted average price.",
                    f"Note: {data.get('note', '')}",
                ],
                tone_name="info",
            )
        )
    return "\n".join(blocks)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="NSE/BSE Fast Market Scanner (Universe, Daily Setups & 15m ORB+VWAP)")
    sub = p.add_subparsers(dest="command", required=True)

    pu = sub.add_parser("universe", help="Download & cache Indian stock universe from NiftyIndices & NSE Archives")
    pu.add_argument("--pool", default="nifty50", choices=list(VALID_POOLS), help="Universe pool (default: nifty50)")
    pu.add_argument("--state-dir", default=None, help="Override state directory")
    pu.add_argument("--offline", default=None, help="Offline directory containing NSE/NiftyIndices CSVs")
    pu.add_argument("--no-write", action="store_true", help="Do not write state/nse_universe.json")
    pu.add_argument("--json", action="store_true", help="Output structured JSON")

    pd = sub.add_parser("daily", help="Scan daily closes + volume/turnover for swing & momentum setups")
    pd.add_argument("--pool", default="nifty50", choices=list(VALID_POOLS), help="Universe pool")
    pd.add_argument("--symbols", default=None, help="Comma-separated custom tickers, e.g. BANKBARODA,SUZLON,SBIN")
    pd.add_argument("--watchlist", default=None, help="Existing watchlist JSON file to rescan")
    pd.add_argument("--setup", default="all", help=f"Filter setup: all or {', '.join(sorted(SETUP_NAMES))}")
    pd.add_argument("--min-price", type=float, default=None, help="Minimum close in INR (default from config: 50)")
    pd.add_argument("--min-volume", type=int, default=None, help="Minimum share volume (default from config: 100000)")
    pd.add_argument("--min-turnover-cr", type=float, default=None, help="Minimum daily turnover in INR Cr (default: 10.0)")
    pd.add_argument("--max-confirm", type=int, default=None, help="Max Stage-2 charts to confirm (default: 100)")
    pd.add_argument("--limit", type=int, default=None, help="Cap universe symbols scanned")
    pd.add_argument("--include-t2t", action="store_true", help="Include Trade-to-Trade (BE/BZ) scrips")
    pd.add_argument("--now", default=None, help="Pin IST timestamp, e.g. '2026-11-09 08:45'")
    pd.add_argument("--state-dir", default=None, help="Override state directory")
    pd.add_argument("--offline", default=None, help="Offline fixtures file or directory")
    pd.add_argument("--no-write", action="store_true", help="Do not write state/watchlist.json")
    pd.add_argument("--json", action="store_true", help="Output structured JSON")

    po = sub.add_parser("orb", help="Scan live 5m bars for 15-minute Opening Range Breakouts + VWAP")
    po.add_argument("--pool", default="nifty50", choices=list(VALID_POOLS), help="Universe pool")
    po.add_argument("--symbols", default=None, help="Comma-separated custom tickers")
    po.add_argument("--watchlist", default=None, help="Existing watchlist JSON file to scan intraday")
    po.add_argument("--or-minutes", type=int, default=15, help="Opening range window in minutes (default: 15)")
    po.add_argument("--min-price", type=float, default=None, help="Minimum LTP in INR (default from config: 50)")
    po.add_argument("--min-turnover-cr", type=float, default=0.0, help="Minimum intraday turnover in INR Cr")
    po.add_argument("--max-confirm", type=int, default=None, help="Max Stage-2 charts to confirm (default: 100)")
    po.add_argument("--limit", type=int, default=None, help="Cap universe symbols scanned")
    po.add_argument("--at", default=None, help="IST cutoff clock HH:MM (e.g. 10:30)")
    po.add_argument("--now", default=None, help="Pin full IST timestamp, e.g. '2026-11-09 10:30'")
    po.add_argument("--include-t2t", action="store_true", help="Include BE/BZ scrips")
    po.add_argument("--state-dir", default=None, help="Override state directory")
    po.add_argument("--offline", default=None, help="Offline fixtures file or directory")
    po.add_argument("--no-write", action="store_true", help="Do not write state/watchlist.json")
    po.add_argument("--json", action="store_true", help="Output structured JSON")

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    t0 = time.perf_counter()
    try:
        if args.command == "universe":
            res = build_indian_universe(
                pool=args.pool,
                state_dir=args.state_dir,
                offline_dir=args.offline,
                write=not args.no_write,
            )
            res["mode"] = "universe"
        elif args.command == "daily":
            res = scan_daily_indian(
                pool=args.pool,
                symbols_csv=args.symbols,
                watchlist_path=args.watchlist,
                setup_filter=args.setup,
                min_price=args.min_price,
                min_volume=args.min_volume,
                min_turnover_cr=args.min_turnover_cr,
                max_confirm=args.max_confirm,
                limit=args.limit,
                include_t2t=args.include_t2t,
                now_str=args.now,
                state_dir=args.state_dir,
                offline_path=args.offline,
                write=not args.no_write,
            )
        else:
            res = scan_orb_indian(
                pool=args.pool,
                symbols_csv=args.symbols,
                watchlist_path=args.watchlist,
                or_minutes=args.or_minutes,
                min_price=args.min_price,
                min_turnover_cr=args.min_turnover_cr,
                max_confirm=args.max_confirm,
                limit=args.limit,
                at_ist=args.at,
                now_str=args.now,
                include_t2t=args.include_t2t,
                state_dir=args.state_dir,
                offline_path=args.offline,
                write=not args.no_write,
            )
        res["elapsed_sec"] = round(time.perf_counter() - t0, 2)
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if args.json else f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        safe_print(format_scanner_report(res))
    if args.command in ("daily", "orb"):
        return 0 if res.get("hits") else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
