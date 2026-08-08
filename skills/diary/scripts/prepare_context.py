#!/usr/bin/env python3
"""
AI Agent Context Preparer v2
Usage: python prepare_context.py [directory_path]
Generates a standardized AGENT_CONTEXT.md with 5 core sections:
  1. 專案目標 (Project Goal) - from README
  2. 技術棧與環境 (Tech Stack) - from config files
  3. 核心目錄結構 (Core Structure) - recursive tree
  4. 架構與設計約定 (Conventions) - from L1 cache
  5. 目前進度與待辦 (Status & TODO) - from latest diary
"""

import os
import sys
import json
import glob
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path
from datetime import datetime


def get_tree(path, prefix="", max_depth=3, current_depth=0):
    """Recursive directory tree generator with depth limit."""
    if current_depth >= max_depth:
        return []
    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        return []
    tree_lines = []
    skip_prefixes = (".", "node_modules", "__pycache__", "dist", "build", "venv", ".git")
    filtered = [e for e in entries if not e.startswith(skip_prefixes)]
    for i, entry in enumerate(filtered):
        is_last = i == len(filtered) - 1
        connector = "└── " if is_last else "├── "
        full_path = os.path.join(path, entry)
        tree_lines.append(f"{prefix}{connector}{entry}")
        if os.path.isdir(full_path):
            extension = "    " if is_last else "│   "
            tree_lines.extend(get_tree(full_path, prefix + extension, max_depth, current_depth + 1))
    return tree_lines


def extract_readme_summary(root):
    """Extract first meaningful paragraph from README as project goal."""
    readme = root / "README.md"
    if not readme.exists():
        return None
    text = readme.read_text(encoding="utf-8", errors="ignore")
    lines = text.strip().split("\n")
    # Skip title lines (# heading) and blank lines, grab first paragraph
    summary_lines = []
    found_content = False
    for line in lines:
        stripped = line.strip()
        if not found_content:
            if stripped and not stripped.startswith("#"):
                found_content = True
                summary_lines.append(stripped)
        else:
            if stripped == "" and summary_lines:
                break
            summary_lines.append(stripped)
    return " ".join(summary_lines) if summary_lines else None


def extract_tech_stack(root):
    """Extract tech stack info from config files."""
    stack_info = []

    # package.json
    pkg = root / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8"))
            deps = list(data.get("dependencies", {}).keys())
            dev_deps = list(data.get("devDependencies", {}).keys())
            if deps:
                stack_info.append(f"* **核心套件**：{', '.join(deps[:10])}")
            if dev_deps:
                stack_info.append(f"* **開發套件**：{', '.join(dev_deps[:8])}")
            if "scripts" in data:
                scripts = list(data["scripts"].keys())
                stack_info.append(f"* **可用指令**：{', '.join(scripts)}")
        except (json.JSONDecodeError, KeyError):
            pass

    # pyproject.toml - basic extraction
    pyproject = root / "pyproject.toml"
    if pyproject.exists():
        text = pyproject.read_text(encoding="utf-8", errors="ignore")
        stack_info.append(f"* **Python 專案**：使用 pyproject.toml 管理")
        # Simple dependency extraction
        if "dependencies" in text:
            stack_info.append("* _詳見 pyproject.toml 的 dependencies 區塊_")

    # requirements.txt
    reqs = root / "requirements.txt"
    if reqs.exists():
        req_lines = [l.strip().split("==")[0].split(">=")[0]
                     for l in reqs.read_text(encoding="utf-8", errors="ignore").strip().split("\n")
                     if l.strip() and not l.startswith("#")]
        if req_lines:
            stack_info.append(f"* **Python 套件**：{', '.join(req_lines[:10])}")

    return stack_info


def extract_latest_diary_todos(root):
    """Find the latest diary file and extract Next Steps / TODO items."""
    # Search common diary locations
    diary_dirs = [
        root / "diary",
        Path(os.path.expanduser("~")) / ".gemini" / "antigravity" / "global_skills" / "auto-skill" / "diary",
    ]

    latest_file = None
    latest_date = ""

    for diary_dir in diary_dirs:
        if not diary_dir.exists():
            continue
        # Glob for markdown files recursively
        for md_file in diary_dir.rglob("*.md"):
            name = md_file.stem
            # Try to extract date from filename (YYYY-MM-DD format)
            if len(name) >= 10 and name[:4].isdigit():
                date_str = name[:10]
                if date_str > latest_date:
                    latest_date = date_str
                    latest_file = md_file

    if not latest_file:
        return None, []

    text = latest_file.read_text(encoding="utf-8", errors="ignore")
    lines = text.split("\n")

    todos = []
    in_next_section = False
    for line in lines:
        stripped = line.strip()
        # Detect "Next Steps" or "下一步" sections
        if any(kw in stripped.lower() for kw in ["next step", "下一步", "next steps", "待辦", "todo"]):
            in_next_section = True
            continue
        if in_next_section:
            if stripped.startswith("- [") or stripped.startswith("* ["):
                todos.append(stripped)
            elif stripped.startswith("#"):
                break  # Next section header, stop

    return latest_date, todos


def prepare_context(root_path):
    root = Path(root_path).resolve()
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"📋 Preparing context for: {root}")

    context_file = root / "AGENT_CONTEXT.md"

    with safe_user_path(context_file).open("w", encoding="utf-8") as f:
        # Header
        f.write(f"# 專案上下文 (Agent Context)：{root.name}\n\n")
        f.write(f"> **最後更新時間**：{now}\n")
        f.write(f"> **自動生成**：由 `prepare_context.py` 產生，供 AI Agent 快速掌握專案全局\n\n")
        f.write("---\n\n")

        # Section 1: 專案目標
        f.write("## 🎯 1. 專案目標 (Project Goal)\n")
        readme_summary = extract_readme_summary(root)
        if readme_summary:
            f.write(f"* **核心目的**：{readme_summary}\n")
        else:
            f.write("* **核心目的**：_（請手動補充，或建立 README.md）_\n")
        readme = root / "README.md"
        if readme.exists():
            f.write(f"* _完整說明見 [README.md](README.md)_\n")
        f.write("\n")

        # Section 2: 技術棧與環境
        f.write("## 🛠️ 2. 技術棧與環境 (Tech Stack & Environment)\n")
        stack_info = extract_tech_stack(root)
        if stack_info:
            f.write("\n".join(stack_info))
            f.write("\n")
        else:
            f.write("* _（未偵測到 package.json / pyproject.toml / requirements.txt）_\n")

        # Also include raw config snippets for AI reference
        config_files = ["package.json", "pyproject.toml", "requirements.txt", ".env.example", "clasp.json"]
        has_config = False
        for cfg in config_files:
            cfg_path = root / cfg
            if cfg_path.exists():
                if not has_config:
                    f.write("\n### 原始設定檔\n")
                    has_config = True
                ext = cfg.split(".")[-1]
                lang_map = {"json": "json", "toml": "toml", "txt": "text", "example": "text"}
                lang = lang_map.get(ext, "text")
                content = cfg_path.read_text(encoding="utf-8", errors="ignore")
                # Truncate very long config files
                if len(content) > 3000:
                    content = content[:3000] + "\n... (truncated)"
                f.write(f"\n<details><summary>{cfg}</summary>\n\n```{lang}\n{content}\n```\n</details>\n")
        f.write("\n")

        # Section 3: 核心目錄結構
        f.write("## 📂 3. 核心目錄結構 (Core Structure)\n")
        f.write("_(💡 AI 讀取守則：請依據此結構尋找對應檔案，勿盲目猜測路徑)_\n")
        f.write("```text\n")
        f.write(f"{root.name}/\n")
        f.write("\n".join(get_tree(root)))
        f.write("\n```\n\n")

        # Section 4: 架構與設計約定
        f.write("## 🏛️ 4. 架構與設計約定 (Architecture & Conventions)\n")
        local_exp = root / ".auto-skill-local.md"
        if local_exp.exists():
            f.write("_(來自專案 L1 快取 `.auto-skill-local.md`)_\n\n")
            f.write(local_exp.read_text(encoding="utf-8", errors="ignore"))
            f.write("\n\n")
        else:
            f.write("* _（尚無 `.auto-skill-local.md`，專案踩坑經驗將在開發過程中自動累積）_\n\n")

        # Section 5: 目前進度與待辦
        f.write("## 🚦 5. 目前進度與待辦 (Current Status & TODO)\n")
        latest_date, todos = extract_latest_diary_todos(root)
        if todos:
            f.write(f"_(自動提取自最近日記 {latest_date})_\n\n")
            f.write("### 🚧 待辦事項\n")
            for todo in todos:
                f.write(f"{todo}\n")
            f.write("\n")
        else:
            f.write("* _（尚無日記記錄，或日記中無「下一步」區塊）_\n\n")

    print(f"✅ Created: {context_file}")


if __name__ == "__main__":
    target = safe_user_path(sys.argv[1]) if len(sys.argv) > 1 else "."
    prepare_context(target)
