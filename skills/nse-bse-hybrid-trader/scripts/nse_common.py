#!/usr/bin/env python3
"""Shared IST time, symbol normalization, tick rounding, config, and Yahoo data helpers
for the nse-bse-hybrid-trader skill. Standard library only.
"""

from __future__ import annotations

import contextlib
import datetime
import gzip
import http.client
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any

UA = "Mozilla/5.0 (compatible; nse-bse-hybrid-trader/1.0)"
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
HOSTS = ("query2", "query1")
PAUSE_SEC = 0.5
BACKOFF_SEC = 5.0
EPOCH = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc)
IST_OFFSET = datetime.timedelta(hours=5, minutes=30)
IST_TZ = datetime.timezone(IST_OFFSET, name="IST")

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
CONFIG_DIR = SKILL_DIR / "config"
DEFAULT_STATE_DIR = SKILL_DIR / "state"

INDEX_ALIASES = {
    "NIFTY": ("^NSEI", "NSE", "NIFTY"),
    "NIFTY50": ("^NSEI", "NSE", "NIFTY"),
    "NIFTY 50": ("^NSEI", "NSE", "NIFTY"),
    "^NSEI": ("^NSEI", "NSE", "NIFTY"),
    "BANKNIFTY": ("^NSEBANK", "NSE", "BANKNIFTY"),
    "NIFTYBANK": ("^NSEBANK", "NSE", "BANKNIFTY"),
    "NIFTY BANK": ("^NSEBANK", "NSE", "BANKNIFTY"),
    "^NSEBANK": ("^NSEBANK", "NSE", "BANKNIFTY"),
    "FINNIFTY": ("NIFTY_FIN_SERVICE.NS", "NSE", "FINNIFTY"),
    "NIFTYFINSERVICE": ("NIFTY_FIN_SERVICE.NS", "NSE", "FINNIFTY"),
    "NIFTY FIN SERVICE": ("NIFTY_FIN_SERVICE.NS", "NSE", "FINNIFTY"),
    "SENSEX": ("^BSESN", "BSE", "SENSEX"),
    "BSESENSEX": ("^BSESN", "BSE", "SENSEX"),
    "^BSESN": ("^BSESN", "BSE", "SENSEX"),
    "INDIAVIX": ("^INDIAVIX", "NSE", "INDIAVIX"),
    "^INDIAVIX": ("^INDIAVIX", "NSE", "INDIAVIX"),
}

SUPPORTED_BROKERS = (
    "angel_one",
    "zerodha",
    "upstox",
    "dhan",
    "fyers",
    "groww",
    "kotak_neo",
    "icici_breeze",
    "shoonya",
)

BROKER_ALIASES = {
    "angel": "angel_one",
    "angelone": "angel_one",
    "angel_one": "angel_one",
    "angel-one": "angel_one",
    "smartapi": "angel_one",
    "zerodha": "zerodha",
    "kite": "zerodha",
    "kiteconnect": "zerodha",
    "upstox": "upstox",
    "dhan": "dhan",
    "dhanhq": "dhan",
    "fyers": "fyers",
    "groww": "groww",
    "kotak": "kotak_neo",
    "kotakneo": "kotak_neo",
    "kotak_neo": "kotak_neo",
    "kotak-neo": "kotak_neo",
    "icici": "icici_breeze",
    "breeze": "icici_breeze",
    "icici_breeze": "icici_breeze",
    "icici-breeze": "icici_breeze",
    "shoonya": "shoonya",
    "finvasia": "shoonya",
}


class NSETraderError(Exception):
    """Domain error surfaced cleanly to CLI or caller."""


def load_json_file(path: Path | str, required: bool = True) -> Any:
    p = Path(path)
    if not p.exists():
        if required:
            raise NSETraderError(f"Missing required file: {p}")
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise NSETraderError(f"Invalid JSON in {p}: {exc}") from exc


def write_json_atomic(path: Path | str, payload: Any) -> Path:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(p)
    return p


def load_trading_rules(config_path: Path | str | None = None) -> dict[str, Any]:
    path = Path(config_path) if config_path else CONFIG_DIR / "trading_rules.json"
    return load_json_file(path, required=True)


def load_nse_holidays(holidays_path: Path | str | None = None) -> dict[str, Any]:
    path = Path(holidays_path) if holidays_path else CONFIG_DIR / "nse_holidays.json"
    data = load_json_file(path, required=False)
    return data or {"holidays": {}, "special_sessions": {}}


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)


def utc_of(ts: float) -> datetime.datetime:
    return (EPOCH + datetime.timedelta(seconds=int(ts))).replace(tzinfo=None)


def to_ist(utc_dt: datetime.datetime) -> datetime.datetime:
    if utc_dt.tzinfo is not None:
        return utc_dt.astimezone(IST_TZ).replace(tzinfo=None)
    return utc_dt + IST_OFFSET


def ist_to_utc(ist_dt: datetime.datetime) -> datetime.datetime:
    if ist_dt.tzinfo is not None:
        return ist_dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return ist_dt - IST_OFFSET


def parse_now_ist(text: str | None = None) -> datetime.datetime:
    """Parse --now string into naive IST datetime. Bare times assume today's IST date."""
    if not text:
        return to_ist(utc_now())
    raw = text.strip()
    if raw.upper().endswith(" IST"):
        raw = raw[:-4].strip()
    if re.match(r"^\d{1,2}:\d{2}(:\d{2})?$", raw):
        today = to_ist(utc_now()).date().isoformat()
        hh_mm = raw if len(raw.split(":")[0]) == 2 else f"0{raw}"
        raw = f"{today} {hh_mm}"
    if re.match(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$", raw):
        raw = f"{raw}:00"
    raw = raw.replace("Z", "+00:00")
    try:
        dt = datetime.datetime.fromisoformat(raw)
    except ValueError as exc:
        raise NSETraderError(
            f'--now expects an IST timestamp like "2026-11-09 10:15" or ISO timestamp, got {text!r}'
        ) from exc
    if dt.tzinfo is None:
        return dt.replace(microsecond=0)
    return dt.astimezone(IST_TZ).replace(microsecond=0, tzinfo=None)


def ist_iso(ist_dt: datetime.datetime) -> str:
    return ist_dt.replace(microsecond=0).isoformat() + "+05:30"


def parse_clock_minutes(text: str, label: str = "time") -> int:
    m = re.match(r"^\s*(\d{1,2}):(\d{2})\s*(?:([AaPp])\.?\s*[Mm]\.?)?\s*$", text or "")
    if not m:
        raise NSETraderError(f"{label} expects HH:MM (e.g. 10:15 or 15:15), got {text!r}")
    h, mi, ap = int(m.group(1)), int(m.group(2)), (m.group(3) or "").lower()
    if mi > 59 or h > 23 or (ap and not 1 <= h <= 12):
        raise NSETraderError(f"Invalid clock {label}: {text!r}")
    if ap == "p" and h != 12:
        h += 12
    elif ap == "a" and h == 12:
        h = 0
    return h * 60 + mi


def format_clock_24(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def round_tick(price: float | Decimal, tick: float | Decimal = 0.05, mode: str = "nearest") -> float:
    """Round an INR price cleanly to exchange tick size (default Rs. 0.05)."""
    p = Decimal(str(price))
    t = Decimal(str(tick))
    if t <= 0:
        raise NSETraderError(f"Tick size must be positive, got {tick}")
    ratio = p / t
    if mode == "down":
        q = ratio.to_integral_value(rounding=ROUND_FLOOR)
    elif mode == "up":
        q = ratio.to_integral_value(rounding=ROUND_CEILING)
    elif mode == "nearest":
        q = ratio.to_integral_value(rounding=ROUND_HALF_UP)
    else:
        raise NSETraderError(f"Unknown tick rounding mode {mode!r}")
    return float((q * t).quantize(Decimal("0.01")))


def round_stop_away(price: float, side: str, tick: float = 0.05) -> float:
    """Round stop away from entry to stay conservative (down for buy, up for sell)."""
    return round_tick(price, tick=tick, mode="down" if side == "buy" else "up")


def nse_session_info(
    dt_ist: datetime.datetime,
    rules: dict[str, Any] | None = None,
    holidays_cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rules = rules or load_trading_rules()
    holidays_cfg = holidays_cfg or load_nse_holidays()
    sess = rules["session_ist"]

    date_str = dt_ist.date().isoformat()
    holidays = holidays_cfg.get("holidays") or {}
    specials = holidays_cfg.get("special_sessions") or {}

    is_weekend = dt_ist.weekday() >= 5
    holiday_name = holidays.get(date_str)
    special_name = specials.get(date_str)
    is_holiday = bool(holiday_name)

    mins = dt_ist.hour * 60 + dt_ist.minute
    pre_open_start = parse_clock_minutes(sess["pre_open_start"])
    mkt_open = parse_clock_minutes(sess["market_open"])
    or_end = parse_clock_minutes(sess["opening_range_end"])
    no_before = parse_clock_minutes(sess["no_new_intraday_before"])
    no_after = parse_clock_minutes(sess["no_new_intraday_after"])
    sq_off = parse_clock_minutes(sess["force_squareoff_ist"])
    mkt_close = parse_clock_minutes(sess["market_close"])

    if (is_weekend and not special_name) or is_holiday:
        phase = "CLOSED_HOLIDAY" if is_holiday else "CLOSED_WEEKEND"
        market_open = False
        intraday_allowed = False
    elif special_name and is_weekend:
        phase = "SPECIAL_MUHURAT_SESSION"
        market_open = False
        intraday_allowed = False
    elif mins < pre_open_start:
        phase = "PRE_MARKET_CLOSED"
        market_open = False
        intraday_allowed = False
    elif pre_open_start <= mins < mkt_open:
        phase = "PRE_OPEN"
        market_open = False
        intraday_allowed = False
    elif mkt_open <= mins < or_end:
        phase = "OPENING_RANGE"
        market_open = True
        intraday_allowed = no_before <= mins < no_after
    elif or_end <= mins < no_after:
        phase = "PRIMARY_EXECUTION"
        market_open = True
        intraday_allowed = True
    elif no_after <= mins < sq_off:
        phase = "HAZARD_WINDOW_NO_NEW_ENTRY"
        market_open = True
        intraday_allowed = False
    elif sq_off <= mins < mkt_close:
        phase = "AUTO_SQUAREOFF_ZONE"
        market_open = True
        intraday_allowed = False
    else:
        phase = "POST_MARKET"
        market_open = False
        intraday_allowed = False

    return {
        "ist_timestamp": ist_iso(dt_ist),
        "date": date_str,
        "time_ist": dt_ist.strftime("%H:%M"),
        "weekday": dt_ist.strftime("%A"),
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
        "holiday_name": holiday_name,
        "special_session": special_name,
        "phase": phase,
        "is_market_open": market_open,
        "intraday_entry_allowed": intraday_allowed,
    }


def trading_day_status(
    d: datetime.date,
    holidays_cfg: dict[str, Any] | None = None,
) -> tuple[bool, str]:
    """Return (is_trading_day, reason) accounting for NSE weekends, holidays & Muhurat."""
    holidays_cfg = holidays_cfg or load_nse_holidays()
    date_str = d.isoformat()
    holiday_name = (holidays_cfg.get("holidays") or {}).get(date_str)
    special_name = (holidays_cfg.get("special_sessions") or {}).get(date_str)
    if special_name:
        return True, f"Special session ({special_name})"
    if holiday_name:
        return False, f"NSE/BSE holiday: {holiday_name}"
    if d.weekday() >= 5:
        return False, "Weekend"
    return True, "Regular session"


def next_nse_open(
    dt_ist: datetime.datetime,
    rules: dict[str, Any] | None = None,
    holidays_cfg: dict[str, Any] | None = None,
) -> str:
    """Find next NSE/BSE market open timestamp string in IST."""
    rules = rules or load_trading_rules()
    holidays_cfg = holidays_cfg or load_nse_holidays()
    open_str = str(rules["session_ist"].get("market_open", "09:15"))
    open_mins = parse_clock_minutes(open_str)
    cur_mins = dt_ist.hour * 60 + dt_ist.minute
    start_day = dt_ist.date() if cur_mins < open_mins else dt_ist.date() + datetime.timedelta(days=1)
    for offset in range(20):
        cand = start_day + datetime.timedelta(days=offset)
        ok, _ = trading_day_status(cand, holidays_cfg=holidays_cfg)
        if ok:
            specials = holidays_cfg.get("special_sessions") or {}
            if cand.isoformat() in specials:
                return f"{cand.isoformat()} ({specials[cand.isoformat()]})"
            return f"{cand.isoformat()} {open_str} IST"
    return f"{(dt_ist.date() + datetime.timedelta(days=1)).isoformat()} {open_str} IST"


def normalize_symbol(raw_symbol: str, default_exchange: str = "NSE") -> dict[str, Any]:
    raw = (raw_symbol or "").strip().upper()
    if not raw:
        raise NSETraderError("Ticker symbol cannot be empty")
    compact = re.sub(r"\s+", " ", raw)
    no_space = compact.replace(" ", "")

    for key in (compact, no_space):
        if key in INDEX_ALIASES:
            yahoo, exch, base = INDEX_ALIASES[key]
            return {
                "raw": raw,
                "base": base,
                "yahoo": yahoo,
                "exchange": exch,
                "smartapi_eq": base,
                "is_index": True,
            }

    if raw.endswith(".NS"):
        base = raw[:-3]
        return {
            "raw": raw,
            "base": base,
            "yahoo": f"{base}.NS",
            "exchange": "NSE",
            "smartapi_eq": f"{base}-EQ",
            "is_index": False,
        }
    if raw.endswith(".BO"):
        base = raw[:-3]
        return {
            "raw": raw,
            "base": base,
            "yahoo": f"{base}.BO",
            "exchange": "BSE",
            "smartapi_eq": base,
            "is_index": False,
        }

    exch = default_exchange.upper()
    if exch not in ("NSE", "BSE"):
        raise NSETraderError(f"Unsupported exchange {default_exchange!r}; expected NSE or BSE")
    suffix = ".NS" if exch == "NSE" else ".BO"
    base = raw.removesuffix("-EQ")
    return {
        "raw": raw,
        "base": base,
        "yahoo": f"{base}{suffix}",
        "exchange": exch,
        "smartapi_eq": f"{base}-EQ" if exch == "NSE" else base,
        "is_index": False,
    }


def normalize_broker(broker: str | None = None, default_broker: str = "angel_one") -> str:
    raw = (broker or default_broker).strip().lower().replace(" ", "_")
    canonical = BROKER_ALIASES.get(raw)
    if canonical is not None and canonical in SUPPORTED_BROKERS:
        return canonical
    raise NSETraderError(
        f"Unsupported broker {broker!r}; expected one of {', '.join(SUPPORTED_BROKERS)}"
    )


def yahoo_chart_url(yahoo_sym: str, range_: str = "60d", interval: str = "5m", host: str = "query2") -> str:
    encoded = urllib.parse.quote(yahoo_sym.upper())
    return f"https://{host}.finance.yahoo.com/v8/finance/chart/{encoded}?range={range_}&interval={interval}"


def yahoo_spark_url(
    symbols: list[str],
    range_: str = "3mo",
    interval: str = "1d",
    host: str = "query2",
) -> str:
    joined = urllib.parse.quote(",".join(s.strip().upper() for s in symbols if s.strip()))
    return f"https://{host}.finance.yahoo.com/v8/finance/spark?symbols={joined}&range={range_}&interval={interval}"


def validate_http_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() not in {"https", "http"} or not parsed.netloc:
        raise NSETraderError(f"Unsupported URL scheme or malformed URL: {url!r}")
    return url


def fetch_url_bytes(
    url: str,
    timeout: int = 20,
    accept: str = "*/*",
    headers: dict[str, str] | None = None,
    user_agent: str = BROWSER_UA,
) -> bytes:
    validated_url = validate_http_url(url)
    req_headers = {"User-Agent": user_agent, "Accept": accept, "Accept-Encoding": "gzip"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(validated_url, headers=req_headers)  # noqa: S310
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        data = resp.read()
        if str(resp.headers.get("Content-Encoding") or "").lower() == "gzip":
            data = gzip.decompress(data)
        return data


def fetch_url_text(
    url: str,
    timeout: int = 20,
    accept: str = "*/*",
    headers: dict[str, str] | None = None,
    user_agent: str = BROWSER_UA,
    encoding: str = "utf-8",
) -> str:
    raw = fetch_url_bytes(url, timeout=timeout, accept=accept, headers=headers, user_agent=user_agent)
    return raw.decode(encoding, "replace").lstrip("\ufeff")


def _http_get_text(url: str, timeout: int = 20) -> str:
    validated_url = validate_http_url(url)
    req = urllib.request.Request(  # noqa: S310
        validated_url, headers={"User-Agent": UA, "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        return resp.read().decode("utf-8", "replace")


def fetch_yahoo_spark(
    symbols: list[str],
    range_: str = "3mo",
    interval: str = "1d",
) -> dict[str, Any]:
    """Fetch Yahoo Finance v8 spark batch JSON (up to 20 symbols) with query2->query1 failover."""
    clean = [s.strip().upper() for s in symbols if s.strip()]
    if not clean:
        return {}
    last_code: int | None = None
    last_net_err: Exception | None = None
    for idx, host in enumerate(HOSTS):
        if idx:
            time.sleep(PAUSE_SEC)
        for attempt in (0, 1):
            url = yahoo_spark_url(clean, range_=range_, interval=interval, host=host)
            try:
                raw = _http_get_text(url)
                parsed = json.loads(raw)
                return parsed if isinstance(parsed, dict) else {}
            except urllib.error.HTTPError as exc:
                last_code = exc.code
                with contextlib.suppress(OSError):
                    exc.close()
                if exc.code == 429 and attempt == 0:
                    time.sleep(BACKOFF_SEC)
                    continue
                if exc.code == 429 or exc.code >= 500:
                    break
                raise NSETraderError(f"Yahoo spark HTTP {exc.code}") from exc
            except (http.client.HTTPException, OSError, ValueError) as exc:
                last_net_err = exc
                if attempt == 0:
                    continue
                break
    if last_code == 429:
        raise NSETraderError("Yahoo spark rate limited (HTTP 429)")
    if last_code is not None:
        raise NSETraderError(f"Yahoo spark failed (HTTP {last_code})")
    raise NSETraderError(f"Network error in Yahoo spark: {last_net_err}") from last_net_err


def parse_nse_fno_ban_csv(raw_text: str) -> dict[str, Any]:
    """Parse NSE fo_secban.csv content into structured ban date & symbol list."""
    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
    header = lines[0] if lines else ""
    banned: list[str] = []
    for ln in lines[1:]:
        parts = [p.strip() for p in ln.split(",") if p.strip()]
        if not parts:
            continue
        sym = parts[-1].upper()
        if sym and re.match(r"^[A-Z0-9&-]+$", sym):
            banned.append(sym)
    return {"header": header, "symbols": sorted(set(banned))}


def fetch_nse_fno_ban(
    rules: dict[str, Any] | None = None,
    offline_file: Path | str | None = None,
) -> dict[str, Any]:
    """Load current NSE F&O MWPL ban list (>95% limit) from nsearchives or offline CSV."""
    if offline_file:
        p = Path(offline_file)
        if p.exists():
            return parse_nse_fno_ban_csv(p.read_text(encoding="utf-8", errors="replace").lstrip("\ufeff"))
        return {"header": "", "symbols": []}
    rules = rules or load_trading_rules()
    url = str((rules.get("feeds") or {}).get("nse_fno_ban_csv") or "")
    if not url:
        return {"header": "", "symbols": []}
    try:
        txt = fetch_url_text(url, timeout=12)
        res = parse_nse_fno_ban_csv(txt)
    except (OSError, urllib.error.URLError, NSETraderError):
        return {"header": "", "symbols": [], "source": "unavailable"}
    else:
        res["source"] = "nsearchives"
        return res


def fetch_yahoo_chart(yahoo_sym: str, range_: str = "60d", interval: str = "5m") -> str:
    """Fetch Yahoo Finance v8 chart JSON with query2 -> query1 fallback and 429 retry."""
    last_code = None
    last_net_err: Exception | None = None
    for idx, host in enumerate(HOSTS):
        if idx:
            time.sleep(PAUSE_SEC)
        for attempt in (0, 1):
            url = yahoo_chart_url(yahoo_sym, range_=range_, interval=interval, host=host)
            try:
                return _http_get_text(url)
            except urllib.error.HTTPError as exc:
                last_code = exc.code
                with contextlib.suppress(OSError):
                    exc.close()
                if exc.code == 429 and attempt == 0:
                    time.sleep(BACKOFF_SEC)
                    continue
                if exc.code == 429 or exc.code >= 500:
                    break
                if exc.code == 404:
                    raise NSETraderError(f"No Yahoo chart for {yahoo_sym} (HTTP 404)") from exc
                raise NSETraderError(f"Yahoo HTTP {exc.code} for {yahoo_sym}") from exc
            except (http.client.HTTPException, OSError) as exc:
                last_net_err = exc
                if attempt == 0:
                    continue
                break
    if last_code == 429:
        raise NSETraderError(f"Yahoo rate limited (HTTP 429) for {yahoo_sym}; retry shortly")
    if last_code is not None:
        raise NSETraderError(f"Yahoo failed (HTTP {last_code}) for {yahoo_sym}")
    raise NSETraderError(f"Network error fetching {yahoo_sym}: {last_net_err}") from last_net_err


def read_offline_chart(path: Path | str, sym_hint: str = "") -> str:
    p = Path(path)
    if p.is_dir() and sym_hint:
        candidates = [
            p / f"{sym_hint}.json",
            p / f"{sym_hint}.json.gz",
            p / f"{sym_hint}-60d5m.json",
            p / f"{sym_hint}-60d5m.json.gz",
        ]
        found = next((c for c in candidates if c.exists()), None)
        if not found:
            raise NSETraderError(f"No offline chart matching {sym_hint} in {p}")
        p = found
    if not p.exists():
        raise NSETraderError(f"Offline chart file not found: {p}")
    opener = gzip.open if p.name.endswith(".gz") else open
    try:
        with opener(p, "rt", encoding="utf-8") as fh:
            return fh.read()
    except (OSError, EOFError) as exc:
        raise NSETraderError(f"Could not read offline chart {p}: {exc}") from exc


def extract_chart_result(raw_text: str, yahoo_sym: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_text)
    except ValueError as exc:
        raise NSETraderError(f"Invalid JSON chart response for {yahoo_sym}") from exc
    chart = payload.get("chart") if isinstance(payload, dict) else None
    if not isinstance(chart, dict):
        raise NSETraderError(f"Unexpected chart structure for {yahoo_sym}")
    results = chart.get("result")
    if not results:
        err = chart.get("error") or {}
        raise NSETraderError(f"No chart data for {yahoo_sym}: {err.get('description') or 'unknown error'}")
    return results[0]


def extract_previous_close(res: dict[str, Any]) -> float | None:
    """Return yesterday's completed close from a Yahoo v8 chart result.

    Yahoo's `meta.chartPreviousClose` on `range=5d&interval=1d` returns the close
    *before* the 5-day window (not yesterday's close). Using daily `timestamp` +
    `close` bars before `regularMarketTime`'s IST date ensures accurate daily % move.
    """
    meta = res.get("meta") or {}
    quote = ((res.get("indicators") or {}).get("quote") or [{}])[0] or {}
    stamps = res.get("timestamp") or []
    closes_list = quote.get("close") or []

    by_date: dict[datetime.date, float] = {}
    for idx, cl in enumerate(closes_list):
        if cl is None or idx >= len(stamps) or stamps[idx] is None:
            continue
        bar_date = to_ist(utc_of(int(stamps[idx]))).date()
        by_date[bar_date] = float(cl)

    sorted_dates = sorted(by_date)
    mkt_time = meta.get("regularMarketTime")
    if sorted_dates and mkt_time is not None:
        mkt_date = to_ist(utc_of(int(mkt_time))).date()
        prior_dates = [d for d in sorted_dates if d < mkt_date]
        if prior_dates:
            return by_date[prior_dates[-1]]

    if len(sorted_dates) >= 2:
        return by_date[sorted_dates[-2]]

    explicit_prev = meta.get("previousClose") or meta.get("regularMarketPreviousClose")
    if explicit_prev is not None:
        return float(explicit_prev)

    if not stamps and str(meta.get("dataGranularity") or "1d") in ("1d", "1wk"):
        valid = [float(c) for c in closes_list if c is not None]
        if len(valid) >= 2:
            return valid[-2]

    chart_prev = meta.get("chartPreviousClose")
    return float(chart_prev) if chart_prev is not None else None

