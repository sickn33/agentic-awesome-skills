#!/usr/bin/env python3
"""
Skills Manager - Easily enable/disable skills locally

Usage:
  python3 scripts/skills_manager.py list          # List active skills
  python3 scripts/skills_manager.py disabled      # List disabled skills
  python3 scripts/skills_manager.py enable SKILL  # Enable a skill
  python3 scripts/skills_manager.py disable SKILL # Disable a skill
"""

import sys
import os
from pathlib import Path

SKILLS_DIR = Path(__file__).parent.parent / "skills"
DISABLED_DIR = SKILLS_DIR / ".disabled"


def resolve_skill_path(base_dir: Path, skill_name: str) -> Path | None:
    candidate = (base_dir / skill_name).resolve()
    try:
        candidate.relative_to(base_dir.resolve())
        return candidate
    except ValueError:
        print(f"❌ Invalid skill name: {skill_name}")
        return None

def list_active():
    """List all active skills"""
    print("🟢 Active Skills:\n")
    skills = sorted([d.name for d in SKILLS_DIR.iterdir() 
                    if d.is_dir() and not d.name.startswith('.')])
    symlinks = sorted([s.name for s in SKILLS_DIR.iterdir() 
                      if s.is_symlink()])
    
    for skill in skills:
        print(f"  • {skill}")
    
    if symlinks:
        print("\n📎 Symlinks:")
        for link in symlinks:
            target = os.readlink(SKILLS_DIR / link)
            print(f"  • {link} → {target}")
    
    print(f"\n✅ Total: {len(skills)} skills + {len(symlinks)} symlinks")

def list_disabled():
    """List all disabled skills"""
    if not DISABLED_DIR.exists():
        print("❌ No disabled skills directory found")
        return
    
    print("⚪ Disabled Skills:\n")
    disabled = sorted([d.name for d in DISABLED_DIR.iterdir() if d.is_dir()])
    
    for skill in disabled:
        print(f"  • {skill}")
    
    print(f"\n📊 Total: {len(disabled)} disabled skills")

def enable_skill(skill_name):
    """Enable a disabled skill"""
    source = resolve_skill_path(DISABLED_DIR, skill_name)
    target = resolve_skill_path(SKILLS_DIR, skill_name)

    if source is None or target is None:
        return False
    
    if not source.exists():
        print(f"❌ Skill '{skill_name}' not found in .disabled/")
        return False
    
    if target.exists():
        print(f"⚠️  Skill '{skill_name}' is already active")
        return False
    
    source.rename(target)
    print(f"✅ Enabled: {skill_name}")
    return True

def disable_skill(skill_name):
    """Disable an active skill"""
    source = resolve_skill_path(SKILLS_DIR, skill_name)
    target = resolve_skill_path(DISABLED_DIR, skill_name)

    if source is None or target is None:
        return False
    
    if not source.exists():
        print(f"❌ Skill '{skill_name}' not found")
        return False
    
    if source.name.startswith('.'):
        print(f"⚠️  Cannot disable system directory: {skill_name}")
        return False
    
    if source.is_symlink():
        print(f"⚠️  Cannot disable symlink: {skill_name}")
        print(f"   (Remove the symlink manually if needed)")
        return False
    
    DISABLED_DIR.mkdir(exist_ok=True)
    source.rename(target)
    print(f"✅ Disabled: {skill_name}")
    return True

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_active()
    elif command == "disabled":
        list_disabled()
    elif command == "enable":
        if len(sys.argv) < 3:
            print("❌ Usage: skills_manager.py enable SKILL_NAME")
            sys.exit(1)
        enable_skill(sys.argv[2])
    elif command == "disable":
        if len(sys.argv) < 3:
            print("❌ Usage: skills_manager.py disable SKILL_NAME")
            sys.exit(1)
        disable_skill(sys.argv[2])
    else:
        print(f"❌ Unknown command: {command}")
        print(__doc__)
        sys.exit(1)

if __name__ == "__main__":
    main()
