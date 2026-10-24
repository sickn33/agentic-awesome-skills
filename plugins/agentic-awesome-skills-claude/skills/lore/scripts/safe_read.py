"""Bounded inert project-memory reads and safe rendered text."""
import os
import stat
import html
import re
from pathlib import Path

def read_text(path, max_bytes=2 * 1024 * 1024):
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        if part.is_symlink() and str(part) not in {"/var", "/tmp", "/etc"}:
            raise OSError("Symlinked memory source refused")
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0))
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > max_bytes:
            raise OSError("Memory source must be a regular singly-linked bounded file")
        raw = stream.read(max_bytes + 1)
    if len(raw) > max_bytes: raise OSError("Memory source exceeds byte limit")
    return raw.decode("utf-8-sig")

def inert(value):
    if isinstance(value, str):
        value = html.escape(value).replace("\n", " ").replace("\r", " ")
        value = "".join(c for c in value if ord(c) >= 32 or c == "\t")
        return re.sub(r"([\\`*{}\[\]()#!|])", r"\\\1", value)
    if isinstance(value, list): return [inert(v) for v in value]
    if isinstance(value, dict): return {k: inert(v) for k, v in value.items()}
    return value
