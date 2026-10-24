"""vai - CLI agent on a free Venice.ai web session, wired to local fs + CPU."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from . import attitude, config
from .agent import Agent, AgentOptions
from .client import AuthError, Client, VeniceHTTPError
from .tools import ToolContext, ToolError, build_tools

KNOWN = {"login", "logout", "status", "models", "tools", "run", "repl", "prompt", "mcp", "undo"}

DIM, BOLD, RED, YEL, GRN, RST = "\x1b[2m", "\x1b[1m", "\x1b[31m", "\x1b[33m", "\x1b[32m", "\x1b[0m"


def _require_session():
    session = config.load_session()
    if not session:
        sys.exit("no session. run:  vai login  or export VENICE_API_KEY")
    state, message = config.token_status(session)
    if state == "expired":
        sys.exit(f"{message}. run:  vai login")
    if state == "expiring":
        print(f"{YEL}{message}{RST}", file=sys.stderr)
    return session


def _ask(prompt: str) -> bool:
    try:
        return input(f"{YEL}?{RST} {prompt} [Y/n] ").strip().lower() not in ("n", "no")
    except EOFError:
        return True


def _renderer(opts: AgentOptions):
    streamed = {"any": False}

    def on_event(kind: str, data: dict) -> None:
        if kind == "text":
            if opts.quiet:
                return
            streamed["any"] = True
            sys.stdout.write(data["text"])
            sys.stdout.flush()
        elif kind == "tool":
            if streamed["any"]:
                sys.stdout.write("\n")
                streamed["any"] = False
            if not opts.quiet:
                args = json.dumps(data["args"], ensure_ascii=False)
                print(f"{DIM}  -> {data['name']}({args[:160]}){RST}")
        elif kind == "tool_result":
            if not opts.quiet:
                first = data["result"].strip().splitlines()[:3]
                for line in first:
                    print(f"{DIM}     {line[:160]}{RST}")
        elif kind == "checkpoint":
            if not opts.quiet:
                print(f"{GRN}  ✔ git checkpoint: {data['message']}{RST}")
        elif kind == "escalate":
            print(f"{DIM}  ~~ hedged on '{data['marker']}' -> re-rolling as "
                  f"'{data['to']}'{RST}")
        elif kind == "warn":
            print(f"{YEL}  !! {data['message']}{RST}", file=sys.stderr)

    return on_event


def _build_agent(args) -> Agent:
    session = _require_session()
    root = Path(args.root or Path.cwd()).expanduser().resolve()
    if not root.is_dir():
        sys.exit(f"root is not a directory: {root}")

    ctx = ToolContext(
        root=root,
        auto=args.auto,
        allow_outside=args.allow_outside,
        max_output=args.max_output,
        timeout=args.timeout,
        ask=None if args.auto else _ask,
    )
    opts = AgentOptions(
        model=args.model,
        attitude=args.attitude,
        persona=Path(args.persona_file).read_text() if args.persona_file else "",
        max_steps=args.max_steps,
        retry_on_hedge=not args.no_retry,
        max_escalations=args.max_escalations,
        inject_role=args.inject_role,
        tool_mode=args.tool_mode,
        web_search=args.web_search,
        include_venice_prompt=args.include_venice_prompt,
        strip_thinking=not args.raw_thinking,
        show_reasoning=args.show_reasoning,
        commit=getattr(args, "commit", False),
        max_tokens=args.max_tokens,
        temperature=args.temperature,
        quiet=args.quiet,
    )
    opts.on_event = _renderer(opts)
    client = Client(session, endpoint=args.endpoint, timeout=args.http_timeout)
    return Agent(client, ctx, build_tools(ctx), opts)


# ------------------------------------------------------------ commands ----

def cmd_login(args) -> int:
    from . import login
    session = login.harvest(
        email=args.email, password=args.password,
        headless=args.headless, wait_seconds=args.wait,
    )
    state, message = config.token_status(session)
    print(f"{GRN}logged in{RST}  {message}")
    if session.get("storage_key"):
        print(f"{DIM}  token source: localStorage['{session['storage_key']}']{RST}")
    if session.get("chat_endpoint"):
        print(f"{DIM}  endpoint: {session['chat_endpoint']}{RST}")
    return 0


def cmd_logout(_args) -> int:
    config.clear_session()
    print("session cleared")
    return 0


def cmd_status(args) -> int:
    session = config.load_session()
    state, message = config.token_status(session)
    print(f"session : {state} - {message}")
    if session:
        print(f"endpoint: {session.get('chat_endpoint') or config.CHAT_ENDPOINT}")
        print(f"cookies : {len(session.get('cookies', []))}")
    print(f"root    : {Path(args.root or Path.cwd()).resolve()}")
    print(f"model   : {args.model}")
    print(f"attitude: {args.attitude}")
    return 0


def cmd_models(args) -> int:
    client = Client(_require_session(), endpoint=args.endpoint)
    try:
        models = client.models()
    except AuthError:
        print(f"{RED}401 - session invalid, run: vai login{RST}")
        return 1
    for m in models:
        spec = m.get("model_spec") or {}
        flags = []
        if spec.get("function_calling"): flags.append("tools")
        if spec.get("uncensored"): flags.append("uncensored")
        if spec.get("vision"): flags.append("vision")
        name = m.get("id") or m.get("modelId")
        print(f"{name:<52} {' '.join(flags)}")
    return 0


def cmd_tools(_args) -> int:
    ctx = ToolContext(root=Path.cwd(), auto=True)
    for name, tool in build_tools(ctx).items():
        print(f"{BOLD}{name}{RST}\n  {tool.description}")
    return 0


def _print_prompt(args) -> None:
    root = Path(args.root or Path.cwd()).resolve()
    ctx = ToolContext(root=root, auto=True)
    from .tools import tool_docs
    docs = tool_docs(build_tools(ctx)) if args.tool_mode == "text" else ""
    persona = Path(args.persona_file).read_text() if args.persona_file else ""
    print(attitude.system_prompt(args.attitude, str(root), docs, persona))


def cmd_run(args) -> int:
    agent = _build_agent(args)
    prompt = " ".join(args.prompt) if args.prompt else sys.stdin.read()
    try:
        agent.run(prompt)
    except AuthError:
        print(f"\n{RED}401 - session expired, run: vai login{RST}")
        return 1
    except VeniceHTTPError as exc:
        print(f"\n{RED}{exc}{RST}")
        return 1
    print()
    if agent.usage and not args.quiet:
        u = agent.usage
        print(f"{DIM}{u.get('total_tokens', '?')} tokens  "
              f"(in {u.get('prompt_tokens', '?')} / out {u.get('completion_tokens', '?')}){RST}")
    return 0


def cmd_undo(args) -> int:
    """Roll back the last atomic git checkpoint created by vai."""
    root = Path(args.root or Path.cwd()).resolve()
    proc = subprocess.run(["git", "log", "-1", "--pretty=%B"], cwd=str(root), capture_output=True, text=True)
    if "vai(" not in proc.stdout:
        print(f"{RED}Last commit was not made by vai. Aborting undo.{RST}")
        return 1
    subprocess.run(["git", "reset", "--hard", "HEAD~1"], cwd=str(root), check=True)
    print(f"{GRN}Rewound last checkpoint:{RST} {proc.stdout.strip()}")
    return 0


def cmd_mcp(args) -> int:
    """Launch Model Context Protocol server over stdio for Claude Code / Cursor."""
    from . import mcp
    return mcp.serve(args)


HELP = """
commands:
  /attitude <level>   chill | spicy | unhinged | nuclear
  /model <id>         switch model
  /root <path>        re-jail the workspace
  /auto               toggle blanket approval
  /tools              list local tools
  /prompt             dump the assembled system prompt
  /clear              forget conversation (keeps settings)
  /exit
"""


def cmd_repl(args) -> int:
    agent = _build_agent(args)
    print(f"{DIM}vai repl  |  model={agent.opts.model}  attitude={agent.opts.attitude}  "
          f"root={agent.ctx.root}\n/help for commands{RST}")
    while True:
        try:
            line = input(f"\n{BOLD}>{RST} ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line in ("/exit", "/quit"):
            return 0
        if line == "/help":
            print(HELP)
            continue
        if line == "/tools":
            for name, tool in agent.tools.items():
                print(f"  {name}: {tool.description}")
            continue
        if line == "/prompt":
            print(agent.messages[0]["content"] if agent.messages else "(unset)")
            continue
        if line == "/auto":
            agent.ctx.auto = not agent.ctx.auto
            agent.ctx.ask = None if agent.ctx.auto else _ask
            print(f"  auto-approve: {agent.ctx.auto}")
            continue
        if line.startswith("/attitude"):
            level = line.split(maxsplit=1)[-1].strip()
            if level in attitude.LEVELS:
                agent.opts.attitude = level
                print(f"  attitude: {level}")
            else:
                print(f"  levels: {', '.join(attitude.LEVELS)}")
            continue
        if line.startswith("/model"):
            agent.opts.model = line.split(maxsplit=1)[-1].strip()
            print(f"  model: {agent.opts.model}")
            continue
        if line.startswith("/root"):
            from pathlib import Path as P
            agent.ctx.root = P(line.split(maxsplit=1)[-1]).expanduser().resolve()
            print(f"  root: {agent.ctx.root}")
            continue
        if line == "/clear":
            agent.messages.clear()
            print("  conversation cleared")
            continue
        try:
            agent.run(line)
            print()
        except (AuthError, VeniceHTTPError) as exc:
            print(f"{RED}{exc}{RST}")


# ---------------------------------------------------------------- main ----

def _add_common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--root", default=None, help="workspace jail (default: cwd)")
    p.add_argument("--model", default=config.DEFAULT_MODEL)
    p.add_argument("--attitude", default="spicy", choices=attitude.LEVELS)
    p.add_argument("--persona-file", default=None, help="extra persona text, layered on top")
    p.add_argument("--endpoint", default=None, help="override chat endpoint")
    p.add_argument("--tool-mode", default="native", choices=["native", "text", "none"])
    p.add_argument("--auto", action="store_true", help="approve every write and shell command")
    p.add_argument("--commit", action="store_true", help="atomic git commit after mutating actions")
    p.add_argument("--allow-outside", action="store_true", help="escape the root jail")
    p.add_argument("--max-steps", type=int, default=40)
    p.add_argument("--max-output", type=int, default=24000, help="bytes per tool result")
    p.add_argument("--timeout", type=int, default=60, help="shell timeout, seconds")
    p.add_argument("--http-timeout", type=int, default=300)
    p.add_argument("--max-tokens", type=int, default=None)
    p.add_argument("--temperature", type=float, default=None)
    p.add_argument("--web-search", default="off", choices=["off", "auto", "on"])
    p.add_argument("--inject-role", default="developer", choices=["system", "developer", "user"])
    p.add_argument("--max-escalations", type=int, default=2)
    p.add_argument("--no-retry", action="store_true", help="disable hedge detection")
    p.add_argument("--include-venice-prompt", action="store_true",
                   help="keep Venice's own system prompt (more hedging)")
    p.add_argument("--show-reasoning", action="store_true")
    p.add_argument("--raw-thinking", action="store_true", help="don't strip thinking blocks")
    p.add_argument("--quiet", action="store_true")
    p.add_argument("--print-prompt", action="store_true")


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] not in KNOWN and not argv[0].startswith("-"):
        argv.insert(0, "run")

    ap = argparse.ArgumentParser(prog="vai", description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("login"); p.set_defaults(fn=cmd_login)
    p.add_argument("--email"); p.add_argument("--password")
    p.add_argument("--headless", action="store_true")
    p.add_argument("--wait", type=int, default=180)

    p = sub.add_parser("logout"); p.set_defaults(fn=cmd_logout)
    p = sub.add_parser("status"); _add_common(p); p.set_defaults(fn=cmd_status)
    p = sub.add_parser("models"); p.add_argument("--endpoint"); p.set_defaults(fn=cmd_models)
    p = sub.add_parser("tools"); p.set_defaults(fn=cmd_tools)
    p = sub.add_parser("undo"); p.add_argument("--root", default=None); p.set_defaults(fn=cmd_undo)
    p = sub.add_parser("mcp"); _add_common(p); p.set_defaults(fn=cmd_mcp)

    for name, fn in (("run", cmd_run), ("repl", cmd_repl), ("prompt", None)):
        p = sub.add_parser(name)
        _add_common(p)
        if name == "run":
            p.add_argument("prompt", nargs="*")
        p.set_defaults(fn=fn)

    args = ap.parse_args(argv)

    if args.cmd == "prompt":
        _print_prompt(args)
        return 0
    if getattr(args, "print_prompt", False) and hasattr(args, "attitude"):
        _print_prompt(args)
    try:
        return args.fn(args)
    except KeyboardInterrupt:
        print()
        return 130
    except ToolError as exc:
        print(f"{RED}{exc}{RST}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
