"""
Presets de estilo para Stability AI.

Cada estilo adiciona qualificadores ao prompt do usuario para direcionar
o modelo na direcao visual desejada. Use --style <nome> no CLI.
"""
from __future__ import annotations

STYLES = {
    "photorealistic": {
        "name": "Fotorrealismo",
        "suffix": (
            "photorealistic, hyperrealistic, 8k uhd, high resolution, "
            "sharp focus, professional photography, natural lighting, "
            "film grain, bokeh, shot on Canon EOS R5"
        ),
        "negative": "cartoon, painting, illustration, drawing, anime, cgi, render",
    },
    "anime": {
        "name": "Anime / Manga",
        "suffix": (
            "anime style, manga art, cel shading, vibrant colors, "
            "clean linework, detailed eyes, studio ghibli inspired, "
            "high quality anime illustration"
        ),
        "negative": "photorealistic, photo, 3d render, western cartoon",
    },
    "digital-art": {
        "name": "Arte Digital",
        "suffix": (
            "digital art, highly detailed, digital painting, artstation, "
            "concept art, smooth, sharp focus, illustration, "
            "professional digital artwork"
        ),
        "negative": "photo, photograph, low quality, blurry",
    },
    "oil-painting": {
        "name": "Pintura a Oleo",
        "suffix": (
            "oil painting on canvas, thick brushstrokes, rich texture, "
            "classical art, warm color palette, museum quality, "
            "rembrandt lighting, chiaroscuro"
        ),
        "negative": "digital, photo, smooth, flat, cartoon",
    },
    "watercolor": {
        "name": "Aquarela",
        "suffix": (
            "watercolor painting, soft washes, translucent layers, "
            "wet on wet technique, delicate details, paper texture visible, "
            "flowing colors, artistic watercolor illustration"
        ),
        "negative": "digital, photo, sharp edges, bold outlines",
    },
    "pixel-art": {
        "name": "Pixel Art",
        "suffix": (
            "pixel art, 16-bit, retro game style, limited color palette, "
            "crisp pixels, no anti-aliasing, nostalgic, 8-bit aesthetic"
        ),
        "negative": "realistic, photo, smooth, high resolution, blurry",
    },
    "3d-render": {
        "name": "Render 3D",
        "suffix": (
            "3d render, octane render, unreal engine 5, ray tracing, "
            "volumetric lighting, subsurface scattering, physically based rendering, "
            "cinema 4d, blender cycles, ultra detailed"
        ),
        "negative": "2d, flat, painting, sketch, low poly",
    },
    "concept-art": {
        "name": "Concept Art",
        "suffix": (
            "concept art, highly detailed, professional illustration, "
            "trending on artstation, matte painting, dynamic composition, "
            "cinematic, dramatic lighting, epic scale"
        ),
        "negative": "photo, amateur, low quality, simple",
    },
    "comic": {
        "name": "Comics / HQ",
        "suffix": (
            "comic book style, bold outlines, halftone dots, dynamic pose, "
            "vivid colors, graphic novel illustration, ink drawing, "
            "professional comic art"
        ),
        "negative": "photorealistic, soft, watercolor, oil painting",
    },
    "minimalist": {
        "name": "Minimalista",
        "suffix": (
            "minimalist design, clean lines, simple shapes, "
            "limited color palette, negative space, modern aesthetic, "
            "flat design, geometric, elegant simplicity"
        ),
        "negative": "complex, detailed, busy, cluttered, realistic",
    },
    "fantasy": {
        "name": "Fantasy Art",
        "suffix": (
            "epic fantasy art, magical atmosphere, ethereal glow, "
            "detailed fantasy illustration, mystical, enchanted, "
            "dramatic lighting, heroic, masterpiece"
        ),
        "negative": "modern, mundane, realistic, photo",
    },
    "sci-fi": {
        "name": "Sci-Fi Futurista",
        "suffix": (
            "science fiction art, futuristic, neon lights, cyberpunk, "
            "advanced technology, holographic, chrome and glass, "
            "blade runner aesthetic, high tech"
        ),
        "negative": "medieval, fantasy, natural, organic, rustic",
    },
    "sketch": {
        "name": "Desenho a Lapis",
        "suffix": (
            "pencil sketch, graphite drawing, detailed linework, "
            "cross-hatching, shading, paper texture, hand-drawn, "
            "charcoal drawing, artist sketchbook"
        ),
        "negative": "color, painted, digital, photo, saturated",
    },
    "pop-art": {
        "name": "Pop Art",
        "suffix": (
            "pop art style, bold primary colors, ben-day dots, "
            "high contrast, graphic, screen print effect, "
            "vibrant and eye-catching"
        ),
        "negative": "realistic, muted colors, subtle, natural",
    },
    "noir": {
        "name": "Film Noir",
        "suffix": (
            "film noir style, black and white, dramatic shadows, "
            "high contrast, moody atmosphere, venetian blinds shadow, "
            "detective story aesthetic, 1940s cinema"
        ),
        "negative": "colorful, bright, cheerful, modern, flat lighting",
    },
}

DEFAULT_STYLE = None


def get_style(name: str) -> dict | None:
    """Retorna configuracao de um estilo ou None se nao existe."""
    return STYLES.get(name.lower().strip())


def list_styles() -> dict:
    """Retorna todos os estilos disponiveis."""
    return STYLES


def apply_style(prompt: str, style_name: str | None) -> tuple[str, str | None]:
    """
    Aplica estilo ao prompt.

    Retorna (prompt_modificado, negative_prompt).
    Se estilo nao encontrado, retorna prompt original.
    """
    if not style_name:
        return prompt, None

    style = get_style(style_name)
    if not style:
        return prompt, None

    enhanced = f"{prompt}, {style['suffix']}"
    return enhanced, style.get("negative")
