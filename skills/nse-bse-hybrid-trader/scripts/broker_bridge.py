#!/usr/bin/env python3
"""Multi-Broker Indian Execution & SQLite Paper Trading Bridge.
Supports 9 major Indian brokers with standard library only:
  - angel_one    (Angel One SmartAPI)
  - zerodha      (Zerodha Kite Connect v3)
  - upstox       (Upstox API v3)
  - dhan         (DhanHQ API v2)
  - fyers        (Fyers API v3)
  - groww        (Groww Trading API v1)
  - kotak_neo    (Kotak Neo Trade API)
  - icici_breeze (ICICI Direct Breeze API v1)
  - shoonya      (Finvasia Shoonya Noren API)

Usage:
    python scripts/broker_bridge.py brokers
    python scripts/broker_bridge.py sync-scrip --broker zerodha [--offline instruments.csv]
    python scripts/broker_bridge.py lookup --broker angel_one --symbol RELIANCE --exchange NSE
    python scripts/broker_bridge.py stage --broker zerodha --symbol RELIANCE --entry 1324 --stop 1310 --target 1352 --segment EQ_INTRADAY --paper
    python scripts/broker_bridge.py close --trade-id 1 --exit-price 1352 --reason TARGET
    python scripts/broker_bridge.py ledger [--broker zerodha]
"""

from __future__ import annotations

import argparse
import base64
import contextlib
import csv
import datetime
import gzip
import hashlib
import hmac
import http.client
import io
import json
import os
import sqlite3
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from indian_risk_gate import (
    VALID_SEGMENTS,
    calculate_indian_charges,
    compute_verdict_fingerprint,
    evaluate_risk_gate,
    infer_side,
)
from nse_common import (
    DEFAULT_STATE_DIR,
    SUPPORTED_BROKERS,
    NSETraderError,
    ist_iso,
    load_json_file,
    load_nse_holidays,
    load_trading_rules,
    normalize_broker,
    normalize_symbol,
    nse_session_info,
    parse_now_ist,
    round_tick,
    validate_http_url,
)
from nse_ui import UI, format_inr, safe_print

try:
    import pyotp
except ImportError:
    pyotp = None

try:
    from SmartApi import SmartConnect
except ImportError:
    SmartConnect = None

BROKER_DEFAULTS: dict[str, dict[str, Any]] = {
    "angel_one": {
        "display_name": "Angel One SmartAPI",
        "method": "POST",
        "order_url": "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/placeOrder",
        "content_type": "application/json",
        "scrip_format": "angel_json",
        "requires_token_lookup": True,
        "env_vars": ["ANGEL_API_KEY", "ANGEL_CLIENT_CODE", "ANGEL_MPIN", "ANGEL_TOTP_SECRET"],
    },
    "zerodha": {
        "display_name": "Zerodha Kite Connect v3",
        "method": "POST",
        "order_url": "https://api.kite.trade/orders/regular",
        "content_type": "application/x-www-form-urlencoded",
        "scrip_format": "zerodha_csv",
        "requires_token_lookup": False,
        "env_vars": ["ZERODHA_API_KEY", "ZERODHA_ACCESS_TOKEN"],
    },
    "upstox": {
        "display_name": "Upstox API v3",
        "method": "POST",
        "order_url": "https://api-hft.upstox.com/v3/order/place",
        "content_type": "application/json",
        "scrip_format": "upstox_json_gz",
        "requires_token_lookup": True,
        "env_vars": ["UPSTOX_ACCESS_TOKEN"],
    },
    "dhan": {
        "display_name": "DhanHQ API v2",
        "method": "POST",
        "order_url": "https://api.dhan.co/v2/orders",
        "content_type": "application/json",
        "scrip_format": "dhan_csv",
        "requires_token_lookup": True,
        "env_vars": ["DHAN_CLIENT_ID", "DHAN_ACCESS_TOKEN"],
    },
    "fyers": {
        "display_name": "Fyers API v3",
        "method": "POST",
        "order_url": "https://api-t1.fyers.in/api/v3/orders/sync",
        "content_type": "application/json",
        "scrip_format": "fyers_csv",
        "requires_token_lookup": False,
        "env_vars": ["FYERS_APP_ID", "FYERS_ACCESS_TOKEN"],
    },
    "groww": {
        "display_name": "Groww Trading API v1",
        "method": "POST",
        "order_url": "https://api.groww.in/v1/order/create",
        "content_type": "application/json",
        "scrip_format": "groww_csv",
        "requires_token_lookup": False,
        "env_vars": ["GROWW_ACCESS_TOKEN"],
    },
    "kotak_neo": {
        "display_name": "Kotak Neo Trade API (Trade Free Plan)",
        "method": "POST",
        "order_url": "https://gw-napi.kotaksecurities.com/quick/order/rule/ms/place",
        "content_type": "application/x-www-form-urlencoded",
        "scrip_format": "generic_csv_or_json",
        "requires_token_lookup": False,
        "env_vars": ["KOTAK_ACCESS_TOKEN", "KOTAK_SID", "KOTAK_BASE_URL"],
    },
    "icici_breeze": {
        "display_name": "ICICI Direct Breeze API v1",
        "method": "POST",
        "order_url": "https://api.icicidirect.com/breezeapi/api/v1/order",
        "content_type": "application/json",
        "scrip_format": "generic_csv_or_json",
        "requires_token_lookup": False,
        "env_vars": ["ICICI_API_KEY", "ICICI_SECRET_KEY", "ICICI_SESSION_TOKEN"],
    },
    "shoonya": {
        "display_name": "Finvasia Shoonya Noren API",
        "method": "POST",
        "order_url": "https://api.shoonya.com/NorenWClientAPI/PlaceOrder",
        "content_type": "application/x-www-form-urlencoded",
        "scrip_format": "generic_csv_or_json",
        "requires_token_lookup": False,
        "env_vars": ["SHOONYA_USER_ID", "SHOONYA_SESSION_TOKEN"],
    },
}


def load_dotenv_file(env_path: Path | str | None = None) -> dict[str, str]:
    p = Path(env_path) if env_path else Path.cwd() / ".env"
    loaded: dict[str, str] = {}
    if not p.exists():
        return loaded
    for raw_line in p.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        key = k.strip()
        val = v.strip().strip('"').strip("'")
        loaded[key] = val
        os.environ.setdefault(key, val)
    return loaded


def generate_totp(secret: str, interval: int = 30, digits: int = 6, at_time: float | None = None) -> str:
    """Pure-stdlib RFC-6238 TOTP (uses pyotp if installed, else built-in HMAC-SHA1)."""
    clean = secret.strip().replace(" ", "").upper()
    if not clean:
        raise NSETraderError("Empty TOTP secret")
    if at_time is None and pyotp is not None:
        return str(pyotp.TOTP(clean).now())
    pad = "=" * ((8 - len(clean) % 8) % 8)
    try:
        key = base64.b32decode(clean + pad, casefold=True)
    except Exception as exc:
        raise NSETraderError(f"Invalid Base32 TOTP secret: {exc}") from exc
    counter = int((at_time if at_time is not None else time.time()) // interval)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10**digits)
    return str(code).zfill(digits)


def _extract_http_error_detail(exc: urllib.error.HTTPError) -> str:
    """Safely read broker HTTP error payload and close the response handle."""
    body_text = ""
    try:
        raw = exc.read()
        if raw:
            body_text = raw.decode("utf-8", "replace").strip()
    except OSError:
        body_text = ""
    finally:
        with contextlib.suppress(OSError):
            exc.close()
    if not body_text:
        return f"HTTP {exc.code}: {exc.reason}"
    try:
        parsed = json.loads(body_text)
        if isinstance(parsed, dict):
            msg = (
                parsed.get("message")
                or parsed.get("errorMessage")
                or parsed.get("emsg")
                or parsed.get("error")
                or parsed.get("Error")
                or body_text
            )
            code = (
                parsed.get("errorcode")
                or parsed.get("errorCode")
                or parsed.get("code")
                or ""
            )
            suffix = f" [{code}]" if code else ""
            return f"HTTP {exc.code}{suffix}: {msg}"
    except ValueError:
        pass
    return f"HTTP {exc.code}: {body_text[:200]}"


def _rest_request(
    url: str,
    data_bytes: bytes,
    headers: dict[str, str],
    broker_label: str = "Broker API",
    timeout: int = 20,
) -> dict[str, Any]:
    validated_url = validate_http_url(url)
    req = urllib.request.Request(  # noqa: S310
        validated_url,
        data=data_bytes,
        headers={"Accept": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            parsed = json.loads(resp.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as exc:
        detail = _extract_http_error_detail(exc)
        raise NSETraderError(f"{broker_label} HTTP failure: {detail}") from exc
    except (http.client.HTTPException, OSError, ValueError) as exc:
        raise NSETraderError(f"{broker_label} HTTP failure: {exc}") from exc
    if not isinstance(parsed, dict):
        raise NSETraderError(f"{broker_label} response JSON expected an object")
    return parsed


def _rest_json_post(
    url: str,
    body: dict[str, Any],
    headers: dict[str, str],
    broker_label: str = "Broker API",
) -> dict[str, Any]:
    return _rest_request(
        url,
        json.dumps(body).encode("utf-8"),
        {"Content-Type": "application/json", **headers},
        broker_label=broker_label,
    )


def _rest_form_post(
    url: str,
    form_fields: dict[str, str],
    headers: dict[str, str],
    broker_label: str = "Broker API",
) -> dict[str, Any]:
    encoded = urllib.parse.urlencode(form_fields).encode("utf-8")
    return _rest_request(
        url,
        encoded,
        {"Content-Type": "application/x-www-form-urlencoded", **headers},
        broker_label=broker_label,
    )


# ---------------------------------------------------------------- Multi-Broker ScripMaster Cache


def _scrip_db_path(state_dir: Path) -> Path:
    return state_dir / "scrip_master.db"


def _init_scrip_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scrips (
            token TEXT NOT NULL,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            expiry TEXT,
            strike TEXT,
            lotsize INTEGER DEFAULT 1,
            instrumenttype TEXT,
            exch_seg TEXT NOT NULL,
            tick_size REAL DEFAULT 0.05,
            PRIMARY KEY (token, exch_seg)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scrips_sym_seg ON scrips(symbol, exch_seg)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scrips_name_seg ON scrips(name, exch_seg)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS broker_scrips (
            broker TEXT NOT NULL,
            token TEXT NOT NULL,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            expiry TEXT,
            strike TEXT,
            lotsize INTEGER DEFAULT 1,
            instrumenttype TEXT,
            exch_seg TEXT NOT NULL,
            tick_size REAL DEFAULT 0.05,
            PRIMARY KEY (broker, token, exch_seg)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_bscrips_sym ON broker_scrips(broker, symbol, exch_seg)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_bscrips_name ON broker_scrips(broker, name, exch_seg)")
    conn.commit()


def _parse_int(val: Any, default: int = 1) -> int:
    try:
        return max(1, int(float(val or default)))
    except (TypeError, ValueError):
        return default


def _parse_tick(val: Any, assume_paise_above_one: bool = True) -> float:
    try:
        raw = float(val or 0.05)
    except (TypeError, ValueError):
        return 0.05
    if raw <= 0:
        return 0.05
    if assume_paise_above_one and raw >= 1.0:
        return round(raw / 100.0, 4)
    return round(raw, 4)


def _decode_bytes(raw_bytes: bytes, source_hint: str) -> str:
    if raw_bytes[:2] == b"\x1f\x8b" or source_hint.lower().endswith(".gz"):
        with gzip.GzipFile(fileobj=io.BytesIO(raw_bytes)) as gz:
            return gz.read().decode("utf-8", "replace")
    return raw_bytes.decode("utf-8", "replace")


def _download_bytes(url: str) -> bytes:
    validated = validate_http_url(url)
    req = urllib.request.Request(  # noqa: S310
        validated, headers={"User-Agent": "nse-bse-hybrid-trader/1.1"}
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:  # noqa: S310
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = _extract_http_error_detail(exc)
        raise NSETraderError(f"Failed downloading instrument master ({detail})") from exc
    except (http.client.HTTPException, OSError) as exc:
        raise NSETraderError(f"Failed downloading instrument master: {exc}") from exc


def _parse_angel_json_rows(text: str) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    try:
        data = json.loads(text)
    except ValueError as exc:
        raise NSETraderError(f"Angel One ScripMaster is not valid JSON: {exc}") from exc
    if not isinstance(data, list):
        raise NSETraderError("Angel One ScripMaster JSON expected a list of instruments")
    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        rows.append(
            (
                str(item.get("token") or ""),
                str(item.get("symbol") or "").upper(),
                str(item.get("name") or "").upper(),
                str(item.get("expiry") or ""),
                str(item.get("strike") or ""),
                _parse_int(item.get("lotsize") or item.get("lot_size"), 1),
                str(item.get("instrumenttype") or ""),
                str(item.get("exch_seg") or "").upper(),
                _parse_tick(item.get("tick_size"), assume_paise_above_one=True),
            )
        )
    return rows


def _parse_upstox_json_rows(text: str) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    try:
        data = json.loads(text)
    except ValueError as exc:
        raise NSETraderError(f"Upstox instruments file is not valid JSON: {exc}") from exc
    if not isinstance(data, list):
        raise NSETraderError("Upstox instruments JSON expected a list of instruments")
    seg_map = {"NSE_EQ": "NSE", "BSE_EQ": "BSE", "NSE_FO": "NFO", "BSE_FO": "BFO"}
    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        raw_seg = str(item.get("segment") or item.get("exchange") or "").upper()
        exch_seg = seg_map.get(raw_seg, str(item.get("exchange") or raw_seg).upper())
        token = str(item.get("instrument_key") or item.get("exchange_token") or "")
        sym = str(item.get("trading_symbol") or item.get("tradingsymbol") or "").upper()
        name = str(item.get("underlying_symbol") or item.get("short_name") or item.get("name") or sym).upper()
        rows.append(
            (
                token,
                sym,
                name,
                str(item.get("expiry") or ""),
                str(item.get("strike_price") or item.get("strike") or ""),
                _parse_int(item.get("lot_size"), 1),
                str(item.get("instrument_type") or ""),
                exch_seg,
                _parse_tick(item.get("tick_size"), assume_paise_above_one=True),
            )
        )
    return rows


def _parse_zerodha_csv_rows(text: str) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    reader = csv.DictReader(io.StringIO(text))
    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    for row in reader:
        tsym = str(row.get("tradingsymbol") or "").strip().upper()
        exch = str(row.get("exchange") or "").strip().upper()
        token = str(row.get("instrument_token") or row.get("exchange_token") or "").strip()
        if not token or not tsym:
            continue
        rows.append(
            (
                token,
                tsym,
                str(row.get("name") or tsym).strip().upper(),
                str(row.get("expiry") or "").strip(),
                str(row.get("strike") or "").strip(),
                _parse_int(row.get("lot_size"), 1),
                str(row.get("instrument_type") or "").strip(),
                exch,
                _parse_tick(row.get("tick_size"), assume_paise_above_one=False),
            )
        )
    return rows


def _parse_dhan_csv_rows(text: str) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    reader = csv.DictReader(io.StringIO(text))
    seg_lookup = {
        ("NSE", "E"): "NSE",
        ("BSE", "E"): "BSE",
        ("NSE", "D"): "NFO",
        ("BSE", "D"): "BFO",
        ("NSE", "I"): "NSE",
        ("BSE", "I"): "BSE",
    }
    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    for row in reader:
        exch = str(row.get("SEM_EXM_EXCH_ID") or row.get("EXCH_ID") or "").strip().upper()
        seg = str(row.get("SEM_SEGMENT") or row.get("SEGMENT") or "").strip().upper()
        token = str(row.get("SEM_SMST_SECURITY_ID") or row.get("SECURITY_ID") or "").strip()
        tsym = str(row.get("SEM_TRADING_SYMBOL") or row.get("TRADING_SYMBOL") or "").strip().upper()
        name = str(
            row.get("UNDERLYING_SYMBOL")
            or row.get("SEM_CUSTOM_SYMBOL")
            or row.get("SYMBOL_NAME")
            or tsym
        ).strip().upper()
        if not token or not tsym:
            continue
        exch_seg = seg_lookup.get((exch, seg), f"{exch}_{seg}" if seg else exch)
        rows.append(
            (
                token,
                tsym,
                name,
                str(row.get("SEM_EXPIRY_DATE") or row.get("SM_EXPIRY_DATE") or "").strip(),
                str(row.get("SEM_STRIKE_PRICE") or row.get("STRIKE_PRICE") or "").strip(),
                _parse_int(row.get("SEM_LOT_UNITS") or row.get("LOT_SIZE"), 1),
                str(row.get("SEM_INSTRUMENT_NAME") or row.get("INSTRUMENT") or "").strip(),
                exch_seg,
                _parse_tick(row.get("SEM_TICK_SIZE") or row.get("TICK_SIZE"), assume_paise_above_one=False),
            )
        )
    return rows


def _parse_groww_csv_rows(text: str) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    reader = csv.DictReader(io.StringIO(text))
    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    for row in reader:
        exch = str(row.get("exchange") or "NSE").strip().upper()
        seg = str(row.get("segment") or "CASH").strip().upper()
        exch_seg = ("NFO" if exch == "NSE" else "BFO") if seg == "FNO" else exch
        token = str(row.get("exchange_token") or row.get("groww_symbol") or "").strip()
        tsym = str(row.get("trading_symbol") or "").strip().upper()
        name = str(row.get("underlying_symbol") or row.get("name") or tsym).strip().upper()
        if not token or not tsym:
            continue
        rows.append(
            (
                token,
                tsym,
                name,
                str(row.get("expiry_date") or "").strip(),
                str(row.get("strike_price") or "").strip(),
                _parse_int(row.get("lot_size"), 1),
                str(row.get("instrument_type") or seg).strip(),
                exch_seg,
                _parse_tick(row.get("tick_size"), assume_paise_above_one=False),
            )
        )
    return rows


def _parse_fyers_csv_rows(text: str, source_hint: str = "") -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    reader = csv.reader(io.StringIO(text))
    is_fo_file = "_FO" in source_hint.upper()
    for cols in reader:
        if len(cols) < 10:
            continue
        if cols[0].strip().lower() in ("fytoken", "fy_token"):
            continue
        fytoken = cols[0].strip()
        details = cols[1].strip().upper()
        lot = _parse_int(cols[3], 1)
        tick = _parse_tick(cols[4], assume_paise_above_one=False)
        expiry = cols[8].strip()
        sym_ticker = cols[9].strip().upper()
        underlying = cols[13].strip().upper() if len(cols) > 13 and cols[13].strip() else sym_ticker
        strike = cols[15].strip() if len(cols) > 15 else ""
        opt_type = cols[16].strip().upper() if len(cols) > 16 else ""
        if sym_ticker.startswith("BSE:"):
            exch_seg = "BFO" if (is_fo_file or opt_type in ("CE", "PE") or details.endswith("FUT")) else "BSE"
        else:
            exch_seg = "NFO" if (is_fo_file or opt_type in ("CE", "PE") or details.endswith("FUT")) else "NSE"
        rows.append(
            (
                fytoken,
                sym_ticker,
                underlying,
                expiry,
                strike,
                lot,
                opt_type,
                exch_seg,
                tick,
            )
        )
    return rows


def _parse_generic_rows(text: str) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    stripped = text.lstrip()
    if stripped.startswith("["):
        try:
            data = json.loads(text)
        except ValueError as exc:
            raise NSETraderError(f"Instrument master is not valid JSON: {exc}") from exc
        if not isinstance(data, list):
            raise NSETraderError("Expected list of instrument objects")
        dict_rows: list[dict[str, Any]] = [d for d in data if isinstance(d, dict)]
    else:
        dict_rows = list(csv.DictReader(io.StringIO(text)))

    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    for item in dict_rows:
        token = str(
            item.get("token")
            or item.get("Token")
            or item.get("pSymbol")
            or item.get("instrument_token")
            or item.get("exchange_token")
            or item.get("ShortName")
            or item.get("stock_code")
            or ""
        ).strip()
        sym = str(
            item.get("TradingSymbol")
            or item.get("tradingsymbol")
            or item.get("tsym")
            or item.get("pTrdSymbol")
            or item.get("symbol")
            or item.get("Symbol")
            or item.get("ShortName")
            or ""
        ).strip().upper()
        name = str(
            item.get("name")
            or item.get("SymbolName")
            or item.get("pSymbolName")
            or item.get("CompanyName")
            or item.get("Symbol")
            or sym
        ).strip().upper()
        exch = str(
            item.get("exch_seg")
            or item.get("Exchange")
            or item.get("pExchSeg")
            or item.get("exchange_code")
            or item.get("exchange")
            or "NSE"
        ).strip().upper()
        exch = {"NSE_CM": "NSE", "BSE_CM": "BSE", "NSE_FO": "NFO", "BSE_FO": "BFO"}.get(exch, exch)
        if not sym:
            continue
        if not token:
            token = sym
        rows.append(
            (
                token,
                sym,
                name,
                str(item.get("expiry") or item.get("Expiry") or "").strip(),
                str(item.get("strike") or item.get("StrikePrice") or "").strip(),
                _parse_int(item.get("lotsize") or item.get("LotSize") or item.get("lLotSize"), 1),
                str(item.get("instrumenttype") or item.get("Instrument") or "").strip(),
                exch,
                _parse_tick(item.get("tick_size") or item.get("TickSize") or item.get("dTickSize"), assume_paise_above_one=False),
            )
        )
    return rows


def _parse_broker_scrip_text(
    broker: str,
    text: str,
    source_hint: str = "",
) -> list[tuple[str, str, str, str, str, int, str, str, float]]:
    if broker == "angel_one":
        return _parse_angel_json_rows(text)
    if broker == "upstox":
        return _parse_upstox_json_rows(text)
    if broker == "zerodha":
        return _parse_zerodha_csv_rows(text) if not text.lstrip().startswith("[") else _parse_generic_rows(text)
    if broker == "dhan":
        return _parse_dhan_csv_rows(text) if not text.lstrip().startswith("[") else _parse_generic_rows(text)
    if broker == "groww":
        return _parse_groww_csv_rows(text) if not text.lstrip().startswith("[") else _parse_generic_rows(text)
    if broker == "fyers":
        return _parse_fyers_csv_rows(text, source_hint=source_hint) if not text.lstrip().startswith("[") else _parse_generic_rows(text)
    return _parse_generic_rows(text)


def sync_scrip_master(
    offline_json: Path | str | None = None,
    state_dir: Path | str | None = None,
    rules_path: Path | str | None = None,
    broker: str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    broker_key = normalize_broker(broker or str(rules.get("default_broker", "angel_one")))
    b_cfg = rules.get("brokers", {}).get(broker_key, BROKER_DEFAULTS[broker_key])
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    sdir.mkdir(parents=True, exist_ok=True)

    rows: list[tuple[str, str, str, str, str, int, str, str, float]] = []
    sources: list[str] = []

    if offline_json:
        p = Path(offline_json)
        if not p.exists():
            raise NSETraderError(f"Offline instrument master file not found: {p}")
        text = _decode_bytes(p.read_bytes(), str(p))
        rows = _parse_broker_scrip_text(broker_key, text, source_hint=str(p))
        sources.append(str(p))
    else:
        raw_urls = b_cfg.get("scrip_master_urls") or (
            [b_cfg["scrip_master_url"]] if b_cfg.get("scrip_master_url") else []
        )
        urls = [str(u) for u in raw_urls if str(u).strip()]
        if not urls:
            raise NSETraderError(
                f"No public instrument master URL configured for {broker_key}; "
                "pass --offline <path-to-csv-or-json>"
            )
        for u in urls:
            raw_bytes = _download_bytes(u)
            text = _decode_bytes(raw_bytes, u)
            rows.extend(_parse_broker_scrip_text(broker_key, text, source_hint=u))
            sources.append(u)

    db_path = _scrip_db_path(sdir)
    with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
        _init_scrip_db(conn)
        conn.execute("DELETE FROM broker_scrips WHERE broker = ?", (broker_key,))
        conn.executemany(
            "INSERT OR REPLACE INTO broker_scrips "
            "(broker, token, symbol, name, expiry, strike, lotsize, instrumenttype, exch_seg, tick_size) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [(broker_key, *r) for r in rows],
        )
        if broker_key == "angel_one":
            conn.execute("DELETE FROM scrips")
            conn.executemany(
                "INSERT OR REPLACE INTO scrips "
                "(token, symbol, name, expiry, strike, lotsize, instrumenttype, exch_seg, tick_size) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
        conn.commit()
        count = conn.execute(
            "SELECT COUNT(*) FROM broker_scrips WHERE broker = ?", (broker_key,)
        ).fetchone()[0]
    return {
        "status": "SYNCED",
        "broker": broker_key,
        "source": sources[0] if len(sources) == 1 else sources,
        "db_path": str(db_path),
        "instruments": count,
    }


def lookup_scrip(
    symbol: str,
    exchange: str = "NSE",
    state_dir: Path | str | None = None,
    broker: str = "angel_one",
) -> dict[str, Any] | None:
    broker_key = normalize_broker(broker)
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    db_path = _scrip_db_path(sdir)
    if not db_path.exists():
        return None
    sym_info = normalize_symbol(symbol, default_exchange=exchange if exchange in ("NSE", "BSE") else "NSE")
    exch = exchange.upper()

    t0 = time.perf_counter()
    base = sym_info["base"]
    exch_prefix = "BSE" if exch in ("BSE", "BFO") else "NSE"
    candidates = [
        sym_info["raw"].upper(),
        sym_info["smartapi_eq"],
        base,
        f"{exch}:{base}-EQ",
        f"{exch}:{base}",
        f"{exch_prefix}:{base}-EQ",
        f"{exch_prefix}:{base}",
    ]
    # Preserve order while deduplicating
    candidates = list(dict.fromkeys(candidates))
    row = None
    with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
        conn.row_factory = sqlite3.Row
        has_broker_tbl = (
            conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='broker_scrips'"
            ).fetchone()
            is not None
        )
        if has_broker_tbl:
            for cand in candidates:
                row = conn.execute(
                    "SELECT * FROM broker_scrips WHERE broker = ? AND symbol = ? AND exch_seg = ? LIMIT 1",
                    (broker_key, cand, exch),
                ).fetchone()
                if row:
                    break
            if not row:
                row = conn.execute(
                    "SELECT * FROM broker_scrips WHERE broker = ? AND name = ? AND exch_seg = ? ORDER BY length(symbol) ASC LIMIT 1",
                    (broker_key, base, exch),
                ).fetchone()

        # Fallback to pre-migration Angel One `scrips` table if present
        if not row and broker_key == "angel_one":
            has_legacy = (
                conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='scrips'").fetchone()
                is not None
            )
            if has_legacy:
                for cand in candidates[:3]:
                    row = conn.execute(
                        "SELECT * FROM scrips WHERE symbol = ? AND exch_seg = ? LIMIT 1",
                        (cand, exch),
                    ).fetchone()
                    if row:
                        break
                if not row:
                    row = conn.execute(
                        "SELECT * FROM scrips WHERE name = ? AND exch_seg = ? ORDER BY length(symbol) ASC LIMIT 1",
                        (base, exch),
                    ).fetchone()

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 3)
    if not row:
        return None
    d = dict(row)
    d.setdefault("broker", broker_key)
    d["lookup_ms"] = elapsed_ms
    return d


# ---------------------------------------------------------------- Paper Ledger SQLite


def _paper_db_path(state_dir: Path) -> Path:
    return state_dir / "paper_trades.db"


def _init_paper_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS paper_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at_ist TEXT NOT NULL,
            trade_date TEXT NOT NULL,
            broker TEXT NOT NULL DEFAULT 'angel_one',
            symbol TEXT NOT NULL,
            exchange TEXT NOT NULL,
            segment TEXT NOT NULL,
            side TEXT NOT NULL,
            qty INTEGER NOT NULL,
            lot_size INTEGER NOT NULL,
            planned_entry REAL NOT NULL,
            filled_entry REAL NOT NULL,
            stop_loss REAL NOT NULL,
            target_price REAL NOT NULL,
            max_risk_inr REAL NOT NULL,
            status TEXT NOT NULL,
            exit_price REAL,
            exit_time_ist TEXT,
            exit_reason TEXT,
            gross_pnl_inr REAL,
            total_charges_inr REAL,
            realized_net_pnl_inr REAL,
            risk_fingerprint TEXT,
            smartapi_payload TEXT
        )
        """
    )
    cols = {r[1] for r in conn.execute("PRAGMA table_info(paper_orders)").fetchall()}
    if "broker" not in cols:
        conn.execute("ALTER TABLE paper_orders ADD COLUMN broker TEXT NOT NULL DEFAULT 'angel_one'")
    conn.commit()


# ---------------------------------------------------------------- Broker-Native Payload Builders


def _default_symbol_for_broker(broker: str, base_symbol: str, exchange: str, segment: str) -> str:
    exch_base = "NSE" if exchange in ("NSE", "NFO") else "BSE"
    if broker == "fyers":
        return f"{exch_base}:{base_symbol}-EQ" if not segment.startswith("FNO") else f"{exch_base}:{base_symbol}"
    if broker in ("angel_one", "kotak_neo", "shoonya") and exch_base == "NSE" and not segment.startswith("FNO"):
        return f"{base_symbol}-EQ"
    return base_symbol


def build_broker_payload(
    broker: str,
    tradingsymbol: str,
    symboltoken: str,
    exchange: str,
    side: str,
    qty: int,
    entry: float,
    stop: float,
    target: float,
    segment: str,
    order_type: str = "LIMIT",
    use_robo: bool = True,
    tick: float = 0.05,
    base_symbol: str | None = None,
) -> dict[str, Any]:
    broker_key = normalize_broker(broker)
    tx_type = "BUY" if side == "buy" else "SELL"
    entry_r = round_tick(entry, tick)
    stop_r = round_tick(stop, tick)
    target_r = round_tick(target, tick)
    base = (base_symbol or tradingsymbol).replace("-EQ", "").split(":")[-1]
    is_limit = order_type == "LIMIT"

    if broker_key == "angel_one":
        if segment == "EQ_INTRADAY" and use_robo:
            sq_offset = round_tick(abs(target_r - entry_r), tick)
            sl_offset = round_tick(abs(entry_r - stop_r), tick)
            return {
                "variety": "ROBO",
                "tradingsymbol": tradingsymbol,
                "symboltoken": symboltoken,
                "transactiontype": tx_type,
                "exchange": exchange,
                "ordertype": order_type,
                "producttype": "BO",
                "duration": "DAY",
                "price": f"{entry_r:.2f}" if is_limit else "0",
                "squareoff": f"{sq_offset:.2f}",
                "stoploss": f"{sl_offset:.2f}",
                "quantity": str(qty),
            }
        product = "INTRADAY" if segment == "EQ_INTRADAY" else "DELIVERY" if segment == "EQ_DELIVERY" else "CARRYFORWARD"
        return {
            "variety": "NORMAL",
            "tradingsymbol": tradingsymbol,
            "symboltoken": symboltoken,
            "transactiontype": tx_type,
            "exchange": exchange,
            "ordertype": order_type,
            "producttype": product,
            "duration": "DAY",
            "price": f"{entry_r:.2f}" if is_limit else "0",
            "quantity": str(qty),
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "zerodha":
        kite_tsym = tradingsymbol if segment.startswith("FNO") else tradingsymbol.removesuffix("-EQ")
        product = "MIS" if segment == "EQ_INTRADAY" else "CNC" if segment == "EQ_DELIVERY" else "NRML"
        return {
            "variety": "regular",
            "exchange": exchange,
            "tradingsymbol": kite_tsym,
            "transaction_type": tx_type,
            "quantity": str(qty),
            "product": product,
            "order_type": order_type,
            "price": f"{entry_r:.2f}" if is_limit else "0",
            "validity": "DAY",
            "tag": "nse_bse_hybrid",
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "upstox":
        product = "I" if segment == "EQ_INTRADAY" else "D"
        return {
            "quantity": qty,
            "product": product,
            "validity": "DAY",
            "price": entry_r if is_limit else 0.0,
            "tag": "nse_bse_hybrid",
            "instrument_token": symboltoken,
            "order_type": order_type,
            "transaction_type": tx_type,
            "disclosed_quantity": 0,
            "trigger_price": 0.0,
            "is_amo": False,
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "dhan":
        seg_map = {"NSE": "NSE_EQ", "BSE": "BSE_EQ", "NFO": "NSE_FNO", "BFO": "BSE_FNO"}
        product = "INTRADAY" if segment == "EQ_INTRADAY" else "CNC" if segment == "EQ_DELIVERY" else "MARGIN"
        client_id = os.environ.get("DHAN_CLIENT_ID", "").strip() or "${DHAN_CLIENT_ID}"
        return {
            "dhanClientId": client_id,
            "correlationId": f"hybrid_{base}_{int(time.time())}",
            "transactionType": tx_type,
            "exchangeSegment": seg_map.get(exchange, "NSE_EQ"),
            "productType": product,
            "orderType": order_type,
            "validity": "DAY",
            "securityId": symboltoken,
            "quantity": qty,
            "disclosedQuantity": 0,
            "price": entry_r if is_limit else 0.0,
            "triggerPrice": 0.0,
            "afterMarketOrder": False,
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "fyers":
        fyers_sym = tradingsymbol if ":" in tradingsymbol else _default_symbol_for_broker("fyers", base, exchange, segment)
        fyers_type = 1 if is_limit else 2
        fyers_side = 1 if side == "buy" else -1
        if segment == "EQ_INTRADAY" and use_robo:
            return {
                "symbol": fyers_sym,
                "qty": qty,
                "type": fyers_type,
                "side": fyers_side,
                "productType": "BO",
                "limitPrice": entry_r if is_limit else 0.0,
                "stopPrice": 0.0,
                "stopLoss": round_tick(abs(entry_r - stop_r), tick),
                "takeProfit": round_tick(abs(target_r - entry_r), tick),
                "validity": "DAY",
                "disclosedQty": 0,
                "offlineOrder": False,
                "orderTag": "nsehybrid",
            }
        product = "INTRADAY" if segment == "EQ_INTRADAY" else "CNC" if segment == "EQ_DELIVERY" else "MARGIN"
        return {
            "symbol": fyers_sym,
            "qty": qty,
            "type": fyers_type,
            "side": fyers_side,
            "productType": product,
            "limitPrice": entry_r if is_limit else 0.0,
            "stopPrice": 0.0,
            "validity": "DAY",
            "disclosedQty": 0,
            "offlineOrder": False,
            "orderTag": "nsehybrid",
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "groww":
        groww_exch = "NSE" if exchange in ("NSE", "NFO") else "BSE"
        groww_seg = "FNO" if segment.startswith("FNO") else "CASH"
        groww_tsym = tradingsymbol if segment.startswith("FNO") else tradingsymbol.removesuffix("-EQ")
        product = "MIS" if segment == "EQ_INTRADAY" else "CNC" if segment == "EQ_DELIVERY" else "NRML"
        return {
            "trading_symbol": groww_tsym,
            "quantity": qty,
            "price": entry_r if is_limit else 0.0,
            "trigger_price": 0.0,
            "validity": "DAY",
            "exchange": groww_exch,
            "segment": groww_seg,
            "product": product,
            "order_type": order_type,
            "transaction_type": tx_type,
            "order_reference_id": f"hyb-{base}-{int(time.time())}"[:20],
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "kotak_neo":
        es_map = {"NSE": "nse_cm", "BSE": "bse_cm", "NFO": "nse_fo", "BFO": "bse_fo"}
        pc = "MIS" if segment == "EQ_INTRADAY" else "CNC" if segment == "EQ_DELIVERY" else "NRML"
        return {
            "am": "NO",
            "dq": "0",
            "es": es_map.get(exchange, "nse_cm"),
            "mp": "0",
            "pc": pc,
            "pf": "N",
            "pr": f"{entry_r:.2f}" if is_limit else "0",
            "pt": "L" if is_limit else "MKT",
            "qt": str(qty),
            "rt": "DAY",
            "tp": "0",
            "ts": tradingsymbol,
            "tt": "B" if side == "buy" else "S",
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    if broker_key == "icici_breeze":
        prod_map = {
            "EQ_INTRADAY": "margin",
            "EQ_DELIVERY": "cash",
            "FNO_FUT": "futures",
            "FNO_OPT": "options",
        }
        return {
            "stock_code": tradingsymbol.removesuffix("-EQ") if symboltoken == "UNSYNCED" else symboltoken,
            "exchange_code": exchange,
            "product": prod_map[segment],
            "action": side,
            "order_type": "limit" if is_limit else "market",
            "price": f"{entry_r:.2f}" if is_limit else "0",
            "stoploss": "",
            "quantity": str(qty),
            "validity": "day",
            "attached_stoploss_trigger": f"{stop_r:.2f}",
            "attached_target_price": f"{target_r:.2f}",
        }

    # shoonya
    uid = os.environ.get("SHOONYA_USER_ID", "").strip() or "${SHOONYA_USER_ID}"
    actid = os.environ.get("SHOONYA_ACCOUNT_ID", "").strip() or uid
    prd = "I" if segment == "EQ_INTRADAY" else "C" if segment == "EQ_DELIVERY" else "M"
    return {
        "uid": uid,
        "actid": actid,
        "exch": exchange,
        "tsym": tradingsymbol,
        "qty": str(qty),
        "prc": f"{entry_r:.2f}" if is_limit else "0",
        "prd": prd,
        "trantype": "B" if side == "buy" else "S",
        "prctyp": "LMT" if is_limit else "MKT",
        "ret": "DAY",
        "ordersource": "API",
        "attached_stoploss_trigger": f"{stop_r:.2f}",
        "attached_target_price": f"{target_r:.2f}",
    }


def _strip_attached_fields(payload: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in payload.items() if not k.startswith("attached_")}


# ---------------------------------------------------------------- Live Broker Dispatchers


def _require_env(keys: tuple[str, ...]) -> dict[str, str]:
    vals: dict[str, str] = {}
    missing: list[str] = []
    for k in keys:
        v = os.environ.get(k, "").strip()
        if not v:
            missing.append(k)
        vals[k] = v
    if missing:
        raise NSETraderError(f"Missing broker credentials in environment/.env: {', '.join(missing)}")
    return vals


def _dispatch_angel_one_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("ANGEL_API_KEY", "").strip()
    client_code = os.environ.get("ANGEL_CLIENT_CODE", "").strip()
    password = (os.environ.get("ANGEL_MPIN") or os.environ.get("ANGEL_PASSWORD") or "").strip()
    totp_secret = os.environ.get("ANGEL_TOTP_SECRET", "").strip()
    missing = [
        name
        for name, val in (
            ("ANGEL_API_KEY", api_key),
            ("ANGEL_CLIENT_CODE", client_code),
            ("ANGEL_MPIN/ANGEL_PASSWORD", password),
            ("ANGEL_TOTP_SECRET", totp_secret),
        )
        if not val
    ]
    if missing:
        raise NSETraderError(f"Missing Angel One credentials in environment/.env: {', '.join(missing)}")

    totp_code = generate_totp(totp_secret)
    clean_payload = _strip_attached_fields(payload)

    if SmartConnect is not None:
        client = SmartConnect(api_key=api_key)
        sess = client.generateSession(client_code, password, totp_code)
        if not sess or not sess.get("status"):
            raise NSETraderError(f"SmartAPI login rejected: {sess}")
        order_resp = client.placeOrderFullResponse(clean_payload)
        return {"transport": "smartapi-python", "response": order_resp}

    base = str(rules.get("brokers", {}).get("angel_one", {}).get("base_url") or rules["angel_one"]["base_url"]).rstrip("/")
    common_headers = {
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "127.0.0.1",
        "X-MACAddress": "00:00:00:00:00:00",
        "X-PrivateKey": api_key,
    }
    login_resp = _rest_json_post(
        f"{base}/rest/auth/angelbroking/user/v1/loginByPassword",
        {"clientcode": client_code, "password": password, "totp": totp_code},
        common_headers,
        broker_label="Angel One SmartAPI",
    )
    if not login_resp.get("status"):
        raise NSETraderError(f"Angel One login failed: {login_resp.get('message') or login_resp}")
    jwt_token = (login_resp.get("data") or {}).get("jwtToken")
    if not jwt_token:
        raise NSETraderError("Angel One login response missing jwtToken")

    auth_headers = {**common_headers, "Authorization": f"Bearer {jwt_token}"}
    order_resp = _rest_json_post(
        f"{base}/rest/secure/angelbroking/order/v1/placeOrder",
        clean_payload,
        auth_headers,
        broker_label="Angel One SmartAPI",
    )
    return {"transport": "direct-rest", "response": order_resp}


def _dispatch_zerodha_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("ZERODHA_API_KEY", "ZERODHA_ACCESS_TOKEN"))
    clean = _strip_attached_fields(payload)
    variety = str(clean.pop("variety", "regular"))
    base = str(rules.get("brokers", {}).get("zerodha", {}).get("base_url") or "https://api.kite.trade").rstrip("/")
    form = {k: str(v) for k, v in clean.items()}
    headers = {
        "X-Kite-Version": "3",
        "Authorization": f"token {creds['ZERODHA_API_KEY']}:{creds['ZERODHA_ACCESS_TOKEN']}",
    }
    resp = _rest_form_post(f"{base}/orders/{variety}", form, headers, broker_label="Zerodha Kite")
    return {"transport": "direct-rest", "response": resp}


def _dispatch_upstox_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("UPSTOX_ACCESS_TOKEN",))
    clean = _strip_attached_fields(payload)
    url = str(
        rules.get("brokers", {}).get("upstox", {}).get("order_url")
        or "https://api-hft.upstox.com/v3/order/place"
    )
    headers = {"Authorization": f"Bearer {creds['UPSTOX_ACCESS_TOKEN']}"}
    resp = _rest_json_post(url, clean, headers, broker_label="Upstox v3")
    return {"transport": "direct-rest", "response": resp}


def _dispatch_dhan_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("DHAN_CLIENT_ID", "DHAN_ACCESS_TOKEN"))
    clean = _strip_attached_fields(payload)
    clean["dhanClientId"] = creds["DHAN_CLIENT_ID"]
    url = str(rules.get("brokers", {}).get("dhan", {}).get("order_url") or "https://api.dhan.co/v2/orders")
    headers = {"access-token": creds["DHAN_ACCESS_TOKEN"]}
    resp = _rest_json_post(url, clean, headers, broker_label="DhanHQ v2")
    return {"transport": "direct-rest", "response": resp}


def _dispatch_fyers_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("FYERS_APP_ID", "FYERS_ACCESS_TOKEN"))
    clean = _strip_attached_fields(payload)
    url = str(
        rules.get("brokers", {}).get("fyers", {}).get("order_url")
        or "https://api-t1.fyers.in/api/v3/orders/sync"
    )
    headers = {"Authorization": f"{creds['FYERS_APP_ID']}:{creds['FYERS_ACCESS_TOKEN']}"}
    resp = _rest_json_post(url, clean, headers, broker_label="Fyers v3")
    return {"transport": "direct-rest", "response": resp}


def _dispatch_groww_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("GROWW_ACCESS_TOKEN",))
    clean = _strip_attached_fields(payload)
    url = str(
        rules.get("brokers", {}).get("groww", {}).get("order_url")
        or "https://api.groww.in/v1/order/create"
    )
    headers = {
        "Authorization": f"Bearer {creds['GROWW_ACCESS_TOKEN']}",
        "X-API-VERSION": "1.0",
    }
    resp = _rest_json_post(url, clean, headers, broker_label="Groww v1")
    return {"transport": "direct-rest", "response": resp}


def _dispatch_kotak_neo_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("KOTAK_ACCESS_TOKEN", "KOTAK_SID"))
    b_cfg = rules.get("brokers", {}).get("kotak_neo", {})
    base = (
        os.environ.get("KOTAK_BASE_URL", "").strip()
        or str(b_cfg.get("base_url") or "https://gw-napi.kotaksecurities.com")
    ).rstrip("/")
    path = str(b_cfg.get("order_path") or "/quick/order/rule/ms/place")
    clean = _strip_attached_fields(payload)
    headers = {
        "Auth": creds["KOTAK_ACCESS_TOKEN"],
        "Sid": creds["KOTAK_SID"],
        "neo-fin-key": "neotradeapi",
    }
    resp = _rest_form_post(
        f"{base}{path}",
        {"jData": json.dumps(clean, separators=(",", ":"))},
        headers,
        broker_label="Kotak Neo",
    )
    return {"transport": "direct-rest", "response": resp}


def _dispatch_icici_breeze_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("ICICI_API_KEY", "ICICI_SECRET_KEY", "ICICI_SESSION_TOKEN"))
    clean = _strip_attached_fields(payload)
    body_str = json.dumps(clean, separators=(",", ":"))
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    checksum_raw = f"{ts}{body_str}{creds['ICICI_SECRET_KEY']}".encode()
    checksum = "token " + hashlib.sha256(checksum_raw).hexdigest()
    url = str(
        rules.get("brokers", {}).get("icici_breeze", {}).get("order_url")
        or "https://api.icicidirect.com/breezeapi/api/v1/order"
    )
    headers = {
        "X-AppKey": creds["ICICI_API_KEY"],
        "X-SessionToken": creds["ICICI_SESSION_TOKEN"],
        "X-Timestamp": ts,
        "X-Checksum": checksum,
    }
    resp = _rest_request(
        url,
        body_str.encode("utf-8"),
        {"Content-Type": "application/json", **headers},
        broker_label="ICICI Breeze",
    )
    return {"transport": "direct-rest", "response": resp}


def _dispatch_shoonya_live(payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    creds = _require_env(("SHOONYA_USER_ID", "SHOONYA_SESSION_TOKEN"))
    clean = _strip_attached_fields(payload)
    clean["uid"] = creds["SHOONYA_USER_ID"]
    clean["actid"] = os.environ.get("SHOONYA_ACCOUNT_ID", "").strip() or creds["SHOONYA_USER_ID"]
    url = str(
        rules.get("brokers", {}).get("shoonya", {}).get("order_url")
        or "https://api.shoonya.com/NorenWClientAPI/PlaceOrder"
    )
    resp = _rest_form_post(
        url,
        {"jData": json.dumps(clean, separators=(",", ":")), "jKey": creds["SHOONYA_SESSION_TOKEN"]},
        {},
        broker_label="Finvasia Shoonya",
    )
    return {"transport": "direct-rest", "response": resp}


def _place_live_broker_order(broker: str, payload: dict[str, Any], rules: dict[str, Any]) -> dict[str, Any]:
    load_dotenv_file()
    dispatchers = {
        "angel_one": _dispatch_angel_one_live,
        "zerodha": _dispatch_zerodha_live,
        "upstox": _dispatch_upstox_live,
        "dhan": _dispatch_dhan_live,
        "fyers": _dispatch_fyers_live,
        "groww": _dispatch_groww_live,
        "kotak_neo": _dispatch_kotak_neo_live,
        "icici_breeze": _dispatch_icici_breeze_live,
        "shoonya": _dispatch_shoonya_live,
    }
    return dispatchers[broker](payload, rules)


# ---------------------------------------------------------------- Unified Staging / Execution


def list_supported_brokers(rules_path: Path | str | None = None) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    out: list[dict[str, Any]] = []
    for key in SUPPORTED_BROKERS:
        cfg = rules.get("brokers", {}).get(key, {})
        meta = BROKER_DEFAULTS[key]
        out.append(
            {
                "broker": key,
                "display_name": cfg.get("display_name", meta["display_name"]),
                "order_url": cfg.get("order_url", meta["order_url"]),
                "content_type": meta["content_type"],
                "requires_token_lookup": cfg.get("requires_token_lookup", meta["requires_token_lookup"]),
                "env_vars": cfg.get("env_vars", meta["env_vars"]),
                "brokerage": cfg.get("brokerage", {}),
            }
        )
    return {"default_broker": rules.get("default_broker", "angel_one"), "count": len(out), "brokers": out}


def stage_or_execute_order(
    symbol: str,
    entry: float,
    stop: float,
    target: float,
    segment: str = "EQ_INTRADAY",
    exchange: str = "NSE",
    side: str | None = None,
    qty: int | None = None,
    capital_inr: float = 50000.0,
    risk_pct: float = 1.0,
    lot_size: int = 1,
    risk_json_path: str | None = None,
    symboltoken: str | None = None,
    order_type: str = "LIMIT",
    use_robo: bool = True,
    slippage_ticks: int | None = None,
    live: bool = False,
    confirm_phrase: str = "",
    now_str: str | None = None,
    state_dir: Path | str | None = None,
    rules_path: Path | str | None = None,
    broker: str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    broker_key = normalize_broker(broker or str(rules.get("default_broker", "angel_one")))
    b_cfg = rules.get("brokers", {}).get(broker_key, BROKER_DEFAULTS[broker_key])
    holidays = load_nse_holidays()
    tick = float(rules["session_ist"]["tick_size_inr"])
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    sdir.mkdir(parents=True, exist_ok=True)

    dt_ist = parse_now_ist(now_str)
    session_info = nse_session_info(dt_ist, rules=rules, holidays_cfg=holidays)
    sym_info = normalize_symbol(symbol, default_exchange=exchange if exchange in ("NSE", "BSE") else "NSE")
    side = infer_side(entry, stop, target, explicit_side=side)
    exch_for_lookup = (
        "NFO"
        if segment.startswith("FNO") and sym_info["exchange"] == "NSE"
        else "BFO"
        if segment.startswith("FNO")
        else sym_info["exchange"]
    )

    scrip = lookup_scrip(sym_info["base"], exchange=exch_for_lookup, state_dir=sdir, broker=broker_key)
    resolved_lot = int(scrip["lotsize"]) if scrip and lot_size == 1 and segment.startswith("FNO") else lot_size
    resolved_token = symboltoken or (scrip["token"] if scrip else "UNSYNCED")
    resolved_tsym = (
        str(scrip["symbol"])
        if scrip
        else _default_symbol_for_broker(broker_key, sym_info["base"], exch_for_lookup, segment)
    )

    if risk_json_path:
        risk_verdict = load_json_file(risk_json_path, required=True)
        if not isinstance(risk_verdict, dict):
            raise NSETraderError(f"Invalid risk verdict object in {risk_json_path}")
        expected_fp = compute_verdict_fingerprint(risk_verdict)
        if risk_verdict.get("fingerprint") != expected_fp:
            raise NSETraderError("TAMPERED_RISK_VERDICT: Risk fingerprint mismatch")
        if risk_verdict.get("verdict") != "PASS":
            raise NSETraderError(f"RISK_GATE_BLOCKED: {risk_verdict.get('blocks')}")
        verdict_broker = risk_verdict.get("broker")
        if verdict_broker not in (None, "standard") and verdict_broker != broker_key:
            raise NSETraderError(
                f"BROKER_MISMATCH: Risk verdict calculated for {verdict_broker!r}, cannot stage on {broker_key!r}"
            )
        verdict_symbol = str(risk_verdict.get("symbol") or "UNKNOWN").upper()
        if verdict_symbol != "UNKNOWN" and verdict_symbol != sym_info["base"]:
            raise NSETraderError(
                f"SYMBOL_MISMATCH: Risk verdict calculated for {verdict_symbol!r}, cannot stage {sym_info['base']!r}"
            )
        if risk_verdict.get("segment") != segment:
            raise NSETraderError(
                f"SEGMENT_MISMATCH: Risk verdict segment {risk_verdict.get('segment')!r} != {segment!r}"
            )
        if risk_verdict.get("side") != side:
            raise NSETraderError(
                f"SIDE_MISMATCH: Risk verdict side {risk_verdict.get('side')!r} != {side!r}"
            )
        entry_r = round_tick(entry, tick)
        stop_r = round_tick(stop, tick, mode="down" if side == "buy" else "up")
        target_r = round_tick(target, tick)
        if (entry_r, stop_r, target_r) != (
            float(risk_verdict["entry"]),
            float(risk_verdict["stop"]),
            float(risk_verdict["target"]),
        ):
            raise NSETraderError("PRICE_MISMATCH: Entry/stop/target coordinates differ from approved risk verdict")
        final_qty = int(qty or risk_verdict["qty"])
        if final_qty != int(risk_verdict["qty"]):
            raise NSETraderError(f"Requested qty {final_qty} differs from approved risk gate qty {risk_verdict['qty']}")
        max_risk_inr = float(risk_verdict["net_loss_at_stop_inr"])
        fp = expected_fp
    else:
        risk_verdict = evaluate_risk_gate(
            capital_inr=capital_inr,
            risk_pct=risk_pct,
            entry=entry,
            stop=stop,
            target=target,
            segment=segment,
            symbol=sym_info["base"],
            side=side,
            lot_size=resolved_lot,
            broker=broker_key,
            now_str=now_str,
            strict_session=live,
            state_dir=sdir,
            rules_path=rules_path,
        )
        if risk_verdict["verdict"] != "PASS":
            raise NSETraderError(f"RISK_GATE_BLOCKED: {'; '.join(risk_verdict['blocks'])}")
        final_qty = int(qty or risk_verdict["qty"])
        max_risk_inr = float(risk_verdict["net_loss_at_stop_inr"])
        fp = risk_verdict["fingerprint"]

    payload = build_broker_payload(
        broker=broker_key,
        tradingsymbol=resolved_tsym,
        symboltoken=resolved_token,
        exchange=exch_for_lookup,
        side=side,
        qty=final_qty,
        entry=entry,
        stop=stop,
        target=target,
        segment=segment,
        order_type=order_type,
        use_robo=use_robo,
        tick=tick,
        base_symbol=sym_info["base"],
    )

    if live:
        if confirm_phrase != "CONFIRM LIVE":
            raise NSETraderError('LIVE_BLOCKED: Live execution requires exact --confirm "CONFIRM LIVE"')
        if segment == "EQ_INTRADAY" and not session_info["intraday_entry_allowed"]:
            raise NSETraderError(
                f"LIVE_BLOCKED: Intraday entries disallowed during {session_info['phase']} ({session_info['time_ist']} IST)"
            )
        if not session_info["is_market_open"]:
            raise NSETraderError(f"LIVE_BLOCKED: Market closed ({session_info['phase']} {session_info['ist_timestamp']})")
        requires_token = bool(b_cfg.get("requires_token_lookup", BROKER_DEFAULTS[broker_key]["requires_token_lookup"]))
        if requires_token and resolved_token == "UNSYNCED":  # noqa: S105 - placeholder sentinel
            raise NSETraderError(
                f"LIVE_BLOCKED: {broker_key} requires symboltoken/instrument_token; run `sync-scrip --broker {broker_key}` or pass --symboltoken"
            )
        if segment.startswith("FNO") and not scrip and resolved_token == "UNSYNCED":  # noqa: S105 - placeholder sentinel
            raise NSETraderError(
                f"LIVE_BLOCKED: F&O contract resolution missing for {broker_key}; sync scrip master or pass --symboltoken"
            )
        broker_res = _place_live_broker_order(broker_key, payload, rules)
        return {
            "mode": "LIVE",
            "broker": broker_key,
            "status": "DISPATCHED",
            "fingerprint": fp,
            "session": session_info,
            "payload": payload,
            "broker_response": broker_res,
        }

    slip_ticks = int(slippage_ticks if slippage_ticks is not None else rules["risk"]["default_slippage_ticks"])
    slip_amt = slip_ticks * tick
    filled_entry = round_tick(entry + slip_amt if side == "buy" else entry - slip_amt, tick)

    db_path = _paper_db_path(sdir)
    with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
        _init_paper_db(conn)
        cur = conn.execute(
            """
            INSERT INTO paper_orders (
                created_at_ist, trade_date, broker, symbol, exchange, segment, side, qty, lot_size,
                planned_entry, filled_entry, stop_loss, target_price, max_risk_inr,
                status, risk_fingerprint, smartapi_payload
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
            """,
            (
                ist_iso(dt_ist),
                session_info["date"],
                broker_key,
                sym_info["base"],
                exch_for_lookup,
                segment,
                side,
                final_qty,
                resolved_lot,
                round_tick(entry, tick),
                filled_entry,
                round_tick(stop, tick),
                round_tick(target, tick),
                max_risk_inr,
                fp,
                json.dumps(payload),
            ),
        )
        trade_id = cur.lastrowid
        conn.commit()

    return {
        "mode": "PAPER",
        "broker": broker_key,
        "status": "OPEN",
        "trade_id": trade_id,
        "ledger_db": str(db_path),
        "fingerprint": fp,
        "symbol": sym_info["base"],
        "side": side,
        "qty": final_qty,
        "planned_entry": round_tick(entry, tick),
        "filled_entry_with_slippage": filled_entry,
        "stop_loss": round_tick(stop, tick),
        "target_price": round_tick(target, tick),
        "max_risk_inr": max_risk_inr,
        "broker_payload": payload,
        "smartapi_payload": payload,
    }


def close_paper_trade(
    trade_id: int,
    exit_price: float,
    reason: str = "MANUAL",
    now_str: str | None = None,
    state_dir: Path | str | None = None,
    rules_path: Path | str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    tick = float(rules["session_ist"]["tick_size_inr"])
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    db_path = _paper_db_path(sdir)
    if not db_path.exists():
        raise NSETraderError(f"Paper ledger database does not exist yet: {db_path}")

    with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
        conn.row_factory = sqlite3.Row
        _init_paper_db(conn)
        row = conn.execute("SELECT * FROM paper_orders WHERE id = ?", (trade_id,)).fetchone()
        if not row:
            raise NSETraderError(f"Paper trade id={trade_id} not found")
        if row["status"] != "OPEN":
            raise NSETraderError(f"Paper trade id={trade_id} is already {row['status']}")

        exit_r = round_tick(exit_price, tick)
        if exit_r <= 0:
            raise NSETraderError(f"exit_price must be > 0, got {exit_price}")
        qty = int(row["qty"])
        filled_entry = float(row["filled_entry"])
        side = str(row["side"])
        segment = str(row["segment"])
        broker_key = str(row["broker"] or "angel_one")

        gross_pnl = (exit_r - filled_entry) * qty if side == "buy" else (filled_entry - exit_r) * qty
        charges = calculate_indian_charges(qty, filled_entry, exit_r, side, segment, rules=rules, broker=broker_key)
        net_pnl = round(gross_pnl - charges["total_charges"], 2)
        status = f"CLOSED_{reason.upper()}"
        dt_ist = parse_now_ist(now_str)

        conn.execute(
            """
            UPDATE paper_orders
            SET status = ?, exit_price = ?, exit_time_ist = ?, exit_reason = ?,
                gross_pnl_inr = ?, total_charges_inr = ?, realized_net_pnl_inr = ?
            WHERE id = ?
            """,
            (status, exit_r, ist_iso(dt_ist), reason.upper(), round(gross_pnl, 2), charges["total_charges"], net_pnl, trade_id),
        )
        conn.commit()

    return {
        "trade_id": trade_id,
        "broker": broker_key,
        "symbol": row["symbol"],
        "status": status,
        "filled_entry": filled_entry,
        "exit_price": exit_r,
        "qty": qty,
        "gross_pnl_inr": round(gross_pnl, 2),
        "total_charges_inr": charges["total_charges"],
        "realized_net_pnl_inr": net_pnl,
    }


def read_ledger(
    date_str: str | None = None,
    state_dir: Path | str | None = None,
    rules_path: Path | str | None = None,
    broker: str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules(rules_path)
    sdir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
    db_path = _paper_db_path(sdir)
    if not db_path.exists():
        return {"trades": [], "realized_net_pnl_inr": 0.0, "open_risk_inr": 0.0, "count": 0}
    broker_key = normalize_broker(broker) if broker else None
    with contextlib.closing(sqlite3.connect(str(db_path))) as conn:
        conn.row_factory = sqlite3.Row
        _init_paper_db(conn)
        if date_str and broker_key:
            rows = conn.execute(
                "SELECT * FROM paper_orders WHERE trade_date = ? AND broker = ? ORDER BY id DESC",
                (date_str, broker_key),
            ).fetchall()
        elif date_str:
            rows = conn.execute(
                "SELECT * FROM paper_orders WHERE trade_date = ? ORDER BY id DESC",
                (date_str,),
            ).fetchall()
        elif broker_key:
            rows = conn.execute(
                "SELECT * FROM paper_orders WHERE broker = ? ORDER BY id DESC LIMIT 50",
                (broker_key,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM paper_orders ORDER BY id DESC LIMIT 50").fetchall()
    trades = [dict(r) for r in rows]
    realized = round(sum(float(t["realized_net_pnl_inr"] or 0.0) for t in trades if str(t["status"]).startswith("CLOSED")), 2)
    open_risk = round(sum(float(t["max_risk_inr"] or 0.0) for t in trades if t["status"] == "OPEN"), 2)
    max_dd = round(float(rules["capital_inr"]) * (float(rules["risk"]["max_daily_drawdown_pct"]) / 100.0), 2)
    return {
        "count": len(trades),
        "broker_filter": broker_key,
        "realized_net_pnl_inr": realized,
        "open_risk_inr": open_risk,
        "daily_drawdown_limit_inr": max_dd,
        "trades": trades,
    }


def build_parser(default_broker: str = "angel_one") -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Multi-Broker Indian Order Router & SQLite Paper Ledger Bridge")
    sub = p.add_subparsers(dest="command", required=True)

    sp_br = sub.add_parser("brokers", help="List all supported Indian brokers, fee profiles & auth env vars")
    sp_br.add_argument("--json", action="store_true")

    sp_sync = sub.add_parser("sync-scrip", help="Download or import broker instrument master into SQLite")
    sp_sync.add_argument("--broker", default=default_broker, help="Target broker (zerodha, angel_one, upstox, dhan, fyers, groww, kotak_neo, icici_breeze, shoonya)")
    sp_sync.add_argument("--offline", default=None, help="Local instrument JSON/CSV/.gz file path")
    sp_sync.add_argument("--state-dir", default=None)
    sp_sync.add_argument("--json", action="store_true")

    sp_lk = sub.add_parser("lookup", help="Resolve broker instrument token/symbol from SQLite cache")
    sp_lk.add_argument("--broker", default=default_broker)
    sp_lk.add_argument("--symbol", required=True)
    sp_lk.add_argument("--exchange", default="NSE")
    sp_lk.add_argument("--state-dir", default=None)
    sp_lk.add_argument("--json", action="store_true")

    sp_st = sub.add_parser("stage", help="Stage paper trade (default) or dispatch live broker order")
    sp_st.add_argument("--broker", default=default_broker)
    sp_st.add_argument("--symbol", required=True)
    sp_st.add_argument("--exchange", default="NSE")
    sp_st.add_argument("--segment", default="EQ_INTRADAY", choices=VALID_SEGMENTS)
    sp_st.add_argument("--side", default=None, choices=["buy", "sell"])
    sp_st.add_argument("--qty", type=int, default=None)
    sp_st.add_argument("--capital", type=float, default=50000.0)
    sp_st.add_argument("--risk-pct", type=float, default=1.0)
    sp_st.add_argument("--lot-size", type=int, default=1)
    sp_st.add_argument("--entry", type=float, required=True)
    sp_st.add_argument("--stop", type=float, required=True)
    sp_st.add_argument("--target", type=float, required=True)
    sp_st.add_argument("--risk-json", default=None, help="Verified risk_verdict.json from indian_risk_gate.py --write")
    sp_st.add_argument("--symboltoken", default=None)
    sp_st.add_argument("--order-type", default="LIMIT", choices=["LIMIT", "MARKET"])
    sp_st.add_argument("--non-robo", action="store_true", help="Use NORMAL intraday order instead of ROBO/BO bracket")
    sp_st.add_argument("--slippage-ticks", type=int, default=None)
    sp_st.add_argument("--paper", action="store_true", default=True, help="Log to local SQLite paper ledger (default)")
    sp_st.add_argument("--live", action="store_true", help="Dispatch live order via selected broker REST API")
    sp_st.add_argument("--confirm", default="", help='Must equal "CONFIRM LIVE" when --live is passed')
    sp_st.add_argument("--now", default=None)
    sp_st.add_argument("--state-dir", default=None)
    sp_st.add_argument("--json", action="store_true")

    sp_cl = sub.add_parser("close", help="Close an open paper trade and settle tax-adjusted P&L")
    sp_cl.add_argument("--trade-id", type=int, required=True)
    sp_cl.add_argument("--exit-price", type=float, required=True)
    sp_cl.add_argument("--reason", default="MANUAL")
    sp_cl.add_argument("--now", default=None)
    sp_cl.add_argument("--state-dir", default=None)
    sp_cl.add_argument("--json", action="store_true")

    sp_lg = sub.add_parser("ledger", help="Inspect SQLite paper trading ledger")
    sp_lg.add_argument("--date", default=None, help="Filter YYYY-MM-DD")
    sp_lg.add_argument("--broker", default=None, help="Optional broker filter")
    sp_lg.add_argument("--state-dir", default=None)
    sp_lg.add_argument("--json", action="store_true")

    return p


def _execute_cli_command(args: argparse.Namespace) -> dict[str, Any]:
    if args.command == "brokers":
        return list_supported_brokers()
    if args.command == "sync-scrip":
        return sync_scrip_master(
            offline_json=args.offline,
            state_dir=args.state_dir,
            broker=args.broker,
        )
    if args.command == "lookup":
        sdir = Path(args.state_dir) if args.state_dir else DEFAULT_STATE_DIR
        found = lookup_scrip(
            args.symbol,
            exchange=args.exchange,
            state_dir=sdir,
            broker=args.broker,
        )
        if not found:
            raise NSETraderError(
                f"Symbol {args.symbol} ({args.exchange}) for {args.broker} not found in ScripMaster cache"
            )
        return found
    if args.command == "stage":
        return stage_or_execute_order(
            symbol=args.symbol,
            entry=args.entry,
            stop=args.stop,
            target=args.target,
            segment=args.segment,
            exchange=args.exchange,
            broker=args.broker,
            side=args.side,
            qty=args.qty,
            capital_inr=args.capital,
            risk_pct=args.risk_pct,
            lot_size=args.lot_size,
            risk_json_path=args.risk_json,
            symboltoken=args.symboltoken,
            order_type=args.order_type,
            use_robo=not args.non_robo,
            slippage_ticks=args.slippage_ticks,
            live=bool(args.live),
            confirm_phrase=args.confirm,
            now_str=args.now,
            state_dir=args.state_dir,
        )
    if args.command == "close":
        return close_paper_trade(
            trade_id=args.trade_id,
            exit_price=args.exit_price,
            reason=args.reason,
            now_str=args.now,
            state_dir=args.state_dir,
        )
    if args.command == "ledger":
        return read_ledger(date_str=args.date, state_dir=args.state_dir, broker=args.broker)
    raise NSETraderError(f"Unknown command {args.command}")


def _fmt_broker_seg_fee(seg_cfg: dict[str, Any] | None, *, multiline: bool = True) -> str:
    if not seg_cfg:
        return "Default"
    mode = str(seg_cfg.get("brokerage_mode", "flat"))
    flat = float(seg_cfg.get("brokerage_flat_inr", 0.0))
    pct = float(seg_cfg.get("brokerage_pct", 0.0)) * 100.0
    min_f = float(seg_cfg.get("brokerage_min_inr", 0.0))
    if mode == "flat":
        return "Rs.0" if flat == 0 else f"Rs.{flat:.0f}"
    if mode == "pct":
        return f"{pct:.3g}%"
    if mode == "min_flat_or_pct":
        sep = "\n" if multiline else " "
        base = f"{pct:.3g}% (<={flat:.0f})"
        return f"{base}{sep}(min Rs.{min_f:.0f})" if min_f > 0 else base
    return f"Rs.{flat:.0f}"


def format_broker_output(command: str, out: dict[str, Any], color: bool | None = None) -> str:
    ui = UI(color=color)

    if command == "brokers":
        default_b = str(out.get("default_broker", "angel_one"))
        fee_rows: list[list[str]] = []
        env_rows: list[list[str]] = []
        for b in out.get("brokers") or []:
            key = str(b.get("broker", ""))
            tag = ui.green(f"{key} *", bold=True) if key == default_b else key
            brk = b.get("brokerage") or {}
            deliv = brk.get("EQ_DELIVERY") or {}
            dp = float(deliv.get("dp_charge_sell_inr") or 0.0)
            fut_s = _fmt_broker_seg_fee(brk.get("FNO_FUT"), multiline=False)
            opt_s = _fmt_broker_seg_fee(brk.get("FNO_OPT"), multiline=False)
            fee_rows.append(
                [
                    tag,
                    str(b.get("display_name", "")).replace(" (Trade Free Plan)", ""),
                    _fmt_broker_seg_fee(deliv),
                    _fmt_broker_seg_fee(brk.get("EQ_INTRADAY")),
                    f"F:{fut_s}\nO:{opt_s}",
                    f"Rs.{dp:.2f}",
                    "Yes" if b.get("requires_token_lookup") else "No",
                ]
            )
            env_rows.append(
                [
                    tag,
                    str(b.get("content_type", "application/json")),
                    ", ".join(b.get("env_vars") or []),
                ]
            )
        return "\n".join(
            [
                ui.banner(
                    title="SUPPORTED INDIAN BROKERS & 2026 FEE PROFILES",
                    subtitle=f"Default broker: {default_b} (*)  |  Total configured: {out.get('count', len(fee_rows))}",
                    badge=f"{len(fee_rows)} BROKERS",
                    badge_tone="info",
                    meta_lines=[ui.dim("Paper trading (--paper) is 100% free and needs ZERO broker API keys.")],
                ),
                "",
                ui.section("1. Brokerage & Fee Comparison (Values in INR / %)"),
                ui.table(
                    headers=["--broker", "Platform", "Delivery", "Intraday", "F&O (Fut/Opt)", "DP Sell", "Tok"],
                    rows=fee_rows,
                    alignments=["left", "left", "left", "left", "left", "right", "center"],
                    nowrap_cols={0, 2, 3, 4, 5, 6},
                ),
                "",
                ui.section("2. Live Mode Credentials (.env Keys -- Only Needed for --live)"),
                ui.table(
                    headers=["--broker", "API Format", "Required Local .env Variables"],
                    rows=env_rows,
                    alignments=["left", "left", "left"],
                    nowrap_cols={0, 1},
                    footer="Pass --broker <flag> to any command, or edit default_broker in config/trading_rules.json.",
                ),
            ]
        )

    if command == "sync-scrip":
        src = out.get("source")
        src_s = ", ".join(src) if isinstance(src, list) else str(src or "")
        return "\n".join(
            [
                ui.banner(
                    title=f"SCRIP MASTER SYNCED  {ui.dot_ch}  {out.get('broker', '')}",
                    badge=str(out.get("status", "SYNCED")),
                    badge_tone="pass",
                ),
                "",
                ui.kv_table(
                    [
                        ("Broker", str(out.get("broker", "")), "Broker instrument namespace in local cache."),
                        ("Instruments Cached", f"{int(out.get('instruments', 0)):,}", "Ready for <2ms offline token & lot lookups."),
                        ("Source", src_s, "Official broker master file or --offline path."),
                        ("SQLite DB", str(out.get("db_path", "")), "Local cache path."),
                    ],
                    headers=("Field", "Value", "Details"),
                ),
            ]
        )

    if command == "lookup":
        exp_val = str(out.get("expiry") or "").strip()
        strike_raw = str(out.get("strike") or "").strip()
        is_spot = not exp_val and strike_raw in ("", "-1", "-1.0", "0", "0.0")
        contract_s = "Spot Equity (No Expiry)" if is_spot else f"Expiry: {exp_val or '-'}  |  Strike: {strike_raw or '-'}"
        return "\n".join(
            [
                ui.banner(
                    title=f"INSTRUMENT TOKEN LOOKUP  {ui.dot_ch}  {out.get('symbol', '')} ({out.get('exch_seg', '')})",
                    subtitle=f"Broker: {out.get('broker', '')}  |  Lookup speed: {out.get('lookup_ms', 0)} ms",
                    badge="FOUND",
                    badge_tone="pass",
                ),
                "",
                ui.kv_table(
                    [
                        ("Trading Symbol", ui.bold(str(out.get("symbol", ""))), "Exact broker symbol sent in order payload."),
                        ("Broker Token", ui.cyan(str(out.get("token", ""))), f"Exchange segment: {out.get('exch_seg', '')}."),
                        ("Lot Size / Tick", f"{out.get('lotsize', 1)} qty  |  Rs. {float(out.get('tick_size', 0.05)):.2f}", "Minimum quantity multiple & price step."),
                        ("Contract / Series", f"{out.get('instrumenttype') or 'EQ'}  |  {contract_s}", "Equity spot vs F&O derivative contract details."),
                    ],
                    headers=("Attribute", "Resolved Value", "Beginner Guide"),
                ),
            ]
        )

    if command == "stage":
        mode = str(out.get("mode", "PAPER")).upper()
        is_paper = mode == "PAPER"
        payload = out.get("broker_payload") or out.get("payload") or {}
        has_attached_strip = "attached_stoploss_trigger" in payload or "attached_target_price" in payload

        blocks: list[str] = [
            ui.banner(
                title=f"{'PAPER ORDER STAGED' if is_paper else 'LIVE ORDER DISPATCHED'}  {ui.dot_ch}  {out.get('symbol', payload.get('tradingsymbol', ''))}",
                subtitle=f"Broker: {out.get('broker', '')}  |  Mode: {mode}  |  Fingerprint: {out.get('fingerprint', '')}",
                badge=str(out.get("status", mode)),
                badge_tone="info" if is_paper else "warn",
            ),
            "",
        ]
        if is_paper:
            blocks.append(ui.section("1. Paper Order Ticket (Simulated 1-Tick Slippage)"))
            blocks.append(
                ui.table(
                    headers=["ID", "Side", "Qty", "Entry (Rs.)", "Fill (+Slip)", "Stop (Rs.)", "Target (Rs.)", "Max Risk"],
                    rows=[
                        [
                            f"#{out.get('trade_id', '-')}",
                            ui.tone(str(out.get("side", "")).upper(), "good" if out.get("side") == "buy" else "bad", bold=True),
                            str(out.get("qty", 0)),
                            f"{float(out.get('planned_entry') or 0.0):,.2f}",
                            ui.bold(f"{float(out.get('filled_entry_with_slippage') or 0.0):,.2f}"),
                            ui.red(f"{float(out.get('stop_loss') or 0.0):,.2f}"),
                            ui.green(f"{float(out.get('target_price') or 0.0):,.2f}"),
                            ui.yellow(format_inr(out.get("max_risk_inr"))),
                        ]
                    ],
                    alignments=["center", "center", "right", "right", "right", "right", "right", "right"],
                    nowrap_cols={0, 1, 2, 3, 4, 5, 6, 7},
                    footer=f"Saved to SQLite paper ledger: {out.get('ledger_db', '')}",
                )
            )
            blocks.append("")
            blocks.append(
                ui.callout(
                    "Beginner Next Steps (Paper Trade Active)",
                    [
                        "Register SL, Target & 15:10 IST alerts: python scripts/nse_alerts.py add --from-ledger --ist-bell",
                        f"Close when target/stop hits: python scripts/broker_bridge.py close --trade-id {out.get('trade_id', 1)} --exit-price <PRICE> --reason TARGET",
                    ],
                    tone_name="info",
                )
            )
        else:
            blocks.append(ui.section("1. Live Dispatch Response"))
            blocks.append(
                ui.kv_table(
                    [
                        ("Broker", str(out.get("broker", ""))),
                        ("Status", str(out.get("status", ""))),
                        ("Session IST", str((out.get("session") or {}).get("ist_timestamp", ""))),
                        ("Broker Response", json.dumps(out.get("broker_response") or {})),
                    ],
                    headers=("Field", "Value"),
                )
            )

        if has_attached_strip:
            blocks.append("")
            blocks.append(
                ui.callout(
                    "Important Safety Note for Non-Bracket Live Orders",
                    [
                        "For non-ROBO/non-BO brokers, attached_stoploss_trigger & attached_target_price are recorded here for tracking ONLY and stripped on live entry dispatch.",
                        "Always place & verify a separate Stop-Loss / GTT / Target order directly inside your broker app!",
                    ],
                    tone_name="warn",
                )
            )

        blocks.append("")
        blocks.append(ui.section("2. Broker-Native Order Payload"))
        blocks.append(json.dumps(payload, indent=2))
        return "\n".join(blocks)

    if command == "close":
        net_pnl = float(out.get("realized_net_pnl_inr", 0.0))
        gross_pnl = float(out.get("gross_pnl_inr", 0.0))
        return "\n".join(
            [
                ui.banner(
                    title=f"PAPER TRADE CLOSED  {ui.dot_ch}  #{out.get('trade_id', '')} {out.get('symbol', '')}",
                    subtitle=f"Broker: {out.get('broker', '')}  |  Status: {out.get('status', '')}",
                    badge="PROFIT" if net_pnl > 0 else ("LOSS" if net_pnl < 0 else "FLAT"),
                    badge_tone="good" if net_pnl > 0 else ("bad" if net_pnl < 0 else "warn"),
                ),
                "",
                ui.table(
                    headers=["ID", "Symbol", "Qty", "Entry (Rs.)", "Exit (Rs.)", "Gross P&L", "Fees/Tax", "Net P&L"],
                    rows=[
                        [
                            f"#{out.get('trade_id', '')}",
                            ui.bold(str(out.get("symbol", ""))),
                            str(out.get("qty", 0)),
                            f"{float(out.get('filled_entry') or 0.0):,.2f}",
                            f"{float(out.get('exit_price') or 0.0):,.2f}",
                            ui.pnl_inr(gross_pnl, bold=False),
                            ui.red(f"-{format_inr(out.get('total_charges_inr'))}"),
                            ui.pnl_inr(net_pnl, bold=True),
                        ]
                    ],
                    alignments=["center", "left", "right", "right", "right", "right", "right", "right"],
                    nowrap_cols={0, 1, 2, 3, 4, 5, 6, 7},
                ),
            ]
        )

    if command == "ledger":
        trades = out.get("trades") or []
        realized = float(out.get("realized_net_pnl_inr", 0.0))
        open_risk = float(out.get("open_risk_inr", 0.0))
        dd_lim = float(out.get("daily_drawdown_limit_inr", 0.0))
        b_filter = out.get("broker_filter") or "ALL"
        used = max(0.0, -min(0.0, realized) + open_risk)
        dd_bar = ui.bar(used, dd_lim if dd_lim > 0 else 1.0, width=16, tone_name="warn" if used < dd_lim else "bad")

        blocks = [
            ui.banner(
                title="PAPER TRADING LEDGER & DAILY RISK BUDGET",
                subtitle=f"Broker Filter: {b_filter}  |  Trades Shown: {out.get('count', len(trades))}",
                badge=f"NET {format_inr(realized, signed=True)}",
                badge_tone="good" if realized > 0 else ("bad" if realized < 0 else "info"),
                meta_lines=[
                    f"Realized P&L: {ui.pnl_inr(realized)}  |  Open Risk: {ui.yellow(format_inr(open_risk))}  |  DD Limit: {format_inr(dd_lim)}",
                    f"Daily Risk Budget Used: [{dd_bar}] {format_inr(used)} / {format_inr(dd_lim)}",
                ],
            ),
            "",
        ]
        if not trades:
            blocks.append(
                ui.callout(
                    "Ledger Empty",
                    [
                        "No paper trades recorded yet for this filter.",
                        "Stage your first risk-free trade with broker_bridge.py stage ... --paper after passing the Risk Gate.",
                    ],
                    tone_name="info",
                )
            )
            return "\n".join(blocks)

        t_rows: list[list[str]] = []
        for t in trades:
            st = str(t.get("status", ""))
            is_open = st == "OPEN"
            side_s = str(t.get("side", "")).upper()
            side_qty = ui.tone(f"{side_s} {t.get('qty', 0)}", "good" if side_s == "BUY" else "bad", bold=True)
            entry_v = float(t.get("filled_entry") or 0.0)
            plan_s = (
                f"{entry_v:,.2f}\nSL {t['stop_loss']:.2f} | TP {t['target_price']:.2f}"
                if is_open
                else f"{entry_v:,.2f} -> {float(t.get('exit_price') or 0.0):,.2f}"
            )
            pnl_s = (
                ui.yellow(f"OPEN\nRisk {format_inr(t.get('max_risk_inr'))}")
                if is_open
                else f"{ui.pnl_inr(t.get('realized_net_pnl_inr'))}\n{ui.dim(st)}"
            )
            t_rows.append(
                [
                    f"#{t.get('id', '')}",
                    str(t.get("trade_date", "")),
                    str(t.get("broker", "")),
                    ui.bold(str(t.get("symbol", ""))),
                    side_qty,
                    plan_s,
                    pnl_s,
                ]
            )
        blocks.append(
            ui.table(
                headers=["ID", "Date", "Broker", "Symbol", "Side/Qty", "Prices (Rs.)", "Status & Net P&L"],
                rows=t_rows,
                alignments=["center", "left", "left", "left", "left", "left", "left"],
                nowrap_cols={0, 1, 2, 3, 4, 5, 6},
            )
        )
        return "\n".join(blocks)

    return json.dumps(out, indent=2)


def main(argv: list[str] | None = None, default_broker: str = "angel_one") -> int:
    args = build_parser(default_broker=default_broker).parse_args(argv)
    try:
        out = _execute_cli_command(args)
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if getattr(args, "json", False) else f"ERROR: {exc}", file=sys.stderr)
        return 1

    if getattr(args, "json", False):
        print(json.dumps(out, indent=2))
    else:
        safe_print(format_broker_output(args.command, out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
