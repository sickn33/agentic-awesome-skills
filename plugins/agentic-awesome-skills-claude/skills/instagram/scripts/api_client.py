"""
Cliente da Instagram Graph API com retry, rate limiting e logging integrados.

Uso:
    from api_client import InstagramAPI

    api = InstagramAPI()
    profile = await api.get_user_profile()
    media = await api.get_user_media(limit=10)
    await api.close()
"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent))

import httpx

from config import (
    GRAPH_API_BASE,
    IMGUR_CLIENT_ID,
    IMGUR_UPLOAD_URL,
    MAX_RETRIES,
    REQUEST_TIMEOUT,
    RETRY_BACKOFF_BASE,
)
from db import Database
from governance import GovernanceManager, RateLimitExceeded

logger = logging.getLogger(__name__)


class InstagramAPIError(Exception):
    """Erro da Instagram Graph API."""

    def __init__(self, message: str, code: Optional[int] = None, subcode: Optional[int] = None):
        self.code = code
        self.subcode = subcode
        super().__init__(message)

    def is_rate_limit(self) -> bool:
        return self.code in (4, 17, 32)

    def is_permission_error(self) -> bool:
        return self.code in (10, 200, 190)


class InstagramAPI:
    """Wrapper da Instagram Graph API com governança integrada."""

    def __init__(
        self,
        account_id: Optional[int] = None,
        db: Optional[Database] = None,
        governance: Optional[GovernanceManager] = None,
    ):
        self._db = db or Database()
        self._db.init()
        self._gov = governance or GovernanceManager(self._db)
        self._client: Optional[httpx.AsyncClient] = None

        # Carregar conta
        if account_id:
            self._account = self._db.get_account_by_id(account_id)
        else:
            self._account = self._db.get_active_account()

        if not self._account:
            raise ValueError(
                "Nenhuma conta Instagram configurada. Execute: python scripts/auth.py --setup"
            )

        self.account_id = self._account["id"]
        self.ig_user_id = self._account["ig_user_id"]
        self.access_token = self._account["access_token"]

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Core Request ──────────────────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        action_name: str = "api_call",
    ) -> Dict[str, Any]:
        """
        Faz request à Graph API com retry, rate limiting e logging.
        """
        # Verificar rate limit
        self._gov.check_rate_limit(action_name, self.account_id)

        url = f"{GRAPH_API_BASE}/{endpoint}" if not endpoint.startswith("http") else endpoint
        params = params or {}
        params["access_token"] = self.access_token

        client = await self._get_client()

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                if method.upper() == "POST":
                    resp = await client.post(url, params=params, data=data)
                elif method.upper() == "DELETE":
                    resp = await client.delete(url, params=params)
                else:
                    resp = await client.get(url, params=params)

                # Parse response
                result = resp.json()

                # Verificar erro da API
                if "error" in result:
                    error = result["error"]
                    api_error = InstagramAPIError(
                        message=error.get("message", "Unknown error"),
                        code=error.get("code"),
                        subcode=error.get("error_subcode"),
                    )
                    if api_error.is_rate_limit():
                        logger.warning("Rate limit da API atingido (code %s). Aguardando...", api_error.code)
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(60)  # espera 1 min para rate limits da API
                            continue
                    if api_error.is_permission_error():
                        raise api_error  # não faz retry para erros de permissão
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(RETRY_BACKOFF_BASE ** attempt)
                        continue
                    raise api_error

                resp.raise_for_status()

                # Log da ação
                self._gov.log_action(
                    action=action_name,
                    params={"endpoint": endpoint, "method": method},
                    result={"status": resp.status_code},
                    account_id=self.account_id,
                )

                return result

            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "HTTP %s em %s (tentativa %d/%d)",
                    exc.response.status_code, url, attempt, MAX_RETRIES,
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_BACKOFF_BASE ** attempt)
                else:
                    raise

            except (httpx.RequestError, httpx.TimeoutException) as exc:
                logger.warning(
                    "Erro de request em %s: %s (tentativa %d/%d)",
                    url, exc, attempt, MAX_RETRIES,
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_BACKOFF_BASE ** attempt)
                else:
                    raise

        raise InstagramAPIError("Falha após todas as tentativas")

    async def get(self, endpoint: str, params: Optional[Dict] = None, action: str = "api_get") -> Dict:
        return await self._request("GET", endpoint, params=params, action_name=action)

    async def post(self, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None, action: str = "api_post") -> Dict:
        return await self._request("POST", endpoint, params=params, data=data, action_name=action)

    async def delete(self, endpoint: str, params: Optional[Dict] = None, action: str = "api_delete") -> Dict:
        return await self._request("DELETE", endpoint, params=params, action_name=action)

    # ── User / Profile ────────────────────────────────────────────────────────

    async def get_user_profile(self) -> Dict[str, Any]:
        """Busca informações do perfil da conta Instagram."""
        return await self.get(
            f"{self.ig_user_id}",
            params={
                "fields": "id,username,name,account_type,profile_picture_url,"
                          "biography,followers_count,follows_count,media_count,website",
            },
            action="get_profile",
        )

    # ── Media ─────────────────────────────────────────────────────────────────

    async def get_user_media(
        self, limit: int = 25, after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Lista mídia do usuário com paginação."""
        params = {
            "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,"
                      "timestamp,like_count,comments_count",
            "limit": str(limit),
        }
        if after:
            params["after"] = after
        return await self.get(f"{self.ig_user_id}/media", params=params, action="get_media")

    async def get_media_details(self, media_id: str) -> Dict[str, Any]:
        """Busca detalhes de uma mídia específica."""
        return await self.get(
            media_id,
            params={
                "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,"
                          "timestamp,like_count,comments_count,children{id,media_type,media_url}",
            },
            action="get_media_details",
        )

    # ── Publishing (2-step) ───────────────────────────────────────────────────

    async def create_media_container(
        self,
        media_type: str = "IMAGE",
        image_url: Optional[str] = None,
        video_url: Optional[str] = None,
        caption: Optional[str] = None,
        location_id: Optional[str] = None,
        user_tags: Optional[List[Dict]] = None,
        is_carousel_item: bool = False,
        cover_url: Optional[str] = None,
        share_to_feed: bool = True,
        children: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Cria container de mídia (step 1 do publish)."""
        data: Dict[str, Any] = {}

        if media_type == "IMAGE":
            data["image_url"] = image_url
        elif media_type == "VIDEO":
            data["media_type"] = "VIDEO"
            data["video_url"] = video_url
        elif media_type == "REELS":
            data["media_type"] = "REELS"
            data["video_url"] = video_url
            if cover_url:
                data["cover_url"] = cover_url
            data["share_to_feed"] = str(share_to_feed).lower()
        elif media_type == "STORIES":
            if image_url:
                data["image_url"] = image_url
            elif video_url:
                data["video_url"] = video_url
                data["media_type"] = "VIDEO"
        elif media_type == "CAROUSEL":
            data["media_type"] = "CAROUSEL"
            if children:
                data["children"] = ",".join(children)

        if caption and not is_carousel_item:
            data["caption"] = caption
        if location_id:
            data["location_id"] = location_id
        if user_tags:
            data["user_tags"] = json.dumps(user_tags)
        if is_carousel_item:
            data["is_carousel_item"] = "true"

        return await self.post(
            f"{self.ig_user_id}/media",
            data=data,
            action=f"create_container_{media_type.lower()}",
        )

    async def check_container_status(self, container_id: str) -> Dict[str, Any]:
        """Verifica status de um container (usado para vídeos que precisam processar)."""
        return await self.get(
            container_id,
            params={"fields": "status_code,status"},
            action="check_container",
        )

    async def publish_media(self, container_id: str) -> Dict[str, Any]:
        """Publica um container (step 2 do publish)."""
        return await self.post(
            f"{self.ig_user_id}/media_publish",
            data={"creation_id": container_id},
            action="publish_media",
        )

    # ── Comments ──────────────────────────────────────────────────────────────

    async def get_comments(
        self, media_id: str, limit: int = 50, after: Optional[str] = None,
    ) -> Dict[str, Any]:
        params = {
            "fields": "id,text,username,timestamp,replies{id,text,username,timestamp}",
            "limit": str(limit),
        }
        if after:
            params["after"] = after
        return await self.get(f"{media_id}/comments", params=params, action="get_comments")

    async def reply_to_comment(self, comment_id: str, text: str) -> Dict[str, Any]:
        return await self.post(
            f"{comment_id}/replies",
            data={"message": text},
            action="reply_comment",
        )

    async def delete_comment(self, comment_id: str) -> Dict[str, Any]:
        return await self.delete(comment_id, action="delete_comment")

    async def get_mentions(self, limit: int = 25) -> Dict[str, Any]:
        return await self.get(
            f"{self.ig_user_id}/tags",
            params={"fields": "id,caption,media_type,permalink,timestamp", "limit": str(limit)},
            action="get_mentions",
        )

    # ── Insights ──────────────────────────────────────────────────────────────

    async def get_media_insights(
        self, media_id: str, metrics: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not metrics:
            metrics = ["impressions", "reach", "engagement", "saved", "shares"]
        return await self.get(
            f"{media_id}/insights",
            params={"metric": ",".join(metrics)},
            action="get_media_insights",
        )

    async def get_user_insights(
        self,
        period: str = "day",
        metrics: Optional[List[str]] = None,
        since: Optional[str] = None,
        until: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not metrics:
            metrics = ["impressions", "reach", "follower_count", "profile_views"]
        params: Dict[str, str] = {
            "metric": ",".join(metrics),
            "period": period,
        }
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        return await self.get(
            f"{self.ig_user_id}/insights",
            params=params,
            action="get_user_insights",
        )

    # ── Hashtags ──────────────────────────────────────────────────────────────

    async def search_hashtag(self, hashtag: str) -> Dict[str, Any]:
        """Busca o ID de uma hashtag."""
        return await self.get(
            "ig_hashtag_search",
            params={"q": hashtag, "user_id": self.ig_user_id},
            action="search_hashtag",
        )

    async def get_hashtag_recent_media(
        self, hashtag_id: str, limit: int = 25,
    ) -> Dict[str, Any]:
        return await self.get(
            f"{hashtag_id}/recent_media",
            params={
                "user_id": self.ig_user_id,
                "fields": "id,caption,media_type,permalink,timestamp,like_count,comments_count",
                "limit": str(limit),
            },
            action="get_hashtag_media",
        )

    async def get_hashtag_top_media(
        self, hashtag_id: str, limit: int = 25,
    ) -> Dict[str, Any]:
        return await self.get(
            f"{hashtag_id}/top_media",
            params={
                "user_id": self.ig_user_id,
                "fields": "id,caption,media_type,permalink,timestamp,like_count,comments_count",
                "limit": str(limit),
            },
            action="get_hashtag_top",
        )

    # ── Messaging ─────────────────────────────────────────────────────────────

    async def send_message(self, recipient_id: str, text: str) -> Dict[str, Any]:
        return await self.post(
            f"{self.ig_user_id}/messages",
            data={
                "recipient": json.dumps({"id": recipient_id}),
                "message": json.dumps({"text": text}),
            },
            action="send_dm",
        )

    async def get_conversations(self, limit: int = 20) -> Dict[str, Any]:
        return await self.get(
            f"{self.ig_user_id}/conversations",
            params={
                "fields": "id,participants,updated_time",
                "limit": str(limit),
                "platform": "instagram",
            },
            action="get_conversations",
        )

    # ── Imgur Upload (mídia local → URL pública) ──────────────────────────────

    async def upload_to_imgur(self, file_path: str) -> str:
        """
        Faz upload de arquivo local para o Imgur (anônimo).
        Retorna a URL pública da imagem.
        """
        client = await self._get_client()
        with open(file_path, "rb") as f:
            resp = await client.post(
                IMGUR_UPLOAD_URL,
                headers={"Authorization": f"Client-ID {IMGUR_CLIENT_ID}"},
                files={"image": f},
            )
        resp.raise_for_status()
        data = resp.json()
        if data.get("success"):
            url = data["data"]["link"]
            logger.info("Upload Imgur: %s → %s", file_path, url)
            return url
        raise InstagramAPIError(f"Imgur upload falhou: {data}")
