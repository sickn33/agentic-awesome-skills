"""vai.tools - Local filesystem, shell, and CPU tools with approval hooks."""
from __future__ import annotations

import base64
import fnmatch
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


class ToolError(Exception):
    pass


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict
    fn: Callable[[dict], str]


@dataclass
class ToolContext:
    root: Path
    auto: bool = False
    allow_outside: bool = False
    max_output: int = 24000
    timeout: int = 60
    ask: Callable[[str], bool] | None = None

    def resolve(self, path: str | Path) -> Path:
        target = (self.root / path if not Path(path).is_absolute() else Path(path)).resolve()
        if not self.allow_outside and not self._is_subpath(target, self.root):
            raise ToolError(f"path escapes workspace root: {path}")
        return target

    @staticmethod
    def _is_subpath(child: Path, parent: Path) -> bool:
        try:
            child.relative_to(parent)
            return True
        except ValueError:
            return False

    def approve(self, action: str) -> bool:
        if self.auto:
            return True
        if self.ask:
            return self.ask(action)
        return True


def clip(text: str, cap: int) -> str:
    if len(text) <= cap:
        return text
    half = cap // 2
    return f"{text[:half]}\n\n... [{len(text) - cap} chars omitted] ...\n\n{text[-half:]}"


def _rel(ctx: ToolContext, target: Path) -> str:
    try:
        return str(target.relative_to(ctx.root))
    except ValueError:
        return str(target)


def _iter_files(ctx: ToolContext, base: Path) -> Iterable[Path]:
    try:
        for entry in os.scandir(base):
            if entry.name.startswith(".git"):
                continue
            p = Path(entry.path)
            if entry.is_dir(follow_symlinks=False):
                yield from _iter_files(ctx, p)
            elif entry.is_file(follow_symlinks=False):
                yield p
    except OSError:
        return


def list_dir(ctx: ToolContext, path: str = ".", recursive: bool = False, limit: int = 200) -> str:
    target = ctx.resolve(path)
    if not target.is_dir():
        raise ToolError(f"not a directory: {_rel(ctx, target)}")
    entries = []
    if recursive:
        for f in _iter_files(ctx, target):
            entries.append(_rel(ctx, f))
            if len(entries) >= limit:
                break
    else:
        try:
            for item in sorted(target.iterdir()):
                marker = "/" if item.is_dir() else ""
                entries.append(f"{item.name}{marker}")
                if len(entries) >= limit:
                    break
        except OSError as e:
            raise ToolError(f"cannot read directory: {e}")
    return "\n".join(entries) or "(empty directory)"


def file_info(ctx: ToolContext, path: str) -> str:
    target = ctx.resolve(path)
    if not target.exists():
        raise ToolError(f"no such file: {_rel(ctx, target)}")
    stat = target.stat()
    lines = [
        f"path: {_rel(ctx, target)}",
        f"type: {'dir' if target.is_dir() else 'file'}",
        f"size: {stat.st_size} bytes",
        f"modified: {time.ctime(stat.st_mtime)}",
        f"mode: {oct(stat.st_mode)}",
    ]
    if target.is_file():
        try:
            lines.append(f"lines: {len(target.read_text(errors='replace').splitlines())}")
        except Exception:
            pass
    return "\n".join(lines)


def read_file(ctx: ToolContext, path: str, start_line: int = 1, end_line: int | None = None, cap: int = 24000) -> str:
    target = ctx.resolve(path)
    if not target.is_file():
        raise ToolError(f"not a file: {_rel(ctx, target)}")
    raw = target.read_bytes()
    if b"\x00" in raw[:1024]:
        return (
            f"binary file {_rel(ctx, target)} ({target.stat().st_size} bytes)\n"
            f"base64 head:\n{base64.b64encode(raw[:256]).decode()}"
        )
    text = target.read_text(errors="replace")
    lines = text.splitlines()
    start = max(1, int(start_line))
    end = int(end_line) if end_line else len(lines)
    end = min(end, len(lines))
    body = "\n".join(
        f"{start + i:>5}| {line}" for i, line in enumerate(lines[start - 1:end])
    )
    return clip(f"{_rel(ctx, target)} lines {start}-{end} of {len(lines)}\n{body}", cap)


def write_file(ctx: ToolContext, path: str, content: str, mode: str = "overwrite") -> str:
    target = ctx.resolve(path)
    if not ctx.approve(f"write {_rel(ctx, target)} ({len(content)} chars, {mode})"):
        raise ToolError("declined by user")
    target.parent.mkdir(parents=True, exist_ok=True)
    if mode == "append" and target.exists():
        with target.open("a", encoding="utf-8") as fh:
            fh.write(content)
    else:
        target.write_text(content, encoding="utf-8")
    return f"wrote {len(content)} chars to {_rel(ctx, target)}"


def replace_in_file(ctx: ToolContext, path: str, old: str, new: str, count: int = 0) -> str:
    target = ctx.resolve(path)
    if not target.is_file():
        raise ToolError(f"not a file: {_rel(ctx, target)}")
    text = target.read_text(errors="replace")
    found = text.count(old)
    if found == 0:
        raise ToolError(f"pattern not found in {_rel(ctx, target)}")
    replaced = found if count <= 0 else min(found, int(count))
    if not ctx.approve(f"patch {_rel(ctx, target)} ({replaced} replacement(s))"):
        raise ToolError("declined by user")
    target.write_text(
        text.replace(old, new) if count <= 0 else text.replace(old, new, int(count)),
        encoding="utf-8",
    )
    return f"patched {_rel(ctx, target)}: {replaced} of {found} occurrence(s)"


def glob_files(ctx: ToolContext, pattern: str, path: str = ".", limit: int = 300) -> str:
    base = ctx.resolve(path)
    hits = []
    for f in _iter_files(ctx, base):
        rel = str(f.relative_to(base))
        if fnmatch.fnmatch(rel, pattern) or fnmatch.fnmatch(f.name, pattern):
            hits.append(_rel(ctx, f))
            if len(hits) >= limit:
                break
    return "\n".join(sorted(hits)) or "(no matches)"


def grep_files(ctx: ToolContext, pattern: str, path: str = ".", include: str = "*", ignore_case: bool = False,
               fixed: bool = False, limit: int = 200) -> str:
    base = ctx.resolve(path)
    rx = None if fixed else re.compile(pattern, re.I if ignore_case else 0)
    needle = pattern.lower() if ignore_case else pattern
    hits, scanned = [], 0
    for f in _iter_files(ctx, base):
        if not fnmatch.fnmatch(f.name, include):
            continue
        try:
            text = f.read_text(errors="replace")
        except OSError:
            continue
        scanned += 1
        for lineno, line in enumerate(text.splitlines(), 1):
            hay = line.lower() if ignore_case else line
            if (needle in hay) if fixed else bool(rx.search(line)):
                hits.append(f"{_rel(ctx, f)}:{lineno}: {line.strip()[:200]}")
                if len(hits) >= limit:
                    return f"{len(hits)}+ hit(s)\n" + "\n".join(hits) + "\n...(truncated)"
    return f"{len(hits)} hit(s) in {scanned} file(s)\n" + ("\n".join(hits) or "(no matches)")


def make_dir(ctx: ToolContext, path: str) -> str:
    target = ctx.resolve(path)
    target.mkdir(parents=True, exist_ok=True)
    return f"created {_rel(ctx, target)}"


def move_path(ctx: ToolContext, source: str, destination: str) -> str:
    src, dst = ctx.resolve(source), ctx.resolve(destination)
    if not src.exists():
        raise ToolError(f"no such path: {_rel(ctx, src)}")
    if not ctx.approve(f"move {_rel(ctx, src)} -> {_rel(ctx, dst)}"):
        raise ToolError("declined by user")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return f"moved {_rel(ctx, src)} -> {_rel(ctx, dst)}"


def delete_path(ctx: ToolContext, path: str, recursive: bool = False) -> str:
    target = ctx.resolve(path)
    if not target.exists():
        raise ToolError(f"no such path: {_rel(ctx, target)}")
    if not ctx.approve(f"delete {_rel(ctx, target)}"):
        raise ToolError("declined by user")
    if target.is_dir():
        shutil.rmtree(target) if recursive else target.rmdir()
    else:
        target.unlink()
    return f"deleted {_rel(ctx, target)}"


def run_command(ctx: ToolContext, command: str, cwd: str = ".", timeout: int | None = None, env: dict | None = None) -> str:
    workdir = ctx.resolve(cwd)
    if not workdir.is_dir():
        raise ToolError(f"not a directory: {_rel(ctx, workdir)}")
    if not ctx.approve(f"run: {command}   (cwd={_rel(ctx, workdir)})"):
        raise ToolError("declined by user")
    limit = int(timeout or ctx.timeout)
    started = time.time()
    try:
        proc = subprocess.run(
            command, shell=True, cwd=str(workdir), capture_output=True,
            text=True, timeout=limit, env={**os.environ, **(env or {})},
        )
        code, out, err = proc.returncode, proc.stdout or "", proc.stderr or ""
    except subprocess.TimeoutExpired as exc:
        code = -1
        out = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        err = f"timed out after {limit}s"
    parts = [f"exit={code}  {time.time() - started:.2f}s"]
    if out.strip():
        parts.append("stdout:\n" + out.rstrip())
    if err.strip():
        parts.append("stderr:\n" + err.rstrip())
    return clip("\n".join(parts), ctx.max_output)


def system_info(ctx: ToolContext) -> str:
    lines = [
        f"platform: {platform.platform()}",
        f"python: {sys.version.split()[0]}",
        f"cwd: {Path.cwd()}",
        f"workspace root: {ctx.root}",
        f"cpu count: {os.cpu_count()}",
    ]
    try:
        load = os.getloadavg()
        lines.append(f"load avg 1/5/15m: {load[0]:.2f} {load[1]:.2f} {load[2]:.2f}")
    except (OSError, AttributeError):
        pass
    try:
        total = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
        lines.append(f"memory total: {total / 1e9:.1f} GB")
    except (ValueError, OSError, AttributeError):
        pass
    try:
        du = shutil.disk_usage(ctx.root)
        lines.append(f"disk at root: {du.free / 1e9:.1f} GB free of {du.total / 1e9:.1f} GB")
    except OSError:
        pass
    return "\n".join(lines)


def list_processes(ctx: ToolContext, n: int = 15, sort: str = "cpu") -> str:
    key = "-pmem" if sort == "mem" else "-pcpu"
    try:
        proc = subprocess.run(
            f"ps -eo pid,pcpu,pmem,comm --sort={key} | head -n {int(n) + 1}",
            shell=True, capture_output=True, text=True, timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return f"ps failed: {exc}"
    return proc.stdout.strip() or "(no output)"


# ------------------------------------------------------------- registry ----

def _bind(ctx: ToolContext, fn):
    def call(args: dict) -> str:
        try:
            return str(fn(ctx, **(args or {})))
        except ToolError as exc:
            return f"ERROR: {exc}"
        except TypeError as exc:
            return f"ERROR: bad arguments: {exc}"
        except Exception as exc:  # noqa: BLE001
            return f"ERROR: {type(exc).__name__}: {exc}"
    return call


_SPECS: list[tuple[Tool, object]] = [
    (Tool("list_dir", "List a directory (non-recursive) or walk it recursively.",
          {"type": "object", "properties": {
              "path": {"type": "string"}, "recursive": {"type": "boolean"},
              "limit": {"type": "integer"}}}, list_dir), list_dir),
    (Tool("file_info", "Size, line count, mtime and mode for one path.",
          {"type": "object", "properties": {"path": {"type": "string"}},
           "required": ["path"]}, file_info), file_info),
    (Tool("read_file", "Read a text file with line numbers. Binary files return a base64 head.",
          {"type": "object", "properties": {
              "path": {"type": "string"}, "start_line": {"type": "integer"},
              "end_line": {"type": "integer"}, "max_bytes": {"type": "integer"}},
           "required": ["path"]}, read_file), read_file),
    (Tool("write_file", "Create or overwrite a file. mode=append to add to the end.",
          {"type": "object", "properties": {
              "path": {"type": "string"}, "content": {"type": "string"},
              "mode": {"type": "string", "enum": ["overwrite", "append"]}},
           "required": ["path", "content"]}, write_file), write_file),
    (Tool("replace_in_file", "Exact string replacement. count=0 replaces every occurrence.",
          {"type": "object", "properties": {
              "path": {"type": "string"}, "old": {"type": "string"},
              "new": {"type": "string"}, "count": {"type": "integer"}},
           "required": ["path", "old", "new"]}, replace_in_file), replace_in_file),
    (Tool("glob_files", "Find files by glob pattern, e.g. '**/*.py'.",
          {"type": "object", "properties": {
              "pattern": {"type": "string"}, "path": {"type": "string"},
              "limit": {"type": "integer"}}, "required": ["pattern"]}, glob_files), glob_files),
    (Tool("grep_files", "Search file contents. Set fixed=true for literal strings.",
          {"type": "object", "properties": {
              "pattern": {"type": "string"}, "path": {"type": "string"},
              "include": {"type": "string"}, "ignore_case": {"type": "boolean"},
              "fixed": {"type": "boolean"}, "limit": {"type": "integer"}},
           "required": ["pattern"]}, grep_files), grep_files),
    (Tool("make_dir", "Create a directory, parents included.",
          {"type": "object", "properties": {"path": {"type": "string"}},
           "required": ["path"]}, make_dir), make_dir),
    (Tool("move_path", "Move or rename a file or directory.",
          {"type": "object", "properties": {
              "source": {"type": "string"}, "destination": {"type": "string"}},
           "required": ["source", "destination"]}, move_path), move_path),
    (Tool("delete_path", "Delete a file or (with recursive=true) a directory tree.",
          {"type": "object", "properties": {
              "path": {"type": "string"}, "recursive": {"type": "boolean"}},
           "required": ["path"]}, delete_path), delete_path),
    (Tool("run_command", "Run a shell command in the workspace. Returns exit code, stdout, stderr.",
          {"type": "object", "properties": {
              "command": {"type": "string"}, "cwd": {"type": "string"},
              "timeout": {"type": "integer"}}, "required": ["command"]}, run_command), run_command),
    (Tool("system_info", "OS, python, cpu count, load average, memory, disk free.",
          {"type": "object", "properties": {}}, system_info), system_info),
    (Tool("list_processes", "Top processes by cpu or mem.",
          {"type": "object", "properties": {
              "n": {"type": "integer"}, "sort": {"type": "string", "enum": ["cpu", "mem"]}}},
          list_processes), list_processes),
]

TOOL_NAMES = [spec.name for spec, _ in _SPECS]


def build_tools(ctx: ToolContext) -> dict[str, Tool]:
    return {
        spec.name: Tool(spec.name, spec.description, spec.parameters, _bind(ctx, fn))
        for spec, fn in _SPECS
    }


def schemas(tools: dict[str, Tool]) -> list[dict]:
    return [
        {"type": "function",
         "function": {"name": t.name, "description": t.description,
                      "parameters": t.parameters}}
        for t in tools.values()
    ]


def tool_docs(tools: dict[str, Tool]) -> str:
    """For text tool-mode: describe the protocol in the system prompt."""
    lines = [
        "TOOLS (text protocol)",
        "When you want a tool, emit a fenced json block and nothing else on that line:",
        '```json\n{"tool": "read_file", "args": {"path": "src/app.py"}}\n```',
        "You may emit several blocks. Their results come back as `tool_result` messages.",
        "",
        "Available:",
    ]
    for t in tools.values():
        lines.append(f"- {t.name}: {t.description}")
    return "\n".join(lines)


_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.S)


def parse_text_tool_calls(text: str) -> list[dict]:
    calls: list[dict] = []

    def add(obj: dict) -> None:
        if "tool" in obj:
            calls.append({
                "id": f"call_{len(calls)}",
                "name": obj["tool"],
                "arguments": json.dumps(obj.get("args") or obj.get("arguments") or {}),
            })

    for match in _FENCE.finditer(text):
        try:
            add(json.loads(match.group(1)))
        except json.JSONDecodeError:
            continue
    if not calls:
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("{") and '"tool"' in line:
                try:
                    add(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return calls
