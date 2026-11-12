#!/usr/bin/env python3
"""Zero-compute TradingView Cloud Model Context Protocol (MCP) stdio server.

Exposes TradingView cloud technical indicators and screener ratings as MCP tools.
Runs with zero extra pip packages (Python stdlib only) and uses 0% CPU on local PC.
All calculations happen on TradingView cloud servers.
"""

from __future__ import annotations

import json
import sys
import traceback
from typing import Any

from tv_indicators import fetch_tv_technicals, KNOWN_INDICATORS, TIMEFRAME_SUFFIXES

SERVER_NAME = "tradingview-technical-analysis"
SERVER_VERSION = "1.0.0"


def send_response(response: dict[str, Any]) -> None:
    line = json.dumps(response)
    sys.stdout.write(f"Content-Length: {len(line.encode('utf-8'))}\r\n\r\n{line}")
    sys.stdout.flush()


def send_response_plain(response: dict[str, Any]) -> None:
    line = json.dumps(response)
    sys.stdout.write(f"{line}\n")
    sys.stdout.flush()


def get_tools_list() -> list[dict[str, Any]]:
    return [
        {
            "name": "get_tradingview_technicals",
            "description": (
                "Query TradingView's cloud scanner for technical indicators (RSI, MACD, Supertrend, "
                "EMAs, SMAs, Bollinger Bands, Stochastics, ADX, ATR, VWAP) and Buy/Sell recommendations "
                "for any Indian stock or index (NSE/BSE). Runs 100% in the cloud with zero PC compute load."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Ticker symbol, e.g. BANKBARODA, SUZLON, RELIANCE, NIFTY, or NSE:HDFCBANK",
                    },
                    "timeframe": {
                        "type": "string",
                        "enum": list(TIMEFRAME_SUFFIXES.keys()),
                        "default": "1d",
                        "description": "Candle timeframe: 1m, 5m, 15m, 30m, 1h, 1d (daily), 1w (weekly), monthly.",
                    },
                    "indicators": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "List of indicator keys to fetch (e.g. ['RSI', 'MACD', 'EMA20', 'EMA50', 'EMA200', 'ADX', 'ATR', 'VWAP']). "
                            "Pass ['all'] for complete 25+ indicator suite."
                        ),
                    },
                },
                "required": ["symbol"],
            },
        },
        {
            "name": "scan_tradingview_stocks",
            "description": (
                "Scan and compare multiple Indian stocks/indices side-by-side using TradingView's "
                "cloud consensus ratings (Strong Buy / Buy / Neutral / Sell / Strong Sell) and core momentum indicators."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "symbols": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of tickers, e.g. ['HDFCBANK', 'ICICIBANK', 'SBIN', 'BANKBARODA']",
                    },
                    "timeframe": {
                        "type": "string",
                        "enum": list(TIMEFRAME_SUFFIXES.keys()),
                        "default": "1d",
                        "description": "Timeframe for the scan (e.g. 1d, 1h, 15m).",
                    },
                },
                "required": ["symbols"],
            },
        },
    ]


def handle_tool_call(name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name == "get_tradingview_technicals":
        sym = args.get("symbol", "")
        tf = args.get("timeframe", "1d")
        inds = args.get("indicators")
        res = fetch_tv_technicals(symbols=[sym], timeframe=tf, requested_indicators=inds)
        if not res:
            return {"content": [{"type": "text", "text": f"No data returned from TradingView for symbol '{sym}'."}]}
        item = res[0]
        summary_text = (
            f"TradingView Cloud Technicals for {item['ticker']} ({tf.upper()} timeframe):\n"
            f"• LTP: Rs. {item.get('close')} ({item.get('change_pct', 0.0):+.2f}%)\n"
            f"• Overall Stance: {item['recommendation']['stance']} (Score: {item['recommendation']['score']:+.2f})\n\n"
            "Indicators:\n"
        )
        for k, v in item.get("indicators", {}).items():
            val = v.get("value")
            val_str = f"Rs. {val:.2f}" if v.get("unit") == "INR" and isinstance(val, (int, float)) else f"{val}"
            summary_text += f"• {v['label']}: {val_str} ({v['guide']})\n"

        return {
            "content": [
                {"type": "text", "text": summary_text.strip()},
            ],
            "structured_data": item,
        }

    if name == "scan_tradingview_stocks":
        symbols = args.get("symbols", [])
        tf = args.get("timeframe", "1d")
        res = fetch_tv_technicals(
            symbols=symbols,
            timeframe=tf,
            requested_indicators=["RSI", "MACD", "EMA200", "ADX"],
        )
        table_rows = []
        for r in res:
            rsi = r.get("indicators", {}).get("RSI", {}).get("value")
            rsi_str = f"{rsi:.1f}" if isinstance(rsi, (int, float)) else "N/A"
            table_rows.append(
                f"| {r['ticker']:<15} | Rs. {r.get('close', 0):>8.2f} | {r.get('change_pct', 0):>+6.2f}% | "
                f"{r['recommendation']['stance']:<12} | RSI {rsi_str:<5} |"
            )

        header = (
            f"TradingView Multi-Stock Scan ({tf.upper()} timeframe):\n\n"
            "| Ticker          | Price (INR) | Change  | TV Stance    | Key Momentum |\n"
            "|:----------------|------------:|:--------|:-------------|:-------------|\n"
            + "\n".join(table_rows)
        )
        return {
            "content": [{"type": "text", "text": header}],
            "results": res,
        }

    raise ValueError(f"Unknown tool: {name}")


def run_stdio_server() -> None:
    """Run JSON-RPC stdio protocol loop (supporting both raw JSON Lines and Content-Length HTTP headers)."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line_str = line.strip()
            if not line_str:
                continue

            # Support Content-Length header if client uses it
            if line_str.lower().startswith("content-length:"):
                length = int(line_str.split(":")[1].strip())
                # Read following empty line
                sys.stdin.readline()
                content = sys.stdin.read(length)
                req = json.loads(content)
                use_headers = True
            else:
                req = json.loads(line_str)
                use_headers = False

            req_id = req.get("id")
            method = req.get("method")
            params = req.get("params", {})

            if method == "initialize":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {},
                        },
                        "serverInfo": {
                            "name": SERVER_NAME,
                            "version": SERVER_VERSION,
                        },
                    },
                }
            elif method == "notifications/initialized":
                continue
            elif method == "ping":
                res = {"jsonrpc": "2.0", "id": req_id, "result": {}}
            elif method == "tools/list":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": get_tools_list(),
                    },
                }
            elif method == "tools/call":
                tool_name = params.get("name", "")
                tool_args = params.get("arguments", {})
                try:
                    call_result = handle_tool_call(tool_name, tool_args)
                    res = {"jsonrpc": "2.0", "id": req_id, "result": call_result}
                except Exception as ex:
                    res = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32000,
                            "message": str(ex),
                            "data": traceback.format_exc(),
                        },
                    }
            else:
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"},
                }

            if use_headers:
                send_response(res)
            else:
                send_response_plain(res)

        except Exception as e:
            # Fatal error in reader loop
            sys.stderr.write(f"MCP Server Error: {e}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    run_stdio_server()
