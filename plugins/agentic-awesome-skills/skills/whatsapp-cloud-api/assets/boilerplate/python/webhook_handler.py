"""WhatsApp Webhook Handler with HMAC-SHA256 validation."""

import hashlib
import hmac
import os
import re
from functools import wraps
from typing import Any

from flask import Response, abort, request


_SAFE_CHALLENGE_RE = re.compile(r"^[A-Za-z0-9._-]{1,200}$")


def validate_hmac_signature(app_secret: str | None = None):
    """
    Flask decorator to validate HMAC-SHA256 signature on webhook requests.

    A Meta assina cada request com o App Secret no header X-Hub-Signature-256.
    Validar esta assinatura previne requests falsificados.
    Usa hmac.compare_digest para comparacao constant-time (previne timing attacks).
    """
    secret = app_secret or os.environ["APP_SECRET"]

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            signature = request.headers.get("X-Hub-Signature-256", "")
            if not signature:
                abort(401, "Missing signature header")

            raw_body = request.get_data()
            expected = "sha256=" + hmac.new(
                secret.encode(), raw_body, hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(signature, expected):
                abort(401, "Invalid signature")

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def verify_webhook(verify_token: str | None = None):
    """
    Handle webhook verification (GET request from Meta).
    Returns the challenge to confirm the webhook endpoint.
    """
    token = verify_token or os.environ["VERIFY_TOKEN"]

    mode = request.args.get("hub.mode")
    req_token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode != "subscribe" or req_token != token:
        abort(403, "Verification failed")

    if not challenge or not _SAFE_CHALLENGE_RE.fullmatch(challenge):
        abort(400, "Invalid challenge")

    return Response(challenge, status=200, mimetype="text/plain")


def parse_webhook_payload(data: dict[str, Any]) -> dict[str, list]:
    """
    Parse webhook payload and extract messages and status updates.

    Returns dict with 'messages' and 'statuses' lists.
    """
    messages: list[dict] = []
    statuses: list[dict] = []

    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            if "messages" in value:
                messages.extend(value["messages"])
            if "statuses" in value:
                statuses.extend(value["statuses"])

    return {"messages": messages, "statuses": statuses}


def extract_message_content(message: dict[str, Any]) -> dict[str, Any]:
    """
    Extract readable content from an incoming message.

    Returns dict with 'type' and relevant fields (text, button_id, media_id, etc.).
    """
    msg_type = message.get("type", "unknown")

    if msg_type == "text":
        return {"type": "text", "text": message.get("text", {}).get("body")}

    if msg_type == "interactive":
        interactive = message.get("interactive", {})
        int_type = interactive.get("type")

        if int_type == "button_reply":
            reply = interactive.get("button_reply", {})
            return {"type": "button", "button_id": reply.get("id"), "text": reply.get("title")}

        if int_type == "list_reply":
            reply = interactive.get("list_reply", {})
            return {"type": "list", "list_id": reply.get("id"), "text": reply.get("title")}

        if int_type == "nfm_reply":
            return {
                "type": "flow",
                "text": interactive.get("nfm_reply", {}).get("response_json"),
            }

        return {"type": "interactive"}

    if msg_type in ("image", "document", "video", "audio"):
        media_data = message.get(msg_type, {})
        return {"type": msg_type, "media_id": media_data.get("id")}

    if msg_type == "location":
        loc = message.get("location", {})
        return {
            "type": "location",
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
        }

    if msg_type == "reaction":
        reaction = message.get("reaction", {})
        return {
            "type": "reaction",
            "emoji": reaction.get("emoji"),
            "message_id": reaction.get("message_id"),
        }

    return {"type": msg_type}
