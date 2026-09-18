#!/bin/sh
set -eu

die() {
  printf 'using-lwc bootstrap: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 ||
    die "required command not found: $1"
}

json_escape() {
  printf '%s' "$1" |
    awk 'BEGIN { first = 1 }
      {
        if (!first) printf "\\n"
        first = 0
        gsub(/\\/, "\\\\")
        gsub(/"/, "\\\"")
        gsub(/\t/, "\\t")
        gsub(/\r/, "\\r")
        gsub(/\f/, "\\f")
        gsub(/\b/, "\\b")
        printf "%s", $0
      }'
}

supported_lwc_version() {
  version_core="${1#lwc }"
  version_core="${version_core%%[-+]*}"
  old_ifs="$IFS"
  IFS=.
  set -- $version_core
  IFS="$old_ifs"
  [ "$#" -eq 3 ] || return 1
  case "$1$2$3" in *[!0-9]*|'') return 1 ;; esac

  [ "$1" -gt 0 ] || [ "$2" -ge 6 ]
}

# Version and capability probes prevent this Skill from driving an older CLI.
usable_lwc() {
  candidate="$1"
  candidate_version="$("$candidate" --version 2>/dev/null || true)"
  printf '%s\n' "$candidate_version" |
    grep -Eq '^lwc [0-9]+\.[0-9]+\.[0-9]+' || return 1
  supported_lwc_version "$candidate_version" || return 1
  "$candidate" init --help 2>&1 | grep -q -- '--scope' || return 1
  "$candidate" --help 2>&1 | grep -q -- 'LWC_PROJECT_ROOT' || return 1
  "$candidate" --help 2>&1 | grep -q -- '--changeset' || return 1
  "$candidate" checkpoint --help >/dev/null 2>&1 || return 1
  "$candidate" source add-manifest --help >/dev/null 2>&1 || return 1
  "$candidate" source status --help >/dev/null 2>&1 || return 1
  "$candidate" source diff --help >/dev/null 2>&1 || return 1
  "$candidate" changeset --help >/dev/null 2>&1 || return 1
  "$candidate" page put --help 2>&1 | grep -q -- '--provenance' || return 1
}

managed_lwc_path() {
  for candidate in \
    "$home_dir/.local/bin/lwc" \
    "$home_dir/.local/bin/lwc.exe"; do
    if [ -x "$candidate" ] && usable_lwc "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

add_evidence() {
  if [ -n "$project_evidence" ]; then
    project_evidence="${project_evidence},$1"
  else
    project_evidence="$1"
  fi
}

is_excluded_root() {
  if [ -n "${tmp_dir:-}" ]; then
    case "$1" in
      "$tmp_dir"|"$tmp_dir/"*) return 0 ;;
    esac
  fi

  case "$1" in
    /|/tmp|/tmp/*|/private/tmp|/private/tmp/*|\
    /var/tmp|/var/tmp/*|/private/var/tmp|/private/var/tmp/*|\
    "$home_dir"|\
    "$home_dir/Downloads"|"$home_dir/Downloads/"*|\
    "$home_dir/Desktop"|"$home_dir/Desktop/"*|\
    "$home_dir/.cache"|"$home_dir/.cache/"*|\
    "$home_dir/Library/Caches"|"$home_dir/Library/Caches/"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

: "${HOME:?using-lwc bootstrap: HOME is not set}"
need dirname
need awk
need grep

skill_dir="$(
  CDPATH= cd "$(dirname "$0")/.." >/dev/null 2>&1
  pwd -P
)"
purpose_file="$skill_dir/assets/global-purpose.md"
schema_file="$skill_dir/assets/global-schema.md"
installer="$skill_dir/scripts/install-lwc.sh"
[ -f "$purpose_file" ] || die "missing $purpose_file"
[ -f "$schema_file" ] || die "missing $schema_file"
[ -f "$installer" ] || die "missing $installer"

home_dir="$(
  CDPATH= cd "$HOME" >/dev/null 2>&1
  pwd -P
)" || die "cannot resolve HOME"
cwd="$(pwd -P)"
project_boundary=""
if [ -n "${LWC_PROJECT_ROOT:-}" ]; then
  [ -d "$LWC_PROJECT_ROOT" ] ||
    die "LWC_PROJECT_ROOT is not a directory: $LWC_PROJECT_ROOT"
  project_boundary="$(
    CDPATH= cd "$LWC_PROJECT_ROOT" >/dev/null 2>&1
    pwd -P
  )" || die "cannot resolve LWC_PROJECT_ROOT"
  case "$cwd" in
    "$project_boundary"|"$project_boundary/"*) ;;
    *) die "current directory is outside LWC_PROJECT_ROOT: $project_boundary" ;;
  esac
fi
tmp_dir=""
if [ -d "${TMPDIR:-/tmp}" ]; then
  tmp_dir="$(
    CDPATH= cd "${TMPDIR:-/tmp}" >/dev/null 2>&1
    pwd -P
  )"
fi
if [ -n "$project_boundary" ] && is_excluded_root "$project_boundary"; then
  die "LWC_PROJECT_ROOT is not a safe project root: $project_boundary"
fi

installed=false
global_initialized_now=false
suggest_global_init=false

case "${LWC_AUTO_INSTALL:-0}" in
  0|1) ;;
  *) die "LWC_AUTO_INSTALL must be 0 or 1" ;;
esac
case "${LWC_GLOBAL_INIT:-0}" in
  0|1) ;;
  *) die "LWC_GLOBAL_INIT must be 0 or 1" ;;
esac

lwc_path="$(command -v lwc 2>/dev/null || true)"
if [ -z "$lwc_path" ] || ! usable_lwc "$lwc_path"; then
  managed_path="$(managed_lwc_path || true)"
  if [ -n "$managed_path" ]; then
    die "lwc is not on PATH; add $(dirname "$managed_path") to PATH and start a new Agent session"
  fi
  lwc_path=""
fi
if [ -z "$lwc_path" ]; then
  [ "${LWC_AUTO_INSTALL:-0}" = 1 ] ||
    die "compatible lwc not found; obtain explicit approval, then retry once with LWC_AUTO_INSTALL=1"
  LWC_INSTALL_DIR="$home_dir/.local/bin" sh "$installer" >&2 ||
    die "lwc installation failed"
  lwc_path="$(command -v lwc 2>/dev/null || true)"
  if [ -z "$lwc_path" ] || ! usable_lwc "$lwc_path"; then
    managed_path="$(managed_lwc_path || true)"
    [ -z "$managed_path" ] ||
      die "lwc is not on PATH; add $(dirname "$managed_path") to PATH and start a new Agent session"
    die "installed lwc failed its compatibility check"
  fi
  installed=true
fi

lwc_version="$("$lwc_path" --version)"
global_wiki="$home_dir/.lwc/wiki.db"
global_policy_state="$home_dir/.lwc/.using-lwc-bootstrap-v1"
apply_global_policy=false
if [ ! -f "$global_wiki" ]; then
  if [ "${LWC_GLOBAL_INIT:-0}" = 1 ]; then
    mkdir -p "$(dirname "$global_wiki")" ||
      die "cannot create global memory directory"
    printf 'pending\n' > "$global_policy_state" ||
      die "cannot record global initialization state"
    "$lwc_path" --scope global init >/dev/null ||
      die "failed to initialize global memory"
    [ -f "$global_wiki" ] || die "global initialization did not create $global_wiki"
    apply_global_policy=true
  else
    suggest_global_init=true
  fi
elif [ -f "$global_policy_state" ] &&
  grep -qx 'pending' "$global_policy_state"; then
  if [ "${LWC_GLOBAL_INIT:-0}" = 1 ]; then
    apply_global_policy=true
  else
    suggest_global_init=true
  fi
fi

if [ "$apply_global_policy" = true ]; then
  "$lwc_path" --scope global purpose set "$purpose_file" >/dev/null ||
    die "failed to set global memory purpose"
  "$lwc_path" --scope global schema set "$schema_file" >/dev/null ||
    die "failed to set global memory schema"
  printf 'complete\n' > "$global_policy_state" ||
    die "cannot complete global initialization state"
  global_initialized_now=true
fi
global_initialized=false
[ -f "$global_wiki" ] && global_initialized=true

project_wiki=""
project_root=""
project_confidence="none"
project_evidence=""
suggest_project_init=false
scope_conflict=false
project_wiki_count=0

cursor="$cwd"
while :; do
  if [ "$cursor" = "$home_dir" ]; then
    break
  fi
  if [ -f "$cursor/.lwc/wiki.db" ]; then
    project_wiki_count=$((project_wiki_count + 1))
    if [ "$project_wiki_count" -eq 1 ]; then
      project_wiki="$cursor/.lwc/wiki.db"
      project_root="$cursor"
    fi
    if [ -z "$project_boundary" ]; then
      break
    fi
  fi
  if [ -n "$project_boundary" ] && [ "$cursor" = "$project_boundary" ]; then
    break
  fi
  parent="$(dirname "$cursor")"
  [ "$parent" != "$cursor" ] || break
  cursor="$parent"
done

if [ "$project_wiki_count" -gt 1 ]; then
  project_wiki=""
  project_root="$project_boundary"
  project_confidence="conflict"
  project_evidence="multiple .lwc/wiki.db ancestors"
  scope_conflict=true
elif [ "$project_wiki_count" -eq 1 ]; then
  project_confidence="existing"
  project_evidence=".lwc/wiki.db"
elif [ -z "$project_wiki" ]; then
  weak_root=""
  weak_evidence=""
  cursor="$cwd"
  while :; do
    if [ "$cursor" = "$home_dir" ]; then
      break
    fi

    if ! is_excluded_root "$cursor"; then
      project_evidence=""
      strong=false

      if [ -e "$cursor/.git" ]; then
        add_evidence ".git"
        strong=true
      fi

      for marker in \
        Cargo.toml package.json pyproject.toml go.mod pom.xml \
        build.gradle build.gradle.kts Gemfile composer.json; do
        if [ -f "$cursor/$marker" ]; then
          add_evidence "$marker"
          strong=true
        fi
      done

      for marker_path in "$cursor"/*.sln "$cursor"/*.xcodeproj; do
        if [ -e "$marker_path" ]; then
          add_evidence "$(basename "$marker_path")"
          strong=true
        fi
      done

      if [ "$strong" = true ]; then
        project_root="$cursor"
        project_confidence="strong"
        suggest_project_init=true
        break
      fi

      readme=""
      for readme_name in README.md README README.txt README.rst; do
        if [ -f "$cursor/$readme_name" ]; then
          readme="$readme_name"
          break
        fi
      done
      if [ -n "$readme" ]; then
        for content_dir in src docs tests; do
          if [ -d "$cursor/$content_dir" ]; then
            if [ -z "$weak_root" ]; then
              weak_root="$cursor"
              weak_evidence="${readme},${content_dir}/"
            fi
            break
          fi
        done
      fi
    fi

    if [ -n "$project_boundary" ] && [ "$cursor" = "$project_boundary" ]; then
      break
    fi
    parent="$(dirname "$cursor")"
    [ "$parent" != "$cursor" ] || break
    cursor="$parent"
  done

  if [ -z "$project_root" ] && [ -n "$project_boundary" ]; then
    project_root="$project_boundary"
    project_confidence="authorized"
    project_evidence="LWC_PROJECT_ROOT"
    suggest_project_init=true
  elif [ -z "$project_root" ] && [ -n "$weak_root" ]; then
    project_root="$weak_root"
    project_confidence="weak"
    project_evidence="$weak_evidence"
  fi
fi

printf '{'
printf '"lwc_path":"%s",' "$(json_escape "$lwc_path")"
printf '"lwc_version":"%s",' "$(json_escape "$lwc_version")"
printf '"installed":%s,' "$installed"
printf '"global_wiki":"%s",' "$(json_escape "$global_wiki")"
printf '"global_initialized":%s,' "$global_initialized"
printf '"global_initialized_now":%s,' "$global_initialized_now"
printf '"suggest_global_init":%s,' "$suggest_global_init"
printf '"project_boundary":"%s",' "$(json_escape "$project_boundary")"
printf '"project_wiki":"%s",' "$(json_escape "$project_wiki")"
printf '"project_root":"%s",' "$(json_escape "$project_root")"
printf '"project_confidence":"%s",' "$(json_escape "$project_confidence")"
printf '"project_evidence":"%s",' "$(json_escape "$project_evidence")"
printf '"suggest_project_init":%s,' "$suggest_project_init"
printf '"scope_conflict":%s' "$scope_conflict"
printf '}\n'
