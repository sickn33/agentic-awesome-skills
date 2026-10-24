#!/bin/bash
set -euo pipefail

# This script helps initialize the ideas directory for the idea-refine skill.

IDEAS_DIR="docs/ideas"

if [ -L docs ] || [ -L "$IDEAS_DIR" ]; then
  echo "Refusing symlink ideas directory" >&2
  exit 1
fi

if [ ! -d "$IDEAS_DIR" ]; then
  mkdir -p "$IDEAS_DIR"
  echo "Created directory: $IDEAS_DIR" >&2
else
  echo "Directory already exists: $IDEAS_DIR" >&2
fi

echo "{\"status\": \"ready\", \"directory\": \"$IDEAS_DIR\"}"
