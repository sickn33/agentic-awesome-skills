#!/usr/bin/env python3
"""
Sync Microsoft Skills Repository - v4 (Flat Structure)
Reads each SKILL.md frontmatter 'name' field and uses it as a flat directory
name under skills/ to comply with the repository's indexing conventions.
"""

import re
import shutil
import subprocess
import tempfile
import json
from pathlib import Path, PurePosixPath

MS_REPO = "https://github.com/microsoft/skills.git"
REPO_ROOT = Path(__file__).parent.parent
TARGET_DIR = REPO_ROOT / "skills"
DOCS_DIR = REPO_ROOT / "docs"
ATTRIBUTION_FILE = DOCS_DIR / "microsoft-skills-attribution.json"


def clone_repo(temp_dir: Path):
    """Clone Microsoft skills repository (shallow)."""
    print("🔄 Cloning Microsoft Skills repository...")
    subprocess.run(
        ["git", "clone", "--depth", "1", MS_REPO, str(temp_dir)],
        check=True,
    )


def cleanup_previous_sync():
    """Remove skill directories from a previous sync using the attribution manifest."""
    if not ATTRIBUTION_FILE.exists():
        print("  ℹ️  No previous attribution file found — skipping cleanup.")
        return 0

    try:
        with open(ATTRIBUTION_FILE) as f:
            attribution = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"  ⚠️  Could not read attribution file: {e}")
        return 0

    previous_skills = attribution.get("skills", [])
    removed_count = 0

    for skill in previous_skills:
        flat_name = skill.get("flat_name", "")
        if not flat_name:
            continue

        sanitized = sanitize_flat_name(flat_name, "")
        if not sanitized:
            continue

        skill_dir = TARGET_DIR / sanitized
        if not is_path_within(TARGET_DIR, skill_dir):
            continue
        if skill_dir.exists() and skill_dir.is_dir():
            shutil.rmtree(skill_dir)
            removed_count += 1

    print(
        f"  🗑️  Removed {removed_count} previously synced skill directories.")
    return removed_count


import yaml

SAFE_FLAT_NAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def is_path_within(base_dir: Path, target_path: Path) -> bool:
    """Return True when target_path resolves inside base_dir."""
    try:
        target_path.resolve().relative_to(base_dir.resolve())
        return True
    except ValueError:
        return False


def is_safe_regular_file(file_path: Path, source_root: Path) -> bool:
    try:
        if file_path.is_symlink():
            return False
        if not file_path.is_file():
            return False
        return is_path_within(source_root, file_path.resolve())
    except OSError:
        return False


def sanitize_flat_name(candidate: str | None, fallback: str) -> str:
    """Accept only flat skill directory names; fall back on unsafe values."""
    if not candidate:
        return fallback

    stripped = candidate.strip()
    parts = Path(stripped).parts
    if (
        not stripped
        or Path(stripped).is_absolute()
        or any(part in ("..", ".") for part in parts)
        or "/" in stripped
        or "\\" in stripped
    ):
        return fallback

    sanitized = SAFE_FLAT_NAME_PATTERN.sub("-", stripped).strip("-.")
    return sanitized or fallback


def copy_safe_skill_files(source_dir: Path, target_dir: Path, source_root: Path):
    """Copy regular files only when their resolved path stays inside source_root."""
    for file_item in source_dir.iterdir():
        if file_item.name == "SKILL.md" or not is_safe_regular_file(file_item, source_root):
            continue
        shutil.copy2(file_item.resolve(), target_dir / file_item.name)

def extract_skill_name(skill_md_path: Path) -> str | None:
    """Extract the 'name' field from SKILL.md YAML frontmatter using PyYAML."""
    try:
        content = skill_md_path.read_text(encoding="utf-8")
    except Exception:
        return None

    fm_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not fm_match:
        return None

    try:
        data = yaml.safe_load(fm_match.group(1)) or {}
        return data.get('name')
    except Exception:
        return None


def generate_fallback_name(relative_path: Path) -> str:
    """
    Generate a fallback directory name when frontmatter 'name' is missing.
    Converts a path like 'dotnet/compute/botservice' to 'ms-dotnet-compute-botservice'.
    """
    parts = [p for p in relative_path.parts if p]
    return "ms-" + "-".join(parts)


def find_skills_in_directory(source_dir: Path):
    """
    Walk the Microsoft repo's skills/ directory (which uses symlinks)
    and resolve each to its actual SKILL.md content.
    Returns list of dicts: {relative_path, skill_md_path, source_dir}.
    """
    skills_source = source_dir / "skills"
    source_root = source_dir.resolve()
    results = []

    if not skills_source.exists():
        return results

    for item in skills_source.rglob("*"):
        if not item.is_dir():
            continue

        skill_md = None
        actual_dir = None

        if item.is_symlink():
            try:
                resolved = item.resolve()
                if not is_path_within(source_root, resolved):
                    continue
                if (resolved / "SKILL.md").exists():
                    skill_md = resolved / "SKILL.md"
                    actual_dir = resolved
            except Exception:
                continue
        elif (item / "SKILL.md").exists():
            skill_md = item / "SKILL.md"
            actual_dir = item

        if skill_md is None:
            continue

        if not is_safe_regular_file(skill_md, source_root):
            continue

        try:
            relative_path = PurePosixPath(item.relative_to(skills_source).as_posix())
        except ValueError:
            continue

        results.append({
            "relative_path": relative_path,
            "skill_md": skill_md,
            "source_dir": actual_dir,
        })

    return results


def find_plugin_skills(source_dir: Path, already_synced_names: set):
    """Find plugin skills in .github/plugins/ that haven't been synced yet."""
    results = []
    github_plugins = source_dir / ".github" / "plugins"

    if not github_plugins.exists():
        return results

    for skill_file in github_plugins.rglob("SKILL.md"):
        skill_dir = skill_file.parent
        skill_name = skill_dir.name

        if not is_safe_regular_file(skill_file, source_dir):
            continue

        if skill_name not in already_synced_names:
            results.append({
                "relative_path": PurePosixPath("plugins") / skill_name,
                "skill_md": skill_file,
                "source_dir": skill_dir,
            })

    return results


def find_github_skills(source_dir: Path, already_synced_names: set):
    """Find skills in .github/skills/ not reachable via the skills/ symlink tree."""
    results = []
    github_skills = source_dir / ".github" / "skills"

    if not github_skills.exists():
        return results

    for skill_dir in github_skills.iterdir():
        if skill_dir.is_symlink() or not skill_dir.is_dir():
            continue

        skill_md = skill_dir / "SKILL.md"
        if not is_safe_regular_file(skill_md, source_dir):
            continue

        if skill_dir.name not in already_synced_names:
            results.append({
                "relative_path": PurePosixPath(".github/skills") / skill_dir.name,
                "skill_md": skill_md,
                "source_dir": skill_dir,
            })

    return results


def sync_skills_flat(source_dir: Path, target_dir: Path):
    """
    Sync all Microsoft skills into a flat structure under skills/.
    Uses frontmatter 'name' as directory name, with collision detection.
    Protects existing non-Microsoft skills from being overwritten.
    """
    # Load previous attribution to know which dirs are Microsoft-owned
    previously_synced_names = set()
    if ATTRIBUTION_FILE.exists():
        try:
            with open(ATTRIBUTION_FILE) as f:
                prev = json.load(f)
            previously_synced_names = {
                s["flat_name"] for s in prev.get("skills", []) if s.get("flat_name")
            }
        except (json.JSONDecodeError, OSError):
            pass

    all_skill_entries = find_skills_in_directory(source_dir)
    print(f"  📂 Found {len(all_skill_entries)} skills in skills/ directory")

    synced_count = 0
    skill_metadata = []
    # name -> original relative_path (for collision logging)
    used_names: dict[str, str] = {}

    for entry in all_skill_entries:
        fallback_name = generate_fallback_name(entry["relative_path"])
        skill_name = sanitize_flat_name(
            extract_skill_name(entry["skill_md"]), fallback_name)

        if skill_name == fallback_name:
            print(
                f"  ⚠️  No frontmatter name for {entry['relative_path']}, using fallback: {skill_name}")

        # Internal collision detection (two Microsoft skills with same name)
        if skill_name in used_names:
            original = used_names[skill_name]
            print(
                f"  ⚠️  Name collision '{skill_name}': {entry['relative_path']} vs {original}")
            lang = entry["relative_path"].parts[0] if entry["relative_path"].parts else "unknown"
            skill_name = f"{skill_name}-{lang}"
            print(f"       Resolved to: {skill_name}")

        # Protect existing non-Microsoft skills from being overwritten
        target_skill_dir = target_dir / skill_name
        if target_skill_dir.exists() and skill_name not in previously_synced_names:
            original_name = skill_name
            skill_name = f"{skill_name}-ms"
            print(
                f"  ⚠️  '{original_name}' exists as a non-Microsoft skill, using: {skill_name}")

        used_names[skill_name] = str(entry["relative_path"])

        # Create flat target directory
        target_skill_dir = target_dir / skill_name
        target_skill_dir.mkdir(parents=True, exist_ok=True)

        # Copy SKILL.md
        shutil.copy2(entry["skill_md"], target_skill_dir / "SKILL.md")

        # Copy other files from the skill directory
        copy_safe_skill_files(entry["source_dir"], target_skill_dir, source_dir)

        skill_metadata.append({
            "flat_name": skill_name,
            "original_path": str(entry["relative_path"]),
            "source": "microsoft/skills",
        })

        synced_count += 1
        print(f"  ✅ {entry['relative_path']} → skills/{skill_name}/")

    # Collect all source directory names already synced (for dedup)
    synced_names = set(used_names.keys())
    already_synced_dir_names = {
        e["source_dir"].name for e in all_skill_entries}

    # Sync plugin skills from .github/plugins/
    plugin_entries = find_plugin_skills(source_dir, already_synced_dir_names)

    if plugin_entries:
        print(f"\n  📦 Found {len(plugin_entries)} additional plugin skills")
        for entry in plugin_entries:
            skill_name = sanitize_flat_name(
                extract_skill_name(entry["skill_md"]), entry["source_dir"].name)

            if skill_name in synced_names:
                skill_name = f"{skill_name}-plugin"

            # Protect existing non-Microsoft skills
            target_skill_dir = target_dir / skill_name
            if target_skill_dir.exists() and skill_name not in previously_synced_names:
                original_name = skill_name
                skill_name = f"{skill_name}-ms"
                target_skill_dir = target_dir / skill_name
                print(
                    f"  ⚠️  '{original_name}' exists as a non-Microsoft skill, using: {skill_name}")

            synced_names.add(skill_name)
            already_synced_dir_names.add(entry["source_dir"].name)

            target_skill_dir.mkdir(parents=True, exist_ok=True)

            shutil.copy2(entry["skill_md"], target_skill_dir / "SKILL.md")

            copy_safe_skill_files(entry["source_dir"], target_skill_dir, source_dir)

            skill_metadata.append({
                "flat_name": skill_name,
                "original_path": str(entry["relative_path"]),
                "source": "microsoft/skills (plugin)",
            })

            synced_count += 1
            print(f"  ✅ {entry['relative_path']} → skills/{skill_name}/")

    # Sync skills in .github/skills/ not reachable via the skills/ symlink tree
    github_skill_entries = find_github_skills(
        source_dir, already_synced_dir_names)

    if github_skill_entries:
        print(
            f"\n  � Found {len(github_skill_entries)} skills in .github/skills/ not linked from skills/")
        for entry in github_skill_entries:
            skill_name = sanitize_flat_name(
                extract_skill_name(entry["skill_md"]), entry["source_dir"].name)

            if skill_name in synced_names:
                skill_name = f"{skill_name}-github"

            # Protect existing non-Microsoft skills
            target_skill_dir = target_dir / skill_name
            if target_skill_dir.exists() and skill_name not in previously_synced_names:
                original_name = skill_name
                skill_name = f"{skill_name}-ms"
                target_skill_dir = target_dir / skill_name
                print(
                    f"  ⚠️  '{original_name}' exists as a non-Microsoft skill, using: {skill_name}")

            synced_names.add(skill_name)

            target_skill_dir.mkdir(parents=True, exist_ok=True)

            shutil.copy2(entry["skill_md"], target_skill_dir / "SKILL.md")

            copy_safe_skill_files(entry["source_dir"], target_skill_dir, source_dir)

            skill_metadata.append({
                "flat_name": skill_name,
                "original_path": str(entry["relative_path"]),
                "source": "microsoft/skills (.github/skills)",
            })

            synced_count += 1
            print(f"  ✅ {entry['relative_path']} → skills/{skill_name}/")

    return synced_count, skill_metadata


def save_attribution(metadata: list):
    """Save attribution metadata to docs/."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    attribution = {
        "source": "microsoft/skills",
        "repository": "https://github.com/microsoft/skills",
        "license": "MIT",
        "synced_skills": len(metadata),
        "structure": "flat (frontmatter name as directory name)",
        "skills": metadata,
    }
    with open(DOCS_DIR / "microsoft-skills-attribution.json", "w") as f:
        json.dump(attribution, f, indent=2)


def copy_license(source_dir: Path):
    """Copy the Microsoft LICENSE to docs/."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    license_file = source_dir / "LICENSE"
    if is_safe_regular_file(license_file, source_dir):
        shutil.copy2(license_file.resolve(), DOCS_DIR / "LICENSE-MICROSOFT")


def main():
    """Main sync function."""
    print("🚀 Microsoft Skills Sync Script v4 (Flat Structure)")
    print("=" * 55)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        try:
            clone_repo(temp_path)

            TARGET_DIR.mkdir(parents=True, exist_ok=True)

            print("\n🧹 Cleaning up previous sync...")
            cleanup_previous_sync()

            print("\n🔗 Resolving symlinks and flattening into skills/<name>/...")
            count, metadata = sync_skills_flat(temp_path, TARGET_DIR)

            print("\n📄 Saving attribution...")
            save_attribution(metadata)
            copy_license(temp_path)

            print(
                f"\n✨ Success! Synced {count} Microsoft skills (flat structure)")
            print(f"📁 Location: {TARGET_DIR}/")

            # Show summary of languages
            languages = set()
            for skill in metadata:
                parts = skill["original_path"].split("/")
                if len(parts) >= 1 and parts[0] != "plugins":
                    languages.add(parts[0])

            print(f"\n📊 Organization:")
            print(f"  Total skills: {count}")
            print(f"  Languages: {', '.join(sorted(languages))}")

            print("\n📋 Next steps:")
            print("1. Run: npm run build")
            print("2. Commit changes and create PR")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return 1

    return 0


if __name__ == "__main__":
    exit(main())
