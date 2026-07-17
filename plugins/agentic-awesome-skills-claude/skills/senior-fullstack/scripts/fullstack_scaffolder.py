#!/usr/bin/env python3
"""Fail-closed compatibility stub for an unimplemented full-stack scaffolder."""

import argparse
import sys
from pathlib import Path


def workspace_path(value: str) -> Path:
    """Resolve an existing path without allowing traversal outside the workspace."""
    root = Path.cwd().resolve()
    target = Path(value).expanduser().resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"target escapes current workspace: {value}") from exc
    if not target.exists():
        raise argparse.ArgumentTypeError(f"target does not exist: {value}")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compatibility stub; full-stack scaffolding is not implemented."
    )
    parser.add_argument("target", type=workspace_path, help="existing path under the current workspace")
    args = parser.parse_args()
    print(
        f"unsupported: no files were generated for {args.target}; follow the SKILL.md planning workflow",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
