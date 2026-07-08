#!/usr/bin/env python3
"""
Skill Detector - Find uninstalled skills in common locations.

Scans known directories where skills might have been created
(skill-creator workspaces, Desktop, Downloads, temp dirs) and
identifies candidates that are not yet installed in the ecosystem.

Usage:
    python detect_skills.py                          # Scan default locations
    python detect_skills.py --path "C:\\some\\dir"   # Scan specific path
    python detect_skills.py --all                    # Scan all known locations
"""

from __future__ import annotations

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────────────

SKILLS_ROOT = Path(r"C:\Users\renat\skills")
USER_HOME = Path(os.path.expanduser("~"))
TEMP_DIR = Path(os.environ.get("TEMP", os.environ.get("TMP", str(USER_HOME / "AppData" / "Local" / "Temp"))))

# Where we consider skills "installed"
INSTALLED_LOCATIONS = [
    SKILLS_ROOT,
    SKILLS_ROOT / ".claude" / "skills",
]

# Default locations to scan for uninstalled skills
DEFAULT_SCAN_LOCATIONS = [
    USER_HOME / "Desktop",
    USER_HOME / "Downloads",
    USER_HOME / "Documents",
    TEMP_DIR,
]

# Additional locations for --all mode
EXTENDED_SCAN_LOCATIONS = [
    USER_HOME,
    USER_HOME / "Projects",
    USER_HOME / "dev",
    USER_HOME / "repos",
    USER_HOME / "workspace",
    USER_HOME / "code",
    Path(r"C:\temp"),
    Path(r"C:\projects"),
]

MAX_SCAN_DEPTH = 5
WORKSPACE_PATTERN = re.compile(r".*-workspace[/\\]v\d+[/\\]skill$", re.IGNORECASE)


# ── YAML Frontmatter Parser ───────────────────────────────────────────────

def parse_yaml_frontmatter(path: Path) -> dict:
    """Extract YAML frontmatter from a SKILL.md file."""
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return {}

    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}

    try:
        import yaml
        return yaml.safe_load(match.group(1)) or {}
    except Exception:
        result = {}
        block = match.group(1)
        for key in ("name", "description", "version"):
            m = re.search(rf'^{key}:\s*["\']?(.+?)["\']?\s*$', block, re.MULTILINE)
            if m:
                result[key] = m.group(1).strip()
            else:
                m2 = re.search(
                    rf'^{key}:\s*>-?\s*\n((?:\s+.+\n?)+)', block, re.MULTILINE
                )
                if m2:
                    lines = m2.group(1).strip().split("\n")
                    result[key] = " ".join(line.strip() for line in lines)
        return result


# ── Core Functions ─────────────────────────────────────────────────────────

def get_installed_skill_names() -> set:
    """Get set of skill names already installed in the ecosystem."""
    names = set()

    for base in INSTALLED_LOCATIONS:
        if not base.exists():
            continue
        for root, dirs, files in os.walk(base):
            depth = len(Path(root).relative_to(base).parts)
            if depth > 3:
                dirs.clear()
                continue

            # Skip certain directories
            skip = {"agent-orchestrator", "skill-installer", ".git", "__pycache__", "node_modules"}
            if any(part in skip for part in Path(root).parts):
                continue

            if "SKILL.md" in files:
                skill_md = Path(root) / "SKILL.md"
                meta = parse_yaml_frontmatter(skill_md)
                name = meta.get("name", Path(root).name)
                names.add(name.lower())

    return names


def find_skill_candidates(scan_locations: list[Path]) -> list[dict]:
    """Find SKILL.md files in given locations."""
    candidates = []
    seen_paths = set()
    installed_names = get_installed_skill_names()

    for base in scan_locations:
        if not base.exists():
            continue

        # Skip the skills root itself (those are already installed)
        try:
            base.resolve().relative_to(SKILLS_ROOT.resolve())
            continue
        except ValueError:
            pass

        for root, dirs, files in os.walk(base):
            root_path = Path(root)
            depth = len(root_path.relative_to(base).parts)

            if depth > MAX_SCAN_DEPTH:
                dirs.clear()
                continue

            # Skip heavy directories
            skip_dirs = {".git", "__pycache__", "node_modules", ".venv", "venv", ".tox"}
            dirs[:] = [d for d in dirs if d not in skip_dirs]

            if "SKILL.md" in files:
                skill_md = root_path / "SKILL.md"
                resolved = skill_md.resolve()

                # Skip if already seen
                if str(resolved) in seen_paths:
                    continue
                seen_paths.add(str(resolved))

                # Skip if inside SKILLS_ROOT
                try:
                    resolved.relative_to(SKILLS_ROOT.resolve())
                    continue
                except ValueError:
                    pass

                # Parse metadata
                meta = parse_yaml_frontmatter(skill_md)
                name = meta.get("name", root_path.name)
                description = meta.get("description", "")
                has_valid = bool(name and description)

                # Check if already installed
                already_installed = name.lower() in installed_names

                # Detect if in a workspace
                is_workspace = bool(WORKSPACE_PATTERN.match(str(root_path)))

                desc_str = str(description)

                # Get modification timestamp and size
                try:
                    mtime = skill_md.stat().st_mtime
                    mtime_str = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M")
                except Exception:
                    mtime = 0.0
                    mtime_str = "unknown"

                # Calculate directory size
                total_size = 0
                file_count = 0
                for r2, _, f2 in os.walk(root_path):
                    for ff in f2:
                        try:
                            total_size += os.path.getsize(os.path.join(r2, ff))
                            file_count += 1
                        except OSError:
                            pass
                size_kb = round(total_size / 1024, 1)

                candidates.append({
                    "name": name,
                    "source_path": str(root_path),
                    "skill_md_path": str(skill_md),
                    "already_installed": already_installed,
                    "valid_frontmatter": has_valid,
                    "description": desc_str[:120] + ("..." if len(desc_str) > 120 else ""),
                    "version": meta.get("version", ""),
                    "is_workspace": is_workspace,
                    "location_type": _classify_location(root_path),
                    "last_modified": mtime_str,
                    "last_modified_ts": mtime,
                    "size_kb": size_kb,
                    "file_count": file_count,
                })

    return candidates


def _classify_location(path: Path) -> str:
    """Classify where the skill was found."""
    path_str = str(path).lower()

    if "desktop" in path_str:
        return "desktop"
    if "download" in path_str:
        return "downloads"
    if "document" in path_str:
        return "documents"
    if "temp" in path_str or "tmp" in path_str:
        return "temp"
    if "workspace" in path_str:
        return "workspace"
    return "other"


# ── Main Logic ─────────────────────────────────────────────────────────────

def detect(paths: list[Path] = None, scan_all: bool = False) -> dict:
    """
    Detect uninstalled skills.

    Args:
        paths: Specific paths to scan. If None, uses defaults.
        scan_all: If True, scan extended locations too.

    Returns:
        dict with candidates list and summary.
    """
    scan_locations = []

    if paths:
        scan_locations.extend(paths)
    else:
        scan_locations.extend(DEFAULT_SCAN_LOCATIONS)

    if scan_all:
        scan_locations.extend(EXTENDED_SCAN_LOCATIONS)

    # Deduplicate
    seen = set()
    unique_locations = []
    for loc in scan_locations:
        resolved = str(loc.resolve())
        if resolved not in seen:
            seen.add(resolved)
            unique_locations.append(loc)

    candidates = find_skill_candidates(unique_locations)

    # Sort: uninstalled first, then by most recently modified
    candidates.sort(key=lambda c: (
        c["already_installed"],
        -c.get("last_modified_ts", 0),
        c["name"].lower(),
    ))

    not_installed = [c for c in candidates if not c["already_installed"]]
    already = [c for c in candidates if c["already_installed"]]

    return {
        "total_found": len(candidates),
        "not_installed": len(not_installed),
        "already_installed": len(already),
        "scanned_locations": [str(p) for p in unique_locations if p.exists()],
        "candidates": candidates,
    }


# ── CLI Entry Point ───────────────────────────────────────────────────────

def main():
    paths = []
    scan_all = "--all" in sys.argv

    if "--path" in sys.argv:
        idx = sys.argv.index("--path")
        if idx + 1 < len(sys.argv):
            p = Path(sys.argv[idx + 1]).resolve()
            if p.exists():
                paths.append(p)
            else:
                print(json.dumps({
                    "error": f"Path does not exist: {p}",
                    "total_found": 0,
                    "candidates": [],
                }, indent=2))
                sys.exit(1)

    result = detect(paths=paths if paths else None, scan_all=scan_all)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Exit with 0 if candidates found, 1 if none
    sys.exit(0 if result["total_found"] > 0 else 1)


if __name__ == "__main__":
    main()
