"""
generate_carousel.py — LinkedIn Carousel Prompt Builder

Usage:
  python generate_carousel.py --topic "<topic>" --niche "<niche>" [--slides <n>] [--style <style>]

Style: how-to | listicle | myth-busting | framework | story-arc
"""

import argparse
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from utils import get_base_prompt_context

CAROUSEL_STYLES = {
    "how-to":       "Step-by-step guide. Slide 1 = problem, slides 2-N = steps, last = result/CTA.",
    "listicle":     "Curated list. Each slide = one item with bold title + 1-2 sentence explanation.",
    "myth-busting": "Each slide = one myth debunked. Format: 'MYTH: [belief]' → 'TRUTH: [reality]'.",
    "framework":    "Introduce a proprietary framework. Each slide = one component of the framework.",
    "story-arc":    "Transformation story. Slide 1 = before, middle = journey, last = after + CTA.",
}


def main():
    parser = argparse.ArgumentParser(description="Generate a LinkedIn Carousel prompt")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--niche", required=True)
    parser.add_argument("--slides", required=False, type=int, default=7)
    parser.add_argument("--style", required=False, default="listicle", choices=list(CAROUSEL_STYLES.keys()))

    args = parser.parse_args()

    slides = max(3, min(args.slides, 12))
    style_instruction = CAROUSEL_STYLES.get(args.style, CAROUSEL_STYLES["listicle"])
    context = get_base_prompt_context(args.niche, "LinkedIn Carousel")

    prompt = f"""{context}

<TASK>
Generate a complete LinkedIn Carousel with exactly {slides} slides.

**Topic**: {args.topic}
**Niche**: {args.niche}
**Style**: {args.style.upper()} — {style_instruction}

Slide structure:
- Slide 1 (Cover): Massive hook headline (max 8 words) + optional 1-sentence sub-headline
- Slides 2–{slides-1}: Follow the "{args.style}" style. Bold Title + 2-3 lines per slide.
- Slide {slides} (CTA): One clear action (e.g., "Follow for more", "Save this for later")

After the slides, provide:
---
📝 LinkedIn Caption:
- Hook line (different wording from Slide 1, same energy)
- 2-3 lines of teaser context
- "Swipe to see all {slides} →"
- 3-5 hashtags

Output slides numbered clearly. No extra commentary.
</TASK>"""

    print(prompt)


if __name__ == "__main__":
    main()
