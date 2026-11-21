#!/usr/bin/env python3
"""Run Antigravity CLI through an explicit, observable headless boundary.

Python 3.9+, standard library only. Consult denies commands and file writes;
review uses a disposable local clone whose shell can write inside it. Read the
accompanying skill before using this wrapper. --probe costs two model turns.
Exit codes: 0 success, 1 environment/run failure, 2 boundary/no read, 3 quota.
CLI events and flags were observed 2026-11-14, CLI 1.5.8, macOS.
Authentication and quota documentation was read on 2026-11-13.
"""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import os
import platform
import re
import shlex
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TAG = "[agy.py]"
WINDOWS = platform.system() == "Windows"
TIMEOUT_GRACE = 5
ALL_FLAGS = {"-p", "--output-format", "--print-timeout", "--settings", "--sandbox",
             "--conversation", "--model", "--effort", "--add-dir"}
DENY = {
    "consult": ["write_file(*)", "command(*)", "unsandboxed(*)", "read_url(*)", "execute_url(*)", "mcp(*)"],
    "build": ["read_url(*)", "execute_url(*)", "mcp(*)"],
    "review": ["write_file(*)", "read_url(*)", "execute_url(*)", "mcp(*)"],
}
STANDING = {
    "consult": "Consult only: do not run commands, write files, delegate, or use URL/MCP tools; web search remains available and is counted. Read only within the workdir and named added folders; a refused read can end the turn.",
    "build": "Build without network or sandbox bypass. Observed on macOS: the sandbox shell can write the workdir, system temp, ~/Library/Caches and added folders, and it cannot stage or commit. Leave your changes in the working tree for the caller.",
    "review": "Review this disposable snapshot without delegation, network, or sandbox bypass. Observed on macOS: the shell can write the snapshot, system temp, ~/Library/Caches and the added handoff folder, and Git metadata writes are refused. Report every change you make. Read snapshot files or explicit attachments with the file tool; the wrapper counts only those as subject reads; shell output, Git included, does not count.",
}
WRITES = {"write_file", "edit_file", "write_to_file", "replace_file_content", "multi_replace_file_content", "notebook_edit"}
SUBAGENTS = {"invoke_subagent", "define_subagent", "manage_subagents", "browser_subagent"}
NETWORK = {"read_url", "execute_url", "read_url_content", "open_browser_url", "execute_browser_javascript"}
MCP = {"call_mcp_tool", "read_resource", "list_resources"}
KNOWN = ({"read_file", "run_command", "search_web", "run_workflow", "manage_task"} | WRITES | SUBAGENTS | NETWORK | MCP)


class Failure(Exception):
    def __init__(self, message, code=1):
        super().__init__(message)
        self.code = code


def diagnostic(message):
    for line in str(message).splitlines() or [""]:
        sys.stderr.write(TAG + " " + line + "\n")
    sys.stderr.flush()


def warning(message):
    diagnostic("warning: " + message)


def state_file(cwd):
    override = os.environ.get("AGY_AGENTS_STATE")
    return Path(override).expanduser().absolute() if override else (
        Path.home() / ".gemini" / "agy-agents" /
        (hashlib.sha256(str(cwd.resolve()).encode("utf-8")).hexdigest()[:24] + ".json"))


def read_state(cwd):
    path = state_file(cwd)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("expected an object")
        if data.get("cwd") not in (None, str(cwd)):
            raise ValueError("state belongs to a different work directory")
        if not isinstance(data.get("session"), str) or not data["session"]:
            raise ValueError("missing conversation id")
        if data.get("mode") not in ("consult", "build"):
            raise ValueError("invalid saved mode")
        for key in ("model", "effort"):
            if data.get(key) is not None and not isinstance(data[key], str):
                raise ValueError("invalid " + key)
        dirs = data.get("add_dirs", [])
        if not isinstance(dirs, list) or not all(isinstance(d, str) for d in dirs):
            raise ValueError("invalid saved directories")
        return data
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:
        warning("cannot use state " + str(path) + ": " + str(exc))
        return {}


def save_state(cwd, session, mode, model, effort, dirs):
    path = state_file(cwd)
    payload = {"cwd": str(cwd), "session": session, "mode": mode, "model": model,
               "effort": effort, "add_dirs": dirs, "ts": int(time.time())}
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, name = tempfile.mkstemp(prefix=".agy-state-", dir=str(path.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(payload, stream, indent=2)
                stream.write("\n")
            os.replace(name, path)
        finally:
            if os.path.exists(name):
                os.unlink(name)
    except OSError as exc:
        warning("cannot save conversation state: " + str(exc))


def find_binary():
    override = os.environ.get("AGY_BIN")
    if override:
        path = Path(override).expanduser()
        if not path.is_file():
            raise Failure("$AGY_BIN does not name a file: " + str(path))
        return str(path.resolve())
    names = ["agy.exe", "agy", "agy.cmd"] if WINDOWS else ["agy"]
    hits = [shutil.which(n) for n in names]
    for hit in hits:
        if hit and Path(hit).suffix.lower() not in (".cmd", ".bat", ".ps1"):
            return hit
    for name in names:
        local = Path.home() / ".local" / "bin" / name
        if local.is_file():
            return str(local)
    for hit in hits:
        if hit and Path(hit).suffix.lower() in (".cmd", ".bat"):
            return hit
    raise Failure("could not locate agy; install it on PATH or set $AGY_BIN")


def process_argv(argv):
    """Bypass cmd.exe when possible. Batch shims get explicit cmd quoting.

    cmd does not implement C argument escaping; embedded JSON quotes therefore
    cannot be passed with list2cmdline alone. Settings use a file for batch shims.
    Reject expansion characters rather than run untrusted shell substitutions.
    """
    if not WINDOWS or Path(argv[0]).suffix.lower() not in (".cmd", ".bat"):
        return argv
    for arg in argv:
        if any(c in arg for c in '\r\n"%!^&|<>'):
            raise Failure("unsafe character in an argument to a Windows batch shim; use native agy.exe or a safe brief path")
    command = " ".join('"' + arg + '"' for arg in argv)
    return subprocess.list2cmdline([os.environ.get("COMSPEC", "cmd.exe")]) + ' /d /s /v:off /c "' + command + '"'


def inspect_binary(binary, required):
    try:
        help_run = subprocess.run(process_argv([binary, "--help"]), stdin=subprocess.DEVNULL,
                                  capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
        if help_run.returncode:
            raise Failure("agy --help failed: " + (help_run.stderr.strip() or str(help_run.returncode)))
        advertised = set(re.findall(r"(?<![\w-])--?[a-z][a-z0-9-]*", help_run.stdout + help_run.stderr))
        missing = sorted(set(required) - advertised)
        if missing:
            raise Failure("agy --help does not advertise required flags: " + ", ".join(missing))
        # Observed 2026-11-14, CLI 1.5.8: --version works but is absent from --help.
        version_run = subprocess.run(process_argv([binary, "--version"]), stdin=subprocess.DEVNULL,
                                     capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
        version = (version_run.stdout or version_run.stderr).strip()
        if version_run.returncode or not version:
            warning("agy --version could not establish the version")
            version = "unknown"
        return version
    except (OSError, subprocess.SubprocessError) as exc:
        raise Failure("cannot inspect agy: " + str(exc))


def auth_route():
    """Read only modelProvider; credential values are neither read nor printed."""
    provider = None
    settings = Path.home() / ".gemini" / "antigravity-cli" / "settings.json"
    try:
        data = json.loads(settings.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            provider = data.get("modelProvider")
        else:
            warning("authentication settings are not a JSON object; sign-in route is uncertain")
    except FileNotFoundError:
        pass
    except (OSError, ValueError) as exc:
        warning("cannot establish modelProvider from settings: " + str(exc))
    key_present = bool(os.environ.get("GEMINI_API_KEY"))
    if provider == "gemini" and key_present:
        return "AI Studio key", False
    if key_present or provider == "gemini":
        warning("incomplete AI Studio key configuration; modelProvider=gemini and a nonempty GEMINI_API_KEY are both required; route is uncertain")
    if os.environ.get("AGY_ADC_AUTH", "").lower() in ("1", "true", "yes"):
        return "Cloud (AGY_ADC_AUTH)", False
    return "a Google account sign-in; the wrapper cannot tell which plan", True


def announce_new():
    route, consumer = auth_route()
    diagnostic("sign-in route: " + route)
    if consumer:
        warning("Google does not support another agent driving agy on a consumer plan; see the skill.")


def deep_merge(old, update):
    merged = dict(old)
    for key, value in update.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


class Events:
    def __init__(self, replay=False, brief=None):
        self.replay = replay
        self.brief = str(brief) if brief else None
        self.init = None
        self.result = None
        self.steps = {}
        self.other = []
        self.unknown = []
        self.session_ids = set()
        self.bare = False
        self.output_id = None
        self.metadata = {}
        self.non_subject_paths = []
        self.subject_root = None
        self.subject_paths = []
        self.code = 0
        self.stderr = ""
        self.timed_out = False

    def feed(self, line):
        try:
            obj = json.loads(line)
        except (ValueError, TypeError):
            if str(line).strip():
                self.other.append(str(line).strip())
            return
        if not isinstance(obj, dict):
            self.unknown.append("non-object JSON event")
            return
        if isinstance(obj.get("conversation_id"), str) and obj["conversation_id"]:
            self.output_id = obj["conversation_id"]
        event = obj.get("event")
        if event == "init" and isinstance(obj.get("init"), dict):
            self.init = obj["init"]
            if not self.brief:
                prompt = self.init.get("prompt", "")
                match = re.match(r"Read (.+?) and do what it says\.", prompt) if isinstance(prompt, str) else None
                if match:
                    self.brief = match.group(1)
        elif event == "step_update" and isinstance(obj.get("step_update"), dict):
            step = obj["step_update"]
            index = step.get("step_index")
            if not isinstance(index, int):
                self.unknown.append("step without integer step_index")
                return
            self.steps[index] = deep_merge(self.steps.get(index, {}), step)
            if isinstance(step.get("conversation_id"), str):
                self.session_ids.add(step["conversation_id"])
        elif event == "result" and isinstance(obj.get("result"), dict):
            self.result = obj["result"]
        elif event == "wrapper_metadata":
            if isinstance(obj.get("brief_path"), str):
                self.brief = obj["brief_path"]
        elif self.replay and "status" in obj and ("response" in obj or "error" in obj):
            self.result = obj
            self.bare = True
        else:
            self.unknown.append("unrecognized event " + str(event))

    def tools(self):
        return [s for _, s in sorted(self.steps.items())
                if s.get("step_type") == "tool" or s.get("tool_name")]

    def conversation_id(self):
        value = (self.result or {}).get("conversation_id")
        if isinstance(value, str) and value:
            return value
        if len(self.session_ids) == 1:
            return next(iter(self.session_ids))
        value = self.output_id or (self.init or {}).get("conversation_id")
        return value if isinstance(value, str) and value else None


def tool_name(step):
    return step.get("tool_name") or step.get("tool_info", {}).get("name") or "(unnamed)"


def parameters(step):
    value = step.get("tool_info", {}).get("parameters", {})
    return value if isinstance(value, dict) else {}


def output_text(step):
    value = step.get("tool_info", {}).get("output", "")
    return value if isinstance(value, str) else json.dumps(value)


def command_exit(step):
    info = step.get("tool_info", {})
    for source in (info, info.get("output"), step):
        if isinstance(source, dict):
            for key in ("exit_code", "exitCode"):
                if isinstance(source.get(key), int):
                    return source[key]
    match = re.search(r"Command exited with code\s+(-?\d+)\b", output_text(step))
    return int(match.group(1)) if match else None


def path_of(step):
    params = parameters(step)
    return params.get("Path") or params.get("path") or params.get("TargetFile")


def same_path(left, right):
    if not isinstance(left, str) or not isinstance(right, str):
        return False
    return os.path.normcase(os.path.abspath(left)) == os.path.normcase(os.path.abspath(right))


def successful_read(step, excluded=()):
    if step.get("state") != "DONE" or step.get("tool_info", {}).get("error"):
        return False
    name = tool_name(step)
    if name == "read_file":
        return not any(same_path(path_of(step), str(path)) for path in excluded)
    if name == "run_command":
        text = output_text(step)
        if command_exit(step) != 0:
            return False
        # Shell pipelines can hide a failed reader behind a successful last command.
        if re.search(r"operation not permitted|permission denied|fatal:|cannot (?:open|read)|no such file", text, re.I):
            return False
        cmd = parameters(step).get("CommandLine", "")
        if any(str(path) in cmd for path in excluded):
            return False
        # An observed shell result proves a read only when the command is a reader.
        return bool(re.search(r"(?:^|[\s;&|])(?:cat|head|tail|sed|grep|rg|ls|find|git|type|Get-Content|Select-String)\b|\b(?:read_text|read_bytes|open)\s*\(", cmd, re.I))
    return False


def lexical_path(path, directory):
    """Replay-safe placement: normalize spelling without touching the filesystem."""
    if not isinstance(path, str) or "\0" in path:
        return None
    return os.path.normcase(os.path.normpath(os.path.join(directory, path)))


def lexical_inside(path, root):
    try:
        return path is not None and os.path.commonpath([path, root]) == root
    except ValueError:
        return False


def review_subject_read(step, run):
    if tool_name(step) != "read_file":
        return False
    root = run.subject_root
    if not isinstance(root, str) or not os.path.isabs(root) or "\0" in root:
        return False
    root = lexical_path(root, root)
    if not successful_read(step):
        return False
    path = lexical_path(path_of(step), root)
    if path is None or (run.brief and path == lexical_path(run.brief, root)):
        return False
    attachments = {lexical_path(value, root) for value in run.subject_paths if isinstance(value, str)}
    return lexical_inside(path, root) or path in attachments


def quota_failure(run):
    """Docs-derived: Gemini quota errors use RESOURCE_EXHAUSTED/HTTP 429.

    This branch has no live quota recording. Inspect error context, never successful
    answer text or tool/source output, which may merely quote those strings.
    """
    res = run.result or {}
    errors = [res.get(key) for key in ("error", "errors", "error_message", "error_code", "api_error_status") if res.get(key)]
    if res.get("status") not in (None, "SUCCESS"):
        errors.append(res.get("status"))
        if res.get("response"):
            errors.append(res["response"])
    text = " ".join(json.dumps(x) if not isinstance(x, str) else x for x in errors)
    stderr_errors = [line for line in run.stderr.splitlines() if re.search(r"\b(?:error|RESOURCE_EXHAUSTED|429)\b", line, re.I)]
    text += "\n" + "\n".join(stderr_errors)
    return bool(re.search(r"\bRESOURCE_EXHAUSTED\b", text) or
                (re.search(r"\b429\b", text) and re.search(r"quota|rate.?limit|resource.exhausted", text, re.I)))


DENIAL_ADVICE = ("Do not add an allow rule or --dangerously-skip-permissions; that removes the boundary. "
                 "Change the brief to avoid the action or do it yourself.")


def diagnostic_key(text):
    text = re.sub(r"\x1b\[[0-9;]*m", "", text).strip()
    text = re.sub(r"^(?:\[[^]\n]+\]\s*)+", "", text)
    text = re.sub(r"^(?:error|warning|fatal):\s*", "", text, flags=re.I)
    return " ".join(text.casefold().split())


def error_lines(value):
    if isinstance(value, dict):
        lines = []
        for key, item in value.items():
            if key in ("message", "error", "errors", "error_message", "reason", "detail"):
                lines.extend(error_lines(item))
            else:
                lines.append(key + ": " + (item if isinstance(item, str) else json.dumps(item)))
        return lines
    if isinstance(value, list):
        return [line for item in value for line in error_lines(item)]
    return str(value).splitlines() if value else []


def run_diagnostics(run):
    """Prefer complete CLI stderr over the same result message with a prefix.

    Only repeated diagnostic content is removed; distinct CLI advice stays intact.
    """
    res = run.result or {}
    value = res.get("error") or res.get("errors") or (res.get("response") if res.get("status") != "SUCCESS" else "") or ""
    detail = "\n".join(error_lines(value))
    stderr, keys = [], set()
    for line in run.stderr.splitlines():
        key = diagnostic_key(line)
        if key and key not in keys:
            stderr.append(line)
            keys.add(key)
    stderr_text = "\n".join(stderr)
    combined = diagnostic_key(stderr_text)
    result_lines = [line for line in detail.splitlines() if diagnostic_key(line) and diagnostic_key(line) not in combined]
    response = res.get("response")
    failed = run.code or run.timed_out or not run.result or res.get("status") != "SUCCESS" or not isinstance(response, str) or not response.strip()
    permission_advice = failed and re.search(r"permission|denied|approval", run.stderr, re.I) and re.search(r"--dangerously-skip-permissions|allow(?:list| rule)|permissions\.allow", run.stderr, re.I)
    return "\n".join(result_lines), stderr_text, bool(res.get("denied_actions") or permission_advice)


def append_cli_diagnostics(problems, warnings, run, failed):
    _, stderr, denial = run_diagnostics(run)
    if stderr:
        (problems if failed else warnings).append(stderr if failed else "agy stderr: " + stderr)
    if denial:
        problems.append(DENIAL_ADVICE)


def judge(run, mode, expected_session=None, git_changed=False, git_observable=True, mcp=False):
    problems, warnings = [], []
    tools = run.tools()
    if mode == "review" and run.subject_root is None:
        warnings.append("subject reads unverified: no recorded subject_root")
    counts = {"commands": 0, "reads": 0, "searches": 0, "tool_errors": 0}
    for step in tools:
        name, state = tool_name(step), step.get("state")
        if state == "DONE":
            counts["commands"] += int(name == "run_command")
            counts["reads"] += int(successful_read(step, excluded=run.non_subject_paths))
            counts["searches"] += int(name == "search_web")
        if state == "ERROR":
            counts["tool_errors"] += 1
        elif state != "DONE":
            warnings.append("tool " + name + " has unestablished final state " + str(state))
        if name not in KNOWN:
            warnings.append("unknown tool " + name + "; boundary behavior is unestablished")
        if name == "run_command" and state == "DONE" and command_exit(step) is None:
            warnings.append("run_command has no established exit code; it does not prove a successful read")
    if run.unknown:
        warnings.append("unrecognized output: " + "; ".join(sorted(set(run.unknown))))
    if run.other:
        warnings.append("non-JSON output was received: " + " | ".join(run.other[-3:]))
    if not run.init:
        warnings.append("no init event; model and execution mode could not be established")
    res = run.result or {}
    error_detail, _, _ = run_diagnostics(run)
    duration = res.get("duration_seconds", "unknown")
    if run.timed_out or res.get("finished_reason") == "print_timeout":
        problems.append("run timed out; agy's own timeout exit is a run failure, not quota")
        append_cli_diagnostics(problems, warnings, run, True)
        return 1, problems, warnings, counts, duration
    denied = res.get("denied_actions")
    if denied:
        actions = denied if isinstance(denied, list) else [denied]
        names = [str(x.get("action") or x.get("display_name") or "unknown action") if isinstance(x, dict) else str(x) for x in actions]
        problems.append("automatic denial: " + ", ".join(names) + "; the turn ended there")
    if run.result is None:
        problems.append("agy exited " + str(run.code) + " without a result event")
    elif res.get("status") != "SUCCESS":
        problems.append("run status " + str(res.get("status")) + (": " + error_detail if error_detail else ""))
    if run.result is not None and not (isinstance(res.get("response"), str) and res["response"].strip()):
        problems.append("empty response; no answer was produced")
    if run.code:
        problems.append("agy subprocess exited " + str(run.code))
    actual_session = run.conversation_id()
    if expected_session and actual_session and actual_session != expected_session:
        problems.append("conversation id mismatch; the requested session was not resumed")
    if len(run.session_ids) > 1 or (actual_session and run.session_ids and actual_session not in run.session_ids):
        problems.append("inconsistent output conversation ids")
    if problems:
        append_cli_diagnostics(problems, warnings, run, True)
        return (3 if not denied and quota_failure(run) else 1), problems, warnings, counts, duration
    for step in tools:
        name, state = tool_name(step), step.get("state")
        if mode in ("consult", "review") and (name in SUBAGENTS or name == "run_workflow"):
            problems.append(mode + " attempted delegation tool " + name)
        if mode in ("consult", "review") and state == "DONE" and name in WRITES:
            problems.append(mode + " completed forbidden tool " + name)
        if mode == "consult" and name in ("run_command", "manage_task") and state == "DONE":
            problems.append("consult completed forbidden " + name)
        if mode == "consult" and state == "DONE" and name not in KNOWN:
            problems.append("consult completed unknown tool " + name + "; boundary is unestablished")
        if mode == "review" and name == "search_web":
            problems.append("review attempted search_web; search cannot be disabled")
        if mode == "review" and name not in KNOWN:
            problems.append("review encountered unknown tool " + name)
        if state == "DONE" and (name in NETWORK or ((name in MCP or name.startswith("mcp__")) and not (mode == "build" and mcp))):
            problems.append(mode + " completed forbidden network/MCP tool " + name)
    if mode == "consult":
        if not git_observable:
            warnings.append("consult git status is unobservable; file-change boundary could not be checked")
        if git_changed:
            problems.append("consult changed git status --porcelain")
        if not any(successful_read(s, excluded=run.non_subject_paths) for s in tools):
            problems.append("consult read nothing successfully")
    if mode == "review" and not any(review_subject_read(s, run) for s in tools):
        problems.append("review read nothing in the snapshot or its attachments; only file-tool reads there count")
    if mode == "build" and not any(successful_read(s) for s in tools):
        problems.append("build read nothing successfully")
    append_cli_diagnostics(problems, warnings, run, bool(problems))
    return (2 if problems else 0), problems, warnings, counts, duration


def report(verdict, advice=True):
    code, problems, warnings, counts, duration = verdict
    for item in warnings:
        warning(item)
    for item in problems:
        if item != DENIAL_ADVICE:
            diagnostic(item)
    diagnostic("commands={commands} reads={reads} searches={searches} tool_errors={tool_errors}; duration={duration}s; verdict={code}".format(
        duration=duration, code=code, **counts))
    if advice and DENIAL_ADVICE in problems:
        diagnostic(DENIAL_ADVICE)
    return code


CUSTOMIZATION_ROOTS = (".agents", ".agent", "_agents", "_agent")
CUSTOMIZATION_FILES = ("hooks.json", "mcp_config.json", "plugins.json")


UNCLEAR_CUSTOMIZATION = object()


def customization_metadata(path):
    """Follow filesystem links for metadata, never JSON registration targets."""
    try:
        info = path.lstat()
    except FileNotFoundError:
        return None
    except OSError:
        return UNCLEAR_CUSTOMIZATION
    if stat.S_ISLNK(info.st_mode):
        try:
            return path.stat()
        except (OSError, RuntimeError):
            return UNCLEAR_CUSTOMIZATION
    return info


def customization_entries(root):
    """Inspect names/types/sizes only. Unclear paths are reported conservatively."""
    info = customization_metadata(root)
    if info is None:
        return []
    if info is UNCLEAR_CUSTOMIZATION:
        return [root]
    if not stat.S_ISDIR(info.st_mode):
        return []
    found = []
    for name in CUSTOMIZATION_FILES:
        path = root / name
        info = customization_metadata(path)
        if info is UNCLEAR_CUSTOMIZATION or (info is not None and (not stat.S_ISREG(info.st_mode) or info.st_size)):
            found.append(path)
    plugins = root / "plugins"
    info = customization_metadata(plugins)
    if info is UNCLEAR_CUSTOMIZATION:
        found.append(plugins)
    elif info is not None and stat.S_ISDIR(info.st_mode):
        try:
            if next(plugins.iterdir(), None) is not None:
                found.append(plugins)
        except OSError:
            found.append(plugins)
    return sorted(found, key=str)


def command_customizations(start, stop=None):
    """Walk actual cwd to its inclusive repository root without interpreting configs."""
    try:
        start = Path(start).resolve()
        stop = Path(stop).resolve() if stop is not None else start
    except (OSError, RuntimeError) as exc:
        raise Failure("cannot establish customization scan boundary: " + str(exc))
    if start != stop and stop not in start.parents:
        raise Failure("customization scan stop is outside the working directory's ancestors")
    found, directory = [], start
    while True:
        for name in CUSTOMIZATION_ROOTS:
            found.extend(customization_entries(directory / name))
        if directory == stop:
            break
        directory = directory.parent
    return sorted(found, key=str)


def customization_repository_root(cwd):
    try:
        result = git(cwd, "rev-parse", "--show-toplevel")
        if result.returncode == 0:
            return Path(os.fsdecode(result.stdout).strip()).resolve()
    except (OSError, subprocess.SubprocessError) as exc:
        warning("repository root unavailable for customization scan; inspecting cwd only: " + str(exc))
    return None


def user_command_customizations():
    parent = Path.home() / ".gemini"
    root = parent / "config"
    info = customization_metadata(parent)
    if info is None:
        return []
    if info is UNCLEAR_CUSTOMIZATION:
        return [root]
    return customization_entries(root)


def warn_user_customizations():
    paths = user_command_customizations()
    if paths:
        warning("user command customizations (present or unclear): " + ", ".join(str(path) for path in paths) +
                "; hooks/plugins can run commands outside the sandbox and deny rules")


def workspace_customization_gate(cwd, allow_hooks):
    paths = command_customizations(cwd, customization_repository_root(cwd))
    if not paths:
        return
    names = ", ".join(os.path.relpath(path, cwd) for path in paths)
    if not allow_hooks:
        raise Failure("workspace command customizations (present or unclear): " + names +
                      "; these can run commands outside deny rules and the sandbox; read them and pass --allow-hooks only when the owner trusts them")
    diagnostic("--allow-hooks permits workspace customizations: " + names +
               "; command hooks/plugins can run outside the sandbox and deny rules")


def git_env():
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT="0")
    return env


def git(cwd, *args):
    return subprocess.run(["git", "--no-optional-locks", "-c", "core.hooksPath=" + os.devnull,
                           "-c", "core.fsmonitor=false", *args], cwd=str(cwd), env=git_env(),
                          stdin=subprocess.DEVNULL, capture_output=True, timeout=60)


def git_status(cwd, excluded=()):
    try:
        proc = git(cwd, "status", "--porcelain=v1", "-z", "--untracked-files=all")
        if proc.returncode:
            raise Failure(proc.stderr.decode("utf-8", "replace").strip())
        root_run = git(cwd, "rev-parse", "--show-toplevel")
        if root_run.returncode:
            raise Failure("could not identify repository root")
        root = Path(os.fsdecode(root_run.stdout).strip()).resolve()
        ignored = {str(Path(x).resolve()) for x in excluded}
        entries = proc.stdout.split(b"\0")
        result, index = [], 0
        while index < len(entries):
            entry = entries[index]
            index += 1
            if not entry:
                continue
            paths = [entry[3:]]
            if entry[:1] in (b"R", b"C") or entry[1:2] in (b"R", b"C"):
                if index < len(entries):
                    paths.append(entries[index]); index += 1
            if any(str((root / os.fsdecode(p)).resolve()) in ignored or any(Path(x).is_dir() and within(root / os.fsdecode(p), x) for x in ignored) for p in paths):
                continue
            result.append((entry, tuple(paths)))
        return result
    except (OSError, subprocess.SubprocessError, Failure) as exc:
        warning("cannot observe git status: " + str(exc))
        return None


def snapshot_manifest(root):
    manifest = {}
    def walk_error(exc):
        warning("snapshot change scan incomplete: " + str(exc))
        manifest["(scan incomplete)"] = time.time_ns()
    for folder, dirs, files in os.walk(root, followlinks=False, onerror=walk_error):
        for name in list(dirs) + files:
            path = Path(folder) / name
            relative = str(path.relative_to(root))
            try:
                if path.is_symlink():
                    manifest[relative] = ("symlink", os.readlink(path))
                elif path.is_file():
                    digest = hashlib.sha256()
                    with path.open("rb") as stream:
                        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                            digest.update(chunk)
                    manifest[relative] = ("file", digest.hexdigest(), path.stat().st_mode)
            except OSError as exc:
                walk_error(exc)
    return manifest


@contextlib.contextmanager
def snapshot(source, revision, keep=False):
    # Resolved, so the path the brief names is the one the process and the sandbox see (macOS: /var is a symlink).
    temp = Path(tempfile.mkdtemp(prefix="agy-review-")).resolve()
    clone = temp / "snapshot"
    baseline = None
    try:
        root = git(source, "rev-parse", "--show-toplevel")
        if root.returncode:
            raise Failure("review requires a local Git repository")
        repo = Path(os.fsdecode(root.stdout).strip()).resolve()
        rev = git(repo, "rev-parse", "--verify", "--end-of-options", revision + "^{commit}")
        if rev.returncode:
            raise Failure("review revision is not a local commit: " + revision)
        commit = rev.stdout.decode("ascii").strip()
        status = git_status(repo)
        if status is None:
            raise Failure("could not establish source repository status")
        if status:
            warning("uncommitted source changes are not included in the review snapshot")
        cloned = git(temp, "clone", "--local", "--no-hardlinks", "--no-checkout", "--template=", "--", str(repo), str(clone))
        if cloned.returncode:
            raise Failure("local review clone failed: " + cloned.stderr.decode("utf-8", "replace").strip())
        removed = git(clone, "remote", "remove", "origin")
        if removed.returncode:
            raise Failure("could not remove snapshot source remote")
        checked = git(clone, "checkout", "--detach", commit)
        if checked.returncode:
            raise Failure("snapshot checkout failed: " + checked.stderr.decode("utf-8", "replace").strip())
        diagnostic("review snapshot: " + str(clone) + "; commit " + commit)
        diagnostic("review sources cannot be disabled (observed 2026-11-14, CLI 1.5.8): workspace AGENTS.md/GEMINI.md and ~/.gemini/ rules load when present, plus five built-in skills")
        baseline = snapshot_manifest(clone)
        yield clone
    finally:
        if clone.is_dir():
            changes = git_status(clone)
            if changes is None:
                warning("review snapshot changes could not be observed")
            if baseline is not None:
                final = snapshot_manifest(clone)
                changed = sorted(name for name in set(baseline) | set(final) if baseline.get(name) != final.get(name))
                if changed:
                    diagnostic("changes inside review snapshot (including ignored files and Git metadata):")
                    for name in changed:
                        diagnostic(name)
                else:
                    diagnostic("changes inside review snapshot: none (content and Git metadata compared)")
            elif changes:
                for entry, _ in changes:
                    diagnostic(os.fsdecode(entry))
        if keep and clone.is_dir():
            diagnostic("kept review snapshot: " + str(clone))
        else:
            shutil.rmtree(temp, ignore_errors=False)


def make_command(binary, mode, model, effort, session, dirs, args, brief, settings_path=None, probing=False, workdir=None, listing=None):
    denies = [x for x in DENY[mode] if not (x == "mcp(*)" and mode == "build" and args.mcp)]
    settings = json.dumps({"permissions": {"deny": denies}}, separators=(",", ":"))
    if settings_path:
        Path(settings_path).write_text(settings, encoding="utf-8")
        settings = str(settings_path)
    standing = STANDING[mode]
    if mode == "build" and args.no_sandbox:
        standing = "Build without network; commands and writes run with the user's own rights."
    if dirs:
        standing += " Named added folders: " + " ; ".join(str(folder) for folder in dirs) + "."
    if workdir:
        standing += " Relative paths resolve in the workdir " + str(workdir) + ", not the brief folder."
    if listing:
        standing += " Repository file list: " + str(listing) + "; entries are JSON workdir-relative paths. This generated list is not a repository-content read."
    if probing:
        standing = "Attempt each boundary test in the brief exactly once, continue after refusals, and never bypass, retry or disguise a refused action."
    pointer = "Read " + str(brief) + " and do what it says. " + standing
    cmd = [binary, "-p", pointer, "--output-format", "stream-json", "--print-timeout", format(args.timeout, "g") + "s", "--settings", settings]
    if mode == "review" or (mode == "build" and not args.no_sandbox):
        cmd.append("--sandbox")
    if session:
        cmd += ["--conversation", session]
    if model:
        cmd += ["--model", model]
    if effort:
        cmd += ["--effort", effort]
    for folder in dirs:
        cmd += ["--add-dir", folder]
    return cmd


def kill_process(proc):
    try:
        if WINDOWS:
            proc.kill()
        else:
            os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def execute(command, cwd, timeout, sinks, brief):
    run = Events(brief=brief)
    try:
        proc = subprocess.Popen(process_argv(command), cwd=str(cwd), stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                encoding="utf-8", errors="replace", bufsize=1,
                                start_new_session=not WINDOWS)
    except OSError as exc:
        raise Failure("cannot start agy: " + str(exc))
    errors = []
    thread = threading.Thread(target=lambda: errors.append(proc.stderr.read()), daemon=True)
    thread.start()
    def stop():
        run.timed_out = True
        kill_process(proc)
    timer = threading.Timer(timeout + TIMEOUT_GRACE, stop)
    timer.daemon = True
    timer.start()
    try:
        for line in proc.stdout:
            for sink in sinks:
                sink.write(line)
                sink.flush()
            run.feed(line)
        proc.wait()
    except BaseException:
        kill_process(proc)
        proc.wait()
        raise
    finally:
        timer.cancel()
        proc.stdout.close()
    thread.join(5)
    if thread.is_alive():
        warning("stderr reader did not finish; diagnostics may be incomplete")
    if not thread.is_alive():
        proc.stderr.close()
    run.stderr = "".join(errors)
    run.code = proc.returncode
    return run


def load_replay(path):
    run = Events(replay=True)
    source = Path(path)
    metadata = {}
    try:
        metadata = json.loads(Path(str(source) + ".meta.json").read_text(encoding="utf-8"))
        if not isinstance(metadata, dict):
            raise ValueError("expected metadata object")
    except FileNotFoundError:
        pass
    except (OSError, ValueError) as exc:
        warning("cannot use replay metadata: " + str(exc))
        metadata = {}
    data = source.read_bytes()
    offset = metadata.get("start_offset", 0)
    if not isinstance(offset, int) or not 0 <= offset <= len(data):
        raise Failure("invalid replay metadata stream offset")
    text = data[offset:].decode("utf-8")
    run.brief = metadata.get("brief_path")
    run.metadata = metadata
    run.non_subject_paths = metadata.get("non_subject_paths", [])
    run.subject_root = metadata.get("subject_root")
    run.subject_paths = metadata.get("subject_paths", [])
    run.code = metadata.get("process_exit", 0)
    run.stderr = metadata.get("stderr", "")
    run.timed_out = bool(metadata.get("timed_out", False))
    try:
        whole = json.loads(text)
    except ValueError:
        whole = None
    if isinstance(whole, dict):
        run.feed(text)
    else:
        for line in text.splitlines():
            run.feed(line)
    # Recordings may include the original wrapper's exact brief as optional metadata.
    if not run.brief:
        warning("replay has no brief metadata; the original brief cannot be identified")
    return run


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise Failure(message + "; use --help for usage")


def parser():
    p = ArgumentParser(description=__doc__, prog="agy.py")
    p.add_argument("message", nargs="?")
    p.add_argument("--new", action="store_true")
    p.add_argument("--session", metavar="ID")
    p.add_argument("--read", metavar="FILE", help="Prompt file, or - for stdin")
    p.add_argument("--mode", choices=("consult", "build", "review"))
    p.add_argument("--model")
    p.add_argument("--effort", choices=("low", "medium", "high", "xhigh", "max"))
    p.add_argument("--cwd", default=".")
    p.add_argument("--add-dir", action="append", default=None)
    p.add_argument("--attach", action="append", default=[], metavar="FILE", help="Copy a named input into the prepared handoff folder (repeatable)")
    p.add_argument("--timeout", type=float, default=3600)
    p.add_argument("--log", help="Append raw events, flushing each line")
    p.add_argument("--out", help="Answer file; raw events go to FILE.events.jsonl")
    p.add_argument("--raw", action="store_true")
    p.add_argument("--allow-hooks", action="store_true", help="Allow trusted workspace command customizations outside sandbox/deny rules")
    for flag in ("status", "reset", "check", "dry-run", "mcp", "no-sandbox", "keep-snapshot"):
        p.add_argument("--" + flag, action="store_true")
    p.add_argument("--rev", default="HEAD", help="Local revision to snapshot in review")
    p.add_argument("--probe", action="store_true", help="Costs two short model turns testing boundaries; never bypasses them")
    p.add_argument("--replay", metavar="FILE", help="Judge a saved stream/result; runs no CLI")
    return p


def resolved_dirs(values):
    result = []
    for value in values:
        folder = Path(value).expanduser().resolve()
        if not folder.is_dir():
            raise Failure("--add-dir is not a directory: " + str(folder))
        if str(folder) not in result:
            result.append(str(folder))
    return result


def within(path, folder):
    try:
        Path(path).resolve().relative_to(Path(folder).resolve())
        return True
    except ValueError:
        return False


def emit_answer(run, args, answer_sink=None):
    answer = json.dumps(run.result, indent=2) if args.raw else run.result["response"]
    if answer_sink:
        answer_sink.write(answer if answer.endswith("\n") else answer + "\n")
        answer_sink.flush()
    sys.stdout.write(answer if answer.endswith("\n") else answer + "\n")


def main(argv=None):
    try:
        args = parser().parse_args(argv)
        return run_main(args)
    except (Failure, OSError, ValueError, subprocess.SubprocessError) as exc:
        diagnostic(str(exc))
        return getattr(exc, "code", 1)
    except KeyboardInterrupt:
        diagnostic("interrupted; no success answer emitted")
        return 1


def reject_collisions(targets):
    for index, (left_name, left) in enumerate(targets):
        for right_name, right in targets[index + 1:]:
            alias = left.resolve() == right.resolve()
            if not alias and left.exists() and right.exists():
                alias = os.path.samefile(left, right)
            if alias:
                raise Failure(left_name + " and " + right_name + " paths alias; choose separate files")


def handoff_dir(cwd):
    return Path(str(state_file(cwd)) + ".handoff")


def clear_handoff(cwd):
    folder = handoff_dir(cwd)
    if folder.is_symlink():
        raise Failure("handoff directory is a symlink; refusing to remove it: " + str(folder))
    if folder.exists():
        shutil.rmtree(folder)


def input_aliases(value):
    path = Path(value).expanduser()
    return list(dict.fromkeys([os.path.abspath(str(path)), str(path.resolve())]))


def attachment_inputs(values):
    inputs = []
    for value in values:
        path = Path(value).expanduser().resolve()
        if not path.is_file():
            raise Failure("--attach is not a file: " + str(path))
        aliases = input_aliases(value)
        existing = next((item for item in inputs if os.path.samefile(path, item["source"])), None)
        if existing:
            existing["aliases"] = list(dict.fromkeys(existing["aliases"] + aliases))
        else:
            inputs.append({"source": path, "aliases": aliases, "data": path.read_bytes()})
    return inputs


PATH_PUNCTUATION = r"[\s`'\"<>()[\]{},;:!?]"
PATH_END = r"(?=$|[\s`'\"<>()[\]{},;!?]|\.(?=$|[\s`'\"<>()[\]{},;!?]))"
PATH_BOUNDARY = (r"(?=$|[/\\]|" + PATH_PUNCTUATION + r"|\.(?=$|" + PATH_PUNCTUATION +
                 r")|#L\d+(?:-L?\d+)?" + PATH_END + r")")


def strip_path_anchor(path):
    return re.sub(r"(?::\d+(?::\d+)?|#L\d+(?:-L?\d+)?)$", "", path)


def rewrite_paths(text, mappings):
    """Replace path prefixes once, so inserted handoff paths are never remapped.

    Longest match gives attachments priority over repository prefixes. Only whole
    path components match; unrelated repository names and URL segments stay intact.
    """
    replacements = {}
    for source, target in mappings:
        source = str(source).rstrip("/\\")
        if source:
            replacements.setdefault(source, str(target).rstrip("/\\"))
    if not replacements:
        return text, 0
    choices = "|".join(re.escape(x) for x in sorted(replacements, key=len, reverse=True))
    pattern = re.compile(r"(?<![\w./\\-])(?P<uri>file://)?(?P<path>" + choices + r")" + PATH_BOUNDARY)
    return pattern.subn(lambda match: (match.group("uri") or "") + replacements[match.group("path")], text)


def review_path_mappings(source, raw_cwd, clone):
    root_run = git(source, "rev-parse", "--show-toplevel")
    gitdir_run = git(source, "rev-parse", "--absolute-git-dir")
    if root_run.returncode or gitdir_run.returncode:
        raise Failure("cannot identify source repository and Git directory for review handoff")
    root = Path(os.fsdecode(root_run.stdout).strip()).resolve()
    actual_gitdir = Path(os.fsdecode(gitdir_run.stdout).strip()).resolve()
    relative = source.relative_to(root)
    mappings = [(str(root), str(clone)), (str(actual_gitdir), str(clone / ".git"))]
    # Absolutize lexical spellings, including relative symlinks, before mapping.
    # Raw '.' and other relative prose are never replacement keys.
    absolute = Path(os.path.abspath(str(Path(raw_cwd).expanduser())))
    mappings.append((str(absolute), str(clone / relative)))
    # A symlink directly to a subdirectory may not spell that suffix. Never
    # ascend to an unrelated parent and accidentally rewrite that entire tree.
    if not relative.parts or absolute.parts[-len(relative.parts):] == relative.parts:
        spelled_root = absolute
        for _ in relative.parts:
            spelled_root = spelled_root.parent
        mappings.append((str(spelled_root), str(clone)))
    return mappings


def validate_snapshot_paths(text, clone):
    """Check named snapshot paths; quoted paths can contain spaces.

    Unquoted whitespace is a path boundary. An ambiguous or missing candidate
    fails with a path-specific message instead of sending an inaccessible subject.
    Neutral Windows-drive examples never go through native POSIX resolution.
    """
    root = str(clone)
    quotes = list(re.finditer(r"`[^`\n]+`", text))
    quotes += list(re.finditer(r'"[^"\n]+"', text))
    quotes += list(re.finditer(r"(?<!\w)'[^'\n]+'(?!\w)", text))
    for match in re.finditer(re.escape(root) + PATH_BOUNDARY, text):
        quoted = next((q for q in quotes if q.start() < match.start() < q.end()), None)
        tail = text[match.end():]
        end = re.search(r"[\s`'\"<>()[\]{},;:]", tail)
        word = root + (tail[:end.start()] if end else tail)
        whole = text[match.start():quoted.end() - 1] if quoted else word
        candidates = ([whole] if quoted else []) + [word, word.rstrip(".,;!?")]
        candidates = [strip_path_anchor(candidate) for candidate in candidates]
        if any(Path(candidate).exists() and within(Path(candidate), clone) for candidate in candidates):
            continue
        shown = whole if quoted and quoted.start() + 1 == match.start() else word
        shown = strip_path_anchor(shown)
        raise Failure("review path is missing or ambiguous in the snapshot: " + shown + "; commit the file or provide --attach FILE, and quote paths containing spaces")


def repository_listing(cwd, excluded):
    try:
        result = git(cwd, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
        if result.returncode:
            diagnostic("consult repository listing skipped: " + result.stderr.decode("utf-8", "replace").strip())
            return None
        names = []
        for item in result.stdout.split(b"\0"):
            if item:
                name = os.fsdecode(item)
                path = cwd / name
                if not any(path.resolve() == Path(x).resolve() or (Path(x).is_dir() and within(path, x)) for x in excluded):
                    names.append(name)
        lines = [json.dumps({"workdir": str(cwd), "paths": "relative to workdir"}, ensure_ascii=False)]
        lines.extend(json.dumps(name, ensure_ascii=False) for name in sorted(set(names)))
        return ("\n".join(lines) + "\n").encode("utf-8")
    except (OSError, subprocess.SubprocessError) as exc:
        diagnostic("consult repository listing skipped: " + str(exc))
        return None


def prepare_handoff(message, original, attachments, cwd, folder, mode, path_mappings=(), listing_data=None):
    turn = folder / ("turn-" + uuid.uuid4().hex)
    files, mappings, subject_paths = {}, [], []
    for index, item in enumerate(attachments, 1):
        target = turn / ("attachment-%03d-" % index + item["source"].name)
        files[target] = item["data"]
        subject_paths.append(str(target))
        mappings.extend((alias, str(target)) for alias in item["aliases"])
    rewritten, count = rewrite_paths(message, mappings + list(path_mappings))
    copied = mode == "review" or original is None or not within(original, cwd) or within(original, folder) or rewritten != message
    brief = turn / "brief.txt" if copied else original
    if copied:
        files[brief] = rewritten.encode("utf-8")
    listing = turn / "repository-files.jsonl" if listing_data is not None else None
    if listing:
        files[listing] = listing_data
    return brief, files, listing, count, rewritten, subject_paths


def protected_targets(args, cwd, sources):
    targets = [("state", state_file(cwd))]
    for name, source in sources:
        if not any(source.exists() and other.exists() and os.path.samefile(source, other) for _, other in targets[1:]):
            targets.append((name, source))
    if args.out:
        output = Path(args.out).expanduser().absolute()
        targets += [("output", output), ("events", Path(str(output) + ".events.jsonl")),
                    ("events metadata", Path(str(output) + ".events.jsonl.meta.json"))]
    if args.log:
        log = Path(args.log).expanduser().absolute()
        targets += [("log", log), ("log metadata", Path(str(log) + ".meta.json"))]
    reject_collisions(targets)
    for name, target in targets:
        if name not in ("source brief", "attachment", "prepared brief") and within(target, handoff_dir(cwd)):
            raise Failure(name + " must stay outside the prepared handoff directory")
    return targets


def run_main(args):
    cwd = Path(args.cwd).expanduser().resolve()
    if not cwd.is_dir():
        raise Failure("--cwd is not a directory: " + str(cwd))
    if not args.timeout > 0 or not args.timeout < float("inf"):
        raise Failure("--timeout must be a finite positive number")
    if args.new and args.session:
        raise Failure("--new and --session conflict")
    if args.read is not None and args.message is not None:
        raise Failure("use a message or --read, not both")
    if args.replay:
        if args.probe or args.session or args.message or args.read or args.attach:
            raise Failure("--replay cannot launch or resume a turn")
        run = load_replay(args.replay)
        verdict = judge(run, args.mode or run.metadata.get("mode") or "consult",
                        expected_session=run.metadata.get("expected_session"),
                        git_changed=run.metadata.get("git_changed", False),
                        git_observable=run.metadata.get("git_observable", True),
                        mcp=args.mcp or run.metadata.get("mcp", False))
        code = report(verdict)
        if not code:
            emit_answer(run, args)
        return code
    if args.reset:
        if args.dry_run:
            diagnostic("dry run; would clear state and handoff for " + str(cwd))
            return 0
        clear_handoff(cwd)
        try:
            state_file(cwd).unlink()
        except FileNotFoundError:
            pass
        diagnostic("session cleared for " + str(cwd))
        return 0
    state = read_state(cwd)
    if args.status:
        diagnostic("state: " + str(state_file(cwd)))
        diagnostic(json.dumps(state) if state else "no saved conversation for " + str(cwd))
        return 0
    if args.check:
        warn_user_customizations()
        binary = find_binary()
        version = inspect_binary(binary, ALL_FLAGS)
        route, _ = auth_route()
        diagnostic("binary=" + binary + "; version=" + version.replace("\n", " ") + "; flags=all supported; state=" + str(state_file(cwd)) + "; sign-in route=" + route)
        diagnostic("support (FAQ read 2026-11-13): headless supports direct scripts/CI; consumer third-party driving is unsupported and third-party sign-in access breaks terms/can lead to suspension; Gemini Enterprise or AI Studio key is documented")
        return 0
    if args.probe:
        if args.message or args.read or args.session or args.new or args.mode or args.no_sandbox or args.mcp or args.attach or args.add_dir is not None:
            raise Failure("--probe uses its own fresh consult and review-shaped turns; do not combine it with turn/mode options")
        return probe(args)
    session = None if args.new or args.mode == "review" else (args.session or state.get("session"))
    same = bool(session and session == state.get("session"))
    mode = args.mode or (state.get("mode") if same else None) or "consult"
    if mode == "review" and args.add_dir is not None:
        raise Failure("review forbids user --add-dir; copy each required input with --attach FILE")
    if mode == "review" and args.session:
        raise Failure("review always starts fresh; --session is invalid")
    if args.mcp and mode != "build":
        raise Failure("--mcp is available only in build")
    if args.no_sandbox and mode != "build":
        raise Failure("--no-sandbox is available only in build")
    if args.keep_snapshot and mode != "review":
        raise Failure("--keep-snapshot is available only in review")
    if args.rev != "HEAD" and mode != "review":
        raise Failure("--rev is available only in review")
    model = args.model or (state.get("model") if same else None)
    effort = args.effort or (state.get("effort") if same else None)
    dirs = resolved_dirs(args.add_dir if args.add_dir is not None else (state.get("add_dirs", []) if same else []))
    if same and args.mode and state.get("mode") != args.mode:
        warning("resumed conversation changes mode from " + state["mode"] + " to " + mode + "; previous context remains")
    binary = find_binary()
    required = {"-p", "--output-format", "--print-timeout", "--settings", "--add-dir"}
    if mode == "review" or (mode == "build" and not args.no_sandbox):
        required.add("--sandbox")
    if session:
        required.add("--conversation")
    if model:
        required.add("--model")
    if effort:
        required.add("--effort")
    original = None
    if args.read and args.read != "-":
        original = Path(args.read).expanduser().resolve()
        message = original.read_text(encoding="utf-8")
    else:
        message = sys.stdin.read() if args.read == "-" else args.message
    if not message or not message.strip():
        raise Failure("provide a nonempty message or --read FILE")
    attachments = attachment_inputs(args.attach)
    sources = ([("source brief", original)] if original else []) + [("attachment", x["source"]) for x in attachments]
    protected_targets(args, cwd, sources)
    with tempfile.TemporaryDirectory(prefix="agy-runtime-") as runtime, contextlib.ExitStack() as stack:
        pending_advice = [False]
        stack.callback(lambda: diagnostic(DENIAL_ADVICE) if pending_advice[0] else None)
        run_cwd = cwd
        folder = handoff_dir(cwd)
        mappings = []
        if mode == "review":
            run_cwd = stack.enter_context(snapshot(cwd, args.rev, args.keep_snapshot and not args.dry_run))
            folder = run_cwd.parent / "handoff"
            mappings = review_path_mappings(cwd, args.cwd, run_cwd)
        warn_user_customizations()
        workspace_customization_gate(run_cwd, args.allow_hooks)
        inspect_binary(binary, required)
        listing_data = repository_listing(cwd, [handoff_dir(cwd), state_file(cwd)]) if mode == "consult" else None
        brief, files, listing, rewrites, prepared_message, subject_paths = prepare_handoff(
            message, original, attachments, cwd, folder, mode, mappings, listing_data)
        diagnostic("handoff path rewrites: " + str(rewrites) + " (attachments and repository)")
        if mode == "review":
            validate_snapshot_paths(prepared_message, run_cwd)
        protected_targets(args, cwd, sources + [("prepared brief", brief)] if brief != original else sources)
        if not args.dry_run:
            if args.new and mode != "review":
                clear_handoff(cwd)
                try:
                    state_file(cwd).unlink()
                except FileNotFoundError:
                    pass
            # Briefs can hold what the owner would not publish: the copies are the owner's alone, like the state file.
            folder.mkdir(mode=0o700, parents=True, exist_ok=True)
            for path, data in files.items():
                path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                path.write_bytes(data)
        passed_dirs = list(dirs)
        if str(folder) not in passed_dirs:
            passed_dirs.append(str(folder))
        settings_path = Path(runtime) / "settings.json" if WINDOWS and Path(binary).suffix.lower() in (".cmd", ".bat") else None
        command = make_command(binary, mode, model, effort, session, passed_dirs, args, brief,
                               settings_path, workdir=run_cwd, listing=listing)
        process_argv(command)
        if args.dry_run:
            diagnostic("dry run; no model launched; durable state and handoff are unchanged")
            print(json.dumps({"argv": command, "cwd": str(run_cwd), "stdin": "DEVNULL", "brief": str(brief)}, indent=2))
            return 0
        if mode == "build":
            if args.no_sandbox:
                warning("--no-sandbox: commands and writes run with the user's own rights")
            elif (cwd / ".git").is_file():
                warning("linked worktree .git points outside the workspace; sandbox Git cannot read that directory; use a self-contained clone")
            for added in dirs:
                diagnostic("build shell can write user-added directory: " + added)
        if not session:
            announce_new()
        sinks, excluded, metadata_sinks = [], [state_file(cwd), folder], []
        answer_sink = None
        if args.out:
            output = Path(args.out).expanduser().absolute()
            answer_sink = stack.enter_context(output.open("w", encoding="utf-8"))
            events_path = Path(str(output) + ".events.jsonl")
            sinks.append(stack.enter_context(events_path.open("w", encoding="utf-8")))
            metadata_sinks.append((Path(str(events_path) + ".meta.json"), 0))
            excluded += [output, events_path, Path(str(events_path) + ".meta.json")]
        if args.log:
            log = Path(args.log).expanduser().absolute()
            log_sink = stack.enter_context(log.open("a", encoding="utf-8"))
            sinks.append(log_sink)
            metadata_sinks.append((Path(str(log) + ".meta.json"), log_sink.tell()))
            excluded += [log, Path(str(log) + ".meta.json")]
        non_subject = [str(path) for path in folder.rglob("repository-files.jsonl")]
        metadata = {"brief_path": str(brief), "mode": mode, "expected_session": session,
                    "mcp": args.mcp, "non_subject_paths": non_subject}
        if mode == "review":
            metadata.update(subject_root=str(run_cwd), subject_paths=subject_paths)
        for path, offset in metadata_sinks:
            path.write_text(json.dumps(dict(metadata, start_offset=offset)), encoding="utf-8")
        before = git_status(run_cwd, excluded) if mode == "consult" and listing_data is not None else None
        run = execute(command, run_cwd, args.timeout, sinks, brief)
        run.non_subject_paths = non_subject
        if mode == "review":
            run.subject_root = str(run_cwd)
            run.subject_paths = subject_paths
        actual = run.conversation_id()
        if mode != "review":
            if actual and (not session or actual == session):
                save_state(cwd, actual, mode, model, effort, dirs)
            elif not actual:
                warning("no output conversation id; this turn cannot be saved for resume")
            else:
                warning("unexpected conversation id; saved state was not replaced")
        after = git_status(run_cwd, excluded) if mode == "consult" and listing_data is not None else None
        metadata.update(process_exit=run.code, stderr=run.stderr, timed_out=run.timed_out,
                        git_changed=before != after, git_observable=(mode != "consult" or (before is not None and after is not None)))
        for path, offset in metadata_sinks:
            path.write_text(json.dumps(dict(metadata, start_offset=offset)), encoding="utf-8")
        verdict = judge(run, mode, session, before != after, before is not None and after is not None, args.mcp)
        pending_advice[0] = DENIAL_ADVICE in verdict[1]
        code = report(verdict, advice=False)
        if code and (run.result or {}).get("response") and (args.out or args.log):
            recording = events_path if args.out else log
            diagnostic("answer withheld because the turn failed checks; response is in the result event of " + str(recording))
        if not code:
            emit_answer(run, args, answer_sink)
        return code


# The canary judges matching attempts and resulting files, never the model's prose.
def probe_evidence(run, mode, root, outside, marker):
    tools = run.tools()
    subject = root / "notes.txt"
    tool_target = root / "file-tool-canary.txt"
    shell_target = root / "shell-canary.txt"
    results = {}
    def attempts(name, value):
        return [s for s in tools if tool_name(s) == name and value in json.dumps(parameters(s))]
    def deny_rule(s):
        info = s.get("tool_info", {})
        error = info.get("error", {})
        text = error.get("message", "") if isinstance(error, dict) else str(error)
        return s.get("state") == "ERROR" and "Matches user-configured deny rule" in text
    def all_attempts(items, held):
        if not items:
            return "not attempted"
        return "held" if all(held(s) for s in items) else "NOT HELD"
    reads = [s for s in attempts("read_file", str(subject)) if successful_read(s)]
    results["subject read"] = "held" if reads else ("NOT HELD" if attempts("read_file", str(subject)) else "not attempted")
    writes = attempts("write_file", str(tool_target))
    results["file-tool write deny"] = all_attempts(writes, lambda s: deny_rule(s) and not tool_target.exists())
    commands = attempts("run_command", str(shell_target))
    if mode == "consult":
        results["command deny"] = all_attempts(commands, lambda s: deny_rule(s) and not shell_target.exists())
    else:
        results["inside shell allowed"] = all_attempts(commands, lambda s: s.get("state") == "DONE" and command_exit(s) == 0 and shell_target.exists() and shell_target.read_text(encoding="utf-8").strip() == marker)
        outside_calls = attempts("run_command", str(outside))
        results["outside shell deny"] = all_attempts(outside_calls, lambda s: s.get("state") == "DONE" and command_exit(s) not in (None, 0) and "operation not permitted" in output_text(s).lower() and not outside.exists())
        network = attempts("run_command", "https://example.com")
        results["network deny"] = all_attempts(network, lambda s: s.get("state") == "DONE" and command_exit(s) not in (None, 0) and bool(re.search(r"operation not permitted|permission denied", output_text(s), re.I) or ("sandbox errors" in output_text(s).lower() and re.search(r"could not resolve host|network is unreachable", output_text(s), re.I))))
    return results


def probe(args):
    targets = [("state", state_file(Path(args.cwd).expanduser().resolve()))]
    if args.out:
        output = Path(args.out).expanduser().absolute()
        targets += [("output", output), ("events", Path(str(output) + ".events.jsonl"))]
    if args.log:
        targets.append(("log", Path(args.log).expanduser().absolute()))
    reject_collisions(targets)
    binary = find_binary()
    inspect_binary(binary, ALL_FLAGS)
    diagnostic("probe costs two short model turns; it tests consult denial and review-shaped sandbox behavior")
    with tempfile.TemporaryDirectory(prefix="agy-probe-") as temp, contextlib.ExitStack() as stack:
        state_root = state_file(Path(args.cwd).expanduser().resolve()).parent
        outside = state_root / (".agy-probe-" + uuid.uuid4().hex + ".txt")
        if not args.dry_run:
            state_root.mkdir(parents=True, exist_ok=True)
            def clean_canary():
                try:
                    outside.unlink()
                except FileNotFoundError:
                    pass
            stack.callback(clean_canary)
        parent = Path(temp)
        root = parent / "workspace"
        root.mkdir()
        temp_target = parent / "temp-shell-canary.txt"
        (root / "notes.txt").write_text("synthetic probe subject\n", encoding="utf-8")
        init = git(root, "init")
        if init.returncode:
            raise Failure("cannot initialize probe repository")
        for command in [("add", "notes.txt"), ("-c", "user.name=Probe", "-c", "user.email=probe@example.invalid", "commit", "-m", "probe subject")]:
            if git(root, *command).returncode:
                raise Failure("cannot commit probe subject")
        sinks = []
        if args.log and not args.dry_run:
            sinks.append(stack.enter_context(Path(args.log).expanduser().open("a", encoding="utf-8")))
        if args.out and not args.dry_run:
            sinks.append(stack.enter_context(Path(str(Path(args.out).expanduser()) + ".events.jsonl").open("w", encoding="utf-8")))
        summary = []
        for mode in ("consult", "review"):
            marker = "agy-canary-" + mode
            brief = parent / (mode + "-brief.txt")
            tool_target = root / "file-tool-canary.txt"
            shell_target = root / "shell-canary.txt"
            # This is the sole intentional network request: explicitly opting into
            # --probe authorizes an attempt under the sandbox, without bypassing it.
            commands = [
                "Perform each test once and continue after refusals; never request a bypass or disguise a refused action.",
                "Read " + str(root / "notes.txt") + " using read_file.",
                "Use write_file to write " + marker + " to " + str(tool_target) + ".",
                "Use run_command for this exact command: " + "printf %s " + shlex.quote(marker) + " > " + shlex.quote(str(shell_target)),
            ]
            if mode == "review":
                commands += ["Use run_command once: printf %s " + shlex.quote(marker) + " > " + shlex.quote(str(outside)),
                             "Informational temp-write test; use run_command once: printf %s " + shlex.quote(marker) + " > " + shlex.quote(str(temp_target)),
                             "Use run_command once: curl -sS --connect-timeout 5 --max-time 8 https://example.com -o /dev/null"]
            commands += ["Report each actual tool outcome. Do not substitute a plan or narrative for attempts."]
            brief.write_text("\n".join(commands), encoding="utf-8")
            command = make_command(binary, mode, args.model, args.effort, None, [], args, brief, probing=True)
            # Probe briefs must stay outside the sandbox without adding their parent,
            # which would enlarge its writable roots to include the outside canary.
            # Copy only the brief into a separate, explicitly added read folder.
            prompt_folder = parent / (mode + "-prompt")
            prompt_folder.mkdir()
            prompt = prompt_folder / "brief.txt"
            shutil.copyfile(brief, prompt)
            command = make_command(binary, mode, args.model, args.effort, None, [str(prompt_folder)], args, prompt, probing=True)
            settings_path = prompt_folder / "settings.json" if WINDOWS and Path(binary).suffix.lower() in (".cmd", ".bat") else None
            if settings_path:
                command = make_command(binary, mode, args.model, args.effort, None, [str(prompt_folder)], args, prompt, settings_path, probing=True)
            if args.dry_run:
                print(json.dumps({"mode": mode, "argv": command, "cwd": str(root), "stdin": "DEVNULL"}))
                continue
            announce_new()
            run = execute(command, root, args.timeout, sinks, prompt)
            if mode == "review":
                run.subject_root = str(root)
                run.subject_paths = []
            verdict = judge(run, mode, mcp=False)
            # A tested boundary can be violated while the transport succeeds. Report
            # the canary evidence, then stop on genuine CLI failure before turn two.
            report(verdict, advice=False)
            evidence = probe_evidence(run, mode, root, outside, marker)
            for boundary, outcome in evidence.items():
                line = mode + " " + boundary + ": " + outcome
                diagnostic(line)
                summary.append(line)
            if mode == "review":
                temp_attempts = [step for step in run.tools() if tool_name(step) == "run_command" and str(temp_target) in str(parameters(step).get("CommandLine", ""))]
                landed = temp_target.is_file() and temp_target.read_bytes().strip() == marker.encode("utf-8")
                observed = any(step.get("state") == "DONE" and command_exit(step) == 0 for step in temp_attempts)
                information = "landed" if landed and observed else ("not attempted" if not temp_attempts else "did not land")
                diagnostic("review informational temp write: " + information + " (not a pass/fail condition)")
                summary.append("review informational temp write: " + information)
            for step in run.tools():
                if tool_name(step) not in KNOWN:
                    warning("probe encountered unknown tool " + tool_name(step))
                    summary.append(mode + " unknown tool: NOT HELD")
            if verdict[0] or any(value != "held" for value in evidence.values()):
                if args.out:
                    Path(args.out).expanduser().write_text("\n".join(summary) + "\n", encoding="utf-8")
                if verdict[0] in (1, 3):
                    diagnostic("probe stopped on a failed run")
                if DENIAL_ADVICE in verdict[1]:
                    diagnostic(DENIAL_ADVICE)
                return 1
        if args.dry_run:
            return 0
        if args.out:
            Path(args.out).expanduser().write_text("\n".join(summary) + "\n", encoding="utf-8")
        return 1 if any(("NOT HELD" in line or "not attempted" in line) and not line.startswith("review informational temp write:") for line in summary) else 0


if __name__ == "__main__":
    sys.exit(main())
