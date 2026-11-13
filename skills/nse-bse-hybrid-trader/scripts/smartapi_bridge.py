#!/usr/bin/env python3
"""Angel One SmartAPI & SQLite Paper Trading Bridge (backward-compatible facade over broker_bridge.py).

Supports `angel_one` by default, or any broker supported by broker_bridge.py via `--broker`:
  zerodha, upstox, dhan, fyers, groww, kotak_neo, icici_breeze, shoonya, angel_one.

Usage:
    python scripts/smartapi_bridge.py sync-scrip [--offline OpenAPIScripMaster.json]
    python scripts/smartapi_bridge.py lookup --symbol RELIANCE --exchange NSE
    python scripts/smartapi_bridge.py stage --symbol RELIANCE --qty 38 --entry 1324 --stop 1310 --target 1352 --segment EQ_INTRADAY --paper
    python scripts/smartapi_bridge.py close --trade-id 1 --exit-price 1352 --reason TARGET
    python scripts/smartapi_bridge.py ledger
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from broker_bridge import (
    _extract_http_error_detail,
    _rest_json_post,
    build_broker_payload,
    build_parser,
    close_paper_trade,
    generate_totp,
    list_supported_brokers,
    load_dotenv_file,
    lookup_scrip,
    read_ledger,
    stage_or_execute_order,
    sync_scrip_master,
)
from broker_bridge import (
    main as _broker_main,
)

__all__ = [
    "_angel_rest_post",
    "_extract_http_error_detail",
    "build_parser",
    "build_smartapi_payload",
    "close_paper_trade",
    "generate_totp",
    "list_supported_brokers",
    "load_dotenv_file",
    "lookup_scrip",
    "main",
    "read_ledger",
    "stage_or_execute_order",
    "sync_scrip_master",
]


def _angel_rest_post(url: str, body: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    return _rest_json_post(url, body, headers, broker_label="Angel One SmartAPI")


def build_smartapi_payload(
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
) -> dict[str, Any]:
    return build_broker_payload(
        broker="angel_one",
        tradingsymbol=tradingsymbol,
        symboltoken=symboltoken,
        exchange=exchange,
        side=side,
        qty=qty,
        entry=entry,
        stop=stop,
        target=target,
        segment=segment,
        order_type=order_type,
        use_robo=use_robo,
        tick=tick,
    )


def main(argv: list[str] | None = None) -> int:
    return _broker_main(argv, default_broker="angel_one")


if __name__ == "__main__":
    raise SystemExit(main())
