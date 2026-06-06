"""
generate_calendar.py — LinkedIn Content Calendar Prompt Builder

Usage:
  python generate_calendar.py --niche "<niche>" [--days <n>] [--frequency "<freq>"] [--goal <goal>]

Goal: awareness | engagement | leads | authority | growth
"""

import argparse
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from utils import get_base_prompt_context

GOAL_GUIDE = {
    "awareness":  "Maximise reach. Focus on shareable, relatable, trending content. Heavy on carousels and controversial takes.",
    "engagement": "Maximise comments. Focus on opinion posts, polls, questions, and storytelling.",
    "leads":      "Generate DMs. Mix educational value posts with authority-building and clear CTAs to contact.",
    "authority":  "Position as expert. Deep insights, data-backed posts, newsletter content, thought leadership.",
    "growth":     "Grow followers fast. Mix viral formats (carousels, lists, contrarian) with high-value education.",
}

FORMAT_MIX = {
    "Text Post":       "Pure conversational text — personal story or insight",
    "Carousel":        "Multi-slide document — educational or list-based",
    "Poll":            "LinkedIn poll with 2-4 options — quick engagement spike",
    "Newsletter Link": "Teaser post linking to your newsletter edition",
    "Video Script":    "Script outline for a talking-head video",
    "Image + Caption": "Strong visual with punchy caption",
}


def main():
    parser = argparse.ArgumentParser(description="Generate a LinkedIn Content Calendar prompt")
    parser.add_argument("--niche", required=True)
    parser.add_argument("--days", required=False, type=int, default=30)
    parser.add_argument("--frequency", required=False, default="3 times a week")
    parser.add_argument("--goal", required=False, default="growth", choices=list(GOAL_GUIDE.keys()))

    args = parser.parse_args()

    goal_instruction = GOAL_GUIDE.get(args.goal, GOAL_GUIDE["growth"])
    formats_list = "\n".join([f"  - **{k}**: {v}" for k, v in FORMAT_MIX.items()])
    context = get_base_prompt_context(args.niche, "LinkedIn Content Calendar")

    prompt = f"""{context}

<TASK>
Generate a {args.days}-day LinkedIn Content Calendar for the "{args.niche}" niche.

**Posting Frequency**: {args.frequency}
**Primary Goal**: {args.goal.upper()} — {goal_instruction}

Available formats (use a strategic mix):
{formats_list}

For each post entry provide a Markdown table row:
| # | Day | Format | Topic / Angle | Hook (First Line) | CTA |

Calendar rules:
1. Never repeat the same format two days in a row
2. For every 4 posts: 2 educational, 1 personal/story, 1 opinion/controversial
3. Include at least 2 polls per month
4. Space carousels and newsletters evenly across the month
5. End each week with a reflection or motivational post

After the calendar table, provide:
- 📌 **Monthly Theme**: One overarching narrative tying the month together
- 🔑 **Top 5 SEO Keywords** to embed naturally across posts
- 📊 **Format Breakdown**: e.g., "8 Text Posts, 5 Carousels, 3 Polls..."

Output as a clean Markdown table. Ready to copy into Notion or Google Sheets.
</TASK>"""

    print(prompt)


if __name__ == "__main__":
    main()
