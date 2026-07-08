"""Show the mdbase index or dimension content."""
import sys
from pathlib import Path

from common import find_ustht, safe_markdown_tree, safe_read_text, validate_dim_name

HELP = """Usage: python show_mdbase.py show [--all|--dimension] [--help]

Subcommands:
  show              Show README.ai.md index
  show --all        List all dimensions and entry counts
  show <dimension>  Show one dimension file
"""


def show_index(mdbase: Path):
    index = mdbase / "README.ai.md"
    if not index.exists():
        print("mdbase/README.ai.md does not exist.")
        return
    print(safe_read_text(mdbase.parent, index))


def list_dims(mdbase: Path):
    details = mdbase / "details"
    if not details.exists():
        return []
    return sorted(p.relative_to(details).with_suffix("").as_posix() for p in safe_markdown_tree(mdbase.parent, details))


def show_dim(mdbase: Path, dim: str):
    if not validate_dim_name(dim):
        print(f"Invalid dimension name: {dim}. Use lowercase letters, digits, hyphens, and optional / subdirectories.")
        return
    if dim == "backlog":
        path = mdbase / "backlog.md"
    else:
        path = mdbase / "details" / f"{dim}.md"
    if not path.exists():
        print(f"mdbase/details/{dim}.md does not exist yet.")
        return
    print(safe_read_text(mdbase.parent, path))


def show_all(mdbase: Path):
    details = mdbase / "details"
    if not details.exists():
        print("mdbase/details/ does not exist.")
        return
    dims = list_dims(mdbase)
    if not dims:
        print("mdbase has no dimension files.")
        return
    print(f"mdbase has {len(dims)} dimensions:")
    for dim in dims:
        path = details / f"{dim}.md"
        lines = [line for line in safe_read_text(mdbase.parent, path).splitlines() if line.strip().startswith("- ")]
        print(f"  {dim}.md: {len(lines)} entries")


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    mdbase = ustht / "mdbase"
    if not mdbase.exists():
        print("mdbase is not initialized. Run /ustht init first.")
        return

    args = sys.argv[1:]
    if not args or args[0] != "show":
        print(f"Usage: {sys.argv[0]} show [--all|--dimension]")
        sys.exit(1)

    rest = args[1:]
    if not rest:
        show_index(mdbase)
    elif rest[0] == "--all":
        show_all(mdbase)
    elif rest[0].startswith("--"):
        show_dim(mdbase, rest[0][2:])
    else:
        show_dim(mdbase, rest[0])


if __name__ == "__main__":
    main()
