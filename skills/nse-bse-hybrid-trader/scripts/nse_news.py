#!/usr/bin/env python3
"""Indian Equity News, Earnings & Regulatory Monitor (`nse_news.py`).
Standard library only. Combines fast, free Indian market sources:
  1. Google News India RSS per ticker (+ company name resolution)
  2. Economic Times Stocks RSS & LiveMint Markets RSS (with headline matching)
  3. SEBI RSS, RBI Press Releases RSS & BSE Notices RSS (regulatory alerts)
  4. NSE live F&O MWPL Ban list CSV (`fo_secban.csv`)
  5. Yahoo Finance v8 intraday move check vs Previous Close (MOVING >= 3%)

Usage:
    python scripts/nse_news.py --tickers SUZLON BANKBARODA
    python scripts/nse_news.py                          # auto-reads watchlist + risk verdict + open SQLite trades
    python scripts/nse_news.py --tickers RELIANCE --all --hours 168 --json
    python scripts/nse_news.py --market                 # top ET/LiveMint/SEBI/RBI market-wide briefing
    python scripts/nse_news.py --offline path/to/dir    # deterministic offline fixtures
"""

from __future__ import annotations

import argparse
import concurrent.futures
import contextlib
import datetime
import email.utils
import hashlib
import json
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from nse_common import (
    DEFAULT_STATE_DIR,
    IST_TZ,
    NSETraderError,
    extract_chart_result,
    extract_previous_close,
    fetch_nse_fno_ban,
    fetch_url_bytes,
    fetch_yahoo_chart,
    ist_iso,
    load_json_file,
    load_trading_rules,
    normalize_symbol,
    parse_now_ist,
    read_offline_chart,
    to_ist,
    write_json_atomic,
)
from nse_ui import UI, format_inr, safe_print

# Built-in fallback company map so Google News queries are accurate even before universe sync
BUILTIN_COMPANY_NAMES: dict[str, str] = {
    "ADANIENT": "Adani Enterprises",
    "ADANIPORTS": "Adani Ports",
    "APOLLOHOSP": "Apollo Hospitals",
    "ASIANPAINT": "Asian Paints",
    "AXISBANK": "Axis Bank",
    "BAJAJ-AUTO": "Bajaj Auto",
    "BAJAJFINSV": "Bajaj Finserv",
    "BAJFINANCE": "Bajaj Finance",
    "BANKBARODA": "Bank of Baroda",
    "BEL": "Bharat Electronics",
    "BHARTIARTL": "Bharti Airtel",
    "BPCL": "BPCL",
    "BRITANNIA": "Britannia",
    "CIPLA": "Cipla",
    "COALINDIA": "Coal India",
    "DRREDDY": "Dr Reddys",
    "EICHERMOT": "Eicher Motors",
    "ETERNAL": "Eternal Zomato",
    "GRASIM": "Grasim",
    "HCLTECH": "HCL Tech",
    "HDFCBANK": "HDFC Bank",
    "HDFCLIFE": "HDFC Life",
    "HEROMOTOCO": "Hero MotoCorp",
    "HINDALCO": "Hindalco",
    "HINDUNILVR": "Hindustan Unilever",
    "ICICIBANK": "ICICI Bank",
    "INDUSINDBK": "IndusInd Bank",
    "INFY": "Infosys",
    "ITC": "ITC",
    "JIOFIN": "Jio Financial",
    "JSWSTEEL": "JSW Steel",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen Toubro",
    "M&M": "Mahindra",
    "MARUTI": "Maruti Suzuki",
    "NESTLEIND": "Nestle India",
    "NTPC": "NTPC",
    "ONGC": "ONGC",
    "POWERGRID": "Power Grid",
    "PNB": "Punjab National Bank",
    "RELIANCE": "Reliance Industries",
    "SBILIFE": "SBI Life",
    "SBIN": "State Bank of India",
    "SHRIRAMFIN": "Shriram Finance",
    "SUNPHARMA": "Sun Pharma",
    "SUZLON": "Suzlon Energy",
    "TATACONSUM": "Tata Consumer",
    "TATAMOTORS": "Tata Motors",
    "TATASTEEL": "Tata Steel",
    "TCS": "TCS",
    "TECHM": "Tech Mahindra",
    "TITAN": "Titan Company",
    "TRENT": "Trent",
    "ULTRACEMCO": "UltraTech Cement",
    "WIPRO": "Wipro",
    "YESBANK": "Yes Bank",
    "NIFTY": "Nifty 50",
    "BANKNIFTY": "Bank Nifty",
    "FINNIFTY": "FinNifty",
    "SENSEX": "BSE Sensex",
}

INDIAN_CATALYST_PATTERNS: list[tuple[str, str]] = [
    ("earnings", r"\b(?:Q[1-4](?:\s*FY\d{2,4})?|quarterly|results?|PAT|EBITDA|NII|NIM|margin|profit|revenue|guidance|loss)\b"),
    ("order_win", r"\b(?:orders?|bagged|wins?|won|LoA|EPC|MW|GW|contracts?|projects?|tie-up|MoU)\b"),
    ("analyst", r"\b(?:target price|upgrades?|downgrades?|outperform|underperform|brokerage|Motilal|UBS|Jefferies|CLSA|Nomura|Goldman|Morgan Stanley|JPMorgan|CRISIL|ICRA)\b"),
    ("deal_qip", r"\b(?:block deal|bulk deal|QIP|OFS|stake sale|acqui(?:re|res|red|sition)|merger|demerger|buyout|IPO|allotment)\b"),
    ("capital_corp", r"\b(?:dividend|bonus|stock split|buyback|record date|ex-date|board meeting|rights issue|fund\s*rais(?:e|ing)|NCD)\b"),
    ("regulatory", r"\b(?:SEBI|RBI|MPC|repo rate|ASM|GSM|F&O ban|MWPL|T2T|trade-to-trade|circular|penalty|show cause|notice|DGCA|TRAI|GST)\b"),
    ("legal_risk", r"\b(?:NCLT|insolvency|ED\b|CBI|IT raid|fraud|default|lawsuit|arbitration|court|probe|cyber|breach)\b"),
    ("management", r"\b(?:CEO|MD\b|CFO|CMD|chairman|resign(?:s|ed)?|steps down|appoint(?:s|ed)?)\b"),
    ("circuit_halt", r"\b(?:upper circuit|lower circuit|circuit limit|freeze|halted|suspended|crash|tanks?|surges?|soars?)\b"),
]

_DOCTYPE_RE = re.compile(r"<!DOCTYPE[^>]*?(?:\[[\s\S]*?\])?>", re.IGNORECASE)
_ENTITY_RE = re.compile(r"<!ENTITY[^>]*>", re.IGNORECASE)


def _strip_unsafe_xml_decl(raw_bytes: bytes) -> str:
    text = raw_bytes.decode("utf-8", "replace").lstrip("\ufeff").strip()
    if "ISO-8859-1" in text[:160].upper():
        with contextlib.suppress(UnicodeDecodeError):
            text = raw_bytes.decode("iso-8859-1", "replace").lstrip("\ufeff").strip()
    text = re.sub(r"<\?xml[^>]*encoding=['\"][^'\"]+['\"][^>]*\?>", "", text, count=1, flags=re.IGNORECASE)
    text = _DOCTYPE_RE.sub("", text)
    return _ENTITY_RE.sub("", text)


def _safe_parse_xml(raw_bytes: bytes, label: str) -> ET.Element:
    cleaned = _strip_unsafe_xml_decl(raw_bytes)
    try:
        return ET.fromstring(cleaned)  # noqa: S314
    except ET.ParseError as exc:
        raise NSETraderError(f"Invalid RSS/XML payload for {label}: {exc}") from exc


def parse_indian_pubdate(raw_str: str | None) -> datetime.datetime | None:
    """Parse RFC-2822, SEBI ('10 Nov, 2026 +0530'), RBI naive IST, or ISO-8601 into UTC."""
    val = (raw_str or "").strip()
    if not val:
        return None
    try:
        dt = email.utils.parsedate_to_datetime(val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST_TZ)
        return dt.astimezone(datetime.timezone.utc)
    except (TypeError, ValueError, IndexError):
        pass

    # SEBI style: "10 Nov, 2026 +0530" or "10 Nov, 2026"
    m_sebi = re.match(r"^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})(?:\s+([+-]\d{4}))?$", val)
    if m_sebi:
        day, mon, yr, tz_str = m_sebi.groups()
        mon_abbr = mon[:3].title()
        for fmt in ("%d %b %Y",):
            try:
                naive = datetime.datetime.strptime(f"{day} {mon_abbr} {yr}", fmt).replace(tzinfo=IST_TZ)
                if tz_str:
                    sign = 1 if tz_str[0] == "+" else -1
                    off = datetime.timedelta(hours=int(tz_str[1:3]), minutes=int(tz_str[3:5]))
                    tz = datetime.timezone(sign * off)
                    naive = naive.replace(tzinfo=tz)
                return naive.astimezone(datetime.timezone.utc)
            except ValueError:
                pass

    try:
        iso_val = val.replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(iso_val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST_TZ)
        return dt.astimezone(datetime.timezone.utc)
    except ValueError:
        return None


def classify_tags(text: str) -> list[str]:
    tags: list[str] = []
    for tag, pattern in INDIAN_CATALYST_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            tags.append(tag)
    return tags


def _company_lookup_from_state(state_dir: Path) -> dict[str, str]:
    names = dict(BUILTIN_COMPANY_NAMES)
    uni_path = state_dir / "nse_universe.json"
    uni = load_json_file(uni_path, required=False)
    if isinstance(uni, dict):
        for row in uni.get("symbols") or []:
            sym = str(row.get("symbol") or "").upper()
            name = str(row.get("name") or "").strip()
            if sym and name:
                names[sym] = re.sub(r"\s+(?:Ltd\.?|Limited)\.?$", "", name, flags=re.IGNORECASE).strip()
    return names


def discover_default_tickers(state_dir: Path) -> list[str]:
    """Gather watched symbols from watchlist.json, risk_verdict.json, and OPEN SQLite paper trades."""
    found: list[str] = []
    seen: set[str] = set()

    def _add(raw_sym: Any) -> None:
        s = str(raw_sym or "").strip().upper()
        if not s:
            return
        norm = normalize_symbol(s)["base"]
        if norm not in seen:
            seen.add(norm)
            found.append(norm)

    wl = load_json_file(state_dir / "watchlist.json", required=False)
    if isinstance(wl, dict):
        for hit in wl.get("hits") or []:
            if isinstance(hit, dict):
                _add(hit.get("symbol") or hit.get("base"))

    verdict = load_json_file(state_dir / "risk_verdict.json", required=False)
    if isinstance(verdict, dict):
        _add(verdict.get("symbol"))

    db_path = state_dir / "paper_trades.db"
    if db_path.exists():
        with contextlib.suppress(sqlite3.Error):
            conn = sqlite3.connect(db_path)
            try:
                rows = conn.execute(
                    "SELECT DISTINCT symbol FROM paper_orders WHERE status = 'OPEN' ORDER BY id DESC"
                ).fetchall()
                for row in rows:
                    _add(row[0])
            finally:
                conn.close()
    return found


def _make_item_uid(source: str, title: str, link: str) -> str:
    basis = f"{source}|{title.strip().lower()}|{link.split('?')[0].strip()}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]


def parse_rss_items(
    raw_bytes: bytes,
    source_label: str,
    tickers_filter: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Parse standard RSS 2.0 items into normalized Indian news records."""
    root = _safe_parse_xml(raw_bytes, source_label)
    out: list[dict[str, Any]] = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        if not title:
            continue
        link = (item.findtext("link") or "").strip()
        desc = re.sub(r"<[^>]+>", " ", item.findtext("description") or "")
        desc = re.sub(r"\s+", " ", desc).strip()
        pub_raw = (item.findtext("pubDate") or "").strip()
        pub_utc = parse_indian_pubdate(pub_raw)
        pub_ist_str = ist_iso(to_ist(pub_utc)) if pub_utc else ""
        src_el = item.find("source")
        publisher = (src_el.text or "").strip() if src_el is not None else source_label

        # Clean trailing " - Publisher" added by Google News RSS
        clean_title = title
        if publisher and clean_title.endswith(f" - {publisher}"):
            clean_title = clean_title[: -(len(publisher) + 3)].strip()

        haystack = f"{clean_title} {desc}"
        tags = classify_tags(haystack)
        matched_tickers: list[str] = []
        if tickers_filter:
            for base, cname in tickers_filter.items():
                pat_parts = [re.escape(base)]
                if cname and len(cname) >= 4:
                    pat_parts.append(re.escape(cname))
                if re.search(rf"\b(?:{'|'.join(pat_parts)})\b", haystack, re.IGNORECASE):
                    matched_tickers.append(base)

        out.append(
            {
                "uid": _make_item_uid(source_label, clean_title, link),
                "title": clean_title,
                "publisher": publisher or source_label,
                "feed": source_label,
                "link": link,
                "published_utc": pub_utc.isoformat() if pub_utc else "",
                "published_ist": pub_ist_str,
                "timestamp": int(pub_utc.timestamp()) if pub_utc else 0,
                "tags": tags,
                "matched_tickers": matched_tickers,
                "important": any(t in ("earnings", "legal_risk", "regulatory", "circuit_halt", "deal_qip") for t in tags),
            }
        )
    return out


def _read_offline_bytes(offline_dir: Path, candidates: list[str]) -> bytes | None:
    for name in candidates:
        p = offline_dir / name
        if p.exists():
            return p.read_bytes()
    return None


def _build_google_news_query(base: str, company_name: str | None) -> str:
    if company_name and company_name.upper() != base.upper():
        return f'("{base}" OR "{company_name}") (NSE OR BSE OR stock OR shares OR results OR order OR dividend)'
    return f'"{base}" (NSE OR BSE OR stock OR shares OR results OR order)'


def fetch_google_news_for_ticker(
    base: str,
    company_name: str | None,
    rules: dict[str, Any],
    hours: int = 72,
    offline_dir: Path | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    if offline_dir:
        raw = _read_offline_bytes(
            offline_dir,
            [f"gnews-{base}.xml", f"gnews-{base.lower()}.xml", f"yahoo-{base}.xml"],
        )
        if raw is None:
            return [], None
        items = parse_rss_items(raw, "Google News IN")
    else:
        tmpl = str((rules.get("feeds") or {}).get("google_news_india_rss") or "")
        days = max(1, (hours + 23) // 24)
        q = f"{_build_google_news_query(base, company_name)} when:{days}d"
        url = tmpl.format(query=urllib.parse.quote(q))
        try:
            raw = fetch_url_bytes(url, timeout=12, accept="application/rss+xml, application/xml, text/xml")
            items = parse_rss_items(raw, "Google News IN")
        except (OSError, urllib.error.URLError, NSETraderError) as exc:
            return [], str(exc)

    for it in items:
        it["matched_tickers"] = [base]
    return items, None


def fetch_market_and_reg_feeds(
    rules: dict[str, Any],
    ticker_names: dict[str, str],
    include_reg: bool = True,
    offline_dir: Path | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    feeds_cfg = rules.get("feeds") or {}
    targets: list[tuple[str, str, list[str]]] = [
        ("ET Stocks", str(feeds_cfg.get("et_stocks_rss") or ""), ["et-stocks.xml", "et_stocks.xml"]),
        ("LiveMint Markets", str(feeds_cfg.get("livemint_markets_rss") or ""), ["livemint-markets.xml", "livemint.xml"]),
    ]
    if include_reg:
        targets.extend(
            [
                ("SEBI", str(feeds_cfg.get("sebi_rss") or ""), ["sebi.xml", "sebirss.xml"]),
                ("RBI", str(feeds_cfg.get("rbi_press_rss") or ""), ["rbi.xml", "rbi-press.xml"]),
                ("BSE Notices", str(feeds_cfg.get("bse_notices_rss") or ""), ["bse.xml", "bse-notices.xml"]),
            ]
        )

    def _one(label: str, url: str, offline_names: list[str]) -> tuple[list[dict[str, Any]], str | None]:
        if offline_dir:
            raw = _read_offline_bytes(offline_dir, offline_names)
            if raw is None:
                return [], None
            return parse_rss_items(raw, label, tickers_filter=ticker_names), None
        if not url:
            return [], None
        try:
            raw = fetch_url_bytes(url, timeout=12, accept="application/rss+xml, application/xml, text/xml")
            return parse_rss_items(raw, label, tickers_filter=ticker_names), None
        except (OSError, urllib.error.URLError, NSETraderError) as exc:
            return [], f"{label}: {exc}"

    all_items: list[dict[str, Any]] = []
    warnings: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        futs = [ex.submit(_one, lbl, url, off) for lbl, url, off in targets]
        for fut in concurrent.futures.as_completed(futs):
            its, err = fut.result()
            all_items.extend(its)
            if err:
                warnings.append(err)
    return all_items, warnings


def fetch_move_context(
    sym_info: dict[str, Any],
    move_alert_pct: float = 3.0,
    offline_dir: Path | None = None,
) -> dict[str, Any]:
    yahoo_sym = sym_info["yahoo"]
    try:
        if offline_dir:
            p = offline_dir / f"chart-{yahoo_sym}.json"
            if not p.exists():
                p = offline_dir / f"{yahoo_sym}.json"
            if not p.exists():
                return {"symbol": sym_info["base"], "yahoo": yahoo_sym, "available": False}
            raw = read_offline_chart(p, yahoo_sym)
        else:
            raw = fetch_yahoo_chart(yahoo_sym, range_="5d", interval="1d")
        res = extract_chart_result(raw, yahoo_sym)
        meta = res.get("meta") or {}
        quote = ((res.get("indicators") or {}).get("quote") or [{}])[0] or {}
        closes = [float(x) for x in (quote.get("close") or []) if x is not None]
        ltp = meta.get("regularMarketPrice")
        ltp_val = float(ltp) if ltp is not None else (closes[-1] if closes else None)
        pdc = extract_previous_close(res)
        if ltp_val is None or not pdc:
            return {"symbol": sym_info["base"], "yahoo": yahoo_sym, "available": False}
        pct = round(((ltp_val - float(pdc)) / float(pdc)) * 100.0, 2)
        return {
            "symbol": sym_info["base"],
            "yahoo": yahoo_sym,
            "available": True,
            "ltp": round(ltp_val, 2),
            "prev_close": round(float(pdc), 2),
            "pct_change": pct,
            "is_moving": abs(pct) >= move_alert_pct,
        }
    except (OSError, ValueError, KeyError, NSETraderError):
        return {"symbol": sym_info["base"], "yahoo": yahoo_sym, "available": False}


def _load_seen_state(state_dir: Path) -> dict[str, int]:
    data = load_json_file(state_dir / "news_state.json", required=False)
    if isinstance(data, dict) and isinstance(data.get("seen"), dict):
        return {str(k): int(v) for k, v in data["seen"].items()}
    return {}


def _save_seen_state(state_dir: Path, seen: dict[str, int], now_ts: int, keep_days: int = 30) -> None:
    cutoff = now_ts - keep_days * 86400
    pruned = {k: v for k, v in seen.items() if v >= cutoff}
    write_json_atomic(state_dir / "news_state.json", {"seen": pruned, "updated_ts": now_ts})


def fetch_indian_news(
    tickers: list[str] | None = None,
    hours: int = 72,
    include_reg: bool = True,
    include_moves: bool = True,
    market_mode: bool = False,
    show_all: bool = False,
    max_per_ticker: int = 8,
    now_str: str | None = None,
    state_dir: Path | str | None = None,
    offline_dir: Path | str | None = None,
    write_state: bool = True,
) -> dict[str, Any]:
    rules = load_trading_rules()
    news_cfg = rules.get("news") or {}
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    off = Path(offline_dir) if offline_dir else None

    dt_ist = parse_now_ist(now_str)
    utc_dt = (dt_ist - datetime.timedelta(hours=5, minutes=30)).replace(tzinfo=datetime.timezone.utc)
    now_ts = int(utc_dt.timestamp())
    cutoff_ts = now_ts - hours * 3600

    company_map = _company_lookup_from_state(sdir)
    if tickers:
        sym_list = [normalize_symbol(t) for t in tickers]
    elif not market_mode:
        discovered = discover_default_tickers(sdir)
        sym_list = [normalize_symbol(t) for t in discovered]
    else:
        sym_list = []

    if not sym_list and not market_mode:
        raise NSETraderError(
            "No tickers provided and none found in state/watchlist.json, risk_verdict.json, or open paper trades. "
            "Pass --tickers SYMBOL ... or --market."
        )

    ticker_names = {s["base"]: company_map.get(s["base"], s["base"]) for s in sym_list}
    ban_offline = off / "fo_secban.csv" if off else None
    fno_ban_info = fetch_nse_fno_ban(rules=rules, offline_file=ban_offline)
    ban_set = set(fno_ban_info.get("symbols") or [])

    warnings: list[str] = []
    per_ticker_items: dict[str, list[dict[str, Any]]] = {s["base"]: [] for s in sym_list}
    move_map: dict[str, dict[str, Any]] = {}

    # Parallel per-ticker Google News IN + Yahoo move checks
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        news_futs = {
            ex.submit(fetch_google_news_for_ticker, s["base"], ticker_names[s["base"]], rules, hours, off): s["base"]
            for s in sym_list
        }
        move_futs = (
            {ex.submit(fetch_move_context, s, float(news_cfg.get("move_alert_pct", 3.0)), off): s["base"] for s in sym_list}
            if include_moves
            else {}
        )
        reg_fut = ex.submit(fetch_market_and_reg_feeds, rules, ticker_names, include_reg, off)

        for fut, base in news_futs.items():
            its, err = fut.result()
            if err:
                warnings.append(f"{base} Google News: {err}")
            per_ticker_items[base].extend(its)

        for fut, base in move_futs.items():
            move_map[base] = fut.result()

        broad_items, reg_warnings = reg_fut.result()
        warnings.extend(reg_warnings)

    # Deduplicate seen state
    seen = _load_seen_state(sdir) if write_state and not off else ({} if show_all else _load_seen_state(sdir))
    keep_days = int(news_cfg.get("keep_days", 30))

    # Attach matching broad ET/LiveMint/SEBI/RBI/BSE items into per_ticker_items, and keep regulatory/market feed items
    reg_highlights: list[dict[str, Any]] = []
    market_headlines: list[dict[str, Any]] = []
    seen_uids_in_run: set[str] = set()

    for it in sorted(broad_items, key=lambda x: x["timestamp"], reverse=True):
        if it["timestamp"] and it["timestamp"] < cutoff_ts:
            continue
        is_reg = it["feed"] in ("SEBI", "RBI", "BSE Notices")
        for m in it["matched_tickers"]:
            if m in per_ticker_items:
                per_ticker_items[m].append(it)
        if is_reg:
            if it["matched_tickers"] or any(t in ("regulatory", "circuit_halt") for t in it["tags"]):
                reg_highlights.append(it)
        elif market_mode:
            market_headlines.append(it)

    tickers_report: list[dict[str, Any]] = []
    newly_seen: dict[str, int] = dict(seen)

    for s in sym_list:
        base = s["base"]
        raw_list = sorted(per_ticker_items[base], key=lambda x: x["timestamp"], reverse=True)
        deduped: list[dict[str, Any]] = []
        local_titles: set[str] = set()
        for it in raw_list:
            if it["timestamp"] and it["timestamp"] < cutoff_ts:
                continue
            key_t = re.sub(r"\W+", "", it["title"].lower())[:64]
            if it["uid"] in seen_uids_in_run or key_t in local_titles:
                continue
            if not show_all and it["uid"] in seen:
                continue
            local_titles.add(key_t)
            seen_uids_in_run.add(it["uid"])
            deduped.append(it)
            newly_seen[it["uid"]] = it["timestamp"] or now_ts
            if len(deduped) >= max_per_ticker:
                break

        mv = move_map.get(base, {"available": False})
        in_ban = base in ban_set
        alerts_flags: list[str] = []
        if in_ban:
            alerts_flags.append("FNO_BAN (>95% MWPL)")
        if mv.get("is_moving") and not deduped:
            alerts_flags.append(f"MOVING ({mv.get('pct_change'):+.2f}%) WITH NO FRESH HEADLINE")
        elif mv.get("is_moving"):
            alerts_flags.append(f"MOVING ({mv.get('pct_change'):+.2f}%)")
        if any("earnings" in (it.get("tags") or []) for it in deduped):
            alerts_flags.append("EARNINGS_CATALYST_IN_NEWS")
        if any("regulatory" in (it.get("tags") or []) or "legal_risk" in (it.get("tags") or []) for it in deduped):
            alerts_flags.append("REGULATORY_OR_LEGAL_FLAG")

        tickers_report.append(
            {
                "symbol": base,
                "yahoo": s["yahoo"],
                "company_name": ticker_names.get(base, base),
                "in_fno_ban": in_ban,
                "move": mv,
                "flags": alerts_flags,
                "news_count": len(deduped),
                "items": deduped,
            }
        )

    if write_state:
        for it in reg_highlights[:15] + market_headlines[:20]:
            newly_seen[it["uid"]] = it["timestamp"] or now_ts
        _save_seen_state(sdir, newly_seen, now_ts, keep_days=keep_days)

    return {
        "ist_timestamp": ist_iso(dt_ist),
        "hours_lookback": hours,
        "show_all": show_all,
        "fno_ban_list": fno_ban_info,
        "tickers": tickers_report,
        "regulatory_alerts": reg_highlights[:12],
        "market_headlines": market_headlines[:20] if market_mode else [],
        "warnings": warnings,
        "note": "Headlines are leads, not facts. Open primary exchange filings before trading on catalyst news.",
    }


def format_news_report(data: dict[str, Any], color: bool | None = None) -> str:
    ui = UI(color=color)
    ts_short = str(data.get("ist_timestamp", "")).replace("T", " ")[:19] + " IST"
    tickers = data.get("tickers") or []
    ban = data.get("fno_ban_list") or {}

    blocks: list[str] = [
        ui.banner(
            title="NSE/BSE INDIAN NEWS & REGULATORY BRIEFING",
            subtitle=f"{ts_short}  |  Lookback: {data.get('hours_lookback', 72)}h  |  Tickers Monitored: {len(tickers)}",
            badge="NEWS BRIEF",
            badge_tone="info",
            meta_lines=[ui.dim("Sources: Google News IN, Economic Times, LiveMint, SEBI, RBI, BSE Notices & NSE F&O Ban.")],
        )
    ]

    if ban.get("symbols"):
        blocks.append("")
        blocks.append(
            ui.callout(
                f"NSE F&O Ban (>95% MWPL) {ban.get('header', '')}",
                [", ".join(ban["symbols"])],
                tone_name="warn",
            )
        )

    for t in tickers:
        mv = t.get("move") or {}
        if mv.get("available"):
            mv_str = f"LTP {format_inr(mv['ltp'])} ({ui.trend_pct(mv.get('pct_change'))} vs PDC)"
        else:
            mv_str = ui.dim("Price snapshot skipped/unavailable")
        flags = t.get("flags") or []
        hint_lines = [mv_str]
        if flags:
            hint_lines.append("Flags: " + ui.red(", ".join(flags), bold=True))

        blocks.append("")
        blocks.append(ui.section(f"[{t['symbol']}] {t['company_name']}", "\n".join(hint_lines)))
        items = t.get("items") or []
        if not items:
            blocks.append("   " + ui.dim("(No unseen headlines in lookback window - pass --all to show previously viewed items)"))
            continue
        t_rows: list[list[str]] = []
        for it in items:
            when = it["published_ist"][:16].replace("T", " ") if it.get("published_ist") else "Recent"
            tags_s = ", ".join(it.get("tags") or []) or "-"
            t_rows.append([when, str(it.get("publisher", "News")), tags_s, str(it.get("title", ""))])
        blocks.append(
            ui.table(
                headers=["Time (IST)", "Publisher", "Tags", "Headline"],
                rows=t_rows,
                alignments=["left", "left", "left", "left"],
            )
        )

    if data.get("regulatory_alerts"):
        reg_rows = [
            [
                ui.yellow(str(it.get("feed", "REG")), bold=True),
                it["published_ist"][:16].replace("T", " ") if it.get("published_ist") else "Recent",
                str(it.get("title", "")),
            ]
            for it in data["regulatory_alerts"][:6]
        ]
        blocks.append("")
        blocks.append(ui.section("Regulatory Feed Highlights (SEBI / RBI / BSE Notices)"))
        blocks.append(ui.table(["Feed", "Time (IST)", "Notice / Circular"], reg_rows, alignments=["left", "left", "left"]))

    if data.get("market_headlines"):
        mkt_rows = [
            [
                str(it.get("feed", "MKT")),
                it["published_ist"][:16].replace("T", " ") if it.get("published_ist") else "Recent",
                ", ".join(it.get("tags") or []) or "-",
                str(it.get("title", "")),
            ]
            for it in data["market_headlines"][:10]
        ]
        blocks.append("")
        blocks.append(ui.section("Top Indian Market Headlines (ET Stocks / LiveMint)"))
        blocks.append(ui.table(["Feed", "Time (IST)", "Tags", "Headline"], mkt_rows, alignments=["left", "left", "left", "left"]))

    if data.get("warnings"):
        blocks.append("")
        blocks.append(ui.callout("Feed Warnings", [str(w) for w in data["warnings"]], tone_name="warn"))

    blocks.append("")
    blocks.append("  " + ui.dim(f"Note: {data.get('note', '')}"))
    blocks.append("")
    blocks.append(ui.disclaimer())
    return "\n".join(blocks)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="NSE/BSE News, Earnings & Regulatory Feed Monitor")
    p.add_argument("--tickers", nargs="+", default=None, help="Tickers to monitor (e.g., SUZLON BANKBARODA RELIANCE)")
    p.add_argument("--hours", type=int, default=72, help="Lookback window in hours (default: 72)")
    p.add_argument("--max-items", type=int, default=8, help="Max items per ticker (default: 8)")
    p.add_argument("--all", action="store_true", help="Show all items even if already seen in previous run")
    p.add_argument("--market", action="store_true", help="Include broad Indian market headlines (ET Stocks / LiveMint)")
    p.add_argument("--no-reg", action="store_true", help="Skip SEBI / RBI / BSE regulatory RSS feeds")
    p.add_argument("--no-moves", action="store_true", help="Skip Yahoo daily price move lookup")
    p.add_argument("--no-write", action="store_true", help="Do not update seen state in news_state.json")
    p.add_argument("--now", default=None, help="Pin IST timestamp, e.g. '2026-11-11 10:15'")
    p.add_argument("--state-dir", default=None, help="Override state directory")
    p.add_argument("--offline", default=None, help="Offline fixtures directory")
    p.add_argument("--json", action="store_true", help="Output structured JSON")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        report = fetch_indian_news(
            tickers=args.tickers,
            hours=args.hours,
            include_reg=not args.no_reg,
            include_moves=not args.no_moves,
            market_mode=args.market,
            show_all=args.all,
            max_per_ticker=args.max_items,
            now_str=args.now,
            state_dir=args.state_dir,
            offline_dir=args.offline,
            write_state=not args.no_write,
        )
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if args.json else f"ERROR: {exc}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=True))
    else:
        safe_print(format_news_report(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
