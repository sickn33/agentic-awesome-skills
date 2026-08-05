#!/usr/bin/env python3
"""
Telegram Bot - Webhook Mode with Flask

Usage:
    python webhook_server.py
"""

import html
import os
import hmac
import re
import logging
import asyncio
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters

load_dotenv()
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
PORT = int(os.getenv("PORT", "5000"))

flask_app = Flask(__name__)

# Build the application
application = Application.builder().token(TOKEN).build()


# --- Handlers (same as bot.py) ---

async def start(update: Update, context):
    await update.message.reply_html(
        f"Ola, <b>{html.escape(update.effective_user.first_name or '')}</b>! Bot ativo via webhook."
    )

async def echo(update: Update, context):
    if update.message and update.message.text:
        await update.message.reply_text(f"Voce disse: {update.message.text}")

# Register handlers
application.add_handler(CommandHandler("start", start))
application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))


# --- Flask Routes ---

@flask_app.route("/webhook", methods=["POST"])
def webhook():
    """Handle incoming Telegram updates."""
    # Validate secret token
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if not secret or not hmac.compare_digest(secret, WEBHOOK_SECRET):
        logger.warning("Invalid secret token received")
        return "Forbidden", 403

    update = Update.de_json(request.get_json(), application.bot)

    # Process update asynchronously
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(application.process_update(update))
    finally:
        loop.close()

    return "OK", 200


@flask_app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify(status="ok", mode="webhook")


# --- Setup ---

def register_webhook():
    """Register webhook with Telegram."""
    import requests as req
    url = f"https://api.telegram.org/bot{TOKEN}/setWebhook"
    resp = req.post(url, json={
        "url": f"{WEBHOOK_URL.rstrip('/')}/webhook",
        "allowed_updates": ["message", "callback_query", "inline_query"],
        "secret_token": WEBHOOK_SECRET,
        "max_connections": 40
    })
    data = resp.json()
    if data.get("ok"):
        logger.info(f"Webhook registered: {WEBHOOK_URL}/webhook/***")
    else:
        logger.error(f"Failed to register webhook: {data}")


if __name__ == "__main__":
    if not TOKEN:
        logger.error("Set TELEGRAM_BOT_TOKEN in .env")
        exit(1)
    if not WEBHOOK_URL:
        logger.error("Set WEBHOOK_URL in .env")
        exit(1)
    if len(WEBHOOK_SECRET) < 32 or len(WEBHOOK_SECRET) > 256 or not re.fullmatch(r"[A-Za-z0-9_-]+", WEBHOOK_SECRET):
        logger.error("Set WEBHOOK_SECRET to 32-256 random characters using letters, digits, _ or -")
        exit(1)

    register_webhook()
    logger.info(f"Starting webhook server on port {PORT}")
    flask_app.run(host="0.0.0.0", port=PORT)
