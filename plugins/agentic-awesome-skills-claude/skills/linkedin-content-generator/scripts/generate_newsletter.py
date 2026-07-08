"""
generate_newsletter.py — LinkedIn Newsletter Prompt Builder

Usage:
  python generate_newsletter.py --topic "<topic>" --niche "<niche>" [--title "<title>"] [--length <length>]

Length: short (~700w) | medium (~1200w) | long (~2000w)
"""

import argparse
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from utils import get_base_prompt_context

LENGTH_GUIDE = {
    "short":  "~600-800 words. Quick, punchy, skimmable. 2-3 sections max.",
    "medium": "~1000-1400 words. Balanced depth and readability. 3-4 sections.",
    "long":   "~1800-2500 words. Deep dive. 4-6 sections with subsections.",
}


def main():
    parser = argparse.ArgumentParser(description="Generate a LinkedIn Newsletter prompt")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--niche", required=True)
    parser.add_argument("--title", required=False, default="")
    parser.add_argument("--length", required=False, default="medium", choices=list(LENGTH_GUIDE.keys()))

    args = parser.parse_args()

    length_instruction = LENGTH_GUIDE.get(args.length, LENGTH_GUIDE["medium"])
    title_line = f"**Newsletter Title**: {args.title}" if args.title else "**Newsletter Title**: Generate a compelling SEO-optimised headline."
    context = get_base_prompt_context(args.niche, "LinkedIn Newsletter Article")

    prompt = f"""{context}

<TASK>
Generate a complete LinkedIn Newsletter edition.

**Topic**: {args.topic}
**Niche**: {args.niche}
{title_line}
**Length**: {args.length.upper()} — {length_instruction}

Required structure:
1. Headline (H1) — catchy, SEO-optimised, keyword-rich
2. Opening Hook — personal anecdote, surprising statistic, or bold claim (2-3 sentences)
3. Body Sections (H2 subheadings) — background, insights, examples, data
4. Key Takeaways — bulleted list (3-5 items)
5. Action Step — 1 specific thing to do this week
6. Engagement Question — ask 1 question to spark comments

Formatting: Markdown (H1, H2, H3, bold, bullets). Short paragraphs only.
Output ONLY the final newsletter. No commentary.
</TASK>"""

    print(prompt)


if __name__ == "__main__":
    main()
