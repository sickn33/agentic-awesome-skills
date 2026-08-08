#!/usr/bin/env python3
"""
Send a test message via Telegram Bot API.

Usage:
    python send_message.py --token "TOKEN" --chat-id "CHAT_ID" --text "Hello!"
    python send_message.py --chat-id "CHAT_ID" --text "Hello!"  # Uses env var
    python send_message.py --chat-id "CHAT_ID" --photo "https://example.com/img.jpg"
    python send_message.py --chat-id "CHAT_ID" --document "/path/to/file.pdf"
"""

import argparse
import http.client
import json
import os
import re
import sys
from urllib.parse import urlparse

ALLOWED_METHODS = {
    "sendMessage",
    "sendPhoto",
    "sendDocument",
    "sendLocation",
    "sendPoll",
}
BOT_TOKEN_RE = re.compile(r"^\d{6,20}:[A-Za-z0-9_-]{20,}$")


def _mask_token(token: str) -> str:
    """Return a masked version of the token for safe logging."""
    if not token or len(token) < 12:
        return "***masked***"
    return f"{token[:8]}...masked"


def _safe_api_url(token: str, method: str) -> str:
    if not BOT_TOKEN_RE.match(token or ""):
        raise ValueError("Invalid Telegram bot token format")
    if method not in ALLOWED_METHODS:
        raise ValueError(f"Unsupported Telegram method: {method}")
    url = f"https://api.telegram.org/bot{token}/{method}"
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "api.telegram.org":
        raise ValueError("Refusing unsafe Telegram API URL")
    return url


def _safe_api_path(token: str, method: str) -> str:
    _safe_api_url(token, method)
    return f"/bot{token}/{method}"


def api_call(token: str, method: str, data: dict) -> dict:
    """Make a Telegram Bot API call."""
    api_path = _safe_api_path(token, method)
    payload = json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    conn = http.client.HTTPSConnection("api.telegram.org", timeout=30)

    try:
        conn.request("POST", api_path, body=payload, headers=headers)
        resp = conn.getresponse()
        body = resp.read().decode()
        parsed = json.loads(body)
        return parsed
    finally:
        conn.close()


def send_text(token: str, chat_id: str, text: str, parse_mode: str = None,
              silent: bool = False) -> dict:
    """Send a text message."""
    data = {"chat_id": chat_id, "text": text}
    if parse_mode:
        data["parse_mode"] = parse_mode
    if silent:
        data["disable_notification"] = True
    return api_call(token, "sendMessage", data)


def send_photo(token: str, chat_id: str, photo: str, caption: str = None) -> dict:
    """Send a photo by URL or file_id."""
    data = {"chat_id": chat_id, "photo": photo}
    if caption:
        data["caption"] = caption
    return api_call(token, "sendPhoto", data)


def send_document_url(token: str, chat_id: str, document: str, caption: str = None) -> dict:
    """Send a document by URL."""
    data = {"chat_id": chat_id, "document": document}
    if caption:
        data["caption"] = caption
    return api_call(token, "sendDocument", data)


def send_location(token: str, chat_id: str, lat: float, lon: float) -> dict:
    """Send a location."""
    return api_call(token, "sendLocation", {
        "chat_id": chat_id,
        "latitude": lat,
        "longitude": lon
    })


def send_poll(token: str, chat_id: str, question: str, options: list) -> dict:
    """Send a poll."""
    return api_call(token, "sendPoll", {
        "chat_id": chat_id,
        "question": question,
        "options": [{"text": opt} for opt in options]
    })


def main():
    parser = argparse.ArgumentParser(description="Send Telegram message")
    parser.add_argument("--token", type=str, help="Bot token (or TELEGRAM_BOT_TOKEN env)")
    parser.add_argument("--chat-id", type=str, required=True, help="Target chat ID")
    parser.add_argument("--text", type=str, help="Text message to send")
    parser.add_argument("--parse-mode", type=str, choices=["HTML", "MarkdownV2", "Markdown"],
                        help="Parse mode for text formatting")
    parser.add_argument("--photo", type=str, help="Photo URL to send")
    parser.add_argument("--document", type=str, help="Document URL to send")
    parser.add_argument("--caption", type=str, help="Caption for photo/document")
    parser.add_argument("--location", type=str, help="Location as 'lat,lon'")
    parser.add_argument("--poll", type=str, help="Poll question")
    parser.add_argument("--poll-options", type=str, nargs="+", help="Poll options")
    parser.add_argument("--silent", action="store_true", help="Send without notification")
    args = parser.parse_args()

    token = args.token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("ERROR: Provide --token or set TELEGRAM_BOT_TOKEN environment variable")
        sys.exit(1)

    masked = _mask_token(token)
    result = None

    if args.text:
        print(f"Sending text to {args.chat_id}...")
        result = send_text(token, args.chat_id, args.text, args.parse_mode, args.silent)
    elif args.photo:
        print(f"Sending photo to {args.chat_id}...")
        result = send_photo(token, args.chat_id, args.photo, args.caption)
    elif args.document:
        print(f"Sending document to {args.chat_id}...")
        result = send_document_url(token, args.chat_id, args.document, args.caption)
    elif args.location:
        lat, lon = map(float, args.location.split(","))
        print(f"Sending location to {args.chat_id}...")
        result = send_location(token, args.chat_id, lat, lon)
    elif args.poll and args.poll_options:
        print(f"Sending poll to {args.chat_id}...")
        result = send_poll(token, args.chat_id, args.poll, args.poll_options)
    else:
        print("ERROR: Provide --text, --photo, --document, --location, or --poll")
        sys.exit(1)

    if result and result.get("ok"):
        msg = result["result"]
        print(f"OK - Message sent! ID: {msg.get('message_id')}")
        print(f"     Chat: {msg.get('chat', {}).get('title', msg.get('chat', {}).get('first_name', 'N/A'))}")
        print(f"     Date: {msg.get('date')}")
    else:
        # Mask token in error output to prevent credential leakage
        safe_output = json.dumps(result, indent=2, ensure_ascii=False).replace(token, masked)
        print(f"FAIL - {safe_output}")
        sys.exit(1)


if __name__ == "__main__":
    main()
