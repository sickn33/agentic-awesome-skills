#!/usr/bin/env python3
"""
Validate WhatsApp Cloud API configuration.

Checks environment variables and tests API connectivity.

Usage:
    python validate_config.py
    python validate_config.py --env-file /path/to/.env
"""

import argparse
import os
import sys

try:
    import httpx
except ImportError:
    print("Error: httpx not installed. Run: pip install httpx")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("Warning: python-dotenv not installed. Using system environment only.")
    load_dotenv = None

GRAPH_API = "https://graph.facebook.com/v21.0"

REQUIRED_VARS = [
    ("WHATSAPP_TOKEN", "Access token for WhatsApp Cloud API"),
    ("PHONE_NUMBER_ID", "Phone Number ID from API Setup"),
    ("WABA_ID", "WhatsApp Business Account ID"),
    ("APP_SECRET", "App Secret from App Settings > Basic"),
    ("VERIFY_TOKEN", "Custom token for webhook verification"),
]


def check_env_vars() -> tuple[bool, list[str]]:
    """Check if all required environment variables are set."""
    missing = []
    for var_name, description in REQUIRED_VARS:
        value = os.environ.get(var_name)
        if not value or value.startswith("your_"):
            missing.append(f"  {var_name} - {description}")

    return len(missing) == 0, missing


def _phone_lookup_failure_message() -> str:
    """Return a static failure summary for the phone lookup."""
    return "Graph API rejected the phone-number lookup. Review your token, phone number ID, and app permissions."


def _waba_lookup_failure_message() -> str:
    """Return a static failure summary for the WABA lookup."""
    return "Graph API rejected the WABA lookup. Review your WABA ID, token, and assigned assets."


def test_api_connection() -> tuple[bool, str]:
    """Test connection to WhatsApp Cloud API."""
    token = os.environ.get("WHATSAPP_TOKEN", "")
    phone_id = os.environ.get("PHONE_NUMBER_ID", "")

    try:
        response = httpx.get(
            f"{GRAPH_API}/{phone_id}",
            params={"fields": "verified_name,code_verification_status,display_phone_number,quality_rating"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )

        if response.status_code == 200:
            return True, "Phone-number endpoint reachable."

        return False, _phone_lookup_failure_message()

    except httpx.ConnectError:
        return False, "Connection failed. Check your internet connection."
    except httpx.TimeoutException:
        return False, "Request timed out after 10 seconds."
    except Exception as exc:
        return False, f"Unexpected {exc.__class__.__name__} while contacting the Graph API."


def test_waba_access() -> tuple[bool, str]:
    """Test access to WhatsApp Business Account."""
    token = os.environ.get("WHATSAPP_TOKEN", "")
    waba_id = os.environ.get("WABA_ID", "")

    try:
        response = httpx.get(
            f"{GRAPH_API}/{waba_id}/phone_numbers",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )

        if response.status_code == 200:
            return True, "WABA phone-numbers endpoint reachable."

        return False, _waba_lookup_failure_message()

    except Exception as exc:
        return False, f"Unexpected {exc.__class__.__name__} while checking WABA access."


def main():
    parser = argparse.ArgumentParser(description="Validate WhatsApp Cloud API configuration")
    parser.add_argument("--env-file", default=".env", help="Path to .env file (default: .env)")
    args = parser.parse_args()

    # Load environment
    if load_dotenv and os.path.exists(args.env_file):
        load_dotenv(args.env_file)
        print(f"Loaded: {args.env_file}")
    elif not os.path.exists(args.env_file):
        print(f"Warning: {args.env_file} not found. Using system environment.")

    print()
    print("=" * 50)
    print("WhatsApp Cloud API - Configuration Validator")
    print("=" * 50)
    print("Detailed API payloads are intentionally omitted to protect sensitive configuration data.")
    print()

    all_ok = True

    # Check 1: Environment variables
    print("[1/3] Checking environment variables...")
    env_ok, missing = check_env_vars()
    if env_ok:
        print("  OK - All required variables are set")
    else:
        print("  FAIL - Missing variables:")
        for m in missing:
            print(f"    {m}")
        all_ok = False

    print()

    if not env_ok:
        print("Cannot test API without required variables. Fix the above and retry.")
        sys.exit(1)

    # Check 2: API connection
    print("[2/3] Testing API connection (Phone Number)...")
    api_ok, api_message = test_api_connection()
    if api_ok:
        print(f"  OK - {api_message}")
    else:
        print(f"  FAIL - {api_message}")
        all_ok = False

    print()

    # Check 3: WABA access
    print("[3/3] Testing WABA access...")
    waba_ok, waba_message = test_waba_access()
    if waba_ok:
        print(f"  OK - {waba_message}")
    else:
        print(f"  FAIL - {waba_message}")
        all_ok = False

    print()
    print("=" * 50)
    if all_ok:
        print("All checks passed! Your configuration is valid.")
        print("You can start sending messages.")
    else:
        print("Some checks failed. Please fix the issues above.")
        print("Need help? Read: references/setup-guide.md")
    print("=" * 50)

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
