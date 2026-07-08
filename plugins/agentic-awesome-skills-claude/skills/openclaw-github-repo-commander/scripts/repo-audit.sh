#!/usr/bin/env bash
set -euo pipefail

target="${1:-.}"

if [[ ! -d "$target" ]]; then
  printf 'FAIL target directory does not exist: %s\n' "$target" >&2
  exit 2
fi

cd "$target"
repo_root="$(pwd -P)"

status=0

pass() {
  printf 'PASS %s\n' "$1"
}

warn() {
  printf 'WARN %s\n' "$1"
  status=1
}

has_symlink_component() {
  local candidate="$1"
  local current="."
  local part
  local -a parts

  candidate="${candidate#./}"
  IFS='/' read -r -a parts <<< "$candidate"
  for part in "${parts[@]}"; do
    [[ -z "$part" || "$part" == "." ]] && continue
    current="$current/$part"
    if [[ -L "$current" ]]; then
      return 0
    fi
  done

  return 1
}

if command -v rg >/dev/null 2>&1; then
  if rg --hidden --glob '!.git/**' --glob '!.github/workflows/**' --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' \
    --regexp 'ghp_[A-Za-z0-9_]{20,}' \
    --regexp 'sk-[A-Za-z0-9]{20,}' \
    --regexp 'AKIA[0-9A-Z]{16}' \
    --quiet .; then
    warn 'possible hardcoded secret pattern found'
  else
    pass 'no common secret patterns found'
  fi
else
  warn 'ripgrep not installed; skipped secret-pattern scan'
fi

if find . -path './.git' -prune -o -path './node_modules' -type d -print -quit | grep -q .; then
  warn 'tracked or local node_modules directory present'
else
  pass 'no node_modules directory found outside .git'
fi

if find . -path './.git' -prune -o \( -path './dist' -o -path './build' \) -type d -print -quit | grep -q .; then
  warn 'build artifact directory present'
else
  pass 'no common build artifact directories found'
fi

if find . -path './.git' -prune -o -type f -size +1M -print -quit | grep -q .; then
  warn 'large files over 1MB found'
else
  pass 'no files over 1MB found'
fi

if [[ -f .gitignore ]]; then
  pass '.gitignore exists'
else
  warn '.gitignore missing'
fi

if command -v rg >/dev/null 2>&1 && [[ -f README.md ]]; then
  broken_links=0
  while IFS= read -r link; do
    [[ "$link" =~ ^https?:// ]] && continue
    [[ "$link" =~ ^# ]] && continue
    [[ "$link" =~ ^mailto: ]] && continue
    link="${link%%#*}"
    [[ -z "$link" ]] && continue
    if [[ "$link" = /* || "/$link/" == *"/../"* ]]; then
      broken_links=1
      printf 'WARN README local link escapes repository: %s\n' "$link"
      continue
    fi
    if has_symlink_component "$link"; then
      broken_links=1
      printf 'WARN README local link escapes repository: %s\n' "$link"
      continue
    fi
    if [[ ! -e "$link" ]]; then
      parent_dir="$(dirname -- "$link")"
      if [[ -d "$parent_dir" ]]; then
        resolved_parent="$(cd "$parent_dir" && pwd -P)"
        case "$resolved_parent/" in
          "$repo_root"/* | "$repo_root/" ) ;;
          * )
            broken_links=1
            printf 'WARN README local link escapes repository: %s\n' "$link"
            continue
            ;;
        esac
      fi
      broken_links=1
      printf 'WARN broken README local link: %s\n' "$link"
    fi
  done < <(rg -o '\[[^]]+\]\(([^)]+)\)' README.md | sed -E 's/.*\(([^)]+)\)/\1/')

  if [[ "$broken_links" -eq 0 ]]; then
    pass 'README local links look resolvable'
  else
    status=1
  fi
else
  warn 'README.md or ripgrep missing; skipped README link scan'
fi

exit "$status"
