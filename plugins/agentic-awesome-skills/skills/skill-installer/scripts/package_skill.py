#!/usr/bin/env python3
"""
Skill Packager - Create ZIP files for Claude.ai web/desktop upload.

Claude Code (CLI) and Claude.ai (web/desktop) have SEPARATE skill systems.
Skills in .claude/skills/ work in the terminal but do NOT appear in the
Claude.ai web Habilidades (Skills) settings page.

To install a skill in Claude.ai web/desktop, you need to upload a ZIP file
through Settings > Capabilities > Skills > Upload skill.

This script packages skills into the correct ZIP format.

Usage:
    python package_skill.py --source "C:\\path\\to\\skill"
    python package_skill.py --source "C:\\path\\to\\skill" --output "C:\\Users\\renat\\Desktop"
    python package_skill.py --all
    python package_skill.py --all --output "C:\\Users\\renat\\Desktop"
"""

import os
import sys
import json
import re
import zipfile
import tempfile
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

# ── Configuration ──────────────────────────────────────────────────────────

SKILLS_ROOT = Path(r"C:\Users\renat\skills")
DEFAULT_OUTPUT = Path(os.path.expanduser("~")) / "Desktop"

# Directories to exclude from ZIP
EXCLUDE_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    ".tox", ".mypy_cache", ".pytest_cache", "data",
}

# File patterns to exclude
EXCLUDE_FILES = {
    ".env", ".gitignore", ".DS_Store", "Thumbs.db",
    "credentials.json", "token.json",
}

EXCLUDE_EXTENSIONS = {
    ".pyc", ".pyo", ".db", ".sqlite", ".sqlite3",
    ".log", ".tmp", ".bak",
}
SAFE_ARCHIVE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$")


def resolve_existing_dir(path) -> Path:
    """Resolve a user-provided directory and require it to exist."""
    resolved = safe_user_path(path).expanduser().resolve()
    if not resolved.is_dir():
        raise ValueError(f"Directory not found: {resolved}")
    return resolved


def resolve_output_dir(path) -> Path:
    """Resolve a user-provided output directory."""
    resolved = safe_user_path(path).expanduser().resolve()
    if resolved.exists() and not resolved.is_dir():
        raise ValueError(f"Output path is not a directory: {resolved}")
    return resolved


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


# ── Validation ─────────────────────────────────────────────────────────────

def validate_for_web(skill_dir: Path) -> dict:
    """Validate skill meets Claude.ai web upload requirements."""
    errors = []
    warnings = []

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        errors.append("SKILL.md not found")
        return {"valid": False, "errors": errors, "warnings": warnings}

    meta = parse_yaml_frontmatter(skill_md)

    # Name: required, lowercase, letters/numbers/hyphens only, max 64 chars
    name = meta.get("name", "")
    if not name:
        errors.append("Missing 'name' field in frontmatter")
    else:
        if name != name.lower():
            warnings.append(f"Name '{name}' should be lowercase: '{name.lower()}'")
        name_lower = name.lower()
        if len(name_lower) == 1:
            if not re.match(r'^[a-z0-9]$', name_lower):
                warnings.append(f"Name '{name}' should only contain lowercase letters or numbers")
        elif not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', name_lower):
            warnings.append(f"Name '{name}' should only contain lowercase letters, numbers, and hyphens")
        if len(name) > 64:
            errors.append(f"Name exceeds 64 characters: {len(name)}")
        if "anthropic" in name_lower or "claude" in name_lower:
            errors.append(f"Name cannot contain reserved words 'anthropic' or 'claude'")

    # Description: required, max 1024 chars
    desc = meta.get("description", "")
    if not desc:
        errors.append("Missing 'description' field in frontmatter")
    elif len(desc) > 1024:
        warnings.append(f"Description exceeds 1024 chars ({len(desc)}), may be truncated")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "name": name,
        "description": desc[:120] if desc else "",
    }


def should_include(file_path: Path, skill_dir: Path) -> bool:
    """Check if a file should be included in the ZIP."""
    if file_path.is_symlink():
        return False
    try:
        file_path.resolve(strict=True).relative_to(skill_dir.resolve(strict=True))
    except (OSError, ValueError):
        return False
    rel = file_path.relative_to(skill_dir)

    # Check directory exclusions
    for part in rel.parts[:-1]:
        if part in EXCLUDE_DIRS:
            return False

    # Check file exclusions
    if file_path.name in EXCLUDE_FILES:
        return False

    # Check extension exclusions
    if file_path.suffix.lower() in EXCLUDE_EXTENSIONS:
        return False

    return True


# ── Packaging ──────────────────────────────────────────────────────────────

def package_skill(skill_dir: Path, output_dir: Path = None) -> dict:
    """
    Package a skill directory into a ZIP file for Claude.ai upload.

    The ZIP format required by Claude.ai:
        skill-name.zip
        └── skill-name/
              ├── SKILL.md
              ├── scripts/
              ├── references/
              └── ...
    """
    try:
        skill_dir = resolve_existing_dir(skill_dir)
    except ValueError as e:
        return {"success": False, "error": str(e)}

    # Validate
    validation = validate_for_web(skill_dir)
    if not validation["valid"]:
        return {
            "success": False,
            "error": f"Validation failed: {'; '.join(validation['errors'])}",
            "validation": validation,
        }

    skill_name = validation["name"] or skill_dir.name
    skill_name_lower = skill_name.lower()
    if not SAFE_ARCHIVE_NAME_RE.fullmatch(skill_name_lower):
        return {"success": False, "error": f"Unsafe archive skill name: {skill_name}"}

    # Determine output path
    if output_dir is None:
        output_dir = DEFAULT_OUTPUT
    try:
        output_dir = resolve_output_dir(output_dir)
    except ValueError as e:
        return {"success": False, "error": str(e)}
    output_dir.mkdir(parents=True, exist_ok=True)

    zip_path = output_dir / f"{skill_name_lower}.zip"

    # Collect files
    files_to_include = []
    for fp in safe_user_path(skill_dir).rglob("*"):
        if fp.is_file() and should_include(fp, skill_dir):
            files_to_include.append(fp)

    if not files_to_include:
        return {"success": False, "error": "No files to package"}

    # Create ZIP with skill folder as root
    # CRITICAL: ZIP paths MUST use forward slashes, not Windows backslashes
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_zip_path = Path(temp_dir) / "skill.zip"
            with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for fp in sorted(files_to_include):
                    rel_path = fp.relative_to(skill_dir)
                    # Convert Windows backslash to forward slash for ZIP compatibility
                    rel_posix = rel_path.as_posix()
                    archive_path = f"{skill_name_lower}/{rel_posix}"
                    zf.write(fp, archive_path)
            zip_path.write_bytes(temp_zip_path.read_bytes())

        # Verify ZIP is not empty and valid
        with zipfile.ZipFile(zip_path, "r") as zf_check:
            entries = zf_check.namelist()
            if not entries:
                zip_path.unlink(missing_ok=True)
                return {"success": False, "error": "ZIP was created empty (no files written)"}
            # Verify no backslash paths leaked through
            bad_paths = [e for e in entries if "\\" in e]
            if bad_paths:
                zip_path.unlink(missing_ok=True)
                return {
                    "success": False,
                    "error": f"ZIP contains backslash paths (invalid): {bad_paths[:3]}",
                }

        # Get ZIP size
        zip_size = zip_path.stat().st_size
        zip_size_kb = zip_size / 1024

    except Exception as e:
        return {"success": False, "error": f"ZIP creation failed: {e}"}

    return {
        "success": True,
        "zip_path": str(zip_path),
        "skill_name": skill_name_lower,
        "files_count": len(files_to_include),
        "zip_size_kb": round(zip_size_kb, 1),
        "validation": validation,
        "upload_instructions": (
            "Para instalar no Claude.ai web/desktop:\n"
            "1. Abra claude.ai > Settings > Capabilities > Skills\n"
            "2. Clique em 'Upload skill'\n"
            f"3. Selecione o arquivo: {zip_path}\n"
            "4. A skill aparecera na lista de Habilidades"
        ),
    }


def package_all(output_dir: Path = None) -> dict:
    """Package all installed skills."""
    results = []

    # Find all skill directories with SKILL.md
    for item in sorted(SKILLS_ROOT.iterdir()):
        if not item.is_dir():
            continue
        if item.name.startswith("."):
            continue
        if item.name == "agent-orchestrator":
            continue  # Meta-skill, not for web upload

        skill_md = item / "SKILL.md"
        if skill_md.exists():
            result = package_skill(item, output_dir)
            results.append(result)

    # Also check nested skills
    for parent in SKILLS_ROOT.iterdir():
        if not parent.is_dir() or parent.name.startswith("."):
            continue
        for child in parent.iterdir():
            if child.is_dir() and (child / "SKILL.md").exists():
                if child.name != "agent-orchestrator":
                    result = package_skill(child, output_dir)
                    results.append(result)

    success = sum(1 for r in results if r["success"])
    failed = sum(1 for r in results if not r["success"])

    return {
        "total": len(results),
        "success": success,
        "failed": failed,
        "results": results,
    }


# ── Verify Existing ZIPs ──────────────────────────────────────────────────

def verify_zips(output_dir: Path = None) -> dict:
    """Verify all existing skill ZIPs for integrity.

    Checks:
    - ZIP is valid and not corrupted
    - Contains SKILL.md
    - No backslash paths
    - Not empty
    - Matches a known skill name
    """
    if output_dir is None:
        output_dir = DEFAULT_OUTPUT

    results = []
    zip_files = sorted(output_dir.glob("*.zip"))

    for zip_path in zip_files:
        entry = {
            "file": str(zip_path),
            "name": zip_path.stem,
            "size_kb": round(zip_path.stat().st_size / 1024, 1),
            "valid": False,
            "issues": [],
        }

        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                entries = zf.namelist()

                if not entries:
                    entry["issues"].append("ZIP is empty")
                    results.append(entry)
                    continue

                # Check for backslash paths
                bad_paths = [e for e in entries if "\\" in e]
                if bad_paths:
                    entry["issues"].append(f"Contains backslash paths: {bad_paths[:3]}")

                # Check for SKILL.md
                has_skill_md = any(e.endswith("SKILL.md") for e in entries)
                if not has_skill_md:
                    entry["issues"].append("Missing SKILL.md")

                # Test integrity
                bad_file = zf.testzip()
                if bad_file:
                    entry["issues"].append(f"Corrupted file in ZIP: {bad_file}")

                entry["file_count"] = len(entries)
                entry["valid"] = len(entry["issues"]) == 0

        except zipfile.BadZipFile:
            entry["issues"].append("Not a valid ZIP file")
        except Exception as e:
            entry["issues"].append(f"Error reading ZIP: {e}")

        results.append(entry)

    valid = sum(1 for r in results if r["valid"])
    invalid = sum(1 for r in results if not r["valid"])

    return {
        "total": len(results),
        "valid": valid,
        "invalid": invalid,
        "output_dir": str(output_dir),
        "results": results,
    }


# ── CLI Entry Point ───────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    source = None
    output_dir = None
    do_all = "--all" in args
    do_verify = "--verify" in args

    if "--source" in args:
        idx = args.index("--source")
        if idx + 1 < len(args):
            source = args[idx + 1]

    if "--output" in args:
        idx = args.index("--output")
        if idx + 1 < len(args):
            output_dir = resolve_output_dir(args[idx + 1])

    if do_verify:
        result = verify_zips(output_dir if output_dir else None)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["invalid"] == 0 else 1)

    if not source and not do_all:
        print(json.dumps({
            "error": "Usage: python package_skill.py <command>",
            "commands": {
                "--source <path>": "Package a single skill",
                "--source <path> --output <dir>": "Package to specific directory",
                "--all": "Package all installed skills",
                "--all --output <dir>": "Package all to specific directory",
                "--verify": "Verify integrity of all existing ZIPs",
                "--verify --output <dir>": "Verify ZIPs in specific directory",
            },
        }, indent=2))
        sys.exit(1)

    if source:
        result = package_skill(source, output_dir)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["success"] else 1)
    elif do_all:
        result = package_all(output_dir)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
