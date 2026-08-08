"""WhatsApp Cloud API - Flask Application with Webhook Handler."""

import asyncio
import logging
import os

from dotenv import load_dotenv
from flask import Flask, request, jsonify

from whatsapp_client import WhatsAppClient
from webhook_handler import (
    validate_hmac_signature,
    verify_webhook,
    parse_webhook_payload,
    extract_message_content,
)

load_dotenv()

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Initialize WhatsApp client
whatsapp = WhatsAppClient()


def _is_debug_enabled() -> bool:
    """Allow debug only when explicitly enabled for local development."""
    return os.environ.get("FLASK_DEBUG", "").lower() in {"1", "true", "yes", "on"}


# === Webhook Routes ===


@app.route("/webhook", methods=["GET"])
def webhook_verify():
    """Handle webhook verification (GET challenge from Meta)."""
    return verify_webhook()


@app.route("/webhook", methods=["POST"])
@validate_hmac_signature()
def webhook_receive():
    """Handle incoming messages and status updates."""
    data = request.get_json()

    # Parse webhook payload
    parsed = parse_webhook_payload(data)

    # Process messages
    for message in parsed["messages"]:
        asyncio.run(handle_incoming_message(message))

    # Process status updates
    for status in parsed["statuses"]:
        handle_status_update(status)

    # Always return 200 within 5 seconds
    return "OK", 200


# === Message Handler ===


async def handle_incoming_message(message: dict) -> None:
    """Process an incoming message and send a response."""
    from_number = message["from"]
    content = extract_message_content(message)

    logger.info("Received WhatsApp message")

    # Mark as read
    await whatsapp.mark_as_read(message["id"])

    # Example responses intentionally avoid reflecting user-provided content.
    match content["type"]:
        case "text":
            await whatsapp.send_text(from_number, "Recebi sua mensagem. Como posso ajudar?")

        case "button":
            await whatsapp.send_text(from_number, "Recebi sua selecao com sucesso.")

        case "list":
            await whatsapp.send_text(from_number, "Recebi sua escolha com sucesso.")

        case "image" | "document" | "video" | "audio":
            await whatsapp.send_text(from_number, "Recebi sua midia com sucesso.")

        case _:
            await whatsapp.send_text(from_number, "Desculpe, nao entendi. Como posso ajudar?")


# === Status Handler ===


def handle_status_update(status: dict) -> None:
    """Process a message status update."""
    logger.info("WhatsApp status update id=%s status=%s", status["id"], status["status"])

    if status["status"] == "failed":
        errors = status.get("errors", [])
        logger.warning("WhatsApp message delivery failed with %d error(s)", len(errors))


# === Health Check ===


@app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


# === Start Server ===

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    logger.info("WhatsApp webhook server running on port %s", port)
    logger.info("Webhook URL: http://localhost:%s/webhook", port)
    logger.info("Health check: http://localhost:%s/health", port)
    # Keep debug disabled by default so the boilerplate is safe in shared environments.
    app.run(host="0.0.0.0", port=port, debug=_is_debug_enabled())
