#!/usr/bin/env python3
"""
Ultra-simple Hugging Face API example (Python).

Fetches a small list of models from the HF API and prints raw JSON.
Uses HF_TOKEN for auth if the environment variable is set.
"""

from __future__ import annotations

import os
import sys
import urllib.request


def show_help() -> None:
    print(
        """Ultra-simple Hugging Face API example (Python)

Usage:
  baseline_hf_api.py [limit]
  baseline_hf_api.py --help

Description:
  Fetches a small list of models from the HF API and prints raw JSON.
  Uses HF_TOKEN for auth if the environment variable is set.

Examples:
  baseline_hf_api.py
  baseline_hf_api.py 5
  HF_TOKEN=your_token baseline_hf_api.py 10
"""
    )


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        show_help()
        return 0

    limit = sys.argv[1] if len(sys.argv) > 1 else "3"
    if not limit.isdigit():
        print("Error: limit must be a number", file=sys.stderr)
        return 1

    token = os.getenv("HF_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    url = f"https://huggingface.co/api/models?limit={limit}"

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        sys.stdout.write(resp.read().decode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
