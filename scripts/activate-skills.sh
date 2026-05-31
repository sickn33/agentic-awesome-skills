#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_BASE_DIR="${HOME:-$PWD}/.agents"
BASE_DIR="${AG_BASE_DIR:-$DEFAULT_BASE_DIR}"
SKILLS_DIR="${AG_SKILLS_DIR:-$BASE_DIR/skills}"
LIBRARY_DIR="${AG_LIBRARY_DIR:-$BASE_DIR/skills_library}"
ARCHIVE_PREFIX="${AG_ARCHIVE_PREFIX:-$BASE_DIR/skills_archive}"
REPO_SKILLS_DIR="${AG_REPO_SKILLS_DIR:-$SCRIPT_DIR/../skills}"
BUNDLE_HELPER="${AG_BUNDLE_HELPER:-$SCRIPT_DIR/../tools/scripts/get-bundle-skills.py}"
PYTHON_BIN="${AG_PYTHON_BIN:-}"
SKILLS_LIST_FILE="$(mktemp "${TMPDIR:-/tmp}/ag-skills.XXXXXX")"

cleanup() {
  rm -f "$SKILLS_LIST_FILE"
}

trap cleanup EXIT

find_copy_dirs() {
  local src_dir="$1"
  local dest_dir="$2"

  mkdir -p "$dest_dir"

  while IFS= read -r -d '' item; do
    if [[ -L "$item" ]] && ! is_safe_dir_symlink "$src_dir" "$item"; then
      echo "  ! Skipping unsafe symlink outside source root: $(basename "$item")"
      continue
    fi
    cp -RP "$item" "$dest_dir/"
  done < <(find "$src_dir" -mindepth 1 -maxdepth 1 \( -type d -o -type l \) -print0 2>/dev/null)
}

find_move_dirs() {
  local src_dir="$1"
  local dest_dir="$2"

  mkdir -p "$dest_dir"

  while IFS= read -r -d '' item; do
    mv "$item" "$dest_dir/"
  done < <(find "$src_dir" -mindepth 1 -maxdepth 1 ! -name '.' ! -name '..' -print0 2>/dev/null)
}

resolve_python() {
  if [[ -n "$PYTHON_BIN" ]]; then
    printf '%s\n' "$PYTHON_BIN"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi

  return 1
}

is_safe_dir_symlink() {
  local root_dir="$1"
  local item="$2"
  local python_path=""

  if ! python_path="$(resolve_python 2>/dev/null)"; then
    return 1
  fi

  "$python_path" - "$root_dir" "$item" <<'PY'
from pathlib import Path
import sys

root_dir = Path(sys.argv[1]).resolve()
item = Path(sys.argv[2])

try:
    target = item.resolve(strict=True)
except FileNotFoundError:
    raise SystemExit(1)

if not target.is_dir():
    raise SystemExit(1)

try:
    target.relative_to(root_dir)
except ValueError:
    raise SystemExit(1)

raise SystemExit(0)
PY
}

is_safe_skill_id() {
  [[ "$1" =~ ^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ ]] && [[ "$1" != *"/."* ]] && [[ "$1" != "." ]] && [[ "$1" != ".." ]]
}

echo "Activating Antigravity skills..."

DO_CLEAR=0
EXTRA_ARGS=()

for arg in "$@"; do
  if [[ "$arg" == "--clear" ]]; then
    DO_CLEAR=1
  else
    EXTRA_ARGS+=("$arg")
  fi
done

if [[ -d "$REPO_SKILLS_DIR" ]]; then
  echo "Syncing library with repository source..."
  find_copy_dirs "$REPO_SKILLS_DIR" "$LIBRARY_DIR"
fi

if [[ ! -d "$LIBRARY_DIR" ]]; then
  echo "Initializing skills library from local state..."
  mkdir -p "$LIBRARY_DIR"

  if [[ -d "$SKILLS_DIR" ]]; then
    echo "  + Moving current skills to library..."
    find_move_dirs "$SKILLS_DIR" "$LIBRARY_DIR"
  fi

  while IFS= read -r archive_dir; do
    [[ -n "$archive_dir" ]] || continue
    echo "  + Merging skills from $(basename "$archive_dir")..."
    find_copy_dirs "$archive_dir" "$LIBRARY_DIR"
  done < <(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d -name 'skills_archive*' | sort)
fi

if [[ "$DO_CLEAR" == "1" ]]; then
  echo "[RESET] Archiving and clearing existing skills..."
  if [[ -d "$SKILLS_DIR" ]]; then
    archive_dir="${ARCHIVE_PREFIX}_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$archive_dir"
    find_move_dirs "$SKILLS_DIR" "$archive_dir"
  fi
else
  echo "[APPEND] Layering new skills onto existing folder..."
fi

mkdir -p "$SKILLS_DIR"

echo "Expanding bundles..."

python_path=""
if python_path="$(resolve_python 2>/dev/null)" && [[ -f "$BUNDLE_HELPER" ]]; then
  if [[ "${#EXTRA_ARGS[@]}" -gt 0 ]]; then
    "$python_path" "$BUNDLE_HELPER" "${EXTRA_ARGS[@]}" >"$SKILLS_LIST_FILE" 2>/dev/null || true
  else
    "$python_path" "$BUNDLE_HELPER" Essentials >"$SKILLS_LIST_FILE" 2>/dev/null || true
  fi
fi

if [[ ! -s "$SKILLS_LIST_FILE" ]]; then
  if [[ "${#EXTRA_ARGS[@]}" -eq 0 ]]; then
    printf '%s\n' brainstorming systematic-debugging test-driven-development >"$SKILLS_LIST_FILE"
  else
    : >"$SKILLS_LIST_FILE"
    for arg in "${EXTRA_ARGS[@]}"; do
      if is_safe_skill_id "$arg"; then
        printf '%s\n' "$arg" >>"$SKILLS_LIST_FILE"
      fi
    done
  fi
fi

echo "Restoring selected skills..."
while IFS= read -r skill_id || [[ -n "$skill_id" ]]; do
  [[ -n "$skill_id" ]] || continue

  if [[ -e "$SKILLS_DIR/$skill_id" ]]; then
    echo "  . $skill_id (already active)"
  elif [[ -e "$LIBRARY_DIR/$skill_id" ]]; then
    echo "  + $skill_id"
    cp -RP "$LIBRARY_DIR/$skill_id" "$SKILLS_DIR/"
  else
    echo "  - $skill_id (not found in library)"
  fi
done <"$SKILLS_LIST_FILE"

echo
echo "Done! Antigravity skills are now activated."
