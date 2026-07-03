#!/usr/bin/env python3
"""
Setup a new Telegram Bot project with boilerplate code.

Usage:
    python setup_project.py --language nodejs --path ./my-telegram-bot
    python setup_project.py --language python --path ./my-telegram-bot
    python setup_project.py --language python --path ./my-bot --with-webhook --with-ai
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
BOILERPLATE_DIR = os.path.join(SKILL_DIR, "assets", "boilerplate")


def copy_tree_contents(source_dir: str, target_dir: str) -> None:
    source_root = Path(source_dir)
    target_root = Path(target_dir)
    target_root.mkdir(parents=True, exist_ok=True)
    for source_path in source_root.rglob("*"):
        relative_path = source_path.relative_to(source_root)
        target_path = target_root / relative_path
        if source_path.is_dir():
            target_path.mkdir(parents=True, exist_ok=True)
        elif source_path.is_file():
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(source_path.read_bytes())


def setup_nodejs(project_path: str, with_webhook: bool = False, with_ai: bool = False):
    """Setup Node.js/TypeScript project."""
    src_dir = os.path.join(BOILERPLATE_DIR, "nodejs")

    if not os.path.exists(src_dir):
        print(f"ERROR: Boilerplate not found at {src_dir}")
        sys.exit(1)

    # Copy boilerplate
    copy_tree_contents(src_dir, project_path)

    print(f"Node.js project created at: {project_path}")
    print("\nNext steps:")
    print(f"  1. cd {project_path}")
    print("  2. npm install")
    print("  3. Copy .env.example to .env and add your bot token")
    print("  4. npm run dev  (development with hot reload)")
    print("  5. npm run build && npm start  (production)")

    if with_webhook:
        print("\n  Webhook mode enabled - configure WEBHOOK_URL in .env")
    if with_ai:
        print("\n  AI integration enabled - configure ANTHROPIC_API_KEY in .env")


def setup_python(project_path: str, with_webhook: bool = False, with_ai: bool = False):
    """Setup Python project."""
    src_dir = os.path.join(BOILERPLATE_DIR, "python")

    if not os.path.exists(src_dir):
        print(f"ERROR: Boilerplate not found at {src_dir}")
        sys.exit(1)

    # Copy boilerplate
    copy_tree_contents(src_dir, project_path)

    print(f"Python project created at: {project_path}")
    print("\nNext steps:")
    print(f"  1. cd {project_path}")
    print("  2. pip install -r requirements.txt")
    print("  3. Copy .env.example to .env and add your bot token")
    print("  4. python bot.py  (long polling mode)")

    if with_webhook:
        print("  5. python webhook_server.py  (webhook mode)")
    if with_ai:
        print("\n  AI integration enabled - configure ANTHROPIC_API_KEY in .env")


def main():
    parser = argparse.ArgumentParser(description="Setup Telegram Bot project")
    parser.add_argument("--language", type=str, required=True,
                        choices=["nodejs", "python"],
                        help="Project language")
    parser.add_argument("--path", type=str, required=True,
                        help="Project directory path")
    parser.add_argument("--with-webhook", action="store_true",
                        help="Include webhook server setup")
    parser.add_argument("--with-ai", action="store_true",
                        help="Include AI integration boilerplate")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing directory")
    args = parser.parse_args()

    project_path = os.path.abspath(args.path)

    if os.path.exists(project_path) and not args.force:
        print(f"ERROR: Directory already exists: {project_path}")
        print("Use --force to overwrite")
        sys.exit(1)

    os.makedirs(project_path, exist_ok=True)

    if args.language == "nodejs":
        setup_nodejs(project_path, args.with_webhook, args.with_ai)
    elif args.language == "python":
        setup_python(project_path, args.with_webhook, args.with_ai)

    print("\nDone!")


if __name__ == "__main__":
    main()
