"""
Pesquisa e tracking de hashtags do Instagram.

Uso:
    python scripts/hashtags.py --search "artificialintelligence" --limit 25
    python scripts/hashtags.py --top "tecnologia"
    python scripts/hashtags.py --info "marketing"
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
from governance import GovernanceManager, RateLimitExceeded

db = Database()
db.init()
gov = GovernanceManager(db)


async def search_hashtag(hashtag: str, limit: int = 25, mode: str = "recent") -> None:
    """Busca posts com uma hashtag."""
    await auto_refresh_if_needed()

    account = db.get_active_account()
    if not account:
        print(json.dumps({"error": "Nenhuma conta configurada"}, indent=2))
        return

    # Verificar rate limit de hashtags
    try:
        gov.check_rate_limit("search_hashtag", account["id"])
    except RateLimitExceeded as e:
        print(json.dumps(e.to_dict(), indent=2))
        return

    api = InstagramAPI()

    # Step 1: Buscar ID da hashtag
    search_result = await api.search_hashtag(hashtag)
    hashtag_data = search_result.get("data", [])
    if not hashtag_data:
        print(json.dumps({"error": f"Hashtag '{hashtag}' não encontrada"}, indent=2))
        await api.close()
        return

    hashtag_id = hashtag_data[0]["id"]

    # Registrar busca
    db.insert_hashtag_search({
        "account_id": account["id"],
        "hashtag": hashtag,
        "ig_hashtag_id": hashtag_id,
    })

    # Step 2: Buscar posts
    if mode == "top":
        result = await api.get_hashtag_top_media(hashtag_id, limit=limit)
    else:
        result = await api.get_hashtag_recent_media(hashtag_id, limit=limit)

    await api.close()

    # Contagem de buscas na semana
    weekly_count = db.count_hashtag_searches_last_week(account["id"])

    output = {
        "hashtag": hashtag,
        "hashtag_id": hashtag_id,
        "mode": mode,
        "results": result.get("data", []),
        "total": len(result.get("data", [])),
        "hashtag_searches_this_week": weekly_count,
        "hashtag_searches_limit": 30,
    }
    print(json.dumps(output, indent=2, ensure_ascii=False))


async def hashtag_info(hashtag: str) -> None:
    """Info de uma hashtag (apenas o ID — media_count requer permissões especiais)."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.search_hashtag(hashtag)
    await api.close()
    print(json.dumps({"hashtag": hashtag, "data": result.get("data", [])}, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Hashtags do Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--search", metavar="TAG", help="Buscar posts recentes com hashtag")
    group.add_argument("--top", metavar="TAG", help="Top posts de uma hashtag")
    group.add_argument("--info", metavar="TAG", help="Info da hashtag")
    parser.add_argument("--limit", type=int, default=25, help="Limite de resultados")
    args = parser.parse_args()

    if args.search:
        asyncio.run(search_hashtag(args.search, args.limit, mode="recent"))
    elif args.top:
        asyncio.run(search_hashtag(args.top, args.limit, mode="top"))
    elif args.info:
        asyncio.run(hashtag_info(args.info))


if __name__ == "__main__":
    main()
