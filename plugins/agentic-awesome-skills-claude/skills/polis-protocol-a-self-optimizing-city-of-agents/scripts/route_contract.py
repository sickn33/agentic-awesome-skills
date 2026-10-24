#!/usr/bin/env python3
"""Compatibility notice for an upstream router package not bundled in this skill.

Modified in the local catalog review: do not import a project-local or implicitly
installed polis package. No recommendation or stats update is performed here.
"""
import sys


def main():
    print("The upstream polis/routing.py implementation is not bundled. Use the documented manual routing method, or separately review and authorize a pinned upstream polis-protocol installation. No files were changed.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
