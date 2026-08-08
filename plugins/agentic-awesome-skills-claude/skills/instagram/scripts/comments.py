"""
Gestão de comentários do Instagram.

Uso:
    python scripts/comments.py --list --media-id 12345
    python scripts/comments.py --reply --comment-id 67890 --text "Obrigado!"
    python scripts/comments.py --delete --comment-id 67890
    python scripts/comments.py --mentions
    python scripts/comments.py --unreplied
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


async def list_comments(media_id: str, limit: int = 50) -> None:
    """Lista comentários de um post."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.get_comments(media_id, limit=limit)
    await api.close()

    comments = result.get("data", [])

    # Salvar no banco
    account = db.get_active_account()
    if account:
        for c in comments:
            db.upsert_comments([{
                "account_id": account["id"],
                "ig_comment_id": c["id"],
                "ig_media_id": media_id,
                "username": c.get("username", ""),
                "text": c.get("text", ""),
                "timestamp": c.get("timestamp", ""),
            }])

    print(json.dumps({"total": len(comments), "comments": comments}, indent=2, ensure_ascii=False))


async def reply_to_comment(comment_id: str, text: str) -> None:
    """Responde a um comentário."""
    await auto_refresh_if_needed()

    if gov.requires_confirmation("reply_comment"):
        result = gov.create_confirmation_request(
            "reply_comment",
            {"comment_id": comment_id, "reply_text": text},
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    api = InstagramAPI()
    result = await api.reply_to_comment(comment_id, text)
    await api.close()

    gov.log_action(
        "reply_comment",
        params={"comment_id": comment_id, "text": text},
        result=result,
        account_id=db.get_active_account()["id"] if db.get_active_account() else None,
    )

    print(json.dumps({"status": "replied", "result": result}, indent=2, ensure_ascii=False))


async def delete_comment(comment_id: str) -> None:
    """Deleta um comentário."""
    await auto_refresh_if_needed()

    if gov.requires_confirmation("delete_comment"):
        result = gov.create_confirmation_request(
            "delete_comment",
            {"comment_id": comment_id},
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    api = InstagramAPI()
    result = await api.delete_comment(comment_id)
    await api.close()

    gov.log_action(
        "delete_comment",
        params={"comment_id": comment_id},
        result=result,
        account_id=db.get_active_account()["id"] if db.get_active_account() else None,
    )

    print(json.dumps({"status": "deleted", "comment_id": comment_id}, indent=2, ensure_ascii=False))


async def show_mentions(limit: int = 25) -> None:
    """Mostra menções recentes."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.get_mentions(limit=limit)
    await api.close()
    print(json.dumps(result, indent=2, ensure_ascii=False))


async def show_unreplied() -> None:
    """Mostra comentários não respondidos."""
    account = db.get_active_account()
    if not account:
        print(json.dumps({"error": "Nenhuma conta configurada"}, indent=2))
        return
    comments = db.get_comments(account_id=account["id"], unreplied_only=True)
    print(json.dumps({"total": len(comments), "unreplied": comments}, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Comentários do Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list", action="store_true", help="Listar comentários")
    group.add_argument("--reply", action="store_true", help="Responder comentário")
    group.add_argument("--delete", action="store_true", help="Deletar comentário")
    group.add_argument("--mentions", action="store_true", help="Ver menções")
    group.add_argument("--unreplied", action="store_true", help="Comentários não respondidos")
    parser.add_argument("--media-id", help="ID da mídia")
    parser.add_argument("--comment-id", help="ID do comentário")
    parser.add_argument("--text", help="Texto da resposta")
    parser.add_argument("--limit", type=int, default=50, help="Limite de resultados")
    args = parser.parse_args()

    if args.list:
        if not args.media_id:
            parser.error("--media-id é obrigatório com --list")
        asyncio.run(list_comments(args.media_id, args.limit))
    elif args.reply:
        if not args.comment_id or not args.text:
            parser.error("--comment-id e --text são obrigatórios com --reply")
        asyncio.run(reply_to_comment(args.comment_id, args.text))
    elif args.delete:
        if not args.comment_id:
            parser.error("--comment-id é obrigatório com --delete")
        asyncio.run(delete_comment(args.comment_id))
    elif args.mentions:
        asyncio.run(show_mentions(args.limit))
    elif args.unreplied:
        asyncio.run(show_unreplied())


if __name__ == "__main__":
    main()
