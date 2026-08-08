#!/usr/bin/env bash
set -euo pipefail

since_ref="${1:-}"
until_ref="${2:-HEAD}"

if [[ -z "${since_ref}" ]]; then
  if git describe --tags --abbrev=0 >/dev/null 2>&1; then
    since_ref="$(git describe --tags --abbrev=0)"
  fi
fi

range=""
if [[ -n "${since_ref}" ]]; then
  range="${since_ref}..${until_ref}"
else
  range="${until_ref}"
fi

repo_root="$(git rev-parse --show-toplevel)"

printf "Repo: %s\n" "${repo_root}"
if [[ -n "${since_ref}" ]]; then
  printf "Range: %s..%s\n" "${since_ref}" "${until_ref}"
else
  printf "Range: start..%s (no tags found)\n" "${until_ref}"
fi

printf "\n== Commits ==\n"
git log --reverse --date=short --pretty=format:'%h|%ad|%s' ${range}

printf "\n\n== Files Touched ==\n"
git log --reverse --name-only --pretty=format:'--- %h %s' ${range} | sed '/^$/d'
