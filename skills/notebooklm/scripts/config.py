"""
Configuration for NotebookLM Skill
Centralizes constants, selectors, and paths
"""

import os
import stat
from pathlib import Path

# Paths
SKILL_DIR = Path(__file__).parent.parent
LEGACY_DATA_DIR = SKILL_DIR / "data"
DATA_DIR = Path(os.environ.get(
    "AAS_NOTEBOOKLM_DATA_DIR",
    Path.home() / ".local" / "share" / "agentic-awesome-skills" / "notebooklm",
)).expanduser()
BROWSER_STATE_DIR = DATA_DIR / "browser_state"
BROWSER_PROFILE_DIR = BROWSER_STATE_DIR / "browser_profile"
STATE_FILE = BROWSER_STATE_DIR / "state.json"
AUTH_INFO_FILE = DATA_DIR / "auth_info.json"
LIBRARY_FILE = DATA_DIR / "library.json"

def protect_state_path(path, *, directory=False):
    """Repair only owned state paths; never follow links or mutate hard links."""
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    if path.is_symlink():
        raise OSError(f"Refusing linked state path: {path}")
    if directory:
        path.mkdir(parents=True, exist_ok=True, mode=0o700)
        # Windows does not support opening directories this way; privacy there
        # is governed by the user profile ACL, not POSIX permission bits.
        if os.name == "nt":
            path.chmod(0o700)
            return
        flags |= getattr(os, "O_DIRECTORY", 0)
    elif not path.exists():
        return
    fd = os.open(path, flags)
    try:
        info = os.fstat(fd)
        valid = stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode) and info.st_nlink == 1
        if not valid:
            raise OSError(f"Refusing unsafe state path: {path}")
        if hasattr(os, "fchmod"):
            os.fchmod(fd, 0o700 if directory else 0o600)
        else:
            os.chmod(path, 0o600)
    finally:
        os.close(fd)


# Browser profiles and storage-state files contain live Google credentials.
# A restrictive umask also covers files created later by Chromium.
os.umask(0o077)


def ensure_private_state():
    """Create/repair the private state tree and migrate the legacy skill-local tree."""
    import shutil
    if LEGACY_DATA_DIR.exists() and LEGACY_DATA_DIR != DATA_DIR and not DATA_DIR.exists():
        DATA_DIR.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.move(str(LEGACY_DATA_DIR), str(DATA_DIR))
        print(f"⚠️ Migrated sensitive NotebookLM state to private user storage: {DATA_DIR}")
    for directory in (DATA_DIR, BROWSER_STATE_DIR, BROWSER_PROFILE_DIR):
        protect_state_path(directory, directory=True)
    for file_path in (STATE_FILE, AUTH_INFO_FILE, LIBRARY_FILE):
        protect_state_path(file_path)

# NotebookLM Selectors
QUERY_INPUT_SELECTORS = [
    "textarea.query-box-input",  # Primary
    'textarea[aria-label="Feld für Anfragen"]',  # Fallback German
    'textarea[aria-label="Input for queries"]',  # Fallback English
]

RESPONSE_SELECTORS = [
    ".to-user-container .message-text-content",  # Primary
    "[data-message-author='bot']",
    "[data-message-author='assistant']",
]

# Browser Configuration
BROWSER_ARGS = [
    '--disable-blink-features=AutomationControlled',  # Patches navigator.webdriver
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check'
]

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

# Timeouts
LOGIN_TIMEOUT_MINUTES = 10
QUERY_TIMEOUT_SECONDS = 120
PAGE_LOAD_TIMEOUT = 30000
