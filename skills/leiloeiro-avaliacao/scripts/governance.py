"""Optional local advisory bookkeeping; no automatic authorization or atomic rate enforcement."""
from __future__ import annotations
from collections import deque
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 30
WARNING_THRESHOLD = 0.8
MAX_LOG_BYTES = 1_000_000


def _log_path():
    configured = os.environ.get("LEILOEIRO_LOG_DIR")
    if not configured:
        return None
    directory = Path(configured).expanduser().absolute()
    if any(p.is_symlink() for p in (directory, *directory.parents)):
        raise ValueError("Log directory must not contain symlinks")
    path = directory / "action_log.jsonl"
    if path.is_symlink():
        raise ValueError("Refusing symlink log")
    return path


def log_action(action: str, details: dict | None = None) -> dict:
    # Never persist arbitrary action strings, documents or party identifiers.
    safe_action = action if action in {"query", "review", "draft", "check"} else "unspecified"
    entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "action": safe_action, "details": {}}
    path = _log_path()
    if path is None:
        return entry
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.exists() and path.stat().st_size >= MAX_LOG_BYTES:
        raise ValueError("Log size limit reached; apply approved retention")
    fd = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0), 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as stream:
        stream.write(json.dumps(entry) + "\n")
    return entry


def get_recent_actions(limit: int = 20) -> list:
    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 1000:
        raise ValueError("Limit must be1..1000")
    path = _log_path()
    if path is None or not path.exists():
        return []
    if path.stat().st_size > MAX_LOG_BYTES:
        raise ValueError("Log size limit exceeded")
    entries = deque(maxlen=limit)
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            try:
                item = json.loads(line)
                if isinstance(item, dict) and isinstance(item.get("timestamp"), str):
                    entries.append({"timestamp": item["timestamp"], "action": "recorded", "details": {}})
            except (ValueError, TypeError):
                continue
    return list(entries)


def check_rate(action: str = "query") -> bool:
    """Advisory count of prior local records only; not a reservation or spend limiter."""
    now = datetime.now(timezone.utc)
    count = 0
    for entry in get_recent_actions(1000):
        try:
            ts = datetime.fromisoformat(entry["timestamp"])
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if 0 <= (now - ts).total_seconds() <= RATE_LIMIT_WINDOW:
                count += 1
        except (ValueError, TypeError):
            continue
    if count >= RATE_LIMIT_MAX:
        raise RateLimitExceeded("Advisory local action count exceeded")
    return True


def requires_confirmation(action: str, risk_level: str = "alto") -> dict:
    return {"type": "confirmation_request", "confirmed": False,
            "message": "Obtain actual user authorization in the host; this object is not approval."}


def check_warning_threshold(current_value: float, threshold: float = WARNING_THRESHOLD) -> list:
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in (current_value, threshold)):
        raise ValueError("Finite ratios required")
    if current_value < 0 or not 0 <= threshold <= 1:
        raise ValueError("Invalid ratio/threshold")
    return ([{"type": "RATE_LIMIT_WARNING", "threshold": threshold, "current": current_value}]
            if current_value >= threshold else [])


class RateLimitExceeded(Exception):
    pass


if __name__ == "__main__":
    print(f"Recent local records: {len(get_recent_actions())}; no details displayed.")
