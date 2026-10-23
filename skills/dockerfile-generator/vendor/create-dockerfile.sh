#!/bin/bash
# CREATE-DOCKERFILE.SH — Universal Dockerfile Generator (compatibility wrapper)
# Supports: Python, Go, Node.js, Rust, Java, Ruby, C#, PHP, Kotlin, Swift, Scala, Elixir, Clojure, Haskell
# Usage: ./create-dockerfile.sh [DIR] [--dry-run] [--no-dockerfile-2] [--all]
#        [--init] [--compose] [--fast] [--check] [--help]
# Tests: ./all/dockerfile-tests/run-all.sh (306 cases)
#
# This file only routes. The historical Bash renderer moved, unchanged, to
# legacy/create-dockerfile-legacy.sh and still owns every language that has no
# certified Python plugin. Flags, paths, output text and exit codes are the
# ones users already depend on, because the legacy renderer still runs them.
#
# Routing rules:
#   * Dockerfile-1-only runs (--no-dockerfile-2, no --compose/--check/--all)
#     go to a registered Python plugin when one claims the project
#   * Dockerfile-2, --compose, --check, --all, --help, and any router problem
#     go straight to the legacy Bash renderer, which still owns those modes
# The router is advisory: a missing/failing Python must never stop generation.
set -eu

PROJECT_TITLE="Docker File Generator"
PROJECT_SUBTITLE="Language Support - Complete command reference for 15 supported languages and targets"
AUTHOR_NAME="Mohamed Rafaa TOUNEKTI"
AUTHOR_ROLE="DevOps & DevSecOps Engineer"
AUTHOR_LINKEDIN="linkedin.com/in/mohamed-rafaa-tounekti"
AUTHOR_EMAIL="rafaabou@gmail.com"
AUTHOR_GITHUB="github.com/rafaabou"
AUTHOR_YEAR="2026"

# Absolute paths first: generation cds into project directories, and --all
# re-invokes this wrapper from a child directory.
case "${BASH_SOURCE[0]}" in /*) WRAPPER="${BASH_SOURCE[0]}";; *) WRAPPER="$PWD/${BASH_SOURCE[0]}";; esac
WRAPPER_DIR="$(cd "$(dirname "$WRAPPER")" && pwd)"
LEGACY="$WRAPPER_DIR/legacy/create-dockerfile-legacy.sh"
PYTHON_ROOT="$WRAPPER_DIR"

# Last positional argument is the project directory; flags and the values of
# --config/--explain are passed through.
TARGET_DIR=""
TARGET_INDEX=-1
WANT_HELP=0
DRY_RUN=0
CHECK_MODE=0
WANT_ALL=0
WANT_COMPOSE=0
NO_DOCKERFILE_2=0
_arg_index=0
_expect_value=0
for _arg in "$@"; do
    if [ "$_expect_value" = "1" ]; then
        _expect_value=0
        _arg_index=$((_arg_index + 1))
        continue
    fi
    case "$_arg" in
        --config|--explain) _expect_value=1 ;;
        --help|-h) WANT_HELP=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --check) CHECK_MODE=1 ;;
        --no-dockerfile-2) NO_DOCKERFILE_2=1 ;;
        --init) ;;
        --compose) WANT_COMPOSE=1 ;;
        --all) WANT_ALL=1 ;;
        --fast) ;;
        -*) ;;
        *) TARGET_DIR="$_arg"; TARGET_INDEX=$_arg_index ;;
    esac
    _arg_index=$((_arg_index + 1))
done
PROJECT_DIR="${TARGET_DIR:-$PWD}"

# ---------- input validation (legacy contract) ----------
# These checks run BEFORE routing: an invalid override must fail with the same
# message and exit code whether the project is served by a Python plugin or by
# the Bash renderer. EXTRA_DIRECTIVES is allowlisted here too, so a bad line
# exits before a single file is written.
if [ -n "$TARGET_DIR" ]; then
    if [ ! -d "$TARGET_DIR" ]; then echo "ERROR: not a directory: $TARGET_DIR" >&2; exit 1; fi
    _target_abs="$(cd "$TARGET_DIR" && pwd)" || exit 1
    if [ "$TARGET_INDEX" -ge 0 ]; then
        _new_args=()
        _arg_index=0
        _expect_config=0
        for _arg in "$@"; do
            if [ "$_arg_index" -eq "$TARGET_INDEX" ]; then
                _new_args+=("$_target_abs")
            elif [ "$_expect_config" = "1" ]; then
                case "$_arg" in
                    /*) _new_args+=("$_arg") ;;
                    *) _new_args+=("$PWD/$_arg") ;;
                esac
                _expect_config=0
            elif [ "$_arg" = "--config" ]; then
                _new_args+=("$_arg")
                _expect_config=1
            else
                case "$_arg" in
                    --config=?*)
                        _cfg="${_arg#--config=}"
                        case "$_cfg" in
                            /*) _new_args+=("--config=$_cfg") ;;
                            *) _new_args+=("--config=$PWD/$_cfg") ;;
                        esac
                        ;;
                    *) _new_args+=("$_arg") ;;
                esac
            fi
            _arg_index=$((_arg_index + 1))
        done
        set -- "${_new_args[@]}"
    fi
    TARGET_DIR="$_target_abs"
    cd "$TARGET_DIR" || exit 1
    PROJECT_DIR="$PWD"
fi
if [ "$WANT_ALL" = "1" ] && [ "$WANT_COMPOSE" = "1" ]; then
    echo "ERROR: --all cannot be combined with --compose; run --compose separately in each app directory" >&2
    exit 1
fi
if [ "$DRY_RUN" = "1" ] && [ "$CHECK_MODE" = "1" ]; then
    echo "ERROR: --dry-run and --check cannot be used together" >&2
    exit 1
fi
COMPOSE_BIND="${COMPOSE_BIND:-127.0.0.1}"
case "$COMPOSE_BIND" in
    127.0.0.1|0.0.0.0|::1|::) ;;
    *) echo "ERROR: COMPOSE_BIND must be 127.0.0.1, 0.0.0.0, ::1, or ::" >&2; exit 1 ;;
esac
if [ -n "${PORT:-}" ]; then
    case "$PORT" in
        ''|*[!0-9]*) echo "ERROR: PORT must be an integer from 1 to 65535" >&2; exit 1 ;;
    esac
    if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        echo "ERROR: PORT must be an integer from 1 to 65535" >&2
        exit 1
    fi
fi
if [ -n "${HEALTH:-}" ]; then
    case "$HEALTH" in
        /*) ;;
        *) echo "ERROR: HEALTH must start with /" >&2; exit 1 ;;
    esac
    case "$HEALTH" in
        *[!A-Za-z0-9/_-]*) echo "ERROR: HEALTH contains unsupported characters" >&2; exit 1 ;;
    esac
fi
if [ -n "${STOPSIGNAL:-}" ]; then
    case "$STOPSIGNAL" in
        SIG[A-Z]*|[0-9]*) ;;
        *) echo "ERROR: bad STOPSIGNAL '$STOPSIGNAL' (want SIGxxx or number)" >&2; exit 1 ;;
    esac
fi
if [ -n "${EXTRA_DIRECTIVES:-}" ]; then
    while IFS= read -r _dl; do
        _dt=$(printf '%s' "$_dl" | sed -E 's/^[[:space:]]+//')
        [ -z "$_dt" ] && continue
        case "$_dt" in \#*) continue;; esac
        _dw=$(printf '%s' "$_dt" | awk '{print $1}')
        case "$_dw" in
            ADD|ONBUILD|SHELL|STOPSIGNAL|LABEL|ENV|ARG|EXPOSE|VOLUME|WORKDIR|USER|HEALTHCHECK) ;;
            FROM|RUN|COPY|CMD|ENTRYPOINT)
                echo "ERROR: EXTRA_DIRECTIVES line has a dedicated path: '$_dl' (use dockerfile.conf/EXTRA_COPY/EXTRA_RUN or let detection emit it)" >&2
                exit 1 ;;
            *)
                echo "ERROR: EXTRA_DIRECTIVES rejects unknown directive: '$_dt'" >&2
                exit 1 ;;
        esac
    done <<EXTRA_EOF
$EXTRA_DIRECTIVES
EXTRA_EOF
fi

# --help keeps the historical help text: the wrapper documents the Bash-era
# flags, and users' muscle memory (and docs) depend on that exact output.
if [ "$WANT_HELP" = "1" ]; then
    if [ ! -f "$LEGACY" ]; then
        echo "ERROR: legacy renderer missing: $LEGACY" >&2
        exit 1
    fi
    exec bash "$LEGACY" "$@"
fi

router() {
    # Prints "python" or "legacy"; any failure prints "legacy".
    local out
    if ! command -v python3 >/dev/null 2>&1; then
        echo "legacy"
        return 0
    fi
    if out="$(cd "$PROJECT_DIR" 2>/dev/null && PYTHONPATH="$PYTHON_ROOT" python3 -m docker_file_generator route 2>/dev/null)"; then
        case "$out" in
            python) echo "python" ;;
            *) echo "legacy" ;;
        esac
    else
        echo "legacy"
    fi
}

# Dockerfile-2 is produced by default, and the Python plugins render
# Dockerfile-1 only. Send every Bash-owned mode straight to the legacy
# renderer instead of running Python just to fall back to Bash.
if [ "$NO_DOCKERFILE_2" = "1" ] && [ "$WANT_COMPOSE" = "0" ] && [ "$CHECK_MODE" = "0" ] && [ "$WANT_ALL" = "0" ]; then
    ROUTE="$(router)"
else
    ROUTE="legacy"
fi

if [ "$ROUTE" = "python" ]; then
    # Translation of the historical flags to the Click CLI.
    _py_args=()
    for _arg in "$@"; do
        case "$_arg" in
            --dry-run) _py_args+=("--dry-run") ;;
            --check) _py_args+=("--check") ;;
            --no-dockerfile-2) _py_args+=("--no-dockerfile-2") ;;
            --init) _py_args+=("--init") ;;
            --compose) _py_args+=("--compose") ;;
            --fast) _py_args+=("--fast") ;;
            --all) _py_args+=("--all") ;;
            --help|-h) _py_args+=("--help") ;;
            *) _py_args+=("$_arg") ;;
        esac
    done
    # `|| _py_rc=$?` instead of a bare call: under `set -e` a failing compound
    # command would exit the wrapper before the fallback could run.
    _py_rc=0
    ( cd "$PROJECT_DIR" && PYTHONPATH="$PYTHON_ROOT" python3 -m docker_file_generator generate "${_py_args[@]}" ) || _py_rc=$?
    if [ "$_py_rc" != "20" ]; then
        exit "$_py_rc"
    fi
    # 20 = the plugin cannot serve this run (unmigrated feature or a plugin
    # failure). The note is already on stderr; continue with the Bash renderer
    # so the user always gets a Dockerfile.
fi

if [ ! -f "$LEGACY" ]; then
    echo "ERROR: legacy renderer missing: $LEGACY" >&2
    exit 1
fi
# DFG_WRAPPER lets the legacy renderer's --all mode re-enter this wrapper so
# every app is routed on its own instead of inheriting the parent's renderer.
exec env DFG_WRAPPER="$WRAPPER" bash "$LEGACY" "$@"