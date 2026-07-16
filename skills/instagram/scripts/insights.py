"""
Analytics e insights do Instagram.

Uso:
    python scripts/insights.py --media --media-id 12345
    python scripts/insights.py --user --period day --since 7
    python scripts/insights.py --fetch-all --limit 20
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from api_client import InstagramAPI
from auth import auto_refresh_if_needed
from db import Database

db = Database()
db.init()


async def media_insights(media_id: str, metrics: list = None) -> None:
    """Busca insights de um post específico."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    try:
        result = await api.get_media_insights(media_id, metrics=metrics)
    except Exception as e:
        print(json.dumps({"error": str(e), "media_id": media_id}, indent=2))
        await api.close()
        return

    # Salvar no banco
    account = db.get_active_account()
    if account:
        raw = json.dumps(result, ensure_ascii=False)
        for item in result.get("data", []):
            values = item.get("values", [{}])
            value = values[0].get("value", 0) if values else 0
            db.insert_insights([{
                "account_id": account["id"],
                "ig_media_id": media_id,
                "metric_name": item.get("name", ""),
                "metric_value": float(value) if isinstance(value, (int, float)) else 0,
                "period": item.get("period", ""),
                "raw_json": raw,
            }])

    await api.close()
    print(json.dumps(result, indent=2, ensure_ascii=False))


async def user_insights(period: str = "day", since_days: int = 7, metrics: list = None) -> None:
    """Busca insights da conta."""
    await auto_refresh_if_needed()
    api = InstagramAPI()

    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=since_days)).strftime("%Y-%m-%d")
    until = now.strftime("%Y-%m-%d")

    result = await api.get_user_insights(
        period=period,
        metrics=metrics,
        since=since,
        until=until,
    )

    # Salvar no banco
    account = db.get_active_account()
    if account:
        for item in result.get("data", []):
            for value_entry in item.get("values", []):
                db.insert_user_insights([{
                    "account_id": account["id"],
                    "metric_name": item.get("name", ""),
                    "metric_value": float(value_entry.get("value", 0)),
                    "period": period,
                    "end_time": value_entry.get("end_time", ""),
                }])

    await api.close()
    print(json.dumps(result, indent=2, ensure_ascii=False))


async def fetch_all_insights(limit: int = 20) -> None:
    """Busca insights de todos os posts recentes."""
    await auto_refresh_if_needed()
    api = InstagramAPI()

    media_result = await api.get_user_media(limit=limit)
    media_list = media_result.get("data", [])

    results = []
    for media in media_list:
        media_id = media["id"]
        media_type = media.get("media_type", "IMAGE")
        try:
            # Métricas variam por tipo
            metrics = ["impressions", "reach", "engagement", "saved"]
            if media_type == "VIDEO":
                metrics.append("video_views")
            if media_type == "REELS" or "reel" in media.get("permalink", "").lower():
                metrics = ["impressions", "reach", "likes", "comments", "saves", "shares", "plays"]

            insights = await api.get_media_insights(media_id, metrics=metrics)

            # Salvar
            account = db.get_active_account()
            if account:
                raw = json.dumps(insights, ensure_ascii=False)
                for item in insights.get("data", []):
                    values = item.get("values", [{}])
                    value = values[0].get("value", 0) if values else 0
                    db.insert_insights([{
                        "account_id": account["id"],
                        "ig_media_id": media_id,
                        "metric_name": item.get("name", ""),
                        "metric_value": float(value) if isinstance(value, (int, float)) else 0,
                        "period": item.get("period", ""),
                        "raw_json": raw,
                    }])

            results.append({
                "media_id": media_id,
                "type": media_type,
                "caption": (media.get("caption", "") or "")[:50],
                "metrics": {
                    d["name"]: d["values"][0]["value"] if d.get("values") else 0
                    for d in insights.get("data", [])
                },
            })
        except Exception as e:
            results.append({"media_id": media_id, "error": str(e)})

    await api.close()
    print(json.dumps({"fetched": len(results), "insights": results}, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Insights do Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--media", action="store_true", help="Insights de um post")
    group.add_argument("--user", action="store_true", help="Insights da conta")
    group.add_argument("--fetch-all", action="store_true", help="Buscar insights de todos os posts recentes")
    parser.add_argument("--media-id", help="ID da mídia")
    parser.add_argument("--period", default="day", choices=["day", "week", "days_28", "month", "lifetime"])
    parser.add_argument("--since", type=int, default=7, help="Dias atrás (default: 7)")
    parser.add_argument("--metrics", nargs="+", help="Métricas específicas")
    parser.add_argument("--limit", type=int, default=20, help="Limite de posts para --fetch-all")
    args = parser.parse_args()

    if args.media:
        if not args.media_id:
            parser.error("--media-id é obrigatório com --media")
        asyncio.run(media_insights(args.media_id, args.metrics))
    elif args.user:
        asyncio.run(user_insights(args.period, args.since, args.metrics))
    elif args.fetch_all:
        asyncio.run(fetch_all_insights(args.limit))


if __name__ == "__main__":
    main()
