#!/usr/bin/env python3
"""
Skill Installer v3.0 - Enterprise-grade installer with 11-step redundant workflow.

Detects, validates, copies, registers, and verifies skills in the ecosystem
with maximum redundancy, safety, auto-repair, rollback, and rich diagnostics.

Usage:
    python install_skill.py --source "C:\\path\\to\\skill"
    python install_skill.py --source "C:\\path" --name "my-skill"
    python install_skill.py --source "C:\\path" --force
    python install_skill.py --source "C:\\path" --dry-run
    python install_skill.py --detect
    python install_skill.py --detect --auto
    python install_skill.py --uninstall "skill-name"
    python install_skill.py --health
    python install_skill.py --health --repair
    python install_skill.py --rollback "skill-name"
    python install_skill.py --reinstall-all
    python install_skill.py --status
    python install_skill.py --log [N]
"""

from __future__ import annotations

import os
import sys
import json
import shutil
import hashlib
import subprocess
import re
from pathlib import Path
from datetime import datetime


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


def copy_tree_contents(source_dir: Path, target_dir: Path, *, ignore=None) -> None:
    ignored_by_dir = {}
    if ignore is not None:
        for current_dir in [source_dir, *[p for p in source_dir.rglob("*") if p.is_dir()]]:
            ignored_by_dir[current_dir] = set(ignore(str(current_dir), [p.name for p in current_dir.iterdir()]))

    target_dir.mkdir(parents=True, exist_ok=True)
    for source_path in source_dir.rglob("*"):
        ignored_names = ignored_by_dir.get(source_path.parent, set())
        if source_path.name in ignored_names:
            continue
        relative_path = source_path.relative_to(source_dir)
        target_path = target_dir / relative_path
        if source_path.is_dir():
            target_path.mkdir(parents=True, exist_ok=True)
        elif source_path.is_file():
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(source_path.read_bytes())

# Add scripts directory to path for imports
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

from validate_skill import validate, parse_yaml_frontmatter
from detect_skills import detect

# ── Configuration ──────────────────────────────────────────────────────────

SKILLS_ROOT = Path(r"C:\Users\renat\skills")
CLAUDE_SKILLS = SKILLS_ROOT / ".claude" / "skills"
INSTALLER_DIR = SKILLS_ROOT / "skill-installer"
DATA_DIR = INSTALLER_DIR / "data"
BACKUPS_DIR = DATA_DIR / "backups"
STAGING_DIR = DATA_DIR / "staging"
LOG_PATH = DATA_DIR / "install_log.json"
SCAN_SCRIPT = SKILLS_ROOT / "agent-orchestrator" / "scripts" / "scan_registry.py"
REGISTRY_PATH = SKILLS_ROOT / "agent-orchestrator" / "data" / "registry.json"

MAX_BACKUPS_PER_SKILL = 5
MAX_LOG_ENTRIES = 500  # Log rotation threshold
VERSION = "3.0.0"


# ── Console Colors ─────────────────────────────────────────────────────────

class _C:
    """ANSI color codes for terminal output. Degrades gracefully on Windows."""
    _enabled = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    # Check if stdout can handle UTF-8 symbols
    _utf8 = False
    try:
        _utf8 = sys.stdout.encoding and sys.stdout.encoding.lower().replace("-", "") in ("utf8", "utf16")
    except Exception:
        pass

    @staticmethod
    def _wrap(code: str, text: str) -> str:
        if _C._enabled:
            return f"\033[{code}m{text}\033[0m"
        return text

    @staticmethod
    def green(t: str) -> str: return _C._wrap("32", t)
    @staticmethod
    def red(t: str) -> str: return _C._wrap("31", t)
    @staticmethod
    def yellow(t: str) -> str: return _C._wrap("33", t)
    @staticmethod
    def cyan(t: str) -> str: return _C._wrap("36", t)
    @staticmethod
    def bold(t: str) -> str: return _C._wrap("1", t)
    @staticmethod
    def dim(t: str) -> str: return _C._wrap("2", t)

    # ASCII-safe symbols for Windows cp1252 compatibility
    OK = "[OK]"
    FAIL = "[FAIL]"
    WARN = "[WARN]"


def _step(n: int, total: int, msg: str):
    """Print a step progress indicator."""
    print(f"  {_C.cyan(f'[{n}/{total}]')} {msg}")


def _ok(msg: str):
    print(f"  {_C.green(_C.OK)} {msg}")


def _warn(msg: str):
    print(f"  {_C.yellow(_C.WARN)} {msg}")


def _fail(msg: str):
    print(f"  {_C.red(_C.FAIL)} {msg}")


# ── Utility Functions ──────────────────────────────────────────────────────

def sanitize_name(name: str) -> str:
    """Sanitize skill name: lowercase, hyphens, no spaces."""
    name = name.strip().lower()
    name = name.replace(" ", "-")
    name = name.replace("_", "-")
    # Remove any chars that aren't alphanumeric or hyphens
    name = "".join(c for c in name if c.isalnum() or c == "-")
    # Remove leading/trailing hyphens and collapse multiples
    while "--" in name:
        name = name.replace("--", "-")
    return name.strip("-")


def safe_child_path(root: Path, *parts: str) -> Path:
    """Resolve a child path and ensure it remains under root."""
    root = root.resolve()
    child = root.joinpath(*parts).resolve()
    try:
        child.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"Path escapes {root}: {child}") from exc
    return child


def safe_skill_path(root: Path, skill_name: str) -> Path:
    """Build a path from a sanitized skill name under a trusted root."""
    clean_name = sanitize_name(skill_name)
    if not clean_name:
        raise ValueError("Invalid empty skill name")
    return safe_child_path(root, clean_name)


def resolve_skill_source(source: str) -> Path:
    """Resolve and validate a local skill source directory."""
    source_path = safe_user_path(source).expanduser().resolve()
    if not source_path.is_dir():
        raise ValueError(f"Source does not exist or is not a directory: {source_path}")
    if not (source_path / "SKILL.md").is_file():
        raise ValueError(f"No SKILL.md found in {source_path}")
    return source_path


def md5_dir(path: Path, exclude_dirs: set = None) -> str:
    """Compute combined SHA-256 hash of all files in a directory.

    Excludes backup/staging dirs and normalizes paths to forward slashes
    for cross-platform consistency.
    """
    if exclude_dirs is None:
        exclude_dirs = {"backups", "staging", ".git", "__pycache__", "node_modules", ".venv"}

    root_path = safe_user_path(path).resolve(strict=True)
    if not root_path.is_dir():
        raise ValueError(f"Hash target must be a directory: {root_path}")

    h = hashlib.sha256()
    for root, dirs, files in os.walk(root_path, followlinks=False):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in sorted(files):
            fp = safe_user_path(root) / f
            try:
                resolved_fp = fp.resolve(strict=True)
                resolved_fp.relative_to(root_path)
                # Normalize to forward slashes for consistent hashing
                rel = resolved_fp.relative_to(root_path).as_posix()
                h.update(rel.encode("utf-8"))
                with resolved_fp.open("rb") as fh:
                    for chunk in iter(lambda: fh.read(8192), b""):
                        h.update(chunk)
            except Exception:
                pass
    return h.hexdigest()


def parse_version(ver: str) -> tuple:
    """Parse a semver string into a comparable tuple.

    Examples: '1.0.0' -> (1,0,0), '2.1' -> (2,1,0), '' -> (0,0,0)
    """
    if not ver:
        return (0, 0, 0)
    parts = re.findall(r'\d+', str(ver))
    while len(parts) < 3:
        parts.append("0")
    try:
        return tuple(int(p) for p in parts[:3])
    except (ValueError, TypeError):
        return (0, 0, 0)


def compare_versions(installed: str, source: str) -> str:
    """Compare two version strings.

    Returns: 'same', 'upgrade', 'downgrade', or 'unknown'.
    """
    inst = parse_version(installed)
    src = parse_version(source)

    if inst == (0, 0, 0) or src == (0, 0, 0):
        return "unknown"
    if inst == src:
        return "same"
    if src > inst:
        return "upgrade"
    return "downgrade"


def load_log() -> list:
    """Load install log."""
    if LOG_PATH.exists():
        try:
            data = json.loads(LOG_PATH.read_text(encoding="utf-8"))
            return data.get("operations", [])
        except Exception:
            pass
    return []


def save_log(operations: list):
    """Save install log with rotation (keeps last MAX_LOG_ENTRIES)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Rotate: keep only the last N entries
    if len(operations) > MAX_LOG_ENTRIES:
        operations = operations[-MAX_LOG_ENTRIES:]
    data = {
        "version": VERSION,
        "operations": operations,
        "total_operations": len(operations),
        "last_updated": datetime.now().isoformat(),
    }
    LOG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def append_log(entry: dict):
    """Append entry to install log."""
    ops = load_log()
    ops.append(entry)
    save_log(ops)


def cleanup_old_backups(skill_name: str):
    """Keep only the last N backups for a skill."""
    if not BACKUPS_DIR.exists():
        return

    prefix = f"{skill_name}_"
    backups = sorted(
        [d for d in BACKUPS_DIR.iterdir() if d.is_dir() and d.name.startswith(prefix)],
        key=lambda d: d.stat().st_mtime,
    )

    while len(backups) > MAX_BACKUPS_PER_SKILL:
        old = backups.pop(0)
        try:
            shutil.rmtree(old)
        except Exception:
            pass


def get_all_skill_dirs() -> list:
    """Get all skill directories in the ecosystem (top-level + nested)."""
    dirs = []
    for item in sorted(SKILLS_ROOT.iterdir()):
        if not item.is_dir() or item.name.startswith("."):
            continue
        if item.name == "agent-orchestrator":
            continue
        skill_md = item / "SKILL.md"
        if skill_md.exists():
            dirs.append(item)
        # Check nested (e.g., juntas-comerciais/junta-leiloeiros)
        for child in item.iterdir():
            if child.is_dir() and (child / "SKILL.md").exists():
                if child not in dirs:
                    dirs.append(child)
    return dirs


# ── Installation Steps ─────────────────────────────────────────────────────

def step1_resolve_source(source: str = None, do_detect: bool = False, auto: bool = False) -> dict:
    """STEP 1: Resolve source directory."""
    if source:
        try:
            source_path = resolve_skill_source(source)
        except ValueError as e:
            return {"success": False, "error": str(e)}
        return {"success": True, "sources": [str(source_path)]}

    if do_detect:
        result = detect()
        candidates = [c for c in result["candidates"] if not c["already_installed"]]

        if not candidates:
            return {
                "success": False,
                "error": "No uninstalled skills detected",
                "scanned_locations": result.get("scanned_locations", []),
            }

        if auto:
            return {
                "success": True,
                "sources": [c["source_path"] for c in candidates],
                "candidates": candidates,
            }

        # Return candidates for user to choose
        return {
            "success": True,
            "sources": [c["source_path"] for c in candidates],
            "candidates": candidates,
            "interactive": True,
        }

    return {"success": False, "error": "No --source or --detect provided"}


def step2_validate(source_path: Path) -> dict:
    """STEP 2: Validate the skill."""
    result = validate(source_path)
    return result


def step3_determine_name(source_path: Path, name_override: str = None) -> str:
    """STEP 3: Determine skill name."""
    if name_override:
        return sanitize_name(name_override)

    meta = parse_yaml_frontmatter(source_path / "SKILL.md")
    name = meta.get("name", source_path.name)
    return sanitize_name(name)


def step4_check_conflicts(skill_name: str) -> dict:
    """STEP 4: Check for existing skill with same name."""
    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    claude_dest = safe_skill_path(CLAUDE_SKILLS, skill_name)

    conflicts = []
    if dest.exists():
        conflicts.append(str(dest))
    if claude_dest.exists():
        conflicts.append(str(claude_dest))

    return {
        "has_conflicts": len(conflicts) > 0,
        "conflicts": conflicts,
        "destination": str(dest),
        "claude_destination": str(claude_dest),
    }


def _backup_ignore(directory, contents):
    """Ignore function for shutil.copytree to skip backup/staging dirs."""
    ignored = set()
    dir_path = safe_user_path(directory)
    for item in contents:
        item_path = dir_path / item
        if item_path.is_symlink():
            ignored.add(item)
        # Skip backup and staging directories to prevent recursion
        if item in ("backups", "staging") and dir_path.name == "data":
            ignored.add(item)
        # Skip .git and __pycache__
        if item in (".git", "__pycache__", "node_modules", ".venv"):
            ignored.add(item)
    return ignored


def step5_backup(skill_name: str) -> dict:
    """STEP 5: Backup existing skill before overwrite."""
    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{skill_name}_{timestamp}"
    backup_path = safe_child_path(BACKUPS_DIR, backup_name)

    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

    backed_up = []

    if dest.exists():
        try:
            shutil.copytree(dest, backup_path, ignore=_backup_ignore, dirs_exist_ok=True)
            backed_up.append(str(dest))
        except Exception as e:
            return {"success": False, "error": f"Backup failed for {dest}: {e}"}

    claude_dest = safe_skill_path(CLAUDE_SKILLS, skill_name)
    if claude_dest.exists():
        claude_backup = backup_path / ".claude-registration"
        claude_backup.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copytree(claude_dest, claude_backup / skill_name, dirs_exist_ok=True)
            backed_up.append(str(claude_dest))
        except Exception as e:
            return {"success": False, "error": f"Backup failed for {claude_dest}: {e}"}

    # Cleanup old backups
    cleanup_old_backups(skill_name)

    return {
        "success": True,
        "backup_path": str(backup_path),
        "backed_up": backed_up,
    }


def step6_copy_to_skills_root(source_path: Path, skill_name: str) -> dict:
    """STEP 6: Copy to skills root via staging area."""
    source_path = resolve_skill_source(str(source_path))
    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    staging = safe_skill_path(STAGING_DIR, skill_name)

    STAGING_DIR.mkdir(parents=True, exist_ok=True)

    # Clean staging
    if staging.exists():
        shutil.rmtree(staging)

    # Copy to staging first (skip backups/staging to prevent recursion)
    try:
        copy_tree_contents(source_path, staging, ignore=_backup_ignore)
    except Exception as e:
        return {"success": False, "error": f"Copy to staging failed: {e}"}

    # Validate staging copy
    staging_skill_md = staging / "SKILL.md"
    if not staging_skill_md.exists():
        shutil.rmtree(staging, ignore_errors=True)
        return {"success": False, "error": "SKILL.md missing after copy to staging"}

    # Verify hash matches
    source_hash = md5_dir(source_path)
    staging_hash = md5_dir(staging)
    if source_hash != staging_hash:
        shutil.rmtree(staging, ignore_errors=True)
        return {
            "success": False,
            "error": f"Hash mismatch: source={source_hash} staging={staging_hash}",
        }

    # Remove existing destination if exists
    if dest.exists():
        try:
            shutil.rmtree(dest)
        except Exception as e:
            shutil.rmtree(staging, ignore_errors=True)
            return {"success": False, "error": f"Cannot remove existing destination: {e}"}

    # Move staging to final destination
    try:
        shutil.move(str(staging), str(dest))
    except Exception as e:
        # Try copy + delete as fallback (cross-device moves)
        try:
            copy_tree_contents(staging, dest)
            shutil.rmtree(staging, ignore_errors=True)
        except Exception as e2:
            shutil.rmtree(staging, ignore_errors=True)
            return {"success": False, "error": f"Move failed: {e}, copy fallback failed: {e2}"}

    return {
        "success": True,
        "installed_to": str(dest),
        "hash": source_hash,
    }


def step7_register_claude(skill_name: str) -> dict:
    """STEP 7: Register in .claude/skills/ for native Claude Code discovery."""
    source_dir = safe_skill_path(SKILLS_ROOT, skill_name)
    source_skill_md = source_dir / "SKILL.md"
    claude_dest_dir = safe_skill_path(CLAUDE_SKILLS, skill_name)

    if not source_skill_md.exists():
        return {"success": False, "error": f"SKILL.md not found at {source_skill_md}"}

    claude_dest_dir.mkdir(parents=True, exist_ok=True)

    # Copy SKILL.md
    try:
        (claude_dest_dir / "SKILL.md").write_bytes(source_skill_md.read_bytes())
    except Exception as e:
        return {"success": False, "error": f"Failed to copy SKILL.md to Claude skills: {e}"}

    # Also copy references/ if it exists (useful for Claude to read)
    refs_dir = source_dir / "references"
    if refs_dir.exists():
        claude_refs = claude_dest_dir / "references"
        try:
            if claude_refs.exists():
                shutil.rmtree(claude_refs)
            copy_tree_contents(refs_dir, claude_refs)
        except Exception:
            pass  # Non-critical

    return {
        "success": True,
        "registered_at": str(claude_dest_dir),
        "files_registered": ["SKILL.md"] + (
            ["references/"] if refs_dir.exists() else []
        ),
    }


def step8_update_registry() -> dict:
    """STEP 8: Run scan_registry.py to update orchestrator registry."""
    if not SCAN_SCRIPT.exists():
        return {
            "success": False,
            "error": f"scan_registry.py not found at {SCAN_SCRIPT}",
        }

    try:
        result = subprocess.run(
            ["python", str(SCAN_SCRIPT), "--force"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(SKILLS_ROOT),
        )
        if result.returncode == 0:
            try:
                scan_output = json.loads(result.stdout)
            except json.JSONDecodeError:
                scan_output = {"raw": result.stdout[:500]}
            return {"success": True, "scan_output": scan_output}
        else:
            return {
                "success": False,
                "error": f"scan_registry.py failed: {result.stderr[:500]}",
            }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "scan_registry.py timed out (30s)"}
    except Exception as e:
        return {"success": False, "error": f"Failed to run scan_registry.py: {e}"}


def step9_verify(skill_name: str) -> dict:
    """STEP 9: Verify installation is complete and correct."""
    checks = []

    # Check 1: Skill directory exists
    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    checks.append({
        "check": "skill_dir_exists",
        "pass": dest.exists(),
        "path": str(dest),
    })

    # Check 2: SKILL.md exists and is readable
    skill_md = dest / "SKILL.md"
    skill_md_ok = False
    if skill_md.exists():
        try:
            text = skill_md.read_text(encoding="utf-8")
            skill_md_ok = len(text) > 10
        except Exception:
            pass
    checks.append({
        "check": "skill_md_readable",
        "pass": skill_md_ok,
        "path": str(skill_md),
    })

    # Check 3: Frontmatter parseable
    meta = parse_yaml_frontmatter(skill_md) if skill_md.exists() else {}
    checks.append({
        "check": "frontmatter_parseable",
        "pass": bool(meta.get("name")),
        "name": meta.get("name", ""),
    })

    # Check 4: Claude Code registration
    claude_skill_md = safe_skill_path(CLAUDE_SKILLS, skill_name) / "SKILL.md"
    checks.append({
        "check": "claude_registered",
        "pass": claude_skill_md.exists(),
        "path": str(claude_skill_md),
    })

    # Check 5: Appears in registry
    in_registry = False
    if REGISTRY_PATH.exists():
        try:
            registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
            skill_names = [s.get("name", "").lower() for s in registry.get("skills", [])]
            in_registry = skill_name.lower() in skill_names
        except Exception:
            pass
    checks.append({
        "check": "in_registry",
        "pass": in_registry,
    })

    all_passed = all(c["pass"] for c in checks)

    return {
        "success": all_passed,
        "checks": checks,
        "total": len(checks),
        "passed": sum(1 for c in checks if c["pass"]),
        "failed": sum(1 for c in checks if not c["pass"]),
    }


def step10_log(skill_name: str, source: str, result: dict):
    """STEP 10: Log the operation."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "action": "install",
        "skill_name": skill_name,
        "source": source,
        "destination": str(safe_skill_path(SKILLS_ROOT, skill_name)),
        "registered": result.get("registered", False),
        "registry_updated": result.get("registry_updated", False),
        "backup_path": result.get("backup_path"),
        "success": result.get("success", False),
        "verification": result.get("verification", {}),
        "warnings": result.get("warnings", []),
    }

    try:
        append_log(entry)
    except Exception:
        pass  # Logging failure is non-critical

    return entry


# ── Main Install Workflow ──────────────────────────────────────────────────

def install_single(
    source_path: str,
    name_override: str = None,
    force: bool = False,
    dry_run: bool = False,
    verbose: bool = True,
) -> dict:
    """Install a single skill through the 11-step workflow.

    Args:
        source_path: Path to skill directory containing SKILL.md.
        name_override: Optional name to use instead of frontmatter name.
        force: If True, overwrite existing skill (backup first).
        dry_run: If True, simulate all steps without writing anything.
        verbose: If True, print step-by-step progress to stdout.
    """
    total_steps = 11
    result = {
        "success": False,
        "skill_name": "",
        "installed_to": "",
        "registered": False,
        "registry_updated": False,
        "backup_path": None,
        "warnings": [],
        "steps": {},
        "dry_run": dry_run,
        "installer_version": VERSION,
    }

    if dry_run and verbose:
        print(f"\n{_C.bold(_C.yellow('=== DRY RUN MODE === No changes will be made'))}\n")

    # STEP 1: Already resolved (source is provided)
    if verbose:
        _step(1, total_steps, "Resolving source...")
    try:
        source = resolve_skill_source(source_path)
    except ValueError as e:
        result["error"] = str(e)
        if verbose:
            _fail(str(e))
        return result

    result["steps"]["1_resolve"] = {"success": True, "source": str(source)}
    if verbose:
        _ok(f"Source: {source}")

    # STEP 2: Validate
    if verbose:
        _step(2, total_steps, "Validating skill...")
    validation = step2_validate(source)
    result["steps"]["2_validate"] = validation

    if not validation["valid"]:
        result["error"] = f"Validation failed: {'; '.join(validation['errors'])}"
        result["warnings"] = validation.get("warnings", [])
        if verbose:
            _fail(f"Validation failed: {len(validation['errors'])} error(s)")
            for e in validation["errors"]:
                _fail(f"  {e}")
        return result

    if verbose:
        _ok(f"Validation passed ({validation['passed']}/{validation['total_checks']} checks)")
        for w in validation.get("warnings", []):
            _warn(f"  {w}")

    result["warnings"].extend(validation.get("warnings", []))

    # STEP 3: Determine name
    if verbose:
        _step(3, total_steps, "Determining skill name...")
    skill_name = step3_determine_name(source, name_override)
    result["skill_name"] = skill_name
    result["steps"]["3_name"] = {"name": skill_name}

    if not skill_name:
        result["error"] = "Could not determine skill name"
        if verbose:
            _fail("Could not determine skill name")
        return result
    if verbose:
        _ok(f"Name: {_C.bold(skill_name)}")

    # Version comparison with installed
    source_meta = parse_yaml_frontmatter(source / "SKILL.md")
    source_version = source_meta.get("version", "")
    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    if dest.exists() and (dest / "SKILL.md").exists():
        installed_meta = parse_yaml_frontmatter(dest / "SKILL.md")
        installed_version = installed_meta.get("version", "")
        ver_cmp = compare_versions(installed_version, source_version)
        result["version_comparison"] = {
            "installed": installed_version,
            "source": source_version,
            "result": ver_cmp,
        }
        if verbose and ver_cmp != "unknown":
            if ver_cmp == "upgrade":
                _ok(f"Version: {installed_version} -> {_C.green(source_version)} (upgrade)")
            elif ver_cmp == "downgrade":
                _warn(f"Version: {installed_version} -> {_C.yellow(source_version)} (downgrade)")
            elif ver_cmp == "same":
                _ok(f"Version: {source_version} (same)")

    # STEP 4: Check conflicts
    if verbose:
        _step(4, total_steps, "Checking conflicts...")
    conflicts = step4_check_conflicts(skill_name)
    result["steps"]["4_conflicts"] = conflicts

    if conflicts["has_conflicts"] and not force:
        result["error"] = (
            f"Skill '{skill_name}' already exists at: {', '.join(conflicts['conflicts'])}. "
            f"Use --force to overwrite."
        )
        if verbose:
            _fail(f"Conflict: skill already exists. Use --force to overwrite.")
        return result
    if verbose:
        if conflicts["has_conflicts"]:
            _warn(f"Conflict detected -- will overwrite (--force)")
        else:
            _ok("No conflicts")

    # STEP 5: Backup (if overwriting)
    if verbose:
        _step(5, total_steps, "Creating backup...")
    backup_result = {"success": True, "backup_path": None}
    if conflicts["has_conflicts"] and force:
        if dry_run:
            backup_result = {"success": True, "backup_path": "(dry-run)", "dry_run": True}
            if verbose:
                _ok("Backup would be created (dry-run)")
        else:
            backup_result = step5_backup(skill_name)
            if not backup_result["success"]:
                result["error"] = f"Backup failed: {backup_result.get('error')}"
                if verbose:
                    _fail(f"Backup failed: {backup_result.get('error')}")
                return result
            result["backup_path"] = backup_result.get("backup_path")
            if verbose:
                _ok(f"Backup saved: {backup_result.get('backup_path', '?')}")
    else:
        if verbose:
            _ok("No backup needed (new install)")

    result["steps"]["5_backup"] = backup_result

    # Check idempotency: same content?
    idempotent = False
    if dest.exists():
        source_hash = md5_dir(source)
        dest_hash = md5_dir(dest)
        if source_hash == dest_hash:
            idempotent = True
            result["idempotent"] = True
            result["installed_to"] = str(dest)
            result["steps"]["6_copy"] = {
                "success": True,
                "installed_to": str(dest),
                "skipped": "identical content already at destination",
                "hash": source_hash,
            }
            if verbose:
                _ok("Content identical -- skipping copy")

    # STEP 6: Copy to skills root (skip if idempotent)
    if not idempotent:
        if verbose:
            _step(6, total_steps, "Copying to skills root via staging...")
        if dry_run:
            result["steps"]["6_copy"] = {
                "success": True,
                "installed_to": str(dest),
                "dry_run": True,
            }
            result["installed_to"] = str(dest)
            if verbose:
                _ok(f"Would copy to: {dest} (dry-run)")
        else:
            copy_result = step6_copy_to_skills_root(source, skill_name)
            result["steps"]["6_copy"] = copy_result

            if not copy_result["success"]:
                result["error"] = f"Copy failed: {copy_result.get('error')}"
                if verbose:
                    _fail(f"Copy failed: {copy_result.get('error')}")
                step10_log(skill_name, str(source), result)
                return result

            result["installed_to"] = copy_result["installed_to"]
            if verbose:
                _ok(f"Copied to: {copy_result['installed_to']}")
    elif verbose and not idempotent:
        _step(6, total_steps, "Copying to skills root...")

    # STEP 7: Register in Claude Code (ALWAYS runs, even if idempotent)
    if verbose:
        _step(7, total_steps, "Registering in Claude Code CLI...")
    if dry_run:
        result["steps"]["7_register"] = {"success": True, "dry_run": True}
        result["registered"] = True
        if verbose:
            _ok("Would register in .claude/skills/ (dry-run)")
    else:
        register_result = step7_register_claude(skill_name)
        result["steps"]["7_register"] = register_result
        result["registered"] = register_result["success"]

        if not register_result["success"]:
            result["warnings"].append(f"Registration warning: {register_result.get('error')}")
            if verbose:
                _warn(f"Registration: {register_result.get('error')}")
        elif verbose:
            _ok(f"Registered at: {register_result.get('registered_at')}")

    # STEP 8: Update orchestrator registry
    if verbose:
        _step(8, total_steps, "Updating orchestrator registry...")
    if dry_run:
        result["steps"]["8_registry"] = {"success": True, "dry_run": True}
        result["registry_updated"] = True
        if verbose:
            _ok("Would update registry (dry-run)")
    else:
        registry_result = step8_update_registry()
        result["steps"]["8_registry"] = registry_result
        result["registry_updated"] = registry_result["success"]

        if not registry_result["success"]:
            result["warnings"].append(f"Registry update warning: {registry_result.get('error')}")
            if verbose:
                _warn(f"Registry: {registry_result.get('error')}")
        elif verbose:
            _ok("Registry updated")

    # STEP 9: Verify installation
    if verbose:
        _step(9, total_steps, "Verifying installation...")
    if dry_run:
        result["steps"]["9_verify"] = {"success": True, "dry_run": True}
        result["verification"] = {"success": True, "dry_run": True}
        if verbose:
            _ok("Verification skipped (dry-run)")
    else:
        verify_result = step9_verify(skill_name)
        result["steps"]["9_verify"] = verify_result
        result["verification"] = verify_result
        if verbose:
            if verify_result["success"]:
                _ok(f"All {verify_result['total']} verification checks passed")
            else:
                failed_checks = [c for c in verify_result["checks"] if not c["pass"]]
                _warn(f"{verify_result['failed']}/{verify_result['total']} checks failed")
                for c in failed_checks:
                    _fail(f"  {c['check']}")

    # STEP 10: Package ZIP for Claude.ai web upload
    if verbose:
        _step(10, total_steps, "Packaging ZIP for Claude.ai...")
    if dry_run:
        result["steps"]["10_package"] = {"success": True, "dry_run": True}
        if verbose:
            _ok("Would create ZIP (dry-run)")
    else:
        zip_result = {"success": False, "skipped": True}
        try:
            from package_skill import package_skill as pkg_skill
            zip_result = pkg_skill(safe_skill_path(SKILLS_ROOT, skill_name))
            result["steps"]["10_package"] = zip_result
            result["zip_path"] = zip_result.get("zip_path") if zip_result["success"] else None
            if verbose:
                if zip_result["success"]:
                    _ok(f"ZIP: {zip_result.get('zip_path')} ({zip_result.get('zip_size_kb', '?')} KB)")
                else:
                    _warn(f"ZIP: {zip_result.get('error', 'failed')}")
        except Exception as e:
            zip_result = {"success": False, "error": str(e)}
            result["steps"]["10_package"] = zip_result
            result["warnings"].append(f"ZIP packaging warning: {e}")
            if verbose:
                _warn(f"ZIP packaging: {e}")

    # STEP 11: Log
    if verbose:
        _step(11, total_steps, "Logging operation...")
    if dry_run:
        result["success"] = True
        result["steps"]["11_log"] = {"logged": False, "dry_run": True}
        if verbose:
            _ok("Would log operation (dry-run)")
            print(f"\n{_C.bold(_C.green('DRY RUN COMPLETE'))} -- no changes were made.\n")
    else:
        result["success"] = result.get("verification", {}).get("success", False)
        if not result.get("verification", {}).get("success", True):
            failed_checks = [c for c in result.get("verification", {}).get("checks", []) if not c.get("pass")]
            result["warnings"].append(
                f"Verification: {result['verification'].get('failed', 0)} check(s) failed: "
                + ", ".join(c["check"] for c in failed_checks)
            )

        log_entry = step10_log(skill_name, str(source), result)
        result["steps"]["11_log"] = {"logged": True}
        if verbose:
            _ok("Operation logged")
            if result["success"]:
                print(f"\n{_C.bold(_C.green('SUCCESS'))} -- {_C.bold(skill_name)} installed.\n")
            else:
                print(f"\n{_C.bold(_C.red('FAILED'))} -- see warnings above.\n")

    return result


# ── Uninstall ─────────────────────────────────────────────────────────────

def uninstall_skill(skill_name: str, keep_backup: bool = True) -> dict:
    """Uninstall a skill: remove from skills root, .claude/skills/, and registry."""
    skill_name = sanitize_name(skill_name)
    result = {
        "success": False,
        "skill_name": skill_name,
        "removed": [],
        "backup_path": None,
    }

    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    claude_dest = safe_skill_path(CLAUDE_SKILLS, skill_name)

    if not dest.exists() and not claude_dest.exists():
        result["error"] = f"Skill '{skill_name}' not found in any location"
        return result

    # Backup before removing
    if keep_backup and dest.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = safe_child_path(BACKUPS_DIR, f"{skill_name}_{timestamp}")
        BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copytree(dest, backup_path, dirs_exist_ok=True)
            result["backup_path"] = str(backup_path)
        except Exception as e:
            result["error"] = f"Backup failed: {e}"
            return result

    # Remove from skills root
    if dest.exists():
        try:
            shutil.rmtree(dest)
            result["removed"].append(str(dest))
        except Exception as e:
            result["error"] = f"Failed to remove {dest}: {e}"
            return result

    # Remove from .claude/skills/
    if claude_dest.exists():
        try:
            shutil.rmtree(claude_dest)
            result["removed"].append(str(claude_dest))
        except Exception as e:
            result["warnings"] = [f"Failed to remove Claude registration: {e}"]

    # Update registry
    registry_result = step8_update_registry()

    # Remove ZIP from Desktop if exists
    zip_path = safe_child_path(Path(os.path.expanduser("~")) / "Desktop", f"{skill_name}.zip")
    if zip_path.exists():
        try:
            zip_path.unlink()
            result["removed"].append(str(zip_path))
        except Exception:
            pass

    # Log operation
    entry = {
        "timestamp": datetime.now().isoformat(),
        "action": "uninstall",
        "skill_name": skill_name,
        "removed": result["removed"],
        "backup_path": result.get("backup_path"),
        "success": True,
    }
    try:
        append_log(entry)
    except Exception:
        pass

    result["success"] = True
    result["registry_updated"] = registry_result.get("success", False)
    return result


# ── Health Check ──────────────────────────────────────────────────────────

def health_check() -> dict:
    """Run a global health check on all installed skills."""
    results = []

    # Load registry
    registry_skills = []
    if REGISTRY_PATH.exists():
        try:
            registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
            registry_skills = registry.get("skills", [])
        except Exception:
            pass

    registry_names = {s.get("name", "").lower() for s in registry_skills}

    # Check all skill directories in skills root
    for item in sorted(SKILLS_ROOT.iterdir()):
        if not item.is_dir():
            continue
        if item.name.startswith("."):
            continue
        if item.name in ("agent-orchestrator", "skill-installer"):
            continue

        skill_md = item / "SKILL.md"
        if not skill_md.exists():
            continue

        meta = parse_yaml_frontmatter(skill_md)
        name = meta.get("name", item.name).lower()

        checks = {
            "name": name,
            "dir": str(item),
            "skill_md_exists": skill_md.exists(),
            "frontmatter_ok": bool(meta.get("name") and meta.get("description")),
            "claude_registered": (CLAUDE_SKILLS / name / "SKILL.md").exists(),
            "in_registry": name in registry_names,
            "has_scripts": (item / "scripts").exists(),
            "has_references": (item / "references").exists(),
        }

        # Count issues
        issues = []
        if not checks["frontmatter_ok"]:
            issues.append("invalid frontmatter (missing name or description)")
        if not checks["claude_registered"]:
            issues.append("not registered in .claude/skills/")
        if not checks["in_registry"]:
            issues.append("not in orchestrator registry")

        checks["healthy"] = len(issues) == 0
        checks["issues"] = issues
        results.append(checks)

    # Also check nested skills (e.g., juntas-comerciais/junta-leiloeiros)
    for parent in SKILLS_ROOT.iterdir():
        if not parent.is_dir() or parent.name.startswith("."):
            continue
        if parent.name in ("agent-orchestrator", "skill-installer"):
            continue
        for child in parent.iterdir():
            if child.is_dir() and (child / "SKILL.md").exists():
                # Skip if already checked at top level
                if any(r["dir"] == str(child) for r in results):
                    continue
                meta = parse_yaml_frontmatter(child / "SKILL.md")
                name = meta.get("name", child.name).lower()
                checks = {
                    "name": name,
                    "dir": str(child),
                    "skill_md_exists": True,
                    "frontmatter_ok": bool(meta.get("name") and meta.get("description")),
                    "claude_registered": (CLAUDE_SKILLS / name / "SKILL.md").exists(),
                    "in_registry": name in registry_names,
                    "has_scripts": (child / "scripts").exists(),
                    "has_references": (child / "references").exists(),
                }
                issues = []
                if not checks["frontmatter_ok"]:
                    issues.append("invalid frontmatter")
                if not checks["claude_registered"]:
                    issues.append("not registered in .claude/skills/")
                if not checks["in_registry"]:
                    issues.append("not in orchestrator registry")
                checks["healthy"] = len(issues) == 0
                checks["issues"] = issues
                results.append(checks)

    healthy = sum(1 for r in results if r["healthy"])
    unhealthy = sum(1 for r in results if not r["healthy"])

    # Check for registry duplicates
    from collections import Counter
    reg_name_counts = Counter(s.get("name", "").lower() for s in registry_skills)
    duplicates = {name: count for name, count in reg_name_counts.items() if count > 1}

    return {
        "total_skills": len(results),
        "healthy": healthy,
        "unhealthy": unhealthy,
        "registry_duplicates": duplicates,
        "skills": results,
    }


# ── Auto-Repair ──────────────────────────────────────────────────────────

def repair_health(verbose: bool = True) -> dict:
    """Run health check and automatically fix all issues found.

    Fixes:
    - Skills not registered in .claude/skills/ -> registers them
    - Skills not in orchestrator registry -> triggers registry scan
    - Registry duplicates -> triggers re-scan with deduplication
    """
    if verbose:
        print(f"\n{_C.bold('=== HEALTH CHECK + AUTO-REPAIR ===')}\n")

    health = health_check()
    repairs = []
    errors = []

    unhealthy_skills = [s for s in health["skills"] if not s["healthy"]]

    if not unhealthy_skills and not health["registry_duplicates"]:
        if verbose:
            _ok(f"All {health['total_skills']} skills are healthy. Nothing to repair.")
        health["repairs"] = []
        return health

    # Fix: register missing skills in .claude/skills/
    for skill in unhealthy_skills:
        if "not registered in .claude/skills/" in "; ".join(skill["issues"]):
            name = skill["name"]
            skill_dir = Path(skill["dir"])
            skill_md = skill_dir / "SKILL.md"
            if skill_md.exists():
                claude_dest = CLAUDE_SKILLS / name
                if verbose:
                    _step(1, 2, f"Registering '{name}' in .claude/skills/...")
                try:
                    claude_dest.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(skill_md, claude_dest / "SKILL.md")
                    # Also copy references/ if present
                    refs = skill_dir / "references"
                    if refs.exists():
                        claude_refs = claude_dest / "references"
                        if claude_refs.exists():
                            shutil.rmtree(claude_refs)
                        shutil.copytree(refs, claude_refs)
                    repairs.append({"skill": name, "action": "registered", "success": True})
                    if verbose:
                        _ok(f"Registered: {name}")
                except Exception as e:
                    errors.append({"skill": name, "action": "register", "error": str(e)})
                    if verbose:
                        _fail(f"Failed to register {name}: {e}")

    # Fix: update registry to pick up missing skills and remove duplicates
    needs_registry_update = (
        any("not in orchestrator registry" in "; ".join(s["issues"]) for s in unhealthy_skills)
        or health["registry_duplicates"]
    )
    if needs_registry_update:
        if verbose:
            _step(2, 2, "Updating orchestrator registry...")
        reg_result = step8_update_registry()
        if reg_result["success"]:
            repairs.append({"action": "registry_update", "success": True})
            if verbose:
                _ok("Registry updated")
        else:
            errors.append({"action": "registry_update", "error": reg_result.get("error")})
            if verbose:
                _fail(f"Registry update failed: {reg_result.get('error')}")

    # Re-run health check to confirm
    health_after = health_check()

    result = {
        "before": {
            "healthy": health["healthy"],
            "unhealthy": health["unhealthy"],
            "duplicates": len(health["registry_duplicates"]),
        },
        "after": {
            "healthy": health_after["healthy"],
            "unhealthy": health_after["unhealthy"],
            "duplicates": len(health_after["registry_duplicates"]),
        },
        "repairs": repairs,
        "errors": errors,
        "skills": health_after["skills"],
    }

    if verbose:
        fixed = health["unhealthy"] - health_after["unhealthy"]
        print(f"\n{_C.bold('Result:')} Fixed {_C.green(str(fixed))} of {health['unhealthy']} issues.")
        if health_after["unhealthy"] > 0:
            _warn(f"{health_after['unhealthy']} issues remaining")
        else:
            _ok("All skills healthy!")
        print()

    return result


# ── Rollback ─────────────────────────────────────────────────────────────

def rollback_skill(skill_name: str, verbose: bool = True) -> dict:
    """Restore a skill from its latest backup.

    Finds the most recent backup for the given skill and restores it
    to the skills root, re-registers, and updates the registry.
    """
    skill_name = sanitize_name(skill_name)
    result = {
        "success": False,
        "skill_name": skill_name,
        "restored_from": None,
    }

    if not BACKUPS_DIR.exists():
        result["error"] = "No backups directory found"
        if verbose:
            _fail("No backups directory found")
        return result

    # Find backups for this skill
    prefix = f"{skill_name}_"
    backups = sorted(
        [d for d in BACKUPS_DIR.iterdir() if d.is_dir() and d.name.startswith(prefix)],
        key=lambda d: d.stat().st_mtime,
        reverse=True,
    )

    if not backups:
        result["error"] = f"No backups found for skill '{skill_name}'"
        if verbose:
            _fail(f"No backups found for '{skill_name}'")
            # Show available backups
            all_backups = [d.name for d in BACKUPS_DIR.iterdir() if d.is_dir()]
            if all_backups:
                print(f"  Available backups: {', '.join(sorted(set(b.rsplit('_', 2)[0] for b in all_backups)))}")
        return result

    latest_backup = backups[0]
    backup_skill_md = latest_backup / "SKILL.md"

    if not backup_skill_md.exists():
        result["error"] = f"Backup is invalid (no SKILL.md): {latest_backup}"
        if verbose:
            _fail(f"Backup invalid: {latest_backup}")
        return result

    if verbose:
        timestamp = latest_backup.name.replace(f"{skill_name}_", "")
        print(f"\n{_C.bold(f'=== ROLLBACK: {skill_name} ===')}")
        print(f"  Backup: {latest_backup.name} ({timestamp})")

    # Restore to skills root
    dest = safe_skill_path(SKILLS_ROOT, skill_name)
    if verbose:
        _step(1, 3, "Restoring from backup...")

    try:
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(latest_backup, dest, ignore=_backup_ignore, dirs_exist_ok=True)
        result["restored_from"] = str(latest_backup)
        if verbose:
            _ok(f"Restored to: {dest}")
    except Exception as e:
        result["error"] = f"Restore failed: {e}"
        if verbose:
            _fail(f"Restore failed: {e}")
        return result

    # Re-register in Claude Code
    if verbose:
        _step(2, 3, "Re-registering...")
    reg = step7_register_claude(skill_name)
    if verbose:
        if reg["success"]:
            _ok("Registered")
        else:
            _warn(f"Registration: {reg.get('error')}")

    # Update registry
    if verbose:
        _step(3, 3, "Updating registry...")
    step8_update_registry()
    if verbose:
        _ok("Registry updated")

    # Log operation
    append_log({
        "timestamp": datetime.now().isoformat(),
        "action": "rollback",
        "skill_name": skill_name,
        "backup_used": str(latest_backup),
        "success": True,
    })

    result["success"] = True
    if verbose:
        print(f"\n{_C.bold(_C.green('ROLLBACK COMPLETE'))}\n")
    return result


# ── Reinstall All ────────────────────────────────────────────────────────

def reinstall_all(force: bool = True, verbose: bool = True) -> dict:
    """Re-register every installed skill in one pass.

    Iterates all skill directories, re-copies SKILL.md to .claude/skills/,
    re-packages ZIPs, and updates the registry.
    """
    if verbose:
        print(f"\n{_C.bold('=== REINSTALL ALL SKILLS ===')}\n")

    skill_dirs = get_all_skill_dirs()
    results_list = []

    for i, skill_dir in enumerate(skill_dirs, 1):
        meta = parse_yaml_frontmatter(skill_dir / "SKILL.md")
        name = meta.get("name", skill_dir.name)
        name = sanitize_name(name)

        if verbose:
            print(f"  [{i}/{len(skill_dirs)}] {_C.bold(name)}...")

        # Re-register in .claude/skills/
        reg = step7_register_claude(name)

        # Re-package ZIP
        zip_result = {"success": False}
        try:
            from package_skill import package_skill as pkg_skill
            zip_result = pkg_skill(skill_dir)
        except Exception:
            pass

        r = {
            "skill": name,
            "registered": reg["success"],
            "zipped": zip_result.get("success", False),
        }
        results_list.append(r)

        if verbose:
            status = _C.green(_C.OK) if reg["success"] else _C.red(_C.FAIL)
            zip_status = _C.green("ZIP-OK") if zip_result.get("success") else _C.yellow("ZIP-WARN")
            print(f"    {status} registered  {zip_status}")

    # Final registry update
    if verbose:
        print(f"\n  Updating registry...")
    step8_update_registry()

    registered_ok = sum(1 for r in results_list if r["registered"])
    zipped_ok = sum(1 for r in results_list if r["zipped"])

    result = {
        "total": len(results_list),
        "registered": registered_ok,
        "zipped": zipped_ok,
        "results": results_list,
    }

    if verbose:
        print(f"\n{_C.bold('Result:')} {registered_ok}/{len(results_list)} registered, {zipped_ok}/{len(results_list)} zipped.")
        print()

    # Log
    append_log({
        "timestamp": datetime.now().isoformat(),
        "action": "reinstall_all",
        "total": len(results_list),
        "registered": registered_ok,
        "zipped": zipped_ok,
        "success": True,
    })

    return result


# ── Status Dashboard ─────────────────────────────────────────────────────

def show_status(verbose: bool = True) -> dict:
    """Rich status dashboard showing all skills, versions, and health."""
    health = health_check()

    # Load registry for version info
    registry_skills = {}
    if REGISTRY_PATH.exists():
        try:
            reg = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
            for s in reg.get("skills", []):
                registry_skills[s.get("name", "").lower()] = s
        except Exception:
            pass

    # Count backups per skill
    backup_counts = {}
    if BACKUPS_DIR.exists():
        for d in BACKUPS_DIR.iterdir():
            if d.is_dir():
                # Extract skill name (everything before last _TIMESTAMP)
                parts = d.name.rsplit("_", 2)
                if len(parts) >= 3:
                    bname = parts[0]
                else:
                    bname = d.name
                backup_counts[bname] = backup_counts.get(bname, 0) + 1

    # Log stats
    log_ops = load_log()
    install_count = sum(1 for o in log_ops if o.get("action") == "install")
    uninstall_count = sum(1 for o in log_ops if o.get("action") == "uninstall")
    rollback_count = sum(1 for o in log_ops if o.get("action") == "rollback")

    if verbose:
        print(f"\n{_C.bold('+' + '='*62 + '+')}")
        print(f"{_C.bold('|')}  {_C.bold(_C.cyan('Skill Installer v' + VERSION + ' -- Status Dashboard'))}              {_C.bold('|')}")
        print(f"{_C.bold('+' + '='*62 + '+')}\n")

        # Skills table header
        print(f"  {'Name':<24} {'Version':<10} {'Health':<10} {'Registered':<12} {'Backups':<8}")
        print(f"  {'-'*24} {'-'*10} {'-'*10} {'-'*12} {'-'*8}")

        for skill in health["skills"]:
            name = skill["name"][:22]
            reg_entry = registry_skills.get(skill["name"], {})
            version = reg_entry.get("version", "-") or "-"
            status = _C.green("OK") if skill["healthy"] else _C.red("ISSUE")
            registered = _C.green("Yes") if skill["claude_registered"] else _C.red("No")
            backups = str(backup_counts.get(skill["name"], 0))
            print(f"  {name:<24} {version:<10} {status:<19} {registered:<21} {backups:<8}")

            if not skill["healthy"]:
                for issue in skill["issues"]:
                    print(f"    {_C.dim(f'  -> {issue}')}")

        print(f"\n  {_C.bold('Summary:')}")
        print(f"    Skills: {_C.bold(str(health['total_skills']))} total, "
              f"{_C.green(str(health['healthy']))} healthy, "
              f"{_C.red(str(health['unhealthy'])) if health['unhealthy'] else '0'} unhealthy")
        if health["registry_duplicates"]:
            print(f"    {_C.yellow('Duplicates:')} {health['registry_duplicates']}")

        print(f"\n  {_C.bold('Operations Log:')}")
        print(f"    Installs: {install_count} | Uninstalls: {uninstall_count} | Rollbacks: {rollback_count}")
        print(f"    Total logged: {len(log_ops)}")
        print()

    return {
        "health": health,
        "backup_counts": backup_counts,
        "log_stats": {
            "total": len(log_ops),
            "installs": install_count,
            "uninstalls": uninstall_count,
            "rollbacks": rollback_count,
        },
    }


# ── Log Viewer ───────────────────────────────────────────────────────────

def show_log(n: int = 20, verbose: bool = True) -> list:
    """Show the last N log entries."""
    ops = load_log()
    recent = ops[-n:] if len(ops) > n else ops

    if verbose:
        print(f"\n{_C.bold(f'=== Last {len(recent)} Operations ===')}\n")
        for op in reversed(recent):
            ts = op.get("timestamp", "?")[:19]
            action = op.get("action", "?")
            name = op.get("skill_name", "?")
            success = op.get("success", False)

            # Color the action
            if action == "install":
                action_str = _C.green("INSTALL")
            elif action == "uninstall":
                action_str = _C.red("UNINSTALL")
            elif action == "rollback":
                action_str = _C.yellow("ROLLBACK")
            elif action == "reinstall_all":
                action_str = _C.cyan("REINSTALL-ALL")
            else:
                action_str = action.upper()

            status = _C.green(_C.OK) if success else _C.red(_C.FAIL)
            print(f"  {_C.dim(ts)}  {action_str:<22} {name:<24} {status}")

        print()

    return recent


# ── CLI Entry Point ───────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    source = None
    name_override = None
    force = "--force" in args
    dry_run = "--dry-run" in args
    do_detect = "--detect" in args
    auto = "--auto" in args
    do_uninstall = "--uninstall" in args
    do_health = "--health" in args
    do_repair = "--repair" in args
    do_rollback = "--rollback" in args
    do_reinstall_all = "--reinstall-all" in args
    do_status = "--status" in args
    do_log = "--log" in args
    json_output = "--json" in args

    if "--source" in args:
        idx = args.index("--source")
        if idx + 1 < len(args):
            source = args[idx + 1]

    if "--name" in args:
        idx = args.index("--name")
        if idx + 1 < len(args):
            name_override = args[idx + 1]

    # ── Status dashboard ──
    if do_status:
        result = show_status(verbose=not json_output)
        if json_output:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0)

    # ── Log viewer ──
    if do_log:
        n = 20
        idx = args.index("--log")
        if idx + 1 < len(args):
            try:
                n = int(args[idx + 1])
            except ValueError:
                pass
        result = show_log(n=n, verbose=not json_output)
        if json_output:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0)

    # ── Health check (with optional auto-repair) ──
    if do_health:
        if do_repair:
            result = repair_health(verbose=not json_output)
            if json_output:
                print(json.dumps(result, indent=2, ensure_ascii=False))
            remaining = result.get("after", {}).get("unhealthy", 0)
            sys.exit(0 if remaining == 0 else 1)
        else:
            result = health_check()
            if json_output:
                print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                # Pretty print health
                print(f"\n{_C.bold('=== HEALTH CHECK ===')}\n")
                for s in result["skills"]:
                    if s["healthy"]:
                        _ok(s["name"])
                    else:
                        _fail(f"{s['name']}: {'; '.join(s['issues'])}")
                print(f"\n  {_C.bold(str(result['healthy']))}/{result['total_skills']} healthy")
                if result["unhealthy"] > 0:
                    print(f"  {_C.yellow('Tip:')} run with --repair to auto-fix issues")
                if result["registry_duplicates"]:
                    print(f"  {_C.yellow('Duplicates:')} {result['registry_duplicates']}")
                print()
            sys.exit(0 if result["unhealthy"] == 0 else 1)

    # ── Rollback ──
    if do_rollback:
        idx = args.index("--rollback")
        if idx + 1 >= len(args):
            print(json.dumps({"error": "Usage: --rollback <skill-name>"}, indent=2))
            sys.exit(1)
        skill_name = args[idx + 1]
        result = rollback_skill(skill_name, verbose=not json_output)
        if json_output:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["success"] else 1)

    # ── Reinstall all ──
    if do_reinstall_all:
        result = reinstall_all(force=True, verbose=not json_output)
        if json_output:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0)

    # ── Uninstall ──
    if do_uninstall:
        idx = args.index("--uninstall")
        if idx + 1 >= len(args):
            print(json.dumps({"error": "Usage: --uninstall <skill-name>"}, indent=2))
            sys.exit(1)
        skill_name = args[idx + 1]
        result = uninstall_skill(skill_name)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["success"] else 1)

    # ── No arguments: show usage ──
    if not source and not do_detect:
        print(f"\n{_C.bold(_C.cyan('Skill Installer v' + VERSION))}\n")
        print(f"  {_C.bold('Install:')}")
        print(f"    --source <path>                  Install skill from path")
        print(f"    --source <path> --force           Overwrite if exists")
        print(f"    --source <path> --name <name>     Custom name override")
        print(f"    --source <path> --dry-run         Simulate without changes")
        print(f"    --detect                          Auto-detect uninstalled skills")
        print(f"    --detect --auto                   Detect and install all")
        print(f"")
        print(f"  {_C.bold('Manage:')}")
        print(f"    --uninstall <name>               Uninstall (with backup)")
        print(f"    --rollback <name>                Restore from latest backup")
        print(f"    --reinstall-all                  Re-register + re-package all skills")
        print(f"")
        print(f"  {_C.bold('Monitor:')}")
        print(f"    --health                         Health check all skills")
        print(f"    --health --repair                Health check + auto-fix issues")
        print(f"    --status                         Rich status dashboard")
        print(f"    --log [N]                        Show last N operations (default: 20)")
        print(f"")
        print(f"  {_C.bold('Flags:')}")
        print(f"    --json                           Output JSON instead of pretty text")
        print(f"    --force                          Force overwrite")
        print(f"    --dry-run                        Simulate without changes")
        print()
        sys.exit(1)

    # ── Install from source ──
    if source:
        result = install_single(source, name_override, force, dry_run=dry_run, verbose=not json_output)
        if json_output:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result["success"] else 1)

    # ── Detection mode ──
    elif do_detect:
        resolve = step1_resolve_source(do_detect=True, auto=auto)

        if not resolve["success"]:
            print(json.dumps(resolve, indent=2, ensure_ascii=False))
            sys.exit(1)

        if resolve.get("interactive") and not auto:
            if json_output:
                print(json.dumps({
                    "mode": "interactive",
                    "message": "Skills detected but not installed.",
                    "candidates": resolve["candidates"],
                }, indent=2, ensure_ascii=False))
            else:
                print(f"\n{_C.bold('=== Detected Uninstalled Skills ===')}\n")
                for i, c in enumerate(resolve["candidates"], 1):
                    name = c.get("name", "?")
                    src = c.get("source_path", "?")
                    loc = c.get("location_type", "?")
                    valid = _C.green(_C.OK) if c.get("valid_frontmatter") else _C.red(_C.FAIL)
                    print(f"  {i}. {_C.bold(name)} {valid}")
                    print(f"     {_C.dim(src)} ({loc})")
                print(f"\n  Run with --auto to install all, or --source <path> to install one.\n")
            sys.exit(0)

        # Auto mode: install all candidates
        results = []
        for src in resolve["sources"]:
            r = install_single(src, force=force, dry_run=dry_run, verbose=not json_output)
            results.append(r)

        total = len(results)
        success = sum(1 for r in results if r["success"])
        failed = total - success

        summary = {
            "mode": "auto",
            "total": total,
            "success": success,
            "failed": failed,
            "results": results,
        }

        if json_output:
            print(json.dumps(summary, indent=2, ensure_ascii=False))
        sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
