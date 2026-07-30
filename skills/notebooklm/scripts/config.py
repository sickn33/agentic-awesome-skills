"""
Configuration for NotebookLM Skill
Centralizes constants, selectors, and paths
"""

import os
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
    for directory in (DATA_DIR.parent.parent, DATA_DIR.parent, DATA_DIR, BROWSER_STATE_DIR, BROWSER_PROFILE_DIR):
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            directory.chmod(0o700)
        except OSError:
            pass
    for file_path in (STATE_FILE, AUTH_INFO_FILE, LIBRARY_FILE):
        if file_path.exists() and not file_path.is_symlink():
            try:
                file_path.chmod(0o600)
            except OSError:
                pass

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
