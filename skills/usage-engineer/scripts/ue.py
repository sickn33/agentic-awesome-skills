#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""usage-engineer (ue): local, deterministic usage-efficiency helpers for Codex + OpenCode.

Design rules (non-negotiable):
- Read-only toward user data unless a command explicitly writes (prepare-context, summarize-log,
  map, instructions mapping, apply-profile, rollback, bench, audit --json-out).
- Never read or print credentials, cookies, auth tokens, or raw chat text.
- Unknown metric => reported as UNKNOWN (null), never as zero.
- Failures are never hidden; compact views always keep a local full copy and its path.
- No network calls anywhere in this tool.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import io
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

VERSION = "0.3.0"
TOOL_DIR = Path(__file__).resolve().parent
_LEGACY_STATE = TOOL_DIR.parent / "state"  # pre-0.2 checkouts kept state next to ue.py
STATE_DIR = Path(os.environ.get("UE_STATE_DIR")
                 or (_LEGACY_STATE if _LEGACY_STATE.is_dir() else Path.home() / ".usage-engineer"))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HOME = Path.home()
HOME_STR = str(HOME)


def _home_variants() -> list:
    """Every spelling of the home directory that can show up in a path (resolved, Windows 8.3)."""
    variants = {HOME_STR, os.path.realpath(HOME_STR)}
    if os.name == "nt":
        try:
            import ctypes
            buf = ctypes.create_unicode_buffer(32768)
            if ctypes.windll.kernel32.GetShortPathNameW(HOME_STR, buf, len(buf)):
                variants.add(buf.value)
        except Exception:
            pass
    return sorted(variants, key=len, reverse=True)


REDACTIONS = [(v, "%HOME%") for v in _home_variants()]


def redact(text: str) -> str:
    """Remove user-identifying absolute paths from produced reports."""
    out = str(text)
    for needle, repl in REDACTIONS:
        out = out.replace(needle, repl)
        out = out.replace(needle.replace("\\", "/"), repl)
    return out


def now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def stamp() -> str:
    return _dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha256_text(s: str) -> str:
    return sha256_bytes(s.encode("utf-8", errors="replace"))


def sha256_file(p: Path, limit_bytes: int | None = None) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def short_hash(s: str, n: int = 12) -> str:
    return sha256_text(s)[:n]


def read_json(p: Path, default=None):
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return default


def write_json(p: Path, obj) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def write_text(p: Path, s: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")


def codex_home() -> Path:
    env = os.environ.get("CODEX_HOME")
    if env:
        return Path(env)
    return HOME / ".codex"


def opencode_share_dir() -> Path:
    env = os.environ.get("XDG_DATA_HOME")
    if env:
        return Path(env) / "opencode"
    return HOME / ".local" / "share" / "opencode"


def run_git(project: Path, *args: str, timeout: int = 15):
    try:
        r = subprocess.run(
            ["git", "-C", str(project), *args],
            capture_output=True, text=True, timeout=timeout,
            encoding="utf-8", errors="replace",
        )
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except Exception as e:  # git missing or timeout
        return 127, "", f"{type(e).__name__}: {e}"


# --------------------------------------------------------------------------------------
# audit
# --------------------------------------------------------------------------------------

_TOKEN_KEYS = (
    "input_tokens", "cached_input_tokens", "cache_write_input_tokens",
    "output_tokens", "reasoning_output_tokens", "total_tokens",
)

WASTE_CHAR_BUCKETS = (48_000, 100_000, 200_000)  # ~= 12k/25k/50k tokens at 4 chars/token


def _session_date_from_path(p: Path, root: Path) -> str:
    try:
        rel = p.relative_to(root)
        parts = rel.parts
        if len(parts) >= 4 and parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
            return f"{parts[0]}-{parts[1]}-{parts[2]}"
    except Exception:
        pass
    m = re.search(r"rollout-(\d{4}-\d{2}-\d{2})", p.name)
    return m.group(1) if m else "unknown"


def _extract_call_key(payload: dict) -> tuple[str, str] | None:
    """Return (tool_name, normalized_args) for a tool call payload, else None."""
    ptype = payload.get("type", "")
    if ptype not in ("custom_tool_call", "function_call", "local_shell_call"):
        return None
    name = payload.get("name") or payload.get("tool") or ptype
    raw = payload.get("input")
    if raw is None:
        raw = payload.get("arguments")
    if raw is None and ptype == "local_shell_call":
        raw = json.dumps(payload.get("action"), sort_keys=True)
    if isinstance(raw, (dict, list)):
        try:
            raw = json.dumps(raw, sort_keys=True, ensure_ascii=False)
        except Exception:
            raw = str(raw)
    return str(name), str(raw or "")


def _output_size(payload: dict):
    if payload.get("type") not in ("custom_tool_call_output", "function_call_output", "exec_command_end"):
        return None
    out = payload.get("output")
    if out is None:
        out = payload.get("stdout")
        if out is None:
            return None
    if isinstance(out, (dict, list)):
        return len(json.dumps(out, ensure_ascii=False))
    return len(str(out))


def parse_rollout_usage(path: Path, max_file_mb: int = 40) -> dict:
    """Tolerant, streaming parse of one rollout JSONL. Never raises for bad lines."""
    rec = {
        "file": str(path),
        "session_id_hash": short_hash(path.name),
        "date": None,
        "usage": None,
        "requests": 0,
        "parse_errors": 0,
        "oversized": {str(b): 0 for b in WASTE_CHAR_BUCKETS},
        "oversized_chars_total": 0,
        "outputs_total_chars": 0,
        "largest_output_chars": 0,
        "repeated_calls": {},
        "turn_started": 0,
        "turn_completed": 0,
        "errors_seen": 0,
        "skipped_reason": None,
    }
    try:
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > max_file_mb:
            rec["skipped_reason"] = f"file_too_large_mb={size_mb:.1f}"
            return rec
    except OSError as e:
        rec["skipped_reason"] = f"stat_failed: {e}"
        return rec

    call_counts: dict[str, int] = {}
    last_total = None
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if not line:
                    continue
                interesting = ('"token_count"' in line or '"custom_tool_call' in line
                               or '"function_call' in line or '"task_started"' in line
                               or '"task_complete"' in line or '"turn_aborted"' in line
                               or '"stream_error"' in line or '"error"' in line
                               or '"session_meta"' in line)
                if not interesting:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    rec["parse_errors"] += 1
                    continue
                t = obj.get("type")
                p = obj.get("payload") or {}
                if t == "session_meta":
                    rec["date"] = (p.get("timestamp") or obj.get("timestamp") or "")[:10] or rec["date"]
                elif t == "event_msg":
                    ptype = p.get("type")
                    if ptype == "token_count":
                        rec["requests"] += 1
                        info = p.get("info") or {}
                        total = info.get("total_token_usage") or {}
                        if any(k in total for k in _TOKEN_KEYS):
                            last_total = total
                    elif ptype == "task_started":
                        rec["turn_started"] += 1
                    elif ptype == "task_complete":
                        rec["turn_completed"] += 1
                    elif ptype in ("turn_aborted", "stream_error", "error"):
                        rec["errors_seen"] += 1
                elif t == "response_item":
                    ck = _extract_call_key(p)
                    if ck is not None:
                        key = f"{ck[0]}|{short_hash(ck[1], 10)}"
                        call_counts[key] = call_counts.get(key, 0) + 1
                    olen = _output_size(p)
                    if olen is not None:
                        rec["outputs_total_chars"] += olen
                        if olen > rec["largest_output_chars"]:
                            rec["largest_output_chars"] = olen
                        if olen >= WASTE_CHAR_BUCKETS[0]:
                            rec["oversized_chars_total"] += olen
                        for b in WASTE_CHAR_BUCKETS:
                            if olen >= b:
                                rec["oversized"][str(b)] += 1
    except OSError as e:
        rec["skipped_reason"] = f"read_failed: {e}"
        return rec

    if rec["date"] is None:
        rec["date"] = _session_date_from_path(path, path.parents[3] if len(path.parents) > 3 else path.parent)

    if last_total is not None:
        rec["usage"] = {k: last_total.get(k) for k in _TOKEN_KEYS}
        rec["usage_unknown_fields"] = [k for k in _TOKEN_KEYS if last_total.get(k) is None]

    rec["repeated_calls"] = {k: v for k, v in call_counts.items() if v >= 2}
    return rec


def _iter_rollouts(root: Path, since: str | None, max_files: int | None):
    files = []
    for p in root.rglob("rollout-*.jsonl"):
        d = _session_date_from_path(p, root)
        if since and d != "unknown" and d < since:
            continue
        files.append((d, p))
    files.sort()
    if max_files:
        files = files[-max_files:]
    return files


def audit_codex(sessions_root: Path, since: str | None, max_files: int | None,
                max_file_mb: int) -> dict:
    out = {
        "source": redact(str(sessions_root)),
        "generated_at": now_iso(),
        "since": since,
        "files_total": 0,
        "files_skipped": 0,
        "sessions_with_usage": 0,
        "sessions_without_usage": 0,
        "parse_errors_total": 0,
        "usage_totals": {k: 0 for k in _TOKEN_KEYS},
        "requests_total": 0,
        "by_day": {},
        "unknown_fields": set(),
        "oversized_buckets": {str(b): 0 for b in WASTE_CHAR_BUCKETS},
        "oversized_chars_total": 0,
        "outputs_total_chars": 0,
        "largest_output_chars": 0,
        "sessions_with_repeated_calls": 0,
        "top_repeated_calls": {},
        "turns_started": 0,
        "turns_completed": 0,
        "sessions_with_errors": 0,
        "notes": [],
    }
    top_repeats: dict[str, int] = {}
    files = _iter_rollouts(sessions_root, since, max_files)
    for d, p in files:
        rec = parse_rollout_usage(p, max_file_mb=max_file_mb)
        out["files_total"] += 1
        if rec["skipped_reason"]:
            out["files_skipped"] += 1
        out["parse_errors_total"] += rec["parse_errors"]
        out["turns_started"] += rec["turn_started"]
        out["turns_completed"] += rec["turn_completed"]
        if rec["errors_seen"]:
            out["sessions_with_errors"] += 1
        if rec["largest_output_chars"] > out["largest_output_chars"]:
            out["largest_output_chars"] = rec["largest_output_chars"]
        out["oversized_chars_total"] += rec["oversized_chars_total"]
        out["outputs_total_chars"] += rec["outputs_total_chars"]
        for b in WASTE_CHAR_BUCKETS:
            out["oversized_buckets"][str(b)] += rec["oversized"][str(b)]
        if rec["usage"] is None:
            out["sessions_without_usage"] += 1
        else:
            out["sessions_with_usage"] += 1
            out["requests_total"] += rec["requests"]
            for k in _TOKEN_KEYS:
                v = rec["usage"].get(k)
                if v is None:
                    out["unknown_fields"].add(k)
                else:
                    out["usage_totals"][k] += v
            day = out["by_day"].setdefault(rec["date"], {
                **{k: 0 for k in _TOKEN_KEYS}, "sessions": 0, "requests": 0})
            day["sessions"] += 1
            day["requests"] += rec["requests"]
            for k in _TOKEN_KEYS:
                v = rec["usage"].get(k)
                if v is not None:
                    day[k] += v
        if rec["repeated_calls"]:
            out["sessions_with_repeated_calls"] += 1
            for k, v in rec["repeated_calls"].items():
                top_repeats[k] = max(top_repeats.get(k, 0), v)
    out["top_repeated_calls"] = dict(sorted(top_repeats.items(), key=lambda kv: -kv[1])[:10])
    out["unknown_fields"] = sorted(out["unknown_fields"])
    out["turns_incomplete"] = max(0, out["turns_started"] - out["turns_completed"])
    if out["sessions_with_usage"] == 0:
        out["usage_totals"] = {k: None for k in _TOKEN_KEYS}
        out["requests_total"] = None
        out["notes"].append("No session in range had usable token usage; totals are UNKNOWN, not 0.")
    out["cost_usd"] = None
    out["cost_note"] = ("Subscription/auth files do not contain money spent. No pricing table is "
                        "used, so a USD cost estimate is UNKNOWN, not zero.")
    if out["sessions_without_usage"]:
        out["notes"].append(f"{out['sessions_without_usage']} session file(s) had no token_count "
                            "events; they are counted as UNKNOWN usage, not zero.")
    return out


def audit_opencode(db_path: Path) -> dict:
    out = {
        "source": redact(str(db_path)),
        "generated_at": now_iso(),
        "available": False,
        "sessions": 0,
        "usage_totals": {"input": 0, "output": 0, "reasoning": 0,
                         "cache_read": 0, "cache_write": 0},
        "cost_reported_units": 0.0,
        "cost_note": ("Cost values in the OpenCode database are provider-computed estimates; on a "
                      "subscription/plan they are not money spent. Treat as provider unit, not USD."),
        "models": {},
        "unknown_sessions": 0,
    }
    if not db_path.exists():
        out["reason"] = "database not found"
        return out
    try:
        import sqlite3
        uri = "file:" + str(db_path).replace("\\", "/") + "?mode=ro"
        con = sqlite3.connect(uri, uri=True, timeout=5)
        cur = con.cursor()
        rows = cur.execute(
            "SELECT model, tokens_input, tokens_output, tokens_reasoning, "
            "tokens_cache_read, tokens_cache_write, cost FROM session").fetchall()
        for model, ti, to, tr, tcr, tcw, cost in rows:
            out["sessions"] += 1
            if ti is None and to is None:
                out["unknown_sessions"] += 1
                continue
            out["usage_totals"]["input"] += ti or 0
            out["usage_totals"]["output"] += to or 0
            out["usage_totals"]["reasoning"] += tr or 0
            out["usage_totals"]["cache_read"] += tcr or 0
            out["usage_totals"]["cache_write"] += tcw or 0
            try:
                out["cost_reported_units"] += float(cost or 0)
            except Exception:
                pass
            try:
                m = json.loads(model) if isinstance(model, str) else (model or {})
                key = f"{m.get('providerID', '?')}/{m.get('id', '?')}"
            except Exception:
                key = "unknown"
            agg = out["models"].setdefault(key, {"sessions": 0, "input": 0, "output": 0,
                                                 "reasoning": 0, "cache_read": 0})
            agg["sessions"] += 1
            agg["input"] += ti or 0
            agg["output"] += to or 0
            agg["reasoning"] += tr or 0
            agg["cache_read"] += tcr or 0
        out["available"] = True
        con.close()
    except Exception as e:
        out["reason"] = f"{type(e).__name__}: {e}"
    return out


def _fmt_int(n) -> str:
    if n is None:
        return "UNKNOWN"
    return f"{n:,}"


def cmd_audit(args) -> int:
    sessions_root = Path(args.sessions) if args.sessions else codex_home() / "sessions"
    since = args.since
    if since is None and not args.all_time:
        since = (_dt.date.today() - _dt.timedelta(days=args.days)).isoformat()
    report = {
        "tool_version": VERSION,
        "codex_home": redact(str(codex_home())),
        "codex": audit_codex(sessions_root, since, args.max_files, args.max_file_mb),
        "opencode": audit_opencode(opencode_share_dir() / "opencode.db") if not args.no_opencode else None,
        "method_notes": [
            "Session totals are taken from the last cumulative token_count event per rollout, "
            "so cached and non-cached tokens are not double-counted.",
            "Cached input tokens are a provider-defined subset of input; they are reported "
            "separately and never added into input again.",
            "Request count = number of token_count events (one per model call).",
            "Oversized tool output buckets are character thresholds; token equivalents are "
            "ESTIMATED at ~4 chars/token and are heuristic only.",
        ],
    }
    c = report["codex"]
    lines = []
    lines.append(f"=== Codex audit  ({redact(str(sessions_root))}) ===")
    lines.append(f"period: since {c['since'] or 'ALL'} | files scanned: {c['files_total']}"
                 f" | skipped(large): {c['files_skipped']} | parse errors (bad lines): {c['parse_errors_total']}")
    if c["unknown_fields"]:
        lines.append(f"fields missing in some sessions (reported UNKNOWN, not 0): {', '.join(c['unknown_fields'])}")
    lines.append(f"sessions with usage: {c['sessions_with_usage']} | without usable usage: {c['sessions_without_usage']}")
    lines.append(f"requests (model calls): {_fmt_int(c['requests_total'])}")
    u = c["usage_totals"]
    lines.append(f"input (raw): {_fmt_int(u['input_tokens'])} | cached input: {_fmt_int(u['cached_input_tokens'])}"
                 f" | cache write: {_fmt_int(u['cache_write_input_tokens'])}")
    lines.append(f"output: {_fmt_int(u['output_tokens'])} | reasoning output: {_fmt_int(u['reasoning_output_tokens'])}"
                 f" | total: {_fmt_int(u['total_tokens'])}")
    lines.append(f"USD cost: {c['cost_usd'] if c['cost_usd'] is not None else 'UNKNOWN'} "
                 f"(subscription files do not record money spent)")
    lines.append(f"turns started/completed: {c['turns_started']}/{c['turns_completed']}"
                 f" | incomplete: {c['turns_incomplete']} | sessions with error events: {c['sessions_with_errors']}")
    ob = c["oversized_buckets"]
    lines.append("oversized tool outputs (chars): "
                 + " | ".join(f">={k}: {v}" for k, v in ob.items())
                 + f" | largest: {_fmt_int(c['largest_output_chars'])}")
    lines.append(f"tool output chars total: {_fmt_int(c['outputs_total_chars'])}"
                 f" | in oversized outputs (>={WASTE_CHAR_BUCKETS[0]}): {_fmt_int(c['oversized_chars_total'])}"
                 f" (~{c['oversized_chars_total'] // 4:,} tokens ESTIMATED at 4 chars/token)")
    lines.append(f"sessions with repeated identical tool calls: {c['sessions_with_repeated_calls']}")
    for k, v in c["top_repeated_calls"].items():
        name, ahash = k.split("|")
        lines.append(f"  repeat {v}x: {name} args#{ahash}")
    if report["opencode"]:
        o = report["opencode"]
        lines.append("")
        lines.append(f"=== OpenCode audit ({o['source']}) ===")
        if not o["available"]:
            lines.append(f"UNKNOWN: {o.get('reason')}")
        else:
            ou = o["usage_totals"]
            lines.append(f"sessions: {o['sessions']} | unknown-usage sessions: {o['unknown_sessions']}")
            lines.append(f"input: {_fmt_int(ou['input'])} | cache read: {_fmt_int(ou['cache_read'])}"
                         f" | cache write: {_fmt_int(ou['cache_write'])}")
            lines.append(f"output: {_fmt_int(ou['output'])} | reasoning: {_fmt_int(ou['reasoning'])}")
            lines.append(f"provider-computed cost units: {o['cost_reported_units']:.6f} "
                         f"(not money spent on a subscription plan)")
            for m, agg in sorted(o["models"].items()):
                lines.append(f"  model {m}: sessions={agg['sessions']} in={_fmt_int(agg['input'])}"
                             f" cache_read={_fmt_int(agg['cache_read'])} out={_fmt_int(agg['output'])}")
    lines.append("")
    lines.append("guidance: if the same tool call fails twice with identical input, switch to a "
                 "genuinely different approach (different tool/command) instead of repeating it.")
    text = "\n".join(lines)
    print(text)
    if args.json_out:
        # sets are not JSON serializable
        j = json.loads(json.dumps(report, default=str))
        write_json(Path(args.json_out), j)
        print(f"\nJSON written: {args.json_out}")
    return 0


# --------------------------------------------------------------------------------------
# summarize-log
# --------------------------------------------------------------------------------------

FAIL_RE = re.compile(
    r"(?i)(\bfail(?:ed|ure|s)?\b|\berror\b|\bexception\b|traceback|\bfatal\b|\bpanic\b|"
    r"\bassert(?:ion)?\b|exit code[:= ]*[1-9]|exit status[:= ]*[1-9]|returned non-zero|"
    r"\bsegfault\b|\btimeout\b|\brefused\b|\bdenied\b)")
FAILED_UPPER_RE = re.compile(r"\bFAILED\b|\bFAIL\b")
CTX_PREFIX_RE = re.compile(r"^\s*(\$ |> |>>> |\[stderr\]|stderr:|error:|ERROR|FAILED|Process exited)")


def summarize_log_text(text: str, keep_context: int = 3) -> dict:
    raw_lines = text.splitlines()
    total = len(raw_lines)
    failure_idx = []
    for i, ln in enumerate(raw_lines):
        if FAIL_RE.search(ln) or FAILED_UPPER_RE.search(ln):
            failure_idx.append(i)
    keep = set()
    for i in failure_idx:
        for j in range(max(0, i - keep_context), min(total, i + keep_context + 1)):
            keep.add(j)
    kept_sorted = sorted(keep)
    # merge into ranges for readable output
    ranges = []
    for i in kept_sorted:
        if ranges and i == ranges[-1][1] + 1:
            ranges[-1][1] = i
        else:
            ranges.append([i, i])
    omitted = total - len(kept_sorted)
    return {
        "total_lines": total,
        "failure_lines": len(failure_idx),
        "kept_lines": len(kept_sorted),
        "omitted_lines": omitted,
        "ranges": ranges,
        "lines": raw_lines,
        "failure_indexes": failure_idx,
    }


def cmd_summarize(args) -> int:
    src = Path(args.file) if args.file else None
    data: bytes
    if src:
        try:
            data = src.read_bytes()
        except OSError as e:
            print(f"ERROR: cannot read {src}: {e}", file=sys.stderr)
            return 2
    else:
        data = sys.stdin.buffer.read()
        src = Path("stdin")

    outdir = Path(args.out) if args.out else (STATE_DIR / "summaries" / f"{src.stem or 'stdin'}-{stamp()}")
    outdir.mkdir(parents=True, exist_ok=True)
    full_copy = outdir / "full.log"
    full_copy.write_bytes(data)
    original_sha = sha256_bytes(data)

    is_binary = b"\x00" in data[:8192]
    summary_lines = [
        f"# compact view: {redact(str(src))}",
        f"generated: {now_iso()}",
        f"full original: {redact(str(full_copy))}",
        f"sha256(full): {original_sha}",
        f"bytes: {len(data)}",
        "",
    ]
    if is_binary:
        summary_lines += [
            "input looks binary; it was NOT parsed. Full bytes are preserved at the path above.",
            "parse_status: UNKNOWN (binary input)",
        ]
        parse = {"binary": True, "totals": {"lines": None, "failure_lines": None}}
    else:
        text = data.decode("utf-8", errors="replace")
        parse = summarize_log_text(text, keep_context=args.context)
        summary_lines += [
            f"parse_status: ok | lines: {parse['total_lines']} | failure/error lines: {parse['failure_lines']}",
            f"compact view keeps {parse['kept_lines']} lines (+/-{args.context} context around every failure); "
            f"omitted from THIS view: {parse['omitted_lines']} lines. Nothing is omitted from the full copy.",
            "",
            "## FAILURES & ERRORS (retained, with context)",
        ]
        shown = parse["ranges"]
        for a, b in shown:
            for i in range(a, b + 1):
                summary_lines.append(parse["lines"][i])
            summary_lines.append("  --")
        if not parse["failure_indexes"]:
            summary_lines.append("(no failure/error patterns matched; this does not prove success)")
        tail_n = min(args.tail, parse["total_lines"])
        if tail_n:
            summary_lines.append("")
            summary_lines.append(f"## LAST {tail_n} LINES")
            summary_lines.extend(parse["lines"][-tail_n:])
    summary_lines.append("")
    summary_lines.append("note: this view is a reading aid. The complete original output (unmodified) "
                         "is stored at the path above; consult it for anything not shown here.")
    summary_path = outdir / "summary.md"
    write_text(summary_path, "\n".join(summary_lines))

    console = "\n".join(summary_lines)
    if args.max_console_lines and len(summary_lines) > args.max_console_lines:
        head = summary_lines[: args.max_console_lines]
        console = "\n".join(head) + (f"\n... ({len(summary_lines) - args.max_console_lines} more lines "
                                     f"in {redact(str(summary_path))}; full copy: {redact(str(full_copy))})")
    print(console)
    if args.json_out:
        write_json(Path(args.json_out), {
            "source": redact(str(src)),
            "full_copy": redact(str(full_copy)),
            "summary": redact(str(summary_path)),
            "sha256_full": original_sha,
            "bytes": len(data),
            "parse": {k: v for k, v in parse.items() if k not in ("lines", "ranges")},
        })
    return 0


# --------------------------------------------------------------------------------------
# prepare-context
# --------------------------------------------------------------------------------------

def _git_snapshot(project: Path) -> dict:
    out = {"available": False, "commit": None, "branch": None, "dirty_files": None,
           "diff_sha256": None, "dirty_unknown": False}
    rc, head, _ = run_git(project, "rev-parse", "HEAD")
    if rc != 0:
        return out
    out["available"] = True
    out["commit"] = head
    rc, br, _ = run_git(project, "rev-parse", "--abbrev-ref", "HEAD")
    out["branch"] = br if rc == 0 else None
    rc, status, _ = run_git(project, "status", "--porcelain")
    if rc == 0:
        files = [l[3:] for l in status.splitlines() if l.strip()]
        out["dirty_files"] = files
    else:
        out["dirty_unknown"] = True
    rc, diff, _ = run_git(project, "diff", "HEAD", timeout=30)
    if rc == 0 and diff:
        out["diff_sha256"] = sha256_text(diff)
    return out


def build_context_pack(project: Path, task: str, constraints: list[str],
                       verify: list[str], relevant: list[Path], out_path: Path,
                       max_list: int = 60) -> Path:
    snap = _git_snapshot(project)
    rows = []
    for p in relevant[:max_list]:
        p = Path(p)
        ap = (project / p) if not p.is_absolute() else p
        exists = ap.exists()
        size = ap.stat().st_size if exists and ap.is_file() else None
        fhash = sha256_file(ap) if exists and ap.is_file() and size is not None and size <= 5_000_000 else None
        rows.append({"path": str(p).replace("\\", "/"), "exists": exists,
                     "bytes": size, "sha256": fhash})
    md = io.StringIO()
    md.write(f"# Context pack\n\ngenerated: {now_iso()}\n\n")
    md.write("## Task request (verbatim)\n\n")
    md.write(task.strip() + "\n\n")
    md.write("## Constraints\n\n")
    if constraints:
        for c in constraints:
            md.write(f"- {c}\n")
    else:
        md.write("- (none supplied; do not invent scope)\n")
    md.write("\n## Repository identity\n\n")
    md.write(f"- project: `{redact(str(project))}`\n")
    if snap["available"]:
        md.write(f"- git commit: `{snap['commit']}`\n- branch: `{snap['branch']}`\n")
        dirty = snap["dirty_files"]
        md.write(f"- working tree dirty files: {len(dirty) if dirty is not None else 'UNKNOWN'}\n")
        if dirty:
            for f in dirty[:20]:
                md.write(f"  - `{f}`\n")
        md.write(f"- diff hash (HEAD vs worktree): `{snap['diff_sha256'] or 'none'}`\n")
    else:
        md.write("- git identity: UNKNOWN (not a git repository or git unavailable)\n")
    md.write("\n## Relevant paths (existence + hashes; contents read on demand)\n\n")
    if rows:
        md.write("| path | exists | bytes | sha256 |\n|---|---|---|---|\n")
        for r in rows:
            md.write(f"| `{r['path']}` | {r['exists']} | {r['bytes'] if r['bytes'] is not None else ''} "
                     f"| {r['sha256'][:16] + '...' if r['sha256'] else ''} |\n")
    else:
        md.write("- none supplied; discover with git status/diff and targeted search first.\n")
    md.write("\n## Verification commands (run and report actual results)\n\n")
    if verify:
        for v in verify:
            md.write(f"- `{v}`\n")
    else:
        md.write("- UNKNOWN: define the smallest meaningful checks before declaring success.\n")
    md.write("\n## Rules for this pack\n\n")
    md.write("- This pack narrows the starting point, it does not limit correctness: widen inspection "
             "whenever the evidence requires it.\n")
    md.write("- Requirements, acceptance criteria, security, and required tests are unchanged by "
             "using this pack.\n")
    md.write("- Never claim a check passed unless it was actually run; keep failure output reachable "
             "(full log path).\n")
    write_text(out_path, md.getvalue())
    meta = {
        "tool": f"ue {VERSION}",
        "generated_at": now_iso(),
        "project": redact(str(project)),
        "task_sha256": sha256_text(task),
        "constraints": constraints,
        "verify": verify,
        "git": snap,
        "paths": rows,
    }
    write_json(out_path.with_suffix(".json"), meta)
    return out_path


def cmd_prepare_context(args) -> int:
    project = Path(args.project).resolve()
    if not project.is_dir():
        print(f"ERROR: project not found: {project}", file=sys.stderr)
        return 2
    if args.request_file:
        task = Path(args.request_file).read_text(encoding="utf-8", errors="replace")
    elif args.task:
        task = args.task
    elif not sys.stdin.isatty():
        task = sys.stdin.read()
    else:
        print("ERROR: provide --task or --request-file", file=sys.stderr)
        return 2
    relevant = args.relevant or []
    if not relevant:
        snap = _git_snapshot(project)
        relevant = snap.get("dirty_files") or []
    out = Path(args.out) if args.out else (project / ".ue" / f"context-pack-{stamp()}.md")
    try:
        p = build_context_pack(project, task, args.constraint or [], args.verify or [],
                               relevant, out, max_list=args.max_list)
    except OSError as e:
        print(f"ERROR: cannot write context pack: {e}", file=sys.stderr)
        return 2
    print(f"context pack written: {redact(str(p))}")
    print(f"machine-readable identity: {redact(str(p.with_suffix('.json')))}")
    return 0


# --------------------------------------------------------------------------------------
# project map (versioned; invalidates on change)
# --------------------------------------------------------------------------------------

MAP_EXCLUDES = {".git", "node_modules", "dist", "build", "out", ".next", "__pycache__",
                ".venv", "venv", "target", "coverage", ".turbo", ".cache", ".ue"}


def build_map(project: Path, max_files: int = 4000, hash_max_bytes: int = 512_000) -> dict:
    files = []
    truncated = False
    for p in project.rglob("*"):
        if any(part in MAP_EXCLUDES for part in p.parts):
            continue
        if not p.is_file():
            continue
        try:
            st = p.stat()
        except OSError:
            continue
        rel = str(p.relative_to(project)).replace("\\", "/")
        entry = {"path": rel, "bytes": st.st_size, "mtime_ns": st.st_mtime_ns}
        if st.st_size <= hash_max_bytes:
            try:
                entry["sha256"] = sha256_file(p)
            except OSError:
                entry["sha256"] = None
        else:
            entry["sha256"] = None
            entry["hash_skipped"] = True
        files.append(entry)
        if len(files) >= max_files:
            truncated = True
            break
    files.sort(key=lambda e: e["path"])
    snap = _git_snapshot(project)
    return {
        "tool": f"ue {VERSION}",
        "created_at": now_iso(),
        "project": redact(str(project)),
        "truncated": truncated,
        "file_count": len(files),
        "git": snap,
        "files": files,
    }


def check_map(project: Path, map_obj: dict) -> dict:
    old = {e["path"]: e for e in map_obj.get("files", [])}
    new = {e["path"]: e for e in build_map(project, max_files=max(len(old) + 1000, 4000))["files"]}
    changed, added, removed, meta_only = [], [], [], []
    for rel, ne in new.items():
        oe = old.get(rel)
        if oe is None:
            added.append(rel)
        elif oe.get("sha256") is not None and ne.get("sha256") is not None:
            if oe["sha256"] != ne["sha256"]:
                changed.append(rel)
        else:
            if oe["bytes"] != ne["bytes"] or oe["mtime_ns"] != ne["mtime_ns"]:
                meta_only.append(rel)
    for rel in old:
        if rel not in new:
            removed.append(rel)
    current_git = _git_snapshot(project)
    git_changed = (map_obj.get("git", {}).get("commit") != current_git.get("commit"))
    stale = bool(changed or added or removed or meta_only or git_changed)
    return {
        "stale": stale,
        "changed": sorted(changed),
        "added": sorted(added),
        "removed": sorted(removed),
        "changed_unhashed": sorted(meta_only),
        "git_head_changed": git_changed,
    }


def cmd_map(args) -> int:
    project = Path(args.project).resolve()
    if not project.is_dir():
        print(f"ERROR: project not found: {project}", file=sys.stderr)
        return 2
    if args.map_command == "build":
        m = build_map(project, max_files=args.max_files)
        out = Path(args.out) if args.out else (STATE_DIR / "maps"
                                               / f"{project.name}-{short_hash(str(project), 8)}.json")
        write_json(out, m)
        print(f"map written: {redact(str(out))} ({m['file_count']} files"
              f"{', TRUNCATED' if m['truncated'] else ''})")
        print(f"map id: {short_hash(json.dumps(m, sort_keys=True), 16)} | git: "
              f"{m['git'].get('commit', 'UNKNOWN')[:12] if m['git'].get('commit') else 'UNKNOWN'}")
        return 0
    if args.map_command == "check":
        if not args.map:
            print("ERROR: map check needs --map FILE", file=sys.stderr)
            return 2
        m = read_json(Path(args.map))
        if not m:
            print(f"ERROR: cannot read map file: {args.map}", file=sys.stderr)
            return 2
        res = check_map(project, m)
        if res["stale"]:
            print("STALE: the map does not describe the current project state.")
            for k in ("changed", "added", "removed", "changed_unhashed"):
                if res[k]:
                    print(f"  {k} ({len(res[k])}): " + ", ".join(res[k][:20])
                          + (" ..." if len(res[k]) > 20 else ""))
            if res["git_head_changed"]:
                print("  git HEAD changed since map was built.")
            print("Do not trust resume assumptions from this map; re-scan the listed files.")
            return 1
        print("FRESH: map matches current project state (hashed files + git HEAD).")
        return 0
    print("ERROR: unknown map subcommand", file=sys.stderr)
    return 2


# --------------------------------------------------------------------------------------
# instructions
# --------------------------------------------------------------------------------------

def collect_instruction_files(paths: list[Path]) -> list[dict]:
    out = []
    for p in paths:
        if p.is_dir():
            candidates = [p / "AGENTS.md", p / ".codex" / "AGENTS.md",
                          HOME / ".codex" / "AGENTS.md" if p == HOME else None]
            files = [c for c in candidates if c and c.exists()]
        elif p.exists():
            files = [p]
        else:
            files = []
        for f in files:
            text = f.read_text(encoding="utf-8", errors="replace")
            paras = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
            out.append({
                "file": redact(str(f)),
                "bytes": f.stat().st_size,
                "lines": text.count("\n") + 1,
                "sha256": sha256_text(text),
                "paragraphs": [{"sha256": sha256_text(pp), "text": pp} for pp in paras],
            })
    return out


def cmd_instructions(args) -> int:
    paths = [Path(p) for p in args.files]
    if args.project:
        paths.insert(0, Path(args.project))
    if not paths:
        paths = [Path.cwd()]
    inv = collect_instruction_files(paths)
    if not inv:
        print("UNKNOWN: no instruction files found for the given paths.")
        return 0
    if args.instructions_command == "scan":
        print("instruction files (no content printed):")
        for x in inv:
            print(f"  {x['file']}: {x['bytes']} bytes, {x['lines']} lines, "
                  f"{len(x['paragraphs'])} paragraphs, sha256 {x['sha256'][:16]}")
        if args.json_out:
            write_json(Path(args.json_out), [
                {k: v for k, v in x.items() if k != "paragraphs"} for x in inv])
        return 0
    if args.instructions_command == "duplicates":
        seen: dict[str, list[tuple[str, str]]] = {}
        for x in inv:
            for pp in x["paragraphs"]:
                seen.setdefault(pp["sha256"], []).append((x["file"], pp["text"]))
        dupes = {h: v for h, v in seen.items() if len(v) > 1}
        report = {
            "tool": f"ue {VERSION}",
            "generated_at": now_iso(),
            "files": [x["file"] for x in inv],
            "total_paragraphs": sum(len(x["paragraphs"]) for x in inv),
            "unique_paragraphs": len(seen),
            "duplicate_groups": [
                {"sha256": h, "count": len(v),
                 "files": sorted({f for f, _ in v}),
                 "preview": (v[0][1][:160].replace("\n", " ") + ("..." if len(v[0][1]) > 160 else ""))}
                for h, v in sorted(dupes.items(), key=lambda kv: -len(kv[1]))
            ],
            "retained_mapping": [
                {"file": x["file"], "paragraph_hashes": [pp["sha256"] for pp in x["paragraphs"]]}
                for x in inv
            ],
            "policy": ("duplicates are redundant copies of the same rule. Removing NONE is automatic; "
                       "this report only proves which rules exist where. If a human dedupes, at least one "
                       "copy of every unique paragraph hash must remain."),
        }
        print(f"{len(inv)} file(s), {report['total_paragraphs']} paragraphs, "
              f"{len(seen)} unique, {len(dupes)} duplicated across files.")
        for d in report["duplicate_groups"]:
            print(f"  dup x{d['count']}: {d['sha256'][:12]} files={d['files']} preview={d['preview']!r}")
        if args.json_out:
            write_json(Path(args.json_out), report)
            print(f"mapping written: {args.json_out}")
        return 0
    if args.instructions_command == "verify":
        if not args.manifest:
            print("ERROR: verify needs --manifest FILE "
                  "(JSON list of {id, sha256|text} mandatory rules)", file=sys.stderr)
            return 2
        manifest = read_json(Path(args.manifest))
        if not isinstance(manifest, list):
            print("ERROR: manifest must be a JSON list", file=sys.stderr)
            return 2
        present = set()
        for x in inv:
            present.add(x["sha256"])
            for pp in x["paragraphs"]:
                present.add(pp["sha256"])
            text = " ".join(pp["text"] for pp in x["paragraphs"])
            present.add(sha256_text(text))
        missing = []
        for rule in manifest:
            rid = rule.get("id") or "?"
            found = False
            if rule.get("sha256") and rule["sha256"] in present:
                found = True
            if not found and rule.get("text"):
                needle = rule["text"].strip()
                for x in inv:
                    joined = "\n\n".join(pp["text"] for pp in x["paragraphs"])
                    if needle in joined:
                        found = True
                        break
            if not found:
                missing.append(rid)
        if missing:
            print(f"VERIFY FAILED: {len(missing)} mandatory rule(s) missing: {', '.join(missing)}")
            return 1
        print(f"VERIFY OK: all {len(manifest)} mandatory rules are present in the checked file set.")
        return 0
    print("ERROR: unknown instructions subcommand", file=sys.stderr)
    return 2


# --------------------------------------------------------------------------------------
# compare
# --------------------------------------------------------------------------------------

def _accept_identity(case: dict) -> str:
    return sha256_text(json.dumps({
        "id": case.get("id"),
        "accept_cmd": case.get("accept_cmd"),
        "accept_id": case.get("accept_id"),
    }, sort_keys=True))


def cmd_compare(args) -> int:
    a = read_json(Path(args.a))
    b = read_json(Path(args.b))
    if not a or not b:
        print("ERROR: cannot read one of the run records", file=sys.stderr)
        return 2
    ca = {c["id"]: c for c in a.get("cases", [])}
    cb = {c["id"]: c for c in b.get("cases", [])}
    if set(ca) != set(cb):
        print("NOT COMPARABLE: different case sets between the two records.")
        print(f"  only in A: {sorted(set(ca) - set(cb))}")
        print(f"  only in B: {sorted(set(cb) - set(ca))}")
        return 2
    mismatched = [cid for cid in ca if _accept_identity(ca[cid]) != _accept_identity(cb[cid])]
    if mismatched:
        print("NOT COMPARABLE: acceptance checks differ for cases: " + ", ".join(mismatched))
        return 2

    print(f"A = {a.get('variant', '?')} ({args.a})")
    print(f"B = {b.get('variant', '?')} ({args.b})")
    print(f"cases: {len(ca)} | model: {a.get('meta', {}).get('model', 'UNKNOWN')} vs "
          f"{b.get('meta', {}).get('model', 'UNKNOWN')}")
    print("")
    rows = []
    any_quality_regression = False
    comparable_metrics = []
    for cid in sorted(ca):
        ra, rb = ca[cid], cb[cid]
        pa, pb = bool(ra.get("accept_pass")), bool(rb.get("accept_pass"))
        ua, ub = ra.get("usage") or {}, rb.get("usage") or {}
        d = {}
        for k in ("input", "cached", "output", "reasoning", "total", "requests"):
            va, vb = ua.get(k), ub.get(k)
            d[k] = (vb - va) if (isinstance(va, int) and isinstance(vb, int)) else None
        quality = "OK"
        if pa and not pb:
            quality = "QUALITY REGRESSION (pass -> fail)"
            any_quality_regression = True
        elif not pa and pb:
            quality = "B fixes a failure A had"
        elif not pa and not pb:
            quality = "UNRESOLVED in both (cannot count as savings)"
        if pa and pb and d["total"] is not None:
            comparable_metrics.append((cid, d))
        rows.append((cid, pa, pb, d, quality))
        print(f"[{cid}] A_pass={pa} B_pass={pb} | {quality}")
        print(f"   delta (B-A): input={d['input']} cached={d['cached']} output={d['output']} "
              f"reasoning={d['reasoning']} total={d['total']} requests={d['requests']}")
    print("")
    if comparable_metrics:
        tot = sum(d["total"] for _, d in comparable_metrics if d["total"] is not None)
        n = len(comparable_metrics)
        print(f"both-passing cases: {n} | sum total token delta (B-A): {tot:,} "
              f"(negative = B used fewer). PRELIMINARY: small n, no causal proof.")
    else:
        print("no case passed in both variants: efficiency UNMEASURED (failed/unfinished work "
              "cannot count as savings).")
    if any_quality_regression:
        print("RESULT: B is NOT acceptable: at least one task regressed on acceptance.")
        return 1
    print("RESULT: no acceptance regressions detected in this sample. Efficiency conclusion is "
          "UNMEASURED unless both-passing deltas are present and the sample is representative.")
    return 0


# --------------------------------------------------------------------------------------
# apply-profile / rollback
# --------------------------------------------------------------------------------------

REGISTRY = STATE_DIR / "applied.json"


def _registry() -> dict:
    return read_json(REGISTRY, {}) or {}


def _save_registry(r: dict) -> None:
    write_json(REGISTRY, r)


def _target_key(target: str, dest: Path) -> str:
    return f"{target}:{dest}"


def cmd_apply_profile(args) -> int:
    if args.target == "codex":
        src = Path(args.source) if args.source else TOOL_DIR / "profiles" / "codex" / "usage-efficient.config.toml"
        dest = codex_home() / "usage-efficient.config.toml"
    elif args.target == "opencode-project":
        if not args.project:
            print("ERROR: --project is required for opencode-project", file=sys.stderr)
            return 2
        project = Path(args.project).resolve()
        src = Path(args.source) if args.source else TOOL_DIR / "profiles" / "opencode" / "usage-engineer.md"
        dest = project / "opencode.json"
        if dest.exists() and f"opencode-project:{dest}" not in _registry():
            print(f"CONFLICT: {dest} already exists and was not created by ue. "
                  "Refusing to overwrite. Merge manually or pick another project.", file=sys.stderr)
            return 3
    elif args.target == "opencode-global":
        print("REFUSED: ue never hot-edits the shared global OpenCode config while other agents may "
              "depend on it. Use opencode-project, or add the instructions path manually.",
              file=sys.stderr)
        return 3
    else:
        print(f"ERROR: unknown target {args.target}", file=sys.stderr)
        return 2

    if not src.exists():
        print(f"ERROR: profile source missing: {src}", file=sys.stderr)
        return 2
    reg = _registry()
    key = _target_key(args.target, dest)
    if key in reg:
        print(f"NOTE: {dest} is already managed by ue. Re-applying will refresh it (rollback stays "
              "possible to the original backup).")
    backup = None
    if dest.exists():
        backup = STATE_DIR / "backups" / f"{dest.name}-{stamp()}"
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dest, backup)
    payload = src.read_bytes()
    if args.target == "opencode-project":
        doc = {
            "$schema": "https://opencode.ai/config.json",
            "instructions": [str(src).replace("\\", "/")],
        }
        dest.parent.mkdir(parents=True, exist_ok=True)
        write_text(dest, json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(payload)
    sha = sha256_file(dest)
    reg[key] = {
        "target": args.target,
        "dest": str(dest),
        "source": str(src),
        "sha_applied": sha,
        "backup": str(backup) if backup else None,
        "applied_at": now_iso(),
        "note": ("codex: activate with `codex --profile usage-efficient`; it layers on top of your "
                 "config and changes no model/effort values."
                 if args.target == "codex" else
                 "opencode reads project opencode.json automatically for that project."),
    }
    _save_registry(reg)
    print(f"applied: {redact(str(dest))}")
    print(f"sha256: {sha}")
    if backup:
        print(f"backup: {redact(str(backup))}")
    print(reg[key]["note"])
    return 0


def cmd_rollback(args) -> int:
    reg = _registry()
    matches = [k for k, v in reg.items() if v["target"] == args.target]
    if args.project:
        matches = [k for k in matches if str(Path(args.project).resolve()) in k]
    if not matches:
        print(f"nothing to roll back for target {args.target}" + (f" project {args.project}" if args.project else ""))
        return 0
    key = matches[-1]
    entry = reg[key]
    dest = Path(entry["dest"])
    if not dest.exists():
        print(f"dest missing, removing registry entry: {dest}")
        del reg[key]
        _save_registry(reg)
        return 0
    current = sha256_file(dest)
    if current != entry["sha_applied"] and not args.force:
        print(f"CONFLICT: {dest} was modified after apply (sha256 changed). Refusing to overwrite "
              "later edits. Re-run with --force only if you are sure.", file=sys.stderr)
        return 3
    backup = Path(entry["backup"]) if entry.get("backup") else None
    if backup and backup.exists():
        shutil.copy2(backup, dest)
        print(f"restored original into {redact(str(dest))} (sha256 {sha256_file(dest)})")
    else:
        dest.unlink()
        print(f"removed {redact(str(dest))} (it did not exist before apply)")
    del reg[key]
    _save_registry(reg)
    return 0


# --------------------------------------------------------------------------------------
# bench
# --------------------------------------------------------------------------------------

def _bench_cases() -> dict:
    p = TOOL_DIR / "benchmarks" / "cases.json"
    return read_json(p, {"version": 1, "cases": [], "variants": {}})


def _run_accept(case: dict, workdir: Path, timeout: int = 300) -> dict:
    cmd = case.get("accept_cmd")
    if not cmd:
        return {"pass": None, "reason": "no accept_cmd defined", "exit_code": None, "output_tail": ""}
    fixture = (TOOL_DIR / "benchmarks" / case["fixture"]).resolve()
    cmd = cmd.replace("{FIXTURE}", str(fixture))
    argv = shlex.split(cmd, posix=os.name != "nt")
    if not argv:
        return {"pass": False, "exit_code": None, "reason": "empty accept_cmd", "output_tail": ""}
    try:
        r = subprocess.run(argv, cwd=str(workdir), capture_output=True, text=True, shell=False,
                           timeout=timeout, encoding="utf-8", errors="replace")
        expected = case.get("accept_expect_exit", 0)
        ok = (r.returncode == expected)
        out = (r.stdout or "") + (r.stderr or "")
        return {"pass": ok, "exit_code": r.returncode, "expected_exit": expected,
                "output_tail": out[-4000:]}
    except subprocess.TimeoutExpired:
        return {"pass": False, "exit_code": None, "reason": "timeout", "output_tail": ""}
    except Exception as e:
        return {"pass": False, "exit_code": None, "reason": str(e), "output_tail": ""}


def _prep_workdir(case: dict, tag: str) -> Path:
    fixture = (TOOL_DIR / "benchmarks" / case["fixture"]).resolve()
    if not fixture.is_dir():
        raise FileNotFoundError(f"fixture missing: {fixture}")
    tmp = Path(tempfile.mkdtemp(prefix=f"ue-{case['id']}-{tag}-"))
    shutil.copytree(fixture, tmp, dirs_exist_ok=True)
    # Never leak the solution / acceptance internals into the agent's workspace.
    for junk in ("solution", "buggy", "checksums.json", "accept.py"):
        p = tmp / junk
        if p.is_dir():
            shutil.rmtree(p)
        elif p.exists():
            p.unlink()
    return tmp


def cmd_bench(args) -> int:
    data = _bench_cases()
    cases = {c["id"]: c for c in data.get("cases", [])}
    variants = data.get("variants", {})
    if args.bench_command == "list":
        print("benchmark cases (acceptance checks are frozen in cases.json):")
        for cid, c in cases.items():
            print(f"  {cid}: {c.get('title', '')} | accept: {c.get('accept_cmd')}")
        print("variants: " + ", ".join(f"{k}={v.get('name', k)}" for k, v in variants.items()))
        return 0
    if args.bench_command == "plan":
        selected = [args.case] if args.case else sorted(cases)
        vsel = [args.variant] if args.variant else sorted(variants)
        calls = len(selected) * len(vsel)
        print(f"planned model invocations: {calls} (one per case x variant, no automatic retries)")
        for cid in selected:
            if cid not in cases:
                print(f"ERROR: unknown case {cid}", file=sys.stderr)
                return 2
            for v in vsel:
                if v not in variants:
                    print(f"ERROR: unknown variant {v}", file=sys.stderr)
                    return 2
                print(f"  {cid} / {v}: {_variant_cmd_preview(cases[cid], variants[v])}")
        print("")
        print("SPEND NOTE: this is a ChatGPT subscription surface. ue can only cap the NUMBER of "
              "invocations (--max-calls); it cannot enforce a token or money cap. Watch usage in Codex.")
        print("Cache note: each fresh isolated copy starts cold; cached-input readings are not "
              "comparable across first runs.")
        return 0
    if args.bench_command in ("run", "run-all"):
        if not args.case and args.bench_command == "run":
            print("ERROR: --case required (or use bench run-all)", file=sys.stderr)
            return 2
        selected = [args.case] if args.bench_command == "run" else sorted(cases)
        vsel = [args.variant] if args.variant else sorted(variants)
        calls = len(selected) * len(vsel)
        if args.max_calls is None:
            print("ERROR: --max-calls is required. It is the hard cap on model invocations for this "
                  "bench run (no automatic retries, no fallback billing).", file=sys.stderr)
            return 2
        if calls > args.max_calls:
            print(f"REFUSED: planned {calls} invocations > --max-calls {args.max_calls}.")
            return 2
        if not args.confirm:
            print(f"DRY-RUN (no model was called). Would run {calls} invocation(s):")
            for cid in selected:
                for v in vsel:
                    print(f"  {cid} / {v}: {_variant_cmd_preview(cases[cid], variants[v])}")
            print("Re-run with --confirm to execute. NOTE: subscription quota cannot be capped by "
                  "this tool; it only limits invocation count.")
            return 0
        if args.runner not in ("fake", "codex", "opencode"):
            print("ERROR: --runner must be fake|codex|opencode", file=sys.stderr)
            return 2
        results_dir = Path(args.out) if args.out else (STATE_DIR / "bench-runs")
        results_dir.mkdir(parents=True, exist_ok=True)
        summary = {"variant": ",".join(vsel), "runner": args.runner, "started_at": now_iso(),
                   "meta": {"model": args.model or "config-default",
                            "reasoning": args.reasoning or "config-default",
                            "note": "recorded for compare; same settings must be used for A and B"},
                   "cases": []}
        runner_failures = 0
        for cid in selected:
            case = cases[cid]
            for v in vsel:
                tag = f"{cid}-{v}"
                print(f"[{tag}] preparing isolated copy...")
                try:
                    wd = _prep_workdir(case, v)
                except Exception as e:
                    print(f"[{tag}] ERROR: {e}")
                    summary["cases"].append({"id": cid, "variant": v, "accept_pass": False,
                                             "error": str(e)})
                    continue
                pre = _run_accept(case, wd)
                print(f"[{tag}] pre-check accept_pass={pre['pass']} (expected pre-state per case)")
                usage = None
                wall = None
                if args.runner == "fake":
                    sol = (TOOL_DIR / "benchmarks" / case["fixture"] / "solution").resolve()
                    if sol.is_dir():
                        _copy_solution(sol, wd)
                    model_note = "fake runner: applies fixtures solution/ deterministically. NOT a model measurement."
                else:
                    t0 = time.time()
                    usage, err = _run_model(args, case, variants[v], wd)
                    wall = round(time.time() - t0, 1)
                    model_note = err or "executed"
                    if err and err.startswith("RUNNER FAILED"):
                        runner_failures += 1
                        print(f"[{tag}] {err}")
                post = _run_accept(case, wd)
                print(f"[{tag}] post-check accept_pass={post['pass']} | usage="
                      f"{json.dumps(usage) if usage else 'UNMEASURED'} | wall={wall}")
                rec = {
                    "id": cid, "variant": v,
                    "accept_cmd": case.get("accept_cmd"),
                    "accept_id": _accept_identity(case),
                    "accept_pass": post["pass"],
                    "accept_exit": post.get("exit_code"),
                    "accept_output_tail": post.get("output_tail", "")[-1500:],
                    "pre_accept_pass": pre.get("pass"),
                    "usage": usage,
                    "wall_s": wall,
                    "note": model_note,
                    "workdir": redact(str(wd)),
                }
                summary["cases"].append(rec)
                write_json(results_dir / f"{stamp()}-{tag}.json",
                           {"variant": v, "cases": [rec], "meta": summary["meta"]})
        write_json(results_dir / f"{stamp()}-summary.json", summary)
        print(f"summary: {redact(str(results_dir))}")
        if runner_failures:
            print(f"ERROR: {runner_failures} run(s) failed before the agent did any work; "
                  "these records are not measurements.", file=sys.stderr)
            return 1
        print("Next: ue compare --a <recordA.json> --b <recordB.json>")
        return 0
    print("ERROR: unknown bench subcommand", file=sys.stderr)
    return 2


def _copy_solution(sol: Path, wd: Path) -> None:
    for root, _dirs, files in os.walk(sol):
        for fn in files:
            s = Path(root) / fn
            rel = s.relative_to(sol)
            d = wd / rel
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(s, d)


def _variant_cmd_preview(case: dict, variant: dict) -> str:
    vargs = " ".join(variant.get("args", []))
    return (f"codex exec --json --skip-git-repo-check -C <isolated copy> -s workspace-write {vargs} "
            f"\"{case.get('prompt', '')[:60]}...\"")


def _run_model(args, case: dict, variant: dict, wd: Path):
    if args.runner == "codex":
        exe = shutil.which("codex") or "codex"
        cmd = [exe, "exec", "--json", "--skip-git-repo-check", "-C", str(wd), "-s", "workspace-write"]
        if args.model:
            cmd += ["-m", args.model]
        if args.reasoning:
            cmd += ["-c", f'model_reasoning_effort="{args.reasoning}"']
        if variant.get("profile"):
            cmd += ["-p", variant["profile"]]
        cmd += variant.get("args", [])
        prompt = case.get("prompt", "")
        if variant.get("prep_context"):
            pack = wd / ".ue-context-pack.md"
            build_context_pack(wd, prompt, [], [], [], pack)
            prompt = f"Read {pack.name} first, then do the task.\n\n{prompt}"
        cmd += [prompt]
    elif args.runner == "opencode":
        exe = shutil.which("opencode") or shutil.which("opencode.cmd") or shutil.which("opencode.exe")
        if not exe:
            return None, "opencode executable not found on PATH"
        cmd = [exe, "run", "--format", "json", "--dir", str(wd)]
        if not args.allow_permissions:
            return None, ("opencode runner needs --allow-permissions (adds --auto); refused by default "
                          "to keep the quality contract")
        cmd += ["--auto"]
        if args.model:
            cmd += ["-m", args.model]
        if args.reasoning:
            cmd += ["--variant", args.reasoning]
        cmd += variant.get("args", [])
        cmd += [case.get("prompt", "")]
    else:
        return None, "unknown runner"
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=args.timeout,
                           encoding="utf-8", errors="replace", cwd=str(wd),
                           stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired:
        return None, f"timeout after {args.timeout}s (turn not finished; cannot count as success)"
    except FileNotFoundError:
        return None, "runner executable not found on PATH"
    if r.returncode != 0:
        detail = _runner_error_message(r.stdout or "") or (r.stderr or r.stdout or "").strip()[-600:]
        return None, f"RUNNER FAILED (exit={r.returncode}): {detail}"
    usage = _parse_model_usage(r.stdout or "")
    if usage is None:
        return None, (f"usage fields not found in {args.runner} output; reported UNMEASURED "
                      f"(exit={r.returncode})")
    return usage, None


def _runner_error_message(stdout: str):
    """Last error message from `codex exec --json` JSONL (turn.failed / error events), else None."""
    msg = None
    for line in stdout.splitlines():
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if obj.get("type") == "turn.failed":
            msg = (obj.get("error") or {}).get("message") or msg
        elif obj.get("type") == "error":
            msg = obj.get("message") or msg
    if msg:
        try:  # the API error is often a JSON document inside the message string
            inner = json.loads(msg)
            msg = (inner.get("error") or {}).get("message") or msg
        except Exception:
            pass
    return msg[:600] if msg else None


def _parse_model_usage(stdout: str):
    """Extract token usage from `codex exec --json` JSONL, tolerantly. None if unknown."""
    best = None
    for line in stdout.splitlines():
        if "token" not in line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if obj.get("type") == "turn.completed" and isinstance(obj.get("usage"), dict):
            # codex-cli >= 0.150: one usage block per turn; sum them across turns
            turn_usage = obj["usage"]
            best = dict(best or {})
            for k, v in turn_usage.items():
                if isinstance(v, int):
                    best[k] = best.get(k, 0) + v
            continue
        payload = obj.get("payload") or obj
        if payload.get("type") == "token_count":
            info = payload.get("info") or {}
            total = info.get("total_token_usage")
            if isinstance(total, dict):
                best = total
    if best is None:
        return None
    return {
        "input": best.get("input_tokens"),
        "cached": best.get("cached_input_tokens"),
        "output": best.get("output_tokens"),
        "reasoning": best.get("reasoning_output_tokens"),
        "total": best.get("total_tokens") if best.get("total_tokens") is not None else (
            best["input_tokens"] + best["output_tokens"]
            if isinstance(best.get("input_tokens"), int) and isinstance(best.get("output_tokens"), int)
            else None),
        "requests": None,
    }


# --------------------------------------------------------------------------------------
# doctor / selftest
# --------------------------------------------------------------------------------------

def cmd_doctor(args) -> int:
    def ver(cmd):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=20, shell=False,
                               encoding="utf-8", errors="replace")
            first = (r.stdout or r.stderr or "").strip().splitlines()
            return first[0] if first else "unknown"
        except Exception as e:
            return f"UNKNOWN ({type(e).__name__})"
    print(f"ue {VERSION} | python {sys.version.split()[0]} on {sys.platform}")
    print(f"codex: {ver(['codex', '--version'])}")
    print(f"opencode: {ver(['opencode', '--version'])}")
    print(f"CODEX_HOME: {redact(str(codex_home()))} | config.toml exists: "
          f"{(codex_home() / 'config.toml').exists()}")
    print(f"sessions root: {redact(str(codex_home() / 'sessions'))} exists: "
          f"{(codex_home() / 'sessions').exists()}")
    print(f"opencode db: {redact(str(opencode_share_dir() / 'opencode.db'))} exists: "
          f"{(opencode_share_dir() / 'opencode.db').exists()}")
    print(f"profiles available: {[str(p.relative_to(TOOL_DIR)) for p in (TOOL_DIR / 'profiles').rglob('*') if p.is_file()]}")
    print(f"state dir: {redact(str(STATE_DIR))}")
    return 0


def cmd_selftest(args) -> int:
    loader = unittest.TestLoader()
    tests_dir = TOOL_DIR / "tests"
    if not tests_dir.is_dir():
        print("selftest unavailable: this compact skill bundle does not include tools/tests", file=sys.stderr)
        return 2
    suite = loader.discover(str(tests_dir), pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ue", description="Local usage-efficiency helpers (Codex-first).")
    p.add_argument("--version", action="version", version=f"ue {VERSION}")
    sub = p.add_subparsers(dest="command")

    a = sub.add_parser("audit", help="read-only usage baseline from local Codex/OpenCode metadata")
    a.add_argument("--sessions", help="sessions root (default CODEX_HOME/sessions)")
    a.add_argument("--since", help="YYYY-MM-DD lower bound (from folder names)")
    a.add_argument("--days", type=int, default=30, help="default window if --since omitted")
    a.add_argument("--all-time", action="store_true", help="ignore the default window (slow)")
    a.add_argument("--max-files", type=int, default=800)
    a.add_argument("--max-file-mb", type=int, default=40, help="skip rollout files larger than this")
    a.add_argument("--no-opencode", action="store_true")
    a.add_argument("--json-out", help="write redacted JSON report to this path")
    a.set_defaults(func=cmd_audit)

    s = sub.add_parser("summarize-log", help="compact tool-result view; full copy retained on disk")
    s.add_argument("--file", help="log file to summarize (default: stdin)")
    s.add_argument("--out", help="output directory (default state/summaries/<name>-<ts>)")
    s.add_argument("--tail", type=int, default=20, help="always include the last N lines")
    s.add_argument("--context", type=int, default=3, help="context lines per failure")
    s.add_argument("--max-console-lines", type=int, default=400)
    s.add_argument("--json-out")
    s.set_defaults(func=cmd_summarize)

    c = sub.add_parser("prepare-context", help="build a small task context pack")
    c.add_argument("--project", required=True)
    c.add_argument("--task")
    c.add_argument("--request-file")
    c.add_argument("--constraint", action="append")
    c.add_argument("--verify", action="append")
    c.add_argument("--relevant", action="append")
    c.add_argument("--out")
    c.add_argument("--max-list", type=int, default=60)
    c.set_defaults(func=cmd_prepare_context)

    m = sub.add_parser("map", help="versioned project map; check invalidates on change")
    m.add_argument("map_command", choices=["build", "check"])
    m.add_argument("--project", required=True)
    m.add_argument("--out")
    m.add_argument("--map", help="map file for check")
    m.add_argument("--max-files", type=int, default=4000)
    m.set_defaults(func=cmd_map)

    ins = sub.add_parser("instructions", help="instruction inventory / duplicate mapping / rule verification")
    ins.add_argument("instructions_command", choices=["scan", "duplicates", "verify"])
    ins.add_argument("--files", nargs="*", default=[])
    ins.add_argument("--project")
    ins.add_argument("--manifest")
    ins.add_argument("--json-out")
    ins.set_defaults(func=cmd_instructions)

    cmp_ = sub.add_parser("compare", help="compare two bench run records (per-task, checks comparability)")
    cmp_.add_argument("--a", required=True)
    cmp_.add_argument("--b", required=True)
    cmp_.set_defaults(func=cmd_compare)

    ap = sub.add_parser("apply-profile", help="opt-in profile apply with backup + registry")
    ap.add_argument("--target", required=True, choices=["codex", "opencode-project", "opencode-global"])
    ap.add_argument("--project")
    ap.add_argument("--source")
    ap.set_defaults(func=cmd_apply_profile)

    rb = sub.add_parser("rollback", help="restore a profile apply; aborts on later edits")
    rb.add_argument("--target", required=True, choices=["codex", "opencode-project"])
    rb.add_argument("--project")
    rb.add_argument("--force", action="store_true")
    rb.set_defaults(func=cmd_rollback)

    b = sub.add_parser("bench", help="paired benchmark harness (opt-in; no automatic model calls)")
    b.add_argument("bench_command", choices=["list", "plan", "run", "run-all"])
    b.add_argument("--case")
    b.add_argument("--variant")
    b.add_argument("--runner", default="fake", choices=["fake", "codex", "opencode"])
    b.add_argument("--model")
    b.add_argument("--reasoning")
    b.add_argument("--max-calls", type=int)
    b.add_argument("--confirm", action="store_true")
    b.add_argument("--allow-permissions", action="store_true",
                   help="needed for opencode runner (adds --auto); off by default")
    b.add_argument("--timeout", type=int, default=1200)
    b.add_argument("--out")
    b.set_defaults(func=cmd_bench)

    sub.add_parser("doctor", help="read-only environment check").set_defaults(func=cmd_doctor)
    sub.add_parser("selftest", help="run the deterministic unit tests").set_defaults(func=cmd_selftest)
    return p


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "command", None):
        parser.print_help()
        return 0
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
