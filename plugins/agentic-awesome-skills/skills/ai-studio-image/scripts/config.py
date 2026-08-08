"""
AI Studio Image — Configuracao Central (v2 — Enhanced with Official Docs)

Todas as constantes, paths, modelos, formatos, tecnicas e configuracoes
baseadas na documentacao oficial do Google AI Studio (Fev 2026).
"""

from pathlib import Path
import os

# =============================================================================
# PATHS
# =============================================================================

ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
DATA_DIR = ROOT_DIR / "data"
OUTPUTS_DIR = DATA_DIR / "outputs"
REFERENCES_DIR = ROOT_DIR / "references"
ASSETS_DIR = ROOT_DIR / "assets"

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# =============================================================================
# API KEY MANAGEMENT (com fallback para backup keys)
# =============================================================================

def get_api_key(try_backup: bool = True) -> str | None:
    """
    Busca API key com fallback automatico:
    1. GEMINI_API_KEY env var
    2. .env GEMINI_API_KEY
    3. .env GEMINI_API_KEY_BACKUP_1
    4. .env GEMINI_API_KEY_BACKUP_2
    """
    # 1. Variavel de ambiente
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key

    # 2. Arquivo .env
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        keys_found = {}
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                keys_found[k.strip()] = v.strip().strip('"').strip("'")

        # Primaria
        if "GEMINI_API_KEY" in keys_found:
            return keys_found["GEMINI_API_KEY"]

        # Backups
        if try_backup:
            for backup_key in ["GEMINI_API_KEY_BACKUP_1", "GEMINI_API_KEY_BACKUP_2"]:
                if backup_key in keys_found:
                    return keys_found[backup_key]

    return None


def get_all_api_keys() -> list[str]:
    """Retorna todas as API keys disponiveis para fallback."""
    keys = []
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "GEMINI_API_KEY" in line and "=" in line:
                _, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if v:
                    keys.append(v)

    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key and env_key not in keys:
        keys.insert(0, env_key)

    return keys


# =============================================================================
# MODELOS — Todos os modelos oficiais (Fev 2026)
# =============================================================================

MODELS = {
    # ---- Imagen 4 (Standalone Image Generation) ----
    "imagen-4": {
        "id": "imagen-4.0-generate-001",
        "type": "imagen",
        "description": "Imagen 4 Standard — Alta qualidade, balanco ideal velocidade/qualidade",
        "max_images": 4,
        "max_resolution": "2K",
        "supports_aspect_ratio": True,
        "supports_reference_images": False,
        "supports_text_rendering": True,
        "text_limit": 25,  # caracteres max para texto na imagem
        "cost_per_image": 0.03,
    },
    "imagen-4-ultra": {
        "id": "imagen-4.0-ultra-generate-001",
        "type": "imagen",
        "description": "Imagen 4 Ultra — Maxima qualidade, resolucao 2K, detalhes superiores",
        "max_images": 4,
        "max_resolution": "2K",
        "supports_aspect_ratio": True,
        "supports_reference_images": False,
        "supports_text_rendering": True,
        "text_limit": 25,
        "cost_per_image": 0.06,
    },
    "imagen-4-fast": {
        "id": "imagen-4.0-fast-generate-001",
        "type": "imagen",
        "description": "Imagen 4 Fast — Geracao rapida, ideal para volume alto",
        "max_images": 4,
        "max_resolution": "1K",
        "supports_aspect_ratio": True,
        "supports_reference_images": False,
        "supports_text_rendering": True,
        "text_limit": 25,
        "cost_per_image": 0.02,
    },

    # ---- Gemini com geracao de imagem nativa (Nano Banana) ----
    "gemini-flash-image": {
        "id": "gemini-2.5-flash-image",
        "type": "gemini",
        "description": "Nano Banana (Gemini 2.5 Flash Image) — Rapido, eficiente, edicao de imagem",
        "max_images": 1,
        "max_resolution": "1K",
        "supports_aspect_ratio": True,
        "supports_reference_images": False,
        "supports_text_rendering": True,
        "supports_image_editing": True,
        "supports_multi_turn": True,
        "cost_per_image": 0.039,
    },
    "gemini-2-flash-exp": {
        "id": "gemini-2.0-flash-exp-image-generation",
        "type": "gemini",
        "description": "Gemini 2.0 Flash Experimental — GRATUITO, geracao experimental",
        "max_images": 1,
        "max_resolution": "1K",
        "supports_aspect_ratio": False,
        "supports_reference_images": False,
        "supports_text_rendering": True,
        "supports_image_editing": True,
        "supports_multi_turn": True,
        "cost_per_image": 0,
    },
    "gemini-pro-image": {
        "id": "gemini-3-pro-image-preview",
        "type": "gemini",
        "description": "Gemini 3 Pro Image — Maximo controle, 4K, ate 14 imagens referencia, thinking mode",
        "max_images": 1,
        "max_resolution": "4K",
        "supports_aspect_ratio": True,
        "supports_reference_images": True,
        "max_reference_objects": 6,
        "max_reference_humans": 5,
        "max_reference_total": 14,
        "supports_text_rendering": True,
        "supports_thinking_mode": True,
        "supports_search_grounding": True,
        "supports_image_editing": True,
        "supports_image_restoration": True,
        "supports_multi_turn": True,
        "cost_per_image": 0.134,
    },
}

# Modelo padrao — gemini-2-flash-exp e GRATUITO mesmo no nivel pago
DEFAULT_MODEL = os.environ.get("GEMINI_DEFAULT_MODEL", "gemini-2-flash-exp")

# =============================================================================
# FORMATOS DE IMAGEM — Todos os aspect ratios oficiais
# =============================================================================

IMAGE_FORMATS = {
    "square": {
        "aspect_ratio": "1:1",
        "description": "Feed Instagram, Facebook, perfis, produtos",
        "use_cases": ["instagram feed", "facebook post", "profile", "product"],
    },
    "portrait-34": {
        "aspect_ratio": "3:4",
        "description": "Instagram portrait, Pinterest pins",
        "use_cases": ["instagram portrait", "pinterest", "card"],
    },
    "portrait-45": {
        "aspect_ratio": "4:5",
        "description": "Instagram optimal portrait (mais area visivel no feed)",
        "use_cases": ["instagram optimal", "social media portrait"],
    },
    "portrait-23": {
        "aspect_ratio": "2:3",
        "description": "Retrato classico, posters, A4-like",
        "use_cases": ["poster", "print", "classic portrait"],
    },
    "landscape-43": {
        "aspect_ratio": "4:3",
        "description": "Formato classico fullscreen, apresentacoes",
        "use_cases": ["presentation", "fullscreen", "classic"],
    },
    "landscape-32": {
        "aspect_ratio": "3:2",
        "description": "Formato fotografico classico (35mm)",
        "use_cases": ["photography", "35mm", "classic landscape"],
    },
    "landscape-54": {
        "aspect_ratio": "5:4",
        "description": "Quase quadrado, formato 8x10",
        "use_cases": ["near-square", "8x10", "medium format"],
    },
    "widescreen": {
        "aspect_ratio": "16:9",
        "description": "YouTube thumbnails, banners, desktop, TV",
        "use_cases": ["youtube", "banner", "desktop", "tv", "thumbnail"],
    },
    "ultrawide": {
        "aspect_ratio": "21:9",
        "description": "Ultrawide cinematico, banners panoramicos",
        "use_cases": ["cinematic", "ultrawide", "panoramic banner"],
    },
    "stories": {
        "aspect_ratio": "9:16",
        "description": "Stories, Reels, TikTok, Shorts (vertical)",
        "use_cases": ["stories", "reels", "tiktok", "shorts", "vertical"],
    },
}

# Aliases para facilitar uso
FORMAT_ALIASES = {
    "square": "square",
    "1:1": "square",
    "portrait": "portrait-45",  # Instagram optimal como padrao
    "3:4": "portrait-34",
    "4:5": "portrait-45",
    "2:3": "portrait-23",
    "landscape": "widescreen",
    "16:9": "widescreen",
    "4:3": "landscape-43",
    "3:2": "landscape-32",
    "5:4": "landscape-54",
    "21:9": "ultrawide",
    "stories": "stories",
    "9:16": "stories",
    "reels": "stories",
    "tiktok": "stories",
    "youtube": "widescreen",
    "thumbnail": "widescreen",
    "banner": "widescreen",
    "pinterest": "portrait-23",
    "instagram": "square",
    "instagram-portrait": "portrait-45",
    "feed": "square",
}

DEFAULT_FORMAT = "square"

# =============================================================================
# NIVEIS DE HUMANIZACAO
# =============================================================================

HUMANIZATION_LEVELS = {
    "ultra": {
        "description": "Maximo realismo — parece 100% foto de celular amador",
        "modifiers": [
            "taken with an older model smartphone camera, slight quality reduction",
            "visible image sensor noise and grain, especially in shadows",
            "imperfect framing, noticeably off-center, slightly tilted",
            "natural motion blur from slight hand tremor while taking the photo",
            "visible lens distortion at edges typical of wide phone cameras",
            "unedited, straight from camera roll, no filters applied",
            "candid unposed moment, subject not aware of camera or casually posing",
            "fingerprint smudge slightly visible on lens edge",
            "auto-exposure not quite perfect, slightly over or underexposed areas",
        ],
    },
    "natural": {
        "description": "Equilibrio perfeito — foto casual de celular moderno",
        "modifiers": [
            "taken with a modern smartphone camera, natural quality",
            "subtle ambient light only, no professional flash or ring light",
            "casual framing, not perfectly composed but intentional",
            "real skin texture with visible pores, subtle blemishes, natural color variation",
            "genuine facial expression, natural and relaxed, not a stock photo pose",
            "everyday real-world setting with authentic environmental details",
            "shallow depth of field from phone lens, background naturally blurred",
            "natural color grading, not heavily filtered or processed",
        ],
    },
    "polished": {
        "description": "Natural mas cuidado — celular bom com boa luz",
        "modifiers": [
            "high quality smartphone photography, latest model phone camera",
            "well-lit natural lighting, photographer chose good conditions",
            "thoughtful but casual composition, follows rule of thirds loosely",
            "natural skin appearance, minimal retouching, healthy and real",
            "clean real environment with intentional but not staged background",
            "colors are vibrant but not oversaturated, true to life",
        ],
    },
    "editorial": {
        "description": "Estilo revista — natural com producao sutil",
        "modifiers": [
            "editorial photography style, natural but with subtle production quality",
            "professional natural lighting, no obvious artificial light sources",
            "magazine-worthy composition that still feels candid and genuine",
            "skin looks healthy and natural with very gentle soft-focus diffusion",
            "curated environment that feels aspirational yet authentically real",
            "color palette is cohesive and intentional, like a lifestyle brand",
        ],
    },
}

DEFAULT_HUMANIZATION = "natural"

# =============================================================================
# ILUMINACAO — Opcoes detalhadas de hora do dia
# =============================================================================

LIGHTING_OPTIONS = {
    "morning": {
        "description": "Luz matinal suave, tons frios-quentes em transicao",
        "modifiers": [
            "soft early morning light streaming through windows or filtering through trees",
            "cool-warm transitional color temperature, fresh atmospheric quality",
            "gentle long shadows from low sun angle, peaceful morning atmosphere",
        ],
    },
    "golden-hour": {
        "description": "Por do sol/nascer — luz dourada cinematica",
        "modifiers": [
            "golden hour sunlight creating warm amber and honey tones across the scene",
            "long soft dramatic shadows adding depth and dimension",
            "beautiful backlighting with natural lens flare",
            "skin and surfaces glowing warmly in the directional light",
        ],
    },
    "midday": {
        "description": "Sol do meio-dia — luz forte e direta",
        "modifiers": [
            "bright midday sunlight with strong overhead illumination",
            "well-defined shadows directly below subjects",
            "vibrant saturated colors under direct sun exposure",
            "high contrast between lit areas and shadow",
        ],
    },
    "overcast": {
        "description": "Dia nublado — luz difusa e uniforme",
        "modifiers": [
            "overcast sky providing soft even diffused illumination",
            "no harsh shadows, smooth lighting transitions",
            "slightly muted tones with subtle atmospheric quality",
            "flattering portrait light from the cloud-diffused sky",
        ],
    },
    "night": {
        "description": "Noturno — luzes artificiais quentes",
        "modifiers": [
            "nighttime scene with warm artificial lighting sources",
            "street lamps, neon signs, restaurant glow, or indoor warm lights",
            "higher ISO grain visible, adding to the nighttime atmosphere",
            "warm color temperature from tungsten and LED light sources",
        ],
    },
    "indoor": {
        "description": "Interiores — mix de luz natural e artificial",
        "modifiers": [
            "indoor mixed lighting from windows and artificial sources",
            "warm tungsten light combined with cool natural daylight",
            "soft ambient shadows typical of interior spaces",
            "natural light gradients from window to room depth",
        ],
    },
    "blue-hour": {
        "description": "Hora azul — pos-por-do-sol, tons azulados",
        "modifiers": [
            "blue hour twilight creating cool blue atmospheric tones",
            "city lights beginning to turn on against deep blue sky",
            "beautiful contrast between warm artificial lights and cool ambient",
            "magical transitional quality between day and night",
        ],
    },
    "shade": {
        "description": "Sombra aberta — luz refletida suave",
        "modifiers": [
            "open shade lighting with soft reflected light",
            "even illumination without direct sunlight",
            "very flattering for portraits with no squinting",
            "cool-neutral color temperature from reflected sky light",
        ],
    },
}

DEFAULT_LIGHTING = None

# =============================================================================
# MODOS DE OPERACAO
# =============================================================================

MODES = {
    "influencer": {
        "description": "Posts para redes sociais com estetica natural e atraente",
        "base_style": [
            "authentic social media photo that could appear on a real person's Instagram or TikTok",
            "visually appealing but genuine and relatable, not commercial or staged",
            "the kind of photo that earns organic engagement because it feels real",
            "lifestyle photography aesthetic with natural warmth and personality",
            "inviting color palette that is attractive without being oversaturated",
        ],
        "avoid": [
            "do NOT create a studio photoshoot look with professional lighting setups",
            "do NOT use perfect mathematical symmetry in composition",
            "do NOT make skin look airbrushed, plastic, or unnaturally smooth",
            "do NOT use dramatic studio lighting, rim lights, or beauty dish lighting",
            "do NOT create anything that looks like advertising or commercial photography",
            "avoid oversaturated or heavily filtered color grading",
            "avoid uncanny valley faces, impossible body proportions, or AI artifacts",
            "avoid generic stock photo compositions or poses",
        ],
    },
    "educacional": {
        "description": "Material tecnico de ensino com visual profissional e acessivel",
        "base_style": [
            "clean professional educational photography that builds trust and credibility",
            "clear focus on the subject being taught, nothing distracting from the lesson",
            "well-organized visual elements that guide the eye to important information",
            "approachable and inviting learning atmosphere, not intimidating or sterile",
            "natural trustworthy appearance that makes the viewer want to learn",
        ],
        "avoid": [
            "do NOT create clip art or generic stock photo appearance",
            "do NOT overcrowd the frame with too many competing elements",
            "do NOT use distracting busy backgrounds that compete with the subject",
            "do NOT make text or important demonstration elements too small to read",
            "avoid overly corporate, sterile, or cold atmosphere",
            "avoid artificial-looking scenarios that break trust with the viewer",
            "avoid excessive visual complexity that overwhelms the learning content",
        ],
    },
}

DEFAULT_MODE = "influencer"

# =============================================================================
# PROMPT TEMPLATES OFICIAIS (da documentacao Google)
# =============================================================================

PROMPT_TEMPLATES = {
    "photorealistic": {
        "pattern": "A photorealistic {shot_type} of {subject}, {action}, set in {environment}. The scene is illuminated by {lighting}, creating a {mood} atmosphere. Captured with a {camera}, emphasizing {details}.",
        "description": "Template oficial para cenas fotorrealistas",
    },
    "product_mockup": {
        "pattern": "A high-resolution, studio-lit product photograph of {product} on a {surface}. The lighting is a {lighting_setup} to {purpose}. The camera angle is {angle} to showcase {feature}. Ultra-realistic, with sharp focus on {detail}.",
        "description": "Template oficial para fotos de produto",
    },
    "stylized_illustration": {
        "pattern": "A {style} sticker of a {subject}, featuring {characteristics} and a {color_palette}. The design should have {line_style} and {shading}. The background must be {background}.",
        "description": "Template oficial para ilustracoes estilizadas",
    },
    "text_in_image": {
        "pattern": "Create a {image_type} for {brand} with the text \"{text}\" in a {font_style}. The design should be {style}, with a {color_scheme}.",
        "description": "Template oficial para texto em imagens",
    },
    "infographic": {
        "pattern": "Create a {visual_type} explaining {concept} styled as {reference_style}. Show {key_elements} and {result}. Design resembles {example}, suitable for {audience}.",
        "description": "Template oficial para infograficos",
    },
}

# =============================================================================
# SHOT TYPES (Tipos de enquadramento fotografico)
# =============================================================================

SHOT_TYPES = {
    "extreme-close-up": "Extreme close-up showing fine details of a specific feature",
    "close-up": "Close-up portrait showing face/subject with blurred background",
    "medium-close": "Medium close-up from chest up, conversational distance",
    "medium": "Medium shot from waist up, showing body language and context",
    "medium-wide": "Medium wide shot showing full body with some environment",
    "wide": "Wide shot with subject in environment, establishing context",
    "extreme-wide": "Extreme wide shot, subject small in vast landscape",
    "over-shoulder": "Over-the-shoulder perspective, intimate conversational view",
    "top-down": "Bird's eye view looking directly down, flat lay perspective",
    "low-angle": "Low angle looking up at subject, empowering perspective",
    "high-angle": "High angle looking down, showing layout and spatial relationships",
    "dutch-angle": "Slightly tilted frame adding dynamic energy and tension",
    "pov": "Point-of-view perspective, as seen through someone's eyes",
}

# =============================================================================
# RESOLUTIONS
# =============================================================================

RESOLUTIONS = {
    "1K": "1024px — Padrao, rapido, bom para web",
    "2K": "2048px — Alta qualidade, ideal para impressao e detalhes",
    "4K": "4096px — Maxima qualidade, apenas Gemini 3 Pro Image",
}

DEFAULT_RESOLUTION = "1K"

# =============================================================================
# PERSON GENERATION SETTINGS
# =============================================================================

PERSON_GENERATION = {
    "dont_allow": "Bloqueia geracao de pessoas",
    "allow_adult": "Permite apenas adultos (padrao)",
    "allow_all": "Permite adultos e criancas (indisponivel em EU/UK/CH/MENA)",
}

DEFAULT_PERSON_GENERATION = "allow_adult"

# =============================================================================
# RATE LIMITS E GOVERNANCA
# =============================================================================

RATE_LIMITS = {
    "requests_per_minute": 10,
    "images_per_day": 500,
    "max_prompt_tokens": 480,
    "max_text_in_image_chars": 25,  # para Imagen
    "max_text_phrases": 3,  # ate 3 frases distintas
}

# =============================================================================
# OUTPUT SETTINGS
# =============================================================================

OUTPUT_SETTINGS = {
    "default_mime_type": "image/png",
    "filename_pattern": "{mode}_{template}_{timestamp}_{index}.{ext}",
    "save_metadata": True,
    "save_prompt": True,
    "save_original_prompt": True,
}

# =============================================================================
# CONTROLADOR DE SEGURANCA — Previne gastos acidentais
# =============================================================================

# Modelos com custo real (nao usar sem intencao explicita)
# imagen-4: $0.03/img | imagen-4-ultra: $0.06/img | imagen-4-fast: $0.02/img
# gemini-flash-image: $0.039/img | gemini-pro-image: $0.134/img
PAID_MODELS = {"imagen-4", "imagen-4-ultra", "imagen-4-fast", "gemini-flash-image", "gemini-pro-image"}

# Unico modelo GRATUITO para geracao de imagem (experimental)
FREE_MODELS = {"gemini-2-flash-exp"}


def safety_check_model(model_key: str, force: bool = False) -> tuple[bool, str]:
    """
    Verifica se o modelo e seguro para usar sem gerar custo.

    Returns:
        (allowed, message) — se permitido e mensagem explicativa
    """
    block_paid = os.environ.get("SAFETY_BLOCK_PAID_MODELS", "true").lower() == "true"

    if model_key in PAID_MODELS:
        cost = MODELS.get(model_key, {}).get("cost_per_image", "?")
        if block_paid and not force:
            return False, (
                f"BLOQUEADO: '{model_key}' cobra ${cost}/imagem. "
                f"Use --model gemini-2-flash-exp (gratis) ou --force-paid para confirmar."
            )
        return True, f"AVISO: '{model_key}' cobra ${cost}/imagem. Prosseguindo com --force-paid."

    return True, f"OK: '{model_key}' e gratuito."


def get_daily_usage_count() -> int:
    """Retorna quantas imagens foram geradas hoje (via metadados salvos)."""
    import json
    from datetime import date
    today = date.today().isoformat()
    count = 0
    if OUTPUTS_DIR.exists():
        for meta_file in OUTPUTS_DIR.glob("*.meta.json"):
            try:
                data = json.loads(meta_file.read_text(encoding="utf-8"))
                generated_at = data.get("generated_at", "")
                if generated_at.startswith(today):
                    count += 1
            except Exception:
                pass
    return count


def safety_check_daily_limit(num_images: int = 1) -> tuple[bool, str]:
    """
    Verifica se o limite diario de imagens sera excedido.

    Returns:
        (allowed, message)
    """
    max_per_day = int(os.environ.get("SAFETY_MAX_IMAGES_PER_DAY", "50"))
    current = get_daily_usage_count()
    after = current + num_images

    if after > max_per_day:
        return False, (
            f"LIMITE DIARIO: {current}/{max_per_day} imagens hoje. "
            f"Ajuste SAFETY_MAX_IMAGES_PER_DAY no .env para aumentar."
        )
    return True, f"OK: {current}/{max_per_day} imagens hoje ({num_images} a gerar)."
