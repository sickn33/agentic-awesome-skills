#!/usr/bin/env python3
"""Run a Telegram webhook behind an HTTPS reverse proxy.

The library owns initialization, one event loop and graceful shutdown.
Requires python-telegram-bot[webhooks]; no network activity occurs on import.
"""
import html
import os
import re
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

logger = logging.getLogger(__name__)


async def start(update: Update, context):
    await update.message.reply_html(
        f"Ola, <b>{html.escape(update.effective_user.first_name or '')}</b>! Bot ativo via webhook."
    )


async def echo(update: Update, context):
    if update.message and update.message.text:
        await update.message.reply_text(f"Voce disse: {update.message.text}")


def main():
    load_dotenv()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    base_url = os.environ.get("WEBHOOK_URL", "").rstrip("/")
    secret = os.environ.get("WEBHOOK_SECRET", "")
    if not token or not base_url.startswith("https://"):
        raise ValueError("Set TELEGRAM_BOT_TOKEN and an HTTPS WEBHOOK_URL")
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,256}", secret):
        raise ValueError("Set WEBHOOK_SECRET to 32-256 random letters, digits, _ or -")
    port = int(os.environ.get("PORT", "5000"))
    if not 1 <= port <= 65535:
        raise ValueError("PORT must be between 1 and 65535")
    application = Application.builder().token(token).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    application.run_webhook(
        listen="127.0.0.1", port=port, url_path="webhook",
        webhook_url=f"{base_url}/webhook", secret_token=secret,
        allowed_updates=["message"], drop_pending_updates=False,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    main()
