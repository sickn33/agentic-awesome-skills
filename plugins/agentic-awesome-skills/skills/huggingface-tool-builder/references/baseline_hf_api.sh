#!/usr/bin/env bash

set -euo pipefail

show_help() {
    cat << EOF
Ultra-simple Hugging Face API example (Shell)

Usage:
  $0 [limit]
  $0 --help

Description:
  Fetches a small list of models from the HF API and prints raw JSON.
  Uses HF_TOKEN for auth if the environment variable is set.

Examples:
  $0
  $0 5
  HF_TOKEN=your_token $0 10
EOF
}

if [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

LIMIT="${1:-3}"
if ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
    echo "Error: limit must be a number" >&2
    exit 1
fi

headers=()
if [[ -n "${HF_TOKEN:-}" ]]; then
    headers=(-H "Authorization: Bearer ${HF_TOKEN}")
fi

curl -s "${headers[@]}" "https://huggingface.co/api/models?limit=${LIMIT}"
