"""vai.config - Configuration and session token management."""
from __future__ import annotations

import os
import json
import time
from pathlib import Path

DEFAULT_MODEL = os.environ.get("VENICE_MODEL", "llama-3.3-70b")
CHAT_ENDPOINT = os.environ.get("VENICE_BASE_URL", "https://api.venice.ai/api/v1")
CONFIG_DIR = Path(os.environ.get("XDG_CONFIG_HOME", "~/.config")).expanduser() / "vai"
SESSION_FILE = CONFIG_DIR / "session.json"


def ensure_config_dir() -> Path:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    return CONFIG_DIR


def load_session() -> dict | None:
    # 1. Environment variable override
    env_token = os.environ.get("VENICE_API_KEY")
    if env_token:
        return {
            "token": env_token,
            "type": "api_key",
            "chat_endpoint": CHAT_ENDPOINT,
            "expires_at": None,
        }

    # 2. Stored session file
    if not SESSION_FILE.is_file():
        return None
    try:
        return json.loads(SESSION_FILE.read_text())
    except Exception:
        return None


def save_session(data: dict) -> None:
    ensure_config_dir()
    SESSION_FILE.write_text(json.dumps(data, indent=2))
    SESSION_FILE.chmod(0o600)


def clear_session() -> None:
    if SESSION_FILE.exists():
        SESSION_FILE.unlink()


def token_status(session: dict | None) -> tuple[str, str]:
    if not session:
        return "none", "no active session"
    
    expires_at = session.get("expires_at")
    if not expires_at:
        return "valid", "active API key / indefinite session"

    now = time.time()
    diff = expires_at - now
    if diff <= 0:
        return "expired", "session token expired"
    if diff < 3600:
        return "expiring", f"session token expires in {int(diff // 60)} minutes"
    return "valid", f"session token valid ({int(diff // 3600)} hours left)"
