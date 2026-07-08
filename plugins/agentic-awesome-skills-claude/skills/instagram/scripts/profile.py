"""
Visualização e gestão do perfil Instagram.

Uso:
    python scripts/profile.py --view     # Ver perfil completo
    python scripts/profile.py --json     # Saída JSON
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


async def view_profile(as_json: bool = False) -> None:
    """Busca e exibe perfil do Instagram."""
    await auto_refresh_if_needed()

    api = InstagramAPI()
    profile = await api.get_user_profile()
    await api.close()

    if as_json:
        print(json.dumps(profile, indent=2, ensure_ascii=False))
        return

    print()
    print("=" * 50)
    print(f"  @{profile.get('username', '?')}")
    print("=" * 50)
    print(f"  Nome:        {profile.get('name', '-')}")
    print(f"  Tipo:        {profile.get('account_type', '-')}")
    print(f"  Bio:         {profile.get('biography', '-')}")
    print(f"  Website:     {profile.get('website', '-')}")
    print(f"  Seguidores:  {profile.get('followers_count', 0):,}")
    print(f"  Seguindo:    {profile.get('follows_count', 0):,}")
    print(f"  Posts:       {profile.get('media_count', 0):,}")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(description="Perfil Instagram")
    parser.add_argument("--view", action="store_true", default=True, help="Ver perfil")
    parser.add_argument("--json", action="store_true", help="Saída em JSON")
    args = parser.parse_args()

    asyncio.run(view_profile(as_json=args.json))


if __name__ == "__main__":
    main()
