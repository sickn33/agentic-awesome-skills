from __future__ import annotations

from pathlib import Path


def is_safe_regular_file(path: str | Path) -> bool:
    candidate = Path(path)
    try:
        return candidate.is_file() and not candidate.is_symlink()
    except OSError:
        return False
