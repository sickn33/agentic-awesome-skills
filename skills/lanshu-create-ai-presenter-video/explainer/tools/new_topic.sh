#!/usr/bin/env bash
# Start one story in the nine visual styles at once (or in the styles you name) — handy for choosing a style.
# Usage: new_topic.sh <story> [style ...]        → <DEST_ROOT>/<style> for each style
#   The narrative styles (v10-reasoning, v11-casefile, v12-sitcom) shape the script itself, so they are built only
#   when named, from a script written in their arc: new_topic.sh <story> v10-reasoning v11-casefile v12-sitcom
#   DEST_ROOT=./films (default)   JOBS=3 builds styles in parallel   FORCE=1 rebuilds
# Each style is tools/new_film.sh; logs in <DEST_ROOT>/.logs/<style>.log. A style that fails under parallel load (the
# heavy ones run a headless browser pass for their sound log) is retried once on its own.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
STORY="$1"; shift
STYLES=("$@"); [[ ${#STYLES[@]} -gt 0 ]] || STYLES=($(ls "$ROOT/kits" | grep -E '^v[1-9]-'))
DEST_ROOT="${DEST_ROOT:-$PWD/films}"
mkdir -p "$DEST_ROOT/.logs"
build() {
  local s="$1" log="$DEST_ROOT/.logs/$1.log"
  if bash "$ROOT/tools/new_film.sh" "$s" "$STORY" "$DEST_ROOT/$s" > "$log" 2>&1; then
    local verdict; verdict="$(grep -Eo 'Check (passed|failed)' "$log" | tail -1)"
    if [[ -z "$verdict" ]]; then printf '%-14s built (check skipped)\n' "$s"; return; fi
    printf '%-14s %s · lint %s\n' "$s" "$verdict" "$(grep -Eo '[0-9]+ error\(s\), [0-9]+ warning\(s\)' "$log" | head -1)"
  else
    printf '%-14s FAILED — %s\n' "$s" "$log"
  fi
}
export -f build; export ROOT STORY DEST_ROOT
RESULTS="$DEST_ROOT/.logs/results.txt"
printf '%s\n' "${STYLES[@]}" | xargs -P "${JOBS:-1}" -I{} bash -c 'build {}' | tee "$RESULTS"
for s in $(awk '/FAILED|Check failed/ {print $1}' "$RESULTS"); do
  printf '%-14s retrying on its own…\n' "$s"
  FORCE=1 build "$s"
done
