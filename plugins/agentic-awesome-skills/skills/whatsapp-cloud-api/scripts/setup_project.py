#!/usr/bin/env python3
"""
Setup a new WhatsApp Cloud API project with boilerplate code.

Usage:
    python setup_project.py --language nodejs --path ./my-whatsapp-project
    python setup_project.py --language python --path ./my-whatsapp-project
"""

import argparse
import os
import shutil
import sys
from pathlib import Path


def get_skill_dir() -> str:
    """Get the skill directory (parent of scripts/)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _safe_target_path(path: str, skill_dir: str) -> str:
    target_path = os.path.abspath(path)
    skill_root = os.path.abspath(skill_dir)
    if os.path.commonpath([target_path, skill_root]) == skill_root:
        raise ValueError("Refusing to create a project inside the skill source directory")
    return target_path


def self_test() -> None:
    skill_dir = get_skill_dir()
    _safe_target_path(os.path.join(os.path.dirname(skill_dir), "my-whatsapp-project"), skill_dir)
    try:
        _safe_target_path(os.path.join(skill_dir, "assets", "x"), skill_dir)
    except ValueError:
        return
    raise AssertionError("accepted target inside skill source directory")


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


def setup_project(language: str, path: str, name: str | None = None) -> None:
    """Copy boilerplate and configure a new WhatsApp project."""
    skill_dir = get_skill_dir()
    boilerplate_dir = os.path.join(skill_dir, "assets", "boilerplate", language)

    if not os.path.exists(boilerplate_dir):
        print(f"Error: Boilerplate not found for language '{language}'")
        print(f"Available: nodejs, python")
        sys.exit(1)

    target_path = _safe_target_path(path, skill_dir)

    if os.path.exists(target_path) and os.listdir(target_path):
        print(f"Warning: Directory '{target_path}' already exists and is not empty.")
        response = input("Continue and overwrite? (y/N): ").strip().lower()
        if response != "y":
            print("Aborted.")
            sys.exit(0)

    # Copy boilerplate
    print(f"Creating {language} project at: {target_path}")
    copy_tree_contents(boilerplate_dir, target_path)

    # Rename .env.example to .env
    env_example = os.path.join(target_path, ".env.example")
    env_file = os.path.join(target_path, ".env")
    if os.path.exists(env_example) and not os.path.exists(env_file):
        shutil.copy2(env_example, env_file)
        print("Created .env from .env.example")

    # Update project name if provided
    if name and language == "nodejs":
        package_json = os.path.join(target_path, "package.json")
        if os.path.exists(package_json):
            with open(package_json, "r") as f:
                content = f.read()
            content = content.replace('"whatsapp-cloud-api"', f'"{name}"')
            with open(package_json, "w") as f:
                f.write(content)

    print()
    print("=" * 50)
    print("Project created successfully!")
    print("=" * 50)
    print()
    print("Next steps:")
    print()

    if language == "nodejs":
        print(f"  1. cd {target_path}")
        print("  2. npm install")
        print("  3. Edit .env with your WhatsApp API credentials")
        print("  4. npm run dev")
        print()
        print("For production:")
        print("  npm run build && npm start")
    else:
        print(f"  1. cd {target_path}")
        print("  2. pip install -r requirements.txt")
        print("  3. Edit .env with your WhatsApp API credentials")
        print("  4. python app.py")
        print()
        print("For production:")
        print("  gunicorn -w 4 -b 0.0.0.0:3000 app:app")

    print()
    print("For local development with webhooks:")
    print("  ngrok http 3000")
    print("  Then configure the ngrok URL in Meta Developers > WhatsApp > Configuration")
    print()
    print("Need help with setup? Read: references/setup-guide.md")


def main():
    parser = argparse.ArgumentParser(description="Setup a new WhatsApp Cloud API project")
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run safety self-checks",
    )
    parser.add_argument(
        "--language",
        choices=["nodejs", "python"],
        required=False,
        help="Project language (nodejs or python)",
    )
    parser.add_argument(
        "--path",
        required=False,
        help="Path where the project will be created",
    )
    parser.add_argument(
        "--name",
        default=None,
        help="Project name (optional, used in package.json for nodejs)",
    )

    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.language or not args.path:
        parser.error("--language and --path are required unless --self-test is used")
    setup_project(args.language, args.path, args.name)


if __name__ == "__main__":
    main()
