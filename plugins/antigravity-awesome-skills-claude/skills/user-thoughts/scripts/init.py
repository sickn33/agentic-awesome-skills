"""Initialize the .ustht/ runtime directory from templates."""
import shutil
import sys
from pathlib import Path

from common import find_skill_dir

HELP = """Usage: python init.py [--help]

Create .ustht/ in the current working directory, copy the runtime templates,
and create raw/, ignored/, and export/ directories. Existing .ustht/ content is
not overwritten.
"""


def copy_template(src: Path, dst: Path):
    """Copy template files while skipping symlinks."""
    for item in src.rglob("*"):
        rel = item.relative_to(src)
        target = dst / rel
        if item.is_symlink():
            continue
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    target = Path.cwd() / ".ustht"
    if target.exists():
        print("Already initialized; .ustht/ exists, skipping creation.")
        sys.exit(0)

    skill_dir = find_skill_dir()
    if skill_dir is None:
        print("Error: SKILL.md was not found. Ensure this script is inside user-thoughts/scripts/.")
        sys.exit(1)

    template = skill_dir / "assets" / "Runtime-Template"
    if not template.exists():
        print(f"Error: template directory does not exist: {template}")
        sys.exit(1)

    target.mkdir()
    copy_template(template, target)
    for name in ["raw", "ignored", "export"]:
        (target / name).mkdir(exist_ok=True)

    define = target / "define.ini"
    if not define.exists():
        define.write_text("SKILL_STATUS=on\nINSTANT_STATUS=off\nLAST_SORTIN=\n", encoding="utf-8")

    print("Initialized .ustht/.")


if __name__ == "__main__":
    main()
