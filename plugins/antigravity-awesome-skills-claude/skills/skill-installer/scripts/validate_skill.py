#!/usr/bin/env python3
"""
Skill Validator - Deep validation of a skill directory.

Performs 10 checks on a skill directory to ensure it's properly structured
and ready for installation.

Usage:
    python validate_skill.py "C:\\path\\to\\skill"
    python validate_skill.py "C:\\path\\to\\skill" --strict
    python validate_skill.py "C:\\path\\to\\skill" --registry "C:\\path\\to\\registry.json"
"""

import os
import sys
import json
import re
from pathlib import Path

# ── Constants ──────────────────────────────────────────────────────────────

FORBIDDEN_PATTERNS = [
    ".env",
    "credentials.json",
    "credentials.yaml",
    "credentials.yml",
    "*.key",
    "*.pem",
    "*.p12",
    "*.pfx",
    ".secrets",
    "secret.json",
    "token.json",
    ".aws/credentials",
]

MAX_SIZE_MB = 50
MIN_DESCRIPTION_LENGTH = 50

SKILLS_ROOT = Path(r"C:\Users\renat\skills")
REGISTRY_PATH = SKILLS_ROOT / "agent-orchestrator" / "data" / "registry.json"


def resolve_existing_dir(path) -> Path:
    """Resolve a user-provided directory and require it to exist."""
    resolved = Path(path).expanduser().resolve()
    if not resolved.is_dir():
        raise ValueError(f"Directory does not exist: {resolved}")
    return resolved


# ── YAML Frontmatter Parser ───────────────────────────────────────────────

def parse_yaml_frontmatter(path: Path) -> dict:
    """Extract YAML frontmatter from a SKILL.md file.

    Mirrors the parser from scan_registry.py for consistency.
    """
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
        # Fallback: manual parsing
        result = {}
        block = match.group(1)
        for key in ("name", "description", "version", "capabilities"):
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


# ── Validation Checks ─────────────────────────────────────────────────────

def check_skill_md_exists(skill_dir: Path) -> dict:
    """Check 1: SKILL.md exists."""
    skill_md = skill_dir / "SKILL.md"
    exists = skill_md.exists() and skill_md.is_file()
    return {
        "check": 1,
        "name": "SKILL.md exists",
        "status": "pass" if exists else "fail",
        "message": str(skill_md) if exists else f"SKILL.md not found in {skill_dir}",
    }


def check_frontmatter_parseable(skill_dir: Path) -> dict:
    """Check 2: YAML frontmatter is present and parseable."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return {
            "check": 2,
            "name": "Frontmatter parseable",
            "status": "fail",
            "message": "SKILL.md does not exist",
        }

    try:
        text = skill_md.read_text(encoding="utf-8")
    except Exception as e:
        return {
            "check": 2,
            "name": "Frontmatter parseable",
            "status": "fail",
            "message": f"Cannot read SKILL.md: {e}",
        }

    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {
            "check": 2,
            "name": "Frontmatter parseable",
            "status": "fail",
            "message": "No YAML frontmatter found (expected --- delimiters)",
        }

    meta = parse_yaml_frontmatter(skill_md)
    if not meta:
        return {
            "check": 2,
            "name": "Frontmatter parseable",
            "status": "fail",
            "message": "Frontmatter found but could not be parsed",
        }

    return {
        "check": 2,
        "name": "Frontmatter parseable",
        "status": "pass",
        "message": f"Parsed fields: {', '.join(meta.keys())}",
    }


def check_name_exists(meta: dict) -> dict:
    """Check 3: 'name' field exists and is non-empty."""
    name = meta.get("name", "")
    has_name = bool(name and str(name).strip())
    return {
        "check": 3,
        "name": "Field 'name' present",
        "status": "pass" if has_name else "fail",
        "message": f"name: {name}" if has_name else "Missing or empty 'name' field",
    }


def check_description_exists(meta: dict) -> dict:
    """Check 4: 'description' field exists and is non-empty."""
    desc = meta.get("description", "")
    has_desc = bool(desc and str(desc).strip())
    return {
        "check": 4,
        "name": "Field 'description' present",
        "status": "pass" if has_desc else "fail",
        "message": (
            f"description: {str(desc)[:80]}..."
            if has_desc
            else "Missing or empty 'description' field"
        ),
    }


def check_description_length(meta: dict) -> dict:
    """Check 5: Description has >= 50 characters (warning if shorter)."""
    desc = str(meta.get("description", ""))
    length = len(desc)
    ok = length >= MIN_DESCRIPTION_LENGTH
    return {
        "check": 5,
        "name": "Description length >= 50 chars",
        "status": "pass" if ok else "warn",
        "message": (
            f"Length: {length} chars"
            if ok
            else f"Description only {length} chars (recommend >= {MIN_DESCRIPTION_LENGTH})"
        ),
    }


def check_name_matches_dir(skill_dir: Path, meta: dict) -> dict:
    """Check 6: 'name' matches directory name (warning if mismatch)."""
    name = str(meta.get("name", "")).strip().lower()
    dir_name = skill_dir.name.lower()

    if not name:
        return {
            "check": 6,
            "name": "Name matches directory",
            "status": "warn",
            "message": "No name field to compare",
        }

    matches = name == dir_name
    return {
        "check": 6,
        "name": "Name matches directory",
        "status": "pass" if matches else "warn",
        "message": (
            f"'{name}' == '{dir_name}'"
            if matches
            else f"Name '{name}' differs from directory '{dir_name}'"
        ),
    }


def check_forbidden_files(skill_dir: Path) -> dict:
    """Check 7: No forbidden files (.env, credentials, keys, etc.)."""
    found_forbidden = []

    for root, _dirs, files in os.walk(skill_dir):
        for f in files:
            f_lower = f.lower()
            for pattern in FORBIDDEN_PATTERNS:
                if pattern.startswith("*."):
                    ext = pattern[1:]  # e.g., ".key"
                    if f_lower.endswith(ext):
                        found_forbidden.append(os.path.join(root, f))
                        break
                else:
                    if f_lower == pattern.lower():
                        found_forbidden.append(os.path.join(root, f))
                        break

    if found_forbidden:
        return {
            "check": 7,
            "name": "No forbidden files",
            "status": "fail",
            "message": f"Found {len(found_forbidden)} forbidden file(s): {', '.join(found_forbidden[:5])}",
        }

    return {
        "check": 7,
        "name": "No forbidden files",
        "status": "pass",
        "message": "No forbidden files detected",
    }


def check_total_size(skill_dir: Path) -> dict:
    """Check 8: Total size is reasonable (warn if > 50MB)."""
    total = 0
    for root, _dirs, files in os.walk(skill_dir):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass

    size_mb = total / (1024 * 1024)
    ok = size_mb <= MAX_SIZE_MB

    return {
        "check": 8,
        "name": f"Size <= {MAX_SIZE_MB}MB",
        "status": "pass" if ok else "warn",
        "message": f"Total: {size_mb:.1f} MB" + ("" if ok else f" (exceeds {MAX_SIZE_MB}MB)"),
    }


def check_scripts_requirements(skill_dir: Path) -> dict:
    """Check 9: If scripts/ exists, check for requirements.txt."""
    scripts_dir = skill_dir / "scripts"
    if not scripts_dir.exists():
        return {
            "check": 9,
            "name": "scripts/ has requirements.txt",
            "status": "skip",
            "message": "No scripts/ directory (check not applicable)",
        }

    has_reqs = (scripts_dir / "requirements.txt").exists()
    return {
        "check": 9,
        "name": "scripts/ has requirements.txt",
        "status": "pass" if has_reqs else "warn",
        "message": (
            "requirements.txt found"
            if has_reqs
            else "scripts/ exists but no requirements.txt"
        ),
    }


def check_duplicate_name(meta: dict, registry_path: Path) -> dict:
    """Check 10: Name not duplicated in existing registry."""
    name = str(meta.get("name", "")).strip().lower()
    if not name:
        return {
            "check": 10,
            "name": "No duplicate in registry",
            "status": "warn",
            "message": "No name to check",
        }

    if not registry_path.exists():
        return {
            "check": 10,
            "name": "No duplicate in registry",
            "status": "pass",
            "message": "No registry.json found (skip check)",
        }

    try:
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        existing_names = [
            s.get("name", "").lower() for s in registry.get("skills", [])
        ]
        if name in existing_names:
            return {
                "check": 10,
                "name": "No duplicate in registry",
                "status": "warn",
                "message": f"Skill '{name}' already exists in registry (use --force to overwrite)",
            }
    except Exception as e:
        return {
            "check": 10,
            "name": "No duplicate in registry",
            "status": "warn",
            "message": f"Could not read registry: {e}",
        }

    return {
        "check": 10,
        "name": "No duplicate in registry",
        "status": "pass",
        "message": f"Name '{name}' not found in registry",
    }


# ── Main Validation ───────────────────────────────────────────────────────

def validate(skill_dir: Path, strict: bool = False, registry_path: Path = None) -> dict:
    """Run all 10 validation checks on a skill directory.

    Returns:
        dict with keys: valid (bool), checks (list), warnings (list), errors (list)
    """
    if registry_path is None:
        registry_path = REGISTRY_PATH

    try:
        skill_dir = resolve_existing_dir(skill_dir)
    except ValueError as e:
        return {
            "valid": False,
            "skill_dir": str(Path(skill_dir).expanduser()),
            "checks": [],
            "warnings": [],
            "errors": [str(e)],
        }

    # Parse frontmatter once
    skill_md = skill_dir / "SKILL.md"
    meta = parse_yaml_frontmatter(skill_md) if skill_md.exists() else {}

    # Run all 10 checks
    checks = [
        check_skill_md_exists(skill_dir),           # 1
        check_frontmatter_parseable(skill_dir),      # 2
        check_name_exists(meta),                     # 3
        check_description_exists(meta),              # 4
        check_description_length(meta),              # 5
        check_name_matches_dir(skill_dir, meta),     # 6
        check_forbidden_files(skill_dir),            # 7
        check_total_size(skill_dir),                 # 8
        check_scripts_requirements(skill_dir),       # 9
        check_duplicate_name(meta, registry_path),   # 10
    ]

    errors = [c for c in checks if c["status"] == "fail"]
    warnings = [c for c in checks if c["status"] == "warn"]
    passed = [c for c in checks if c["status"] in ("pass", "skip")]

    # In strict mode, warnings are treated as errors
    if strict:
        errors.extend(warnings)
        warnings = []

    valid = len(errors) == 0

    return {
        "valid": valid,
        "skill_dir": str(skill_dir),
        "skill_name": meta.get("name", skill_dir.name),
        "total_checks": len(checks),
        "passed": len(passed),
        "warnings_count": len(warnings),
        "errors_count": len(errors),
        "checks": checks,
        "warnings": [f"Check {w['check']}: {w['message']}" for w in warnings],
        "errors": [f"Check {e['check']}: {e['message']}" for e in errors],
    }


# ── CLI Entry Point ───────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "valid": False,
            "error": "Usage: python validate_skill.py <skill-directory> [--strict] [--registry <path>]",
        }, indent=2))
        sys.exit(1)

    try:
        skill_dir = resolve_existing_dir(sys.argv[1])
    except ValueError as e:
        print(json.dumps({
            "valid": False,
            "error": str(e),
        }, indent=2))
        sys.exit(1)
    strict = "--strict" in sys.argv
    registry_path = None

    if "--registry" in sys.argv:
        idx = sys.argv.index("--registry")
        if idx + 1 < len(sys.argv):
            registry_path = Path(sys.argv[idx + 1]).expanduser().resolve()

    result = validate(skill_dir, strict=strict, registry_path=registry_path)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
