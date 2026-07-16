"""
Orquestrador de publicação: processa posts approved/scheduled.

Uso:
    python scripts/schedule.py --process           # Publica posts prontos
    python scripts/schedule.py --list              # Lista posts pendentes
    python scripts/schedule.py --cancel --id 5     # Cancela agendamento
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
from db import Database, normalize_media_type, normalize_post_status
from governance import GovernanceManager, RateLimitExceeded

db = Database()
db.init()
gov = GovernanceManager(db)


async def process_pending() -> None:
    """Processa todos os posts approved/scheduled prontos para publicar."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    account = db.get_active_account()
    if not account:
        print(json.dumps({"error": "Nenhuma conta configurada"}, indent=2))
        return

    posts = db.get_posts_for_publishing(account["id"])
    if not posts:
        print(json.dumps({"message": "Nenhum post pendente para publicar", "count": 0}, indent=2))
        return

    print(f"Processando {len(posts)} posts...")
    results = []

    for post in posts:
        post_id = post["id"]
        post_status = normalize_post_status(post["status"])
        media_type = normalize_media_type(post["media_type"])
        try:
            gov.check_rate_limit(f"publish_{media_type.lower()}", account["id"])
        except RateLimitExceeded as e:
            results.append({"post_id": post_id, "status": "rate_limited", "error": str(e)})
            break

        try:
            # Recovery: se já tem container criado, tenta publicar direto
            if post_status == "container_created" and post.get("ig_container_id"):
                result = await api.publish_media(post["ig_container_id"])
                ig_media_id = result.get("id")
                details = await api.get_media_details(ig_media_id)
                db.update_post_status(
                    post_id, "published",
                    ig_media_id=ig_media_id,
                    permalink=details.get("permalink", ""),
                    published_at=details.get("timestamp", ""),
                )
                results.append({"post_id": post_id, "status": "published", "ig_media_id": ig_media_id})
                continue

            # Publicação normal
            media_url = post.get("media_url", "")
            if not media_url and post.get("local_path"):
                media_url = await api.upload_to_imgur(post["local_path"])
                db.update_post_status(post_id, post_status, media_url=media_url)

            ig_type_map = {"PHOTO": "IMAGE", "VIDEO": "VIDEO", "REEL": "REELS", "STORY": "STORIES"}
            ig_type = ig_type_map.get(media_type, "IMAGE")

            if media_type == "CAROUSEL":
                results.append({"post_id": post_id, "status": "skipped", "reason": "Carrosséis precisam ser publicados via publish.py"})
                continue

            # Step 1: Container
            container_params = {"caption": post.get("caption")}
            if ig_type == "IMAGE":
                container_params["media_type"] = "IMAGE"
                container_params["image_url"] = media_url
            else:
                container_params["media_type"] = ig_type
                container_params["video_url"] = media_url

            container = await api.create_media_container(**container_params)
            container_id = container["id"]
            db.update_post_status(post_id, "container_created", ig_container_id=container_id)

            # Para vídeos, aguardar processamento
            if media_type in ("VIDEO", "REEL"):
                for _ in range(60):
                    status = await api.check_container_status(container_id)
                    if status.get("status_code") == "FINISHED":
                        break
                    if status.get("status_code") == "ERROR":
                        raise Exception(status.get("status", "Erro no processamento"))
                    await asyncio.sleep(5)

            # Step 2: Publicar
            result = await api.publish_media(container_id)
            ig_media_id = result.get("id")
            details = await api.get_media_details(ig_media_id)
            permalink = details.get("permalink", "")

            db.update_post_status(
                post_id, "published",
                ig_media_id=ig_media_id,
                permalink=permalink,
                published_at=details.get("timestamp", ""),
            )

            gov.log_action(
                f"publish_{media_type.lower()}",
                params={"post_id": post_id},
                result={"ig_media_id": ig_media_id, "permalink": permalink},
                account_id=account["id"],
            )

            results.append({"post_id": post_id, "status": "published", "ig_media_id": ig_media_id, "permalink": permalink})

        except Exception as e:
            db.update_post_status(post_id, "failed", error_msg=str(e))
            results.append({"post_id": post_id, "status": "failed", "error": str(e)})

    await api.close()
    print(json.dumps({"processed": len(results), "results": results}, indent=2, ensure_ascii=False))


async def list_pending() -> None:
    """Lista posts pendentes."""
    account = db.get_active_account()
    if not account:
        print(json.dumps({"error": "Nenhuma conta configurada"}, indent=2))
        return

    drafts = db.get_posts(account_id=account["id"], status="draft")
    approved = db.get_posts(account_id=account["id"], status="approved")
    scheduled = db.get_posts(account_id=account["id"], status="scheduled")
    failed = db.get_posts(account_id=account["id"], status="failed")

    print(json.dumps({
        "draft": {"count": len(drafts), "posts": drafts},
        "approved": {"count": len(approved), "posts": approved},
        "scheduled": {"count": len(scheduled), "posts": scheduled},
        "failed": {"count": len(failed), "posts": failed},
    }, indent=2, ensure_ascii=False))


async def cancel_post(post_id: int) -> None:
    """Cancela um post (move para status cancelled)."""
    post = db.get_post_by_id(post_id)
    if not post:
        print(json.dumps({"error": f"Post {post_id} não encontrado"}, indent=2))
        return
    if post["status"] == "published":
        print(json.dumps({"error": "Não é possível cancelar post já publicado"}, indent=2))
        return
    db.update_post_status(post_id, "draft")
    print(json.dumps({"status": "cancelled", "post_id": post_id}, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Agendamento de posts Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--process", action="store_true", help="Processar posts pendentes")
    group.add_argument("--list", action="store_true", help="Listar posts pendentes")
    group.add_argument("--cancel", action="store_true", help="Cancelar agendamento")
    parser.add_argument("--id", type=int, help="ID do post (para --cancel)")
    args = parser.parse_args()

    if args.process:
        asyncio.run(process_pending())
    elif args.list:
        asyncio.run(list_pending())
    elif args.cancel:
        if not args.id:
            parser.error("--id é obrigatório com --cancel")
        asyncio.run(cancel_post(args.id))


if __name__ == "__main__":
    main()
