"""
Autenticação OAuth 2.0 para Instagram Graph API.

Uso:
    python scripts/auth.py --setup                # Configuração inicial completa
    python scripts/auth.py --refresh              # Renovar token
    python scripts/auth.py --status               # Ver status do token
    python scripts/auth.py --revoke               # Revogar token

O fluxo:
    1. Usuário fornece App ID e App Secret (do Facebook Developer Console)
    2. Script abre browser para autorização OAuth
    3. Servidor local (localhost:8765) captura o redirect com o code
    4. Troca code por token curto (1hr) → token longo (60 dias)
    5. Descobre Instagram User ID via Facebook Pages
    6. Salva tudo no banco SQLite (accounts table)
"""
from __future__ import annotations

import argparse
import asyncio
import html
import json
import os
import sys
import webbrowser
from datetime import datetime, timedelta, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).parent))

import httpx

from config import (
    GRAPH_API_BASE,
    OAUTH_AUTHORIZE_URL,
    OAUTH_REDIRECT_PORT,
    OAUTH_REDIRECT_URI,
    OAUTH_SCOPES,
    OAUTH_TOKEN_URL,
)
from db import Database

db = Database()
db.init()


def _mask_secret(value: str, keep: int = 4) -> str:
    """Mask secret-like values before showing them in terminal output."""
    if not value:
        return "(hidden)"
    if len(value) <= keep:
        return "*" * len(value)
    return f"{value[:keep]}...masked"


# ── OAuth Callback Server ────────────────────────────────────────────────────

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """Servidor HTTP mínimo para capturar o callback OAuth."""
    authorization_code: Optional[str] = None

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if "code" in params:
            OAuthCallbackHandler.authorization_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"<html><body><h2>Autorizado com sucesso!</h2>"
                b"<p>Pode fechar esta janela e voltar ao terminal.</p></body></html>"
            )
        elif "error" in params:
            error = params.get("error_description", params.get("error", ["desconhecido"]))[0]
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            safe_error = html.escape(error, quote=True)
            self.wfile.write(f"<html><body><h2>Erro: {safe_error}</h2></body></html>".encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # silencia logs do servidor


def wait_for_oauth_code() -> Optional[str]:
    """Inicia servidor local e espera pelo código de autorização."""
    server = HTTPServer(("localhost", OAUTH_REDIRECT_PORT), OAuthCallbackHandler)
    server.timeout = 120  # 2 minutos
    print("Aguardando autorização no callback OAuth local...")
    print("(Timeout: 2 minutos)\n")

    while OAuthCallbackHandler.authorization_code is None:
        server.handle_request()
        if OAuthCallbackHandler.authorization_code is not None:
            break

    server.server_close()
    return OAuthCallbackHandler.authorization_code


# ── Token Exchange ────────────────────────────────────────────────────────────

async def exchange_code_for_short_token(
    code: str, app_id: str, app_secret: str,
) -> dict:
    """Troca authorization code por short-lived token (~1hr)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            OAUTH_TOKEN_URL,
            params={
                "client_id": app_id,
                "redirect_uri": OAUTH_REDIRECT_URI,
                "client_secret": app_secret,
                "code": code,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def exchange_for_long_lived_token(
    short_token: str, app_id: str, app_secret: str,
) -> dict:
    """Troca short-lived token por long-lived token (60 dias)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            OAUTH_TOKEN_URL,
            params={
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": short_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_long_lived_token(access_token: str, app_id: str, app_secret: str) -> dict:
    """Renova um long-lived token (deve ter mais de 24hr e menos de 60 dias)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            OAUTH_TOKEN_URL,
            params={
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": access_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


# ── Instagram User Discovery ─────────────────────────────────────────────────

async def discover_instagram_account(access_token: str) -> dict:
    """
    Descobre o Instagram Business/Creator account via Facebook Pages.
    Retorna: {ig_user_id, username, account_type, facebook_page_id}
    """
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Listar Facebook Pages
        resp = await client.get(
            f"{GRAPH_API_BASE}/me/accounts",
            params={"access_token": access_token, "fields": "id,name,access_token"},
        )
        resp.raise_for_status()
        pages = resp.json().get("data", [])

        if not pages:
            raise ValueError(
                "Nenhuma Facebook Page encontrada. "
                "Crie uma Facebook Page e vincule à sua conta Instagram."
            )

        # 2. Para cada page, verificar se tem Instagram Business Account
        for page in pages:
            page_id = page["id"]
            resp = await client.get(
                f"{GRAPH_API_BASE}/{page_id}",
                params={
                    "access_token": access_token,
                    "fields": "instagram_business_account",
                },
            )
            resp.raise_for_status()
            ig_account = resp.json().get("instagram_business_account")

            if ig_account:
                ig_user_id = ig_account["id"]
                # 3. Buscar detalhes da conta Instagram
                resp = await client.get(
                    f"{GRAPH_API_BASE}/{ig_user_id}",
                    params={
                        "access_token": access_token,
                        "fields": "id,username,account_type,name,profile_picture_url,"
                                  "followers_count,follows_count,media_count",
                    },
                )
                resp.raise_for_status()
                ig_info = resp.json()
                return {
                    "ig_user_id": ig_user_id,
                    "username": ig_info.get("username"),
                    "account_type": ig_info.get("account_type", "BUSINESS"),
                    "facebook_page_id": page_id,
                    "profile": ig_info,
                }

        raise ValueError(
            "Nenhuma conta Instagram Business/Creator vinculada às Facebook Pages encontradas. "
            "Vincule sua conta Instagram a uma Facebook Page nas configurações do Instagram."
        )


# ── Auto-Refresh ──────────────────────────────────────────────────────────────

async def auto_refresh_if_needed(account_id: Optional[int] = None) -> Optional[str]:
    """
    Verifica se o token está próximo de expirar (< 7 dias) e renova.
    Retorna o token atual (renovado ou não).
    """
    account = db.get_active_account() if account_id is None else db.get_account_by_id(account_id)
    if not account:
        return None

    token = account["access_token"]
    expires_at = account.get("token_expires_at")

    if not expires_at:
        return token

    try:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return token

    now = datetime.now(timezone.utc)
    days_left = (expiry - now).days

    if days_left <= 7:
        print(f"Token expira em {days_left} dias. Renovando...")
        try:
            result = await refresh_long_lived_token(
                token, account["app_id"], account["app_secret"]
            )
            new_token = result["access_token"]
            new_expires = (now + timedelta(seconds=result.get("expires_in", 5184000))).isoformat()
            db.update_token(account["id"], new_token, new_expires)
            print(f"Token renovado. Nova expiração: {new_expires[:10]}")
            return new_token
        except Exception as e:
            print(f"AVISO: Falha ao renovar token: {e}")
            return token

    return token


# ── Setup Flow ────────────────────────────────────────────────────────────────

async def setup() -> None:
    """Fluxo completo de setup OAuth."""
    print("=" * 60)
    print("CONFIGURAÇÃO OAUTH - INSTAGRAM GRAPH API")
    print("=" * 60)
    print()
    print("Você precisa de um Meta App com o produto Instagram Graph API.")
    print("Crie em: https://developers.facebook.com/apps/")
    print()

    # App credentials
    app_id = os.environ.get("INSTAGRAM_APP_ID") or input("App ID: ").strip()
    app_secret = os.environ.get("INSTAGRAM_APP_SECRET") or input("App Secret: ").strip()

    if not app_id or not app_secret:
        print("ERRO: App ID e App Secret são obrigatórios.")
        sys.exit(1)

    # Construir URL de autorização
    scopes = ",".join(OAUTH_SCOPES)
    auth_url = (
        f"{OAUTH_AUTHORIZE_URL}?"
        f"client_id={app_id}&"
        f"redirect_uri={OAUTH_REDIRECT_URI}&"
        f"scope={scopes}&"
        f"response_type=code"
    )

    print("\nAbrindo browser para autorização...")
    print("A URL de autorização e o App ID não serão exibidos para evitar vazamento de credenciais.\n")
    webbrowser.open(auth_url)

    # Esperar callback
    OAuthCallbackHandler.authorization_code = None
    code = wait_for_oauth_code()

    if not code:
        print("ERRO: Timeout ou falha na autorização.")
        sys.exit(1)

    print("Código de autorização recebido. Trocando por token...")

    # Trocar por short-lived token
    short_result = await exchange_code_for_short_token(code, app_id, app_secret)
    short_token = short_result["access_token"]
    print("Token curto obtido.")

    # Trocar por long-lived token
    long_result = await exchange_for_long_lived_token(short_token, app_id, app_secret)
    long_token = long_result["access_token"]
    expires_in = long_result.get("expires_in", 5184000)  # 60 dias default
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
    print(f"Token longo obtido. Expira em: {expires_at[:10]}")

    # Descobrir conta Instagram
    print("Buscando conta Instagram vinculada...")
    ig_info = await discover_instagram_account(long_token)

    # Salvar no banco
    account_id = db.upsert_account({
        "ig_user_id": ig_info["ig_user_id"],
        "username": ig_info["username"],
        "account_type": ig_info["account_type"],
        "access_token": long_token,
        "token_expires_at": expires_at,
        "facebook_page_id": ig_info["facebook_page_id"],
        "app_id": app_id,
        "app_secret": app_secret,
    })

    print()
    print("=" * 60)
    print("CONFIGURAÇÃO CONCLUÍDA")
    print("=" * 60)
    profile = ig_info.get("profile", {})
    print(f"  Conta: @{ig_info['username']}")
    print(f"  Tipo: {ig_info['account_type']}")
    print(f"  Seguidores: {profile.get('followers_count', '?')}")
    print(f"  Posts: {profile.get('media_count', '?')}")
    print(f"  Token expira: {expires_at[:10]}")
    print(f"  Account ID (interno): {account_id}")
    print()
    print("Pronto! Use 'python scripts/status.py' para verificar.")


async def show_status() -> None:
    """Mostra status da autenticação."""
    account = db.get_active_account()
    if not account:
        print(json.dumps({"status": "not_configured", "message": "Nenhuma conta configurada. Execute: python scripts/auth.py --setup"}, indent=2))
        return

    expires_at = account.get("token_expires_at", "")
    now = datetime.now(timezone.utc)
    try:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        days_left = (expiry - now).days
        token_status = "valid" if days_left > 0 else "expired"
    except (ValueError, AttributeError):
        days_left = -1
        token_status = "unknown"

    result = {
        "status": token_status,
        "username": account["username"],
        "account_type": account["account_type"],
        "ig_user_id": account["ig_user_id"],
        "token_expires_at": expires_at,
        "days_remaining": days_left,
        "auto_refresh": days_left <= 7 if days_left >= 0 else False,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


async def do_refresh() -> None:
    """Força renovação do token."""
    token = await auto_refresh_if_needed()
    if token:
        print("Token renovado com sucesso.")
        await show_status()
    else:
        print("Nenhuma conta configurada para renovar.")


def main():
    parser = argparse.ArgumentParser(description="Autenticação OAuth Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--setup", action="store_true", help="Configuração inicial completa")
    group.add_argument("--refresh", action="store_true", help="Renovar token")
    group.add_argument("--status", action="store_true", help="Ver status do token")
    group.add_argument("--revoke", action="store_true", help="Revogar token (desativar conta)")
    args = parser.parse_args()

    if args.setup:
        asyncio.run(setup())
    elif args.refresh:
        asyncio.run(do_refresh())
    elif args.status:
        asyncio.run(show_status())
    elif args.revoke:
        account = db.get_active_account()
        if account:
            db._connect().execute("UPDATE accounts SET is_active = 0 WHERE id = ?", [account["id"]])
            print(f"Conta @{account['username']} desativada.")
        else:
            print("Nenhuma conta ativa para revogar.")


if __name__ == "__main__":
    main()
