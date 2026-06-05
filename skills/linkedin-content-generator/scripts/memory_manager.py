"""
memory_manager.py — Reinforcement Learning Memory Manager for LinkedIn Content Skill.
Resolves memory.md relative to this script's location (inside .claude/skills/scripts/).

Commands:
  python memory_manager.py add   --id <id> --feedback <text> [--tags <tags>]
  python memory_manager.py read
  python memory_manager.py clear
"""

import argparse
import json
import os
import sys
from datetime import datetime

# ─── Configuration ────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MEMORY_FILE = os.path.join(SCRIPT_DIR, "memory.md")

MEMORY_TEMPLATE = """# LinkedIn Content Memory

This file is the reinforcement learning database for the LinkedIn Content Skill.
It is automatically read by every generator script to personalise your content.
Use `/feedback` to update it. Use `/show-memory` to review it.

---

## 🧠 Core Identity & Tone
- **Primary Niche:** (Update this — e.g. "AI & Technology", "Marketing", "SaaS")
- **Tone:** Professional, insightful, concise, and story-driven.
- **Voice:** First-person. Confident but humble. Write to one person, not an audience.
- **Formatting Preference:** Short paragraphs (1-2 sentences). Aggressive line breaks. Bullet points over dense paragraphs.
- **Emojis:** Use sparingly — 2-3 max per post, only where they genuinely add value.
- **CTA Style:** Specific and value-driven. Never "like and share" — always give a reason.

---

## 🎯 Successful Hooks
> Add hooks that received high engagement here.
- (Empty — use `/feedback` to add your first successful hook)

---

## 📈 Top Performing Formats
> Note which content formats get the best reactions.
- (Empty — use `/feedback` to log your best performing format)

---

## 🔑 High-Performing Topics
> Track which topics resonate most with your audience.
- (Empty — use `/feedback` to log topics that hit well)

---

## 🚫 What to Avoid
> Patterns, phrases, or formats that underperformed.
- Avoid cliché openers like "In today's fast-paced world..."
- Avoid posting without a clear CTA
- Avoid hashtag stuffing (max 5)

---

## 📝 Positive Feedback Log
"""


def ensure_memory_exists():
    if not os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            f.write(MEMORY_TEMPLATE)


def read_memory() -> str:
    ensure_memory_exists()
    with open(MEMORY_FILE, "r", encoding="utf-8") as f:
        return f.read()


def append_feedback(content_id: str, feedback_text: str, tags: str = ""):
    ensure_memory_exists()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    entry = f"\n### [{timestamp}] — {content_id}\n"
    entry += f"- **What worked:** {feedback_text}\n"
    if tags:
        entry += f"- **Tags:** `{tags.strip()}`\n"

    with open(MEMORY_FILE, "a", encoding="utf-8") as f:
        f.write(entry)

    print(json.dumps({
        "status": "success",
        "message": f"✅ Memory updated in {MEMORY_FILE}",
        "entry_id": content_id,
        "timestamp": timestamp,
        "instruction": "This feedback will now be injected into all future content generation prompts."
    }, indent=2))


def clear_memory():
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        f.write(MEMORY_TEMPLATE)
    print(json.dumps({
        "status": "success",
        "message": "✅ Memory has been cleared and reset to defaults."
    }, indent=2))


def main():
    parser = argparse.ArgumentParser(description="LinkedIn Content Skill — Memory Manager")
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="Save positive feedback to memory")
    add_parser.add_argument("--id", required=True)
    add_parser.add_argument("--feedback", required=True)
    add_parser.add_argument("--tags", required=False, default="")

    subparsers.add_parser("read", help="Display current memory")
    subparsers.add_parser("clear", help="Reset memory to defaults")

    args = parser.parse_args()

    if args.command == "add":
        append_feedback(args.id, args.feedback, args.tags)
    elif args.command == "read":
        print(read_memory())
    elif args.command == "clear":
        clear_memory()


if __name__ == "__main__":
    main()
