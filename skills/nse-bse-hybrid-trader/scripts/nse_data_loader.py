#!/usr/bin/env python3
"""Multi-timeframe NSE/BSE technical & market-structure loader.
Standard library only. Supports live Yahoo Finance data or offline chart JSON files.

Usage:
    python scripts/nse_data_loader.py --symbol RELIANCE.NS
    python scripts/nse_data_loader.py --symbol NIFTY --json
    python scripts/nse_data_loader.py --symbol TATAMOTORS.NS --offline-5m path/to/5m.json --offline-1d path/to/1d.json
"""

from __future__ import annotations

import argparse
import datetime
import json
import statistics
import sys
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from nse_common import (
    NSETraderError,
    extract_chart_result,
    fetch_yahoo_chart,
    load_nse_holidays,
    load_trading_rules,
    normalize_symbol,
    nse_session_info,
    parse_now_ist,
    read_offline_chart,
    round_stop_away,
    round_tick,
    to_ist,
    utc_of,
)
from nse_news import fetch_indian_news
from nse_ui import UI, format_inr, safe_print

NSE_SESSION_BARS = 75  # 09:15 to 15:25 IST (5-minute bars)
NSE_OPEN_MIN = 9 * 60 + 15


def parse_bars_from_chart(
    result: dict[str, Any],
    interval: str = "5m",
    now_ist: datetime.datetime | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    meta = result.get("meta") or {}
    stamps = result.get("timestamp") or []
    quote = ((result.get("indicators") or {}).get("quote") or [{}])[0] or {}
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    vols = quote.get("volume") or []

    bars: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for idx, ts in enumerate(stamps):
        if ts is None:
            continue
        op = opens[idx] if idx < len(opens) else None
        hi = highs[idx] if idx < len(highs) else None
        lo = lows[idx] if idx < len(lows) else None
        cl = closes[idx] if idx < len(closes) else None
        vol = vols[idx] if idx < len(vols) else 0
        if op is None or hi is None or lo is None or cl is None:
            continue
        dt_ist = to_ist(utc_of(ts))
        if interval == "5m":
            if int(ts) % 300 != 0:
                continue
            mins = dt_ist.hour * 60 + dt_ist.minute - NSE_OPEN_MIN
            if mins < 0 or mins >= NSE_SESSION_BARS * 5:
                continue
            if now_ist is not None and dt_ist + datetime.timedelta(minutes=5) > now_ist:
                continue
            key = dt_ist.strftime("%Y-%m-%d %H:%M")
            if key in seen_keys:
                continue
            seen_keys.add(key)
            bars.append(
                {
                    "ts": int(ts),
                    "date": dt_ist.date().isoformat(),
                    "time": dt_ist.strftime("%H:%M"),
                    "slot": mins // 5,
                    "o": float(op),
                    "h": float(hi),
                    "l": float(lo),
                    "c": float(cl),
                    "v": float(vol or 0),
                }
            )
        else:
            key = dt_ist.date().isoformat()
            if key in seen_keys:
                continue
            seen_keys.add(key)
            bars.append(
                {
                    "ts": int(ts),
                    "date": key,
                    "o": float(op),
                    "h": float(hi),
                    "l": float(lo),
                    "c": float(cl),
                    "v": float(vol or 0),
                }
            )
    bars.sort(key=lambda b: b["ts"])
    return meta, bars


def aggregate_5m_to_15m(bars_5m: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for b in bars_5m:
        bucket = b["slot"] // 3
        grouped.setdefault((b["date"], bucket), []).append(b)
    out: list[dict[str, Any]] = []
    for (day, bucket) in sorted(grouped):
        chunk = grouped[(day, bucket)]
        mins = NSE_OPEN_MIN + bucket * 15
        out.append(
            {
                "date": day,
                "time": f"{mins // 60:02d}:{mins % 60:02d}",
                "o": chunk[0]["o"],
                "h": max(x["h"] for x in chunk),
                "l": min(x["l"] for x in chunk),
                "c": chunk[-1]["c"],
                "v": sum(x["v"] for x in chunk),
                "complete": len(chunk) == 3,
            }
        )
    return out


# ---------------------------------------------------------------- indicators (pure stdlib)

def calc_sma(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    return round(sum(values[-period:]) / period, 4)


def calc_ema_series(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    k = 2.0 / (period + 1)
    ema = [values[0]]
    for v in values[1:]:
        ema.append(v * k + ema[-1] * (1.0 - k))
    return ema


def calc_rsi_series(closes: list[float], period: int = 14) -> list[float | None]:
    n = len(closes)
    out: list[float | None] = [None] * n
    if n <= period:
        return out
    gains, losses = [], []
    for i in range(1, period + 1):
        delta = closes[i] - closes[i - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    out[period] = 100.0 if avg_loss == 0 else 100.0 - (100.0 / (1.0 + avg_gain / avg_loss))
    for i in range(period + 1, n):
        delta = closes[i] - closes[i - 1]
        gain = max(delta, 0.0)
        loss = max(-delta, 0.0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        out[i] = 100.0 if avg_loss == 0 else 100.0 - (100.0 / (1.0 + avg_gain / avg_loss))
    return [round(x, 2) if x is not None else None for x in out]


def calc_atr(bars: list[dict[str, Any]], period: int = 14) -> float | None:
    if len(bars) < period + 1:
        return None
    trs: list[float] = []
    for i in range(1, len(bars)):
        hi, lo, pc = bars[i]["h"], bars[i]["l"], bars[i - 1]["c"]
        trs.append(max(hi - lo, abs(hi - pc), abs(lo - pc)))
    atr = sum(trs[:period]) / period
    for tr in trs[period:]:
        atr = (atr * (period - 1) + tr) / period
    return round(atr, 4)


def calc_macd(closes: list[float]) -> dict[str, float | None]:
    if len(closes) < 35:
        return {"macd": None, "signal": None, "histogram": None}
    ema12 = calc_ema_series(closes, 12)
    ema26 = calc_ema_series(closes, 26)
    macd_line = [a - b for a, b in zip(ema12, ema26, strict=True)]
    signal_line = calc_ema_series(macd_line, 9)
    hist = macd_line[-1] - signal_line[-1]
    return {
        "macd": round(macd_line[-1], 4),
        "signal": round(signal_line[-1], 4),
        "histogram": round(hist, 4),
    }


def calc_bollinger(closes: list[float], period: int = 20, mult: float = 2.0) -> dict[str, float | None]:
    if len(closes) < period:
        return {"upper": None, "middle": None, "lower": None, "pct_b": None}
    window = closes[-period:]
    mid = sum(window) / period
    std = statistics.pstdev(window)
    upper = mid + mult * std
    lower = mid - mult * std
    pct_b = (closes[-1] - lower) / (upper - lower) if upper > lower else 0.5
    return {
        "upper": round(upper, 2),
        "middle": round(mid, 2),
        "lower": round(lower, 2),
        "pct_b": round(pct_b, 3),
    }


def calc_adx(bars: list[dict[str, Any]], period: int = 14) -> dict[str, float | None]:
    if len(bars) < period * 2 + 2:
        return {"adx": None, "plus_di": None, "minus_di": None}
    trs, plus_dms, minus_dms = [], [], []
    for i in range(1, len(bars)):
        up = bars[i]["h"] - bars[i - 1]["h"]
        down = bars[i - 1]["l"] - bars[i]["l"]
        plus_dms.append(up if (up > down and up > 0) else 0.0)
        minus_dms.append(down if (down > up and down > 0) else 0.0)
        pc = bars[i - 1]["c"]
        trs.append(max(bars[i]["h"] - bars[i]["l"], abs(bars[i]["h"] - pc), abs(bars[i]["l"] - pc)))

    sm_tr = sum(trs[:period])
    sm_plus = sum(plus_dms[:period])
    sm_minus = sum(minus_dms[:period])
    dxs: list[float] = []
    plus_di = 0.0
    minus_di = 0.0
    for i in range(period, len(trs)):
        sm_tr = sm_tr - (sm_tr / period) + trs[i]
        sm_plus = sm_plus - (sm_plus / period) + plus_dms[i]
        sm_minus = sm_minus - (sm_minus / period) + minus_dms[i]
        if sm_tr == 0:
            continue
        plus_di = 100.0 * (sm_plus / sm_tr)
        minus_di = 100.0 * (sm_minus / sm_tr)
        denom = plus_di + minus_di
        dxs.append(100.0 * abs(plus_di - minus_di) / denom if denom > 0 else 0.0)
    if len(dxs) < period:
        return {"adx": None, "plus_di": round(plus_di, 2), "minus_di": round(minus_di, 2)}
    adx = sum(dxs[:period]) / period
    for dx in dxs[period:]:
        adx = (adx * (period - 1) + dx) / period
    return {"adx": round(adx, 2), "plus_di": round(plus_di, 2), "minus_di": round(minus_di, 2)}


def detect_rsi_divergences(bars: list[dict[str, Any]], rsi_series: list[float | None], lookback: int = 60) -> list[str]:
    if len(bars) < 30 or len(bars) != len(rsi_series):
        return []
    start = max(14, len(bars) - lookback)
    swing_lows: list[tuple[int, float, float]] = []
    swing_highs: list[tuple[int, float, float]] = []
    for i in range(start + 2, len(bars) - 2):
        r = rsi_series[i]
        if r is None:
            continue
        if bars[i]["l"] < bars[i - 1]["l"] and bars[i]["l"] < bars[i - 2]["l"] and bars[i]["l"] < bars[i + 1]["l"] and bars[i]["l"] < bars[i + 2]["l"]:
            swing_lows.append((i, bars[i]["l"], r))
        if bars[i]["h"] > bars[i - 1]["h"] and bars[i]["h"] > bars[i - 2]["h"] and bars[i]["h"] > bars[i + 1]["h"] and bars[i]["h"] > bars[i + 2]["h"]:
            swing_highs.append((i, bars[i]["h"], r))

    flags: list[str] = []
    if len(swing_lows) >= 2:
        (_, p1, r1), (_, p2, r2) = swing_lows[-2], swing_lows[-1]
        if p2 < p1 and r2 > r1 + 1.5:
            flags.append(f"REGULAR_BULLISH (Price {p1:.2f}->{p2:.2f}, RSI {r1:.1f}->{r2:.1f})")
        elif p2 > p1 and r2 < r1 - 1.5:
            flags.append(f"HIDDEN_BULLISH (Price {p1:.2f}->{p2:.2f}, RSI {r1:.1f}->{r2:.1f})")
    if len(swing_highs) >= 2:
        (_, p1, r1), (_, p2, r2) = swing_highs[-2], swing_highs[-1]
        if p2 > p1 and r2 < r1 - 1.5:
            flags.append(f"REGULAR_BEARISH (Price {p1:.2f}->{p2:.2f}, RSI {r1:.1f}->{r2:.1f})")
        elif p2 < p1 and r2 > r1 + 1.5:
            flags.append(f"HIDDEN_BEARISH (Price {p1:.2f}->{p2:.2f}, RSI {r1:.1f}->{r2:.1f})")
    return flags


def compute_fibonacci(bars_daily: list[dict[str, Any]], tick: float = 0.05, lookback: int = 60) -> dict[str, Any]:
    window = bars_daily[-lookback:] if len(bars_daily) > lookback else bars_daily
    if not window:
        return {}
    hi_idx = max(range(len(window)), key=lambda i: window[i]["h"])
    lo_idx = min(range(len(window)), key=lambda i: window[i]["l"])
    swing_high = window[hi_idx]["h"]
    swing_low = window[lo_idx]["l"]
    diff = swing_high - swing_low
    if diff <= 0:
        return {}
    direction = "UPSWING" if lo_idx < hi_idx else "DOWNSWING"
    last_close = window[-1]["c"]

    if direction == "UPSWING":
        retr = {
            "23.6%": round_tick(swing_high - diff * 0.236, tick),
            "38.2%": round_tick(swing_high - diff * 0.382, tick),
            "50.0%": round_tick(swing_high - diff * 0.500, tick),
            "61.8%": round_tick(swing_high - diff * 0.618, tick),
            "78.6%": round_tick(swing_high - diff * 0.786, tick),
        }
        ext = {
            "127.2%": round_tick(swing_low + diff * 1.272, tick),
            "161.8%": round_tick(swing_low + diff * 1.618, tick),
        }
        in_golden_pocket = retr["61.8%"] <= last_close <= retr["50.0%"]
    else:
        retr = {
            "23.6%": round_tick(swing_low + diff * 0.236, tick),
            "38.2%": round_tick(swing_low + diff * 0.382, tick),
            "50.0%": round_tick(swing_low + diff * 0.500, tick),
            "61.8%": round_tick(swing_low + diff * 0.618, tick),
            "78.6%": round_tick(swing_low + diff * 0.786, tick),
        }
        ext = {
            "127.2%": round_tick(swing_high - diff * 1.272, tick),
            "161.8%": round_tick(swing_high - diff * 1.618, tick),
        }
        in_golden_pocket = retr["50.0%"] <= last_close <= retr["61.8%"]

    return {
        "direction": direction,
        "swing_high": round_tick(swing_high, tick),
        "swing_high_date": window[hi_idx]["date"],
        "swing_low": round_tick(swing_low, tick),
        "swing_low_date": window[lo_idx]["date"],
        "retracements": retr,
        "extensions": ext,
        "in_golden_pocket_50_618": in_golden_pocket,
    }


def compute_intraday_structure(bars_5m: list[dict[str, Any]], tick: float = 0.05) -> dict[str, Any]:
    if not bars_5m:
        return {}
    by_day: dict[str, list[dict[str, Any]]] = {}
    for b in bars_5m:
        by_day.setdefault(b["date"], []).append(b)
    latest_day = max(by_day)
    session = sorted(by_day[latest_day], key=lambda x: x["slot"])

    or_bars = [b for b in session if b["slot"] in (0, 1, 2)]
    orh = round_tick(max(b["h"] for b in or_bars), tick) if or_bars else None
    orl = round_tick(min(b["l"] for b in or_bars), tick) if or_bars else None

    cum_pv = 0.0
    cum_vol = 0.0
    for b in session:
        tp = (b["h"] + b["l"] + b["c"]) / 3.0
        vol = b["v"] if b["v"] > 0 else 1.0
        cum_pv += tp * vol
        cum_vol += vol
    vwap = round_tick(cum_pv / cum_vol, tick) if cum_vol > 0 else None

    last_bar = session[-1]
    last_price = round_tick(last_bar["c"], tick)
    orb_status = "FORMING"
    if len(or_bars) >= 3 and orh is not None and orl is not None:
        if last_price > orh:
            orb_status = "ABOVE_ORH"
        elif last_price < orl:
            orb_status = "BELOW_ORL"
        else:
            orb_status = "INSIDE_OR"

    vwap_bias = "ABOVE_VWAP" if (vwap is not None and last_price >= vwap) else "BELOW_VWAP"
    bars_15m = aggregate_5m_to_15m(session)
    all_15m = aggregate_5m_to_15m(bars_5m)
    atr14_15m = calc_atr(all_15m[-60:], 14)

    return {
        "session_date": latest_day,
        "bars_count_5m": len(session),
        "last_bar_time_ist": last_bar["time"],
        "ltp": last_price,
        "day_high": round_tick(max(b["h"] for b in session), tick),
        "day_low": round_tick(min(b["l"] for b in session), tick),
        "opening_range_15m": {"orh": orh, "orl": orl, "status": orb_status},
        "anchored_vwap": vwap,
        "vwap_bias": vwap_bias,
        "vwap_diff_pct": round(((last_price - vwap) / vwap) * 100.0, 2) if vwap else None,
        "atr14_15m": round(atr14_15m, 2) if atr14_15m else None,
        "recent_15m_bars": bars_15m[-5:],
    }


def score_confluence_and_setup(
    daily_ctx: dict[str, Any],
    weekly_ctx: dict[str, Any],
    intraday_ctx: dict[str, Any],
    fib_ctx: dict[str, Any],
    div_flags: list[str],
    tick: float = 0.05,
    delivery_pct: float | None = None,
) -> dict[str, Any]:
    ltp = intraday_ctx.get("ltp") or daily_ctx.get("close")
    if ltp is None:
        raise NSETraderError("Cannot score confluence without valid LTP or daily close price")
    ema20 = daily_ctx.get("ema20")
    ema50 = daily_ctx.get("ema50")
    ema200 = daily_ctx.get("ema200")
    rsi_d = daily_ctx.get("rsi14")
    macd_hist = (daily_ctx.get("macd") or {}).get("histogram")
    adx_d = (daily_ctx.get("adx") or {}).get("adx")
    rvol = daily_ctx.get("relative_volume")
    atr = daily_ctx.get("atr14") or (ltp * 0.015 if ltp else 10.0)

    weekly_bull = weekly_ctx.get("bias") == "BULLISH"
    weekly_bear = weekly_ctx.get("bias") == "BEARISH"
    daily_bull = bool(ema20 and ema50 and ltp and ltp > ema20 and ema20 > ema50)
    daily_bear = bool(ema20 and ema50 and ltp and ltp < ema20 and ema20 < ema50)

    bull_pts = 0
    bear_pts = 0
    bull_reasons, bear_reasons = [], []

    if weekly_bull or daily_bull:
        bull_pts += 1
        bull_reasons.append("HTF trend aligned bullish")
    if weekly_bear or daily_bear:
        bear_pts += 1
        bear_reasons.append("HTF trend aligned bearish")

    orb_status = (intraday_ctx.get("opening_range_15m") or {}).get("status")
    vwap_bias = intraday_ctx.get("vwap_bias")
    if orb_status == "ABOVE_ORH" or vwap_bias == "ABOVE_VWAP":
        bull_pts += 1
        bull_reasons.append(f"Intraday structure supportive ({orb_status}, {vwap_bias})")
    if orb_status == "BELOW_ORL" or vwap_bias == "BELOW_VWAP":
        bear_pts += 1
        bear_reasons.append(f"Intraday structure weak ({orb_status}, {vwap_bias})")

    if (rsi_d is not None and rsi_d >= 50) or any("BULLISH" in f for f in div_flags):
        bull_pts += 1
        bull_reasons.append(f"RSI(14)={rsi_d} supportive")
    if (rsi_d is not None and rsi_d <= 50) or any("BEARISH" in f for f in div_flags):
        bear_pts += 1
        bear_reasons.append(f"RSI(14)={rsi_d} bearish")

    adx_dict = daily_ctx.get("adx") or {}
    plus_di = float(adx_dict.get("plus_di") or 0.0)
    minus_di = float(adx_dict.get("minus_di") or 0.0)
    if (macd_hist is not None and macd_hist > 0) or (adx_d is not None and adx_d >= 25 and plus_di > minus_di):
        bull_pts += 1
        bull_reasons.append("MACD/ADX momentum positive")
    if (macd_hist is not None and macd_hist < 0) or (adx_d is not None and adx_d >= 25 and minus_di > plus_di):
        bear_pts += 1
        bear_reasons.append("MACD/ADX momentum negative")

    if fib_ctx.get("in_golden_pocket_50_618") or (ema200 and ltp and ltp > ema200):
        bull_pts += 1
        bull_reasons.append("Fib/Major EMA support context")
    if fib_ctx.get("in_golden_pocket_50_618") or (ema200 and ltp and ltp < ema200):
        bear_pts += 1
        bear_reasons.append("Fib/Major EMA resistance context")

    vol_ok = (rvol is not None and rvol >= 1.2) or (delivery_pct is not None and delivery_pct >= 50.0)
    if vol_ok:
        if bull_pts >= bear_pts:
            bull_pts += 1
            bull_reasons.append(f"Volume/Delivery confirmation (RVOL={rvol}, Deliv={delivery_pct}%)")
        else:
            bear_pts += 1
            bear_reasons.append(f"Volume/Delivery confirmation (RVOL={rvol}, Deliv={delivery_pct}%)")

    bias = "BULLISH" if bull_pts > bear_pts else "BEARISH" if bear_pts > bull_pts else "NEUTRAL"
    score = max(bull_pts, bear_pts)
    side = "sell" if bias == "BEARISH" else "buy"

    # Candidate intraday levels scaled by 15m ATR (can be overridden by trader judgment)
    orh = (intraday_ctx.get("opening_range_15m") or {}).get("orh")
    orl = (intraday_ctx.get("opening_range_15m") or {}).get("orl")
    vwap = intraday_ctx.get("anchored_vwap")
    intra_atr = intraday_ctx.get("atr14_15m") or (0.25 * atr)

    entry = round_tick(ltp, tick)
    if side == "buy":
        anchors = [x for x in (orl, vwap) if x is not None and x < entry]
        nearest_anchor = max(anchors) if anchors else (entry - intra_atr)
        raw_stop = min(nearest_anchor - tick, entry - max(tick * 4, 1.0 * intra_atr))
        stop = round_stop_away(raw_stop, "buy", tick)
        risk = max(tick, entry - stop)
        target_1 = round_tick(entry + 1.6 * risk, tick, mode="up")
        target_2 = round_tick(entry + 2.5 * risk, tick, mode="up")
    else:
        anchors = [x for x in (orh, vwap) if x is not None and x > entry]
        nearest_anchor = min(anchors) if anchors else (entry + intra_atr)
        raw_stop = max(nearest_anchor + tick, entry + max(tick * 4, 1.0 * intra_atr))
        stop = round_stop_away(raw_stop, "sell", tick)
        risk = max(tick, stop - entry)
        target_1 = round_tick(entry - 1.6 * risk, tick, mode="down")
        target_2 = round_tick(entry - 2.5 * risk, tick, mode="down")

    return {
        "bias": bias,
        "bull_score": bull_pts,
        "bear_score": bear_pts,
        "active_confluence_score": score,
        "score_out_of": 6,
        "reasons": bull_reasons if side == "buy" else bear_reasons,
        "candidate_setup": {
            "side": side,
            "entry": entry,
            "stop_loss": stop,
            "target_1": target_1,
            "target_2": target_2,
            "risk_per_share": round(risk, 2),
        },
    }


def analyze_symbol(
    symbol: str,
    exchange: str = "NSE",
    now_str: str | None = None,
    offline_5m: str | None = None,
    offline_1d: str | None = None,
    offline_1wk: str | None = None,
    delivery_pct: float | None = None,
    circuit_band_pct: float | None = None,
    fno_ban: bool = False,
    asm_gsm: bool = False,
    with_news: bool = False,
    news_hours: int = 72,
    offline_news: str | None = None,
) -> dict[str, Any]:
    rules = load_trading_rules()
    holidays = load_nse_holidays()
    tick = rules["session_ist"]["tick_size_inr"]
    dt_ist = parse_now_ist(now_str)
    session_info = nse_session_info(dt_ist, rules=rules, holidays_cfg=holidays)
    sym_info = normalize_symbol(symbol, default_exchange=exchange)
    yahoo_sym = sym_info["yahoo"]

    raw_5m = read_offline_chart(offline_5m, yahoo_sym) if offline_5m else fetch_yahoo_chart(yahoo_sym, range_="60d", interval="5m")
    raw_1d = read_offline_chart(offline_1d, yahoo_sym) if offline_1d else fetch_yahoo_chart(yahoo_sym, range_="1y", interval="1d")
    raw_1wk = read_offline_chart(offline_1wk, yahoo_sym) if offline_1wk else fetch_yahoo_chart(yahoo_sym, range_="2y", interval="1wk")

    meta_5m, bars_5m = parse_bars_from_chart(extract_chart_result(raw_5m, yahoo_sym), "5m")
    _, bars_1d = parse_bars_from_chart(extract_chart_result(raw_1d, yahoo_sym), "1d")
    _, bars_1wk = parse_bars_from_chart(extract_chart_result(raw_1wk, yahoo_sym), "1wk")

    if len(bars_1d) < 30:
        raise NSETraderError(f"Insufficient daily candles ({len(bars_1d)}) for {yahoo_sym}")

    # Previous completed day vs current/latest day
    latest_5m_date = bars_5m[-1]["date"] if bars_5m else None
    completed_daily = [b for b in bars_1d if b["date"] != latest_5m_date] if latest_5m_date else bars_1d[:-1]
    prev_day = completed_daily[-1] if completed_daily else bars_1d[-2]

    closes_1d = [b["c"] for b in bars_1d]
    vols_1d = [b["v"] for b in bars_1d]
    ema20 = round(calc_ema_series(closes_1d, 20)[-1], 2)
    ema50 = round(calc_ema_series(closes_1d, 50)[-1], 2)
    ema200 = round(calc_ema_series(closes_1d, 200)[-1], 2) if len(closes_1d) >= 200 else None
    sma20 = calc_sma(closes_1d, 20)
    sma50 = calc_sma(closes_1d, 50)
    sma200 = calc_sma(closes_1d, 200)
    rsi_series_1d = calc_rsi_series(closes_1d, 14)
    atr14 = calc_atr(bars_1d, 14)
    macd_1d = calc_macd(closes_1d)
    bb_1d = calc_bollinger(closes_1d)
    adx_1d = calc_adx(bars_1d, 14)
    avg_vol_20 = sum(vols_1d[-21:-1]) / 20.0 if len(vols_1d) >= 21 and sum(vols_1d[-21:-1]) > 0 else None
    rvol = round(vols_1d[-1] / avg_vol_20, 2) if avg_vol_20 else None

    intraday_ctx = compute_intraday_structure(bars_5m, tick=tick)
    ltp = intraday_ctx.get("ltp") or round_tick(closes_1d[-1], tick)
    pdc = round_tick(prev_day["c"], tick)
    pct_change_from_pdc = round(((ltp - pdc) / pdc) * 100.0, 2) if pdc else None

    # Weekly context
    closes_1wk = [b["c"] for b in bars_1wk]
    sma20_w = calc_sma(closes_1wk, 20)
    sma50_w = calc_sma(closes_1wk, 50)
    rsi_w = calc_rsi_series(closes_1wk, 14)[-1] if len(closes_1wk) > 14 else None
    weekly_bias = "NEUTRAL"
    if sma20_w and closes_1wk:
        if closes_1wk[-1] > sma20_w and (rsi_w is None or rsi_w >= 50):
            weekly_bias = "BULLISH"
        elif closes_1wk[-1] < sma20_w and (rsi_w is None or rsi_w <= 50):
            weekly_bias = "BEARISH"

    weekly_ctx = {
        "bias": weekly_bias,
        "close": round_tick(closes_1wk[-1], tick) if closes_1wk else None,
        "sma20_w": round(sma20_w, 2) if sma20_w else None,
        "sma50_w": round(sma50_w, 2) if sma50_w else None,
        "rsi14_w": rsi_w,
    }

    daily_ctx = {
        "latest_date": bars_1d[-1]["date"],
        "close": round_tick(closes_1d[-1], tick),
        "pdh": round_tick(prev_day["h"], tick),
        "pdl": round_tick(prev_day["l"], tick),
        "pdc": pdc,
        "pct_change_from_pdc": pct_change_from_pdc,
        "ema20": ema20,
        "ema50": ema50,
        "ema200": ema200,
        "sma20": round(sma20, 2) if sma20 else None,
        "sma50": round(sma50, 2) if sma50 else None,
        "sma200": round(sma200, 2) if sma200 else None,
        "rsi14": rsi_series_1d[-1],
        "atr14": round(atr14, 2) if atr14 else None,
        "macd": macd_1d,
        "bollinger": bb_1d,
        "adx": adx_1d,
        "relative_volume": rvol,
    }

    fib_ctx = compute_fibonacci(bars_1d, tick=tick)
    div_flags = detect_rsi_divergences(bars_1d, rsi_series_1d)
    confluence = score_confluence_and_setup(
        daily_ctx, weekly_ctx, intraday_ctx, fib_ctx, div_flags, tick=tick, delivery_pct=delivery_pct
    )

    news_section: dict[str, Any] | None = None
    effective_fno_ban = fno_ban
    if with_news:
        try:
            n_res = fetch_indian_news(
                tickers=[sym_info["base"]],
                hours=news_hours,
                include_reg=True,
                include_moves=False,
                market_mode=False,
                show_all=True,
                max_per_ticker=5,
                now_str=now_str,
                offline_dir=offline_news,
                write_state=False,
            )
            t_entry = (n_res.get("tickers") or [{}])[0]
            if t_entry.get("in_fno_ban"):
                effective_fno_ban = True
            news_section = {
                "available": True,
                "hours_lookback": news_hours,
                "in_fno_ban": bool(t_entry.get("in_fno_ban")),
                "flags": t_entry.get("flags") or [],
                "items": t_entry.get("items") or [],
                "regulatory_alerts": n_res.get("regulatory_alerts") or [],
                "warnings": n_res.get("warnings") or [],
            }
        except (NSETraderError, OSError) as exc:
            news_section = {"available": False, "error": str(exc), "items": []}

    # Regulatory & circuit warnings
    reg_warnings: list[str] = []
    if effective_fno_ban:
        reg_warnings.append("F&O BAN (>95% MWPL): Fresh F&O entries blocked")
    if asm_gsm:
        reg_warnings.append("SEBI ASM/GSM Surveillance: Intraday MIS/BO margin restricted")
    if circuit_band_pct and pct_change_from_pdc is not None:
        if abs(pct_change_from_pdc) >= (circuit_band_pct - rules["session_ist"]["circuit_proximity_block_pct"]):
            reg_warnings.append(
                f"CIRCUIT PROXIMITY: Move {pct_change_from_pdc:+.2f}% is within 1% of {circuit_band_pct}% band"
            )
    elif pct_change_from_pdc is not None and abs(pct_change_from_pdc) >= 4.5:
        reg_warnings.append(f"Large move from PDC ({pct_change_from_pdc:+.2f}%): verify circuit band (5%/10%/20%)")

    report: dict[str, Any] = {
        "symbol": sym_info,
        "meta_exchange": meta_5m.get("exchangeName") or sym_info["exchange"],
        "currency": meta_5m.get("currency") or "INR",
        "session": session_info,
        "regulatory": {
            "fno_ban": effective_fno_ban,
            "asm_gsm": asm_gsm,
            "circuit_band_pct": circuit_band_pct,
            "delivery_pct": delivery_pct,
            "warnings": reg_warnings,
        },
        "weekly": weekly_ctx,
        "daily": daily_ctx,
        "intraday": intraday_ctx,
        "fibonacci": fib_ctx,
        "rsi_divergences": div_flags,
        "confluence": confluence,
    }
    if news_section is not None:
        report["news"] = news_section
    return report


def _phase_beginner_tip(phase: str) -> str:
    tips = {
        "PRE_OPEN": "Order matching (09:00-09:15 IST) - wait for 09:30 before entering.",
        "OPENING_RANGE": "First 15m discovery (09:15-09:30 IST) - watch ORH/ORL form, do not chase.",
        "PRIMARY_EXECUTION": "Best intraday window (09:30-14:30 IST) - liquid & trend-friendly.",
        "HAZARD_WINDOW_NO_NEW_ENTRY": "Late session (14:30-15:10 IST) - no new intraday entries; protect profits.",
        "AUTO_SQUAREOFF_ZONE": "Broker square-off zone (15:10-15:30 IST) - exit open intraday trades now.",
        "POST_MARKET": "Market closed - ideal for planning tomorrow's swing/intraday levels.",
        "CLOSED_WEEKEND": "Weekend - NSE/BSE closed; analysis uses latest completed session.",
        "CLOSED_HOLIDAY": "Exchange holiday - NSE/BSE closed; verify next trading session.",
    }
    return tips.get(phase, "Check IST session phase before placing orders.")


def _rsi_zone_label(rsi: float | None) -> str:
    if rsi is None:
        return "N/A"
    if rsi >= 70:
        return "OVERBOUGHT (>=70)"
    if rsi >= 55:
        return "BULLISH (55-70)"
    if rsi >= 45:
        return "NEUTRAL (45-55)"
    if rsi >= 30:
        return "BEARISH (30-45)"
    return "OVERSOLD (<30)"


def format_human_report(data: dict[str, Any], color: bool | None = None) -> str:
    ui = UI(color=color)
    s = data["symbol"]
    sess = data["session"]
    d = data["daily"]
    w = data["weekly"]
    intra = data.get("intraday") or {}
    conf = data["confluence"]
    cand = conf["candidate_setup"]
    fib = data.get("fibonacci") or {}
    ltp_val = intra.get("ltp") if intra.get("ltp") is not None else d["close"]
    pct_val = d.get("pct_change_from_pdc")

    score = int(conf.get("active_confluence_score", 0))
    out_of = int(conf.get("score_out_of", 6))
    bias = str(conf.get("bias", "NEUTRAL")).upper()
    bias_tone = "bull" if bias == "BULLISH" else ("bear" if bias == "BEARISH" else "neutral")

    win_open = bool(sess.get("intraday_entry_allowed"))
    win_str = ui.green("OPEN", bold=True) if win_open else ui.yellow("CLOSED / WAIT", bold=True)
    ts_short = str(sess.get("ist_timestamp", "")).replace("T", " ")[:19] + " IST"

    blocks: list[str] = [
        ui.banner(
            title=f"NSE/BSE MARKET STRUCTURE  {ui.dot_ch}  {s['yahoo']} ({s['exchange']})",
            subtitle=f"{ts_short}  |  Phase: {sess.get('phase', 'N/A')}",
            badge=f"{bias} {score}/{out_of}",
            badge_tone=bias_tone,
            meta_lines=[
                f"LTP: {ui.bold(format_inr(ltp_val))} ({ui.trend_pct(pct_val)} vs PDC {format_inr(d.get('pdc'))})   |   Intraday Entry Window: {win_str}",
                ui.dim(_phase_beginner_tip(str(sess.get("phase", "")))),
            ],
        )
    ]

    # Table 1: Key Price Levels
    or_info = intra.get("opening_range_15m") or {}
    orh = or_info.get("orh")
    orl = or_info.get("orl")
    or_status = or_info.get("status") or "N/A"
    or_price_str = f"{orh:,.2f} / {orl:,.2f}" if (orh is not None and orl is not None) else "N/A"
    vwap_val = intra.get("anchored_vwap")
    vwap_bias = intra.get("vwap_bias") or "N/A"
    atr_val = d.get("atr14")

    level_rows = [
        [
            "Last Traded Price (LTP)",
            format_inr(ltp_val),
            ui.trend_pct(pct_val),
            "Current/latest price vs yesterday's close (PDC).",
        ],
        [
            "Prev Day High / Low",
            f"{d['pdh']:,.2f} / {d['pdl']:,.2f}" if d.get("pdh") is not None and d.get("pdl") is not None else "N/A",
            "Key S/R",
            "Yesterday's high (resistance) & low (support).",
        ],
        [
            "15m Opening Range (ORH/L)",
            or_price_str,
            ui.tone(str(or_status), "good" if "ABOVE" in str(or_status) else ("bad" if "BELOW" in str(or_status) else "warn")),
            "First 15m (09:15-09:30) range; breakout signals direction.",
        ],
        [
            "Anchored Intraday VWAP",
            format_inr(vwap_val) if vwap_val is not None else "N/A",
            ui.tone(str(vwap_bias), "good" if "ABOVE" in str(vwap_bias) else ("bad" if "BELOW" in str(vwap_bias) else "warn")),
            "Avg volume-weighted price today; buyers dominate above VWAP.",
        ],
        [
            "Daily ATR (14)",
            format_inr(atr_val) if atr_val is not None else "N/A",
            "Volatility",
            "Typical 1-day price swing; used to size safe stop-losses.",
        ],
    ]
    blocks.append("")
    blocks.append(ui.section("1. Price & Key Levels (Today's Map)", "Compare LTP against yesterday's range, 15m ORB, and VWAP."))
    blocks.append(
        ui.table(
            headers=["Level", "Price (INR)", "Status", "Beginner Guide"],
            rows=level_rows,
            alignments=["left", "right", "left", "left"],
            nowrap_cols={0, 1},
        )
    )

    # Table 2: Technical Indicators
    adx_dict = d.get("adx") or {}
    adx_val = adx_dict.get("adx")
    adx_label = "STRONG (>=25)" if (adx_val is not None and float(adx_val) >= 25) else ("TRENDING (20-25)" if (adx_val is not None and float(adx_val) >= 20) else ("WEAK/CHOPPY (<20)" if adx_val is not None else "N/A"))
    macd_hist = (d.get("macd") or {}).get("histogram")
    macd_sig = "BULLISH (+)" if (macd_hist is not None and float(macd_hist) > 0) else ("BEARISH (-)" if (macd_hist is not None and float(macd_hist) < 0) else "N/A")
    rvol = d.get("relative_volume")
    rvol_sig = "HIGH (>=1.5x)" if (rvol is not None and float(rvol) >= 1.5) else ("NORMAL" if rvol is not None else "N/A")
    ema20, ema50, ema200 = d.get("ema20"), d.get("ema50"), d.get("ema200")
    ema_str = f"{ema20 if ema20 is not None else 'N/A'} / {ema50 if ema50 is not None else 'N/A'} / {ema200 if ema200 is not None else 'N/A'}"
    fib_ret = fib.get("retracements") or {}
    fib_str = f"50%={fib_ret.get('50.0%', 'N/A')} | 61.8%={fib_ret.get('61.8%', 'N/A')}"
    in_gp = fib.get("in_golden_pocket_50_618")
    gp_str = ui.green("IN GOLDEN POCKET", bold=True) if in_gp else ("Outside pocket" if in_gp is not None else "N/A")
    divs = ", ".join(data.get("rsi_divergences") or []) or "None in 60d"

    ind_rows = [
        [
            "Weekly Trend (HTF)",
            f"RSI {w.get('rsi14_w', 'N/A')}",
            ui.tone(str(w.get("bias", "N/A")), "bull" if w.get("bias") == "BULLISH" else ("bear" if w.get("bias") == "BEARISH" else "warn"), bold=True),
            "Big-picture trend; trading with weekly bias raises win odds.",
        ],
        [
            "Daily EMAs (20/50/200)",
            ema_str,
            "Trend MAs",
            "Price > EMA20 > EMA50 > EMA200 = healthy uptrend.",
        ],
        [
            "Daily RSI (14)",
            f"{d.get('rsi14', 'N/A')}",
            _rsi_zone_label(d.get("rsi14")),
            "Momentum gauge (30=oversold bounce zone, 70=overbought).",
        ],
        [
            "MACD Histogram",
            f"{macd_hist if macd_hist is not None else 'N/A'}",
            ui.tone(macd_sig, "good" if "+" in macd_sig else ("bad" if "-" in macd_sig else "dim")),
            "Positive = upward momentum accelerating; Negative = fading.",
        ],
        [
            "ADX (Trend Strength)",
            f"{adx_val if adx_val is not None else 'N/A'}",
            adx_label,
            "Measures trend power (>25 strong trend; <20 sideways chop).",
        ],
        [
            "Relative Volume (RVOL)",
            f"{rvol}x" if rvol is not None else "N/A",
            ui.tone(rvol_sig, "good" if "HIGH" in rvol_sig else "dim"),
            "Today's volume vs 20-day avg (>1.5x confirms real buying/selling).",
        ],
        [
            f"Fibonacci ({fib.get('direction', 'N/A')})",
            fib_str,
            gp_str,
            "50%-61.8% retracement ('Golden Pocket') is a classic pullback zone.",
        ],
        [
            "RSI Divergences",
            divs,
            "Reversal Clue",
            "Price vs RSI mismatch hinting momentum shift.",
        ],
    ]
    blocks.append("")
    blocks.append(ui.section("2. Technical Indicators & Trend Confluence"))
    blocks.append(
        ui.table(
            headers=["Indicator", "Value", "Reading", "Beginner Guide"],
            rows=ind_rows,
            alignments=["left", "left", "left", "left"],
        )
    )

    # Confluence Bar + Setup Coordinates
    bar_s = ui.bar(score, out_of, width=14, tone_name="good" if score >= 4 else ("warn" if score >= 3 else "bad"))
    qual_note = ui.green("Actionable (>=3/6)", bold=True) if score >= 3 else ui.red("Skip (<3/6)", bold=True)
    reasons_str = "  |  ".join(conf.get("reasons") or ["No clear directional triggers"])

    side = str(cand.get("side", "buy")).upper()
    side_tone = "good" if side == "BUY" else "bad"
    entry_v = float(cand.get("entry", 0.0))
    stop_v = float(cand.get("stop_loss", 0.0))
    t1_v = float(cand.get("target_1", 0.0))
    t2_v = float(cand.get("target_2", 0.0))
    risk_unit = abs(entry_v - stop_v)

    blocks.append("")
    blocks.append(ui.section(f"3. Confluence & Setup  [{bar_s}] {score}/{out_of}  {qual_note}", f"Triggers: {reasons_str}"))
    blocks.append(
        ui.table(
            headers=["Side", "Entry (Rs.)", "Stop-Loss (Rs.)", "Target 1 (1.6R)", "Target 2 (2.5R)", "Risk / Share"],
            rows=[
                [
                    ui.tone(side, side_tone, bold=True),
                    format_inr(entry_v),
                    ui.red(format_inr(stop_v)),
                    ui.green(format_inr(t1_v)),
                    ui.green(format_inr(t2_v)),
                    format_inr(risk_unit),
                ]
            ],
            alignments=["center", "right", "right", "right", "right", "right"],
            nowrap_cols={0, 1, 2, 3, 4, 5},
            footer="All levels rounded to Rs. 0.05 NSE/BSE tick grid. Never trade without validating via Time Machine + Risk Gate.",
        )
    )

    reg_warnings = (data.get("regulatory") or {}).get("warnings") or []
    if reg_warnings:
        blocks.append("")
        blocks.append(ui.callout("Regulatory / Surveillance Warnings", reg_warnings, tone_name="warn"))

    news = data.get("news")
    if isinstance(news, dict):
        items = news.get("items") or []
        blocks.append("")
        if items:
            h_lbl = "headline" if len(items) == 1 else "headlines"
            blocks.append(ui.section(f"News ({len(items)} {h_lbl}, {news.get('hours_lookback', 72)}h)"))
            n_rows = [
                [
                    str(it.get("publisher", "News")),
                    ", ".join(it.get("tags") or []) or "-",
                    str(it.get("title", "")),
                ]
                for it in items[:5]
            ]
            blocks.append(ui.table(["Publisher", "Tags", "Headline"], n_rows, alignments=["left", "left", "left"]))
        elif news.get("available"):
            blocks.append(ui.section("News (0 headlines matched in lookback window)"))
        elif news.get("error"):
            blocks.append(ui.callout("News Warning", [str(news["error"])], tone_name="warn"))

    return "\n".join(blocks)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="NSE/BSE Multi-Timeframe Technical & Market Structure Loader")
    p.add_argument("--symbol", required=True, help="Ticker (e.g., RELIANCE, RELIANCE.NS, NIFTY, BANKNIFTY, SENSEX)")
    p.add_argument("--exchange", default="NSE", choices=["NSE", "BSE"], help="Default exchange if no suffix")
    p.add_argument("--now", default=None, help="Pin IST timestamp, e.g. '2026-11-09 10:15'")
    p.add_argument("--offline-5m", default=None, help="Offline Yahoo 5m JSON/gz file or directory")
    p.add_argument("--offline-1d", default=None, help="Offline Yahoo 1d JSON/gz file or directory")
    p.add_argument("--offline-1wk", default=None, help="Offline Yahoo 1wk JSON/gz file or directory")
    p.add_argument("--delivery-pct", type=float, default=None, help="Manual NSE Delivery Volume %% override")
    p.add_argument("--circuit-band", type=float, default=None, help="Price circuit band %% (e.g., 5, 10, 20)")
    p.add_argument("--fno-ban", action="store_true", help="Flag ticker as currently in NSE F&O ban (>95%% MWPL)")
    p.add_argument("--asm-gsm", action="store_true", help="Flag ticker under SEBI ASM/GSM surveillance")
    p.add_argument("--with-news", action="store_true", help="Include Indian news/regulatory RSS + live F&O ban check")
    p.add_argument("--news-hours", type=int, default=72, help="News lookback window in hours when --with-news is set")
    p.add_argument("--offline-news", default=None, help="Offline news fixtures directory when testing --with-news")
    p.add_argument("--json", action="store_true", help="Output structured JSON")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        report = analyze_symbol(
            symbol=args.symbol,
            exchange=args.exchange,
            now_str=args.now,
            offline_5m=args.offline_5m,
            offline_1d=args.offline_1d,
            offline_1wk=args.offline_1wk,
            delivery_pct=args.delivery_pct,
            circuit_band_pct=args.circuit_band,
            fno_ban=args.fno_ban,
            asm_gsm=args.asm_gsm,
            with_news=args.with_news,
            news_hours=args.news_hours,
            offline_news=args.offline_news,
        )
    except NSETraderError as exc:
        print(json.dumps({"error": str(exc)}) if args.json else f"ERROR: {exc}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        safe_print(format_human_report(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
