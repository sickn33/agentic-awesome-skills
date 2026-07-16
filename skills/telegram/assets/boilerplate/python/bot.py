#!/usr/bin/env python3
"""
Telegram Bot - Long Polling Mode

Usage:
    python bot.py
"""

import os
import logging
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, filters, ContextTypes
)

load_dotenv()
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)


# --- Command Handlers ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user = update.effective_user
    await update.message.reply_html(
        f"Ola, <b>{user.first_name}</b>! Bem-vindo ao bot.\n\n"
        "Comandos disponiveis:\n"
        "/start - Iniciar\n"
        "/help - Ajuda\n"
        "/about - Sobre o bot\n"
        "/menu - Menu interativo"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    await update.message.reply_html(
        "<b>Comandos:</b>\n"
        "/start - Iniciar o bot\n"
        "/help - Ver esta mensagem\n"
        "/about - Informacoes sobre o bot\n"
        "/menu - Menu interativo com botoes"
    )


async def about(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /about command."""
    bot_info = await context.bot.get_me()
    await update.message.reply_html(
        f"<b>{bot_info.first_name}</b>\n"
        f"@{bot_info.username}\n\n"
        "Bot criado com python-telegram-bot e Telegram Bot API"
    )


async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /menu command with inline keyboard."""
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("Opcao 1", callback_data="opt1"),
         InlineKeyboardButton("Opcao 2", callback_data="opt2")],
        [InlineKeyboardButton("Opcao 3", callback_data="opt3")],
        [InlineKeyboardButton("Visitar site", url="https://core.telegram.org/bots")]
    ])
    await update.message.reply_text("Escolha uma opcao:", reply_markup=keyboard)


# --- Callback Handler ---

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline keyboard callbacks."""
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(f"Voce escolheu: {query.data}")


# --- Message Handler ---

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Echo non-command messages."""
    if update.message and update.message.text:
        await update.message.reply_text(f"Voce disse: {update.message.text}")


# --- Error Handler ---

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """Log errors."""
    logger.error("Exception while handling update:", exc_info=context.error)


# --- Main ---

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("Set TELEGRAM_BOT_TOKEN in .env file")
        return

    app = Application.builder().token(token).build()

    # Register handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("about", about))
    app.add_handler(CommandHandler("menu", menu))
    app.add_handler(CallbackQueryHandler(button_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    app.add_error_handler(error_handler)

    # Start polling
    logger.info("Bot starting in polling mode...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
