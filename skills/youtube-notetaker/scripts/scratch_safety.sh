#!/usr/bin/env bash

# Validate a private scratch directory created by setup.sh.
validate_ytnote_scratch() {
  local requested=${1:?scratch directory required}
  local expected_id=${2:-}
  local temp_root=${TMPDIR:-/tmp}
  local canonical canonical_root base owner mode marker marker_id

  [[ -d "$requested" && ! -L "$requested" ]] || {
    echo "Refusing untrusted scratch directory: $requested" >&2
    return 1
  }
  [[ -d "$temp_root" ]] || {
    echo "Temporary directory does not exist: $temp_root" >&2
    return 1
  }

  canonical=$(cd -- "$requested" && pwd -P)
  canonical_root=$(cd -- "$temp_root" && pwd -P)
  case "$canonical/" in
    "$canonical_root"/*) ;;
    *) echo "Scratch directory is outside the private temporary root" >&2; return 1 ;;
  esac

  base=${canonical##*/}
  [[ "$base" =~ ^ytnote-([A-Za-z0-9_-]{11})\.[A-Za-z0-9]+$ ]] || {
    echo "Scratch directory was not created by setup.sh" >&2
    return 1
  }
  [[ -z "$expected_id" || "${BASH_REMATCH[1]}" == "$expected_id" ]] || {
    echo "Scratch directory does not match YouTube id $expected_id" >&2
    return 1
  }

  if [[ "$(uname -s)" == "Darwin" ]]; then
    owner=$(stat -f '%u' "$canonical")
    mode=$(stat -f '%Lp' "$canonical")
  else
    owner=$(stat -c '%u' "$canonical")
    mode=$(stat -c '%a' "$canonical")
  fi
  [[ "$owner" == "$(id -u)" ]] || {
    echo "Scratch directory is not owned by the current user" >&2
    return 1
  }
  (( (8#$mode & 0022) == 0 )) || {
    echo "Scratch directory must not be writable by group or other users" >&2
    return 1
  }

  marker="$canonical/.aas-youtube-notetaker"
  [[ -f "$marker" && ! -L "$marker" ]] || {
    echo "Scratch directory marker is missing or unsafe" >&2
    return 1
  }
  IFS= read -r marker_id < "$marker"
  [[ "$marker_id" == "${BASH_REMATCH[1]}" ]] || {
    echo "Scratch directory marker does not match its name" >&2
    return 1
  }

  printf '%s\n' "$canonical"
}
