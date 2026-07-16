"""
Listagem e detalhes de mídia do Instagram.

Uso:
    python scripts/media.py --list [--limit 10]
    python scripts/media.py --details --media-id 12345
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


async def list_media(limit: int = 25, after: str = None) -> None:
    """Lista mídia do usuário."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.get_user_media(limit=limit, after=after)
    await api.close()

    data = result.get("data", [])
    print(json.dumps({
        "total": len(data),
        "media": data,
        "paging": result.get("paging", {}),
    }, indent=2, ensure_ascii=False))


async def media_details(media_id: str) -> None:
    """Detalhes de uma mídia específica."""
    await auto_refresh_if_needed()
    api = InstagramAPI()
    result = await api.get_media_details(media_id)
    await api.close()
    print(json.dumps(result, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Mídia do Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list", action="store_true", help="Listar mídia")
    group.add_argument("--details", action="store_true", help="Detalhes de uma mídia")
    parser.add_argument("--limit", type=int, default=25, help="Limite de resultados")
    parser.add_argument("--media-id", help="ID da mídia")
    parser.add_argument("--after", help="Cursor de paginação")
    args = parser.parse_args()

    if args.list:
        asyncio.run(list_media(args.limit, args.after))
    elif args.details:
        if not args.media_id:
            parser.error("--media-id é obrigatório com --details")
        asyncio.run(media_details(args.media_id))


if __name__ == "__main__":
    main()
