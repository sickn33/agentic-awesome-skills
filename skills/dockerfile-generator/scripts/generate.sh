#!/usr/bin/env bash
# Portable entry point for the dockerfile-generator skill.
#
# This wrapper validates the local runtime, resolves the project directory, and
# forwards generation flags to the vendored create-dockerfile.sh compatibility
# wrapper. It deliberately stays thin: the upstream wrapper owns detection,
# routing, output names, and exit codes.
set -euo pipefail

SKILL_NAME="dockerfile-generator"
SKILL_VERSION="1.0.0"
UPSTREAM_VERSION="0.1.0"
UPSTREAM_COMMIT="2c0fbaf"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

# Allow an explicit runtime checkout during development. The default is the
# self-contained snapshot that ships with the skill.
if [ -n "${DOCKERFILE_GENERATOR_HOME:-}" ]; then
    if ! GENERATOR_ROOT="$(cd -- "$DOCKERFILE_GENERATOR_HOME" 2>/dev/null && pwd)"; then
        echo "ERROR: DOCKERFILE_GENERATOR_HOME is not a directory: $DOCKERFILE_GENERATOR_HOME" >&2
        exit 1
    fi
else
    GENERATOR_ROOT="$SKILL_DIR/vendor"
fi
GENERATOR="$GENERATOR_ROOT/create-dockerfile.sh"

usage() {
    cat <<'EOF'
dockerfile-generator - generate production Dockerfiles from a project tree

Usage:
  bash scripts/generate.sh [options] [project-dir]

Project selection:
  DIR, --project DIR       Project directory (default: current directory)

Skill options:
  --check-deps             Check required and optional runtime dependencies
  --upstream-help          Show the vendored generator's full help
  -V, --version            Show the skill version
  -h, --help               Show this help

Generator options (forwarded):
  --dry-run                Detect and print without writing files
  --no-dockerfile-2        Write only Dockerfile-1
  --fast                   Skip Docker build and hadolint checks
  --compose                Also write compose.yaml
  --all                    Monorepo: one Dockerfile-1 per app
  --check                  Verify Dockerfile-1 matches detection
  --init                   Write a starter dockerfile.conf
  --config FILE            Use a specific configuration file
  --no-config              Ignore all configuration files
  --validate-config        Validate configuration and stop
  --print-config           Print the resolved configuration as JSON
  --explain KEY            Explain one resolved option
  --                       Forward the remaining arguments as-is

Examples:
  bash scripts/generate.sh --dry-run
  bash scripts/generate.sh --project ~/src/app --no-dockerfile-2 --fast
  bash scripts/generate.sh ~/src/app --compose
  bash scripts/generate.sh --project ~/src/mono --all

Notes:
  * --all cannot be combined with --compose.
  * --dry-run and --check cannot be combined.
  * --no-dockerfile-2 is the fastest path for Dockerfile-1-only work.
  * The wrapper propagates the generator's exit code.
EOF
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

check_required_deps() {
    local ok=1

    if ! command -v python3 >/dev/null 2>&1; then
        echo "[MISSING] python3 (3.10+ required)" >&2
        ok=0
    fi

    local bash_major="${BASH_VERSINFO[0]:-0}"
    local bash_minor="${BASH_VERSINFO[1]:-0}"
    if [ "$bash_major" -lt 4 ] || { [ "$bash_major" -eq 4 ] && [ "$bash_minor" -lt 4 ]; }; then
        echo "[MISSING] bash 4.4+ required (found ${BASH_VERSION:-unknown})" >&2
        ok=0
    fi

    if [ ! -f "$GENERATOR" ]; then
        echo "[MISSING] vendored runtime: $GENERATOR" >&2
        echo "          Set DOCKERFILE_GENERATOR_HOME to an upstream checkout if needed." >&2
        ok=0
    fi

    if command -v python3 >/dev/null 2>&1; then
        local missing
        missing="$(python3 - <<'PY'
import importlib.util

wanted = ("click", "yaml", "jinja2")
print(" ".join(name for name in wanted if importlib.util.find_spec(name) is None))
PY
)"
        if [ -n "$missing" ]; then
            echo "[MISSING] Python packages: $missing" >&2
            echo "          python3 -m pip install -r \"$SKILL_DIR/requirements.txt\"" >&2
            ok=0
        fi
    fi

    if [ "$ok" -eq 1 ]; then
        return 0
    fi
    return 1
}

report_optional_deps() {
    local tool
    for tool in docker hadolint shellcheck git; do
        if command -v "$tool" >/dev/null 2>&1; then
            printf '[optional] %-10s %s\n' "$tool" "$(command -v "$tool")"
        else
            printf '[optional] %-10s missing (skipped)\n' "$tool"
        fi
    done
}

version() {
    printf '%s %s (upstream %s, commit %s)\n' \
        "$SKILL_NAME" "$SKILL_VERSION" "$UPSTREAM_VERSION" "$UPSTREAM_COMMIT"
}

PROJECT=""
PASSTHROUGH=()
CHECK_DEPS_ONLY=0

while [ "$#" -gt 0 ]; do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        -V|--version)
            version
            exit 0
            ;;
        --check-deps)
            CHECK_DEPS_ONLY=1
            shift
            ;;
        --upstream-help)
            [ -f "$GENERATOR" ] || die "vendored runtime missing: $GENERATOR"
            exec bash "$GENERATOR" --help
            ;;
        --project)
            [ "$#" -ge 2 ] || die "--project requires a directory"
            PROJECT="$2"
            shift 2
            ;;
        --project=*)
            PROJECT="${1#*=}"
            [ -n "$PROJECT" ] || die "--project requires a directory"
            shift
            ;;
        --)
            shift
            if [ -z "$PROJECT" ] && [ "$#" -gt 0 ]; then
                case "$1" in
                    -*) ;;
                    *)
                        PROJECT="$1"
                        shift
                        ;;
                esac
            fi
            while [ "$#" -gt 0 ]; do
                PASSTHROUGH+=("$1")
                shift
            done
            ;;
        -*)
            case "$1" in
                --config|--explain)
                    [ "$#" -ge 2 ] || die "$1 requires a value"
                    PASSTHROUGH+=("$1" "$2")
                    shift 2
                    ;;
                *)
                    PASSTHROUGH+=("$1")
                    shift
                    ;;
            esac
            ;;
        *)
            if [ -z "$PROJECT" ]; then
                PROJECT="$1"
            else
                PASSTHROUGH+=("$1")
            fi
            shift
            ;;
    esac
done

if [ "$CHECK_DEPS_ONLY" -eq 1 ]; then
    if check_required_deps; then
        echo "[OK] required dependencies are available"
        report_optional_deps
        exit 0
    fi
    report_optional_deps
    exit 1
fi

PROJECT="${PROJECT:-$PWD}"
[ -d "$PROJECT" ] || die "not a directory: $PROJECT"
PROJECT="$(cd -- "$PROJECT" && pwd)"

if ! check_required_deps; then
    echo "Run 'bash \"$0\" --check-deps' for details." >&2
    exit 1
fi

printf '[dockerfile-generator] project: %s\n' "$PROJECT"
printf '[dockerfile-generator] runtime: %s\n' "$GENERATOR"
printf '[dockerfile-generator] invoking: create-dockerfile.sh'
if [ "${#PASSTHROUGH[@]}" -gt 0 ]; then
    printf ' %q' "${PASSTHROUGH[@]}"
fi
printf ' %q\n' "$PROJECT"

rc=0
if [ "${#PASSTHROUGH[@]}" -gt 0 ]; then
    ( cd -- "$PROJECT" && bash "$GENERATOR" "${PASSTHROUGH[@]}" "$PROJECT" ) || rc=$?
else
    ( cd -- "$PROJECT" && bash "$GENERATOR" "$PROJECT" ) || rc=$?
fi

if [ "$rc" -eq 0 ]; then
    echo "[dockerfile-generator] PASS (exit 0)"
else
    echo "[dockerfile-generator] FAIL (exit $rc)" >&2
fi
exit "$rc"
