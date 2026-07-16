#!/usr/bin/env python3
"""
Inspect Microsoft Skills Repository Structure
Shows the repository layout, skill locations, and what flat names would be generated.
"""

import re
import io
import shutil
import subprocess
import sys
import tempfile
import traceback
import uuid
from pathlib import Path

MS_REPO = "https://github.com/microsoft/skills.git"


def create_clone_target(prefix: str) -> Path:
    """Return a writable, non-existent path for git clone destination."""
    repo_tmp_root = Path(__file__).resolve().parents[2] / ".tmp" / "tests"
    candidate_roots = (repo_tmp_root, Path(tempfile.gettempdir()))
    last_error: OSError | None = None

    for root in candidate_roots:
        try:
            root.mkdir(parents=True, exist_ok=True)
            probe_file = root / f".{prefix}write-probe-{uuid.uuid4().hex}.tmp"
            with probe_file.open("xb"):
                pass
            probe_file.unlink()
            return root / f"{prefix}{uuid.uuid4().hex}"
        except OSError as exc:
            last_error = exc

    if last_error is not None:
        raise last_error
    raise OSError("Unable to determine clone destination")


def configure_utf8_output() -> None:
    """Best-effort UTF-8 stdout/stderr on Windows without dropping diagnostics."""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name)
        try:
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
            continue
        except Exception:
            pass

        buffer = getattr(stream, "buffer", None)
        if buffer is not None:
            setattr(
                sys,
                stream_name,
                io.TextIOWrapper(
                    buffer, encoding="utf-8", errors="backslashreplace"
                ),
            )


def extract_skill_name(skill_md_path: Path) -> str | None:
    """Extract the 'name' field from SKILL.md YAML frontmatter."""
    try:
        content = skill_md_path.read_text(encoding="utf-8")
    except Exception:
        return None

    fm_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not fm_match:
        return None

    for line in fm_match.group(1).splitlines():
        match = re.match(r"^name:\s*(.+)$", line)
        if match:
            value = match.group(1).strip().strip("\"'")
            if value:
                return value
    return None


def inspect_repo():
    """Inspect the Microsoft skills repository structure."""
    print("🔍 Inspecting Microsoft Skills Repository Structure")
    print("=" * 60)

    repo_path: Path | None = None
    try:
        repo_path = create_clone_target(prefix="ms-skills-")

        print("\n1️⃣ Cloning repository...")
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", MS_REPO, str(repo_path)],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            print("\n❌ git clone failed.", file=sys.stderr)
            if exc.stderr:
                print(exc.stderr.strip(), file=sys.stderr)
            raise

        # Find all SKILL.md files
        all_skill_mds = list(repo_path.rglob("SKILL.md"))
        print(f"\n2️⃣ Total SKILL.md files found: {len(all_skill_mds)}")

        # Show flat name mapping
        print(f"\n3️⃣ Flat Name Mapping (frontmatter 'name' → directory name):")
        print("-" * 60)

        names_seen: dict[str, list[str]] = {}

        for skill_md in sorted(all_skill_mds, key=lambda p: str(p)):
            try:
                rel = skill_md.parent.relative_to(repo_path)
            except ValueError:
                rel = skill_md.parent

            name = extract_skill_name(skill_md)
            display_name = name if name else f"(no name → ms-{'-'.join(rel.parts[1:])})"

            print(f"  {rel} → {display_name}")

            effective_name = name if name else f"ms-{'-'.join(rel.parts[1:])}"
            if effective_name not in names_seen:
                names_seen[effective_name] = []
            names_seen[effective_name].append(str(rel))

        # Collision check
        collisions = {n: paths for n, paths in names_seen.items()
                      if len(paths) > 1}
        if collisions:
            print(f"\n4️⃣ ⚠️  Name Collisions Detected ({len(collisions)}):")
            for name, paths in collisions.items():
                print(f"  '{name}':")
                for p in paths:
                    print(f"    - {p}")
        else:
            print(
                f"\n4️⃣ ✅ No name collisions — all {len(names_seen)} names are unique!")

        print("\n✨ Inspection complete!")
    finally:
        if repo_path is not None:
            shutil.rmtree(repo_path, ignore_errors=True)


if __name__ == "__main__":
    configure_utf8_output()
    try:
        inspect_repo()
    except subprocess.CalledProcessError as exc:
        sys.exit(exc.returncode or 1)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
