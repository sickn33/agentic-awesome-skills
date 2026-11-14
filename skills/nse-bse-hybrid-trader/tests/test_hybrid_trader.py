"""Comprehensive unit & integration tests for nse-bse-hybrid-trader."""

from __future__ import annotations

import datetime
import gzip
import http.client
import io
import json
import sqlite3
import urllib.error
import urllib.request
from typing import TYPE_CHECKING, Any
from unittest.mock import patch
from pathlib import Path
import sys

# Ensure scripts and skill root are in sys.path
TEST_DIR = Path(__file__).resolve().parent
SKILL_DIR = TEST_DIR.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
for d in (SCRIPTS_DIR, SKILL_DIR, SKILL_DIR / ".agents" / "skills" / "nse-bse-hybrid-trader" / "scripts"):
    if d.is_dir() and str(d) not in sys.path:
        sys.path.insert(0, str(d))

import pytest

import indian_risk_gate
import nse_alerts
import nse_data_loader
import nse_news
import nse_scanner
import nse_timemachine
import nse_ui
import smartapi_bridge
from broker_bridge import (
    close_paper_trade as mb_close_paper_trade,
)
from broker_bridge import (
    list_supported_brokers,
)
from broker_bridge import (
    lookup_scrip as mb_lookup_scrip,
)
from broker_bridge import (
    main as mb_main,
)
from broker_bridge import (
    read_ledger as mb_read_ledger,
)
from broker_bridge import (
    stage_or_execute_order as mb_stage_or_execute_order,
)
from broker_bridge import (
    sync_scrip_master as mb_sync_scrip_master,
)
from indian_risk_gate import (
    calculate_indian_charges,
    compute_verdict_fingerprint,
    evaluate_risk_gate,
)
from nse_common import (
    EPOCH,
    IST_OFFSET,
    SUPPORTED_BROKERS,
    NSETraderError,
    normalize_broker,
    normalize_symbol,
    nse_session_info,
    parse_now_ist,
    round_tick,
)
from nse_data_loader import analyze_symbol, format_human_report
from nse_timemachine import run_timemachine
from smartapi_bridge import (
    _angel_rest_post,
    close_paper_trade,
    generate_totp,
    lookup_scrip,
    read_ledger,
    stage_or_execute_order,
    sync_scrip_master,
)

if TYPE_CHECKING:
    from pathlib import Path


def _ist_to_unix(dt_ist: datetime.datetime) -> int:
    utc = (dt_ist - IST_OFFSET).replace(tzinfo=datetime.timezone.utc)
    return int((utc - EPOCH).total_seconds())


def _make_offline_nse_5m(path: Path, num_days: int = 30, base_price: float = 1000.0, drift: float = 0.0004) -> Path:
    """Create a realistic synthetic 75-bar/day NSE Yahoo v8 chart JSON."""
    stamps, opens, highs, lows, closes, vols = [], [], [], [], [], []
    start_day = datetime.date(2026, 9, 1)
    p = base_price
    days_made = 0
    cur_day = start_day
    while days_made < num_days:
        if cur_day.weekday() < 5:
            for slot in range(75):
                bar_dt = datetime.datetime.combine(cur_day, datetime.time(9, 15)) + datetime.timedelta(minutes=5 * slot)
                stamps.append(_ist_to_unix(bar_dt))
                o = p
                # Mild upward drift + realistic oscillation
                step = drift + (0.0012 if slot % 3 != 0 else -0.0006)
                c = round(o * (1.0 + step), 2)
                hi = round(max(o, c) * 1.0018, 2)
                lo = round(min(o, c) * 0.9988, 2)
                opens.append(o)
                highs.append(hi)
                lows.append(lo)
                closes.append(c)
                vols.append(50000 + slot * 500)
                p = c
            days_made += 1
        cur_day += datetime.timedelta(days=1)

    payload = {
        "chart": {
            "result": [
                {
                    "meta": {"symbol": "RELIANCE.NS", "exchangeName": "NSI", "currency": "INR"},
                    "timestamp": stamps,
                    "indicators": {
                        "quote": [
                            {
                                "open": opens,
                                "high": highs,
                                "low": lows,
                                "close": closes,
                                "volume": vols,
                            }
                        ]
                    },
                }
            ]
        }
    }
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _make_offline_daily(path: Path, num_days: int = 220, base_price: float = 1100.0) -> Path:
    stamps, opens, highs, lows, closes, vols = [], [], [], [], [], []
    cur = datetime.date(2026, 1, 1)
    p = base_price
    made = 0
    while made < num_days:
        if cur.weekday() < 5:
            bar_dt = datetime.datetime.combine(cur, datetime.time(9, 15))
            stamps.append(_ist_to_unix(bar_dt))
            o = p
            delta = 0.004 if (made % 5 != 0) else -0.006
            c = round(o * (1.0 + delta), 2)
            hi = round(max(o, c) * 1.008, 2)
            lo = round(min(o, c) * 0.992, 2)
            opens.append(o)
            highs.append(hi)
            lows.append(lo)
            closes.append(c)
            vols.append(2_000_000 + (made % 10) * 100_000)
            p = c
            made += 1
        cur += datetime.timedelta(days=1)

    payload = {
        "chart": {
            "result": [
                {
                    "meta": {"symbol": "RELIANCE.NS", "exchangeName": "NSI", "currency": "INR"},
                    "timestamp": stamps,
                    "indicators": {
                        "quote": [
                            {
                                "open": opens,
                                "high": highs,
                                "low": lows,
                                "close": closes,
                                "volume": vols,
                            }
                        ]
                    },
                }
            ]
        }
    }
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_symbol_normalization_and_tick_rounding() -> None:
    assert normalize_symbol("RELIANCE")["yahoo"] == "RELIANCE.NS"
    assert normalize_symbol("RELIANCE.BO")["exchange"] == "BSE"
    assert normalize_symbol("NIFTY")["yahoo"] == "^NSEI"
    assert normalize_symbol("BANKNIFTY")["yahoo"] == "^NSEBANK"
    assert normalize_symbol("SENSEX")["yahoo"] == "^BSESN"

    assert round_tick(785.12, mode="nearest") == 785.10
    assert round_tick(785.13, mode="nearest") == 785.15
    assert round_tick(778.04, mode="down") == 778.00
    assert round_tick(778.01, mode="up") == 778.05


def test_ist_session_windows_and_holidays() -> None:
    assert nse_session_info(parse_now_ist("2026-11-09 09:05"))["phase"] == "PRE_OPEN"
    assert nse_session_info(parse_now_ist("2026-11-09 09:20"))["phase"] == "OPENING_RANGE"
    assert nse_session_info(parse_now_ist("2026-11-09 10:15"))["intraday_entry_allowed"] is True
    assert nse_session_info(parse_now_ist("2026-11-09 14:35"))["phase"] == "HAZARD_WINDOW_NO_NEW_ENTRY"
    assert nse_session_info(parse_now_ist("2026-11-09 14:35"))["intraday_entry_allowed"] is False
    # Nov 10, 2026 is Diwali-Balipratipada NSE holiday
    hol = nse_session_info(parse_now_ist("2026-11-10 10:15"))
    assert hol["is_holiday"] is True
    assert hol["phase"] == "CLOSED_HOLIDAY"


def test_indian_charges_2026_segments() -> None:
    # EQ_INTRADAY: STT 0.025% sell, Stamp 0.003% buy
    intra = calculate_indian_charges(qty=50, entry_price=1000.0, exit_price=1020.0, side="buy", segment="EQ_INTRADAY")
    assert intra["buy_turnover"] == 50000.0
    assert intra["sell_turnover"] == 51000.0
    assert intra["brokerage"] == 30.30  # min(20, 15.0) + min(20, 15.3)
    assert intra["stt"] == 12.75       # 51000 * 0.00025
    assert intra["stamp_duty"] == 1.50 # 50000 * 0.00003
    assert intra["total_charges"] > 50.0

    # FNO_FUT April 2026 STT 0.05% on sell
    fut = calculate_indian_charges(qty=50, entry_price=24000.0, exit_price=24100.0, side="buy", segment="FNO_FUT")
    assert fut["stt"] == round(50 * 24100.0 * 0.0005, 2)
    assert fut["brokerage"] == 40.0

    # FNO_OPT April 2026 STT 0.15% on sell premium
    opt = calculate_indian_charges(qty=75, entry_price=200.0, exit_price=240.0, side="buy", segment="FNO_OPT")
    assert opt["stt"] == round(75 * 240.0 * 0.0015, 2)


def test_risk_gate_sizing_and_circuit_breakers(tmp_path: Path) -> None:
    # Valid intraday trade during primary window
    res = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=785.0,
        stop=778.0,
        target=800.0,
        segment="EQ_INTRADAY",
        symbol="TATAMOTORS",
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert res["verdict"] == "PASS"
    assert res["qty"] > 0
    assert res["net_loss_at_stop_inr"] <= 500.0
    assert res["net_rr"] >= 1.5
    assert res["fingerprint"] == compute_verdict_fingerprint(res)

    # Hard block when > 2.0% risk ceiling
    over_risk = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=2.5,
        entry=785.0,
        stop=778.0,
        target=800.0,
        segment="EQ_INTRADAY",
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert over_risk["verdict"] == "BLOCK"
    assert any("RISK_CAP_EXCEEDED" in b for b in over_risk["blocks"])

    # Hard block after 14:30 IST hazard window
    hazard = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=785.0,
        stop=778.0,
        target=800.0,
        segment="EQ_INTRADAY",
        now_str="2026-11-09 14:40",
        state_dir=tmp_path,
    )
    assert hazard["verdict"] == "BLOCK"
    assert any("INTRA_HAZARD_WINDOW" in b for b in hazard["blocks"])

    # Hard block near upper circuit (within 1%)
    uc = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=995.0,
        stop=985.0,
        target=1015.0,
        segment="EQ_INTRADAY",
        upper_circuit=1000.0,
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert uc["verdict"] == "BLOCK"
    assert any("UPPER_CIRCUIT_LOCK_RISK" in b for b in uc["blocks"])

    # Hard block on F&O Ban
    ban = evaluate_risk_gate(
        capital_inr=500000.0,
        risk_pct=1.0,
        entry=200.0,
        stop=180.0,
        target=245.0,
        segment="FNO_OPT",
        lot_size=75,
        fno_ban=True,
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert ban["verdict"] == "BLOCK"
    assert any("FNO_BAN" in b for b in ban["blocks"])


def test_data_loader_and_timemachine_offline(tmp_path: Path) -> None:
    f_5m = _make_offline_nse_5m(tmp_path / "RELIANCE.NS-5m.json", num_days=30, drift=0.0005)
    f_1d = _make_offline_daily(tmp_path / "RELIANCE.NS-1d.json", num_days=220)

    analysis = analyze_symbol(
        symbol="RELIANCE.NS",
        now_str="2026-11-09 11:00",
        offline_5m=str(f_5m),
        offline_1d=str(f_1d),
        offline_1wk=str(f_1d),
        delivery_pct=58.5,
    )
    assert analysis["symbol"]["yahoo"] == "RELIANCE.NS"
    assert analysis["intraday"]["bars_count_5m"] == 75
    assert analysis["intraday"]["anchored_vwap"] is not None
    assert analysis["daily"]["ema200"] is not None
    assert analysis["confluence"]["score_out_of"] == 6

    tm = run_timemachine(
        symbol="RELIANCE.NS",
        entry=1000.0,
        stop=990.0,
        target=1012.0,
        mode="INTRADAY",
        entry_time="09:30",
        until_ist="15:15",
        replays=2000,
        seed=19,
        offline_path=str(f_5m),
    )
    assert tm["replays"] == 2000
    assert tm["context"]["full_sessions_in_pool"] == 30
    assert tm["context"]["cutoff_ist"] == "15:15"
    assert 0.0 <= tm["target_first_resolved_pct"] <= 100.0

    # Swing mode using offline 1d
    tm_sw = run_timemachine(
        symbol="RELIANCE.NS",
        entry=1100.0,
        stop=1050.0,
        target=1180.0,
        mode="SWING",
        replays=1000,
        offline_path=str(f_1d),
    )
    assert tm_sw["mode"] == "SWING"
    assert tm_sw["context"]["swing_horizon_days"] == 10


def test_smartapi_scrip_cache_totp_and_paper_ledger(tmp_path: Path) -> None:
    # RFC-6238 official test vector check ("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" @ t=59 -> 287082)
    assert generate_totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", at_time=59) == "94287082"[-6:]

    scrip_file = tmp_path / "OpenAPIScripMaster.json"
    scrip_file.write_text(
        json.dumps(
            [
                {
                    "token": "2885",
                    "symbol": "RELIANCE-EQ",
                    "name": "RELIANCE",
                    "expiry": "",
                    "strike": "-1",
                    "lotsize": "1",
                    "instrumenttype": "",
                    "exch_seg": "NSE",
                    "tick_size": "5.000000",
                },
                {
                    "token": "35000",
                    "symbol": "NIFTY26NOV24500CE",
                    "name": "NIFTY",
                    "expiry": "26NOV2026",
                    "strike": "2450000",
                    "lotsize": "75",
                    "instrumenttype": "OPTIDX",
                    "exch_seg": "NFO",
                    "tick_size": "5.000000",
                },
            ]
        ),
        encoding="utf-8",
    )
    sync_res = sync_scrip_master(offline_json=scrip_file, state_dir=tmp_path)
    assert sync_res["instruments"] == 2

    lk = lookup_scrip("RELIANCE", exchange="NSE", state_dir=tmp_path)
    assert lk is not None
    assert lk["token"] == "2885"
    assert lk["lookup_ms"] < 50.0

    # Stage paper trade & prevent live execution (live orders strictly disabled for safety)
    staged = stage_or_execute_order(
        symbol="RELIANCE",
        entry=1324.0,
        stop=1310.0,
        target=1352.0,
        segment="EQ_INTRADAY",
        capital_inr=50000.0,
        risk_pct=1.0,
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert staged["mode"] == "PAPER"
    assert staged["status"] == "OPEN"
    assert staged["smartapi_payload"]["variety"] == "ROBO"
    assert staged["smartapi_payload"]["symboltoken"] == "2885"

    with pytest.raises(Exception, match="LIVE_BLOCKED: Live broker order dispatch has been disabled"):
        stage_or_execute_order(
            symbol="RELIANCE",
            entry=1324.0,
            stop=1310.0,
            target=1352.0,
            segment="EQ_INTRADAY",
            live=True,
            confirm_phrase="CONFIRM LIVE",
            now_str="2026-11-09 10:15",
            state_dir=tmp_path,
        )

    # Close trade with loss breaching 3% daily drawdown (-1500 INR), then confirm risk gate locks out next trade!
    closed = close_paper_trade(
        trade_id=staged["trade_id"],
        exit_price=1270.0,
        reason="STOP",
        now_str="2026-11-09 11:30",
        state_dir=tmp_path,
    )
    assert closed["realized_net_pnl_inr"] < -1500.0

    ledger = read_ledger(date_str="2026-11-09", state_dir=tmp_path)
    assert ledger["count"] == 1
    assert ledger["realized_net_pnl_inr"] < -1500.0

    blocked_next = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=1324.0,
        stop=1310.0,
        target=1352.0,
        segment="EQ_INTRADAY",
        symbol="RELIANCE",
        now_str="2026-11-09 11:45",
        state_dir=tmp_path,
    )
    assert blocked_next["verdict"] == "BLOCK"
    assert any("DAILY_DRAWDOWN_LOCK" in b for b in blocked_next["blocks"])


def test_cli_end_to_end_pipeline(tmp_path: Path) -> None:
    # Strong bullish upward drift so Time Machine passes >55% Target-First and positive EV
    f_5m = _make_offline_nse_5m(tmp_path / "SBIN.NS-5m.json", num_days=25, base_price=800.0, drift=0.0012)
    f_1d = _make_offline_daily(tmp_path / "SBIN.NS-1d.json", num_days=220, base_price=700.0)

    rc_dl = nse_data_loader.main(
        [
            "--symbol", "SBIN",
            "--now", "2026-11-09 10:15",
            "--offline-5m", str(f_5m),
            "--offline-1d", str(f_1d),
            "--offline-1wk", str(f_1d),
            "--json",
        ]
    )
    assert rc_dl == 0

    rc_tm = nse_timemachine.main(
        [
            "--symbol", "SBIN.NS",
            "--entry", "800",
            "--stop", "794",
            "--target", "812",
            "--mode", "INTRADAY",
            "--entry-time", "09:30",
            "--replays", "1000",
            "--offline", str(f_5m),
            "--state-dir", str(tmp_path),
            "--write",
            "--json",
        ]
    )
    assert rc_tm == 0
    tm_json = tmp_path / "timemachine_result.json"
    assert tm_json.exists()

    rc_rg = indian_risk_gate.main(
        [
            "--symbol", "SBIN",
            "--capital", "50000",
            "--risk-pct", "1.0",
            "--entry", "800",
            "--stop", "794",
            "--target", "812",
            "--segment", "EQ_INTRADAY",
            "--timemachine-json", str(tm_json),
            "--now", "2026-11-09 10:15",
            "--state-dir", str(tmp_path),
            "--write",
            "--json",
        ]
    )
    assert rc_rg == 0
    risk_json = tmp_path / "risk_verdict.json"
    assert risk_json.exists()

    rc_st = smartapi_bridge.main(
        [
            "stage",
            "--symbol", "SBIN",
            "--segment", "EQ_INTRADAY",
            "--entry", "800",
            "--stop", "794",
            "--target", "812",
            "--risk-json", str(risk_json),
            "--now", "2026-11-09 10:15",
            "--state-dir", str(tmp_path),
            "--paper",
            "--json",
        ]
    )
    assert rc_st == 0

    # Verify fingerprint tamper protection rejects modified risk_verdict.json
    tampered = json.loads(risk_json.read_text(encoding="utf-8"))
    tampered["qty"] = 9999
    risk_json.write_text(json.dumps(tampered), encoding="utf-8")
    rc_tampered = smartapi_bridge.main(
        [
            "stage",
            "--symbol", "SBIN",
            "--segment", "EQ_INTRADAY",
            "--entry", "800",
            "--stop", "794",
            "--target", "812",
            "--risk-json", str(risk_json),
            "--now", "2026-11-09 10:15",
            "--state-dir", str(tmp_path),
            "--paper",
        ]
    )
    assert rc_tampered == 1


def test_timemachine_dual_gate_modes(tmp_path: Path) -> None:
    # Moderate bullish drift (~0.00025/bar) so 1.8R passes r_breakeven (~38-42%) but fails strict_55 (55%)
    f_5m = _make_offline_nse_5m(tmp_path / "INFY.NS-5m.json", num_days=25, base_price=1500.0, drift=0.0001)
    tm_be = run_timemachine(
        symbol="INFY.NS",
        entry=1500.0,
        stop=1490.0,
        target=1518.0,
        mode="INTRADAY",
        entry_time="09:30",
        replays=2000,
        seed=19,
        gate_mode="r_breakeven",
        offline_path=str(f_5m),
    )
    assert tm_be["gate_mode"] == "r_breakeven"
    assert tm_be["breakeven_prob_net_pct"] < tm_be["strict_prob_floor_pct"]

    # Force a synthetic borderline Time Machine result (48% hit rate @ 1.8R, +0.25R EV) to verify gate split
    borderline_tm = {
        "target_first_resolved_pct": 48.0,
        "r_at_target": 1.8,
        "estimated_tax_drag_r": 0.10,
        "breakeven_prob_net_pct": 39.29,
        "avg_net_r": 0.25,
    }
    pass_be = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=1500.0,
        stop=1490.0,
        target=1520.0,
        segment="EQ_INTRADAY",
        symbol="INFY",
        timemachine_result=borderline_tm,
        tm_gate_mode="r_breakeven",
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert pass_be["verdict"] == "PASS"

    block_55 = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=1500.0,
        stop=1490.0,
        target=1520.0,
        segment="EQ_INTRADAY",
        symbol="INFY",
        timemachine_result=borderline_tm,
        tm_gate_mode="strict_55",
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert block_55["verdict"] == "BLOCK"
    assert any("TIMEMACHINE_PROB_LOW" in b for b in block_55["blocks"])

    # Verify fallback safety when avg_net_r is explicitly None
    none_ev_tm = {
        "target_first_resolved_pct": 52.0,
        "r_at_target": 1.8,
        "estimated_tax_drag_r": 0.10,
        "breakeven_prob_net_pct": 39.29,
        "avg_net_r": None,
        "avg_gross_r": 0.18,
    }
    fallback_ev = evaluate_risk_gate(
        capital_inr=50000.0,
        risk_pct=1.0,
        entry=1500.0,
        stop=1490.0,
        target=1520.0,
        segment="EQ_INTRADAY",
        symbol="INFY",
        timemachine_result=none_ev_tm,
        tm_gate_mode="r_breakeven",
        now_str="2026-11-09 10:15",
        state_dir=tmp_path,
    )
    assert fallback_ev["verdict"] == "PASS"


class _DummyHTTPResp:
    def __init__(self, body: bytes) -> None:
        self._body = body

    def read(self) -> bytes:
        return self._body

    def __enter__(self) -> _DummyHTTPResp:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None


def test_angel_rest_post_error_handling_and_validation() -> None:
    url = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword"

    # 1. Valid JSON object response
    with patch(
        "urllib.request.urlopen",
        return_value=_DummyHTTPResp(b'{"status": true, "data": {"jwtToken": "tok"}}'),
    ):
        res = _angel_rest_post(url, {"clientcode": "X"}, {"X-PrivateKey": "k"})
        assert res["status"] is True
        assert res["data"]["jwtToken"] == "tok"

    # 2. HTTPError preserves SmartAPI JSON message/errorcode and closes fp
    err_fp = io.BytesIO(b'{"status": false, "message": "Invalid totp", "errorcode": "AB1050"}')
    http_err = urllib.error.HTTPError(
        url,
        400,
        "Bad Request",
        http.client.HTTPMessage(),
        err_fp,
    )
    with (
        patch("urllib.request.urlopen", side_effect=http_err),
        pytest.raises(NSETraderError, match=r"HTTP 400 \[AB1050\]: Invalid totp"),
    ):
        _angel_rest_post(url, {"clientcode": "X"}, {})
    assert err_fp.closed

    # 3. URLError / OSError network failure raises NSETraderError
    with (
        patch("urllib.request.urlopen", side_effect=urllib.error.URLError("timed out")),
        pytest.raises(NSETraderError, match="timed out"),
    ):
        _angel_rest_post(url, {"clientcode": "X"}, {})

    # 4. http.client.HTTPException (e.g. BadStatusLine) raises NSETraderError
    with (
        patch("urllib.request.urlopen", side_effect=http.client.BadStatusLine("HTTP/1.1 ?")),
        pytest.raises(NSETraderError, match="Angel One SmartAPI HTTP failure"),
    ):
        _angel_rest_post(url, {"clientcode": "X"}, {})

    # 5. Non-dict JSON body rejected safely
    with (
        patch("urllib.request.urlopen", return_value=_DummyHTTPResp(b'["unexpected"]')),
        pytest.raises(NSETraderError, match="expected an object"),
    ):
        _angel_rest_post(url, {"clientcode": "X"}, {})

    # 6. Non-HTTP/HTTPS scheme blocked before Request/urlopen
    with (
        patch("urllib.request.urlopen") as mock_open,
        pytest.raises(NSETraderError, match="Unsupported URL scheme"),
    ):
        _angel_rest_post("file:///etc/passwd", {"clientcode": "X"}, {})
    mock_open.assert_not_called()


def test_multi_broker_charge_profiles_and_normalization() -> None:
    assert normalize_broker("kite") == "zerodha"
    assert normalize_broker("smartapi") == "angel_one"
    assert normalize_broker("breeze") == "icici_breeze"
    assert normalize_broker("finvasia") == "shoonya"
    assert normalize_broker("kotak") == "kotak_neo"
    with pytest.raises(NSETraderError, match="Unsupported broker"):
        normalize_broker("unknown_broker")

    brokers_info = list_supported_brokers()
    assert brokers_info["count"] == len(SUPPORTED_BROKERS) == 9

    # Zero brokerage on Shoonya vs Rs. 10 cap/leg on Kotak Neo vs Rs. 20 cap/leg on Zerodha
    shoonya_intra = calculate_indian_charges(50, 1000.0, 1020.0, "buy", "EQ_INTRADAY", broker="shoonya")
    kotak_intra = calculate_indian_charges(50, 1000.0, 1020.0, "buy", "EQ_INTRADAY", broker="kotak_neo")
    zerodha_del = calculate_indian_charges(50, 1000.0, 1020.0, "buy", "EQ_DELIVERY", broker="zerodha")
    upstox_del = calculate_indian_charges(50, 1000.0, 1020.0, "buy", "EQ_DELIVERY", broker="upstox")
    angel_small = calculate_indian_charges(1, 500.0, 510.0, "buy", "EQ_INTRADAY", broker="angel_one")

    assert shoonya_intra["brokerage"] == 0.0
    assert kotak_intra["brokerage"] == 20.0  # Rs. 10 per leg
    assert zerodha_del["brokerage"] == 0.0
    assert upstox_del["brokerage"] == 40.0  # Rs. 20 per leg
    assert angel_small["brokerage"] == 10.0  # min Rs. 5 per leg floor


def test_multi_broker_scrip_sync_payloads_and_live_dispatch(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # 1. Zerodha CSV instrument sync & lookup
    kite_csv = tmp_path / "zerodha.csv"
    kite_csv.write_text(
        "instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange\n"
        "738561,2885,RELIANCE,RELIANCE,0,,0,0.05,1,EQ,NSE,NSE\n",
        encoding="utf-8",
    )
    assert mb_sync_scrip_master(offline_json=kite_csv, state_dir=tmp_path, broker="zerodha")["instruments"] == 1
    z_lk = mb_lookup_scrip("RELIANCE", exchange="NSE", state_dir=tmp_path, broker="zerodha")
    assert z_lk is not None
    assert z_lk["token"] == "738561"

    # 2. Upstox .json.gz instrument sync & lookup
    upstox_gz = tmp_path / "upstox.json.gz"
    upstox_gz.write_bytes(
        gzip.compress(
            json.dumps(
                [
                    {
                        "segment": "NSE_EQ",
                        "exchange": "NSE",
                        "instrument_key": "NSE_EQ|INE002A01018",
                        "trading_symbol": "RELIANCE",
                        "name": "RELIANCE INDUSTRIES LTD",
                        "lot_size": 1,
                        "tick_size": 5.0,
                        "instrument_type": "EQ",
                    }
                ]
            ).encode("utf-8")
        )
    )
    assert mb_sync_scrip_master(offline_json=upstox_gz, state_dir=tmp_path, broker="upstox")["instruments"] == 1
    up_lk = mb_lookup_scrip("RELIANCE", exchange="NSE", state_dir=tmp_path, broker="upstox")
    assert up_lk is not None
    assert up_lk["token"] == "NSE_EQ|INE002A01018"

    # 3. Dhan CSV & Fyers 21-column headerless CSV & Groww CSV
    dhan_csv = tmp_path / "dhan.csv"
    dhan_csv.write_text(
        "SEM_EXM_EXCH_ID,SEM_SEGMENT,SEM_SMST_SECURITY_ID,SEM_TRADING_SYMBOL,SEM_CUSTOM_SYMBOL,SEM_EXPIRY_DATE,SEM_STRIKE_PRICE,SEM_LOT_UNITS,SEM_TICK_SIZE,SEM_INSTRUMENT_NAME\n"
        "NSE,E,2885,RELIANCE,RELIANCE,,0,1,0.05,EQUITY\n",
        encoding="utf-8",
    )
    assert mb_sync_scrip_master(offline_json=dhan_csv, state_dir=tmp_path, broker="dhan")["instruments"] == 1
    dh_lk = mb_lookup_scrip("RELIANCE", exchange="NSE", state_dir=tmp_path, broker="dhan")
    assert dh_lk is not None
    assert dh_lk["token"] == "2885"

    fyers_csv = tmp_path / "NSE_CM.csv"
    fyers_csv.write_text(
        "10100000002885,RELIANCE INDUSTRIES LTD,0,1,0.05,INE002A01018,0915-1530|1815-1915:,2026-11-09,,NSE:RELIANCE-EQ,10,10,2885,RELIANCE,2885,-1.0,XX,10100000002885,None,0,0.0\n",
        encoding="utf-8",
    )
    assert mb_sync_scrip_master(offline_json=fyers_csv, state_dir=tmp_path, broker="fyers")["instruments"] == 1
    fy_lk = mb_lookup_scrip("RELIANCE", exchange="NSE", state_dir=tmp_path, broker="fyers")
    assert fy_lk is not None
    assert fy_lk["symbol"] == "NSE:RELIANCE-EQ"

    fyers_fo_csv = tmp_path / "NSE_FO.csv"
    fyers_fo_csv.write_text(
        "1011261124500CE,NIFTY 26 NOV 24500 CE,0,75,0.05,,0915-1530:,2026-11-26,1795600000,NSE:NIFTY26NOV24500CE,10,10,35000,NIFTY,35000,24500,CE,10100000002600,None,0,0.0\n",
        encoding="utf-8",
    )
    assert mb_sync_scrip_master(offline_json=fyers_fo_csv, state_dir=tmp_path, broker="fyers")["instruments"] == 1
    fy_fo_lk = mb_lookup_scrip("NIFTY26NOV24500CE", exchange="NFO", state_dir=tmp_path, broker="fyers")
    assert fy_fo_lk is not None
    assert fy_fo_lk["lotsize"] == 75

    groww_csv = tmp_path / "groww.csv"
    groww_csv.write_text(
        "exchange,exchange_token,trading_symbol,groww_symbol,name,instrument_type,segment,series,isin,underlying_symbol,underlying_exchange_token,expiry_date,strike_price,lot_size,tick_size,freeze_quantity,is_reserved,buy_allowed,sell_allowed\n"
        "NSE,2885,RELIANCE,NSE-RELIANCE,RELIANCE INDUSTRIES LTD,EQ,CASH,EQ,INE002A01018,RELIANCE,,,,1,0.05,100000,False,True,True\n",
        encoding="utf-8",
    )
    assert mb_sync_scrip_master(offline_json=groww_csv, state_dir=tmp_path, broker="groww")["instruments"] == 1
    gr_lk = mb_lookup_scrip("RELIANCE", exchange="NSE", state_dir=tmp_path, broker="groww")
    assert gr_lk is not None
    assert gr_lk["token"] == "2885"

    # 4. Paper stage across multiple brokers + verify broker-native payload shapes + broker filtering on ledger
    st_z = mb_stage_or_execute_order(
        symbol="RELIANCE", entry=1324.0, stop=1310.0, target=1352.0,
        segment="EQ_INTRADAY", now_str="2026-11-09 10:15", state_dir=tmp_path, broker="zerodha",
    )
    assert st_z["broker"] == "zerodha"
    assert st_z["broker_payload"]["product"] == "MIS"
    assert st_z["broker_payload"]["tradingsymbol"] == "RELIANCE"

    st_k = mb_stage_or_execute_order(
        symbol="RELIANCE", entry=1324.0, stop=1310.0, target=1352.0,
        segment="EQ_INTRADAY", now_str="2026-11-09 10:20", state_dir=tmp_path, broker="kotak_neo",
    )
    assert st_k["broker_payload"]["es"] == "nse_cm"
    assert st_k["broker_payload"]["pc"] == "MIS"
    closed_k = mb_close_paper_trade(
        trade_id=st_k["trade_id"], exit_price=1352.0, reason="TARGET",
        now_str="2026-11-09 11:00", state_dir=tmp_path,
    )
    assert closed_k["broker"] == "kotak_neo"
    assert closed_k["total_charges_inr"] < 40.0

    st_sh = mb_stage_or_execute_order(
        symbol="RELIANCE", entry=1324.0, stop=1310.0, target=1352.0,
        segment="EQ_INTRADAY", now_str="2026-11-09 10:25", state_dir=tmp_path, broker="shoonya",
    )
    assert st_sh["broker_payload"]["prd"] == "I"
    assert st_sh["broker_payload"]["prctyp"] == "LMT"

    # Broker, symbol, and price mismatch guards when using --risk-json
    verdict_z = evaluate_risk_gate(
        capital_inr=50000.0, risk_pct=1.0, entry=1324.0, stop=1310.0, target=1352.0,
        segment="EQ_INTRADAY", symbol="RELIANCE", now_str="2026-11-11 10:15", state_dir=tmp_path, broker="zerodha",
    )
    assert verdict_z["verdict"] == "PASS"
    vpath = tmp_path / "risk_z.json"
    vpath.write_text(json.dumps(verdict_z), encoding="utf-8")
    with pytest.raises(NSETraderError, match="BROKER_MISMATCH"):
        mb_stage_or_execute_order(
            symbol="RELIANCE", entry=1324.0, stop=1310.0, target=1352.0,
            segment="EQ_INTRADAY", risk_json_path=str(vpath), now_str="2026-11-11 10:15", state_dir=tmp_path, broker="dhan",
        )
    with pytest.raises(NSETraderError, match="SYMBOL_MISMATCH"):
        mb_stage_or_execute_order(
            symbol="SBIN", entry=1324.0, stop=1310.0, target=1352.0,
            segment="EQ_INTRADAY", risk_json_path=str(vpath), now_str="2026-11-11 10:15", state_dir=tmp_path, broker="zerodha",
        )
    with pytest.raises(NSETraderError, match="PRICE_MISMATCH"):
        mb_stage_or_execute_order(
            symbol="RELIANCE", entry=1325.0, stop=1310.0, target=1352.0,
            segment="EQ_INTRADAY", risk_json_path=str(vpath), now_str="2026-11-11 10:15", state_dir=tmp_path, broker="zerodha",
        )

    kotak_only = mb_read_ledger(state_dir=tmp_path, broker="kotak_neo")
    assert kotak_only["count"] == 1
    assert kotak_only["trades"][0]["broker"] == "kotak_neo"

    # 5. Live dispatch block safety verification across brokers (paper-only mode)
    with pytest.raises(NSETraderError, match="LIVE_BLOCKED: Live broker order dispatch has been disabled"):
        mb_stage_or_execute_order(
            symbol="RELIANCE", entry=1324.0, stop=1310.0, target=1352.0,
            segment="EQ_INTRADAY", live=True, confirm_phrase="CONFIRM LIVE",
            now_str="2026-11-12 10:30", state_dir=tmp_path, broker="zerodha",
        )


def test_legacy_db_migration_and_edge_cases(tmp_path: Path) -> None:
    # 1. Pre-v1.1 paper_trades.db without `broker` column migrates cleanly
    legacy_db = tmp_path / "paper_trades.db"
    conn = sqlite3.connect(str(legacy_db))
    conn.execute(
        """
        CREATE TABLE paper_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at_ist TEXT NOT NULL,
            trade_date TEXT NOT NULL,
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
    conn.execute(
        """
        INSERT INTO paper_orders (
            created_at_ist, trade_date, symbol, exchange, segment, side, qty, lot_size,
            planned_entry, filled_entry, stop_loss, target_price, max_risk_inr, status
        ) VALUES ('2026-11-09T10:15:00+05:30', '2026-11-09', 'RELIANCE', 'NSE', 'EQ_INTRADAY',
                  'buy', 10, 1, 1300.0, 1300.05, 1290.0, 1320.0, 110.0, 'OPEN')
        """
    )
    conn.commit()
    conn.close()

    migrated = mb_read_ledger(state_dir=tmp_path, broker="angel_one")
    assert migrated["count"] == 1
    assert migrated["trades"][0]["broker"] == "angel_one"

    # 2. format_human_report handles missing intraday/pct_change without TypeError
    sample = {
        "symbol": {"yahoo": "TEST.NS", "exchange": "NSE"},
        "session": {"ist_timestamp": "2026-11-09T10:15:00+05:30", "phase": "PRIMARY_EXECUTION", "intraday_entry_allowed": True},
        "daily": {"close": 100.0, "pdc": 100.0, "pct_change_from_pdc": None, "pdh": 102.0, "pdl": 98.0, "atr14": 2.0, "ema20": 99.0, "ema50": 95.0, "ema200": None, "rsi14": 55.0, "adx": {"adx": 25.0}, "macd": {"histogram": 0.2}, "relative_volume": 1.3},
        "weekly": {"bias": "BULLISH", "rsi14_w": 58.0},
        "intraday": {},
        "fibonacci": {},
        "rsi_divergences": [],
        "confluence": {
            "bias": "BULLISH",
            "active_confluence_score": 4,
            "score_out_of": 6,
            "reasons": ["HTF trend aligned bullish"],
            "candidate_setup": {"side": "buy", "entry": 100.0, "stop_loss": 97.0, "target_1": 105.0, "target_2": 108.0},
        },
        "regulatory": {"warnings": []},
    }
    report_txt = format_human_report(sample)
    assert "N/A" in report_txt

    # 3. Time Machine respects --broker tax drag differences (Shoonya vs ICICI delivery)
    f_1d = _make_offline_daily(tmp_path / "TCS.NS-1d.json", num_days=120, base_price=3500.0)
    tm_sh = run_timemachine(
        symbol="TCS.NS", entry=3600.0, stop=3450.0, target=3900.0,
        mode="SWING", replays=500, offline_path=str(f_1d), broker="shoonya",
    )
    tm_ic = run_timemachine(
        symbol="TCS.NS", entry=3600.0, stop=3450.0, target=3900.0,
        mode="SWING", replays=500, offline_path=str(f_1d), broker="icici_breeze",
    )
    assert tm_sh["broker"] == "shoonya"
    assert tm_ic["broker"] == "icici_breeze"
    assert tm_ic["estimated_charges_inr"] > tm_sh["estimated_charges_inr"]


def _make_daily_chart_payload(yahoo_sym: str, closes: list[float], volumes: list[float] | None = None) -> dict[str, Any]:
    stamps, opens, highs, lows, vols = [], [], [], [], []
    cur = datetime.date(2026, 9, 1)
    idx = 0
    while idx < len(closes):
        if cur.weekday() < 5:
            bar_dt = datetime.datetime.combine(cur, datetime.time(9, 15))
            stamps.append(_ist_to_unix(bar_dt))
            c = float(closes[idx])
            prev = float(closes[idx - 1]) if idx > 0 else c
            opens.append(prev)
            highs.append(round(max(c, prev) * 1.005, 2))
            lows.append(round(min(c, prev) * 0.995, 2))
            vols.append(float(volumes[idx]) if volumes else 5_000_000.0)
            idx += 1
        cur += datetime.timedelta(days=1)
    return {
        "chart": {
            "result": [
                {
                    "meta": {
                        "symbol": yahoo_sym,
                        "exchangeName": "NSI",
                        "currency": "INR",
                        "regularMarketPrice": float(closes[-1]),
                        "chartPreviousClose": float(closes[-2]) if len(closes) >= 2 else float(closes[-1]),
                        "regularMarketTime": stamps[-1],
                    },
                    "timestamp": stamps,
                    "indicators": {
                        "quote": [
                            {
                                "open": opens,
                                "high": highs,
                                "low": lows,
                                "close": [float(c) for c in closes],
                                "volume": vols,
                            }
                        ]
                    },
                }
            ]
        }
    }


def _make_single_session_5m(
    yahoo_sym: str,
    day: datetime.date,
    or_high: float = 100.0,
    or_low: float = 98.0,
    breakout_close: float = 102.5,
) -> dict[str, object]:
    stamps, opens, highs, lows, closes, vols = [], [], [], [], [], []
    # Build 12 5m bars from 09:15 to 10:10 IST
    for slot in range(12):
        bar_dt = datetime.datetime.combine(day, datetime.time(9, 15)) + datetime.timedelta(minutes=5 * slot)
        stamps.append(_ist_to_unix(bar_dt))
        if slot < 3:
            o = round((or_high + or_low) / 2.0, 2)
            h = or_high
            low_v = or_low
            c = round(or_high - 0.3, 2)
            v = 100_000.0
        elif slot == 3:
            o = round(or_high - 0.2, 2)
            h = round(breakout_close + 0.4, 2)
            low_v = round(or_high - 0.5, 2)
            c = breakout_close
            v = 450_000.0
        else:
            o = breakout_close
            h = round(breakout_close + 0.6, 2)
            low_v = round(breakout_close - 0.2, 2)
            c = round(breakout_close + 0.2, 2)
            v = 200_000.0
        opens.append(o)
        highs.append(h)
        lows.append(low_v)
        closes.append(c)
        vols.append(v)
    return {
        "chart": {
            "result": [
                {
                    "meta": {
                        "symbol": yahoo_sym,
                        "exchangeName": "NSI",
                        "currency": "INR",
                        "chartPreviousClose": round(or_low - 1.0, 2),
                    },
                    "timestamp": stamps,
                    "indicators": {
                        "quote": [
                            {
                                "open": opens,
                                "high": highs,
                                "low": lows,
                                "close": closes,
                                "volume": vols,
                            }
                        ]
                    },
                }
            ]
        }
    }


def test_indian_news_feeds_dedupe_and_data_loader_integration(tmp_path: Path) -> None:
    # 1. Indian pubDate parsing (RFC-2822, SEBI "+0530", RBI naive IST, ISO)
    assert nse_news.parse_indian_pubdate("Wed, 11 Nov 2026 09:15:00 GMT") == datetime.datetime(
        2026, 11, 11, 9, 15, tzinfo=datetime.timezone.utc
    )
    sebi_dt = nse_news.parse_indian_pubdate("10 Nov, 2026 +0530")
    assert sebi_dt == datetime.datetime(2026, 11, 9, 18, 30, tzinfo=datetime.timezone.utc)
    rbi_dt = nse_news.parse_indian_pubdate("Wed, 11 Nov 2026 13:40:00")
    assert rbi_dt == datetime.datetime(2026, 11, 11, 8, 10, tzinfo=datetime.timezone.utc)

    # 2. XXE stripping + catalyst classification
    xxe_rss = b"""<?xml version="1.0" encoding="ISO-8859-1"?>
    <!DOCTYPE rss [<!ENTITY xxe "bad">]>
    <rss version="2.0"><channel><item>
      <title>Suzlon Energy bags 500 MW EPC order win, Q2 PAT surges - Moneycontrol</title>
      <link>https://example.com/suzlon-1</link>
      <pubDate>Wed, 11 Nov 2026 08:30:00 GMT</pubDate>
      <source>Moneycontrol</source>
    </item></channel></rss>"""
    parsed_items = nse_news.parse_rss_items(xxe_rss, "Google News IN")
    assert len(parsed_items) == 1
    assert parsed_items[0]["title"] == "Suzlon Energy bags 500 MW EPC order win, Q2 PAT surges"
    assert set(parsed_items[0]["tags"]) >= {"earnings", "order_win"}

    # 3. Offline news bundle + F&O ban + MOVE>=3% + SQLite paper_orders auto-discovery
    off_dir = tmp_path / "offline_news"
    off_dir.mkdir()
    (off_dir / "gnews-SUZLON.xml").write_bytes(xxe_rss)
    (off_dir / "et-stocks.xml").write_text(
        "<rss version='2.0'><channel><item>"
        "<title>SEBI issues show cause inquiry affecting SUZLON peer compliance</title>"
        "<link>https://example.com/et-1</link>"
        "<pubDate>Wed, 11 Nov 2026 09:00:00 GMT</pubDate>"
        "</item></channel></rss>",
        encoding="utf-8",
    )
    (off_dir / "sebi.xml").write_text(
        "<rss version='2.0'><channel><item>"
        "<title>SEBI Adjudication Order on F&amp;O Ban &amp; MWPL violation</title>"
        "<link>https://sebi.gov.in/ord1</link>"
        "<pubDate>10 Nov, 2026 +0530</pubDate>"
        "</item></channel></rss>",
        encoding="utf-8",
    )
    (off_dir / "fo_secban.csv").write_text(
        "Securities in Ban For Trade Date 11-NOV-2026\n1,SUZLON\n",
        encoding="utf-8",
    )
    # SUZLON +5% daily chart
    (off_dir / "chart-SUZLON.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("SUZLON.NS", [50.0, 50.0, 52.5])),
        encoding="utf-8",
    )

    # Seed OPEN paper trade in SQLite so auto-discovery finds SUZLON with no --tickers flag
    staged = mb_stage_or_execute_order(
        symbol="SUZLON",
        entry=52.0,
        stop=49.0,
        target=58.0,
        segment="EQ_DELIVERY",
        now_str="2026-11-11 10:15",
        state_dir=tmp_path,
    )
    assert staged["symbol"] == "SUZLON"
    assert nse_news.discover_default_tickers(tmp_path) == ["SUZLON"]

    rep1 = nse_news.fetch_indian_news(
        tickers=None,
        hours=72,
        now_str="2026-11-11 15:00",
        state_dir=tmp_path,
        offline_dir=off_dir,
        write_state=True,
    )
    t_suz = rep1["tickers"][0]
    assert t_suz["symbol"] == "SUZLON"
    assert t_suz["in_fno_ban"] is True
    assert t_suz["move"]["is_moving"] is True
    assert any("FNO_BAN" in f for f in t_suz["flags"])
    assert any("MOVING (+5.00%)" in f for f in t_suz["flags"])
    assert t_suz["news_count"] == 2
    assert len(rep1["regulatory_alerts"]) == 1

    # Second run suppresses already-seen items; show_all=True brings them back
    rep2 = nse_news.fetch_indian_news(
        tickers=["SUZLON"],
        hours=72,
        now_str="2026-11-11 15:05",
        state_dir=tmp_path,
        offline_dir=off_dir,
        show_all=False,
    )
    assert rep2["tickers"][0]["news_count"] == 0
    assert any("WITH NO FRESH HEADLINE" in f for f in rep2["tickers"][0]["flags"])

    rep3 = nse_news.fetch_indian_news(
        tickers=["SUZLON"],
        hours=72,
        now_str="2026-11-11 15:05",
        state_dir=tmp_path,
        offline_dir=off_dir,
        show_all=True,
    )
    assert rep3["tickers"][0]["news_count"] == 2

    # 4. Data loader --with-news propagates F&O ban & attaches news
    f_5m = _make_offline_nse_5m(tmp_path / "SUZLON.NS-5m.json", num_days=25, base_price=50.0)
    f_1d = _make_offline_daily(tmp_path / "SUZLON.NS-1d.json", num_days=220, base_price=45.0)
    dl = analyze_symbol(
        symbol="SUZLON",
        now_str="2026-11-11 11:00",
        offline_5m=str(f_5m),
        offline_1d=str(f_1d),
        offline_1wk=str(f_1d),
        with_news=True,
        offline_news=str(off_dir),
    )
    assert dl["regulatory"]["fno_ban"] is True
    assert dl["news"]["in_fno_ban"] is True
    assert len(dl["news"]["items"]) == 2
    assert "News (2 headlines" in format_human_report(dl)


def test_indian_scanner_universe_daily_and_orb_offline(tmp_path: Path) -> None:
    off_sc = tmp_path / "scanner_offline"
    off_sc.mkdir()

    (off_sc / "ind_nifty50list.csv").write_text(
        "Company Name,Industry,Symbol,Series,ISIN Code\n"
        "Bank of Baroda,Financial Services,BANKBARODA,EQ,INE028A01039\n"
        "Breakout Co,Capital Goods,BREAKCO,EQ,INE000A01001\n"
        "Trade2Trade Co,Textiles,T2TCO,BE,INE000A01002\n",
        encoding="utf-8",
    )
    (off_sc / "EQUITY_L.csv").write_text(
        "SYMBOL,NAME OF COMPANY,SERIES,DATE OF LISTING,PAID UP VALUE,MARKET LOT,ISIN NUMBER,FACE VALUE\n"
        "BANKBARODA,Bank of Baroda,EQ,01-JAN-2000,2,1,INE028A01039,2\n"
        "BREAKCO,Breakout Co Ltd,EQ,01-JAN-2000,10,1,INE000A01001,10\n"
        "T2TCO,Trade2Trade Co Ltd,BE,01-JAN-2000,10,1,INE000A01002,10\n",
        encoding="utf-8",
    )
    (off_sc / "fo_mktlots.csv").write_text(
        "Derivatives on Individual Securities\n"
        "Sr.No,Symbol,NOV-26,DEC-26\n"
        "1,BANKBARODA,2925,2925\n",
        encoding="utf-8",
    )
    (off_sc / "fo_secban.csv").write_text(
        "Securities in Ban For Trade Date 11-NOV-2026\n1,BANKBARODA\n",
        encoding="utf-8",
    )

    uni = nse_scanner.build_indian_universe(
        pool="nifty50", state_dir=tmp_path, offline_dir=off_sc, write=True
    )
    assert uni["count"] == 3
    by_sym = {row["symbol"]: row for row in uni["symbols"]}
    assert by_sym["BANKBARODA"]["is_fno"] is True
    assert by_sym["BANKBARODA"]["lot_size"] == 2925
    assert by_sym["BANKBARODA"]["in_fno_ban"] is True
    assert by_sym["T2TCO"]["series"] == "BE"
    assert (tmp_path / "universe.txt").exists()

    # Daily charts: BREAKCO makes 20-day closing breakout; T2TCO also breaks out but should be filtered unless --include-t2t
    breakout_closes = [100.0 + (i % 3) for i in range(25)] + [120.0]
    flat_closes = [200.0 for _ in range(26)]
    (off_sc / "BREAKCO.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("BREAKCO.NS", breakout_closes)),
        encoding="utf-8",
    )
    (off_sc / "T2TCO.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("T2TCO.NS", breakout_closes)),
        encoding="utf-8",
    )
    (off_sc / "BANKBARODA.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("BANKBARODA.NS", flat_closes)),
        encoding="utf-8",
    )

    daily_res = nse_scanner.scan_daily_indian(
        pool="nifty50",
        setup_filter="breakout_20d",
        min_price=50.0,
        min_volume=100_000,
        min_turnover_cr=10.0,
        now_str="2026-11-11 16:00",
        state_dir=tmp_path,
        offline_path=off_sc,
        write=True,
    )
    assert daily_res["skipped_t2t_count"] == 1
    assert [h["symbol"] for h in daily_res["hits"]] == ["BREAKCO"]
    assert "breakout_20d" in daily_res["hits"][0]["setups"]
    assert (tmp_path / "watchlist.json").exists()

    # Include T2T -> returns both BREAKCO and T2TCO
    daily_t2t = nse_scanner.scan_daily_indian(
        pool="nifty50",
        setup_filter="breakout_20d",
        include_t2t=True,
        now_str="2026-11-11 16:00",
        state_dir=tmp_path,
        offline_path=off_sc,
        write=False,
    )
    assert {h["symbol"] for h in daily_t2t["hits"]} == {"BREAKCO", "T2TCO"}

    # ORB scan: overwrite offline dir with clean 5m ORB fixtures
    orb_dir = tmp_path / "orb_offline"
    orb_dir.mkdir()
    sess_day = datetime.date(2026, 11, 11)
    (orb_dir / "ORBHIT.NS.json").write_text(
        json.dumps(_make_single_session_5m("ORBHIT.NS", sess_day, or_high=250.0, or_low=245.0, breakout_close=254.0)),
        encoding="utf-8",
    )
    orb_res = nse_scanner.scan_orb_indian(
        symbols_csv="ORBHIT",
        now_str="2026-11-11 10:30",
        state_dir=tmp_path,
        offline_path=orb_dir,
        write=True,
    )
    assert len(orb_res["hits"]) == 1
    hit = orb_res["hits"][0]
    assert hit["symbol"] == "ORBHIT"
    assert hit["orh"] == 250.0
    assert hit["trigger_time_ist"] == "09:35"
    assert hit["above_vwap"] is True

    # Before 09:30 IST raises clean error
    with pytest.raises(NSETraderError, match="Opening range"):
        nse_scanner.scan_orb_indian(
            symbols_csv="ORBHIT",
            now_str="2026-11-11 09:20",
            state_dir=tmp_path,
            offline_path=orb_dir,
            write=False,
        )


def test_indian_alerts_clock_ledger_short_directions_and_watch(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    # 1. Clock on Diwali-Balipratipada holiday (2026-11-10) -> closed, next open 2026-11-11 09:15 IST
    hol = nse_alerts.get_nse_clock_status("2026-11-10 10:15")
    assert hol["is_market_open"] is False
    assert hol["phase"] == "CLOSED_HOLIDAY"
    assert hol["next_open_ist"] == "2026-11-11 09:15 IST"

    open_st = nse_alerts.get_nse_clock_status("2026-11-11 10:15")
    assert open_st["is_market_open"] is True
    assert open_st["intraday_entry_allowed"] is True

    # 2. Stage a SHORT intraday paper trade & a LONG delivery paper trade in SQLite paper_orders
    t_short = mb_stage_or_execute_order(
        symbol="TATAMOTORS",
        entry=800.0,
        stop=812.0,
        target=776.0,
        segment="EQ_INTRADAY",
        side="sell",
        capital_inr=100_000.0,
        now_str="2026-11-11 10:00",
        state_dir=tmp_path,
    )
    t_long = mb_stage_or_execute_order(
        symbol="BANKBARODA",
        entry=247.0,
        stop=235.0,
        target=275.0,
        segment="EQ_DELIVERY",
        side="buy",
        capital_inr=100_000.0,
        now_str="2026-11-11 10:05",
        state_dir=tmp_path,
    )

    rc_sync = nse_alerts.main(["add", "--from-ledger", "--state-dir", str(tmp_path), "--json"])
    assert rc_sync == 0
    capsys.readouterr()
    rc_bell = nse_alerts.main(["add", "--ist-bell", "--state-dir", str(tmp_path)])
    assert rc_bell == 0
    capsys.readouterr()

    rules_doc = json.loads((tmp_path / "alerts.json").read_text(encoding="utf-8"))
    rule_ids = {r["id"] for r in rules_doc["rules"]}
    assert f"ledger-{t_short['trade_id']}-tatamotors-stop" in rule_ids
    assert f"ledger-{t_short['trade_id']}-tatamotors-target" in rule_ids
    assert f"ledger-{t_short['trade_id']}-tatamotors-flat" in rule_ids
    assert f"ledger-{t_long['trade_id']}-bankbaroda-flat" not in rule_ids  # EQ_DELIVERY has no intraday flatten bell
    assert {"nse-open-bell", "nse-or-complete", "nse-hazard-lock", "nse-flatten-warning"}.issubset(rule_ids)

    # 3. Offline quotes: TATAMOTORS rallies above short stop (815 >= 812); BANKBARODA hits long target (276 >= 275)
    q_dir = tmp_path / "quotes_off"
    q_dir.mkdir()
    (q_dir / "yahoo-TATAMOTORS.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("TATAMOTORS.NS", [800.0, 815.0])),
        encoding="utf-8",
    )
    (q_dir / "yahoo-BANKBARODA.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("BANKBARODA.NS", [247.0, 276.0])),
        encoding="utf-8",
    )

    rc_chk1 = nse_alerts.main(
        [
            "check",
            "--state-dir", str(tmp_path),
            "--offline", str(q_dir),
            "--now", "2026-11-11 15:12",
            "--json",
        ]
    )
    assert rc_chk1 == 0
    chk_out = json.loads(capsys.readouterr().out)
    rang_ids = {r["id"] for r in chk_out["rings"]}
    assert f"ledger-{t_short['trade_id']}-tatamotors-stop" in rang_ids
    assert f"ledger-{t_short['trade_id']}-tatamotors-flat" in rang_ids
    assert f"ledger-{t_long['trade_id']}-bankbaroda-target" in rang_ids
    assert "nse-flatten-warning" in rang_ids
    assert (tmp_path / "prices.json").exists()

    # Immediate re-check is quiet (exit 1) because price & today bells already rang
    rc_chk2 = nse_alerts.main(
        [
            "check",
            "--state-dir", str(tmp_path),
            "--offline", str(q_dir),
            "--now", "2026-11-11 15:13",
            "--json",
        ]
    )
    assert rc_chk2 == 1
    capsys.readouterr()

    # 4. Closing short trade removes its ledger alerts on next sync
    mb_close_paper_trade(t_short["trade_id"], exit_price=815.0, reason="STOP", now_str="2026-11-11 15:13", state_dir=tmp_path)
    nse_alerts.main(["add", "--from-ledger", "--state-dir", str(tmp_path)])
    capsys.readouterr()
    rules_after = {r["id"] for r in json.loads((tmp_path / "alerts.json").read_text(encoding="utf-8"))["rules"]}
    assert f"ledger-{t_short['trade_id']}-tatamotors-stop" not in rules_after
    assert f"ledger-{t_long['trade_id']}-bankbaroda-target" in rules_after

    # 5. Re-arm test + bounded watch cycle test
    nse_alerts.main(
        ["add", "--symbol", "SBIN", "--above", "850", "--rearm", "--state-dir", str(tmp_path)]
    )
    capsys.readouterr()
    (q_dir / "yahoo-SBIN.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("SBIN.NS", [840.0, 855.0])),
        encoding="utf-8",
    )
    rc_w = nse_alerts.main(
        [
            "watch",
            "--max-cycles", "2",
            "--interval", "0",
            "--state-dir", str(tmp_path),
            "--offline", str(q_dir),
            "--now", "2026-11-11 10:30",
            "--json",
        ]
    )
    assert rc_w == 0
    lines = [json.loads(line) for line in capsys.readouterr().out.strip().splitlines()]
    assert len(lines) == 2
    assert any(r["symbol"] == "SBIN" for r in lines[0]["rings"])
    assert not any(r["symbol"] == "SBIN" for r in lines[1]["rings"])

    # Pullback below 850 clears rung state because --rearm was set
    (q_dir / "yahoo-SBIN.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("SBIN.NS", [845.0, 848.0])),
        encoding="utf-8",
    )
    assert nse_alerts.main(
        ["check", "--state-dir", str(tmp_path), "--offline", str(q_dir), "--now", "2026-11-11 11:00"]
    ) == 1
    capsys.readouterr()
    st_after_pullback = json.loads((tmp_path / "alerts_state.json").read_text(encoding="utf-8"))
    assert "sbin-above-850" not in st_after_pullback["rung"]


def test_cli_wrappers_holiday_suppression_and_scanner_exit_codes(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    # 1. Alert holiday suppression: opening_bell + time do NOT fire on Diwali holiday (2026-11-10)
    assert nse_alerts.main(["add", "--opening-bell", "--state-dir", str(tmp_path)]) == 0
    assert nse_alerts.main(["add", "--ist-bell", "--state-dir", str(tmp_path)]) == 0
    capsys.readouterr()

    rc_hol = nse_alerts.main(["check", "--state-dir", str(tmp_path), "--now", "2026-11-10 10:15", "--json"])
    assert rc_hol == 1
    hol_out = json.loads(capsys.readouterr().out)
    assert hol_out["rings"] == []
    assert hol_out["market"]["phase"] == "CLOSED_HOLIDAY"

    # list, remove, reset CLI paths
    assert nse_alerts.main(["list", "--state-dir", str(tmp_path), "--json"]) == 0
    capsys.readouterr()
    assert nse_alerts.main(["remove", "nse-opening-bell", "--state-dir", str(tmp_path)]) == 0
    capsys.readouterr()

    # 2. nse_news --market offline + no-ticker error path
    off_n = tmp_path / "mkt_news"
    off_n.mkdir()
    (off_n / "livemint-markets.xml").write_text(
        "<rss version='2.0'><channel><item>"
        "<title>Nifty 50 hits fresh record as RBI holds repo rate steady</title>"
        "<link>https://example.com/lm-1</link>"
        "<pubDate>Wed, 11 Nov 2026 07:30:00 GMT</pubDate>"
        "</item></channel></rss>",
        encoding="utf-8",
    )
    assert nse_news.main(
        ["--market", "--now", "2026-11-11 10:00", "--state-dir", str(tmp_path), "--offline", str(off_n), "--json"]
    ) == 0
    mkt_out = json.loads(capsys.readouterr().out)
    assert len(mkt_out["market_headlines"]) == 1

    # Calling nse_news with empty state dir and no --tickers/--market exits cleanly with 1
    empty_dir = tmp_path / "empty_state"
    empty_dir.mkdir()
    assert nse_news.main(["--state-dir", str(empty_dir), "--offline", str(off_n)]) == 1
    capsys.readouterr()

    # 3. Scanner CLI exit codes: 1 when 0 hits match, 0 when hit matches
    off_sc = tmp_path / "sc_cli"
    off_sc.mkdir()
    flat_closes = [150.0 for _ in range(25)]
    (off_sc / "FLAT.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("FLAT.NS", flat_closes)),
        encoding="utf-8",
    )
    rc_empty = nse_scanner.main(
        [
            "daily",
            "--symbols", "FLAT",
            "--setup", "breakout_20d",
            "--now", "2026-11-11 16:00",
            "--state-dir", str(tmp_path),
            "--offline", str(off_sc),
            "--json",
        ]
    )
    assert rc_empty == 1
    capsys.readouterr()

    # 4. Regression: Yahoo range=5d sets chartPreviousClose to 5 trading days ago, not yesterday
    stale_5d = _make_daily_chart_payload("BANKBARODA.NS", [245.35, 250.0, 255.0, 260.0, 275.0])
    stale_5d["chart"]["result"][0]["meta"]["chartPreviousClose"] = 245.35
    q_stale = nse_alerts.parse_yahoo_quote(json.dumps(stale_5d), "BANKBARODA.NS", "BANKBARODA")
    assert q_stale["prev_close"] == 260.0
    assert q_stale["pct_change"] == 5.77

    stale_dir = tmp_path / "stale_5d_news"
    stale_dir.mkdir()
    (stale_dir / "chart-BANKBARODA.NS.json").write_text(json.dumps(stale_5d), encoding="utf-8")
    mv_stale = nse_news.fetch_move_context(
        {"base": "BANKBARODA", "yahoo": "BANKBARODA.NS"},
        move_alert_pct=3.0,
        offline_dir=stale_dir,
    )
    assert mv_stale["prev_close"] == 260.0
    assert mv_stale["pct_change"] == 5.77


def test_nse_ui_formatting_ansi_and_ascii_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    assert nse_ui.format_inr(125000) == "Rs. 1,25,000.00"
    assert nse_ui.format_inr(10000000, signed=True) == "+Rs. 1,00,00,000.00"
    assert nse_ui.format_inr(-450.5) == "-Rs. 450.50"
    assert nse_ui.format_inr(None) == "N/A"
    assert nse_ui.format_pct(2.5) == "+2.50%"
    assert nse_ui.format_pct(None) == "N/A"

    colored = "\x1b[92mRELIANCE\x1b[0m"
    assert nse_ui.vis_len(colored) == 8
    assert nse_ui.strip_ansi(colored) == "RELIANCE"
    padded = nse_ui.pad_vis(colored, 12, "right")
    assert nse_ui.vis_len(padded) == 12
    assert padded.startswith("    ")

    monkeypatch.setenv("NO_COLOR", "1")
    monkeypatch.setenv("FORCE_COLOR", "1")
    assert nse_ui.supports_color() is False
    monkeypatch.delenv("NO_COLOR", raising=False)
    assert nse_ui.supports_color() is True
    monkeypatch.delenv("FORCE_COLOR", raising=False)

    ui = nse_ui.UI(color=False, unicode_box=False, width=80)
    banner = ui.banner("ASCII TEST", subtitle="Short subtitle", badge="PASS", badge_tone="pass")
    assert banner.startswith("+")
    assert "[PASS]" in banner
    tbl = ui.table(
        headers=["Symbol", "Levels", "Guide"],
        rows=[["RELIANCE", "H 1320.00\nL 1305.00", "This is a longer beginner explanation that wraps nicely."]],
        nowrap_cols={0, 1},
    )
    for line in (banner + "\n" + tbl).splitlines():
        assert len(line) <= 80
    assert "H 1320.00" in tbl
    assert "L 1305.00" in tbl
    callout = ui.callout("Reminder", ["Check separate SL/GTT in broker app."], tone_name="warn")
    assert "[!] Reminder" in callout


def test_human_cli_outputs_across_scripts(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("NO_COLOR", "1")

    assert mb_main(["brokers"]) == 0
    out_br = capsys.readouterr().out
    assert "SUPPORTED INDIAN BROKERS" in out_br
    assert "angel_one *" in out_br
    assert "zerodha" in out_br

    scrip_file = tmp_path / "scrip.json"
    scrip_file.write_text(
        json.dumps(
            [
                {
                    "token": "2885",
                    "symbol": "RELIANCE-EQ",
                    "name": "RELIANCE",
                    "expiry": "",
                    "strike": "-1",
                    "lotsize": "1",
                    "instrumenttype": "",
                    "exch_seg": "NSE",
                    "tick_size": "5.000000",
                }
            ]
        ),
        encoding="utf-8",
    )
    assert mb_main(["sync-scrip", "--offline", str(scrip_file), "--state-dir", str(tmp_path)]) == 0
    assert "SCRIP MASTER SYNCED" in capsys.readouterr().out
    assert mb_main(["lookup", "--symbol", "RELIANCE", "--exchange", "NSE", "--state-dir", str(tmp_path)]) == 0
    lk_out = capsys.readouterr().out
    assert "INSTRUMENT TOKEN LOOKUP" in lk_out
    assert "Spot Equity" in lk_out

    f_5m = _make_offline_nse_5m(tmp_path / "SBIN.NS-5m.json", num_days=25, base_price=800.0, drift=0.0012)
    f_1d = _make_offline_daily(tmp_path / "SBIN.NS-1d.json", num_days=220, base_price=700.0)

    assert (
        nse_data_loader.main(
            [
                "--symbol", "SBIN",
                "--now", "2026-11-09 10:15",
                "--offline-5m", str(f_5m),
                "--offline-1d", str(f_1d),
                "--offline-1wk", str(f_1d),
            ]
        )
        == 0
    )
    dl_out = capsys.readouterr().out
    assert "NSE/BSE MARKET STRUCTURE" in dl_out
    assert "Beginner Guide" in dl_out

    assert (
        nse_timemachine.main(
            [
                "--symbol", "SBIN.NS",
                "--entry", "800",
                "--stop", "794",
                "--target", "812",
                "--mode", "INTRADAY",
                "--entry-time", "09:30",
                "--replays", "500",
                "--offline", str(f_5m),
                "--state-dir", str(tmp_path),
                "--write",
            ]
        )
        == 0
    )
    tm_out = capsys.readouterr().out
    assert "NSE/BSE TIME MACHINE" in tm_out
    assert "Outcome Odds" in tm_out

    assert (
        indian_risk_gate.main(
            [
                "--symbol", "SBIN",
                "--capital", "50000",
                "--risk-pct", "1.0",
                "--entry", "800",
                "--stop", "794",
                "--target", "812",
                "--segment", "EQ_INTRADAY",
                "--timemachine-json", str(tmp_path / "timemachine_result.json"),
                "--now", "2026-11-09 10:15",
                "--state-dir", str(tmp_path),
                "--write",
            ]
        )
        == 0
    )
    rg_out = capsys.readouterr().out
    assert "INDIAN RISK & TAX GATE" in rg_out
    assert "STT (2026 Rate)" in rg_out

    assert (
        mb_main(
            [
                "stage",
                "--broker", "zerodha",
                "--symbol", "SBIN",
                "--segment", "EQ_INTRADAY",
                "--entry", "800",
                "--stop", "794",
                "--target", "812",
                "--now", "2026-11-09 10:15",
                "--state-dir", str(tmp_path),
                "--paper",
            ]
        )
        == 0
    )
    st_out = capsys.readouterr().out
    assert "PAPER ORDER STAGED" in st_out
    assert "Non-Bracket Live Orders" in st_out

    assert mb_main(["ledger", "--state-dir", str(tmp_path)]) == 0
    lg_out = capsys.readouterr().out
    assert "PAPER TRADING LEDGER" in lg_out
    assert "OPEN" in lg_out

    assert (
        mb_main(
            [
                "close",
                "--trade-id", "1",
                "--exit-price", "812",
                "--reason", "TARGET",
                "--now", "2026-11-09 11:30",
                "--state-dir", str(tmp_path),
            ]
        )
        == 0
    )
    cl_out = capsys.readouterr().out
    assert "PAPER TRADE CLOSED" in cl_out

    # Scanner + News + Alerts human CLI coverage
    uni_dir = tmp_path / "uni_hum"
    uni_dir.mkdir()
    (uni_dir / "ind_nifty50list.csv").write_text(
        "Company Name,Industry,Symbol,Series,ISIN Code\n"
        "Break Co,Capital Goods,BREAKCO,EQ,INE000A01001\n",
        encoding="utf-8",
    )
    (uni_dir / "EQUITY_L.csv").write_text(
        "SYMBOL,NAME OF COMPANY,SERIES,DATE OF LISTING,PAID UP VALUE,MARKET LOT,ISIN NUMBER,FACE VALUE\n"
        "BREAKCO,Break Co Ltd,EQ,01-JAN-2000,10,1,INE000A01001,10\n",
        encoding="utf-8",
    )
    (uni_dir / "fo_mktlots.csv").write_text("Derivatives\nSr.No,Symbol,NOV-26\n", encoding="utf-8")
    (uni_dir / "fo_secban.csv").write_text("Securities in Ban For Trade Date 11-NOV-2026\n", encoding="utf-8")
    breakout_closes = [100.0 + (i % 3) for i in range(25)] + [120.0]
    (uni_dir / "BREAKCO.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("BREAKCO.NS", breakout_closes)),
        encoding="utf-8",
    )

    assert nse_scanner.main(["universe", "--pool", "nifty50", "--state-dir", str(tmp_path), "--offline", str(uni_dir)]) == 0
    assert "NSE STOCK UNIVERSE CACHED" in capsys.readouterr().out
    assert (
        nse_scanner.main(
            ["daily", "--pool", "nifty50", "--now", "2026-11-11 16:00", "--state-dir", str(tmp_path), "--offline", str(uni_dir)]
        )
        == 0
    )
    assert "NSE/BSE MARKET SCANNER [DAILY]" in capsys.readouterr().out

    orb_dir = tmp_path / "orb_hum"
    orb_dir.mkdir()
    (orb_dir / "ORBHIT.NS.json").write_text(
        json.dumps(_make_single_session_5m("ORBHIT.NS", datetime.date(2026, 11, 11))),
        encoding="utf-8",
    )
    assert (
        nse_scanner.main(
            ["orb", "--symbols", "ORBHIT", "--now", "2026-11-11 10:30", "--state-dir", str(tmp_path), "--offline", str(orb_dir)]
        )
        == 0
    )
    assert "NSE/BSE MARKET SCANNER [ORB]" in capsys.readouterr().out

    ndir = tmp_path / "news_hum"
    ndir.mkdir()
    (ndir / "livemint-markets.xml").write_text(
        "<rss version='2.0'><channel><item>"
        "<title>Nifty 50 hits fresh record as RBI holds repo rate steady</title>"
        "<link>https://example.com/lm</link>"
        "<pubDate>Wed, 11 Nov 2026 07:30:00 GMT</pubDate>"
        "</item></channel></rss>",
        encoding="utf-8",
    )
    assert nse_news.main(["--market", "--now", "2026-11-11 10:00", "--state-dir", str(tmp_path), "--offline", str(ndir)]) == 0
    assert "NSE/BSE INDIAN NEWS & REGULATORY BRIEFING" in capsys.readouterr().out

    assert nse_alerts.main(["clock", "--now", "2026-11-11 10:15"]) == 0
    assert "PRIMARY_EXECUTION" in capsys.readouterr().out
    assert nse_alerts.main(["add", "--ist-bell", "--state-dir", str(tmp_path)]) == 0
    assert "Added 4 Alert Rule(s)" in capsys.readouterr().out
    assert nse_alerts.main(["list", "--state-dir", str(tmp_path)]) == 0
    assert "CONFIGURED NSE / BSE ALERT RULES" in capsys.readouterr().out
    (ndir / "yahoo-BREAKCO.NS.json").write_text(
        json.dumps(_make_daily_chart_payload("BREAKCO.NS", [100.0, 120.0])),
        encoding="utf-8",
    )
    assert nse_alerts.main(["quote", "BREAKCO", "--state-dir", str(tmp_path), "--offline", str(ndir), "--now", "2026-11-11 10:15"]) == 0
    assert "NSE / BSE LIVE QUOTE SNAPSHOT" in capsys.readouterr().out
    assert nse_alerts.main(["check", "--state-dir", str(tmp_path), "--offline", str(ndir), "--now", "2026-11-11 10:15"]) == 0
    assert "TRIGGERED ALERTS" in capsys.readouterr().out
    assert nse_alerts.main(["reset", "--all", "--state-dir", str(tmp_path)]) == 0
    assert "Re-armed all alert rules" in capsys.readouterr().out
    assert nse_alerts.main(["remove", "nse-open-bell", "--state-dir", str(tmp_path)]) == 0
    assert "Removed alert rule" in capsys.readouterr().out


def test_tradingview_cloud_indicators_and_mcp_server(tmp_path, capsys, monkeypatch):
    import io
    import tv_indicators
    import tv_mcp_server

    assert tv_indicators.resolve_tv_symbol("BANKBARODA") == "NSE:BANKBARODA"
    assert tv_indicators.resolve_tv_symbol("NIFTY") == "NSE:NIFTY"
    assert tv_indicators.resolve_tv_symbol("SENSEX") == "BSE:SENSEX"
    assert tv_indicators.resolve_tv_symbol("NSE:RELIANCE") == "NSE:RELIANCE"

    mock_tv_response = {
        "totalCount": 1,
        "data": [
            {
                "s": "NSE:BANKBARODA",
                "d": [
                    276.15, 0.42, 275.0, 277.5, 274.0, 15000000, 0.47, 0.93, 0.0,
                    78.90, 8.21, 248.40, 243.07, 253.91, 28.96, 6.43, 275.29, 99.07, 43.26
                ]
            }
        ]
    }

    class MockHTTPResponse:
        def __init__(self, data_dict):
            self._bytes = json.dumps(data_dict).encode("utf-8")
        def read(self):
            return self._bytes
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    def mock_urlopen(req, timeout=10.0):
        return MockHTTPResponse(mock_tv_response)

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    res = tv_indicators.fetch_tv_technicals(
        symbols=["BANKBARODA"],
        timeframe="1d",
        requested_indicators=["RSI", "MACD", "EMA20", "EMA50", "EMA200", "ADX", "ATR", "VWAP", "STOCH_K", "BB_POWER"]
    )
    assert len(res) == 1
    item = res[0]
    assert item["ticker"] == "NSE:BANKBARODA"
    assert item["close"] == 276.15
    assert item["recommendation"]["stance"] == "BUY"
    assert item["indicators"]["RSI"]["value"] == 78.90

    # Test human table output
    table_str = tv_indicators.format_human_tv_report(item)
    assert "TRADINGVIEW CLOUD TECHNICALS" in table_str
    assert "NSE:BANKBARODA" in table_str
    assert "OVERBOUGHT" in table_str

    # Test CLI main
    assert tv_indicators.main(["--symbol", "BANKBARODA"]) == 0
    cli_out = capsys.readouterr().out
    assert "TRADINGVIEW CLOUD TECHNICALS" in cli_out

    assert tv_indicators.main(["--symbol", "BANKBARODA", "--json"]) == 0
    json_out = capsys.readouterr().out
    parsed = json.loads(json_out)
    assert parsed[0]["ticker"] == "NSE:BANKBARODA"

    # Test MCP Server tools
    tools = tv_mcp_server.get_tools_list()
    assert len(tools) == 2
    tool_names = [t["name"] for t in tools]
    assert "get_tradingview_technicals" in tool_names
    assert "scan_tradingview_stocks" in tool_names

    call_res = tv_mcp_server.handle_tool_call(
        "get_tradingview_technicals",
        {"symbol": "BANKBARODA", "timeframe": "1d", "indicators": ["RSI", "MACD"]}
    )
    assert "TradingView Cloud Technicals for NSE:BANKBARODA" in call_res["content"][0]["text"]

    scan_res = tv_mcp_server.handle_tool_call(
        "scan_tradingview_stocks",
        {"symbols": ["BANKBARODA"], "timeframe": "1d"}
    )
    assert "TradingView Multi-Stock Scan" in scan_res["content"][0]["text"]


def test_option_chain_and_sector_scanner():
    """Verify Black-Scholes Greeks, PCR, Max Pain, and Sector Rotation Heatmap."""
    import nse_option_chain
    import nse_sector_scanner

    # 1. Black-Scholes Greeks pure math
    g = nse_option_chain.black_scholes_greeks(spot=25600.0, strike=25600.0, time_to_expiry_years=5/365.0, iv=0.14)
    assert 0.45 <= g["call_delta"] <= 0.60
    assert -0.60 <= g["put_delta"] <= -0.45
    assert g["gamma"] > 0
    assert g["vega"] > 0
    assert g["call_theta"] < 0
    assert g["put_theta"] < 0

    # 2. Synthetic Chain & Max Pain
    synth = nse_option_chain.generate_synthesized_chain("NIFTY", spot=25600.0, num_strikes=11)
    recs = synth["records"]["data"]
    assert len(recs) == 11
    pcr = nse_option_chain.calculate_pcr(recs)
    assert 0.5 <= pcr["pcr_oi"] <= 2.0
    assert pcr["stance"] in ("BULLISH", "BEARISH", "NEUTRAL")

    max_pain, _ = nse_option_chain.calculate_max_pain(recs)
    assert 25000.0 <= max_pain <= 26200.0

    # 3. Sector Scanner Execution
    assert nse_sector_scanner.scan_sectors() == 0







