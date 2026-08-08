"""
AI Studio Image — Motor de Humanizacao de Prompts (v2 — Enhanced)

Transforma qualquer prompt em uma foto genuinamente humana usando 5 camadas
de realismo + tecnicas avancadas da documentacao oficial do Google AI Studio.

Principio-chave da Google: "Describe the scene, don't just list keywords."
Paragrafos narrativos e descritivos superam listas desconectadas de palavras
porque aproveitam a compreensao profunda de linguagem do modelo.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import (
    HUMANIZATION_LEVELS,
    LIGHTING_OPTIONS,
    MODES,
    SHOT_TYPES,
    PROMPT_TEMPLATES,
    IMAGE_FORMATS,
    FORMAT_ALIASES,
    DEFAULT_HUMANIZATION,
    DEFAULT_MODE,
    DEFAULT_LIGHTING,
    RATE_LIMITS,
)


# =============================================================================
# CAMADAS DE HUMANIZACAO — Sistema de 5 camadas
# =============================================================================

LAYER_DEVICE = {
    "core": [
        "photograph taken with a smartphone camera, not a professional DSLR",
        "natural depth of field characteristic of a small phone camera lens",
        "no professional flash or external lighting — only ambient light",
    ],
    "enhanced": [
        "subtle lens distortion at the edges typical of wide-angle phone cameras",
        "natural image sensor noise that adds organic texture to the photograph",
        "phone auto-focus creating natural bokeh blur in the background",
        "slight chromatic aberration visible at high-contrast edges",
    ],
}

LAYER_LIGHTING = {
    "core": [
        "illuminated only by natural available light sources in the environment",
        "organic soft shadows with gradual transitions, no sharp artificial shadows",
        "no ring lights, studio softboxes, or professional lighting equipment visible",
    ],
    "enhanced": [
        "subtle light reflections on natural surfaces like skin, glass, and metal",
        "color temperature naturally varying across the scene from mixed light sources",
        "gentle light falloff creating natural depth and three-dimensionality",
    ],
}

LAYER_IMPERFECTION = {
    "core": [
        "composition is slightly imperfect — not mathematically centered or perfectly aligned",
        "natural selective focus where some elements are slightly soft in the background",
    ],
    "enhanced": [
        "micro hand tremor resulting in sharpness that is natural, not pixel-perfect",
        "random real-world elements in the environment that weren't intentionally placed",
        "the scene looks lived-in and genuine, not a carefully curated set",
        "horizon line may be very slightly tilted as happens with handheld phone shots",
    ],
}

LAYER_AUTHENTICITY = {
    "core": [
        "genuine natural facial expression — relaxed, candid, and human, not a stock photo pose",
        "wearing everyday clothing appropriate for the setting, not styled for a photoshoot",
        "real human skin texture — visible pores, subtle natural blemishes, organic color variation",
        "realistic natural body proportions without any exaggeration or idealization",
    ],
    "enhanced": [
        "captured in a candid moment, either unaware of the camera or casually self-aware",
        "hair has natural texture and movement, not perfectly salon-styled",
        "subtle imperfections that make the person immediately feel real and relatable",
        "eyes have natural moisture and light reflections, not digitally perfect catchlights",
        "hands and fingers look natural with visible knuckle creases and subtle veins",
    ],
}

LAYER_ENVIRONMENT = {
    "core": [
        "set in a real-world environment, not a generic studio backdrop or green screen",
        "everyday objects naturally present in the scene adding authenticity",
        "lighting is consistent with the physical location and time of day",
    ],
    "enhanced": [
        "time of day is coherent with the activity being performed in the scene",
        "background tells a story — a lived-in space with personality and history",
        "environmental details that anchor the scene firmly in reality",
        "natural depth with foreground, midground, and background layers",
        "subtle atmospheric elements like dust motes in light, steam, or air movement",
    ],
}


def _get_layers_for_level(level: str) -> list[str]:
    """Seleciona modificadores de camada baseado no nivel de humanizacao."""
    all_layers = [LAYER_DEVICE, LAYER_LIGHTING, LAYER_IMPERFECTION,
                  LAYER_AUTHENTICITY, LAYER_ENVIRONMENT]

    modifiers = []
    for layer in all_layers:
        modifiers.extend(layer["core"])
        if level in ("ultra", "natural"):
            modifiers.extend(layer["enhanced"])

    return modifiers


def _detect_shot_type(prompt: str) -> str | None:
    """Detecta o tipo de enquadramento ideal baseado no prompt."""
    prompt_lower = prompt.lower()

    shot_hints = {
        "close-up": ["rosto", "face", "retrato", "portrait", "close-up", "detalhe",
                     "macro", "olhos", "eyes", "labios"],
        "medium": ["sentado", "sitting", "mesa", "table", "cadeira", "chair",
                   "cafe", "coffee", "trabalhando", "working"],
        "wide": ["paisagem", "landscape", "praia", "beach", "montanha", "mountain",
                "cidade", "city", "parque", "park", "rua", "street"],
        "top-down": ["flat lay", "comida", "food", "mesa vista de cima", "overhead",
                    "ingredients", "ingredientes"],
        "medium-close": ["selfie", "busto", "conversando", "talking", "explicando"],
        "over-shoulder": ["tela", "screen", "computador", "computer", "notebook",
                        "livro", "book", "reading"],
        "pov": ["minha visao", "my view", "perspectiva", "primeira pessoa"],
    }

    for shot_type, keywords in shot_hints.items():
        if any(kw in prompt_lower for kw in keywords):
            return shot_type

    return "medium"  # default equilibrado


# =============================================================================
# FUNCAO PRINCIPAL DE HUMANIZACAO
# =============================================================================

def humanize_prompt(
    user_prompt: str,
    mode: str = DEFAULT_MODE,
    humanization: str = DEFAULT_HUMANIZATION,
    lighting: str | None = DEFAULT_LIGHTING,
    template_context: str | None = None,
    shot_type: str | None = None,
    resolution: str | None = None,
) -> str:
    """
    Transforma o prompt do usuario em um prompt humanizado completo.

    Usa a abordagem narrativa recomendada pela Google:
    paragrafos descritivos > listas de keywords.
    """
    # Auto-detectar shot type se nao fornecido
    if not shot_type:
        shot_type = _detect_shot_type(user_prompt)

    # ---- Construir prompt narrativo em paragrafos ----
    sections = []

    # 1. Abertura narrativa principal
    sections.append(
        f"A realistic {shot_type} photograph: {user_prompt}. "
        f"This is an authentic moment captured with a smartphone, "
        f"not a professional studio photograph."
    )

    # 2. Estilo do modo (influencer/educacional)
    mode_config = MODES.get(mode, MODES[DEFAULT_MODE])
    style_narrative = " ".join(mode_config["base_style"])
    sections.append(style_narrative)

    # 3. Camadas de humanizacao como narrativa coesa
    layer_mods = _get_layers_for_level(humanization)
    # Agrupar em frases fluidas em vez de lista
    if len(layer_mods) > 6:
        # Dividir em dois paragrafos
        mid = len(layer_mods) // 2
        sections.append(". ".join(layer_mods[:mid]))
        sections.append(". ".join(layer_mods[mid:]))
    else:
        sections.append(". ".join(layer_mods))

    # 4. Modificadores do nivel de humanizacao
    level_config = HUMANIZATION_LEVELS.get(humanization, HUMANIZATION_LEVELS[DEFAULT_HUMANIZATION])
    sections.append(". ".join(level_config["modifiers"]))

    # 5. Iluminacao
    if lighting and lighting in LIGHTING_OPTIONS:
        light_mods = LIGHTING_OPTIONS[lighting]["modifiers"]
        sections.append(". ".join(light_mods))

    # 6. Contexto de template
    if template_context:
        sections.append(template_context)

    # 7. Restricoes (o que evitar) — importante para guiar o modelo
    avoid_narrative = ". ".join(mode_config["avoid"])
    sections.append(avoid_narrative)

    # 8. Ancora final de realismo
    sections.append(
        "The final image must be completely indistinguishable from a real photograph "
        "taken by a real person with their smartphone in their everyday life. "
        "It should radiate genuine human warmth and authenticity — "
        "never looking artificial, sterile, AI-generated, or like stock photography."
    )

    # Montar prompt final com paragrafos separados (narrativo, nao lista)
    prompt = "\n\n".join(s.rstrip(".") + "." for s in sections)

    # Respeitar limite de tokens (480 tokens ~ 1800 chars conservador)
    max_chars = RATE_LIMITS["max_prompt_tokens"] * 4  # ~4 chars por token
    if len(prompt) > max_chars:
        # Versao compacta mantendo o essencial
        compact = [
            f"A realistic {shot_type} photograph: {user_prompt}.",
            " ".join(mode_config["base_style"][:3]) + ".",
            ". ".join(layer_mods[:6]) + ".",
            ". ".join(level_config["modifiers"][:4]) + ".",
            ". ".join(mode_config["avoid"][:3]) + ".",
            "Must look like a real phone photo, genuinely human and authentic.",
        ]
        prompt = " ".join(compact)

    return prompt


# =============================================================================
# ANALISADOR INTELIGENTE DE PROMPT
# =============================================================================

def analyze_prompt(user_prompt: str) -> dict:
    """
    Analisa o prompt do usuario e sugere configuracoes ideais para cada parametro.
    Retorna um dict completo com todas as sugestoes.
    """
    prompt_lower = user_prompt.lower()

    # ---- Detectar modo ----
    edu_keywords = [
        "aula", "curso", "tutorial", "ensino", "treino", "explicar",
        "demonstrar", "passo", "step", "educacao", "teach", "learn",
        "lesson", "workshop", "apresentacao", "presentation", "slide",
        "infografico", "diagram", "how-to", "how to", "como fazer",
        "aprenda", "aprender", "classe", "class", "professor", "teacher",
        "aluno", "student", "quadro", "whiteboard", "lousa",
    ]
    mode = "educacional" if any(kw in prompt_lower for kw in edu_keywords) else "influencer"

    # ---- Detectar formato ----
    format_hints = {
        "stories": ["stories", "story", "reels", "reel", "tiktok", "vertical", "shorts"],
        "widescreen": ["banner", "thumbnail", "youtube", "desktop", "panorama",
                       "landscape", "wide", "widescreen", "tv", "cinematico"],
        "ultrawide": ["ultrawide", "panoramico", "cinematico ultra", "21:9"],
        "portrait-45": ["retrato", "portrait", "instagram portrait", "vertical photo"],
        "portrait-23": ["pinterest", "pin", "poster", "cartaz"],
        "portrait-34": ["3:4", "card", "cartao"],
        "square": ["feed", "post", "quadrado", "square", "instagram", "perfil", "profile"],
    }

    detected_format = "square"
    for fmt, keywords in format_hints.items():
        if any(kw in prompt_lower for kw in keywords):
            detected_format = fmt
            break

    # ---- Detectar iluminacao ----
    lighting_hints = {
        "morning": ["manha", "morning", "amanhecer", "sunrise", "cafe da manha",
                    "breakfast", "early morning"],
        "golden-hour": ["por do sol", "sunset", "golden hour", "entardecer",
                        "dourado", "golden", "magic hour"],
        "night": ["noite", "night", "balada", "bar", "restaurante a noite",
                  "neon", "club", "evening"],
        "overcast": ["nublado", "overcast", "cloudy", "chuva", "rain", "dia cinza"],
        "indoor": ["escritorio", "office", "casa", "home", "indoor", "sala",
                   "quarto", "cozinha", "kitchen", "bedroom", "living room"],
        "midday": ["meio dia", "midday", "noon", "sol forte", "praia", "beach"],
        "blue-hour": ["hora azul", "blue hour", "twilight", "crepusculo"],
        "shade": ["sombra", "shade", "under tree", "debaixo", "coberto"],
    }

    detected_lighting = None
    for light, keywords in lighting_hints.items():
        if any(kw in prompt_lower for kw in keywords):
            detected_lighting = light
            break

    # ---- Detectar humanizacao ----
    humanization = "natural"
    if any(kw in prompt_lower for kw in ["ultra real", "super real", "celular velho",
                                          "raw", "sem filtro", "amateur", "amador"]):
        humanization = "ultra"
    elif any(kw in prompt_lower for kw in ["editorial", "revista", "magazine", "vogue"]):
        humanization = "editorial"
    elif any(kw in prompt_lower for kw in ["polido", "polished", "limpo", "clean",
                                            "profissional", "professional"]):
        humanization = "polished"

    # ---- Detectar shot type ----
    shot_type = _detect_shot_type(user_prompt)

    # ---- Detectar modelo ideal ----
    model = "imagen-4"  # default
    if any(kw in prompt_lower for kw in ["texto", "text", "logo", "titulo", "title",
                                          "4k", "ultra qualidade", "referencia"]):
        model = "gemini-pro-image"
    elif any(kw in prompt_lower for kw in ["rapido", "fast", "batch", "lote", "volume"]):
        model = "imagen-4-fast"

    # ---- Detectar resolucao ideal ----
    resolution = "1K"
    if any(kw in prompt_lower for kw in ["4k", "ultra hd", "altissima qualidade"]):
        resolution = "4K"
    elif any(kw in prompt_lower for kw in ["2k", "alta qualidade", "hd", "impressao", "print"]):
        resolution = "2K"

    return {
        "mode": mode,
        "format": detected_format,
        "humanization": humanization,
        "lighting": detected_lighting,
        "shot_type": shot_type,
        "model": model,
        "resolution": resolution,
        "analysis": {
            "is_educational": mode == "educacional",
            "format_reason": f"Detected '{detected_format}' from keywords",
            "lighting_reason": f"{'Auto' if not detected_lighting else detected_lighting}",
            "model_reason": f"{'Default balanced' if model == 'imagen-4' else model}",
        },
    }


# =============================================================================
# HELPER: Resolver aliases de formato
# =============================================================================

def resolve_format(user_input: str) -> str:
    """Resolve alias de formato para o nome canonico."""
    return FORMAT_ALIASES.get(user_input.lower().strip(), user_input)


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Motor de humanizacao de prompts para imagens")
    parser.add_argument("--prompt", required=True, help="Prompt do usuario")
    parser.add_argument("--mode", default=DEFAULT_MODE, choices=list(MODES.keys()))
    parser.add_argument("--humanization", default=DEFAULT_HUMANIZATION,
                       choices=list(HUMANIZATION_LEVELS.keys()))
    parser.add_argument("--lighting", default=None,
                       choices=list(LIGHTING_OPTIONS.keys()))
    parser.add_argument("--shot-type", default=None,
                       choices=list(SHOT_TYPES.keys()))
    parser.add_argument("--analyze", action="store_true",
                       help="Analisa prompt e sugere configuracoes")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    if args.analyze:
        analysis = analyze_prompt(args.prompt)
        if args.json:
            print(json.dumps(analysis, indent=2, ensure_ascii=False))
        else:
            print(f"Modo sugerido:         {analysis['mode']}")
            print(f"Formato sugerido:      {analysis['format']}")
            print(f"Humanizacao sugerida:  {analysis['humanization']}")
            print(f"Iluminacao sugerida:   {analysis['lighting'] or 'auto'}")
            print(f"Enquadramento:         {analysis['shot_type']}")
            print(f"Modelo sugerido:       {analysis['model']}")
            print(f"Resolucao sugerida:    {analysis['resolution']}")
        return

    humanized = humanize_prompt(
        user_prompt=args.prompt,
        mode=args.mode,
        humanization=args.humanization,
        lighting=args.lighting,
        shot_type=args.shot_type,
    )

    if args.json:
        result = {
            "original_prompt": args.prompt,
            "humanized_prompt": humanized,
            "char_count": len(humanized),
            "estimated_tokens": len(humanized) // 4,
            "settings": {
                "mode": args.mode,
                "humanization": args.humanization,
                "lighting": args.lighting,
                "shot_type": args.shot_type,
            },
            "timestamp": datetime.now().isoformat(),
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(humanized)
        print(f"\n--- {len(humanized)} chars | ~{len(humanized)//4} tokens ---")


if __name__ == "__main__":
    main()
