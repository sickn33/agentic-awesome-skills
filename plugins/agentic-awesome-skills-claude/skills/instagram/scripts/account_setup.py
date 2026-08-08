"""
Configuração e verificação de conta Instagram.

Uso:
    python scripts/account_setup.py --check     # Detecta tipo de conta
    python scripts/account_setup.py --guide     # Guia de setup/migração
    python scripts/account_setup.py --verify    # Verifica pré-requisitos
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from api_client import InstagramAPI, InstagramAPIError
from db import Database

db = Database()
db.init()


async def check_account() -> None:
    """Detecta tipo de conta e status."""
    account = db.get_active_account()
    if not account:
        print(json.dumps({
            "status": "not_configured",
            "message": "Nenhuma conta configurada.",
            "next_step": "Execute: python scripts/auth.py --setup",
        }, indent=2, ensure_ascii=False))
        return

    try:
        api = InstagramAPI()
        profile = await api.get_user_profile()
        await api.close()

        result = {
            "status": "ok",
            "username": profile.get("username"),
            "account_type": profile.get("account_type"),
            "name": profile.get("name"),
            "followers": profile.get("followers_count"),
            "following": profile.get("follows_count"),
            "posts": profile.get("media_count"),
            "biography": profile.get("biography"),
            "website": profile.get("website"),
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))

    except InstagramAPIError as e:
        print(json.dumps({
            "status": "error",
            "error": str(e),
            "code": e.code,
            "suggestion": "Token pode estar expirado. Execute: python scripts/auth.py --refresh",
        }, indent=2, ensure_ascii=False))
    except ValueError as e:
        print(json.dumps({
            "status": "not_configured",
            "error": str(e),
        }, indent=2, ensure_ascii=False))


def show_guide() -> None:
    """Mostra guia de setup/migração."""
    account = db.get_active_account()

    checklist = []
    checklist.append(("Facebook account", "OK" if True else "PENDENTE",
                      "Crie em: https://www.facebook.com"))
    checklist.append(("Instagram account", "OK" if account else "PENDENTE",
                      "Crie em: https://www.instagram.com"))

    account_type = account.get("account_type") if account else None
    is_business = account_type in ("BUSINESS", "CREATOR") if account_type else False
    checklist.append((
        f"Conta Business/Creator (atual: {account_type or '?'})",
        "OK" if is_business else "PENDENTE",
        "Precisa ser Business ou Creator para usar a API",
    ))

    has_page = bool(account.get("facebook_page_id")) if account else False
    checklist.append(("Facebook Page vinculada", "OK" if has_page else "PENDENTE",
                      "Vincule uma Page à sua conta Instagram"))

    has_token = bool(account.get("access_token")) if account else False
    checklist.append(("Token OAuth", "OK" if has_token else "PENDENTE",
                      "Execute: python scripts/auth.py --setup"))

    print()
    print("=" * 65)
    print("CHECKLIST DE CONFIGURAÇÃO - INSTAGRAM")
    print("=" * 65)

    for item, status, hint in checklist:
        icon = "[OK]" if status == "OK" else "[!!]"
        print(f"  {icon}  {item}")
        if status != "OK":
            print(f"       -> {hint}")

    print()

    if not is_business:
        print("-" * 65)
        print("COMO MIGRAR PARA CONTA BUSINESS:")
        print("-" * 65)
        print("""
  1. Abra o app Instagram → Configurações → Conta
  2. Toque em "Mudar para conta profissional"
  3. Selecione "Business" (para empresas) ou "Creator" (para criadores)
  4. Conecte à sua Facebook Page (ou crie uma)
  5. Após migrar, execute: python scripts/account_setup.py --check
""")

    if not has_page:
        print("-" * 65)
        print("COMO CRIAR/VINCULAR FACEBOOK PAGE:")
        print("-" * 65)
        print("""
  1. Acesse: https://www.facebook.com/pages/create
  2. Crie uma Page para seu negócio/marca
  3. No Instagram: Configurações → Conta → Contas vinculadas → Facebook
  4. Vincule a Page recém-criada
  5. Execute: python scripts/auth.py --setup
""")

    if not has_token:
        print("-" * 65)
        print("COMO CONFIGURAR O META APP:")
        print("-" * 65)
        print("""
  1. Acesse: https://developers.facebook.com/apps/
  2. Clique "Criar App" → Selecione "Business"
  3. Em "Adicionar Produtos", adicione "Instagram Graph API"
  4. No painel, copie App ID e App Secret
  5. Execute: python scripts/auth.py --setup
  6. Cole o App ID e App Secret quando solicitado
""")


async def verify_setup() -> None:
    """Verifica se todos os pré-requisitos estão OK."""
    checks = []

    # 1. Conta no banco
    account = db.get_active_account()
    checks.append({
        "check": "Conta configurada",
        "passed": account is not None,
        "detail": f"@{account['username']}" if account else "Nenhuma conta",
    })

    if not account:
        print(json.dumps({"checks": checks, "all_passed": False}, indent=2))
        return

    # 2. Token válido
    try:
        api = InstagramAPI()
        profile = await api.get_user_profile()
        checks.append({
            "check": "Token válido",
            "passed": True,
            "detail": f"Conta @{profile.get('username')} acessível",
        })
    except Exception as e:
        checks.append({
            "check": "Token válido",
            "passed": False,
            "detail": str(e),
        })
        print(json.dumps({"checks": checks, "all_passed": False}, indent=2))
        return

    # 3. Tipo de conta
    acct_type = profile.get("account_type", "UNKNOWN")
    checks.append({
        "check": "Conta Business/Creator",
        "passed": acct_type in ("BUSINESS", "CREATOR"),
        "detail": f"Tipo: {acct_type}",
    })

    # 4. Facebook Page vinculada
    checks.append({
        "check": "Facebook Page vinculada",
        "passed": bool(account.get("facebook_page_id")),
        "detail": f"Page ID: {account.get('facebook_page_id', 'N/A')}",
    })

    # 5. Permissões básicas (tenta buscar mídia)
    try:
        media = await api.get_user_media(limit=1)
        checks.append({
            "check": "Permissão instagram_basic",
            "passed": True,
            "detail": "OK - pode ler mídia",
        })
    except Exception:
        checks.append({
            "check": "Permissão instagram_basic",
            "passed": False,
            "detail": "Sem permissão para ler mídia",
        })

    await api.close()

    all_passed = all(c["passed"] for c in checks)
    print(json.dumps({"checks": checks, "all_passed": all_passed}, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Configuração de conta Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="Detecta tipo de conta")
    group.add_argument("--guide", action="store_true", help="Guia de setup/migração")
    group.add_argument("--verify", action="store_true", help="Verifica pré-requisitos")
    args = parser.parse_args()

    if args.check:
        asyncio.run(check_account())
    elif args.guide:
        show_guide()
    elif args.verify:
        asyncio.run(verify_setup())


if __name__ == "__main__":
    main()
