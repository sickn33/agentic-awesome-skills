"""
Sync completo: busca perfil, mídia, insights e comentários do Instagram.

Uso:
    python scripts/run_all.py                    # Sync completo
    python scripts/run_all.py --only media       # Só mídia
    python scripts/run_all.py --only insights    # Só insights
    python scripts/run_all.py --only comments    # Só comentários
    python scripts/run_all.py --dry-run          # Mostra o que seria feito
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from api_client import InstagramAPI
from auth import auto_refresh_if_needed
from db import Database, normalize_media_type

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

db = Database()
db.init()


async def sync_profile(api: InstagramAPI) -> dict:
    """Sync perfil."""
    logger.info("Buscando perfil...")
    profile = await api.get_user_profile()
    logger.info("Perfil: @%s (%s)", profile.get("username"), profile.get("account_type"))
    return {"status": "ok", "username": profile.get("username")}


async def sync_media(api: InstagramAPI, limit: int = 50) -> dict:
    """Sync mídia recente."""
    logger.info("Buscando %d mídias recentes...", limit)
    result = await api.get_user_media(limit=limit)
    media_list = result.get("data", [])

    # Salvar como posts publicados
    count = 0
    for m in media_list:
        existing = db.get_posts(account_id=api.account_id, limit=1000)
        existing_ig_ids = {p["ig_media_id"] for p in existing if p.get("ig_media_id")}

        if m["id"] not in existing_ig_ids:
            db.insert_post({
                "account_id": api.account_id,
                "media_type": normalize_media_type(m.get("media_type", "IMAGE")),
                "media_url": m.get("media_url", ""),
                "caption": m.get("caption", ""),
                "status": "published",
                "published_at": m.get("timestamp", ""),
                "ig_media_id": m["id"],
                "permalink": m.get("permalink", ""),
            })
            count += 1

    logger.info("Mídia: %d encontradas, %d novas salvas", len(media_list), count)
    return {"status": "ok", "found": len(media_list), "new": count}


async def sync_insights(api: InstagramAPI, limit: int = 20) -> dict:
    """Sync insights dos posts recentes."""
    logger.info("Buscando insights de %d posts...", limit)
    media_result = await api.get_user_media(limit=limit)
    media_list = media_result.get("data", [])

    success = 0
    errors = 0
    for m in media_list:
        try:
            metrics = ["impressions", "reach", "engagement", "saved"]
            if m.get("media_type") == "VIDEO":
                metrics.append("video_views")
            insights = await api.get_media_insights(m["id"], metrics=metrics)

            raw = json.dumps(insights, ensure_ascii=False)
            for item in insights.get("data", []):
                values = item.get("values", [{}])
                value = values[0].get("value", 0) if values else 0
                db.insert_insights([{
                    "account_id": api.account_id,
                    "ig_media_id": m["id"],
                    "metric_name": item.get("name", ""),
                    "metric_value": float(value) if isinstance(value, (int, float)) else 0,
                    "period": item.get("period", ""),
                    "raw_json": raw,
                }])
            success += 1
        except Exception as e:
            errors += 1
            logger.warning("Insights para %s: %s", m["id"], e)

    logger.info("Insights: %d OK, %d erros", success, errors)
    return {"status": "ok", "success": success, "errors": errors}


async def sync_comments(api: InstagramAPI, limit: int = 10) -> dict:
    """Sync comentários dos posts recentes."""
    logger.info("Buscando comentários dos últimos %d posts...", limit)
    media_result = await api.get_user_media(limit=limit)
    media_list = media_result.get("data", [])

    total_comments = 0
    for m in media_list:
        try:
            comments_result = await api.get_comments(m["id"], limit=50)
            comments = comments_result.get("data", [])

            for c in comments:
                db.upsert_comments([{
                    "account_id": api.account_id,
                    "ig_comment_id": c["id"],
                    "ig_media_id": m["id"],
                    "username": c.get("username", ""),
                    "text": c.get("text", ""),
                    "timestamp": c.get("timestamp", ""),
                }])
            total_comments += len(comments)
        except Exception as e:
            logger.warning("Comentários para %s: %s", m["id"], e)

    logger.info("Comentários: %d salvos", total_comments)
    return {"status": "ok", "total": total_comments}


async def run(only: list = None, dry_run: bool = False, limit: int = 50) -> None:
    tasks = only or ["profile", "media", "insights", "comments"]

    if dry_run:
        print(f"\n[DRY-RUN] Sync que seria executado: {', '.join(tasks)}")
        return

    await auto_refresh_if_needed()
    api = InstagramAPI()

    logger.info("Iniciando sync: %s", ", ".join(tasks))
    results = {}

    try:
        if "profile" in tasks:
            results["profile"] = await sync_profile(api)
        if "media" in tasks:
            results["media"] = await sync_media(api, limit=limit)
        if "insights" in tasks:
            results["insights"] = await sync_insights(api, limit=min(limit, 20))
        if "comments" in tasks:
            results["comments"] = await sync_comments(api, limit=min(limit, 10))
    finally:
        await api.close()

    # Resumo
    print("\n" + "=" * 60)
    print("SYNC COMPLETO")
    print("=" * 60)
    for task, result in results.items():
        print(f"  {task}: {json.dumps(result, ensure_ascii=False)}")
    print("=" * 60)

    stats = db.get_stats()
    print(f"\nBanco: {json.dumps(stats, indent=2, ensure_ascii=False)}")


def main():
    parser = argparse.ArgumentParser(description="Sync completo do Instagram")
    parser.add_argument("--only", nargs="+", choices=["profile", "media", "insights", "comments"],
                        help="Executar apenas tarefas específicas")
    parser.add_argument("--limit", type=int, default=50, help="Limite de mídia a buscar")
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que seria feito")
    args = parser.parse_args()

    asyncio.run(run(only=args.only, dry_run=args.dry_run, limit=args.limit))


if __name__ == "__main__":
    main()
