#!/usr/bin/env python3
"""Fail-closed compatibility stub for unimplemented code-quality analysis."""

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
        description="Compatibility stub; automated code-quality analysis is not implemented."
    )
    parser.add_argument("target", type=workspace_path, help="existing path under the current workspace")
    args = parser.parse_args()
    print(
        f"unsupported: no quality findings were produced for {args.target}; run the project's configured checks",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
