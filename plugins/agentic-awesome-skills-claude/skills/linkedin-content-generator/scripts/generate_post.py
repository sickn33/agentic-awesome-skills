"""
generate_post.py — LinkedIn Post Prompt Builder

Usage:
  python generate_post.py --topic "<topic>" --niche "<niche>" [--tone <tone>] [--style <style>]

Tone: professional | storytelling | controversial | educational | motivational
Style: text-only | list-based | storytelling | data-driven | contrarian
"""

import argparse
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from utils import get_base_prompt_context

TONE_GUIDE = {
    "professional":  "Write with authority and expertise. Clear, polished, data-backed where possible.",
    "storytelling":  "Lead with a personal story or narrative. Make the reader feel something before delivering the insight.",
    "controversial": "Take a bold, contrarian stance. Challenge the conventional wisdom in the niche. Prepare for debate.",
    "educational":   "Break down a complex concept simply. Use analogies, numbered steps, or mini-frameworks.",
    "motivational":  "Inspire and energize. Use strong action verbs. Make the reader feel capable and driven.",
}

STYLE_GUIDE = {
    "text-only":   "Write as flowing text paragraphs. No bullet points. Pure conversational prose.",
    "list-based":  "Structure the core value as a numbered or bulleted list. Maximum 7 items.",
    "storytelling":"Write as a narrative arc: Setup → Conflict → Resolution → Lesson.",
    "data-driven": "Anchor every key point with a statistic, study, or concrete example.",
    "contrarian":  "Start by stating what everyone believes, then flip it. Use 'But here's what they miss:' or similar.",
}


def main():
    parser = argparse.ArgumentParser(description="Generate a LinkedIn Post prompt")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--niche", required=True)
    parser.add_argument("--tone", required=False, default="professional", choices=list(TONE_GUIDE.keys()))
    parser.add_argument("--style", required=False, default="list-based", choices=list(STYLE_GUIDE.keys()))

    args = parser.parse_args()

    tone_instruction  = TONE_GUIDE.get(args.tone, TONE_GUIDE["professional"])
    style_instruction = STYLE_GUIDE.get(args.style, STYLE_GUIDE["list-based"])
    context = get_base_prompt_context(args.niche, "LinkedIn Text Post")

    prompt = f"""{context}

<TASK>
Generate a single, ready-to-publish LinkedIn post.

**Topic**: {args.topic}
**Niche**: {args.niche}
**Tone**: {tone_instruction}
**Style**: {style_instruction}

Mandatory output structure:
1. Hook (2 lines — scroll-stopping)
2. [blank line]
3. Body (follow tone + style instructions)
4. [blank line]
5. Key Takeaway (1-2 punchy sentences)
6. [blank line]
7. CTA (specific, value-driven)
8. [blank line]
9. Hashtags (3-5 only)

Output ONLY the final post. No preamble. Ready to paste into LinkedIn.
</TASK>"""

    print(prompt)


if __name__ == "__main__":
    main()
