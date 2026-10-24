"""Bounded inert source reads; never import or execute audited content."""
import os
import stat
from pathlib import Path

def read_text(path, *, root=None, **_ignored):
    path = Path(os.path.abspath(path))
    root = Path(os.path.abspath(root or path.parent))
    if not path.is_relative_to(root):
        raise OSError("Source escapes selected root")
    for parent in (path, *path.parents):
        if parent.is_symlink() and str(parent) not in {"/var", "/tmp", "/etc"}:
            raise OSError("Symlinked source path refused")
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0))
    with os.fdopen(fd, "rb") as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 2 * 1024 * 1024:
            raise OSError("Source must be a regular singly-linked file <= 2 MiB")
        raw = handle.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024: raise OSError("Source grew beyond size limit")
    return raw.decode("utf-8", errors="replace")

def private_directory(path):
    path = Path(os.path.abspath(path))
    for parent in (path, *path.parents):
        if parent.is_symlink() and str(parent) not in {"/var", "/tmp", "/etc"}:
            raise OSError("Symlinked state path refused")
    path.mkdir(parents=True, mode=0o700, exist_ok=True)
    info = path.stat()
    if not stat.S_ISDIR(info.st_mode) or (hasattr(os, "getuid") and info.st_uid != os.getuid()) or stat.S_IMODE(info.st_mode) & 0o077:
        raise OSError("State directory must be user-owned and mode 0700")
    return path
