"""
Governança: rate limiting, audit log e confirmações para ações do Instagram.

Rate limits são rastreados via SQLite (action_log table).
Confirmações usam padrão 2-step: retorna JSON com requires_confirmation,
Claude apresenta ao usuário, e na segunda chamada com --confirm executa.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from config import (
    ACTION_CATEGORIES,
    RATE_LIMIT_DMS_PER_HOUR,
    RATE_LIMIT_HASHTAGS_PER_WEEK,
    RATE_LIMIT_PUBLISHES_PER_DAY,
    RATE_LIMIT_REQUESTS_PER_HOUR,
    RATE_LIMIT_WARNING_THRESHOLD,
)
from db import Database


class RateLimitExceeded(Exception):
    """Limite de taxa excedido."""

    def __init__(self, limit_type: str, current: int, maximum: int, retry_after_seconds: int):
        self.limit_type = limit_type
        self.current = current
        self.maximum = maximum
        self.retry_after_seconds = retry_after_seconds
        super().__init__(
            f"Rate limit '{limit_type}' excedido: {current}/{maximum}. "
            f"Tente novamente em {retry_after_seconds}s."
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": "rate_limit_exceeded",
            "limit_type": self.limit_type,
            "current": self.current,
            "maximum": self.maximum,
            "retry_after_seconds": self.retry_after_seconds,
        }


class GovernanceManager:
    """Gerencia rate limits, logging e confirmações."""

    def __init__(self, db: Optional[Database] = None):
        self.db = db or Database()
        self.db.init()

    # ── Rate Limiting ─────────────────────────────────────────────────────────

    def check_rate_limit(self, action: str, account_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Verifica rate limits antes de uma ação.
        Retorna dict com remaining e warnings.
        Raises RateLimitExceeded se o limite foi atingido.
        """
        requests_used = self.db.count_requests_last_hour()
        publishes_used = self.db.count_publishes_today()

        result = {
            "requests": {
                "used": requests_used,
                "limit": RATE_LIMIT_REQUESTS_PER_HOUR,
                "remaining": RATE_LIMIT_REQUESTS_PER_HOUR - requests_used,
            },
            "publishes": {
                "used": publishes_used,
                "limit": RATE_LIMIT_PUBLISHES_PER_DAY,
                "remaining": RATE_LIMIT_PUBLISHES_PER_DAY - publishes_used,
            },
            "warnings": [],
        }

        # Verificar limite de requests
        if requests_used >= RATE_LIMIT_REQUESTS_PER_HOUR:
            raise RateLimitExceeded(
                "requests_per_hour", requests_used,
                RATE_LIMIT_REQUESTS_PER_HOUR, 3600,
            )

        # Verificar limite de publicações
        if action.startswith("publish_") and publishes_used >= RATE_LIMIT_PUBLISHES_PER_DAY:
            raise RateLimitExceeded(
                "publishes_per_day", publishes_used,
                RATE_LIMIT_PUBLISHES_PER_DAY, 86400,
            )

        # Verificar limite de hashtags
        if action == "search_hashtag" and account_id:
            hashtag_count = self.db.count_hashtag_searches_last_week(account_id)
            result["hashtags"] = {
                "used": hashtag_count,
                "limit": RATE_LIMIT_HASHTAGS_PER_WEEK,
                "remaining": RATE_LIMIT_HASHTAGS_PER_WEEK - hashtag_count,
            }
            if hashtag_count >= RATE_LIMIT_HASHTAGS_PER_WEEK:
                raise RateLimitExceeded(
                    "hashtags_per_week", hashtag_count,
                    RATE_LIMIT_HASHTAGS_PER_WEEK, 604800,
                )

        # Warnings em 90% do limite
        if requests_used >= RATE_LIMIT_REQUESTS_PER_HOUR * RATE_LIMIT_WARNING_THRESHOLD:
            result["warnings"].append(
                f"Atenção: {requests_used}/{RATE_LIMIT_REQUESTS_PER_HOUR} requests na última hora"
            )
        if publishes_used >= RATE_LIMIT_PUBLISHES_PER_DAY * RATE_LIMIT_WARNING_THRESHOLD:
            result["warnings"].append(
                f"Atenção: {publishes_used}/{RATE_LIMIT_PUBLISHES_PER_DAY} publicações hoje"
            )

        return result

    def get_rate_status(self) -> Dict[str, Any]:
        """Retorna status atual de todos os rate limits."""
        return {
            "requests_per_hour": {
                "used": self.db.count_requests_last_hour(),
                "limit": RATE_LIMIT_REQUESTS_PER_HOUR,
            },
            "publishes_per_day": {
                "used": self.db.count_publishes_today(),
                "limit": RATE_LIMIT_PUBLISHES_PER_DAY,
            },
        }

    # ── Action Logging ────────────────────────────────────────────────────────

    def log_action(
        self,
        action: str,
        params: Optional[Dict] = None,
        result: Optional[Dict] = None,
        confirmed: bool = True,
        account_id: Optional[int] = None,
    ) -> None:
        """Registra uma ação no audit log."""
        rate_status = self.get_rate_status()
        self.db.log_action({
            "account_id": account_id,
            "action": action,
            "params": json.dumps(params, ensure_ascii=False) if params else None,
            "result": json.dumps(result, ensure_ascii=False) if result else None,
            "confirmed": 1 if confirmed else 0,
            "rate_remaining": json.dumps(rate_status),
        })

    # ── Confirmation ──────────────────────────────────────────────────────────

    def requires_confirmation(self, action: str) -> bool:
        """Verifica se uma ação requer confirmação do usuário."""
        for category in ("ENGAGE", "PUBLISH", "DELETE", "MESSAGE"):
            if action in ACTION_CATEGORIES.get(category, []):
                return True
        return False

    def get_confirmation_category(self, action: str) -> str:
        """Retorna a categoria de confirmação de uma ação."""
        for category, actions in ACTION_CATEGORIES.items():
            if action in actions:
                return category
        return "READ"

    def create_confirmation_request(
        self,
        action: str,
        details: Dict[str, Any],
        account_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pedido de confirmação para o Claude apresentar ao usuário.
        Retorna JSON estruturado com action_id para confirmar depois.
        """
        action_id = str(uuid.uuid4())[:8]
        rate_status = self.get_rate_status()

        return {
            "requires_confirmation": True,
            "action_id": action_id,
            "action": action,
            "category": self.get_confirmation_category(action),
            "details": details,
            "rate_limits": rate_status,
            "message": self._format_confirmation_message(action, details, rate_status),
        }

    def _format_confirmation_message(
        self, action: str, details: Dict[str, Any], rate_status: Dict[str, Any],
    ) -> str:
        """Formata mensagem de confirmação legível."""
        category = self.get_confirmation_category(action)
        action_names = {
            "publish_photo": "PUBLICAR uma foto",
            "publish_video": "PUBLICAR um vídeo",
            "publish_reel": "PUBLICAR um reel",
            "publish_story": "PUBLICAR um story",
            "publish_carousel": "PUBLICAR um carrossel",
            "schedule_post": "AGENDAR uma publicação",
            "reply_comment": "RESPONDER a um comentário",
            "delete_comment": "DELETAR um comentário",
            "hide_comment": "OCULTAR um comentário",
            "send_dm": "ENVIAR uma mensagem direta",
        }
        action_desc = action_names.get(action, action)

        lines = [f"[CONFIRMAÇÃO] Prestes a {action_desc}:"]
        for key, value in details.items():
            if value is not None:
                lines.append(f"  {key}: {value}")

        req = rate_status["requests_per_hour"]
        pub = rate_status["publishes_per_day"]
        lines.append(f"\n  Rate limits: {req['used']}/{req['limit']} requests/hr, "
                      f"{pub['used']}/{pub['limit']} publicações/dia")

        return "\n".join(lines)


# ── CLI para verificação ─────────────────────────────────────────────────────
if __name__ == "__main__":
    gov = GovernanceManager()
    status = gov.get_rate_status()
    print(json.dumps(status, indent=2))
    print("\nÚltimas ações:")
    for a in gov.db.get_recent_actions(10):
        print(f"  [{a['created_at']}] {a['action']}")
