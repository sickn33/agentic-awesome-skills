#!/usr/bin/env python3
"""codex.py — Bridge to OpenAI Codex CLI for the codex-agents skill.

Read ../SKILL.md for the invocation and handoff rules before using this wrapper.

Usage:
    python codex.py "<message>"          # resume a recorded session here, else new
    python codex.py --new "<message>"    # force new session
    python codex.py --session ID "<msg>" # resume that session (an earlier one, say)
    python codex.py --read FILE          # read message from FILE ("-" for stdin)
    python codex.py --status             # show session status
    python codex.py --reset              # clear session marker

Flags:
    --new            Force new session
    --session ID     Resume the session with this id, in --cwd; no fallback
    --read FILE      Read message from FILE
    --model MODEL    Override the model (default: codex's configured one).
                     Pass the model confirmed with the user. Remembered
                     for the session and re-sent on every resume.
    --effort LEVEL   low / medium / high / xhigh (default: xhigh, on every turn).
                     The highest, xhigh, is the default.
    --sandbox MODE   read-only / workspace-write / danger-full-access (a new
                     session's default: read-only). Remembered for the session
                     and re-sent on every resume.
    --cwd DIR        Working directory for the run (default: current directory)
    --raw            Pass through raw codex output (default strips the header)

Session continuity uses a marker file at ~/.claude/.codex_agents_active
(override with $CODEX_AGENTS_STATE) that records the session's id, read from
codex's header, and the wrapper resumes that id (`codex exec resume <id>`).
Not `--last`: that takes the newest session codex recorded in the directory
(codex 0.159; `--all` lifts that), whoever started it, such as a consult run
there with --new. When the marker for this directory lacks a session id or
sandbox mode, choose `--session <id>` (with `--sandbox` when needed) or `--new`.

The marker names the last session codex opened for the directory, whether
the run then succeeded or failed: codex prints the header naming a session
only once it has opened it. So a usage limit, which fails a run after the
session took the turn, leaves the marker on that session, and the next call
continues it. A resume falls back to a new session only when codex could not
open the old one (no rollout left for its id, which fails with no header);
when it could, a failed resume exits with the error instead, because a new
session would start without the stage.

Sessions are scoped to the working directory. The marker is one file per
user, so it records which directory it belongs to and a run only resumes when
that directory matches; otherwise it starts a fresh thread. Without that
check, delegating into a second repo would resume a conversation the wrapper
never had there. The marker holds one directory, so two builds at once need a
marker each ($CODEX_AGENTS_STATE). A legacy bare-timestamp marker counts as
"no session here", so the first run after this change starts new.

A resume does not keep the session's model: `codex exec resume` takes it from
~/.codex/config.toml. So the marker also records the model a session started
with (--model, or none for the config default), every resume re-sends it, and
the model codex reports in its header is written to stderr after each run,
with a warning when it differs from the one requested.

Nor does a resume keep the session's sandbox: `exec resume` takes no `-s`, and
without one it runs on the config's `sandbox_mode`, read-only by default
(codex 0.169.0, 2026-11-17: a session started with `-s workspace-write`
resumed read-only, so a build turn changed nothing and exited 0). So the
marker records the sandbox too, every resume re-sends it as
`-c sandbox_mode="<mode>"`, and the sandbox codex reports is checked the same
way as the model.

Codex binary lookup, in order:
    1. $CODEX_BIN
    2. `codex` on PATH (via shutil.which); for the npm package, the native binary
       its shim runs, so a long prompt never passes through cmd.exe
    3. OpenAI ChatGPT VS Code extension bundle
       (~/.vscode/extensions/openai.chatgpt-*/bin/<arch>/codex[.exe])
The CLI on PATH comes before the extension's bundle because it is the one the
user installs and updates; the extension ships whatever build it pins. On
2026-10-22 that was a 0.155 alpha without `codex-code-mode-host.exe`, and every
tool call of a build round failed before it ran.

Piped, codex writes its metadata header (workdir, model, sandbox, session id)
to stderr and the answer to stdout. The wrapper reads the model, the sandbox
and the session id from that header, records the id, and prints the model and
the sandbox after each run.
`-s SANDBOX` is an exec-level flag not valid on `exec resume`, which takes
the sandbox as `-c sandbox_mode=...` instead. Outside a git
repository a resume needs `--skip-git-repo-check` too, or codex refuses it and
the wrapper falls back to a new session. Stdin must be closed (input="") or
codex hangs.
"""

from __future__ import annotations  # `str | None` annotations on Python 3.9, macOS's stock python3

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# One marker file per user, holding one directory's session. Override with
# $CODEX_AGENTS_STATE: one file per build when builds run at the same time,
# or for testing and non-default homes.
ACTIVE_MARKER = Path(
    os.environ.get("CODEX_AGENTS_STATE")
    or (Path.home() / ".claude" / ".codex_agents_active")
)

SANDBOXES = ("read-only", "workspace-write", "danger-full-access")

CODEX_BIN_NAME = "codex.exe" if platform.system() == "Windows" else "codex"


def native_of_npm_shim(shim: str) -> str | None:
    """The npm package's `codex` is a shim around a native binary in a per-platform
    dependency; return that binary when `shim` is one."""
    res = Path(shim).resolve()
    roots = [res.parent / "node_modules" / "@openai" / "codex"]
    roots += [p for p in res.parents if p.name == "codex" and p.parent.name == "@openai"]
    for root in roots:
        for p in sorted(root.glob(f"node_modules/@openai/codex-*/vendor/*/bin/{CODEX_BIN_NAME}"), reverse=True):
            if p.is_file():
                return str(p)
    return None


def find_codex_bin() -> str:
    """Locate codex CLI binary. Env override > the CLI on PATH > VS Code extension bundle."""
    env_override = os.environ.get("CODEX_BIN")
    if env_override and Path(env_override).exists():
        return env_override

    path_hit = shutil.which("codex")
    if path_hit:
        native = native_of_npm_shim(path_hit)
        if native:
            return native
        # A Windows batch shim can't carry a long prompt intact; prefer the bundle below.
        if not (platform.system() == "Windows" and Path(path_hit).suffix.lower() in (".cmd", ".bat", ".ps1")):
            return path_hit

    # OpenAI ChatGPT VS Code extension bundles codex per platform.
    # Extension dir: openai.chatgpt-<version>-<platform>
    # Binary:        bin/<arch>/codex[.exe]
    ext_root = Path.home() / ".vscode" / "extensions"
    if ext_root.exists():
        for ext in sorted(ext_root.glob("openai.chatgpt-*"), reverse=True):
            for bin_path in ext.glob(f"bin/*/{CODEX_BIN_NAME}"):
                if bin_path.is_file():
                    return str(bin_path)

    if path_hit:
        return path_hit

    sys.exit(
        "[codex.py] could not locate codex binary. Install the OpenAI ChatGPT "
        "VS Code extension, install codex CLI on PATH, or set $CODEX_BIN."
    )


def read_marker() -> dict:
    """Marker contents as ``{"ts": int, "cwd": str, "model": str | None,
    "session": str | None, "sandbox": str | None}``, or ``{}`` if unreadable.

    A legacy bare-timestamp marker (written before --cwd existed) reports an
    empty cwd, which never equals a resolved directory. The first run after
    this upgrade therefore starts a fresh thread instead of risking a resume
    into whichever repo happened to be last. A marker without a model (written
    before the model was recorded, or by a session on the config default)
    means no pinned model. Automatic resume requires the saved id and sandbox."""
    try:
        raw = ACTIVE_MARKER.read_text(encoding="utf-8").strip()
    except OSError:
        return {}
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except ValueError:
        return {"ts": int(raw) if raw.isdigit() else 0, "cwd": "", "model": None, "session": None,
                "sandbox": None}
    if not isinstance(data, dict):
        return {}
    try:
        ts = int(data.get("ts") or 0)
    except (TypeError, ValueError):
        ts = 0
    model, session, sandbox = data.get("model"), data.get("session"), data.get("sandbox")
    return {"ts": ts, "cwd": str(data.get("cwd") or ""),
            "model": model if isinstance(model, str) and model else None,
            "session": session if isinstance(session, str) and session else None,
            "sandbox": sandbox if sandbox in SANDBOXES else None}


def mark_active(work_dir: Path, model: str | None, session: str | None,
                sandbox: str | None = None) -> None:
    """Record the directory, id, model and sandbox for a later resume.

    The wrapper sends the recorded model and sandbox to override Codex's
    config defaults on every resume.
    """
    ACTIVE_MARKER.parent.mkdir(parents=True, exist_ok=True)
    ACTIVE_MARKER.write_text(
        json.dumps({"ts": int(time.time()), "cwd": str(work_dir), "model": model,
                    "session": session, "sandbox": sandbox}),
        encoding="utf-8",
    )


def clear_session() -> None:
    if ACTIVE_MARKER.exists():
        ACTIVE_MARKER.unlink()


HEADER_END_RE = re.compile(r"^-{4,}\s*$", re.MULTILINE)


HEADER_FIELD_RE = re.compile(r"^(workdir|session id):", re.MULTILINE)


def strip_header(text: str) -> str:
    """Drop the codex header block (workdir / model / session id / sandbox) when
    stdout carries one, so the output reads cleanly; keep everything from the
    second '----' divider on. Piped, codex 0.159 writes the header to stderr and
    leaves stdout the answer alone, so the block is dropped only when it is a
    header: otherwise an answer with two horizontal rules would silently lose
    everything above the second."""
    parts = HEADER_END_RE.split(text, maxsplit=2)
    if len(parts) == 3 and HEADER_FIELD_RE.search(parts[1]):
        return parts[2].lstrip("\n")
    return text


def header_field(proc: subprocess.CompletedProcess, name: str) -> str | None:
    """A field of codex's header block (the text between the first two '----'
    dividers), on stderr or stdout: `model`, `sandbox`, `session id`. Read before
    strip_header drops it, and only from a block that is a header, so a
    matching line in the answer itself is never taken for it; no header, None.
    Stderr is read first because stdout can be the answer alone."""
    # The value's first word: codex 0.169 follows a sandbox with its writable roots
    # (`sandbox: workspace-write [workdir, /tmp, $TMPDIR]`).
    line_re = re.compile(rf"^{re.escape(name)}:[ \t]*(\S+)", re.MULTILINE)
    for stream in (proc.stderr or "", proc.stdout or ""):
        parts = HEADER_END_RE.split(stream, maxsplit=2)
        if len(parts) != 3 or not HEADER_FIELD_RE.search(parts[1]):
            continue
        found = line_re.search(parts[1])
        if found:
            return found.group(1)
    return None


def reported_model(proc: subprocess.CompletedProcess) -> str | None:
    """The model codex says it ran on."""
    return header_field(proc, "model")


def reported_session(proc: subprocess.CompletedProcess) -> str | None:
    """The id of the session the run used, which the next resume names."""
    return header_field(proc, "session id")


def reported_sandbox(proc: subprocess.CompletedProcess) -> str | None:
    """The sandbox codex says the run had."""
    return header_field(proc, "sandbox")


def _run(cmd: list[str], work_dir: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        input="",
        cwd=str(work_dir),
    )


def _exit_on_failure(proc: subprocess.CompletedProcess) -> subprocess.CompletedProcess:
    if proc.returncode != 0:
        sys.stderr.write(f"[codex exit {proc.returncode}]\n")
        sys.stderr.write(proc.stderr)
        sys.exit(proc.returncode)
    return proc


def _effort_args(effort: str | None) -> list[str]:
    """Reasoning effort has no dedicated exec flag — it rides the generic config
    override. Absent, codex falls back to `model_reasoning_effort` in
    ~/.codex/config.toml, which is where it came from before this existed."""
    return ["-c", f"model_reasoning_effort={effort}"] if effort else []


def _sandbox_args(sandbox: str | None) -> list[str]:
    """A resume's sandbox. `exec resume` rejects `-s`, and without this override
    it runs on the config's `sandbox_mode`, not the session's."""
    return ["-c", f'sandbox_mode="{sandbox}"'] if sandbox else []


def in_git_repo(work_dir: Path) -> bool:
    """True when work_dir or a parent holds a `.git` (a directory, or the file a
    worktree or submodule uses)."""
    return any((d / ".git").exists() for d in (work_dir, *work_dir.parents))


def run_codex_new(
    codex_bin: str,
    model: str | None,
    sandbox: str,
    prompt: str,
    work_dir: Path,
    effort: str | None = None,
) -> subprocess.CompletedProcess:
    """Start a new codex session; the caller decides what a failure means.
    `-s SANDBOX` is an exec-level option that isn't valid on `exec resume`;
    a resume re-sends the sandbox through `_sandbox_args`."""
    cmd = [codex_bin, "exec", "--skip-git-repo-check", "-s", sandbox]
    if model:
        cmd += ["-m", model]
    cmd += _effort_args(effort)
    cmd.append(prompt)
    return _run(cmd, work_dir)


def run_codex_resume(
    codex_bin: str,
    session: str,
    model: str | None,
    prompt: str,
    work_dir: Path,
    effort: str | None = None,
    sandbox: str | None = None,
) -> subprocess.CompletedProcess:
    """Resume the named session and send the model and sandbox when known."""
    cmd = [codex_bin, "exec", "resume", session]
    # Only outside a repository: there codex refuses a resume without it, and
    # inside one it is not needed, so a codex old enough to reject the flag on
    # `exec resume` keeps resuming in the repositories it is normally run in.
    if not in_git_repo(work_dir):
        cmd.append("--skip-git-repo-check")
    if model:
        cmd += ["-m", model]
    cmd += _effort_args(effort)
    cmd += _sandbox_args(sandbox)
    cmd.append(prompt)
    return _run(cmd, work_dir)


def run_codex_resume_or_new(
    codex_bin: str,
    session: str,
    model: str | None,
    sandbox: str,
    prompt: str,
    work_dir: Path,
    effort: str | None = None,
) -> tuple[subprocess.CompletedProcess, bool]:
    """Resume the marker's session; the caller handles a failure. Fall back to
    a new session only when codex could not open the old one: it prints the
    header naming a session once it has opened it. An id with no rollout
    fails without a header. If a turn fails after the session opened (a usage
    limit, a dropped connection), the caller keeps the marker on it.

    Returns (completed process, started_new)."""
    proc = run_codex_resume(codex_bin, session, model, prompt, work_dir, effort, sandbox)
    if proc.returncode == 0 or reported_session(proc):
        return proc, False

    sys.stderr.write(
        f"[codex.py] session {session} could not be opened (exit {proc.returncode}); "
        "starting a new session\n"
    )
    if proc.stderr:
        sys.stderr.write(proc.stderr)
        if not proc.stderr.endswith("\n"):
            sys.stderr.write("\n")
    return run_codex_new(codex_bin, model, sandbox, prompt, work_dir, effort), True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Codex CLI bridge for the codex-agents skill.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Usage:", 1)[1] if __doc__ else "",
    )
    parser.add_argument("message", nargs="?", help="Message to send to Codex")
    parser.add_argument("--new", action="store_true", help="Force a new session")
    parser.add_argument(
        "--session",
        metavar="ID",
        help="Resume the session with this id (an earlier one, or one the marker no "
        "longer names) in --cwd; it fails rather than starting a new one. Unless the "
        "marker names that session, pass --model when it ran on a model other than the "
        "config default and --sandbox when it writes: otherwise both are the config's.",
    )
    parser.add_argument("--read", metavar="FILE", help="Read message from FILE (- for stdin)")
    parser.add_argument("--status", action="store_true", help="Show session status")
    parser.add_argument("--reset", action="store_true", help="Clear the session marker")
    parser.add_argument("--model", metavar="MODEL", help="Override codex model")
    parser.add_argument(
        "--effort",
        metavar="LEVEL",
        choices=["low", "medium", "high", "xhigh"],
        default="xhigh",
        help="Reasoning effort, sent on every turn, resume included (default: xhigh, the highest)",
    )
    parser.add_argument(
        "--sandbox",
        choices=SANDBOXES,
        help="Codex sandbox mode (a new session's default: read-only). Remembered for "
        "the session and re-sent on every resume; passing it on a resume changes it.",
    )
    parser.add_argument(
        "--cwd",
        metavar="DIR",
        help="Working directory for the codex run (default: current directory). "
        "Sessions are scoped to this directory: a run here never resumes a "
        "conversation started elsewhere.",
    )
    parser.add_argument("--raw", action="store_true", help="Print raw codex output, keep header")
    args = parser.parse_args()

    if args.cwd:
        work_dir = Path(args.cwd).expanduser()
        if not work_dir.is_dir():
            sys.exit(f"[codex.py] --cwd is not a directory: {args.cwd}")
        work_dir = work_dir.resolve()
    else:
        work_dir = Path.cwd().resolve()

    if args.status:
        marker = read_marker()
        if marker.get("cwd") == str(work_dir):
            age_min = (int(time.time()) - marker.get("ts", 0)) // 60
            print(f"session: active (last call {age_min} min ago)")
            print(f"cwd:     {work_dir}")
            print(f"model:   {marker.get('model') or '(the config default)'}")
            print(f"sandbox: {marker.get('sandbox') or '(not recorded)'}")
            print(f"id:      {marker.get('session') or '(not recorded)'}")
            if not marker.get("session") or not marker.get("sandbox"):
                print("automatic resume unavailable; pass --session <id> or --new")
            print(f"marker:  {ACTIVE_MARKER}")
        else:
            other = marker.get("cwd")
            if other:
                print(f"session: (none for {work_dir})")
                print(f"         a session is active for {other} — use --cwd to reach it")
            else:
                print("session: (none)")
            print(f"marker:  {ACTIVE_MARKER}")
        return

    if args.reset:
        clear_session()
        print("session cleared")
        return

    if args.read:
        msg = sys.stdin.read() if args.read == "-" else Path(args.read).read_text(encoding="utf-8")
    elif args.message:
        msg = args.message
    else:
        parser.error("provide a message, --read FILE, or use --status / --reset")

    if args.new and args.session:
        parser.error("--new and --session contradict each other")

    marker = read_marker()
    # The marker can name a session from a different repository.
    auto_resume = marker.get("cwd") == str(work_dir) and not args.session and not args.new
    if auto_resume:
        missing = [field for field in ("session", "sandbox") if not marker[field]]
        if missing:
            sys.exit(
                f"[codex.py] session marker missing {' and '.join(missing)}; "
                "pass --session <id> (with --sandbox if needed) or --new"
            )

    codex_bin = find_codex_bin()
    if args.session:
        # The marker's model and sandbox apply only when the marker names this session.
        own = marker.get("session") == args.session
        model = args.model or (marker.get("model") if own else None)
        sandbox = args.sandbox or (marker.get("sandbox") if own else None)
        proc = run_codex_resume(codex_bin, args.session, model, msg, work_dir, args.effort, sandbox)
        started_new = False
    elif not auto_resume:
        model = args.model
        sandbox = args.sandbox or "read-only"
        proc = run_codex_new(codex_bin, model, sandbox, msg, work_dir, args.effort)
        started_new = True
    else:
        # A resume without --model or --sandbox keeps what the session was started
        # with, which codex itself would replace with the config's.
        model = args.model or marker["model"]
        sandbox = args.sandbox or marker["sandbox"]
        proc, started_new = run_codex_resume_or_new(
            codex_bin, marker["session"], model, sandbox, msg, work_dir, args.effort
        )

    # The marker names the last session codex opened here, failed run or not: it
    # holds the brief and the work so far (a usage limit part-way through a build).
    # A run that opened nothing (an id with no rollout) leaves the marker alone.
    session = reported_session(proc)
    if session:
        mark_active(work_dir, model, session, sandbox)
    elif proc.returncode == 0:
        # A successful run may omit its header. An automatic resume already had an id.
        known_session = args.session or (marker["session"] if auto_resume and not started_new else None)
        mark_active(work_dir, model, known_session, sandbox)
    if proc.returncode != 0:
        if session:
            sys.stderr.write(f"[codex.py] session {session} failed; the marker names it, so the "
                             "next call continues it (--new starts over)\n")
        _exit_on_failure(proc)

    reported = reported_model(proc)
    ran_under = reported_sandbox(proc)
    out =proc.stdout if args.raw else strip_header(proc.stdout)

    sys.stdout.write(out)
    if not out.endswith("\n"):
        sys.stdout.write("\n")

    sys.stderr.write(f"[codex.py] {'new session' if started_new else 'resumed session'} "
                     f"{session or '(id not reported by codex)'}; "
                     f"model: {reported or 'not reported by codex'}"
                     f"{f' (requested {model})' if model else ''}; "
                     f"sandbox: {ran_under or 'not reported by codex'}\n")
    if model and reported and reported != model:
        sys.stderr.write(f"[codex.py] warning: requested {model} but codex ran on {reported}. "
                         "Do not trust this round as one on the requested model.\n")
    if not sandbox:
        sys.stderr.write("[codex.py] no sandbox is recorded for this session, so it ran on the "
                         "config default; pass --sandbox to set it.\n")
    elif ran_under and ran_under != sandbox:
        sys.stderr.write(f"[codex.py] warning: requested sandbox {sandbox} but codex ran under "
                         f"{ran_under}. A build turn may have changed nothing: check git status.\n")


if __name__ == "__main__":
    main()
