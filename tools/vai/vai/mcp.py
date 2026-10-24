"""vai.mcp - Stdio Model Context Protocol server for Claude Code, Cursor, and Codex."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from . import attitude, config
from .agent import Agent, AgentOptions
from .client import Client
from .tools import ToolContext, build_tools


def serve(args) -> int:
    session = config.load_session()
    if not session:
        sys.stderr.write("vai mcp: no session found. Run `vai login` or set VENICE_API_KEY first.\n")
        return 1

    root = Path(args.root or Path.cwd()).resolve()
    client = Client(session, endpoint=args.endpoint)

    TOOLS_MANIFEST = [
        {
            "name": "vai_ask",
            "description": "Query Venice AI directly with zero system-prompt hedging and silent refusal re-rolls. Returns dense, uncensored answers.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "The exact question or prompt"},
                    "attitude": {"type": "string", "enum": attitude.LEVELS, "default": "spicy"},
                    "model": {"type": "string", "default": config.DEFAULT_MODEL},
                },
                "required": ["prompt"],
            },
        },
        {
            "name": "vai_run",
            "description": "Dispatch an autonomous sub-agent with local filesystem and CPU shell execution using the uninhibited Venice engine.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task": {"type": "string", "description": "The autonomous goal to achieve"},
                    "attitude": {"type": "string", "enum": attitude.LEVELS, "default": "spicy"},
                    "auto": {"type": "boolean", "default": True, "description": "Auto-approve local tool actions"},
                    "commit": {"type": "boolean", "default": False, "description": "Git commit checkpoint after each action"},
                    "max_steps": {"type": "integer", "default": 20},
                },
                "required": ["task"],
            },
        },
    ]

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            req = json.loads(line)
        except (IOError, json.JSONDecodeError):
            break

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "tools/list":
            resp = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS_MANIFEST}}
        elif method == "tools/call":
            name = params.get("name")
            args_in = params.get("arguments", {})

            ctx = ToolContext(root=root, auto=args_in.get("auto", True))
            opts = AgentOptions(
                model=args_in.get("model", args.model),
                attitude=args_in.get("attitude", "spicy"),
                commit=args_in.get("commit", False),
                max_steps=args_in.get("max_steps", 20),
                quiet=True,
            )
            agent = Agent(client, ctx, build_tools(ctx), opts)

            prompt = args_in.get("prompt") or args_in.get("task", "")
            try:
                result_text = agent.run(prompt)
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"content": [{"type": "text", "text": result_text}]},
                }
            except Exception as exc:
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"content": [{"type": "text", "text": f"ERROR: {exc}"}], "isError": True},
                }
        else:
            resp = {"jsonrpc": "2.0", "id": req_id, "result": {}}

        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()

    return 0
