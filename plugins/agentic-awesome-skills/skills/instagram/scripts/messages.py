"""
Mensagens diretas do Instagram (DMs).

Uso:
    python scripts/messages.py --send --user-id 12345 --text "Olá!"
    python scripts/messages.py --conversations
    python scripts/messages.py --thread --conversation-id 12345
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from api_client import InstagramAPI
from auth import auto_refresh_if_needed
from db import Database
from governance import GovernanceManager

db = Database()
db.init()
gov = GovernanceManager(db)


async def send_message(user_id: str, text: str) -> None:
    """Envia DM para um usuário."""
    await auto_refresh_if_needed()

    if gov.requires_confirmation("send_dm"):
        result = gov.create_confirmation_request(
            "send_dm",
            {"recipient_id": user_id, "text": text},
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    api = InstagramAPI()
    result = await api.send_message(user_id, text)
    await api.close()

    account = db.get_active_account()
    gov.log_action(
        "send_dm",
        params={"recipient_id": user_id, "text": text},
        result=result,
        account_id=account["id"] if account else None,
    )

    print(json.dumps({"status": "sent", "result": result}, indent=2, ensure_ascii=False))


async def list_conversations(limit: int = 20) -> None:
    """Lista conversas recentes."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.get_conversations(limit=limit)
    await api.close()
    print(json.dumps(result, indent=2, ensure_ascii=False))


async def show_thread(conversation_id: str) -> None:
    """Mostra mensagens de uma conversa."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.get(
        f"{conversation_id}/messages",
        params={"fields": "id,message,from,created_time"},
        action="get_thread",
    )
    await api.close()
    print(json.dumps(result, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="DMs do Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--send", action="store_true", help="Enviar DM")
    group.add_argument("--conversations", action="store_true", help="Listar conversas")
    group.add_argument("--thread", action="store_true", help="Ver mensagens de uma conversa")
    parser.add_argument("--user-id", help="ID do destinatário")
    parser.add_argument("--text", help="Texto da mensagem")
    parser.add_argument("--conversation-id", help="ID da conversa")
    parser.add_argument("--limit", type=int, default=20, help="Limite")
    args = parser.parse_args()

    if args.send:
        if not args.user_id or not args.text:
            parser.error("--user-id e --text são obrigatórios com --send")
        asyncio.run(send_message(args.user_id, args.text))
    elif args.conversations:
        asyncio.run(list_conversations(args.limit))
    elif args.thread:
        if not args.conversation_id:
            parser.error("--conversation-id é obrigatório com --thread")
        asyncio.run(show_thread(args.conversation_id))


if __name__ == "__main__":
    main()
