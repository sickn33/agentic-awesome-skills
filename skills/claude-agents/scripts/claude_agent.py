#!/usr/bin/env python3
"""claude_agent.py — Drive Claude Code headless (`claude -p`) as a partner, for the
claude-agents skill.

Read ../SKILL.md for the invocation and handoff rules before using this wrapper.

Usage:
    python claude_agent.py "<message>"            # continue this directory's session, else start one
    python claude_agent.py --new "<message>"      # force a new session
    python claude_agent.py --session ID "<msg>"   # resume that session; no fallback
    python claude_agent.py --read FILE            # message from FILE ("-" for stdin)
    python claude_agent.py --mode build --read brief.md
    python claude_agent.py --status               # this directory's session
    python claude_agent.py --reset                # forget it (next call starts fresh)
    python claude_agent.py --check                # binary, version, state file; runs nothing
    python claude_agent.py --dry-run "<msg>"      # print the claude command; runs nothing

Modes (what the delegate may do; applied on EVERY turn, because `claude -p --resume`
restores none of it — checked 2026-10-24, Claude Code 2.1.310):
    consult  (default for a new session) read-only peer. Tools Read, Grep, Glob, Bash;
             permission mode dontAsk, so only reads and the read-only command set
             run and every write is denied. No MCP servers.
    build    a builder handed a stage. Default tools; permission mode auto, so a
             classifier reviews each action and nothing waits on a prompt. No MCP
             servers unless --mcp.
    review   a fresh second opinion: always a new session, never saved, never
             resumed, no settings, hooks, plugins, MCP or auto-memory; tools Read,
             Grep, Glob only. For the release-gate review loop use the independent-review
             skill, which also writes the subject file and fails short rounds.
A resumed session keeps the mode it was started in unless --mode is passed.

Flags:
    --mode MODE      consult / build / review (above)
    --model MODEL    alias (opus, sonnet, haiku, fable, best) or full id. Default: the
                     CLI's. Remembered for the session and re-sent on every resume.
    --effort LEVEL   low / medium / high / xhigh / max. Default xhigh (review: max).
                     Remembered and re-sent on every resume: a resume does NOT keep the
                     effort (2026-10-24: a session started at low resumed at medium).
    --cwd DIR        directory the session works in (default: current). Sessions are
                     scoped to it.
    --add-dir DIR    extra directory the tools may reach (repeatable; re-sent on resume)
    --budget USD     --max-budget-usd: stop the run at this estimated spend
    --max-turns N    stop after N agentic turns
    --schema FILE    JSON Schema; prints the validated structured output instead of text
    --mcp            load the configured MCP servers (consult/build; off by default)
    --timeout SEC    kill the run after SEC seconds (default 3600)
    --log FILE       append the raw stream-json events as they arrive (tail it)
    --raw            print the final result event as JSON instead of the answer

Session continuity: one small state file per working directory under
<claude config dir>/claude-agent/ (override the file with $CLAUDE_AGENT_STATE, e.g. two
sessions in one directory). It records the session id Claude Code reported in its
init event, plus the mode, model, effort and extra directories, so the next call
resumes that id with the same settings. It names the last session that OPENED here,
whether the run then succeeded or failed (a usage limit part-way through a build
leaves it on that session, so the next call continues it). A resume whose session
cannot be opened ("No conversation found") falls back to a new session; with
--session it fails instead.

After each run the answer goes to stdout; session id, mode, permission mode, model,
effort, cost and turns go to stderr, with a warning when what ran differs from what
was asked, and a list of any denied tool calls. A failed run prints nothing on stdout
and its error (a usage limit, an unknown model) on stderr. Exit status: 0 success;
2 bad arguments to this wrapper; 1 environment problem, or the run reported is_error
(claude's own non-zero code is passed through).

Binary lookup: $CLAUDE_BIN, then `claude` on PATH (on Windows, the native claude.exe
is preferred over an npm .cmd shim), then the native installer's locations
(~/.local/bin, ~/.claude/local, /opt/homebrew/bin, /usr/local/bin).

The prompt always goes on stdin, never argv (a long argv is truncated or re-quoted
by cmd.exe shims and trips permission classifiers). Stdin is closed after it.
Python standard library only.
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TAG = "[claude_agent.py]"
IS_WINDOWS = platform.system() == "Windows"

# --permission-prompts (nothing may wait on a prompt) needs 2.1.259; --restricted 2.1.248.
MIN_VERSION = (2, 1, 259)

MODES = {
    "consult": {
        "permission": "dontAsk",
        "tools": "Read,Grep,Glob,Bash",
        "restricted": False,
        "persist": True,
        "effort": "xhigh",
    },
    "build": {
        "permission": "auto",
        "tools": None,  # the default set
        "restricted": False,
        "persist": True,
        "effort": "xhigh",
    },
    "review": {
        "permission": "dontAsk",
        "tools": "Read,Grep,Glob",
        "restricted": True,
        "persist": False,
        "effort": "max",
    },
}
EFFORTS = ["low", "medium", "high", "xhigh", "max"]


def die(msg: str, code: int = 1) -> None:
    sys.stderr.write(f"{TAG} {msg}\n")
    sys.exit(code)


# --------------------------------------------------------------------------- binary


def find_claude_bin() -> str:
    env = os.environ.get("CLAUDE_BIN")
    if env:
        if Path(env).exists():
            return env
        die(f"$CLAUDE_BIN is set but does not exist: {env}")
    home = Path.home()
    exe = "claude.exe" if IS_WINDOWS else "claude"
    native = [home / ".local" / "bin" / exe, home / ".claude" / "local" / exe]
    if not IS_WINDOWS:
        native += [Path("/opt/homebrew/bin/claude"), Path("/usr/local/bin/claude")]
    hit = shutil.which("claude")
    if hit and not (IS_WINDOWS and Path(hit).suffix.lower() in (".cmd", ".bat", ".ps1")):
        return hit
    for p in native:
        if p.is_file():
            return str(p)
    if hit:  # a shim: the prompt goes on stdin, so it still works
        return hit
    die("could not locate the claude binary. Install Claude Code "
        "(https://code.claude.com/docs/en/setup), put it on PATH, or set $CLAUDE_BIN.")
    return ""  # unreachable


def claude_version(binary: str) -> tuple[int, ...] | None:
    try:
        out = subprocess.run([binary, "--version"], capture_output=True, text=True,
                             encoding="utf-8", errors="replace", input="", timeout=60).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", out or "")
    return tuple(int(x) for x in m.groups()) if m else None


# --------------------------------------------------------------------------- state


def config_dir() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG_DIR") or (Path.home() / ".claude"))


def dir_key(work_dir: Path) -> str:
    return os.path.normcase(str(work_dir))


def state_file(work_dir: Path) -> Path:
    override = os.environ.get("CLAUDE_AGENT_STATE")
    if override:
        return Path(override).expanduser()
    h = hashlib.sha1(dir_key(work_dir).encode("utf-8")).hexdigest()[:16]
    return config_dir() / "claude-agent" / f"{h}.json"


def read_state(work_dir: Path) -> dict:
    """This directory's session, or {}. A file written for another directory (only
    possible through $CLAUDE_AGENT_STATE) counts as none, so a run here never resumes
    a conversation the wrapper had elsewhere."""
    try:
        data = json.loads(state_file(work_dir).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict) or data.get("cwd_key") != dir_key(work_dir):
        return {}
    return data


def write_state(work_dir: Path, **fields) -> None:
    f = state_file(work_dir)
    f.parent.mkdir(parents=True, exist_ok=True)
    data = {"cwd": str(work_dir), "cwd_key": dir_key(work_dir), "ts": int(time.time()), **fields}
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1), encoding="utf-8")
    os.replace(tmp, f)


# --------------------------------------------------------------------------- command


def build_command(binary: str, mode: str, model: str | None, effort: str,
                  resume: str | None, add_dirs: list[str], args) -> list[str]:
    m = MODES[mode]
    cmd = [binary, "-p", "--output-format", "stream-json", "--verbose",
           "--permission-mode", m["permission"], "--permission-prompts", "none",
           "--effort", effort]
    if m["restricted"]:
        cmd.append("--restricted")
    if m["tools"]:
        cmd += ["--tools", m["tools"]]
    if mode == "review" or not args.mcp:
        cmd.append("--strict-mcp-config")
    if not m["persist"]:
        cmd.append("--no-session-persistence")
    if model:
        cmd += ["--model", model]
    if resume:
        cmd += ["--resume", resume]
    for d in add_dirs:
        cmd += ["--add-dir", d]
    if args.budget is not None:
        cmd += ["--max-budget-usd", str(args.budget)]
    if args.max_turns is not None:
        cmd += ["--max-turns", str(args.max_turns)]
    if args.schema_text:
        cmd += ["--json-schema", args.schema_text]
    return cmd


# --------------------------------------------------------------------------- run


def run_claude(cmd: list[str], prompt: str, work_dir: Path, env: dict, timeout: int,
               log_path: str | None) -> dict:
    """Run one turn, reading the stream-json events as they arrive. Returns the init
    event, the last result event, any permission_denied events, the non-JSON stdout
    lines, stderr and the exit code."""
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, cwd=str(work_dir), env=env, text=True,
                            encoding="utf-8", errors="replace", bufsize=1)
    err_parts: list[str] = []
    t_err = threading.Thread(target=lambda: err_parts.append(proc.stderr.read()), daemon=True)
    t_err.start()
    timed_out = threading.Event()

    def _kill() -> None:
        timed_out.set()
        proc.kill()

    timer = threading.Timer(timeout, _kill)
    timer.start()
    try:
        try:
            proc.stdin.write(prompt)
            proc.stdin.close()  # claude reads stdin to EOF; an open stdin would hang it
        except (BrokenPipeError, OSError):
            pass  # it exited before reading (a bad flag): the exit code and stderr say why
        log = open(log_path, "a", encoding="utf-8") if log_path else None
        init, result, denied, other = None, None, [], []
        try:
            for line in proc.stdout:
                if log:
                    log.write(line)
                    log.flush()
                s = line.strip()
                try:
                    ev = json.loads(s) if s.startswith("{") else None
                except ValueError:
                    ev = None
                if not isinstance(ev, dict):
                    if s:
                        other.append(s)
                    continue
                kind = (ev.get("type"), ev.get("subtype"))
                if kind == ("system", "init"):
                    init = ev
                elif kind[0] == "result":
                    result = ev  # background work can add turns; the last result is the answer
                elif kind == ("system", "permission_denied"):
                    denied.append(ev)
        finally:
            if log:
                log.close()
        proc.wait()
    except KeyboardInterrupt:
        proc.kill()
        raise
    finally:
        timer.cancel()
    t_err.join(5)
    return {"init": init, "result": result, "denied": denied, "other": other,
            "stderr": "".join(err_parts), "code": proc.returncode, "timed_out": timed_out.is_set()}


def could_not_open(run: dict) -> bool:
    """The resumed session never opened: no init event, and claude said it has no
    transcript for the id (2026-10-24: exit 1, `No conversation found with session ID`)."""
    if run["init"]:
        return False
    errors = " ".join((run["result"] or {}).get("errors") or []) + run["stderr"]
    return "No conversation found" in errors


# --------------------------------------------------------------------------- reporting


def transcript_path(session: str) -> str | None:
    """Where Claude Code saved the session (<config dir>/projects/<project>/<id>.jsonl),
    or None when it saved nothing — which is what happens inside a sandbox that cannot
    write the config directory (2026-10-24, a Codex workspace-write sandbox)."""
    hits = glob.glob(str(config_dir() / "projects" / "*" / f"{session}.jsonl"))
    return hits[0] if hits else None


def transcript_effort(session: str) -> str | None:
    """The effort the session's last reply ran at, read from its transcript. The JSON
    result does not report effort; the transcript records it on every assistant entry.
    Its format is internal to Claude Code, so this is best-effort and None on any miss."""
    try:
        path = transcript_path(session)
        if not path:
            return None
        with open(path, "rb") as fh:
            fh.seek(0, os.SEEK_END)
            size = fh.tell()
            fh.seek(max(0, size - 512 * 1024))
            tail = fh.read().decode("utf-8", errors="replace").splitlines()
        for line in reversed(tail):
            if '"assistant"' not in line or '"effort"' not in line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("type") == "assistant" and d.get("effort"):
                return str(d["effort"])
    except OSError:
        return None
    return None


def model_matches(requested: str, actual: str) -> bool:
    req = requested.lower().split("[")[0]
    if req in ("default", "best", "opusplan"):
        return True
    return req in actual.lower()


def report(run: dict, started_new: bool, mode: str, model: str | None, effort: str,
           prev_total: float | None, args) -> None:
    init, res = run["init"] or {}, run["result"] or {}
    session = res.get("session_id") or init.get("session_id") or "?"
    ran_model = init.get("model") or "?"
    perm = init.get("permissionMode") or "?"
    total = res.get("total_cost_usd")
    since = res.get("model_usage_since_last_result") or {}
    this_run = sum(v.get("costUSD", 0) for v in since.values()) if since else (
        total - prev_total if (total is not None and prev_total is not None) else total)
    ran_effort = transcript_effort(session) if MODES[mode]["persist"] else None
    others = [m for m in (res.get("modelUsage") or {}) if m != ran_model]

    parts = [f"{'new' if started_new else 'resumed'} session {session}",
             f"mode {mode} (permission {perm})",
             f"model {ran_model}" + (f" (requested {model})" if model else ""),
             f"effort {ran_effort or 'not recorded'} (requested {effort})"]
    if this_run is not None:
        parts.append(f"cost ${this_run:.4f}" + (f" (session ${total:.4f})" if total is not None and not started_new else ""))
    if res.get("num_turns") is not None:
        parts.append(f"turns {res['num_turns']}")
    sys.stderr.write(f"{TAG} " + "; ".join(parts) + "\n")
    if others:
        sys.stderr.write(f"{TAG} also billed: {', '.join(others)} (subagents, advisor or fallback)\n")
    if (MODES[mode]["persist"] and session != "?" and res.get("num_turns") and not res.get("is_error")
            and not transcript_path(session)):
        sys.stderr.write(f"{TAG} warning: Claude Code saved no transcript for this session, so the next "
                         f"call cannot continue it and will start fresh. Inside a sandbox, make "
                         f"{config_dir()} writable for the claude process.\n")

    want_perm = MODES[mode]["permission"]
    if init and perm != want_perm:
        sys.stderr.write(f"{TAG} warning: asked for permission mode {want_perm}, the session ran in "
                         f"{perm}. A build round in a mode that denies writes reports work it never did.\n")
    if model and init and not model_matches(model, ran_model):
        sys.stderr.write(f"{TAG} warning: requested {model} but the session ran on {ran_model}.\n")
    if ran_effort and ran_effort != effort:
        sys.stderr.write(f"{TAG} warning: requested effort {effort} but the reply ran at {ran_effort} "
                         "(a model without that level falls back to its highest one below it; "
                         "CLAUDE_CODE_EFFORT_LEVEL overrides --effort).\n")
    denials = res.get("permission_denials") or []
    if denials:
        names = sorted({d.get("tool_name", "?") for d in denials})
        sys.stderr.write(f"{TAG} {len(denials)} tool call(s) denied: {', '.join(names)}.")
        if mode == "build":
            sys.stderr.write(" Check the disk (git status) before believing the round did its work.")
        sys.stderr.write("\n")
    if res.get("terminal_reason") not in (None, "completed"):
        sys.stderr.write(f"{TAG} run ended: {res.get('subtype')} ({res.get('terminal_reason')})\n")


# --------------------------------------------------------------------------- main


def main() -> None:
    p = argparse.ArgumentParser(
        description="Drive Claude Code headless as a partner (claude-agents skill).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Usage:", 1)[1] if __doc__ else "")
    p.add_argument("message", nargs="?", help="Message to send")
    p.add_argument("--new", action="store_true", help="Force a new session")
    p.add_argument("--session", metavar="ID", help="Resume this session id; no fallback")
    p.add_argument("--read", metavar="FILE", help="Read the message from FILE (- for stdin)")
    p.add_argument("--mode", choices=list(MODES), help="consult (default) / build / review")
    p.add_argument("--model", metavar="MODEL", help="Model alias or id (default: the CLI's)")
    p.add_argument("--effort", choices=EFFORTS, help="Effort (default xhigh; review: max)")
    p.add_argument("--cwd", metavar="DIR", help="Working directory (default: current)")
    p.add_argument("--add-dir", metavar="DIR", action="append", default=None,
                   help="Extra directory the tools may reach (repeatable)")
    p.add_argument("--budget", type=float, metavar="USD", help="Stop at this estimated spend")
    p.add_argument("--max-turns", type=int, metavar="N", help="Stop after N agentic turns")
    p.add_argument("--schema", metavar="FILE", help="JSON Schema file for structured output")
    p.add_argument("--mcp", action="store_true", help="Load the configured MCP servers")
    p.add_argument("--timeout", type=int, default=3600, metavar="SEC", help="Kill after SEC (default 3600)")
    p.add_argument("--log", metavar="FILE", help="Append the raw stream-json events to FILE")
    p.add_argument("--raw", action="store_true", help="Print the result event as JSON")
    p.add_argument("--status", action="store_true", help="Show this directory's session")
    p.add_argument("--reset", action="store_true", help="Forget this directory's session")
    p.add_argument("--check", action="store_true", help="Show binary, version and state file")
    p.add_argument("--dry-run", action="store_true", help="Print the command; run nothing")
    args = p.parse_args()

    if args.cwd:
        work_dir = Path(args.cwd).expanduser()
        if not work_dir.is_dir():
            die(f"--cwd is not a directory: {args.cwd}")
        work_dir = work_dir.resolve()
    else:
        work_dir = Path.cwd().resolve()
    state = read_state(work_dir)

    if args.reset:
        f = state_file(work_dir)
        if state and f.exists():
            f.unlink()
        print(f"session cleared for {work_dir}")
        return
    if args.status:
        if state:
            age = (int(time.time()) - int(state.get("ts", 0))) // 60
            print(f"session: {state.get('session')} (last call {age} min ago)")
            print(f"mode:    {state.get('mode')}")
            print(f"model:   {state.get('model') or '(the CLI default)'}")
            print(f"effort:  {state.get('effort')}")
            if state.get("add_dirs"):
                print(f"dirs:    {', '.join(state['add_dirs'])}")
            if state.get("cost_total") is not None:
                print(f"cost:    ${state['cost_total']:.4f} so far (client-side estimate)")
        else:
            print(f"session: (none for {work_dir})")
        print(f"state:   {state_file(work_dir)}")
        return

    binary = find_claude_bin()
    version = claude_version(binary)
    if args.check:
        print(f"claude:  {binary}")
        print(f"version: {'.'.join(map(str, version)) if version else 'unknown'}"
              + ("" if not version or version >= MIN_VERSION else
                 f"  (too old: needs {'.'.join(map(str, MIN_VERSION))}+)"))
        print(f"state:   {state_file(work_dir)}")
        if os.environ.get("CLAUDE_CODE_EFFORT_LEVEL"):
            print(f"note:    CLAUDE_CODE_EFFORT_LEVEL={os.environ['CLAUDE_CODE_EFFORT_LEVEL']} overrides --effort")
        return
    if version and version < MIN_VERSION:
        die(f"Claude Code {'.'.join(map(str, version))} is too old: the wrapper needs "
            f"{'.'.join(map(str, MIN_VERSION))}+ for --permission-prompts. Run `claude update`.")

    if args.read:
        msg = sys.stdin.read() if args.read == "-" else Path(args.read).read_text(encoding="utf-8")
    elif args.message:
        msg = args.message
    else:
        p.error("provide a message, --read FILE, or use --status / --reset / --check")
    if not msg.strip():
        p.error("the message is empty")
    if args.new and args.session:
        p.error("--new and --session contradict each other")
    if args.mode == "review" and args.session:
        p.error("a review is always a fresh session; --session cannot be combined with --mode review")

    args.schema_text = None
    if args.schema:
        try:
            args.schema_text = json.dumps(json.loads(Path(args.schema).read_text(encoding="utf-8")))
        except (OSError, ValueError) as err:
            die(f"--schema {args.schema}: {err}")

    add_dirs = None
    if args.add_dir:
        add_dirs = []
        for d in args.add_dir:
            pd = Path(d).expanduser()
            if not pd.is_dir():
                die(f"--add-dir is not a directory: {d}")
            add_dirs.append(str(pd.resolve()))

    # What this turn resumes, and with which settings. Nothing below `claude -p --resume`
    # restores by itself except the model: permission mode, tools, MCP config, effort and
    # --add-dir all have to be sent again (checked 2026-10-24).
    resume_id, from_state = None, False
    if args.mode == "review" or args.new:
        pass
    elif args.session:
        resume_id = args.session
    elif state.get("session"):
        resume_id, from_state = state["session"], True
    same = bool(resume_id) and state.get("session") == resume_id
    mode = args.mode or (state.get("mode") if same else None) or "consult"
    model = args.model or (state.get("model") if same else None)
    effort = args.effort or (state.get("effort") if same else None) or MODES[mode]["effort"]
    dirs = add_dirs if add_dirs is not None else ((state.get("add_dirs") or []) if same else [])
    if same and args.mode and state.get("mode") and args.mode != state.get("mode"):
        sys.stderr.write(f"{TAG} note: the session last ran as {state['mode']}; this turn runs as {mode}\n")

    env = dict(os.environ)
    if mode == "review":
        env["CLAUDE_CODE_DISABLE_AUTO_MEMORY"] = "1"
        env.pop("CLAUDE_CODE_EFFORT_LEVEL", None)  # it overrides --effort and would lower the round
    if env.get("CLAUDE_CODE_EFFORT_LEVEL"):
        sys.stderr.write(f"{TAG} warning: CLAUDE_CODE_EFFORT_LEVEL="
                         f"{os.environ['CLAUDE_CODE_EFFORT_LEVEL']} overrides --effort {effort}\n")

    cmd = build_command(binary, mode, model, effort, resume_id, dirs, args)
    if args.dry_run:
        print(subprocess.list2cmdline(cmd) + "   < <message on stdin>")
        return

    prev_total = state.get("cost_total") if same else None
    started_new = resume_id is None
    run = run_claude(cmd, msg, work_dir, env, args.timeout, args.log)
    if resume_id and from_state and could_not_open(run):
        sys.stderr.write(f"{TAG} session {resume_id} could not be opened (no transcript for it); "
                         "starting a new session\n")
        cmd = build_command(binary, mode, model, effort, None, dirs, args)
        run = run_claude(cmd, msg, work_dir, env, args.timeout, args.log)
        started_new, prev_total = True, None

    init, res = run["init"], run["result"]
    # The state names the last session that opened here, failed run or not: it holds
    # the brief and the work so far. A review is never saved and never resumed.
    if init and MODES[mode]["persist"]:
        write_state(work_dir, session=init.get("session_id"), mode=mode, model=model,
                    effort=effort, add_dirs=dirs,
                    cost_total=(res or {}).get("total_cost_usd", prev_total))

    if run["timed_out"]:
        die(f"run exceeded --timeout {args.timeout}s and was killed"
            + (f"; the state keeps session {init.get('session_id')}, so the next call continues it"
               if init and MODES[mode]["persist"] else ""))
    if res is None:
        sys.stderr.write(f"{TAG} claude exited {run['code']} with no result\n")
        if run["stderr"]:
            sys.stderr.write(run["stderr"].rstrip() + "\n")
        for line in run["other"][-20:]:
            sys.stderr.write(line + "\n")
        sys.exit(run["code"] or 1)

    failed = bool(res.get("is_error") or run["code"])
    if args.raw:
        out = json.dumps(res, indent=1)
    elif failed:
        out = ""  # the result text of a failed run is the error, not the partner's answer
    elif args.schema_text and "structured_output" in res:
        out = json.dumps(res["structured_output"], indent=1)
    else:
        out = res.get("result") or ""
    if out:
        sys.stdout.write(out if out.endswith("\n") else out + "\n")
    sys.stdout.flush()

    if init:
        report(run, started_new, mode, model, effort, prev_total, args)

    if failed:
        # A usage limit reads "You've hit your session limit · resets <time>" here.
        detail = " ".join(x for x in [res.get("result") or "", "; ".join(res.get("errors") or [])] if x) \
            or run["stderr"].strip()
        if res.get("api_error_status"):
            detail = f"API status {res['api_error_status']}. {detail}"
        if res.get("subtype") not in (None, "success"):
            detail = f"{res['subtype']}. {detail}"
        sys.stderr.write(f"{TAG} the run failed (exit {run['code']})" + (f": {detail}" if detail else "") + "\n")
        if init and MODES[mode]["persist"]:
            sys.stderr.write(f"{TAG} the state keeps session {init.get('session_id')}; the next call "
                             "continues it (--new starts over)\n")
        sys.exit(run["code"] or 1)
    if args.schema_text and "structured_output" not in res:
        die("the run ended without structured output (the field is absent, e.g. Claude declined)")


if __name__ == "__main__":
    main()
