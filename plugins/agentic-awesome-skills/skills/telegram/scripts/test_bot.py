#!/usr/bin/env python3
"""
Test Telegram Bot connection and token validity.

Usage:
    python test_bot.py --token "YOUR_BOT_TOKEN"
    python test_bot.py  # Uses TELEGRAM_BOT_TOKEN env var
"""

import argparse
import json
import os
import sys
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


def _mask_token(token: str) -> str:
    """Return a masked version of the token for safe logging."""
    if not token or len(token) < 12:
        return "***masked***"
    return f"{token[:8]}...masked"


def test_bot(token: str) -> dict:
    """Test bot token and return bot info."""
    base_url = f"https://api.telegram.org/bot{token}"
    masked_token = _mask_token(token)
    results = {
        "token_valid": False,
        "bot_info": None,
        "webhook_info": None,
        "errors": []
    }

    # Test 1: getMe
    print(f"[1/3] Testing token ({masked_token}) with getMe...")
    try:
        req = Request(f"{base_url}/getMe")
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            if data.get("ok"):
                results["token_valid"] = True
                results["bot_info"] = data["result"]
                bot = data["result"]
                print(f"  OK - Bot: @{bot.get('username', 'N/A')}")
                print(f"       Name: {bot.get('first_name', 'N/A')}")
                print(f"       ID: {bot.get('id', 'N/A')}")
                print(f"       Can join groups: {bot.get('can_join_groups', 'N/A')}")
                print(f"       Can read group messages: {bot.get('can_read_all_group_messages', 'N/A')}")
                print(f"       Supports inline: {bot.get('supports_inline_queries', 'N/A')}")
            else:
                results["errors"].append(f"getMe returned ok=false: {data}")
                print(f"  FAIL - {data.get('description', 'Unknown error')}")
    except HTTPError as e:
        error_body = e.read().decode()
        # Mask token in error body to prevent credential leakage
        safe_error = error_body.replace(token, masked_token) if token in error_body else error_body
        results["errors"].append(f"HTTP {e.code}: {safe_error}")
        print(f"  FAIL - HTTP {e.code}: {safe_error}")
        if e.code == 401:
            print("  Token is INVALID. Get a new one from @BotFather")
            return results
    except URLError as e:
        results["errors"].append(f"Network error: {e.reason}")
        print(f"  FAIL - Network error: {e.reason}")
        return results

    # Test 2: getWebhookInfo
    print("\n[2/3] Checking webhook status...")
    try:
        req = Request(f"{base_url}/getWebhookInfo")
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            if data.get("ok"):
                wh = data["result"]
                results["webhook_info"] = wh
                if wh.get("url"):
                    print(f"  Webhook active: {wh['url']}")
                    print(f"  Pending updates: {wh.get('pending_update_count', 0)}")
                    if wh.get("last_error_message"):
                        print(f"  Last error: {wh['last_error_message']}")
                        print(f"  Error date: {wh.get('last_error_date', 'N/A')}")
                else:
                    print("  No webhook set (using long polling or inactive)")
    except Exception as e:
        safe_err = str(e).replace(token, masked_token)
        results["errors"].append(f"getWebhookInfo error: {safe_err}")
        print(f"  WARN - Could not check webhook: {safe_err}")

    # Test 3: getUpdates (only if no webhook)
    print("\n[3/3] Testing getUpdates...")
    if results.get("webhook_info", {}).get("url"):
        print("  SKIP - Webhook is active (getUpdates disabled)")
    else:
        try:
            req = Request(f"{base_url}/getUpdates?limit=1&timeout=1")
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                if data.get("ok"):
                    updates = data.get("result", [])
                    print(f"  OK - {len(updates)} pending update(s)")
                    if updates:
                        last = updates[-1]
                        print(f"  Last update ID: {last.get('update_id')}")
        except Exception as e:
            safe_err = str(e).replace(token, masked_token)
            results["errors"].append(f"getUpdates error: {safe_err}")
            print(f"  WARN - {safe_err}")

    # Summary
    print("\n" + "=" * 50)
    if results["token_valid"] and not results["errors"]:
        print("RESULT: All tests PASSED. Bot is ready!")
    elif results["token_valid"]:
        print(f"RESULT: Token valid but {len(results['errors'])} warning(s)")
    else:
        print("RESULT: Token INVALID. Check with @BotFather")
    print("=" * 50)

    return results


def main():
    parser = argparse.ArgumentParser(description="Test Telegram Bot token")
    parser.add_argument("--token", type=str, help="Bot token (or set TELEGRAM_BOT_TOKEN env var)")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()

    token = args.token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("ERROR: Provide --token or set TELEGRAM_BOT_TOKEN environment variable")
        sys.exit(1)

    results = test_bot(token)

    if args.json:
        print("\n" + json.dumps(results, indent=2, ensure_ascii=False))

    sys.exit(0 if results["token_valid"] else 1)


if __name__ == "__main__":
    main()
