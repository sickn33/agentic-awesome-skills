"""
Configuração central da skill Instagram.

Todos os paths, constantes da API e specs de mídia ficam aqui.
Importado por todos os outros scripts.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
DATA_DIR = ROOT_DIR / "data"
EXPORTS_DIR = DATA_DIR / "exports"
STATIC_DIR = ROOT_DIR / "static"
DB_PATH = DATA_DIR / "instagram.db"

# Garante que diretórios existem
DATA_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Instagram Graph API ───────────────────────────────────────────────────────
API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{API_VERSION}"
GRAPH_IG_BASE = f"https://graph.instagram.com/{API_VERSION}"

# OAuth
OAUTH_REDIRECT_PORT = 8765
OAUTH_REDIRECT_URI = f"http://localhost:{OAUTH_REDIRECT_PORT}/callback"
OAUTH_AUTHORIZE_URL = f"https://www.facebook.com/{API_VERSION}/dialog/oauth"
OAUTH_TOKEN_URL = f"{GRAPH_API_BASE}/oauth/access_token"

# Scopes necessários
OAUTH_SCOPES = [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "instagram_manage_messages",
    "pages_show_list",
    "pages_read_engagement",
]

# ── Rate Limits ───────────────────────────────────────────────────────────────
RATE_LIMIT_REQUESTS_PER_HOUR = 200
RATE_LIMIT_PUBLISHES_PER_DAY = 25
RATE_LIMIT_HASHTAGS_PER_WEEK = 30
RATE_LIMIT_DMS_PER_HOUR = 200
RATE_LIMIT_WARNING_THRESHOLD = 0.9  # alerta em 90% do limite

# ── Media Specs ───────────────────────────────────────────────────────────────
MEDIA_SPECS: Dict[str, Dict[str, Any]] = {
    "PHOTO": {
        "formats": ["JPEG"],
        "min_width": 320,
        "max_width": 1440,
        "aspect_ratio_min": 4 / 5,   # 0.8
        "aspect_ratio_max": 1.91,
        "max_size_mb": 8,
    },
    "VIDEO": {
        "formats": ["MP4", "MOV"],
        "codec": "H.264",
        "audio": "AAC",
        "min_duration_sec": 3,
        "max_duration_sec": 60,
        "max_size_mb": 100,
    },
    "REEL": {
        "formats": ["MP4", "MOV"],
        "codec": "H.264",
        "audio": "AAC",
        "recommended_width": 1080,
        "recommended_height": 1920,
        "aspect_ratio": "9:16",
        "min_duration_sec": 3,
        "max_duration_sec": 90,
        "max_size_mb": 1024,
    },
    "STORY": {
        "recommended_width": 1080,
        "recommended_height": 1920,
        "aspect_ratio": "9:16",
    },
    "CAROUSEL": {
        "min_items": 2,
        "max_items": 10,
    },
}

# ── Imgur (upload de mídia local) ─────────────────────────────────────────────
IMGUR_UPLOAD_URL = "https://api.imgur.com/3/image"
IMGUR_CLIENT_ID = "546c25a59c58ad7"  # anonymous uploads (público)

# ── Retry / Backoff ──────────────────────────────────────────────────────────
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # segundos: 2^1, 2^2, 2^3
REQUEST_TIMEOUT = 30.0

# ── Governance ────────────────────────────────────────────────────────────────
# Categorias de ação para confirmação
ACTION_CATEGORIES = {
    "READ": [],  # sem confirmação
    "ENGAGE": ["reply_comment", "hide_comment", "unhide_comment"],
    "PUBLISH": ["publish_photo", "publish_video", "publish_reel",
                "publish_story", "publish_carousel", "schedule_post"],
    "DELETE": ["delete_comment"],
    "MESSAGE": ["send_dm"],
}
