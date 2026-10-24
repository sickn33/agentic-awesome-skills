"""vai.login - Session harvester from Venice.ai web UI or interactive token entry."""
from __future__ import annotations

import getpass
import sys
import time

from . import config


def harvest(email: str | None = None, password: str | None = None,
            headless: bool = False, wait_seconds: int = 180) -> dict:
    """Acquires a valid session token via browser automation or interactive prompt."""
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
        has_playwright = True
    except ImportError:
        has_playwright = False

    if has_playwright and (email or not headless):
        print("Launching browser for Venice.ai login...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context()
            page = context.new_page()
            page.goto("https://venice.ai/chat")

            if email and password:
                try:
                    page.wait_for_selector("input[type=email]", timeout=10000)
                    page.fill("input[type=email]", email)
                    page.fill("input[type=password]", password)
                    page.click("button[type=submit]")
                except Exception:
                    pass

            print(f"Waiting up to {wait_seconds}s for session token in browser storage...")
            token = None
            start = time.time()
            while time.time() - start < wait_seconds:
                # Check localStorage for auth token
                try:
                    storage = page.evaluate("() => ({ ...localStorage })")
                    for k, v in storage.items():
                        if "token" in k.lower() or "auth" in k.lower() or "jwt" in k.lower():
                            if len(v) > 30:
                                token = v
                                break
                    if token:
                        break
                except Exception:
                    pass
                time.sleep(1)

            cookies = context.cookies()
            browser.close()

            if token or cookies:
                session = {
                    "token": token,
                    "cookies": cookies,
                    "chat_endpoint": config.CHAT_ENDPOINT,
                    "created_at": time.time(),
                }
                config.save_session(session)
                return session

    # Fallback to interactive token entry
    print("Browser automation not available or timed out.")
    print("Enter your Venice API Key or Web Session Token below:")
    token = getpass.getpass("Token/Key: ").strip()
    if not token:
        sys.exit("No token provided.")

    session = {
        "token": token,
        "type": "api_key" if token.startswith("venice_") or len(token) > 20 else "bearer",
        "chat_endpoint": config.CHAT_ENDPOINT,
        "created_at": time.time(),
    }
    config.save_session(session)
    return session
