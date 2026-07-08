"""
AI Studio Image — Templates Pre-configurados

Biblioteca de templates prontos para cenarios comuns de geracao de imagens.
Cada template inclui um prompt base, configuracoes ideais e contexto
adicional para o motor de humanizacao.

Uso:
    python templates.py --list                     # Listar todos
    python templates.py --list --mode influencer   # Filtrar por modo
    python templates.py --show cafe-lifestyle      # Detalhes de um template
    python templates.py --show all --json          # Todos em JSON
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# =============================================================================
# TEMPLATES — MODO INFLUENCER
# =============================================================================

INFLUENCER_TEMPLATES = {
    "cafe-lifestyle": {
        "name": "Cafe Lifestyle",
        "mode": "influencer",
        "prompt": "Young person sitting in a cozy coffee shop, holding a warm latte with latte art, soft natural window light, wooden table with a book or phone nearby, relaxed genuine smile, casual trendy outfit",
        "context": "Lifestyle cafe scene. Warm ambient tones, shallow depth of field on the cup, background slightly blurred with other customers. Morning or afternoon light from large windows.",
        "suggested_format": "square",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["cafe", "coffee", "lifestyle", "relax", "morning"],
    },
    "outdoor-adventure": {
        "name": "Outdoor Adventure",
        "mode": "influencer",
        "prompt": "Person on an outdoor trail or scenic viewpoint, wearing casual hiking or athletic clothes, natural landscape in background, wind slightly moving their hair, genuine excited expression looking at the view",
        "context": "Adventure/travel content. Expansive natural scenery, golden or midday light, sense of freedom and exploration. Person is a small-to-medium part of the frame with landscape dominating.",
        "suggested_format": "landscape",
        "suggested_lighting": "golden-hour",
        "suggested_humanization": "natural",
        "tags": ["outdoor", "adventure", "travel", "nature", "hiking"],
    },
    "workspace-minimal": {
        "name": "Workspace Minimal",
        "mode": "influencer",
        "prompt": "Clean minimalist desk setup with laptop, a cup of coffee, and a small plant, person's hands typing or writing in a notebook, warm indoor light, organized but lived-in workspace",
        "context": "Productivity/work-from-home aesthetic. Top-down or 45-degree angle. Neutral color palette with one accent color. Focus on the hands and items, face not necessary.",
        "suggested_format": "square",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["workspace", "desk", "productivity", "minimal", "home office"],
    },
    "fitness-natural": {
        "name": "Fitness Natural",
        "mode": "influencer",
        "prompt": "Person doing a workout outdoors or in a bright gym, natural sweat on skin, focused expression, athletic wear, mid-exercise action shot, strong natural lighting",
        "context": "Fitness content that feels real — not overly posed or filtered. Show genuine effort and energy. Natural body with real muscle definition. Outdoor park, trail, or well-lit gym.",
        "suggested_format": "portrait",
        "suggested_lighting": "morning",
        "suggested_humanization": "natural",
        "tags": ["fitness", "workout", "gym", "health", "exercise"],
    },
    "food-flat-lay": {
        "name": "Food Flat Lay",
        "mode": "influencer",
        "prompt": "Top-down view of a beautifully arranged meal on a rustic table, hands reaching to pick up food or holding utensils, multiple dishes and drinks visible, natural daylight from above",
        "context": "Food photography that looks homemade and genuine, not restaurant-styled. Imperfect plating, real portions, visible crumbs. Rustic wooden or textured surface. Include hands for human element.",
        "suggested_format": "square",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["food", "flat lay", "meal", "cooking", "restaurant"],
    },
    "urban-street": {
        "name": "Urban Street",
        "mode": "influencer",
        "prompt": "Person walking on a vibrant city street, urban architecture in background, casual stylish outfit, candid walking pose, street art or interesting storefronts visible",
        "context": "Street style content. Urban environment with character — graffiti, neon signs, interesting buildings. Person caught mid-stride or pausing naturally. City energy and atmosphere.",
        "suggested_format": "portrait",
        "suggested_lighting": "overcast",
        "suggested_humanization": "natural",
        "tags": ["urban", "street", "city", "fashion", "walk"],
    },
    "golden-hour-portrait": {
        "name": "Golden Hour Portrait",
        "mode": "influencer",
        "prompt": "Close-up portrait of a person during golden hour, warm sunlight hitting their face from the side, natural genuine smile or contemplative expression, wind in their hair, blurred warm background",
        "context": "The classic golden hour portrait that gets maximum engagement. Warm amber backlighting, lens flare welcome, skin glowing naturally. Intimate framing, shoulders-up.",
        "suggested_format": "portrait",
        "suggested_lighting": "golden-hour",
        "suggested_humanization": "natural",
        "tags": ["portrait", "golden hour", "sunset", "face", "close-up"],
    },
    "mirror-selfie": {
        "name": "Mirror Selfie",
        "mode": "influencer",
        "prompt": "Person taking a mirror selfie in a well-lit room, phone visible in hand, casual outfit, relaxed stance, clean mirror with slight reflections, real room visible in background",
        "context": "The authentic mirror selfie. Room should look real — bed, furniture, some items around. Phone held at chest height. Natural pose, not overly practiced. Slight mirror spots or smudges add realism.",
        "suggested_format": "stories",
        "suggested_lighting": "indoor",
        "suggested_humanization": "ultra",
        "tags": ["selfie", "mirror", "ootd", "casual", "room"],
    },
    "product-in-use": {
        "name": "Product In Use",
        "mode": "influencer",
        "prompt": "Close-up of hands using or holding a product naturally, real skin texture visible, product integrated into everyday scene, soft focus background showing daily environment",
        "context": "Product photography that feels organic, not commercial. The product is being genuinely used, not displayed. Person's hands show real interaction. Background tells a story of daily life.",
        "suggested_format": "square",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["product", "hands", "unboxing", "review", "close-up"],
    },
    "behind-scenes": {
        "name": "Behind The Scenes",
        "mode": "influencer",
        "prompt": "Candid behind-the-scenes moment of someone working on a creative project, messy creative space, tools and materials around, genuine concentration or laughing moment, raw and unpolished feel",
        "context": "The BTS content that humanizes a brand/person. Show the messy reality of creation. Cables, tools, half-finished work, coffee cups. The person is caught naturally, not posing for the camera.",
        "suggested_format": "square",
        "suggested_lighting": "indoor",
        "suggested_humanization": "ultra",
        "tags": ["bts", "behind scenes", "creative", "work", "candid"],
    },
}

# =============================================================================
# TEMPLATES — MODO EDUCACIONAL
# =============================================================================

EDUCATIONAL_TEMPLATES = {
    "tutorial-step": {
        "name": "Tutorial Step",
        "mode": "educacional",
        "prompt": "Person demonstrating a step in a tutorial, clearly showing their hands performing an action, well-lit workspace, focused camera angle on the demonstration area, clean organized environment",
        "context": "Educational step-by-step content. The action being demonstrated must be clearly visible. Good lighting on the work area. Person partially visible (hands, torso) to maintain human connection. Clean but not sterile environment.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["tutorial", "step", "demo", "how-to", "hands"],
    },
    "whiteboard-explain": {
        "name": "Whiteboard Explanation",
        "mode": "educacional",
        "prompt": "Person standing next to a whiteboard or large screen with diagrams and notes, pointing at or writing on the board, professional but approachable appearance, bright well-lit room",
        "context": "Teaching/explaining concept. The whiteboard content should be readable. Person looks engaged and enthusiastic about teaching. Natural classroom or meeting room setting. Good contrast between person and board.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["whiteboard", "explain", "teaching", "diagram", "class"],
    },
    "hands-on-demo": {
        "name": "Hands-On Demo",
        "mode": "educacional",
        "prompt": "Close-up of hands performing a detailed task or craft, clear focus on the technique, tools and materials neatly arranged, good top-down or 45-degree lighting, educational context",
        "context": "Focus entirely on the hands and the action. The technique being shown must be crystal clear. Professional lighting from above. Minimal distractions. This is about teaching a skill through visual demonstration.",
        "suggested_format": "square",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["hands", "craft", "technique", "close-up", "skill"],
    },
    "before-after": {
        "name": "Before/After Comparison",
        "mode": "educacional",
        "prompt": "Side-by-side or sequential comparison showing a transformation, clear visual difference between states, labeled or visually distinct sections, clean presentation",
        "context": "Educational comparison content. The difference must be immediately obvious. Clean dividing line or clear spatial separation. Consistent lighting and angle between both states. Labels or indicators if helpful.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["before-after", "comparison", "transformation", "result"],
    },
    "tool-showcase": {
        "name": "Tool Showcase",
        "mode": "educacional",
        "prompt": "Person using a software tool or application on a laptop/desktop screen, the interface clearly visible, person looking at screen with engaged expression, modern workspace",
        "context": "Showing a tool or software in use. Screen content should be readable. Person provides human context but screen is the star. Modern, clean desk setup. Natural indoor lighting without glare on screen.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["tool", "software", "screen", "app", "tech"],
    },
    "classroom-natural": {
        "name": "Natural Classroom",
        "mode": "educacional",
        "prompt": "Small group learning environment, instructor and students interacting naturally, diverse group, bright airy room, whiteboards or screens in background, genuine engagement and discussion",
        "context": "Real classroom/workshop atmosphere. People are genuinely engaged — asking questions, taking notes, discussing. Not posed group photo. Natural interactions captured candidly. Diverse, inclusive group.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["classroom", "group", "workshop", "learning", "team"],
    },
    "infographic-human": {
        "name": "Infographic with Human Element",
        "mode": "educacional",
        "prompt": "Person standing next to or gesturing towards a large data visualization, charts, or infographic display, professional attire, pointing at specific data points, conference or office setting",
        "context": "Data presentation with human element. The person makes the data approachable. Professional but not corporate-stiff. Gesturing naturally at important data points. Display is readable and well-designed.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "polished",
        "tags": ["infographic", "data", "charts", "presentation", "business"],
    },
    "interview-setup": {
        "name": "Interview/Podcast Setup",
        "mode": "educacional",
        "prompt": "Two people in a casual interview or podcast setting, microphones visible, comfortable seating, natural conversation happening, warm lighting, professional but relaxed atmosphere",
        "context": "Podcast/interview visual. Two people genuinely engaged in conversation. Visible but not distracting equipment (mic, headphones). Warm, inviting space. Eye contact between speakers. Natural gestures.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["interview", "podcast", "conversation", "two-people", "talk"],
    },
    "screen-recording-human": {
        "name": "Screen Recording with Human",
        "mode": "educacional",
        "prompt": "Person sitting at desk with laptop open, screen showing content, person looking at camera or screen with friendly expression, webcam-style angle, headphones around neck",
        "context": "The human face behind screen content. Classic educator/YouTuber setup. Person is approachable and trustworthy. Screen visible but not the main focus. Good lighting on face. Authentic home office or studio.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["screen", "webcam", "youtube", "educator", "laptop"],
    },
    "team-collaboration": {
        "name": "Team Collaboration",
        "mode": "educacional",
        "prompt": "Small team of 3-4 people collaborating around a table or screen, post-it notes and materials visible, active discussion and brainstorming, natural diverse group, modern office or co-working space",
        "context": "Real teamwork in action. People are actively contributing — writing, pointing, discussing. Messy creative energy with post-its, papers, laptops. Genuine interaction, not posed corporate photo. Diverse team.",
        "suggested_format": "landscape",
        "suggested_lighting": "indoor",
        "suggested_humanization": "natural",
        "tags": ["team", "collaboration", "brainstorm", "meeting", "group"],
    },
}


# =============================================================================
# FUNCOES DE ACESSO
# =============================================================================

ALL_TEMPLATES = {**INFLUENCER_TEMPLATES, **EDUCATIONAL_TEMPLATES}


def get_template(name: str) -> dict | None:
    """Retorna um template pelo nome."""
    return ALL_TEMPLATES.get(name)


def list_templates(mode: str | None = None) -> dict:
    """Lista templates disponiveis, opcionalmente filtrados por modo."""
    if mode == "influencer":
        return INFLUENCER_TEMPLATES
    elif mode == "educacional":
        return EDUCATIONAL_TEMPLATES
    return ALL_TEMPLATES


def search_templates(query: str) -> list[dict]:
    """Busca templates por palavras-chave nas tags."""
    query_lower = query.lower()
    results = []
    for name, tmpl in ALL_TEMPLATES.items():
        tags = tmpl.get("tags", [])
        if any(query_lower in tag for tag in tags) or query_lower in tmpl.get("prompt", "").lower():
            results.append({"name": name, **tmpl})
    return results


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Templates de imagens humanizadas")
    parser.add_argument("--list", action="store_true", help="Listar todos os templates")
    parser.add_argument("--mode", choices=["influencer", "educacional"],
                       help="Filtrar por modo")
    parser.add_argument("--show", help="Mostrar detalhes de um template")
    parser.add_argument("--search", help="Buscar por palavra-chave")
    parser.add_argument("--json", action="store_true", help="Output em JSON")

    args = parser.parse_args()

    if args.list:
        templates = list_templates(args.mode)
        if args.json:
            print(json.dumps(templates, indent=2, ensure_ascii=False))
        else:
            current_mode = None
            for name, tmpl in templates.items():
                if tmpl["mode"] != current_mode:
                    current_mode = tmpl["mode"]
                    header = "INFLUENCER" if current_mode == "influencer" else "EDUCACIONAL"
                    print(f"\n{'='*50}")
                    print(f"  MODO {header}")
                    print(f"{'='*50}")

                print(f"\n  {name}")
                print(f"    {tmpl['name']}")
                print(f"    Formato: {tmpl['suggested_format']} | "
                      f"Luz: {tmpl['suggested_lighting']} | "
                      f"Human: {tmpl['suggested_humanization']}")
                print(f"    Tags: {', '.join(tmpl.get('tags', []))}")
        return

    if args.show:
        if args.show == "all":
            templates = list_templates(args.mode)
            print(json.dumps(templates, indent=2, ensure_ascii=False))
        else:
            tmpl = get_template(args.show)
            if tmpl:
                if args.json:
                    print(json.dumps({args.show: tmpl}, indent=2, ensure_ascii=False))
                else:
                    print(f"\nTemplate: {tmpl['name']}")
                    print(f"Modo:     {tmpl['mode']}")
                    print(f"Formato:  {tmpl['suggested_format']}")
                    print(f"Luz:      {tmpl['suggested_lighting']}")
                    print(f"Human:    {tmpl['suggested_humanization']}")
                    print(f"Tags:     {', '.join(tmpl.get('tags', []))}")
                    print(f"\nPrompt Base:")
                    print(f"  {tmpl['prompt']}")
                    print(f"\nContexto:")
                    print(f"  {tmpl['context']}")
            else:
                print(f"Template '{args.show}' nao encontrado")
                sys.exit(1)
        return

    if args.search:
        results = search_templates(args.search)
        if args.json:
            print(json.dumps(results, indent=2, ensure_ascii=False))
        else:
            if results:
                print(f"\n{len(results)} template(s) encontrado(s) para '{args.search}':\n")
                for r in results:
                    print(f"  {r['name']} [{r['mode']}] — {r.get('tags', [])}")
            else:
                print(f"Nenhum template encontrado para '{args.search}'")
        return

    # Default: listar tudo
    parser.print_help()


if __name__ == "__main__":
    main()
