#!/usr/bin/env python3
"""Compatibility stub: this bundled script does not implement architecture analysis."""
import argparse
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", help="Existing directory within the current workspace")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print one JSON result")
    parser.add_argument("--output", "-o", help="New JSON report path inside workspace; never overwritten")
    args = parser.parse_args()
    base = Path.cwd().resolve()
    target = Path(args.target).expanduser().resolve()
    try:
        target.relative_to(base)
        if not target.is_dir():
            raise ValueError("Target must be an existing directory")
        output = Path(args.output).expanduser().resolve() if args.output else None
        if output:
            output.relative_to(base)
        result = {"status": "not_implemented", "analysis_performed": False,
                  "findings": None,
                  "limitations": "No diagram, dependency scan, metrics or automated fixes are implemented."}
        payload = json.dumps(result, indent=2) + "\n"
        if output:
            # Exclusive creation prevents replacing an existing source/report/symlink.
            with output.open("x", encoding="utf-8") as stream:
                stream.write(payload)
        if args.json:
            sys.stdout.write(payload)
        else:
            print(result["limitations"], file=sys.stderr)
        return 2  # incomplete analysis must never be a passing quality gate
    except (OSError, ValueError):
        print("Invalid target/output path or output already exists; no analysis performed.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
