"""
Configuracao central da skill Stability AI.

Gerencia: API keys, modelos, formatos, aspect ratios, limites de seguranca.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
DATA_DIR = ROOT_DIR / "data"
OUTPUT_DIR = DATA_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── API ──────────────────────────────────────────────────────────────────────

API_BASE = "https://api.stability.ai/v2beta"
USER_AGENT = "StabilityAI-Skill/2.0"

ENDPOINTS = {
    "generate_sd3": "/stable-image/generate/sd3",
    "generate_ultra": "/stable-image/generate/ultra",
    "generate_core": "/stable-image/generate/core",
    "upscale_conservative": "/stable-image/upscale/conservative",
    "upscale_creative": "/stable-image/upscale/creative",
    "remove_bg": "/stable-image/edit/remove-background",
    "inpaint": "/stable-image/edit/inpaint",
    "search_replace": "/stable-image/edit/search-and-replace",
    "erase": "/stable-image/edit/erase",
    "outpaint": "/stable-image/edit/outpaint",
}

# ── Modelos ──────────────────────────────────────────────────────────────────

MODELS = {
    "sd3.5-large": {
        "id": "sd3.5-large",
        "name": "Stable Diffusion 3.5 Large",
        "endpoint": "generate_sd3",
        "description": "Melhor qualidade geral. Recomendado para a maioria dos usos.",
        "cost": "free",
    },
    "sd3.5-large-turbo": {
        "id": "sd3.5-large-turbo",
        "name": "SD 3.5 Large Turbo",
        "endpoint": "generate_sd3",
        "description": "Versao rapida do SD 3.5. Menos passos, resultado bom.",
        "cost": "free",
    },
    "sd3.5-medium": {
        "id": "sd3.5-medium",
        "name": "SD 3.5 Medium",
        "endpoint": "generate_sd3",
        "description": "Balanco entre velocidade e qualidade.",
        "cost": "free",
    },
    "ultra": {
        "id": "ultra",
        "name": "Stable Image Ultra",
        "endpoint": "generate_ultra",
        "description": "Maxima qualidade. Fotorrealismo e detalhes extremos.",
        "cost": "free",
    },
    "core": {
        "id": "core",
        "name": "Stable Image Core",
        "endpoint": "generate_core",
        "description": "Rapido e eficiente. Bom para iteracao.",
        "cost": "free",
    },
}

DEFAULT_MODEL = "sd3.5-large"

# ── Aspect Ratios ────────────────────────────────────────────────────────────

ASPECT_RATIOS = {
    "square": "1:1",
    "portrait": "2:3",
    "landscape": "3:2",
    "wide": "16:9",
    "ultrawide": "21:9",
    "stories": "9:16",
    "phone": "9:21",
    "photo": "4:5",
    "cinema": "5:4",
}

ASPECT_ALIASES = {
    # Valores diretos
    "1:1": "1:1", "2:3": "2:3", "3:2": "3:2", "16:9": "16:9",
    "21:9": "21:9", "9:16": "9:16", "9:21": "9:21", "4:5": "4:5", "5:4": "5:4",
    # Portugues
    "quadrado": "1:1", "retrato": "2:3", "paisagem": "3:2",
    "widescreen": "16:9", "vertical": "9:16", "horizontal": "3:2",
    # Plataformas
    "ig": "1:1", "instagram": "1:1", "ig-feed": "4:5", "ig-stories": "9:16",
    "youtube": "16:9", "yt": "16:9", "tiktok": "9:16", "reels": "9:16",
    "twitter": "16:9", "x": "16:9", "facebook": "16:9", "fb": "16:9",
    "pinterest": "2:3", "linkedin": "16:9",
    "wallpaper": "16:9", "desktop": "16:9", "mobile": "9:16",
}

DEFAULT_ASPECT_RATIO = "1:1"

# ── MIME Types ───────────────────────────────────────────────────────────────

MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
}

# ── Output ───────────────────────────────────────────────────────────────────

OUTPUT_SETTINGS = {
    "format": "png",
    "save_metadata": True,
    "save_prompt": True,
}

# ── Limites de Seguranca ─────────────────────────────────────────────────────

SAFETY_MAX_IMAGES_PER_DAY = int(os.environ.get("SAFETY_MAX_IMAGES_PER_DAY", "100"))


# ── Funcoes ──────────────────────────────────────────────────────────────────


def _parse_env_file(env_path: Path) -> dict[str, str]:
    """Parse arquivo .env e retorna dict chave=valor."""
    result: dict[str, str] = {}
    if not env_path.exists():
        return result
    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and v:
                    result[k] = v
    except (OSError, UnicodeDecodeError):
        pass
    return result


def get_api_key() -> str | None:
    """Busca a API key em ordem: env var > .env na skill."""
    key = os.environ.get("STABILITY_API_KEY")
    if key:
        return key

    env_data = _parse_env_file(ROOT_DIR / ".env")
    return env_data.get("STABILITY_API_KEY")


def get_all_api_keys() -> list[str]:
    """Retorna todas as API keys (primaria + backups)."""
    keys: list[str] = []
    primary = get_api_key()
    if primary:
        keys.append(primary)

    env_data = _parse_env_file(ROOT_DIR / ".env")
    for k, v in env_data.items():
        if k.startswith("STABILITY_API_KEY_BACKUP") and v and v not in keys:
            keys.append(v)

    return keys


def resolve_aspect_ratio(name: str) -> str:
    """Resolve nome ou alias para aspect ratio valido."""
    name_lower = name.lower().strip()
    if name_lower in ASPECT_RATIOS:
        return ASPECT_RATIOS[name_lower]
    if name_lower in ASPECT_ALIASES:
        return ASPECT_ALIASES[name_lower]
    if ":" in name and all(p.isdigit() for p in name.split(":")):
        return name
    return DEFAULT_ASPECT_RATIO


def get_mime_type(filepath: Path) -> str:
    """Retorna MIME type baseado na extensao do arquivo."""
    return MIME_MAP.get(filepath.suffix.lower(), "image/png")


def safety_check_daily_limit(num_images: int = 1) -> tuple[bool, str]:
    """Verifica se nao excedeu limite diario."""
    today = datetime.now().strftime("%Y-%m-%d")
    counter_file = DATA_DIR / "daily_counter.json"

    count = 0
    if counter_file.exists():
        try:
            data = json.loads(counter_file.read_text(encoding="utf-8"))
            if data.get("date") == today:
                count = data.get("count", 0)
        except (json.JSONDecodeError, KeyError, OSError):
            pass

    if count + num_images > SAFETY_MAX_IMAGES_PER_DAY:
        return False, (
            f"LIMITE DIARIO: {count}/{SAFETY_MAX_IMAGES_PER_DAY} imagens hoje. "
            f"Tentando gerar {num_images} mais. "
            f"Configure SAFETY_MAX_IMAGES_PER_DAY para ajustar."
        )

    return True, f"OK: {count}/{SAFETY_MAX_IMAGES_PER_DAY} imagens hoje."


def increment_daily_counter(num_images: int = 1) -> None:
    """Incrementa o contador diario de forma segura."""
    today = datetime.now().strftime("%Y-%m-%d")
    counter_file = DATA_DIR / "daily_counter.json"

    count = 0
    if counter_file.exists():
        try:
            data = json.loads(counter_file.read_text(encoding="utf-8"))
            if data.get("date") == today:
                count = data.get("count", 0)
        except (json.JSONDecodeError, KeyError, OSError):
            pass

    try:
        counter_file.parent.mkdir(parents=True, exist_ok=True)
        counter_file.write_text(
            json.dumps({"date": today, "count": count + num_images}, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass  # Falha silenciosa no contador nao deve bloquear geracao


def validate_image_file(filepath: str | Path) -> Path:
    """Valida que o arquivo de imagem existe e tem extensao suportada."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {path}")
    if not path.is_file():
        raise ValueError(f"Nao e um arquivo: {path}")
    if path.suffix.lower() not in MIME_MAP:
        supported = ", ".join(MIME_MAP.keys())
        raise ValueError(f"Formato nao suportado: {path.suffix}. Suportados: {supported}")
    if path.stat().st_size == 0:
        raise ValueError(f"Arquivo vazio: {path}")
    if path.stat().st_size > 50 * 1024 * 1024:  # 50MB
        raise ValueError(f"Arquivo muito grande ({path.stat().st_size / 1024 / 1024:.1f}MB). Max: 50MB")
    return path
