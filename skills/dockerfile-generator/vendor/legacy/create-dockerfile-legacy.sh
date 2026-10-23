#!/bin/bash
# CREATE-DOCKERFILE-LEGACY.SH — Universal Dockerfile Generator (legacy renderer)
# Reached through the create-dockerfile.sh compatibility wrapper; run it
# directly only to bypass routing. Flags, paths, output and exit codes are
# identical to the historical entrypoint.
# Supports: Python, Go, Node.js, Rust, Java, Ruby, C#, PHP, Kotlin, Swift, Scala, Elixir, Clojure, Haskell
# Usage: ./create-dockerfile.sh [DIR] [--dry-run] [--no-dockerfile-2] [--all]
#        [--init] [--compose] [--fast] [--check] [--help]
# Tests: ./all/dockerfile-tests/run-all.sh (306 cases)

# Note: NO pipefail - the script relies on 'grep ... | head -1' returning
# empty (not fatal) when nothing matches. pipefail would kill it (bug found in testing).
set -eu
PROJECT_TITLE="Docker File Generator"
PROJECT_SUBTITLE="Language Support - Complete command reference for 15 supported languages and targets"
AUTHOR_NAME="Mohamed Rafaa TOUNEKTI"
AUTHOR_ROLE="DevOps & DevSecOps Engineer"
AUTHOR_LINKEDIN="linkedin.com/in/mohamed-rafaa-tounekti"
AUTHOR_EMAIL="rafaabou@gmail.com"
AUTHOR_GITHUB="github.com/rafaabou"
AUTHOR_YEAR="2026"
SUPPORTED_TARGETS="Python, Go, Node.js, Rust, Java, Kotlin, Ruby, C#, PHP, Swift, Scala, Elixir, Clojure, Haskell, SPA frameworks (Vue, Vite, React-style)"
print_identity() {
    printf '%s\n' "$PROJECT_TITLE" "$PROJECT_SUBTITLE" "At a glance — 15 supported languages and targets: $SUPPORTED_TARGETS" "$AUTHOR_NAME" "$AUTHOR_ROLE" "LinkedIn: https://$AUTHOR_LINKEDIN" "Email: $AUTHOR_EMAIL" "GitHub: https://$AUTHOR_GITHUB" "$AUTHOR_YEAR"
}
print_identity
shopt -s nullglob 2>/dev/null || true

# ---------- portable helpers (no grep -P, no ls-glob crashes) ----------
# has_files PATTERN... : true if any glob matches a file
has_files() {
    local pat f
    for pat in "$@"; do
        for f in $pat; do
            [ -e "$f" ] && return 0
        done
    done
    return 1
}

# pcre NAME= VALUE FILE : portable 'name = "value"' extractor for toml/cabal
kv_value() {
    sed -nE "s/^$1[[:space:]]*=[[:space:]]*\"([^\"]+)\".*/\\1/p" "$2" 2>/dev/null | head -1
}

# xml_tag TAG FILE : portable <tag>value</tag> extractor
xml_value() {
    sed -nE "s/.*<$1>([^<]+)<\/$1>.*/\\1/p" "$2" 2>/dev/null | head -1
}

# port_from TEXT : first KNOWN service port in text, else empty (caller defaults).
# Whitelist-only on purpose: free guessing grabs junk (error codes, ASN1, etc).
# Data ports (5432 postgres, 6379 redis, 27017 mongo) are excluded on purpose:
# they belong to backing services (see compose.yaml), never to EXPOSE.
port_from() {
    printf '%s\n' "$1" | grep -oE '(^|[^0-9])([0-9]{2,5})([^0-9]|$)' | grep -oE '[0-9]{2,5}' | grep -E '^(3000|3001|3333|4000|4001|4567|5000|5001|8000|8080|8501|9000|9001|9292)$' | head -1 || true
}

ALPINE_VER="3.24.1"
RUST_VER="1.89-alpine"
# bug-050 jar selection: builds often leave 2+ jars (Spring *.jar.original,
# Gradle *-plain.jar, -sources/-javadoc). Newest-first minus those, cp to a
# fixed name; the [ -n ] guard fails the build loudly when none match.
# \$ escapes keep every $ for the image build - values pass through the
# unquoted heredocs below verbatim, never expanding here.
JAR_SELECT_MVN="JAR=\$(ls -t /app/target/*.jar 2>/dev/null | grep -vE '\\.original\$|-sources\\.jar|-javadoc\\.jar' | head -1); [ -n \"\$JAR\" ] && cp \"\$JAR\" /app/app.jar"
JAR_SELECT_GRADLE="JAR=\$(ls -t /app/build/libs/*.jar 2>/dev/null | grep -vE -e '-plain\\.jar\$|-sources\\.jar|-javadoc\\.jar' | head -1); [ -n \"\$JAR\" ] && cp \"\$JAR\" /app/app.jar"
# I3: JVM apps start slowly (Spring: 30-60s) - healthcheck grace period
HEALTH_START="10s"
DATA_DIRS=""
VOLUME_LINE=""

# ---------- D2a: read the project's own version files (else defaults) ----------
# rust-toolchain.toml -> RUST_VER | .nvmrc -> NODE_IMAGE | .python-version -> PY_IMAGE
detect_tool_versions() {
    if [ -f "rust-toolchain.toml" ]; then
        _ch=$(sed -nE 's/^channel[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' rust-toolchain.toml | head -1)
        case "$_ch" in [0-9]*.[0-9]*)
            RUST_VER="$(echo "$_ch" | sed -E 's/^([0-9]+\.[0-9]+).*/\1/')-alpine" ;;
        esac
    fi
    NODE_IMAGE="node:20-alpine"
    NODE_PINNED=""
    if [ -f ".nvmrc" ]; then
        _nv=$(tr -d 'v[:space:]' < .nvmrc | sed -E 's/^([0-9]+).*/\1/')
        case "$_nv" in [0-9]*) NODE_IMAGE="node:${_nv}-alpine"; NODE_PINNED=1;; esac
        # lts/* codenames (nvm style): map current LTS lines, ignore unknown
        if [ -z "$NODE_PINNED" ]; then
            _lts=$(tr -d '[:space:]' < .nvmrc | head -1)
            case "$_lts" in
                lts/jod|lts-jod) NODE_IMAGE="node:22-alpine"; NODE_PINNED=1 ;;
                lts/iron|lts-iron) NODE_IMAGE="node:20-alpine"; NODE_PINNED=1 ;;
                lts/krypton|lts-krypton) NODE_IMAGE="node:24-alpine"; NODE_PINNED=1 ;;
            esac
            if [ -n "$NODE_PINNED" ]; then echo "[PASS] Node image: $NODE_IMAGE (from .nvmrc $_lts)"; fi
        fi
    fi
    # L4 precedence (highest first): .python-version > runtime.txt >
    # .tool-versions python > pyproject requires-python > default
    PY_IMAGE="python:3.12.4-alpine"
    PY_PINNED=""
    if [ -f ".python-version" ]; then
        _pv=$(sed -E 's/^([0-9]+\.[0-9]+).*/\1/' .python-version | head -1 | tr -d '[:space:]')
        case "$_pv" in [0-9]*.[0-9]*) PY_IMAGE="python:${_pv}-alpine"; PY_PINNED=1;; esac
    elif [ -f "runtime.txt" ]; then
        _pv=$(sed -E 's/^python-//; s/^([0-9]+\.[0-9]+).*/\1/' runtime.txt | head -1 | tr -d '[:space:]')
        case "$_pv" in [0-9]*.[0-9]*) PY_IMAGE="python:${_pv}-alpine"; PY_PINNED=1;; esac
    fi
    JAVA_MAJOR="21"
    JAVA_PINNED=""
    if [ -f ".java-version" ]; then
        _jv=$(grep -oE '[0-9]+' .java-version | head -1)
        case "$_jv" in 11|17|21) JAVA_MAJOR="$_jv"; JAVA_PINNED=1;; esac
    elif [ -f ".tool-versions" ]; then
        # mise/asdf pin: specific .java-version wins when both exist.
        # Parsed inline: the shared _jv2 helper is assigned further below.
        _jv=$(sed -nE "s/^java[[:space:]]+([^[:space:]#]+).*/\\1/p" .tool-versions | head -1 | grep -oE '[0-9]+' | head -1)
        case "$_jv" in 11|17|21) JAVA_MAJOR="$_jv"; JAVA_PINNED=1;; esac
    fi
    # S1: swift-tools-version -> builder image (tags verified on Hub 2026-09:
    # 5.10 + 6.x amazonlinux2 both exist; builder/runtime stay Amazon pair)
    SWIFT_IMAGE="swift:5.10-amazonlinux2"
    if [ -f "Package.swift" ]; then
        _sv=$(sed -nE 's|.*swift-tools-version:([0-9]+\.[0-9]+).*|\1|p' Package.swift | head -1)
        case "$_sv" in
            5.9|5.10) SWIFT_IMAGE="swift:5.10-amazonlinux2" ;;
            6.*) SWIFT_IMAGE="swift:${_sv}-amazonlinux2" ;;
        esac
    fi
    # L1: global.json SDK pin -> .NET major (8 default, 9 supported)
    DOTNET_MAJOR="8"
    if [ -f "global.json" ]; then
        _dn=$(sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([0-9]+).*/\1/p' global.json | head -1)
        case "$_dn" in 8|9) DOTNET_MAJOR="$_dn";; esac
    fi
    # L2: gradle wrapper distribution -> builder tag (only matters with gradlew)
    GRADLE_VER="8.5"
    if [ -f "gradle/wrapper/gradle-wrapper.properties" ]; then
        _gv=$(sed -nE 's/.*gradle-([0-9]+\.[0-9]+).*/\1/p' gradle/wrapper/gradle-wrapper.properties | head -1)
        case "$_gv" in [0-9]*.[0-9]*) GRADLE_VER="$_gv";; esac
    fi
    # K1: image defaults below; version files override (specific file wins).
    # S2: Gemfile ruby directive is the strongest contract (bundler hard-fails
    # on mismatch), so it goes first with a PINNED flag like node/python.
    RUBY_IMAGE="ruby:3.2-alpine"
    RUBY_PINNED=""
    if [ -f "Gemfile" ]; then
        _grv=$(sed -nE 's/^[[:space:]]*ruby[[:space:]]+["'\'']([0-9]+\.[0-9]+).*/\1/p' Gemfile | head -1)
        case "$_grv" in [0-9]*.[0-9]*) RUBY_IMAGE="ruby:${_grv}-alpine"; RUBY_PINNED=1;; esac
    fi
    ELIXIR_IMAGE="elixir:1.15-alpine"
    PHP_IMAGE="php:8.2-fpm-alpine"
    if [ -f ".tool-versions" ]; then
        _tv() { sed -nE "s/^$1[[:space:]]+([^[:space:]#]+).*/\\1/p" .tool-versions | head -1; }
        _rv=$(_tv ruby); _ev=$(_tv elixir); _nv2=$(_tv nodejs); _pv2=$(_tv python); _jv2=$(_tv java)
        if [ -z "$RUBY_PINNED" ]; then
            case "$_rv" in [0-9]*) RUBY_IMAGE="ruby:$(echo "$_rv" | sed -E 's/^([0-9]+\.[0-9]+).*/\1/')-alpine"; RUBY_PINNED=1;; esac
        fi
        case "$_ev" in [0-9]*) ELIXIR_IMAGE="elixir:$(echo "$_ev" | sed -E 's/^([0-9]+\.[0-9]+).*/\1/')-alpine";; esac
        # Specific files win over .tool-versions when both exist
        if [ ! -f ".nvmrc" ]; then
            case "$_nv2" in [0-9]*|v[0-9]*) NODE_IMAGE="node:$(echo "$_nv2" | tr -d v | sed -E 's/^([0-9]+).*/\1/')-alpine"; NODE_PINNED=1;; esac
        fi
        if [ ! -f ".python-version" ] && [ ! -f "runtime.txt" ]; then
            case "$_pv2" in [0-9]*) PY_IMAGE="python:$(echo "$_pv2" | sed -E 's/^([0-9]+\.[0-9]+).*/\1/')-alpine"; PY_PINNED=1;; esac
        fi
    fi
    # L4 tail: pyproject requires-python fills in only when nothing above set it
    if [ -z "$PY_PINNED" ] && [ -f "pyproject.toml" ]; then
        _pv=$(sed -nE 's/^requires-python[[:space:]]*=[[:space:]]*"[^0-9]*([0-9]+\.[0-9]+).*/\1/p' pyproject.toml | head -1)
        case "$_pv" in [0-9]*.[0-9]*) PY_IMAGE="python:${_pv}-alpine";; esac
    fi
    # .node-version is the .nvmrc alias some projects use - same strength
    if [ -z "$NODE_PINNED" ] && [ -f ".node-version" ]; then
        _nv=$(tr -d 'v[:space:]' < .node-version | sed -E 's/^([0-9]+).*/\1/')
        case "$_nv" in [0-9]*) NODE_IMAGE="node:${_nv}-alpine"; NODE_PINNED=1;; esac
    fi
    # L3: package.json engines.node - weakest node hint (ranges are aspirational)
    if [ -z "$NODE_PINNED" ] && [ -f "package.json" ]; then
        _ev=$(sed -nE 's/.*"node"[[:space:]]*:[[:space:]]*"[^0-9]*([0-9]+).*/\1/p' package.json | head -1)
        case "$_ev" in [0-9]*) NODE_IMAGE="node:${_ev}-alpine";; esac
    fi
    # Pipfile python_version is a real pin - only when version files above missed
    if [ -z "$PY_PINNED" ] && [ -f "Pipfile" ]; then
        _pv=$(sed -nE 's/^python_version[[:space:]]*=[[:space:]]*"([0-9]+\.[0-9]+).*/\1/p' Pipfile | head -1)
        case "$_pv" in [0-9]*.[0-9]*) PY_IMAGE="python:${_pv}-alpine"; PY_PINNED=1;; esac
    fi
    if [ -z "$RUBY_PINNED" ] && [ -f ".ruby-version" ]; then
        _rv=$(sed -E 's/^ruby-//; s/[^0-9.].*//' .ruby-version | head -1 | sed -E 's/^([0-9]+\.[0-9]+).*/\1/')
        case "$_rv" in [0-9]*.[0-9]*) RUBY_IMAGE="ruby:${_rv}-alpine"; RUBY_PINNED=1;; esac
    fi
    if [ -f "composer.json" ]; then
        # K1: php platform lower bound ("^8.2" -> 8.2, ">=8.1" -> 8.1)
        _phpv=$(sed -nE 's/.*"php"[[:space:]]*:[[:space:]]*"[^0-9]*([0-9]+\.[0-9]+).*/\1/p' composer.json | head -1)
        case "$_phpv" in 8.*) PHP_IMAGE="php:${_phpv}-fpm-alpine";; esac
    fi
}

# ---------- CLI: [--help] [--dry-run] [--no-dockerfile-2] [--check] [DIR] ----------
DRY_RUN=0
SKIP_D2=0
GEN_ALL=0
INIT_MODE=0
WANT_COMPOSE=0
CHECK_MODE=0
TARGET_DIR=""
for _arg in "$@"; do
    case "$_arg" in
        --help|-h)
             echo "Usage: create-dockerfile.sh [OPTIONS] [DIR]"
             echo "$PROJECT_SUBTITLE"
             echo ""
             echo "Generate production Dockerfile-1 (+ Dockerfile-2, .dockerignore-1/2)."
            echo ""
            echo "Options:"
            echo "  --help              Show this help"
            echo "  --dry-run           Detect + show output, write no files"
            echo "  --no-dockerfile-2   Skip GitHub Release download variant"
            echo "  --all               Monorepo: one Dockerfile-1 per app"
            echo "  --init              Write dockerfile.conf from detection"
            echo "  --compose           Also write compose.yaml (app + detected backing"
            echo "                      services: postgres/mysql/mariadb/redis/mongo/rabbitmq/"
            echo "                      kafka/elasticsearch/cassandra/neo4j/nats/minio/"
            echo "                      memcached/mssql - health-gated depends_on)"
            echo "  --fast              Skip docker/hadolint checks (tests, saves Hub quota)"
            echo "  --check             Verify Dockerfile-1 matches detection (no writes, exit 1 on drift)"
            echo ""
            echo "Env: PORT=8080 HEALTH=/ping STOPSIGNAL=SIGTERM COMPOSE_BIND=127.0.0.1 (override detection)"
            echo "File: dockerfile.conf with PORT= / HEALTH= / STOPSIGNAL= lines (same effect)"
            echo "      D2_ASSET_URL= full release URL template (\$TAG / \$ARCH_SUBSTR expand"
            echo "        at image build, e.g. https://get.helm.sh/app-v\$TAG-linux-\$ARCH_SUBSTR.tar.gz)"
            echo "      D2_ASSET_SHA_URL= checksum file URL (same vars; first field = sha256)"
            echo "Hatch: EXTRA_COPY='COPY ca.crt /usr/local/share/ca-certificates/'"
            echo "       EXTRA_RUN='RUN apk add --no-cache ffmpeg'"
            echo "       EXTRA_DIRECTIVES='SHELL [\"/bin/bash\", \"-c\"]' (allowlist: ADD ONBUILD"
            echo "         SHELL STOPSIGNAL LABEL ENV ARG EXPOSE VOLUME WORKDIR USER HEALTHCHECK)"
            echo "Note: ADD is never auto-emitted (COPY is reproducible); MAINTAINER is"
            echo "      deprecated upstream - LABEL maintainer (see OCI labels) replaces it."
            echo ""
            echo "Languages: python go node rust java kotlin ruby csharp php"
            echo "           swift scala elixir clojure haskell"
            exit 0
            ;;
        --dry-run) DRY_RUN=1 ;;
        --check) CHECK_MODE=1 ;;
        --no-dockerfile-2) SKIP_D2=1 ;;
        --all) GEN_ALL=1 ;;
        --init) INIT_MODE=1 ;;
        --compose) WANT_COMPOSE=1 ;;
        --fast) SKIP_CHECKS=1 ;;
        *) TARGET_DIR="$_arg" ;;
    esac
done
if [ -n "$TARGET_DIR" ]; then
    if [ ! -d "$TARGET_DIR" ]; then echo "ERROR: not a directory: $TARGET_DIR" >&2; exit 1; fi
    cd "$TARGET_DIR" || exit 1
fi
if [ "$GEN_ALL" = "1" ] && [ "$WANT_COMPOSE" = "1" ]; then
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
validate_d2_url() {
    case "$1" in
        http://*|https://*) ;;
        *) return 1 ;;
    esac
    case "$1" in
        *[[:space:]]*|*';'*|*'|'*|*'"'*) return 1 ;;
    esac
    return 0
}

# D3a: dockerfile.conf (known keys only - explicit env wins over file).
# STOPSIGNAL follows the same precedence. Default stays empty: Docker's
# SIGTERM shuts down all 15 runtimes cleanly (JVM/Spring, Node, gunicorn,
# nginx) - pin only when the app documents otherwise.
if [ -f "dockerfile.conf" ]; then
    _cport=$(sed -nE 's/^PORT=(.*)/\1/p' dockerfile.conf | head -1 | tr -d '[:space:]')
    _chealth=$(sed -nE 's/^HEALTH=(.*)/\1/p' dockerfile.conf | head -1 | tr -d '[:space:]')
    _csig=$(sed -nE 's/^STOPSIGNAL=(.*)/\1/p' dockerfile.conf | head -1 | tr -d '[:space:]')
    if [ -n "$_cport" ] && [ -z "${PORT:-}" ]; then PORT="$_cport"; fi
    if [ -n "$_chealth" ] && [ -z "${HEALTH:-}" ]; then HEALTH="$_chealth"; fi
    if [ -n "$_csig" ] && [ -z "${STOPSIGNAL:-}" ]; then STOPSIGNAL="$_csig"; fi
    # D2 custom release channel (bug-047): full URL template with $TAG /
    # $ARCH_SUBSTR resolved at image build time (values never expanded here).
    # Explicit env wins over file, same precedence as PORT above.
    _casset=$(sed -nE 's/^D2_ASSET_URL=(.*)/\1/p' dockerfile.conf | head -1)
    _csha=$(sed -nE 's/^D2_ASSET_SHA_URL=(.*)/\1/p' dockerfile.conf | head -1)
    if [ -n "$_casset" ] && [ -z "${D2_ASSET_URL:-}" ]; then D2_ASSET_URL="$_casset"; fi
    if [ -n "$_csha" ] && [ -z "${D2_ASSET_SHA_URL:-}" ]; then D2_ASSET_SHA_URL="$_csha"; fi
    echo "[PASS] Overrides from dockerfile.conf"
fi
if [ -n "${D2_ASSET_URL:-}" ] && ! validate_d2_url "$D2_ASSET_URL"; then
    echo "ERROR: D2_ASSET_URL must be a safe http(s) URL" >&2
    exit 1
fi
if [ -n "${D2_ASSET_SHA_URL:-}" ] && ! validate_d2_url "$D2_ASSET_SHA_URL"; then
    echo "ERROR: D2_ASSET_SHA_URL must be a safe http(s) URL" >&2
    exit 1
fi
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
        SIG[A-Z]*|[0-9]*) echo "[PASS] Stopsignal: $STOPSIGNAL" ;;
        *) echo "ERROR: bad STOPSIGNAL '$STOPSIGNAL' (want SIGxxx or number)" >&2; exit 1 ;;
    esac
fi
# EXTRA_DIRECTIVES allowlist runs HERE (load time), so a bad line exits
# before a single file is written - truly no output on error.
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
                echo "ERROR: EXTRA_DIRECTIVES rejects unknown directive: '$_dl'" >&2
                exit 1 ;;
        esac
    done <<EXTRA_EOF
$EXTRA_DIRECTIVES
EXTRA_EOF
    echo "[PASS] Extra directives validated"
fi
# Dry-run: back up any pre-existing outputs, delete generated files on exit
# ENV_CREATED: bug-052 writes .env only when absent - dry-run must remove
# exactly that file (never a pre-existing user .env).
ENV_CREATED=0
dry_cleanup() {
    rm -f Dockerfile-1 Dockerfile-2 .dockerignore-1 .dockerignore-2 .dockerignore .dockerignore.bak compose.yaml
    if [ "${ENV_CREATED:-0}" = "1" ]; then rm -f .env; fi
    for _f in Dockerfile-1 Dockerfile-2 .dockerignore-1 .dockerignore-2 .dockerignore .dockerignore.bak compose.yaml; do
        if [ -f "${_f}.predry" ]; then mv -f "${_f}.predry" "$_f"; fi
    done
}
if [ "$DRY_RUN" = "1" ]; then
    for _f in Dockerfile-1 Dockerfile-2 .dockerignore-1 .dockerignore-2 .dockerignore .dockerignore.bak compose.yaml; do
        if [ -f "$_f" ]; then cp -f "$_f" "${_f}.predry"; fi
    done
    trap dry_cleanup EXIT INT TERM
    echo "(dry-run: files will be removed after preview)"
fi
# --check: verify Dockerfile-1 against fresh detection, write nothing.
# D1 only (skips the D2 download variant + compose + interactive git prompt).
check_restore() {
    # Idempotent (bug-051): an EXIT trap plus the explicit finalize call must
    # not run the restore twice - the second pass would see no .precheck files
    # left and DELETE the user's real outputs.
    if [ "${_restored:-0}" = "1" ]; then return 0; fi
    _restored=1
    for _f in "$_base1" Dockerfile-2 .dockerignore-1 .dockerignore-2 .dockerignore compose.yaml; do
        if [ -f "${_f}.precheck" ]; then mv -f "${_f}.precheck" "$_f"; else rm -f "$_f"; fi
    done
    if [ "$_had_bak" = "0" ]; then rm -f .dockerignore.bak; fi
}
# Baseline for Dockerfile-1: --all moves child outputs to the parent as
# <app>.Dockerfile-1, so a child check reads the parent file via CHECK_BASE.
_base1="${CHECK_BASE:-Dockerfile-1}"
if [ "$CHECK_MODE" = "1" ]; then
    # bug-051: only force-skip D2 when the project ships no D2 artifacts to
    # compare. With a baseline present, D2 regenerates below and is diffed too.
    if [ ! -f Dockerfile-2 ] && [ ! -f .dockerignore-2 ]; then SKIP_D2=1; fi
    WANT_COMPOSE=0
    for _f in "$_base1" Dockerfile-2 .dockerignore-1 .dockerignore-2 .dockerignore compose.yaml; do
        if [ -f "$_f" ]; then cp -f "$_f" "${_f}.precheck"; fi
    done
    _had_bak=0
    if [ -f ".dockerignore.bak" ]; then _had_bak=1; fi
    # Abort paths (SIGINT, early exit) must still restore the user's files.
    trap 'check_restore' EXIT
    echo "(check mode: verifying $_base1, files restored afterwards)"
fi
# OCI labels: stable repo facts for every D1 image (unknown outside git)
APP_TITLE=$(basename "$(pwd)" | tr -cd 'A-Za-z0-9._-')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
case "$VCS_REF" in *[!A-Za-z0-9._-]*) VCS_REF="unknown" ;; esac
IMAGE_SOURCE=$(git remote get-url origin 2>/dev/null || echo "local")
IMAGE_SOURCE=$(printf '%s' "$IMAGE_SOURCE" | sed -E 's#(://)[^/@]+@#\1#' | tr -cd 'A-Za-z0-9:/._+@-')
[ -n "$APP_TITLE" ] || APP_TITLE="my-app"
[ -n "$IMAGE_SOURCE" ] || IMAGE_SOURCE="local"

# ---------- E0: host tools check (report only - NEVER installs) ----------
check_host_tools() {
    echo "--- Host tools ---"
    _bv="${BASH_VERSION%%.*}"
    if [ "$_bv" -ge 4 ] 2>/dev/null; then echo "[OK]   bash $BASH_VERSION (required)";
    else echo "[WARN] bash $BASH_VERSION too old - need 4+"; fi
    if command -v git >/dev/null 2>&1; then echo "[OK]   git (GitHub repo detect)";
    else echo "[MISS] git (GitHub repo detect) -> sudo apt-get install -y git"; fi
    if command -v docker >/dev/null 2>&1; then echo "[OK]   docker (--check step)";
    else echo "[MISS] docker (--check step) -> sudo apt-get install -y docker.io"; fi
    if command -v hadolint >/dev/null 2>&1; then echo "[OK]   hadolint (Dockerfile lint)";
    else echo "[MISS] hadolint (Dockerfile lint) -> sudo apt-get install -y hadolint"; fi
    if command -v shellcheck >/dev/null 2>&1; then echo "[OK]   shellcheck (script lint)";
    else echo "[MISS] shellcheck (script lint) -> sudo apt-get install -y shellcheck"; fi
    echo ""
}

echo "=========================================="
echo "UNIVERSAL DOCKERFILE GENERATOR"
echo "=========================================="
# J1: SKIP_CHECKS=1 (or --fast) skips all network/lint steps - for test suites
if [ "${SKIP_CHECKS:-0}" != "1" ]; then
    check_host_tools
fi
echo ""

# ==========================================
# DETECT LANGUAGE
# ==========================================

# Python manifests live in several places (requirements variants included).
# One helper so detect_language + detect_monorepo never disagree again.
has_python_files() {
    local _p="${1:-}" _rf
    for _rf in "${_p}requirements.txt" "${_p}requirements/prod.txt" "${_p}requirements-prod.txt" "${_p}requirements/base.txt" "${_p}requirements/"*.txt "${_p}pyproject.toml" "${_p}Pipfile" "${_p}Pipfile.lock" "${_p}pdm.lock" "${_p}uv.lock" "${_p}poetry.lock" "${_p}setup.py" "${_p}setup.cfg" "${_p}environment.yml"; do
        if [ -f "$_rf" ]; then return 0; fi
    done
    return 1
}

detect_language() {
    if has_python_files; then
        echo "python"
    elif [ -f "go.mod" ]; then
        echo "go"
    elif [ -f "package.json" ] || [ -f "deno.json" ] || [ -f "deno.jsonc" ]; then
        echo "node"
    elif [ -f "Cargo.toml" ]; then
        echo "rust"
    elif [ -f "build.gradle.kts" ]; then
        echo "kotlin"
    elif [ -f "pom.xml" ] || [ -f "build.gradle" ]; then
        echo "java"
    elif [ -f "Gemfile" ]; then
        echo "ruby"
    elif has_files '*.csproj' '*.sln'; then
        echo "csharp"
    elif [ -f "composer.json" ]; then
        echo "php"
    elif [ -f "Package.swift" ]; then
        echo "swift"
    elif [ -f "build.sbt" ]; then
        echo "scala"
    elif [ -f "mix.exs" ]; then
        echo "elixir"
    elif [ -f "project.clj" ] || [ -f "deps.edn" ]; then
        echo "clojure"
    elif has_files '*.cabal' || [ -f "stack.yaml" ]; then
        echo "haskell"
    else
        echo "unknown"
    fi
}

LANGUAGE=$(detect_language)

# Tracks values we guessed (not found) so the summary can say so (D1b)
GUESSED=""

# D1c: monorepo? Multiple apps in subdirs + nothing at top level.
detect_monorepo() {
    local found="" d m
    for d in */; do
        [ -d "$d" ] || continue
        case "$d" in node_modules/|target/|vendor/|docs/|tests/|test/|.git/|examples/|samples/|demo/|tutorial/) continue;; esac
        m=""
        if has_python_files "$d"; then m="python";
        elif [ -f "${d}go.mod" ]; then m="go";
        elif [ -f "${d}package.json" ] || [ -f "${d}deno.json" ] || [ -f "${d}deno.jsonc" ]; then m="node";
        elif [ -f "${d}Cargo.toml" ]; then m="rust";
        elif [ -f "${d}build.gradle.kts" ]; then m="kotlin";
        elif [ -f "${d}pom.xml" ] || [ -f "${d}build.gradle" ]; then m="java";
        elif [ -f "${d}Gemfile" ]; then m="ruby";
        elif [ -f "${d}composer.json" ]; then m="php";
        elif [ -f "${d}mix.exs" ]; then m="elixir";
        elif [ -f "${d}Package.swift" ]; then m="swift";
        elif [ -f "${d}build.sbt" ]; then m="scala";
        elif [ -f "${d}project.clj" ] || [ -f "${d}deps.edn" ]; then m="clojure";
        elif [ -f "${d}stack.yaml" ] || has_files "${d}"*.cabal; then m="haskell";
        elif has_files "${d}"*.csproj "${d}"*.sln; then m="csharp";
        fi
        if [ -n "$m" ]; then found="${found}${d}($m) "; fi
    done
    printf '%s' "$found"
}

if [ "$LANGUAGE" = "unknown" ]; then
    MONO_APPS=$(detect_monorepo)
    if [ -n "$MONO_APPS" ]; then
        echo "[PASS] Looks like a monorepo. Apps found: $MONO_APPS"
        echo ""
if [ "$GEN_ALL" = "1" ]; then
                # DFG_WRAPPER is set by create-dockerfile.sh: monorepo children
                # must re-enter the wrapper so each app is routed on its own
                # (a migrated Python app must not silently use this renderer).
                # Standalone use keeps re-invoking this legacy script.
                _self="${DFG_WRAPPER:-${BASH_SOURCE[0]}}"
            case "$_self" in */*) ;; *) _self="./$_self";; esac
            _mono_drift=0
            for _a in $MONO_APPS; do
                _dir=$(echo "$_a" | sed 's|/.*||')
                echo "--- app: $_dir ---"
                # Flags are inherited: without them --check --all would regenerate
                # instead of checking, and --fast children would burn Hub quota.
                _child_args=""
                if [ "$SKIP_D2" = "1" ]; then _child_args="${_child_args} --no-dockerfile-2"; fi
                if [ "${SKIP_CHECKS:-0}" = "1" ]; then _child_args="${_child_args} --fast"; fi
                if [ "$CHECK_MODE" = "1" ]; then _child_args="${_child_args} --check"; fi
                _child_fail=0
                # _child_args holds flags - splitting is intentional
                # shellcheck disable=SC2086
                ( cd "$_dir" && CHECK_BASE="../${_dir}.Dockerfile-1" </dev/null bash "$_self" $_child_args > "../${_dir}.gen.log" 2>&1 ) || { _child_fail=1; echo "[WARN] $_dir failed/drifted, see ${_dir}.gen.log"; }
                if [ "$CHECK_MODE" = "1" ]; then
                    # Check mode restores the child's own files: nothing to move.
                    _mono_drift=$((_mono_drift+_child_fail))
                    continue
                fi
                for _f in Dockerfile-1 Dockerfile-2 .dockerignore-1 .dockerignore-2; do
                    case "$_f" in .*) _out="./${_dir}${_f}";; *) _out="./${_dir}.${_f}";; esac
                    if [ -f "${_dir}/${_f}" ]; then mv -f "${_dir}/${_f}" "$_out"; fi
                done
                # Subdir outputs moved to parent: restore subdir's own .dockerignore
                if [ -f "${_dir}/.dockerignore.bak" ]; then
                    mv -f "${_dir}/.dockerignore.bak" "${_dir}/.dockerignore"
                else
                    rm -f "${_dir}/.dockerignore"
                fi
            done
            if [ "$CHECK_MODE" = "1" ]; then
                if [ "$_mono_drift" = "0" ]; then
                    echo "MONO CHECK OK: all apps match current detection"
                    exit 0
                else
                    echo "MONO CHECK FAILED: ${_mono_drift} app(s) drifted (see *.gen.log)"
                    exit 1
                fi
            fi
            echo "Wrote: <app>.Dockerfile-1 (+ <app>.dockerignore-1) per app."
            exit 0
        fi
        echo "Run the script inside ONE app, for example:"
        for _a in $MONO_APPS; do
            _dir=$(echo "$_a" | sed 's|/.*||')
            echo "  ./create-dockerfile.sh ./$_dir"
            break
        done
        echo "Or run with --all to generate one Dockerfile-1 per app."
        exit 0
    fi
    echo "[WARN] Language not detected - using generic fallback."
    echo "       Expected one of: requirements.txt, pyproject.toml, go.mod,"
    echo "       package.json, Cargo.toml, build.gradle.kts, pom.xml, Gemfile,"
    echo "       *.csproj, composer.json, Package.swift, build.sbt, mix.exs,"
    echo "       project.clj, deps.edn, *.cabal, stack.yaml"
    LANGUAGE="generic"
fi

# Env overrides win over detection (D1b repair loop)
# Usage: PORT=8080 HEALTH=/ping ./create-dockerfile.sh
SAVED_PORT="${PORT:-}"
SAVED_HEALTH="${HEALTH:-}"
unset PORT 2>/dev/null || true
unset HEALTH_PATH 2>/dev/null || true

echo "=== Input Validation ==="
echo "[PASS] Language detected: $LANGUAGE"
echo ""

# ==========================================
# DETECT HEALTH ENDPOINT
# ==========================================

# bug-051: every template now interpolates ${HEALTHCHECK_BLOCK} (wget images)
# or ${HEALTHCHECK_BLOCK_CURL} (curl images) instead of hardcoding the two
# lines. Found route  -> real HEALTHCHECK. Guessed route  -> a comment: a
# guessed /health 404s forever and the container would sit permanently
# unhealthy, flapping restarts in production.
HEALTH_GUESSED_FLAG=0
build_healthcheck_block() {
    if [ "${HEALTH_GUESSED_FLAG:-0}" = "1" ]; then
        HEALTHCHECK_BLOCK="# HEALTHCHECK omitted: no health route found in source - a guessed path would 404 and stay unhealthy forever.
# To enable: add a real health endpoint (e.g. GET ${HEALTH_PATH:-/health}) or rerun with HEALTH=/your/path."
        HEALTHCHECK_BLOCK_CURL="$HEALTHCHECK_BLOCK"
    else
        HEALTHCHECK_BLOCK="HEALTHCHECK --interval=30s --timeout=5s --start-period=${HEALTH_START} --retries=3 \\
  CMD wget -qO- http://localhost:${PORT}${HEALTH_PATH} || exit 1"
        HEALTHCHECK_BLOCK_CURL="HEALTHCHECK --interval=30s --timeout=5s --start-period=${HEALTH_START} --retries=3 \\
  CMD curl -sf http://localhost:${PORT}${HEALTH_PATH} || exit 1"
    fi
}

detect_health_endpoint() {
    # Explicit HEALTH= override counts as found - never guess around it.
    if [ -n "${SAVED_HEALTH:-}" ]; then
        HEALTH_PATH="$SAVED_HEALTH"
        HEALTH_GUESSED_FLAG=0
        build_healthcheck_block
        return
    fi
    HEALTH_PATH=""
    for path in /health /healthz /health/live /health/ready /ping /ping/health /api/health /status /status/health; do
        _health_hit=$(grep -rF "$path" --include="*.py" --include="*.go" --include="*.js" --include="*.ts" --include="*.rs" \
            --include="*.java" --include="*.rb" --include="*.cs" --include="*.php" --include="*.kt" \
            --include="*.swift" --include="*.scala" --include="*.ex" --include="*.clj" --include="*.hs" \
            --include="*.yaml" --include="*.yml" --include="*.json" --include="*.toml" --include="*.conf" \
            --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null \
            | grep -vE '(^|/)(tests?|docs?|examples?)(/|:)|(^|:[[:space:]]*)(#|//|/\*|<!--)|^[[:space:]]*\*|https?://|localhost|127\.0\.0\.1|\.(md|html|css|lock)(:|$)' \
            | grep -vE '(^|/)Dockerfile' | head -1 || true)
        if [ -n "$_health_hit" ]; then
            HEALTH_PATH="$path"
            break
        fi
    done
    if [ -z "$HEALTH_PATH" ]; then
        HEALTH_PATH="/health"; GUESSED="${GUESSED} health"
        HEALTH_GUESSED_FLAG=1
    else
        HEALTH_GUESSED_FLAG=0
    fi
    build_healthcheck_block
}

# ==========================================
# DETECT DATA DIRECTORIES
# ==========================================

detect_data_dirs() {
    DATA_DIRS=""
    for dir in data db storage uploads logs tmp; do
        # Production rule (bug-047): a VOLUME is only declared for a directory
        # that exists in the build context. A bare word match in source
        # ("database" string, storage backend names) is not a mount point -
        # chartmuseum collected 4 phantom volumes this way. Runtime-created
        # dirs are mounted explicitly with -v instead.
        if [ -d "$dir" ]; then DATA_DIRS="$DATA_DIRS \"/app/$dir\""; fi
    done
    if [ -n "$DATA_DIRS" ]; then
        # Proper JSON array: VOLUME ["/a", "/b"]. Space-joined unquoted form
        # makes Docker create garbage volumes named "[" and "/b]" (bug-035).
        VOLUME_LINE="VOLUME [$(echo "$DATA_DIRS" | sed 's/^ //; s/ /,/g')]"
    else
        VOLUME_LINE=""
    fi
}

# ==========================================
# DETECT ENV NAMES - build-arg candidates from code references (all langs).
# Names only, values never read: .env files are never sourced, so secrets
# stay out of layers. Noisy OS names are dropped, secret-like names ship
# commented out, the rest become ARG/ENV passthrough lines (ENV_ARG_BLOCK).
# ==========================================

detect_env_names() {
    ENV_ARG_BLOCK=""
    ENV_ARG_NAMES=""
    ENV_ARG_SECRETS=""
    _raw=""
    # Exclude list splits on purpose (repo style).
    # shellcheck disable=SC2086
    _x="--exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__"
    case "$LANGUAGE" in
        node)
            _raw="$(grep -rhoE "process\.env\.([A-Za-z_][A-Za-z0-9_]*)" --include="*.js" --include="*.ts" --include="*.mjs" --include="*.cjs" --include="*.vue" $_x . 2>/dev/null | sed -E "s/.*process\.env\.//" || true)"
            _raw="${_raw}
$(grep -rhoE "process\.env\[['\"][A-Za-z_][A-Za-z0-9_]*['\"]\]" --include="*.js" --include="*.ts" --include="*.mjs" --include="*.cjs" --include="*.vue" $_x . 2>/dev/null | sed -E "s/.*\[['\"]//; s/['\"]\]//" || true)"
            _raw="${_raw}
$(grep -rhoE "import\.meta\.env\.(VITE_[A-Za-z0-9_]*)" --include="*.js" --include="*.ts" --include="*.vue" $_x . 2>/dev/null | sed -E "s/.*\.env\.//" || true)"
            ;;
        python)
            _raw="$(grep -rhoE "os\.environ\[['\"][A-Za-z_][A-Za-z0-9_]*['\"]\]" --include="*.py" $_x . 2>/dev/null | sed -E "s/.*\[['\"]//; s/['\"]\]//" || true)"
            _raw="${_raw}
$(grep -rhoE "(os\.environ\.get|os\.getenv)\(['\"][A-Za-z_][A-Za-z0-9_]*['\"]" --include="*.py" $_x . 2>/dev/null | sed -E "s/.*\(['\"]//; s/['\"]//" || true)"
            ;;
        go)
            _raw="$(grep -rhoE "os\.Getenv\(\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.go" $_x . 2>/dev/null | sed -E 's/.*\("//; s/"//' || true)"
            ;;
        rust)
            _raw="$(grep -rhoE "(env!|var)\(\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.rs" $_x . 2>/dev/null | sed -E 's/.*\("//; s/"//' || true)"
            ;;
        java|kotlin)
            _raw="$(grep -rhoE "System\.getenv\(\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.java" --include="*.kt" $_x . 2>/dev/null | sed -E 's/.*\("//; s/"//' || true)"
            ;;
        scala)
            _raw="$(grep -rhoE "sys\.env(\.get)?\(\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.scala" $_x . 2>/dev/null | sed -E 's/.*\("//; s/"//' || true)"
            ;;
        ruby)
            _raw="$(grep -rhoE "ENV\[['\"][A-Za-z_][A-Za-z0-9_]*['\"]\]" --include="*.rb" --include="*.ru" $_x . 2>/dev/null | sed -E "s/.*\[['\"]//; s/['\"]\]//" || true)"
            ;;
        php)
            _raw="$(grep -rhoE "getenv\(['\"][A-Za-z_][A-Za-z0-9_]*['\"]" --include="*.php" $_x . 2>/dev/null | sed -E "s/.*\(['\"]//; s/['\"]//" || true)"
            _raw="${_raw}
$(grep -rhoE "\\\$_ENV\[['\"][A-Za-z_][A-Za-z0-9_]*['\"]\]" --include="*.php" $_x . 2>/dev/null | sed -E "s/.*\[['\"]//; s/['\"]\]//" || true)"
            ;;
        csharp)
            _raw="$(grep -rhoE "GetEnvironmentVariable\(\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.cs" $_x . 2>/dev/null | sed -E 's/.*\("//; s/"//' || true)"
            ;;
        swift)
            _raw="$(grep -rhoE "environment\[[\"'][A-Za-z_][A-Za-z0-9_]*[\"']\]" --include="*.swift" $_x . 2>/dev/null | sed -E "s/.*\[['\"]//; s/['\"]\]//" || true)"
            ;;
        elixir)
            _raw="$(grep -rhoE "System\.get_env\(\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.ex" --include="*.exs" $_x . 2>/dev/null | sed -E 's/.*\("//; s/"//' || true)"
            ;;
        clojure)
            _raw="$(grep -rhoE "System/getenv \"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.clj" --include="*.edn" $_x . 2>/dev/null | sed -E 's/.* "//; s/"//' || true)"
            ;;
        haskell)
            _raw="$(grep -rhoE "(lookupEnv|getEnv) *\"[A-Za-z_][A-Za-z0-9_]*\"" --include="*.hs" $_x . 2>/dev/null | sed -E 's/.* "//; s/"//' || true)"
            ;;
        *) return 0 ;;
    esac
    _names=$(printf '%s\n' "$_raw" | grep -v '^$' | sort -u | grep -v -x -e PATH -e HOME -e USER -e PWD -e SHLVL -e LANG -e OLDPWD -e _ -e HOSTNAME -e TERM -e PORT -e NODE_ENV || true)
    [ -z "$_names" ] && return 0
    _total=$(printf '%s\n' "$_names" | grep -cve '^$' || true)
    [ -z "$_total" ] && _total=0
    if [ "$_total" -gt 10 ]; then
        echo "[WARN] ${_total} env names found - keeping first 10, add the rest with EXTRA_* or --build-arg"
    fi
    _pub="$({
        printf '%s\n' "$_names" | grep -i -E '^(VITE_|NEXT_PUBLIC_|PUBLIC_|REACT_APP_|ARG_)' || true
        printf '%s\n' "$_names" | grep -v -i -E 'key|secret|token|password|credential|private|(^|_)url$|(^|_)dsn$|connection' || true
    } | sort -u | head -10)"
    _secr="$(printf '%s\n' "$_names" | grep -i -E 'key|secret|token|password|credential|private|(^|_)url$|(^|_)dsn$|connection' | grep -v -i -E '^(VITE_|NEXT_PUBLIC_|PUBLIC_|REACT_APP_|ARG_)' || true)"
    # Names are single words by construction.
    # shellcheck disable=SC2086
    for _n in $_pub; do
        ENV_ARG_BLOCK="${ENV_ARG_BLOCK}ARG ${_n}
ENV ${_n}=\${${_n}}
"
        ENV_ARG_NAMES="${ENV_ARG_NAMES} ${_n}"
    done
    # shellcheck disable=SC2086
    for _n in $_secr; do
        ENV_ARG_BLOCK="${ENV_ARG_BLOCK}# ARG ${_n} (secret-like: pass at deploy with --build-arg or -e, never baked)
"
        ENV_ARG_SECRETS="${ENV_ARG_SECRETS} ${_n}"
    done
    if [ -n "$_secr" ]; then
        echo "[WARN] Secret-like env names found - left commented, pass values at deploy"
    fi
    echo "[PASS] Env names:${ENV_ARG_NAMES:- (none public)}"
    # Localhost defaults are dead inside containers (no shared localhost with
    # the host or sibling services) - warn naming names, change nothing. The
    # raw default URL is kept per var (ENV_URLS "NAME|URL" lines) so compose
    # can rewrite just the host to the backing-service name later.
    _localhost_vars=""
    ENV_URLS=""
    ENV_CREDENTIAL_NAMES=""
    # shellcheck disable=SC2086
    for _n in $_pub $_secr; do
        if grep -rn --include="*.py" --include="*.go" --include="*.js" --include="*.ts" --include="*.vue" --include="*.rs" --include="*.java" --include="*.rb" --include="*.php" --include="*.cs" --include="*.kt" --include="*.swift" --include="*.scala" --include="*.ex" --include="*.clj" --include="*.hs" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ "$_n" . 2>/dev/null | grep -qE "localhost|127\.0\.0\.1"; then
            _localhost_vars="${_localhost_vars} ${_n}"
            # URL (scheme://...localhost...) or bare host:port form.
            _urlraw="$(grep -rn --include="*.py" --include="*.go" --include="*.js" --include="*.ts" --include="*.vue" --include="*.rs" --include="*.java" --include="*.rb" --include="*.php" --include="*.cs" --include="*.kt" --include="*.swift" --include="*.scala" --include="*.ex" --include="*.clj" --include="*.hs" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ "$_n" . 2>/dev/null | grep -oE "[A-Za-z][A-Za-z0-9+.-]*://[^ \"']*localhost[^ \"']*|[A-Za-z0-9._-]*localhost:[0-9][^ \"']*" | head -1 || true)"
            if printf '%s' "$_urlraw" | grep -qE '^[A-Za-z][A-Za-z0-9+.-]*://[^/]*@'; then
                ENV_CREDENTIAL_NAMES="${ENV_CREDENTIAL_NAMES} ${_n}"
            fi
            _urlraw="$(printf '%s' "$_urlraw" | sed -E "s#(://)[^/\"' ]*@#\1#")"
            [ -n "$_urlraw" ] && ENV_URLS="${ENV_URLS}${_n}|${_urlraw}
"
        fi
    done
    if [ -n "$_localhost_vars" ]; then
        echo "[WARN] Localhost defaults (unreachable from inside containers - pass -e at deploy):${_localhost_vars}"
    fi
    if [ -n "$ENV_CREDENTIAL_NAMES" ]; then
        echo "[WARN] Credentialed URLs detected:${ENV_CREDENTIAL_NAMES} - provide them at runtime; no credentials are written to compose.yaml"
    fi
}

# ==========================================
# DETECT BACKING SERVICES - databases/message brokers beat a fixed list:
# URL scheme (strong) OR driver library seen with a port/env corroboration.
# A driver mention alone (e.g. kafka audit config that reads no broker) or a
# bare port alone stays a [WARN], never a service. SQLite is file-based and
# explicitly excluded - no container for it. Only runs under --compose.
# ==========================================

detect_backing_services() {
    DBC_SERVICES=""
    _warns=""
    _inc="--include=*.py --include=*.go --include=*.js --include=*.ts --include=*.mjs --include=*.cjs --include=*.vue --include=*.rs --include=*.java --include=*.kt --include=*.scala --include=*.clj --include=*.ex --include=*.hs --include=*.rb --include=*.php --include=*.cs --include=*.swift --include=*.toml --include=*.yml --include=*.yaml --include=*.properties --include=*.conf --include=*.ini --include=*.env --include=*.env.* --include=*.xml"
    _xd="--exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__"
    # id<TAB>scheme-ere<TAB>driver-ere<TAB>corroboration-ere (port or env prefix)
    # Order in this file matters: last same-port-family wins (mysql before mariadb).
    # shellcheck disable=SC2086
    while IFS=$'\t' read -r _id _sch _drv _cor; do
        [ -z "$_id" ] && continue
        _sh=0; _dh=0; _ch=0
        [ -n "$(grep -rhoE "$_sch" $_inc $_xd . 2>/dev/null | head -1)" ] && _sh=1
        [ -n "$(grep -rlE "$_drv" $_inc $_xd . 2>/dev/null | head -1)" ] && _dh=1
        [ -n "$(grep -rhoE "$_cor" $_inc $_xd . 2>/dev/null | head -1)" ] && _ch=1
        if [ "$_sh" -eq 1 ] || { [ "$_dh" -eq 1 ] && [ "$_ch" -eq 1 ]; }; then
            DBC_SERVICES="$DBC_SERVICES $_id"
            echo "[PASS] Backing service: $_id"
        elif [ "$_dh" -eq 1 ] || [ "$_ch" -eq 1 ]; then
            _warns="$_warns $_id"
        fi
    done << 'CATALOG_EOF'
db	postgres(ql)?://	psycopg|asyncpg|pg8000|pg-promise|node-postgres|lib/pq|go-sql-driver|Npgsql|slick-pg|doobie|org.postgresql|pdo_pgsql|'pg'|"pg"	:5432|POSTGRES_|PGHOST|DATABASE_URL
mysql	mysql://	pymysql|aiomysql|mysql2|mysql-connector|mysql_async|MySqlConnector|MySQLConnector|mysqli|pdo_mysql|jdbc:mysql|'mysql'|"mysql"	:3306|MYSQL_|DATABASE_URL
mariadb	mariadb://	org.mariadb|MariaDBConnector|'mariadb'|"mariadb"	:3306|MARIADB_|DATABASE_URL
cache	redis://|rediss://	ioredis|go-redis|predis|StackExchange.Redis|jedis|lettuce|redigo|redis-plus-plus|'redis'|"redis"	:6379|REDIS_|REDIS_URL
mongo	mongodb(\+srv)?://	pymongo|motor|mongoose|mongojs|mongo-driver|spring-data-mongodb|MongoDB.Driver|mongoid|monger|'mongodb'|"mongodb"	:27017|MONGO_|MONGODB_
queue	amqp(s)?://	pika|aio-pika|amqplib|go-amqp|streadway|bunny|php-amqplib|RabbitMQ.Client|langohr|amqp-client|spring-amqp|lapin|'amqplib'|'pika'	:5672|:15672|RABBITMQ_|AMQP_URL
kafka	kafka://	kafkajs|sarama|rdkafka|spring-kafka|ruby-kafka|Confluent.Kafka|kafka-node|franz-go|'kafkajs'	:9092|KAFKA_
elastic	elasticsearch://	@elastic/elasticsearch|elasticsearch-py|olivere/elastic|elastic4s|elastica|ElasticsearchClient|'elasticsearch'|"elasticsearch"	:9200|:9300|ELASTIC_
cassandra	cassandra://	cassandra-driver|datastax|gocql|scylla|'cassandra-driver'	:9042|CASSANDRA_
neo4j	neo4j://|bolt://	neo4j-driver|py2neo|'neo4j-driver'|"neo4j-driver"	:7687|:7474|NEO4J_
nats	nats://	nats.js|nats.go|nats-py|pynats|'nats'|"nats"	:4222|:6222|NATS_
minio	s3://|minio://	minio|MINIO	:9000|:9001|MINIO_|S3_
memcached	memcached://	pymemcache|memjs|gomemcache|dalli|'memcached'|"memcached"	:11211|MEMCACHED_
mssql	mssql://|sqlserver://	mssql-jdbc|tedious|pymssql|pyodbc|'mssql'|"mssql"	:1433|MSSQL_|SQLSERVER_
CATALOG_EOF
    if [ -n "$_warns" ]; then
        echo "[WARN] Possible backing services (unconfirmed - add manually if used):${_warns}"
    fi
    # SQLite is a file, not a service: never emit a container for it.
    # shellcheck disable=SC2086
    if [ -n "$(grep -rlE "sqlite3|better-sqlite3|org.sqlite|:memory:|sqlite::memory:" $_inc $_xd . 2>/dev/null | head -1)" ]; then
        echo "[INFO] SQLite detected - file-based database, no container needed"
    fi
}

# Appends the compose block for one confirmed backing service. Static text per
# service (quoted heredoc = literal output, compose does its own interpolation).
# Static per service; the F4 caller owns the top-level volumes list.
emit_backing_service() {
    case "$1" in
        db)
        cat >> compose.yaml << 'SV_EOF'
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-app}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
SV_EOF
        ;;
        mysql)
        cat >> compose.yaml << 'SV_EOF'
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD in .env}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-app}
    volumes:
      - mysqldata:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 --silent"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
SV_EOF
        ;;
        mariadb)
        cat >> compose.yaml << 'SV_EOF'
  mariadb:
    image: mariadb:11
    restart: unless-stopped
    ports:
      - "127.0.0.1:3306:3306"
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD:?set MARIADB_ROOT_PASSWORD in .env}
      MARIADB_DATABASE: ${MARIADB_DATABASE:-app}
    volumes:
      - mariadbdata:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
SV_EOF
        ;;
        cache)
        cat >> compose.yaml << 'SV_EOF'
  cache:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
SV_EOF
        ;;
        mongo)
        cat >> compose.yaml << 'SV_EOF'
  mongo:
    image: mongo:6.0.6
    restart: unless-stopped
    ports:
      - "127.0.0.1:27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD:?set MONGO_INITDB_ROOT_PASSWORD in .env}
    volumes:
      - mongodata:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.runCommand('ping').ok"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
SV_EOF
        ;;
        queue)
        cat >> compose.yaml << 'SV_EOF'
  queue:
    image: rabbitmq:3.11.17-management-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:5672:5672"
      - "127.0.0.1:15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_DEFAULT_USER:-guest}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_DEFAULT_PASS:?set RABBITMQ_DEFAULT_PASS in .env}
    volumes:
      - rabbitmqdata:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmqctl", "status"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
SV_EOF
        ;;
        kafka)
        cat >> compose.yaml << 'SV_EOF'
  kafka:
    image: apache/kafka:3.7.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:29092:29092"
    environment:
      KAFKA_NODE_ID: "1"
      KAFKA_PROCESS_ROLES: "broker,controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@localhost:9093"
      KAFKA_LISTENERS: "PLAINTEXT://:9092,PLAINTEXT_HOST://:29092,CONTROLLER://:9093"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092"
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
      KAFKA_INTER_BROKER_LISTENER_NAME: "PLAINTEXT"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: "1"
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: "0"
    volumes:
      - kafkadata:/var/lib/kafka/data
    healthcheck:
      test: ["CMD-SHELL", "/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
SV_EOF
        ;;
        elastic)
        cat >> compose.yaml << 'SV_EOF'
  elastic:
    image: elasticsearch:8.15.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:9200:9200"
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
      ES_JAVA_OPTS: "-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - esdata:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
SV_EOF
        ;;
        cassandra)
        cat >> compose.yaml << 'SV_EOF'
  cassandra:
    image: cassandra:4.1
    restart: unless-stopped
    ports:
      - "127.0.0.1:9042:9042"
    environment:
      CASSANDRA_CLUSTER_NAME: dev
    volumes:
      - cassdata:/var/lib/cassandra
    healthcheck:
      test: ["CMD", "nodetool", "status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
SV_EOF
        ;;
        neo4j)
        cat >> compose.yaml << 'SV_EOF'
  neo4j:
    image: neo4j:5-community
    restart: unless-stopped
    ports:
      - "127.0.0.1:7687:7687"
      - "127.0.0.1:7474:7474"
    environment:
      NEO4J_AUTH: "neo4j/${NEO4J_PASSWORD:?set NEO4J_PASSWORD in .env}"
    volumes:
      - neodata:/data
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p '${NEO4J_PASSWORD:?set NEO4J_PASSWORD in .env}' 'RETURN 1' || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
SV_EOF
        ;;
        nats)
        cat >> compose.yaml << 'SV_EOF'
  nats:
    image: nats:2.10-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:4222:4222"
      - "127.0.0.1:8222:8222"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8222/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
SV_EOF
        ;;
        minio)
        cat >> compose.yaml << 'SV_EOF'
  minio:
    image: quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z.hotfix.7aa24e772
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?set MINIO_ROOT_PASSWORD in .env}
    volumes:
      - mindata:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
SV_EOF
        ;;
        memcached)
        cat >> compose.yaml << 'SV_EOF'
  memcached:
    image: memcached:1.6.45-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:11211:11211"
SV_EOF
        ;;
        mssql)
        cat >> compose.yaml << 'SV_EOF'
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04
    restart: unless-stopped
    ports:
      - "127.0.0.1:1433:1433"
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: ${MSSQL_SA_PASSWORD:?set MSSQL_SA_PASSWORD in .env}
      MSSQL_PID: developer
    volumes:
      - mssqldata:/var/opt/mssql
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $$MSSQL_SA_PASSWORD -C -Q 'SELECT 1' -b"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
SV_EOF
        ;;
        *)
        ;;
    esac
}

# ==========================================
# DETECT GITHUB REPO
# ==========================================

detect_github_repo() {
    GITHUB_REPO=""
    
    # Method 1: Try git remote (then raw .git/config - works without git binary
    # and in partial checkouts where git commands fail)
    if [ -d ".git" ] || git rev-parse --git-dir >/dev/null 2>&1; then
        REPO_URL=$(git remote get-url origin 2>/dev/null || true)
        if [ -z "$REPO_URL" ] && [ -f ".git/config" ]; then
            REPO_URL=$(sed -nE 's/^[[:space:]]*url[[:space:]]*=[[:space:]]*//p' .git/config 2>/dev/null | head -1)
        fi
        if echo "$REPO_URL" | grep -q "github.com"; then
            GITHUB_REPO=$(echo "$REPO_URL" | sed -E 's#.*github\.com[:/]##' | sed 's/\.git$//' | sed 's/$//' | head -1)
        fi
    fi
    
    # Method 2: Try config files
    if [ -z "$GITHUB_REPO" ]; then
        # Go
        if [ -f "go.mod" ]; then
            MODULE=$(head -1 go.mod | awk '{print $2}')
            if echo "$MODULE" | grep -q "^github.com/"; then
                GITHUB_REPO=$(echo "$MODULE" | sed 's|^github.com/||')
            fi
        fi
        # Rust
        if [ -f "Cargo.toml" ]; then
            REPO_LINE=$(kv_value 'repository' Cargo.toml)
            if echo "$REPO_LINE" | grep -q "github.com"; then
                GITHUB_REPO=$(echo "$REPO_LINE" | sed -E 's#.*github\.com[:/]##' | sed 's/\.git$//')
            fi
        fi
        # Node.js
        if [ -f "package.json" ]; then
            REPO_URL=$(sed -nE 's/.*"url"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | grep github | head -1)
            if [ -n "$REPO_URL" ]; then
                GITHUB_REPO=$(echo "$REPO_URL" | sed -E 's#.*github\.com[:/]##' | sed 's/\.git$//')
            fi
        fi
        # Python
        if [ -f "pyproject.toml" ]; then
            REPO_URL=$(sed -nE 's/.*Repository[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' pyproject.toml 2>/dev/null | head -1)
            if echo "$REPO_URL" | grep -q "github.com"; then
                GITHUB_REPO=$(echo "$REPO_URL" | sed -E 's#.*github\.com[:/]##' | sed 's/\.git$//')
            fi
        fi
        # Java Maven
        if [ -f "pom.xml" ]; then
            REPO_URL=$(xml_value 'url' pom.xml | grep github | head -1)
            if [ -n "$REPO_URL" ]; then
                GITHUB_REPO=$(echo "$REPO_URL" | sed -E 's#.*github\.com[:/]##' | sed 's/\.git$//')
            fi
        fi
    fi
    
    # Method 3: Prompt user (non-interactive safe: EOF skips Dockerfile-2)
    if [ -z "$GITHUB_REPO" ]; then
        if [ "$CHECK_MODE" = "1" ]; then
            # Never block a --check run on stdin: leave the repo empty so D2
            # simply does not regenerate (Dockerfile-2 compare stays as-is).
            echo "(check mode: no GitHub repo source - Dockerfile-2 not re-verified)"
        else
            echo ""
            echo "GitHub repository not auto-detected."
            echo "Enter GitHub repo (owner/repo) or press Enter to skip Dockerfile-2:"
            read -r GITHUB_REPO || true
        fi
    fi
    
    if [ -n "$GITHUB_REPO" ]; then
        case "$GITHUB_REPO" in
            *[!A-Za-z0-9._/-]*)
                echo "ERROR: GitHub repository contains unsupported characters" >&2
                exit 1
                ;;
        esac
        echo "[PASS] GitHub repo: $GITHUB_REPO"
        if [ -z "${D2_ASSET_SHA_URL:-}" ]; then
            echo "[WARN] Dockerfile-2 has no configured checksum URL; verify the selected release asset before production use"
        fi
    fi
}

# ==========================================
# PYTHON
# ==========================================

detect_python() {
    echo "=== Detective Results ==="

    # Framework (case-insensitive: "import django" counts; requirements/pyproject
    # count too - a Django==5.0 line with no capitalized source match is common)
    FRAMEWORK_LINE=$(grep -rni "fastapi\|flask\|django" --include="*.py" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v __pycache__ | head -1)
    if [ -z "$FRAMEWORK_LINE" ]; then
        FRAMEWORK_LINE=$(grep -hi "fastapi\|flask\|django" requirements.txt pyproject.toml 2>/dev/null | head -1)
    fi
    if echo "$FRAMEWORK_LINE" | grep -qi "fastapi"; then
        FRAMEWORK="fastapi"
    elif echo "$FRAMEWORK_LINE" | grep -qi "flask"; then
        FRAMEWORK="flask"
    elif echo "$FRAMEWORK_LINE" | grep -qi "django"; then
        FRAMEWORK="django"
    else
        FRAMEWORK="fastapi"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Web server
    if [ "$FRAMEWORK" = "fastapi" ]; then
        WEB_SERVER="uvicorn"
    else
        WEB_SERVER="gunicorn"
    fi
    echo "[PASS] Web server: $WEB_SERVER"

    # Module + app
    MAIN_FILE=""
    for f in *.py; do
        case "$f" in *__pycache__*) continue;; esac
        [ -f "$f" ] || continue
        MAIN_FILE="$f"; break
    done
    if [ -z "$MAIN_FILE" ] && [ -d src ]; then
        for f in src/__main__.py src/*/__main__.py src/*/main.py; do
            [ -f "$f" ] || continue
            MAIN_FILE="$f"; break
        done
    fi
    [ -z "$MAIN_FILE" ] && MAIN_FILE="main.py"
    MODULE=$(echo "$MAIN_FILE" | sed 's/\.py$//' | tr '/' '.')
    APP_VAR=$(grep -hn "= FastAPI\|= Flask" "$MAIN_FILE" ./*.py 2>/dev/null | grep -v __pycache__ | head -1 | sed -nE 's/^[^:]*:[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=.*/\1/p')
    if [ -z "$APP_VAR" ]; then
        APP_VAR="app"
    fi
    echo "[PASS] Module: ${MODULE}:${APP_VAR}"

    # Port
    PORT_LINE=$(grep -rnE "5001|5000|8000|8080|3000|9000" --include="*.py" --include="*.http" --include="*.env" --include="Dockerfile*" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v __pycache__ | grep -v "# " | head -1 || true)
    if [ -z "$PORT_LINE" ]; then
        if [ "$FRAMEWORK" = "fastapi" ]; then
            PORT="5001"; GUESSED="${GUESSED} port"
        elif [ "$FRAMEWORK" = "flask" ]; then
            PORT="5000"; GUESSED="${GUESSED} port"
        else
            PORT="8000"; GUESSED="${GUESSED} port"
        fi
    else
        PORT=$(port_from "$PORT_LINE")
        if [ -z "$PORT" ]; then
            PORT="5001"; GUESSED="${GUESSED} port"
        fi
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Special tools
    SPECIAL_TOOLS=""
    if grep -q "ddtrace" requirements.txt 2>/dev/null; then
        SPECIAL_TOOLS="ddtrace-run"
    fi
    if [ -n "$SPECIAL_TOOLS" ]; then
        echo "[PASS] Special tools: $SPECIAL_TOOLS"
    fi

    # Data dirs
    detect_data_dirs

    # Generate CMD
    if [ "$FRAMEWORK" = "fastapi" ]; then
        if [ "$SPECIAL_TOOLS" = "ddtrace-run" ]; then
            CMD="CMD [\"ddtrace-run\", \"uvicorn\", \"${MODULE}:${APP_VAR}\", \"--host\", \"0.0.0.0\", \"--port\", \"${PORT}\"]"
        else
            CMD="CMD [\"uvicorn\", \"${MODULE}:${APP_VAR}\", \"--host\", \"0.0.0.0\", \"--port\", \"${PORT}\"]"
        fi
    elif [ "$FRAMEWORK" = "flask" ]; then
        if [ "$SPECIAL_TOOLS" = "ddtrace-run" ]; then
            CMD="CMD [\"ddtrace-run\", \"gunicorn\", \"--bind\", \"0.0.0.0:${PORT}\", \"--workers\", \"4\", \"--timeout\", \"120\", \"--preload\", \"${MODULE}:${APP_VAR}\"]"
        else
            CMD="CMD [\"gunicorn\", \"--bind\", \"0.0.0.0:${PORT}\", \"--workers\", \"4\", \"--timeout\", \"120\", \"--preload\", \"${MODULE}:${APP_VAR}\"]"
        fi
    elif [ "$FRAMEWORK" = "django" ]; then
        CMD="CMD [\"gunicorn\", \"--bind\", \"0.0.0.0:${PORT}\", \"--workers\", \"4\", \"--timeout\", \"120\", \"${MODULE}.wsgi:application\"]"
    fi

    # Deps manager: look at what exists before guessing (mirrors node pnpm>yarn>npm).
    # Precedence: uv.lock > poetry.lock/[tool.poetry] > Pipfile.lock/Pipfile >
    # pdm.lock > environment.yml > requirements variants > pyproject.toml >
    # setup.py/setup.cfg > none
    PY_MGR="none"
    PY_REQ_FILE=""
    for _rf in requirements.txt requirements/prod.txt requirements-prod.txt requirements/base.txt; do
        if [ -f "$_rf" ]; then PY_REQ_FILE="$_rf"; break; fi
    done
    if [ -z "$PY_REQ_FILE" ]; then
        for _rf in requirements/*.txt; do
            [ -f "$_rf" ] || continue
            PY_REQ_FILE="$_rf"; break
        done
    fi
    if [ -f "uv.lock" ]; then
        PY_MGR="uv"
    elif [ -f "poetry.lock" ] || grep -q "\[tool.poetry\]" pyproject.toml 2>/dev/null; then
        PY_MGR="poetry"
    elif [ -f "Pipfile.lock" ] || [ -f "Pipfile" ]; then
        PY_MGR="pipenv"
    elif [ -f "pdm.lock" ]; then
        PY_MGR="pdm"
    elif [ -f "environment.yml" ]; then
        # Conda env is the whole environment (often plus a pip section);
        # the branch below also pip-installs requirements when present.
        PY_MGR="conda"
    elif [ -n "$PY_REQ_FILE" ]; then
        PY_MGR="pip"
    elif [ -f "pyproject.toml" ]; then
        if grep -q "\[tool.uv\]" pyproject.toml 2>/dev/null; then
            PY_MGR="uv-nolock"
        else
            PY_MGR="pip-pyproject"
        fi
    elif [ -f "setup.py" ] || [ -f "setup.cfg" ]; then
        PY_MGR="pip-setup"
    fi
    case "$PY_MGR" in
        uv)
            PY_UV_HEAD="COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/"
            if [ -f "pyproject.toml" ]; then
                PY_DEPS_COPY="COPY pyproject.toml uv.lock ./"
                PY_DEPS_RUN="RUN uv sync --frozen --no-dev --no-cache"
                PY_VENV_ENV='ENV PATH="/app/.venv/bin:$PATH"'
            else
                # uv sync needs the project file (bug-049 audit): a lone
                # uv.lock installs nothing - runtime image + loud WARN.
                echo "[WARN] uv.lock without pyproject.toml - uv sync needs the project file; runtime image only"
                PY_DEPS_COPY=""
                PY_DEPS_RUN="RUN echo 'WARNING: no pyproject.toml - add it or a requirements file for real deps' >&2"
                PY_VENV_ENV=""
            fi
            ;;
        uv-nolock)
            PY_UV_HEAD="COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/"
            if [ -n "$PY_REQ_FILE" ]; then
                PY_DEPS_COPY="COPY ${PY_REQ_FILE} ./"
                PY_DEPS_RUN="RUN uv pip install --system --no-cache -r ${PY_REQ_FILE}"
            else
                PY_DEPS_COPY="COPY pyproject.toml ./"
                PY_DEPS_RUN="RUN uv pip install --system --no-cache ."
            fi
            :
            PY_VENV_ENV=""
            :
            ;;
        poetry)
            PY_UV_HEAD=""
            if [ -f "poetry.lock" ]; then
                PY_DEPS_COPY="COPY pyproject.toml poetry.lock ./"
            else
                PY_DEPS_COPY="COPY pyproject.toml ./"
            fi
            PY_DEPS_RUN="RUN pip install --no-cache-dir --break-system-packages poetry && poetry install --only main --no-root --no-interaction --no-ansi"
            :
            PY_VENV_ENV='ENV POETRY_VIRTUALENVS_CREATE=false'
            :
            ;;
        pipenv)
            PY_UV_HEAD=""
            if [ -f "Pipfile.lock" ]; then
                PY_DEPS_COPY="COPY Pipfile Pipfile.lock ./"
                PY_DEPS_RUN="RUN pip install --no-cache-dir --break-system-packages pipenv && PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy"
            else
                PY_DEPS_COPY="COPY Pipfile ./"
                PY_DEPS_RUN="RUN pip install --no-cache-dir --break-system-packages pipenv && PIPENV_VENV_IN_PROJECT=1 pipenv install"
            fi
            :
            PY_VENV_ENV=""
            :
            ;;
        pdm)
            PY_UV_HEAD=""
            if [ -f "pyproject.toml" ]; then
                PY_DEPS_COPY="COPY pyproject.toml pdm.lock ./"
            else
                PY_DEPS_COPY="COPY pdm.lock ./"
            fi
            PY_DEPS_RUN="RUN pip install --no-cache-dir --break-system-packages pdm && pdm install --prod --no-editables"
            :
            PY_VENV_ENV=""
            :
            ;;
        pip)
            PY_UV_HEAD=""
            PY_DEPS_COPY="COPY ${PY_REQ_FILE} ./"
            PY_DEPS_RUN="RUN pip install --no-cache-dir --break-system-packages -r ${PY_REQ_FILE}"
            :
            PY_VENV_ENV=""
            :
            ;;
        pip-pyproject)
            PY_UV_HEAD=""
            PY_DEPS_COPY="COPY pyproject.toml ./"
            PY_DEPS_RUN=""
            PY_POST_COPY="RUN pip install --no-cache-dir --break-system-packages ."
            :
            PY_VENV_ENV=""
            :
            ;;
        pip-setup)
            PY_UV_HEAD=""
            PY_DEPS_COPY=""
            [ -f "setup.py" ] && PY_DEPS_COPY="${PY_DEPS_COPY}COPY setup.py ./"
            [ -f "setup.cfg" ] && PY_DEPS_COPY="${PY_DEPS_COPY}
COPY setup.cfg ./"
            PY_DEPS_RUN="RUN pip install --no-cache-dir --break-system-packages setuptools wheel"
            :
            PY_VENV_ENV=""
            :
            ;;
        conda)
            # Pinned tag verified live against the registry (the anaconda/
            # repo does NOT carry it - continuumio does). Override with
            # CONDA_IMAGE= when you need another build.
            CONDA_IMAGE="${CONDA_IMAGE:-continuumio/miniconda3:24.11.1-0}"
            CONDA_ENV=$(sed -nE 's/^name:[[:space:]]*["'"'"']?([^"'"'"'[:space:]#]+).*/\1/p' environment.yml 2>/dev/null | head -1 | tr -cd 'a-zA-Z0-9_-')
            if [ -z "$CONDA_ENV" ]; then CONDA_ENV="app"; fi
            # prefix: wins when declared - conda creates the env exactly there,
            # so COPY/PATH must follow it instead of the name-based default.
            CONDA_PREFIX="/opt/conda/envs/${CONDA_ENV}"
            _pfx=$(sed -nE 's/^prefix:[[:space:]]*["'"'"']?([^"'"'"'[:space:]#]+).*/\1/p' environment.yml 2>/dev/null | head -1)
            if [ -n "$_pfx" ]; then
                CONDA_PREFIX="$_pfx"
                echo "[PASS] Conda prefix: $CONDA_PREFIX (from environment.yml)"
            fi
            PY_IMAGE="$CONDA_IMAGE"
            PY_UV_HEAD='ENV PATH="'"${CONDA_PREFIX}"'/bin:$PATH"'
            PY_DEPS_COPY="COPY environment.yml ./"
            PY_DEPS_RUN="RUN conda env create -f environment.yml"
            if [ -n "$PY_REQ_FILE" ]; then
                PY_DEPS_RUN="${PY_DEPS_RUN}
RUN pip install --no-cache-dir -r ${PY_REQ_FILE}"
                PY_DEPS_COPY="COPY environment.yml ${PY_REQ_FILE} ./"
            fi
            :
            PY_VENV_ENV=""
            :
            ;;
        *)
            PY_UV_HEAD=""
            PY_DEPS_COPY=""
            PY_DEPS_RUN="RUN echo 'WARNING: no requirements.txt or pyproject.toml - runtime image only' >&2"
            :
            PY_VENV_ENV=""
            :
            ;;
    esac
    echo "[PASS] Package manager: $PY_MGR${PY_REQ_FILE:+ ($PY_REQ_FILE)}"

    # H5: guarantee the server binary (uvicorn/gunicorn) even if requirements omit it.
    # Project-pinned versions win: only install what grep cannot find.
    PY_SERVER_RUN=""
    if [ "$FRAMEWORK" = "fastapi" ]; then
        if ! grep -qi "uvicorn" requirements.txt pyproject.toml Pipfile Pipfile.lock pdm.lock uv.lock setup.py setup.cfg environment.yml ${PY_REQ_FILE:-/dev/null} 2>/dev/null; then
            PY_SERVER_RUN="# fallback server floats on purpose (project pins win when present)
# hadolint ignore=DL3013,DL3059
RUN pip install --no-cache-dir --break-system-packages uvicorn"
        fi
    elif [ "$FRAMEWORK" = "flask" ] || [ "$FRAMEWORK" = "django" ]; then
        if ! grep -qi "gunicorn" requirements.txt pyproject.toml Pipfile Pipfile.lock pdm.lock uv.lock setup.py setup.cfg environment.yml ${PY_REQ_FILE:-/dev/null} 2>/dev/null; then
            PY_SERVER_RUN="# fallback server floats on purpose (project pins win when present)
# hadolint ignore=DL3013,DL3059
RUN pip install --no-cache-dir --break-system-packages gunicorn"
        fi
    fi
    if [ -n "$PY_SERVER_RUN" ]; then echo "[PASS] Server guaranteed: $PY_SERVER_RUN"; fi

    # R1b: site-packages path follows the image (K1 made PY_IMAGE dynamic;
    # a hardcoded python3.12 path breaks 3.11/3.13 builds with missing source)
    PY_MOD=$(echo "$PY_IMAGE" | sed -nE 's/.*python:([0-9]+\.[0-9]+).*/\1/p')
    if [ -z "$PY_MOD" ]; then PY_MOD="3.12"; fi

    # O3: Django statics (guides teach it, script forgot it). Only when the
    # project is configured for it - a wrong collectstatic fails loudly.
    if [ "$FRAMEWORK" = "django" ] && [ -f "manage.py" ] && grep -q "STATIC_ROOT\|collectstatic" manage.py ./*.py settings.py ./*/settings.py 2>/dev/null; then
        DJANGO_STATIC="RUN python manage.py collectstatic --noinput"
        echo "[PASS] Django statics: collectstatic at build"
    else
        DJANGO_STATIC=""
    fi

    # Runtime artifact follows the manager: uv sync builds .venv, the rest use
    # system site-packages (keeps the two-layer cache trick working). A lone
    # uv.lock (no pyproject.toml) takes the system shape - there is no .venv
    # to copy (bug-049 audit).
    if [ "$PY_MGR" = "uv" ] && [ -f "pyproject.toml" ]; then
        PY_POST_COPY="RUN uv sync --frozen --no-dev --no-cache"
        PY_RUNTIME_COPY="COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app ."
        PY_RUNTIME_ENV='ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"'
    elif [ "$PY_MGR" = "conda" ]; then
        # Conda envs live outside site-packages - ship the whole env dir.
        # (Debian-based image: the shared alpine tail below does not apply.)
        PY_POST_COPY=""
        PY_RUNTIME_COPY="COPY --from=builder ${CONDA_PREFIX} ${CONDA_PREFIX}
COPY --from=builder /app ."
        PY_RUNTIME_ENV='ENV PATH="'"${CONDA_PREFIX}"'/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CONDA_DEFAULT_ENV='"${CONDA_ENV}"
    elif [ "$PY_MGR" = "pip-setup" ]; then
        # Legacy setup.py needs SOURCES present for `pip install .`, so the
        # real install runs after COPY . . ; early layer only fetches setuptools.
        PY_POST_COPY="RUN pip install --no-cache-dir --break-system-packages ."
        PY_RUNTIME_COPY="# Two layers on purpose: site-packages stays cached on source-only changes
COPY --from=builder /usr/local/lib/python${PY_MOD}/site-packages /usr/local/lib/python${PY_MOD}/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app ."
        PY_RUNTIME_ENV="ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1
${PY_VENV_ENV}"
    else
        PY_POST_COPY="${PY_POST_COPY:-}"
        PY_RUNTIME_COPY="# Two layers on purpose: site-packages stays cached on source-only changes
COPY --from=builder /usr/local/lib/python${PY_MOD}/site-packages /usr/local/lib/python${PY_MOD}/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app ."
        PY_RUNTIME_ENV="ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1
${PY_VENV_ENV}"
    fi

    # Generate Dockerfile (conda needs a Debian tail: no apk, no addgroup -S,
    # tini lives at /usr/bin/tini - so it gets its own template below)
    if [ "$PY_MGR" = "conda" ]; then
        cat > Dockerfile-1 << EOF
FROM ${PY_IMAGE} AS builder
WORKDIR /app
${PY_UV_HEAD}
${PY_DEPS_COPY}
${PY_DEPS_RUN}
${PY_SERVER_RUN}
COPY . .
${DJANGO_STATIC}

FROM ${PY_IMAGE}
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini wget procps && \\
    rm -rf /var/lib/apt/lists/*
${PY_RUNTIME_COPY}
${PY_RUNTIME_ENV}
EXPOSE ${PORT}
RUN useradd -m -s /bin/bash app && chown -R app:app /app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/usr/bin/tini", "--"]
${CMD}
EOF
    else
        cat > Dockerfile-1 << EOF
FROM ${PY_IMAGE} AS builder
${PY_UV_HEAD}
WORKDIR /app
${PY_DEPS_COPY}
${PY_DEPS_RUN}
${PY_SERVER_RUN}
COPY . .
${PY_POST_COPY}
${DJANGO_STATIC}

FROM ${PY_IMAGE}
WORKDIR /app
RUN apk add --no-cache tini wget
${PY_RUNTIME_COPY}
${PY_RUNTIME_ENV}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${CMD}
EOF
    fi

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
tests/
test/
*.test.py
.pytest_cache
.ruff_cache
.mypy_cache
__pycache__
*.pyc
*.pyo
.coverage
htmlcov/
coverage.xml
*.log
.env
.env.*
environment.sh
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.vscode/
.idea/
dist/
build/
*.egg-info/
*.egg
venv/
env/
.venv/
.uv-cache/
.pdm.toml
__pypackages__/
DOCKERIGNORE_EOF
}

# ==========================================
# GO
# ==========================================

detect_go() {
    echo "=== Detective Results ==="

    # Go version (L5: toolchain directive wins - it selects the real builder)
    GO_VERSION=$(grep "^go " go.mod | awk '{print $2}')
    GO_TOOLCHAIN=$(grep "^toolchain " go.mod 2>/dev/null | awk '{print $2}' | sed 's/^go//')
    if [ -n "$GO_TOOLCHAIN" ]; then GO_VERSION="$GO_TOOLCHAIN"; fi
    GO_MINOR=$(echo "$GO_VERSION" | sed 's/\([0-9]*\.[0-9]*\).*/\1/')
    echo "[PASS] Go version: $GO_VERSION"

    # Port
    PORT_LINE=$(grep -rn "router.Run\|\.Run(" --include="*.go" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v _test.go | head -1)
    PORT=$(printf '%s\n' "$PORT_LINE" | sed -nE 's/.*":([0-9]{2,5}).*/\1/p' | head -1)
    if [ -z "$PORT" ]; then
        PORT="8080"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # HTTPS
    HTTPS_LINE=$(grep -rn "tls\|https\|azidentity\|azure\|mongo.*ssl\|crypto/tls\|x509\|certificate\|ssl\|InsecureSkipVerify" --include="*.go" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v _test.go | head -1)
    echo "[PASS] HTTPS: $([ -n "$HTTPS_LINE" ] && echo "YES" || echo "NO")"

    # CGO
    CGO_LINE=$(grep -rn "cgo\|sqlite\|mattn\|go-sqlite\|#cgo\|LDFLAGS\|CFLAGS\|gcc\|musl\|pkg-config" --include="*.go" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v _test.go | head -1)
    if [ -z "$CGO_LINE" ]; then
        CGO_ENABLED="CGO_ENABLED=0"
    else
        CGO_ENABLED=""
    fi
    echo "[PASS] CGO: $([ -z "$CGO_LINE" ] && echo "DISABLED" || echo "ENABLED")"

    # ldflags (never scan the generator itself or its own outputs: a
    # create-dockerfile.sh copy inside the project would self-match)
    LDFLAGS_LINE=$(grep -rn "ldflags\|version.*=" --include="*.go" --include="Makefile" --include="*.sh" --exclude=create-dockerfile.sh --exclude=Dockerfile* --exclude=.dockerignore* --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v _test.go | head -1)
    GO_VERSION_ARGS=""
    if [ -n "$LDFLAGS_LINE" ]; then
        # Take the -X <symbol>= targets from the project's own build line
        # (chartmuseum: main.Version + main.Revision) instead of guessing;
        # make $(VAR) refs map to build args the Dockerfile declares below
        _xargs=$(printf '%s\n' "$LDFLAGS_LINE" | grep -oE '\-X [A-Za-z0-9_./-]+' | awk '{print $2}' | head -5)
        if [ -n "$_xargs" ]; then
            _xv=0; _xr=0; _xflags=""
            for _xsym in $_xargs; do
                case "$_xsym" in
                    *[Vv]ersion*) _xflags="$_xflags -X ${_xsym}=\${APP_VERSION}"; _xv=1;;
                    *[Rr]evision*|*Commit*|*SHA*) _xflags="$_xflags -X ${_xsym}=\${REVISION}"; _xr=1;;
                    *) _xflags="$_xflags -X ${_xsym}=";;
                esac
            done
            # Double quotes (not single): the container shell must expand the
            # ARGs - single quotes would bake the literal ${APP_VERSION} in.
            LDFLAGS="-ldflags=\"-s -w${_xflags}\""
            GO_VERSION_ARGS=""
            [ "$_xv" = "1" ] && GO_VERSION_ARGS="ARG APP_VERSION=latest"
            if [ "$_xr" = "1" ]; then
                [ -n "$GO_VERSION_ARGS" ] && GO_VERSION_ARGS="${GO_VERSION_ARGS}
"
                GO_VERSION_ARGS="${GO_VERSION_ARGS}ARG REVISION=latest"
            fi
        else
            LDFLAGS="-ldflags=\"-s -w -X main.version=\${APP_VERSION}\""
            GO_VERSION_ARGS="ARG APP_VERSION=latest"
        fi
    else
        LDFLAGS=""
    fi
    echo "[PASS] ldflags: $([ -n "$LDFLAGS" ] && echo "YES" || echo "NO")"

    # Binary name (same self-scan guard as ldflags above)
    BUILD_LINE=$(grep -rn "go build.*-o" --include="*.go" --include="Makefile" --include="*.sh" --exclude=create-dockerfile.sh --exclude=Dockerfile* --exclude=.dockerignore* --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v _test.go | head -1)
    if [ -z "$BUILD_LINE" ]; then
        BINARY=$(basename "$(pwd)")
    else
        BINARY=$(printf '%s\n' "$BUILD_LINE" | sed -nE 's/.*-o[[:space:]]+([^[:space:]]+).*/\1/p' | head -1)
        # A "-o" target holding a make/shell reference (${BIN}, $(BIN)) is not
        # a name - fall back to the directory instead of emitting it literally
        case "$BINARY" in *\$*|*\(*|*\ *|"") BINARY=$(basename "$(pwd)");; esac
        if [ -z "$BINARY" ]; then
            BINARY=$(basename "$(pwd)")
        fi
    fi
    echo "[PASS] Binary: $BINARY"

    # Main package path: ./cmd/<binary>/main.go (or a single ./cmd/*/main.go)
    # wins over "." - building "." fails when main lives under cmd/ (chartmuseum)
    GO_MAIN_PKG="."
    if [ -f "cmd/${BINARY}/main.go" ]; then
        GO_MAIN_PKG="./cmd/${BINARY}"
    else
        _gocmds=$(find cmd -maxdepth 2 -name main.go 2>/dev/null | head -2)
        if [ -n "$_gocmds" ] && [ "$(printf '%s\n' "$_gocmds" | wc -l)" -eq 1 ]; then
            GO_MAIN_PKG="./$(dirname "$_gocmds")"
        elif [ -n "$_gocmds" ]; then
            # 2+ binaries under cmd/ and none named for this one: "." cannot
            # build - say so instead of emitting a doomed package (bug-048).
            echo "[WARN] Ambiguous cmd/ layout (multiple mains) - defaulted to '.', fix GO_MAIN_PKG manually if the build fails"
        fi
    fi
    echo "[PASS] Main package: $GO_MAIN_PKG"

    # Build command (CGO_ENABLED holds the literal flag or empty when cgo needed).
    # cgo builds also need a C toolchain in the builder image.
    if [ -n "$CGO_ENABLED" ]; then
        BUILD_CMD="RUN CGO_ENABLED=0 go build ${LDFLAGS} -o ${BINARY} ${GO_MAIN_PKG}"
        GO_BUILDER_APKS="RUN apk add --no-cache git"
    else
        BUILD_CMD="RUN go build ${LDFLAGS} -o ${BINARY} ${GO_MAIN_PKG}"
        GO_BUILDER_APKS="RUN apk add --no-cache git gcc musl-dev"
    fi

    # Data dirs
    detect_data_dirs

    # Lock file may not exist (fresh module) - COPY would fail the build
    if [ -f "go.sum" ]; then
        GO_DEPS_COPY="COPY go.mod go.sum ./"
    else
        GO_DEPS_COPY="COPY go.mod ./"
    fi

    # Go workspace (go.work + multiple modules): copy workspace files too
    if [ -f "go.work" ]; then
        echo "[PASS] Type: workspace"
        GO_DEPS_COPY="${GO_DEPS_COPY}
COPY go.work ./"
        if [ -f "go.work.sum" ]; then
            GO_DEPS_COPY="${GO_DEPS_COPY}
COPY go.work.sum ./"
        fi
    fi

    # Vendored deps: vendor/modules.txt means the project pins its own copies.
    # Build with -mod=vendor and copy the tree; skip `go mod download`
    # (bug-048 audit): vendored builds use no cache, and the download would
    # hit the network / fail on missing go.sum exactly in airgapped setups.
    GO_VENDOR_COPY=""
    GO_MOD_FLAG=""
    GO_DOWNLOAD_RUN="RUN go mod download"
    if [ -f "vendor/modules.txt" ]; then
        echo "[PASS] Type: vendored"
        GO_VENDOR_COPY="COPY vendor/ ./vendor/"
        GO_MOD_FLAG="-mod=vendor"
        GO_DOWNLOAD_RUN=""
        # tr -s squeezes the gap an empty LDFLAGS leaves (cosmetic only).
        BUILD_CMD=$(echo "$BUILD_CMD" | sed "s/go build /go build ${GO_MOD_FLAG} /" | tr -s ' ')
    fi

    # Generate Dockerfile
    cat > Dockerfile-1 << EOF
FROM golang:${GO_MINOR}-alpine AS builder
${GO_BUILDER_APKS}
WORKDIR /app
# Version stamp for -X symbols (ldflags line below); override with --build-arg
${GO_VERSION_ARGS}
${GO_DEPS_COPY}
${GO_VENDOR_COPY}
${GO_DOWNLOAD_RUN}
COPY . .
${BUILD_CMD}

FROM alpine:3.24.1
RUN apk add --no-cache tini ca-certificates wget
COPY --from=builder /app/${BINARY} /usr/local/bin/${BINARY}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["${BINARY}"]
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
*_test.go
test/
tests/
testdata/
*.exe
*.dll
*.so
*.dylib
bin/
dist/
build/
.vscode/
.idea/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
# vendor/ is deliberately NOT excluded: vendored builds COPY vendor/ and
# build -mod=vendor from it (bug-048 audit). When the dir is absent the
# line would be a no-op anyway, so excluding it only breaks that case.
Makefile
DOCKERIGNORE_EOF
}

# ==========================================
# NODE.JS
# ==========================================

# ==========================================
# DETECT SPA - Vue/Vite static sites are NOT Node servers: they build to
# dist/ and need nginx, not `node <main>`. Strict entry rules (a server
# smell anywhere keeps the backend template + WARN, never guesses nginx).
# ==========================================

detect_spa() {
    # Framework: vue-cli-service build vs vite build
    if grep -q "vue-cli-service\|@vue/cli-service" package.json 2>/dev/null; then
        FRAMEWORK="vue-spa"
    else
        FRAMEWORK="vite-spa"
    fi
    echo "[PASS] Framework: $FRAMEWORK (static site -> nginx, not a Node server)"

    # Port: project nginx.conf listen wins, else the nginx default 80
    PORT=""
    if [ -f "nginx.conf" ]; then
        PORT=$(sed -nE 's/^[[:space:]]*listen[[:space:]]+([0-9]+).*/\1/p' nginx.conf 2>/dev/null | head -1)
    fi
    if [ -z "$PORT" ]; then
        PORT="80"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health: a `location = /health`-style block in nginx.conf names the real
    # door (store-admin serves version JSON there). Plain prefix locations
    # count too (store-front serves the same JSON from `location /health`);
    # exact `=` wins when both exist. Regex locations stay out (unmappable
    # to a probe path), and so do proxy prefixes without health-like names.
    HEALTH_PATH="/"
    if [ -f "nginx.conf" ]; then
        _ng_h=$(sed -nE 's/^[[:space:]]*location[[:space:]]*=[[:space:]]*([^[:space:];{]+).*/\1/p' nginx.conf 2>/dev/null | grep -iE 'health|ready|ping|alive' | head -1)
        if [ -z "$_ng_h" ]; then
            _ng_h=$(sed -nE 's/^[[:space:]]*location[[:space:]]+(\/[^[:space:];{]*).*/\1/p' nginx.conf 2>/dev/null | grep -iE 'health|ready|ping|alive' | head -1)
        fi
        if [ -n "$_ng_h" ]; then HEALTH_PATH="$_ng_h"; fi
    fi
    if [ "$HEALTH_PATH" = "/" ]; then
        echo "[PASS] Health: $HEALTH_PATH (static root)"
    else
        echo "[PASS] Health: $HEALTH_PATH (from nginx.conf location)"
    fi
    # nginx serves / (and any configured location) for real - found, not guessed.
    HEALTH_GUESSED_FLAG=0
    build_healthcheck_block

    # No data volumes on a static site
    VOLUME_LINE=""

    # Full install (devDependencies like vite are needed to build)
    _spa_pm=$(sed -nE 's/.*"packageManager"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | head -1)
    SPA_PNPM_TAG="pnpm"
    SPA_BUN_TAG="bun"
    SPA_YARN_INSTALL="yarn install --frozen-lockfile"
    case "$_spa_pm" in
        pnpm@*) SPA_PNPM_TAG="pnpm@${_spa_pm#pnpm@}" ;;
        bun@*) SPA_BUN_TAG="bun@${_spa_pm#bun@}" ;;
        yarn@*)
            _spa_yarn="${_spa_pm#yarn@}"
            case "$_spa_yarn" in
                1.*) SPA_YARN_INSTALL="npm i -g yarn@${_spa_yarn} && yarn install --frozen-lockfile" ;;
                *) SPA_YARN_INSTALL="corepack enable && corepack prepare yarn@${_spa_yarn} --activate && yarn install --immutable" ;;
            esac
            ;;
    esac
    if [ -f "pnpm-lock.yaml" ]; then
        PKG_MGR="pnpm"
        SPA_DEPS_COPY="COPY package.json pnpm-lock.yaml ./"
        SPA_INSTALL="RUN npm i -g ${SPA_PNPM_TAG} && pnpm i --frozen-lockfile"
        SPA_BUILD="RUN pnpm run build"
    elif [ -f "yarn.lock" ]; then
        PKG_MGR="yarn"
        SPA_DEPS_COPY="COPY package.json yarn.lock ./"
        SPA_INSTALL="RUN ${SPA_YARN_INSTALL}"
        SPA_BUILD="RUN yarn build"
    elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
        PKG_MGR="bun"
        if [ -f "bun.lockb" ]; then
            SPA_DEPS_COPY="COPY package.json bun.lockb ./"
        else
            SPA_DEPS_COPY="COPY package.json bun.lock ./"
        fi
        SPA_INSTALL="RUN npm i -g ${SPA_BUN_TAG} && bun install --frozen-lockfile"
        SPA_BUILD="RUN bun run build"
    else
        PKG_MGR="npm"
        SPA_DEPS_COPY="COPY package*.json ./"
        if [ -f "package-lock.json" ]; then
            SPA_INSTALL="RUN npm ci"
        else
            SPA_INSTALL="RUN npm install"
        fi
        SPA_BUILD="RUN npm run build"
    fi
    echo "[PASS] Package manager: $PKG_MGR (full install - build needs devDependencies)"

    # Project nginx.conf ships when present (else the default site serves dist/)
    SPA_NGINX_COPY=""
    SPA_APK="RUN apk add --no-cache wget"
    SPA_RUNTIME_FIX="RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && chown -R nginx:nginx /var/cache/nginx && sed -i -e '/^user /d' -e '/^pid /d' -e '1i pid /tmp/nginx.pid;' -e 's|^error_log .*;|error_log /dev/stderr;|' -e 's|^access_log .*;|access_log /dev/stdout;|' /etc/nginx/nginx.conf"
    SPA_SUBST_ARGS=""
    SPA_SUBST_RUN=""
    if [ -f "nginx.conf" ]; then
        # ${VAR} placeholders need build-time values: every braced variable
        # becomes an ARG + envsubst entry. Native nginx $vars have no braces
        # and never match; secret-looking names are still never defaulted.
        # Word splitting intended below.
        # shellcheck disable=SC2086
        SPA_SUBST=$(sed -nE 's/.*\$\{([A-Za-z_][A-Za-z0-9_]*)\}.*/\1/p' nginx.conf 2>/dev/null | sort -u)
        if [ -n "$SPA_SUBST" ]; then
            SPA_APK="RUN apk add --no-cache wget gettext"
            SPA_NGINX_COPY="COPY nginx.conf /etc/nginx/conf.d/nginx.conf.template"
            _subst_list=""
            for _sv in $SPA_SUBST; do
                SPA_SUBST_ARGS="${SPA_SUBST_ARGS}ARG ${_sv}
"
                _subst_list="${_subst_list} \${${_sv}}"
            done
            # Single quotes below are intentional (envsubst expands at image
            # build, not here) - the ignore pragma must stand alone on its line.
            SPA_SUBST_RUN="# hadolint ignore=SC2016
RUN envsubst '${_subst_list# }' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf"
            echo "[PASS] nginx subst vars:${SPA_SUBST} (via envsubst at build)"
        else
            SPA_NGINX_COPY="COPY nginx.conf /etc/nginx/conf.d/default.conf"
            echo "[PASS] nginx.conf: project config shipped as default site"
        fi
    fi

    # Non-root master is proven working (verified live against a real
    # project conf), but ONLY on unprivileged ports - root binds :80.
    SPA_USER=""
    if [ "$PORT" -gt 1024 ] 2>/dev/null; then
        SPA_USER="USER nginx"
        echo "[PASS] User: nginx (unprivileged port $PORT)"
    else
        echo "[WARN] Port $PORT needs root - master stays root (use an unprivileged port for USER nginx)"
    fi

    NGINX_IMAGE="${NGINX_IMAGE:-nginx:1.30-alpine}"

    # Generate Dockerfile (no USER/tini lines on purpose: the nginx image
    # runs master as root by design; nginx itself is the init process)
    # bug-052: NO ENV NODE_ENV=production in the builder - npm treats it as
    # implicit --omit=dev and drops vite/vue-cli build tools. Runtime nginx
    # stage serves static files only and never needs NODE_ENV.
    cat > Dockerfile-1 << EOF
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
${SPA_DEPS_COPY}
${SPA_INSTALL}
COPY . .
${SPA_BUILD}

FROM ${NGINX_IMAGE}
${SPA_APK}
${SPA_RUNTIME_FIX}
COPY --from=builder /app/dist /usr/share/nginx/html
${SPA_NGINX_COPY}
${SPA_SUBST_ARGS}${SPA_SUBST_RUN}
EXPOSE ${PORT}
${SPA_USER}
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
EOF

    # Generate .dockerignore (dist/ is built inside - never from context)
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
node_modules/
dist/
npm-debug.log*
.vscode/
.idea/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
DOCKERIGNORE_EOF
}

detect_node() {
    echo "=== Detective Results ==="

    # SPA first: a Vue/Vite static site must never get the server template.
    # Server smell anywhere (framework dep OR listen call) keeps the backend
    # template - and says so loudly instead of silently guessing.
    _spa_tools=0
    # Entry HTML lives at root (Vite) or in public/ (Vue CLI) - both prove
    # a real site entry. Root-only missed every Vue CLI app (store-admin).
    if grep -q '"build"' package.json 2>/dev/null && { grep -q "vue-cli-service\|@vue/cli-service" package.json 2>/dev/null || grep -q '"vite"' package.json 2>/dev/null || [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; } && { [ -f "index.html" ] || [ -f "public/index.html" ]; }; then
        _spa_tools=1
    fi
    if [ "$_spa_tools" = "1" ]; then
        if grep -q "express\|fastify\|@nestjs\|hapi\|koa" package.json 2>/dev/null; then
            echo "[WARN] Frontend tooling plus server framework found - keeping the Node server template"
        elif grep -rn "\.listen(\|createServer" --include="*.js" --include="*.ts" --include="*.vue" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v "vite.config\|vue.config" | grep -q .; then
            echo "[WARN] Frontend tooling plus server code found - keeping the Node server template"
        else
            detect_spa
            return 0
        fi
    fi

    # Framework
    if grep -q "express" package.json 2>/dev/null; then
        FRAMEWORK="express"
    elif grep -q "fastify" package.json 2>/dev/null; then
        FRAMEWORK="fastify"
    elif grep -q "@nestjs" package.json 2>/dev/null; then
        FRAMEWORK="nestjs"
    elif grep -q "hapi" package.json 2>/dev/null; then
        FRAMEWORK="hapi"
    elif grep -q "koa" package.json 2>/dev/null; then
        FRAMEWORK="koa"
    else
        FRAMEWORK="node"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "listen\|PORT" --include="*.js" --include="*.ts" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v node_modules | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="3000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Entry point
    MAIN_FILE=$(sed -nE 's/.*"main"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | head -1)
    if [ -z "$MAIN_FILE" ]; then
        if [ -f "index.js" ]; then
            MAIN_FILE="index.js"
        elif [ -f "src/index.js" ]; then
            MAIN_FILE="src/index.js"
        elif [ -f "src/main.ts" ]; then
            MAIN_FILE="src/main.ts"
        elif [ -f "app.js" ]; then
            MAIN_FILE="app.js"
        else
            MAIN_FILE="index.js"
        fi
    fi
    echo "[PASS] Entry point: $MAIN_FILE"

    # Special tools
    SPECIAL_TOOLS=""
    if grep -q "ts-node" package.json 2>/dev/null; then
        SPECIAL_TOOLS="ts-node"
    fi
    if [ -n "$SPECIAL_TOOLS" ]; then
        echo "[PASS] Special tools: $SPECIAL_TOOLS"
    fi

    # Data dirs
    detect_data_dirs

    # Corepack pin: packageManager "pnpm@9.1.0" is a hard contract - a
    # floating global (npm i -g pnpm = latest) can refuse the lockfile.
    PNPM_TAG="pnpm"
    YARN_SETUP="npm i -g yarn"
    YARN_INSTALL="yarn install --frozen-lockfile"
    YARN_PRUNE="yarn install --production --ignore-scripts"
    BUN_TAG="bun"
    _pm=$(sed -nE 's/.*"packageManager"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | head -1)
    case "$_pm" in
        pnpm@*) PNPM_TAG="pnpm@${_pm#pnpm@}"
            echo "[PASS] Package manager pin: $PNPM_TAG (from packageManager)" ;;
        yarn@*) _ym="${_pm#yarn@}"
            case "$_ym" in
                1.*) YARN_SETUP="npm i -g yarn@${_ym}" ;;
                *) YARN_SETUP="corepack enable && corepack prepare yarn@${_ym} --activate"
                   YARN_INSTALL="yarn install --immutable"
                   YARN_PRUNE='yarn workspaces focus --production 2>/dev/null || echo "WARNING: yarn berry could not prune dev deps - image stays larger than needed" >&2' ;;
            esac
            echo "[PASS] Package manager pin: yarn@${_ym} (from packageManager)" ;;
        bun@*) BUN_TAG="bun@${_pm#bun@}"
            echo "[PASS] Package manager pin: $BUN_TAG (from packageManager)" ;;
    esac
    # Package manager: deno > bun > pnpm > yarn > npm (by lockfile/config).
    # npm ci needs lockfile. Deno uses its own runtime (denoland image).
    # Defaults for the npm-family runtimes; the deno branch overrides them.
    NODE_DENO_ENV=""
    NODE_MODULES_COPY="# Two layers on purpose: node_modules stays cached on source-only changes
COPY --from=builder /app/node_modules ./node_modules"
    NODE_DENO_RT_COPY=""
    NODE_BUILD_IMAGE=""
    NODE_RUN_IMAGE=""
    if [ -f "deno.lock" ] || [ -f "deno.json" ] || [ -f "deno.jsonc" ]; then
        PKG_MGR="deno"
        # Deno ships a glibc binary: it CANNOT run on stock musl Alpine
        # (exit 127, missing loader). denoland/deno:alpine bundles real
        # glibc + a working deno at /bin/deno (both verified live), so the
        # whole template - builder and runtime - runs on that base instead
        # of node:alpine. No major-alias tag exists (alpine-2 is NOT
        # published) - pin an exact alpine-X.Y.Z via DENO_IMAGE= to freeze.
        if [ -n "${DENO_IMAGE:-}" ]; then echo "[PASS] Deno image: $DENO_IMAGE (from DENO_IMAGE env)"; fi
        DENO_IMAGE="${DENO_IMAGE:-denoland/deno:alpine}"
        NODE_BUILD_IMAGE="$DENO_IMAGE"
        NODE_RUN_IMAGE="$DENO_IMAGE"
        DENOCFG=""
        [ -f "deno.json" ] && DENOCFG="deno.json"
        [ -f "deno.jsonc" ] && DENOCFG="${DENOCFG} deno.jsonc"
        [ -f "package.json" ] && DENOCFG="${DENOCFG} package.json"
        DENOLOCK=""
        [ -f "deno.lock" ] && DENOLOCK=" deno.lock"
        NODE_DEPS_COPY="COPY ${DENOCFG}${DENOLOCK} ./"
        NPM_INSTALL="RUN deno install"
        NODE_DENO_ENV="ENV DENO_DIR=/deno-dir"
        NODE_MODULES_COPY=""
        NODE_DENO_RT_COPY="COPY --from=builder /deno-dir /deno-dir
ENV DENO_DIR=/deno-dir"
    elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
        PKG_MGR="bun"
        if [ -f "bun.lockb" ]; then
            NODE_DEPS_COPY="COPY package.json bun.lockb ./"
        else
            NODE_DEPS_COPY="COPY package.json bun.lock ./"
        fi
        NPM_INSTALL="RUN npm i -g ${BUN_TAG} && bun install --frozen-lockfile"
    elif [ -f "pnpm-lock.yaml" ]; then
        PKG_MGR="pnpm"
        NODE_DEPS_COPY="COPY package.json pnpm-lock.yaml ./"
        NPM_INSTALL="RUN npm i -g ${PNPM_TAG} && pnpm i --frozen-lockfile"
    elif [ -f "yarn.lock" ]; then
        PKG_MGR="yarn"
        NODE_DEPS_COPY="COPY package.json yarn.lock ./"
        NPM_INSTALL="RUN ${YARN_SETUP} && ${YARN_INSTALL}"
    elif [ -f "package-lock.json" ]; then
        PKG_MGR="npm"
        NODE_DEPS_COPY="COPY package*.json ./"
        # bug-051: full install in builder (dev deps are the build toolchain);
        # NODE_PRUNE below strips them after npm run build.
        NPM_INSTALL="RUN npm ci"
    else
        PKG_MGR="npm"
        NODE_DEPS_COPY="COPY package*.json ./"
        NPM_INSTALL="RUN npm install"
    fi
    echo "[PASS] Package manager: $PKG_MGR"
    # bug-051: post-build prune per manager (builder = full install on purpose).
    case "$PKG_MGR" in
        npm)    NODE_PRUNE="RUN npm prune --omit=dev" ;;
        pnpm)   NODE_PRUNE="RUN pnpm prune --prod" ;;
        bun)    NODE_PRUNE="RUN bun install --production" ;;
        yarn)   NODE_PRUNE="RUN ${YARN_SETUP} && ${YARN_PRUNE}" ;;
        deno)   NODE_PRUNE="" ;;
        *)      NODE_PRUNE="" ;;
    esac
    # Stage bases follow the manager (deno overrides both, the npm family
    # stays on NODE_IMAGE). D2 keeps NODE_IMAGE: registry installs need npm.
    : "${NODE_BUILD_IMAGE:=$NODE_IMAGE}"
    : "${NODE_RUN_IMAGE:=$NODE_IMAGE}"

    # Generate CMD (deno first: tasks.start wins, else run the entry file)
    if [ "$PKG_MGR" = "deno" ]; then
        if grep -qE '"start"[[:space:]]*:' deno.json deno.jsonc 2>/dev/null; then
            CMD='CMD ["deno", "task", "start"]'
        elif [ -f "main.ts" ]; then
            CMD='CMD ["deno", "run", "--allow-all", "main.ts"]'
        elif [ -f "main.js" ]; then
            CMD='CMD ["deno", "run", "--allow-all", "main.js"]'
        elif [ -f "mod.ts" ]; then
            CMD='CMD ["deno", "run", "--allow-all", "mod.ts"]'
        else
            CMD='CMD ["deno", "task", "start"]'
        fi
        echo "[PASS] Start: $CMD"
    fi
    if [ -n "${CMD:-}" ]; then
        : # deno branch above already chose the start command
    elif [ "$FRAMEWORK" = "nestjs" ]; then
        CMD="CMD [\"node\", \"dist/main.js\"]"
    elif [ "$FRAMEWORK" = "fastify" ] && grep -qE '"start"[[:space:]]*:[[:space:]]*"fastify[[:space:]]+start([[:space:]]|")' package.json 2>/dev/null; then
        # Fastify apps export a plugin (app.js defines, never listens) -
        # node <main> would exit silently. Preserve scripts.start instead.
        CMD='CMD ["npm", "start"]'
    elif [ "$SPECIAL_TOOLS" = "ts-node" ]; then
        CMD="CMD [\"ts-node\", \"${MAIN_FILE}\"]"
    else
        CMD="CMD [\"node\", \"${MAIN_FILE}\"]"
    fi
    # ts-node runs .ts AT RUNTIME (no dist/): dev deps are required in the
    # image - a prod-only install leaves ts-node out and the container exits
    # "not found" (bug-048 audit). Full install only for the ts-node CMD.
    case "${CMD:-}" in
        *ts-node*)
        case "$PKG_MGR" in
            pnpm) NPM_INSTALL="RUN npm i -g ${PNPM_TAG} && pnpm i --frozen-lockfile" ;;
            yarn) NPM_INSTALL="RUN ${YARN_SETUP} && ${YARN_INSTALL}" ;;
            bun) NPM_INSTALL="RUN npm i -g ${BUN_TAG} && bun install --frozen-lockfile" ;;
            deno) : ;;
            *) if [ -f "package-lock.json" ]; then NPM_INSTALL="RUN npm ci"; else NPM_INSTALL="RUN npm install"; fi ;;
        esac
        NODE_PRUNE=""
        echo "[PASS] ts-node start: keeping dev deps (runtime needs ts-node)" ;;
    esac

    # H4: TypeScript/NestJS need a build (dist/ never exists otherwise).
    # --if-present: no-op when no build script, fail-fast when build breaks.
    if grep -q '"build"' package.json 2>/dev/null; then
        NODE_BUILD="RUN npm run build --if-present"
    else
        NODE_BUILD=""
    fi
    if [ "$PKG_MGR" = "deno" ]; then
        if grep -qE '"build"[[:space:]]*:' deno.json deno.jsonc 2>/dev/null; then
            NODE_BUILD="RUN deno task build"
        else
            NODE_BUILD=""
        fi
    fi

    # Generate Dockerfile
    # bug-051: NO ENV NODE_ENV=production before install - npm honors it as
    # implicit --omit=dev, which removed the build toolchain (typescript etc.)
    # and broke `npm run build`. Full install, build, then NODE_PRUNE.
    cat > Dockerfile-1 << EOF
FROM ${NODE_BUILD_IMAGE} AS builder
WORKDIR /app
${NODE_DENO_ENV}
${NODE_DEPS_COPY}
${NPM_INSTALL}
COPY . .
${NODE_BUILD}
${NODE_PRUNE}
RUN mkdir -p /app/node_modules

FROM ${NODE_RUN_IMAGE}
RUN apk add --no-cache tini wget
WORKDIR /app
ENV NODE_ENV=production
${NODE_DENO_RT_COPY}
${NODE_MODULES_COPY}
COPY --from=builder /app .
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${CMD}
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
node_modules/
npm-debug.log*
.vscode/
.idea/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
test/
tests/
coverage/
.nyc_output/
DOCKERIGNORE_EOF
}

# ==========================================
# RUST
# ==========================================

detect_rust() {
    echo "=== Detective Results ==="

    # Check if workspace or single crate
    if grep -q "\[workspace\]" Cargo.toml 2>/dev/null; then
        IS_WORKSPACE="true"
        # For workspace, the main crate is in a subdirectory
        # Look for [[bin]] or default-run in root, else use first workspace member
        MAIN_CRATE=$(grep -A5 -E "default-run|\[\[bin\]\]" Cargo.toml 2>/dev/null | grep "name" | head -1 | sed -nE 's/.*"([^"]+)".*/\1/p' || true)
        if [ -z "$MAIN_CRATE" ]; then
            # Get first workspace member
            MAIN_CRATE=$(sed -nE '/members/,/\]/p' Cargo.toml 2>/dev/null | sed -nE 's/.*"([^"]+)".*/\1/p' | head -1 || true)
        fi
        if [ -z "$MAIN_CRATE" ]; then
            MAIN_CRATE=$(basename "$(pwd)")
        fi
        echo "[PASS] Type: workspace"
        echo "[PASS] Main crate: $MAIN_CRATE"
        
        # For workspace, read package name from subdirectory Cargo.toml
        if [ -f "${MAIN_CRATE}/Cargo.toml" ]; then
            PKG_NAME=$(kv_value 'name' "${MAIN_CRATE}/Cargo.toml")
            BINARY_NAME=$(kv_value 'default-run' "${MAIN_CRATE}/Cargo.toml")
            if [ -z "$BINARY_NAME" ]; then
                BINARY_NAME="$MAIN_CRATE"
            fi
        else
            # Root-package workspace ([package] + [workspace] in one file):
            # the real name lives in the root manifest, not the directory.
            PKG_NAME=$(kv_value 'name' Cargo.toml)
            if [ -z "$PKG_NAME" ]; then PKG_NAME="$MAIN_CRATE"; fi
            BINARY_NAME=$(kv_value 'default-run' Cargo.toml)
            if [ -z "$BINARY_NAME" ]; then BINARY_NAME="$PKG_NAME"; fi
        fi
    else
        IS_WORKSPACE="false"
        MAIN_CRATE=""
        PKG_NAME=$(kv_value 'name' Cargo.toml)
        BINARY_NAME=$(kv_value 'default-run' Cargo.toml)
        if [ -z "$BINARY_NAME" ]; then
            BINARY_NAME="$PKG_NAME"
        fi
    fi
    
    if [ -z "$PKG_NAME" ]; then
        PKG_NAME=$(basename "$(pwd)")
    fi
    if [ -z "$BINARY_NAME" ]; then
        BINARY_NAME="$PKG_NAME"
    fi
    echo "[PASS] Package: $PKG_NAME"
    echo "[PASS] Binary: $BINARY_NAME"

    # Port
    PORT_LINE=$(grep -rn "DEFAULT_PORT\|DEFAULT_ADDRESS\|:9000\|:9001\|bind\|listen\|PORT" --include="*.rs" --include="*.toml" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | grep -v target/ | grep -v "\.git/" | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="9000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Framework
    if grep -q "actix" Cargo.toml 2>/dev/null; then
        FRAMEWORK="actix"
    elif grep -q "rocket" Cargo.toml 2>/dev/null; then
        FRAMEWORK="rocket"
    elif grep -q "axum" Cargo.toml 2>/dev/null; then
        FRAMEWORK="axum"
    elif grep -q "warp" Cargo.toml 2>/dev/null; then
        FRAMEWORK="warp"
    else
        FRAMEWORK="rust"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Private registry / vendoring: .cargo/config.toml may point at a mirror.
    # Copy it early so `cargo build` sees the same source replacement as the dev PC
    # (the dummy-deps trick below runs BEFORE the full COPY, so config must lead).
    RUST_CARGO_COPY=""
    if [ -f ".cargo/config.toml" ]; then
        RUST_CARGO_COPY="COPY .cargo/config.toml ./.cargo/config.toml"
        echo "[PASS] Cargo config: .cargo/config.toml copied early"
    elif [ -f ".cargo/config" ]; then
        RUST_CARGO_COPY="COPY .cargo/config ./.cargo/config"
        echo "[PASS] Cargo config: .cargo/config copied early"
    fi

    # Stale-cache guard: the dummy trick above compiles target/ outputs NEWER
    # than the real sources COPY brings next (context files predate every
    # build step). Cargo's mtime fingerprints then call the crate Fresh and
    # the image ships the empty dummy main - verified live (binary without
    # any real strings, container exits 0 printing nothing). Touching every
    # crate source outside target/ marks only the local units dirty, so the
    # final build recompiles the app while dependency layers stay cached.
    RUST_TOUCH="find . -path ./target -prune -o -name '*.rs' -exec touch -c {} + 2>/dev/null; "

    # Data dirs - conservative: only /data and /logs for RustFS
    VOLUME_LINE='VOLUME ["/data", "/logs"]'

    # Workspace-aware build plan (dummy-cache trick breaks workspaces,
    # and per-member COPY breaks when layout differs, so copy full context)
    if [ "${IS_WORKSPACE}" = "true" ]; then
        RUST_COPY="COPY . ."
        if [ -f "Cargo.lock" ]; then
            RUST_BUILD="RUN cargo build --release --locked --package ${PKG_NAME}"
        else
            RUST_BUILD="RUN cargo build --release --package ${PKG_NAME}"
        fi
        if [ "${PORT}" = "9000" ]; then RUST_EXPOSE="EXPOSE 9000 9001"; else RUST_EXPOSE="EXPOSE ${PORT}"; fi
    else
        # Cargo.lock may not exist (library-style crate) - COPY would fail
        if [ -f "Cargo.lock" ]; then
            RUST_COPY="${RUST_CARGO_COPY}
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo \"fn main(){}\" > src/main.rs && echo \"\" > src/lib.rs && cargo build --release && rm -rf src
COPY . ."
            RUST_BUILD="RUN ${RUST_TOUCH}cargo build --release --locked"
        else
            RUST_COPY="${RUST_CARGO_COPY}
COPY Cargo.toml ./
RUN mkdir src && echo \"fn main(){}\" > src/main.rs && echo \"\" > src/lib.rs && cargo build --release && rm -rf src
COPY . ."
            RUST_BUILD="RUN ${RUST_TOUCH}cargo build --release"
        fi
        RUST_EXPOSE="EXPOSE ${PORT}"
    fi

    # Generate Dockerfile
     cat > Dockerfile-1 << EOF
FROM rust:${RUST_VER} AS builder
# openssl-libs-static: musl links the final binary statically, so the linker
# needs libssl.a/libcrypto.a - openssl-dev alone only satisfies the header
# step (dependency rlibs still build, then the real bin fails with
# "cannot find -lssl"). Verified live: without this, only the dummy main
# links, which is exactly what hid the stale-cache bug.
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static
WORKDIR /app
${RUST_COPY}
${RUST_BUILD}

FROM alpine:${ALPINE_VER}
# openssl runtime libs (dep-solver pulls libssl3): musl builds against
# system openssl link dynamically - without these, any native-tls handshake
# dies at runtime. Harmless for pure-rustls binaries. ca-certificates covers
# the native-roots branch the same way.
RUN apk add --no-cache tini ca-certificates wget openssl
COPY --from=builder /app/target/release/${BINARY_NAME} /usr/local/bin/${BINARY_NAME}
${RUST_EXPOSE}
RUN addgroup -S app && adduser -S app -G app && \\
    mkdir -p /data /logs && \\
    chown -R app:app /data /logs && \\
    chmod 0750 /data /logs
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["${BINARY_NAME}"]
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
target/
.vscode/
.idea/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
DOCKERIGNORE_EOF
}

# ==========================================
# JAVA
# ==========================================

detect_java() {
    echo "=== Detective Results ==="

    # Build tool
    if [ -f "pom.xml" ]; then
        BUILD_TOOL="maven"
        PKG_NAME=$(xml_value 'artifactId' pom.xml)
    elif [ -f "build.gradle" ]; then
        BUILD_TOOL="gradle"
        PKG_NAME=$(sed -nE "s/.*archivesBaseName[[:space:]]*=[[:space:]]*'([^']+)'.*/\1/p" build.gradle 2>/dev/null | head -1)
        if [ -z "$PKG_NAME" ]; then
            PKG_NAME=$(basename "$(pwd)")
        fi
    fi
    echo "[PASS] Build tool: $BUILD_TOOL"
    echo "[PASS] Package: $PKG_NAME"

    # Port
    PORT_LINE=$(grep -rn "server.port\|PORT" --include="*.java" --include="*.properties" --include="*.yml" --include="*.yaml" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ] || [ ${#PORT} -gt 5 ]; then
        PORT="8080"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Framework
    if grep -q "spring" pom.xml 2>/dev/null || grep -q "spring" build.gradle 2>/dev/null; then
        FRAMEWORK="spring"
    elif grep -q "quarkus" pom.xml 2>/dev/null || grep -q "quarkus" build.gradle 2>/dev/null; then
        FRAMEWORK="quarkus"
    elif grep -q "micronaut" pom.xml 2>/dev/null || grep -q "micronaut" build.gradle 2>/dev/null; then
        FRAMEWORK="micronaut"
    else
        FRAMEWORK="java"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Spring Boot actuator serves health at /actuator/health, not /health.
    # Only upgrade the default - an explicit /healthz (or any found path) wins.
    if [ "$FRAMEWORK" = "spring" ] && [ "$HEALTH_PATH" = "/health" ]; then
        if grep -rli "actuator" --include="*.java" --include="*.xml" --include="*.properties" --include="*.yml" --include="*.yaml" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1 | grep -q .; then
            HEALTH_PATH="/actuator/health"
            GUESSED=$(echo "$GUESSED" | sed 's/health//g')
            HEALTH_GUESSED_FLAG=0
            echo "[PASS] Health: $HEALTH_PATH (Spring actuator detected)"
        fi
    fi
    # Quarkus smallrye-health serves at /q/health by default - same upgrade rule.
    if [ "$FRAMEWORK" = "quarkus" ] && [ "$HEALTH_PATH" = "/health" ]; then
        if grep -rli "smallrye-health\|quarkus-smallrye" --include="*.java" --include="*.xml" --include="*.properties" --include="*.yml" --include="*.yaml" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1 | grep -q .; then
            HEALTH_PATH="/q/health"
            GUESSED=$(echo "$GUESSED" | sed 's/health//g')
            HEALTH_GUESSED_FLAG=0
            echo "[PASS] Health: $HEALTH_PATH (Quarkus smallrye-health detected)"
        fi
    fi
    # Spring/Quarkus upgrades may replace a guessed /health with a real
    # framework route - rebuild so the template gets the upgraded path.
    build_healthcheck_block

    # Data dirs
    detect_data_dirs
    MVN_CHMOD=""

    # Prefer project wrappers (mvnw/gradlew pin the exact build version)
    if [ -f "mvnw" ]; then
        MVN_CMD="./mvnw"
        MVN_COPY="COPY mvnw ./"
        MVN_CHMOD="RUN chmod +x ./mvnw"
        if [ -d ".mvn" ]; then MVN_COPY="${MVN_COPY}
COPY .mvn/ ./.mvn/"; fi
    else
        MVN_CMD="mvn"
        MVN_COPY=""
    fi
    GRADLE_CHMOD=""
    if [ -f "gradlew" ]; then
        GRADLE_CMD="./gradlew"
        GRADLE_COPY="COPY gradlew ./"
        GRADLE_CHMOD="RUN chmod +x ./gradlew"
        if [ -d "gradle" ]; then GRADLE_COPY="${GRADLE_COPY}
COPY gradle/ ./gradle/"; fi
    else
        GRADLE_CMD="gradle"
        GRADLE_COPY=""
    fi
    echo "[PASS] Build cmd: $([ "$BUILD_TOOL" = "maven" ] && echo "$MVN_CMD" || echo "$GRADLE_CMD")"

    # settings.gradle is optional (single-file builds omit it) - COPY would fail
    GRADLE_FILES_COPY="COPY build.gradle ./"
    if has_files 'settings.gradle' 'settings.gradle.kts'; then
        GRADLE_FILES_COPY="${GRADLE_FILES_COPY}
COPY settings.gradle* ./"
    fi

    # Multi-project gradle (settings with include lines): per-dir COPY misses subprojects
    if grep -q "^[[:space:]]*include" settings.gradle settings.gradle.kts 2>/dev/null; then
        echo "[PASS] Multi-project gradle: full-context copy"
        GRADLE_FILES_COPY="COPY . ."
        GRADLE_COPY=""
        GRADLE_SRC_COPY=""
    else
        GRADLE_SRC_COPY="COPY src ./src"
    fi

    # Multi-module maven (extra pom.xml files): per-file COPY misses modules
    if [ "$(find . -maxdepth 3 -name 'pom.xml' -not -path './target/*' 2>/dev/null | wc -l)" -gt 1 ]; then
        echo "[PASS] Multi-module maven: full-context copy"
        JAVA_COPY1="COPY . ."
        JAVA_OFFLINE=""
        JAVA_COPY2=""
    else
        JAVA_COPY1="COPY pom.xml ."
        JAVA_OFFLINE="RUN ${MVN_CMD} dependency:go-offline"
        JAVA_COPY2="COPY src ./src"
    fi

    # X1: Quarkus makes quarkus-app/, not a fat jar. Spring keeps bootJar.
    # Y1: Micronaut gradle makes *-all.jar via shadowJar (applied by default);
    # micronaut maven `package` already yields a runnable fat jar (shade).
    if [ "$FRAMEWORK" = "quarkus" ]; then
        echo "[PASS] Quarkus packaging: quarkus-app runner"
        MVN_BUILD="RUN ${MVN_CMD} package -DskipTests"
        MVN_ARTIFACT="COPY --from=builder /app/target/quarkus-app /app/quarkus-app"
        GRADLE_BUILD="RUN ${GRADLE_CMD} build --no-daemon"
        GRADLE_ARTIFACT="COPY --from=builder /app/build/quarkus-app /app/quarkus-app"
        JAVA_RUN_CMD="CMD [\"java\", \"-jar\", \"/app/quarkus-app/quarkus-run.jar\"]"
    elif [ "$FRAMEWORK" = "micronaut" ] && [ "$BUILD_TOOL" != "maven" ]; then
        echo "[PASS] Micronaut packaging: shadowJar fat jar"
        MVN_BUILD="RUN ${MVN_CMD} package -DskipTests && ${JAR_SELECT_MVN}"
        MVN_ARTIFACT="COPY --from=builder /app/app.jar /app/app.jar"
        GRADLE_BUILD="RUN ${GRADLE_CMD} shadowJar --no-daemon && ${JAR_SELECT_GRADLE}"
        GRADLE_ARTIFACT="COPY --from=builder /app/app.jar /app/app.jar"
        JAVA_RUN_CMD="CMD [\"java\", \"-jar\", \"/app/app.jar\"]"
    else
        MVN_BUILD="RUN ${MVN_CMD} package -DskipTests && ${JAR_SELECT_MVN}"
        MVN_ARTIFACT="COPY --from=builder /app/app.jar /app/app.jar"
        GRADLE_BUILD="RUN ${GRADLE_CMD} bootJar --no-daemon && ${JAR_SELECT_GRADLE}"
        GRADLE_ARTIFACT="COPY --from=builder /app/app.jar /app/app.jar"
        JAVA_RUN_CMD="CMD [\"java\", \"-jar\", \"/app/app.jar\"]"
    fi

    # Generate Dockerfile
    if [ "$BUILD_TOOL" = "maven" ]; then
        cat > Dockerfile-1 << EOF
FROM maven:3.9-eclipse-temurin-${JAVA_MAJOR} AS builder
WORKDIR /app
${JAVA_COPY1}
${MVN_COPY}
${MVN_CHMOD}
${JAVA_OFFLINE}
${JAVA_COPY2}
${MVN_BUILD}

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
${MVN_ARTIFACT}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${JAVA_RUN_CMD}
EOF
    else
        cat > Dockerfile-1 << EOF
FROM gradle:${GRADLE_VER}-jdk${JAVA_MAJOR} AS builder
WORKDIR /app
${GRADLE_FILES_COPY}
${GRADLE_COPY}
${GRADLE_CHMOD}
${GRADLE_SRC_COPY}
${GRADLE_BUILD}

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
${GRADLE_ARTIFACT}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${JAVA_RUN_CMD}
EOF
    fi

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
target/
build/
.gradle/
.vscode/
.idea/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
settings.xml
DOCKERIGNORE_EOF

    # Private maven repo: settings.xml holds credentials - BuildKit secret
    # mount on every mvn invocation, never a layer (mirrors .npmrc handling).
    if [ -f "settings.xml" ] && [ "$BUILD_TOOL" = "maven" ]; then
        # Two plain seds on purpose: \| alternation is not portable (uutils/BSD sed)
        sed -i 's|^RUN \(\./mvnw\) |RUN --mount=type=secret,id=maven,target=/root/.m2/settings.xml \1 |' Dockerfile-1
        sed -i 's|^RUN \(mvn\) |RUN --mount=type=secret,id=maven,target=/root/.m2/settings.xml \1 |' Dockerfile-1
        echo "[PASS] Private registry: settings.xml via BuildKit secret (not in image)"
    fi
}

# ==========================================
# RUBY
# ==========================================

detect_ruby() {
    echo "=== Detective Results ==="

    # Framework
    if grep -q "rails" Gemfile 2>/dev/null; then
        FRAMEWORK="rails"
    elif grep -q "sinatra" Gemfile 2>/dev/null; then
        FRAMEWORK="sinatra"
    elif grep -q "roda" Gemfile 2>/dev/null; then
        FRAMEWORK="roda"
    else
        FRAMEWORK="ruby"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "PORT\|listen\|bind" --include="*.rb" --include="*.ru" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ] || [ ${#PORT} -gt 5 ]; then
        PORT="3000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Entry point
    if [ -f "config.ru" ]; then
        ENTRY="config.ru"
    elif [ -f "app.rb" ]; then
        ENTRY="app.rb"
    else
        ENTRY="config.ru"
    fi
    echo "[PASS] Entry point: $ENTRY"

    # Data dirs
    detect_data_dirs

    # H1: Gemfile.lock may not exist - COPY would fail (shared by D1 + D2)
    if [ -f "Gemfile.lock" ]; then
        RUBY_DEPS_COPY="COPY Gemfile Gemfile.lock ./"
    else
        RUBY_DEPS_COPY="COPY Gemfile ./"
    fi

    # Bundler pin: BUNDLED WITH in the lockfile is a hard contract - a newer
    # bundler can refuse to install. Vendored gems install --local (offline).
    BUNDLER_PIN=""
    if [ -f "Gemfile.lock" ]; then
        _bv=$(sed -nE '/^BUNDLED WITH/{n;s/^ +([0-9]+\.[0-9]+\.[0-9]+).*/\1/p}' Gemfile.lock 2>/dev/null | head -1)
        case "$_bv" in
            [0-9]*.[0-9]*) BUNDLER_PIN="RUN gem install bundler -v ${_bv} --no-document"
                echo "[PASS] Bundler pin: ${_bv} (from Gemfile.lock)" ;;
        esac
    fi
    BUNDLE_LOCAL=""
    if [ -d "vendor/cache" ]; then
        BUNDLE_LOCAL=" --local"
        echo "[PASS] Vendored gems: vendor/cache found, installing offline"
    fi

    # Private gems: .bundle/config holds credentials - BuildKit secret mount,
    # never a layer (it is already in .dockerignore-1). Same mount in D2.
    RUBY_RUN="RUN"
    if [ -f ".bundle/config" ]; then
        RUBY_RUN="RUN --mount=type=secret,id=bundle,target=/app/.bundle/config"
        echo "[PASS] Private registry: .bundle/config via BuildKit secret (not in image)"
    fi

    # H2: bind our PORT - bare rackup uses 9292, ruby app.rb uses 4567
    if [ "$FRAMEWORK" = "rails" ]; then
        CMD="CMD [\"ruby\", \"bin/rails\", \"server\", \"-p\", \"${PORT}\", \"-b\", \"0.0.0.0\"]"
    elif [ "$FRAMEWORK" = "sinatra" ]; then
        CMD="CMD [\"ruby\", \"app.rb\", \"-p\", \"${PORT}\", \"-o\", \"0.0.0.0\"]"
    else
        CMD="CMD [\"rackup\", \"-p\", \"${PORT}\", \"-o\", \"0.0.0.0\"]"
    fi

    # O2: Rails assets need compiling (dummy secret is the standard trick).
    # Decided here at generation time: no app/assets dir means nothing to do.
    if [ "$FRAMEWORK" = "rails" ] && [ -d "app/assets" ]; then
        RAILS_PRECOMPILE="RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile"
        echo "[PASS] Rails assets: precompile at build"
    else
        RAILS_PRECOMPILE=""
    fi

    # Generate Dockerfile
    cat > Dockerfile-1 << EOF
FROM ${RUBY_IMAGE} AS builder
RUN apk add --no-cache build-base
WORKDIR /app
${RUBY_DEPS_COPY}
${BUNDLER_PIN}
${RUBY_RUN} bundle config set --local without 'test development' && bundle install${BUNDLE_LOCAL}
COPY . .
${RAILS_PRECOMPILE}

FROM ${RUBY_IMAGE}
RUN apk add --no-cache tini wget
WORKDIR /app
# Two layers on purpose: bundle stays cached on source-only changes
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app .
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${CMD}
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
vendor/*
!vendor/cache/
!vendor/cache/**
vendor/bundle/
.bundle/
.vscode/
.idea/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
log/
tmp/
DOCKERIGNORE_EOF
}

# ==========================================
# C# (.NET)
# ==========================================

detect_csharp() {
    echo "=== Detective Results ==="

    # Framework
    if has_files '*.csproj'; then
        if grep -q "Microsoft.NET.Sdk.Web" ./*.csproj 2>/dev/null; then
            FRAMEWORK="aspnet"
        elif grep -q "Microsoft.NET.Sdk.Worker" ./*.csproj 2>/dev/null; then
            FRAMEWORK="worker"
        else
            FRAMEWORK="dotnet"
        fi
    else
        FRAMEWORK="dotnet"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Package name
    PKG_NAME=$(for f in *.csproj; do xml_value 'AssemblyName' "$f"; done | head -1)
    if [ -z "$PKG_NAME" ]; then
        PKG_NAME=$(basename "$(pwd)")
    fi
    echo "[PASS] Package: $PKG_NAME"

    # Port
    PORT_LINE=$(grep -rn "Urls\|Kestrel\|PORT\|port" --include="*.cs" --include="*.json" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="5000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"
    CS_URL_ENV=""
    if [ "${FRAMEWORK:-}" = "aspnet" ]; then
        CS_URL_ENV="ENV ASPNETCORE_URLS=http://+:${PORT}"
    fi

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Data dirs
    detect_data_dirs

    # Multi-project solution: flattened COPY breaks project references
    _nproj=0
    for _p in *.csproj; do [ -f "$_p" ] && _nproj=$((_nproj+1)); done
    if [ "$_nproj" -gt 1 ] || has_files '*.sln'; then
        # csproj-first copy (bug-049 audit): restore inputs only, so the
        # restore layer stays cached across source edits. One COPY per file
        # because multi-source COPY would flatten the directory layout.
        CS_COPY1=""
        # Word splitting intended (find output); spaces in names unsupported.
        # shellcheck disable=SC2044
        for _p in $(find . -name '*.csproj' -not -path '*/bin/*' -not -path '*/obj/*' 2>/dev/null | sed 's|^\./||' | sort); do
            _d=$(dirname "$_p")
            if [ "$_d" = "." ]; then CS_COPY1="${CS_COPY1}COPY ${_p} ./
"; else CS_COPY1="${CS_COPY1}COPY ${_p} ./${_d}/
"; fi
        done
        # Restore also reads these when present - copy them before restore.
        for _rf in *.sln Directory.Build.props Directory.Build.targets Directory.Packages.props NuGet.config nuget.config; do
            if [ -f "$_rf" ]; then CS_COPY1="${CS_COPY1}COPY ${_rf} ./
"; fi
        done
        if [ -n "$CS_COPY1" ]; then
            echo "[PASS] Multi-project dotnet: csproj-first copy (restore layer stays cached)"
            CS_COPY2="COPY . ."
        else
            echo "[PASS] Multi-project dotnet: full-context copy"
            CS_COPY1="COPY . ."
            CS_COPY2=""
        fi
    else
        CS_COPY1="COPY *.csproj ./"
        CS_COPY2="COPY . ."
    fi

    # Generate Dockerfile
    cat > Dockerfile-1 << EOF
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_MAJOR}.0 AS builder
WORKDIR /app
${CS_COPY1}
RUN dotnet restore
${CS_COPY2}
RUN dotnet publish -c Release -o out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:${DOTNET_MAJOR}.0
RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/out .
${CS_URL_ENV}
# WORKDIR above is load-bearing twice: the COPY target resolves under /app
# (not filesystem /), and the env-name inserter anchors on it.
EXPOSE ${PORT}
RUN if ! getent group app >/dev/null; then addgroup --system app; fi && \\
    if ! id -u app >/dev/null 2>&1; then adduser --system --ingroup app app; fi
USER app
${HEALTHCHECK_BLOCK_CURL}
${VOLUME_LINE}
ENTRYPOINT ["/usr/bin/tini", "--", "dotnet", "${PKG_NAME}.dll"]
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
bin/
obj/
*.user
*.suo
.vs/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
DOCKERIGNORE_EOF
}

# ==========================================
# PHP
# ==========================================

php_runtime_block() {
    cat << EOF
RUN apk add --no-cache ca-certificates nginx supervisor tini wget
RUN sed -i \\
    -e '/^user /d' \\
    -e '1i pid /tmp/nginx.pid;' \\
    -e 's|^pid .*;|pid /tmp/nginx.pid;|' \\
    -e 's|^error_log .*;|error_log /dev/stderr;|' \\
    -e 's|^access_log .*;|access_log /dev/stdout;|' \\
    /etc/nginx/nginx.conf
RUN addgroup -S app && adduser -S app -G app && \\
    mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache /var/lib/nginx/logs /var/log/nginx /tmp/nginx-client /tmp/nginx-proxy /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi && \\
    chown -R app:app /var/www/html /var/lib/nginx/logs /var/log/nginx /tmp/nginx-*
RUN printf '%s\\n' \\
    '[global]' \\
    'error_log = /proc/self/fd/2' \\
    'daemonize = no' \\
    '[www]' \\
    'user = app' \\
    'group = app' \\
    'listen = 127.0.0.1:9000' \\
    'pm = dynamic' \\
    'pm.max_children = 5' \\
    'pm.start_servers = 2' \\
    'pm.min_spare_servers = 1' \\
    'pm.max_spare_servers = 3' \\
    'clear_env = no' \\
    'catch_workers_output = yes' \\
    > /usr/local/etc/php-fpm.conf
RUN printf '%s\\n' \\
    'server {' \\
    '    listen ${PORT};' \\
    '    server_name _;' \\
    '    root ${PHP_DOCROOT};' \\
    '    index index.php;' \\
    '    access_log /dev/stdout;' \\
    '    error_log /dev/stderr;' \\
    '    client_body_temp_path /tmp/nginx-client;' \\
    '    proxy_temp_path /tmp/nginx-proxy;' \\
    '    fastcgi_temp_path /tmp/nginx-fastcgi;' \\
    '    uwsgi_temp_path /tmp/nginx-uwsgi;' \\
    '    scgi_temp_path /tmp/nginx-scgi;' \\
    '    location / {' \\
    '        try_files \$uri \$uri/ /index.php?\$query_string;' \\
    '    }' \\
    '    location ~ \\.php$ {' \\
    '        try_files \$uri =404;' \\
    '        include fastcgi_params;' \\
    '        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;' \\
    '        fastcgi_param HTTP_PROXY "";' \\
    '        fastcgi_pass 127.0.0.1:9000;' \\
    '    }' \\
    '    location ~ /\\. { deny all; }' \\
    '}' \\
    > /etc/nginx/http.d/default.conf
RUN printf '%s\\n' \\
    '[supervisord]' \\
    'nodaemon=true' \\
    'logfile=/tmp/supervisord.log' \\
    'pidfile=/tmp/supervisord.pid' \\
    '[program:php-fpm]' \\
    'command=php-fpm --nodaemonize --fpm-config /usr/local/etc/php-fpm.conf' \\
    'directory=/var/www/html' \\
    'autostart=true' \\
    'autorestart=true' \\
    'stopasgroup=true' \\
    'killasgroup=true' \\
    'stdout_logfile=/dev/stdout' \\
    'stdout_logfile_maxbytes=0' \\
    'stderr_logfile=/dev/stderr' \\
    'stderr_logfile_maxbytes=0' \\
    '[program:nginx]' \\
    'command=nginx -g "daemon off;"' \\
    'directory=/var/www/html' \\
    'autostart=true' \\
    'autorestart=true' \\
    'stopasgroup=true' \\
    'killasgroup=true' \\
    'stdout_logfile=/dev/stdout' \\
    'stdout_logfile_maxbytes=0' \\
    'stderr_logfile=/dev/stderr' \\
    'stderr_logfile_maxbytes=0' \\
    > /etc/supervisord.conf
RUN chmod 644 /etc/supervisord.conf
ENV APP_ENV=production \\
    PHP_ENV=production
EXPOSE ${PORT}
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
EOF
}

detect_php() {
    echo "=== Detective Results ==="

    # Framework
    if grep -q "laravel" composer.json 2>/dev/null; then
        FRAMEWORK="laravel"
    elif grep -q "symfony" composer.json 2>/dev/null; then
        FRAMEWORK="symfony"
    elif grep -q "cakephp" composer.json 2>/dev/null; then
        FRAMEWORK="cakephp"
    else
        FRAMEWORK="php"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "PORT\|listen" --include="*.php" --include="*.env" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="8000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Data dirs
    detect_data_dirs

    # composer.lock may not exist (fresh project) - COPY would fail
    if [ -f "composer.lock" ]; then
        PHP_DEPS_COPY="COPY composer.json composer.lock ./"
    else
        PHP_DEPS_COPY="COPY composer.json ./"
    fi
    # Private packagist: auth.json holds tokens - BuildKit secret mount, never a layer
    PHP_RUN="RUN"
    if [ -f "auth.json" ]; then
        PHP_RUN="RUN --mount=type=secret,id=composer,target=/var/www/html/auth.json"
        echo "[PASS] Private registry: auth.json via BuildKit secret (not in image)"
    fi

    # Detect needed PHP extensions from composer.json (ext-foo requires).
    # redis/swoole/pcov install via pecl in the template tail when requested.
    PHP_EXTS="opcache"
    for _ext in pdo pdo_mysql pdo_pgsql pdo_sqlite mbstring xml curl zip gd intl bcmath soap exif pcntl sockets; do
        if grep -q "\"ext-${_ext}\"" composer.json 2>/dev/null; then
            PHP_EXTS="${PHP_EXTS} ${_ext}"
        fi
    done
    # PECL-only extensions (not bundled - docker-php-ext-install would fail).
    # redis needs --enable-redis flag; swoole/pcov install plainly.
    PHP_PECL=""
    for _ext in redis swoole pcov; do
        if grep -q "\"ext-${_ext}\"" composer.json 2>/dev/null; then
            PHP_PECL="${PHP_PECL} ${_ext}"
        fi
    done
    if [ -n "$PHP_PECL" ]; then
        # Single-quoted on purpose: $PHPIZE_DEPS must reach the image
        # literally (proven pattern: same as the uv .venv PATH handling).
        PHP_PECL_RUN='RUN apk add --no-cache $PHPIZE_DEPS linux-headers && \
    pecl install'"${PHP_PECL}"' && \
    docker-php-ext-enable'"${PHP_PECL}"' && \
    apk del $PHPIZE_DEPS'
        echo "[PASS] PHP PECL extensions:${PHP_PECL}"
    else
        PHP_PECL_RUN=""
    fi
    echo "[PASS] PHP extensions: $PHP_EXTS"

    PHP_DOCROOT="/var/www/html"
    if [ -d public ]; then
        PHP_DOCROOT="/var/www/html/public"
    fi
    echo "[PASS] Document root: $PHP_DOCROOT"

    # Generate Dockerfile (composer is NOT in php image - copy from official composer image)
    PHP_RUNTIME="$(php_runtime_block)"
    cat > Dockerfile-1 << EOF
FROM ${PHP_IMAGE}
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
${PHP_DEPS_COPY}
RUN apk add --no-cache libpng-dev libzip-dev icu-dev oniguruma-dev && \\
    docker-php-ext-install ${PHP_EXTS}
${PHP_PECL_RUN}
${PHP_RUN} composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
COPY . .
${PHP_RUNTIME}
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
vendor/
node_modules/
.env
storage/logs/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.vscode/
.idea/
DOCKERIGNORE_EOF
}

# ==========================================
# KOTLIN
# ==========================================

detect_kotlin() {
    echo "=== Detective Results ==="

    # Framework
    if grep -q "io.ktor" build.gradle.kts 2>/dev/null; then
        FRAMEWORK="ktor"
    elif grep -q "org.springframework" build.gradle.kts 2>/dev/null; then
        FRAMEWORK="spring"
    else
        FRAMEWORK="kotlin"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "port\|PORT" --include="*.kt" --include="*.properties" --include="*.yml" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="8080"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Data dirs
    detect_data_dirs

    # Wrapper + optional settings file (same rules as Java/Gradle)
    KT_GRADLE_CHMOD=""
    if [ -f "gradlew" ]; then
        KT_GRADLE_CMD="./gradlew"
        KT_GRADLE_COPY="COPY gradlew ./"
        KT_GRADLE_CHMOD="RUN chmod +x ./gradlew"
        if [ -d "gradle" ]; then KT_GRADLE_COPY="${KT_GRADLE_COPY}
COPY gradle/ ./gradle/"; fi
    else
        KT_GRADLE_CMD="gradle"
        KT_GRADLE_COPY=""
    fi
    KT_FILES_COPY="COPY build.gradle.kts ./"
    if has_files 'settings.gradle.kts' 'settings.gradle'; then
        KT_FILES_COPY="${KT_FILES_COPY}
COPY settings.gradle* ./"
    fi
    KT_SRC_COPY="COPY src ./src"

    # Multi-project gradle: per-dir COPY misses subprojects
    if grep -q "^[[:space:]]*include" settings.gradle settings.gradle.kts 2>/dev/null; then
        echo "[PASS] Multi-project gradle: full-context copy"
        KT_FILES_COPY="COPY . ."
        KT_GRADLE_COPY=""
        KT_SRC_COPY=""
    fi

    # W1: packaging per framework. Spring makes a fat jar (bootJar); Ktor makes
    # a start script (installDist); plain kotlin keeps build+jar with a warning
    # (plain jars run only with a Main-Class manifest).
    if [ "$FRAMEWORK" = "spring" ]; then
        KT_BUILD="RUN ${KT_GRADLE_CMD} bootJar --no-daemon && ${JAR_SELECT_GRADLE}"
        KT_ARTIFACT="COPY --from=builder /app/app.jar /app/app.jar"
        KT_CMD="CMD [\"java\", \"-jar\", \"/app/app.jar\"]"
    elif [ "$FRAMEWORK" = "ktor" ]; then
        KT_APP=$(sed -nE 's/.*rootProject\.name[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' settings.gradle.kts settings.gradle 2>/dev/null | head -1)
        if [ -z "$KT_APP" ]; then KT_APP=$(basename "$(pwd)"); fi
        KT_BUILD="RUN ${KT_GRADLE_CMD} installDist --no-daemon"
        KT_ARTIFACT="COPY --from=builder /app/build/install/${KT_APP} /app/install"
        KT_CMD="CMD [\"/app/install/bin/${KT_APP}\"]"
        echo "[PASS] Ktor app: $KT_APP"
    else
        KT_BUILD="RUN ${KT_GRADLE_CMD} build --no-daemon && ${JAR_SELECT_GRADLE}"
        KT_ARTIFACT="COPY --from=builder /app/app.jar /app/app.jar"
        KT_MAIN_FILE="$(find src -type f -name '*.kt' -print -quit 2>/dev/null || true)"
        KT_PKG="$(sed -nE 's/^[[:space:]]*package[[:space:]]+([A-Za-z0-9_.]+).*/\1/p' "$KT_MAIN_FILE" 2>/dev/null | head -1)"
        KT_BASE="$(basename "${KT_MAIN_FILE:-Main.kt}" .kt)"
        if [ -n "$KT_MAIN_FILE" ]; then
            if grep -Eq '(^|[[:space:]])(class|object)[[:space:]]+Main([[:space:]]|\{|:)' "$KT_MAIN_FILE"; then
                KT_ENTRY="${KT_PKG:+${KT_PKG}.}Main"
            else
                KT_ENTRY="${KT_PKG:+${KT_PKG}.}${KT_BASE}Kt"
            fi
            KT_CMD="CMD [\"java\", \"-cp\", \"/app/*\", \"${KT_ENTRY}\"]"
            echo "[PASS] Plain Kotlin entry: $KT_ENTRY"
        else
            KT_CMD="CMD [\"java\", \"-jar\", \"/app/app.jar\"]"
            echo "[WARN] Plain Kotlin has no source entrypoint; verify the jar manifest"
        fi
    fi

    # Generate Dockerfile
    cat > Dockerfile-1 << EOF
FROM gradle:${GRADLE_VER}-jdk${JAVA_MAJOR} AS builder
WORKDIR /app
${KT_FILES_COPY}
${KT_GRADLE_COPY}
${KT_GRADLE_CHMOD}
${KT_SRC_COPY}
${KT_BUILD}

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
${KT_ARTIFACT}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${KT_CMD}
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
build/
.gradle/
*.class
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
DOCKERIGNORE_EOF
}

# ==========================================
# SWIFT
# ==========================================

detect_swift() {
    echo "=== Detective Results ==="

    # Framework
    if grep -q "vapor" Package.swift 2>/dev/null; then
        FRAMEWORK="vapor"
    else
        FRAMEWORK="swift"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "PORT\|listen\|bind" --include="*.swift" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="8080"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Binary name: parse Package.swift executableTarget, fallback to folder name
    BINARY=$(sed -nE 's/.*executableTarget[[:space:]]*\([[:space:]]*name[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' Package.swift 2>/dev/null | head -1)
    if [ -z "$BINARY" ]; then BINARY=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]'); fi

    # Data dirs
    detect_data_dirs

    # Generate Dockerfile
    cat > Dockerfile-1 << EOF
FROM ${SWIFT_IMAGE} AS builder
WORKDIR /app
COPY Package.swift ./
RUN swift package resolve
COPY . .
RUN swift build -c release

FROM ${SWIFT_IMAGE}
RUN yum install -y --skip-broken wget shadow-utils && yum clean all
WORKDIR /app
COPY --from=builder /app/.build/release/${BINARY} /usr/local/bin/${BINARY}
# WORKDIR above lets the env-name inserter anchor here (absolute COPY
# destinations are unaffected by it).
EXPOSE ${PORT}
RUN useradd -m app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/bin/sh", "-c", "exec \"\$@\"", "--"]
CMD ["${BINARY}"]
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
.build/
Packages/
*.xcodeproj
DerivedData/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
DOCKERIGNORE_EOF
}

# ==========================================
# SCALA
# ==========================================

detect_scala() {
    echo "=== Detective Results ==="

    # Framework
    if grep -q "play" build.sbt 2>/dev/null; then
        FRAMEWORK="play"
    elif grep -q "akka-http" build.sbt 2>/dev/null; then
        FRAMEWORK="akka"
    elif grep -q "http4s" build.sbt 2>/dev/null; then
        FRAMEWORK="http4s"
    else
        FRAMEWORK="scala"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "port\|PORT" --include="*.scala" --include="*.conf" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="9000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Data dirs
    detect_data_dirs

    # project/ dir is optional (simple builds omit it) - COPY would fail
    if [ -d "project" ]; then
        SBT_PROJECT_COPY="COPY project/ ./project/"
    else
        SBT_PROJECT_COPY=""
    fi

    # Builder tag couples JDK+sbt+scala (frozen 11/1.5/2.13 on purpose).
    # sbt itself fetches the project's scalaVersion, but an old sbt or JDK
    # breaks new builds - warn loudly, override with SBT_IMAGE= if needed.
    SBT_BUILDER_IMAGE="${SBT_IMAGE:-eclipse-temurin:11-jdk}"
    SBT_BOOTSTRAP=""
    if [ -z "${SBT_IMAGE:-}" ]; then
        SBT_BOOTSTRAP="RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && \\
    rm -rf /var/lib/apt/lists/* && \\
    curl -fsSL https://github.com/sbt/sbt/releases/download/v1.9.9/sbt-1.9.9.tgz -o /tmp/sbt.tgz && \\
    echo 'c57cae60c2122ca1bba77184dfb4d0d25fc6c18805394ab36ab6208b0c0f262f  /tmp/sbt.tgz' | sha256sum -c - && \\
    tar -xzf /tmp/sbt.tgz -C /opt && \\
    ln -s /opt/sbt/bin/sbt /usr/local/bin/sbt"
    fi
    _sbtv=$(sed -nE 's/^sbt\.version[[:space:]]*=[[:space:]]*([0-9]+\.[0-9]+).*/\1/p' project/build.properties 2>/dev/null | head -1)
    case "$_sbtv" in
        ""|1.5) ;;
        *) echo "[WARN] project/build.properties sbt ${_sbtv}: frozen builder ships sbt 1.5.5 - override with SBT_IMAGE=<tag> if needed" ;;
    esac
    if [ -n "$JAVA_PINNED" ] && [ "$JAVA_MAJOR" != "11" ]; then
        if [ -z "${SBT_IMAGE:-}" ]; then
            echo "ERROR: Scala project pins Java $JAVA_MAJOR, but the default SBT builder uses Java 11; set SBT_IMAGE to a compatible builder" >&2
            exit 1
        fi
        echo "[PASS] Scala builder override: $SBT_BUILDER_IMAGE"
    fi

    # F2: binary name from build.sbt (sbt dist puts it at /app/bin/<name>)
    SCALA_BIN=$(sed -nE 's/^[[:space:]]*name[[:space:]]*:=[[:space:]]*"([^"]+)".*/\1/p' build.sbt 2>/dev/null | head -1 | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')
    if [ -z "$SCALA_BIN" ]; then SCALA_BIN="server"; fi
    echo "[PASS] Binary: $SCALA_BIN"

    # W2: three packaging flows. Play makes a dist zip; bare native-packager
    # (JavaAppPackaging) makes a stage dir; plain Scala gets package+classpath.
    if grep -q "PlayScala\|PlayJava" build.sbt project/*.sbt project/*.scala 2>/dev/null; then
        echo "[PASS] Scala packaging: dist (Play)"
        SBT_BUILD="RUN sbt dist"
        SBT_ARTIFACT="COPY --from=builder /app/target/universal/*.zip .
RUN unzip ./*.zip && mv -- */ /app"
        SBT_CMD="CMD [\"/app/bin/${SCALA_BIN}\"]"
    elif grep -q "JavaAppPackaging\|sbt-native-packager" build.sbt project/*.sbt project/*.scala 2>/dev/null; then
        echo "[PASS] Scala packaging: stage (native-packager)"
        SBT_BUILD="RUN sbt stage"
        SBT_ARTIFACT="COPY --from=builder /app/target/universal/stage /app/stage
RUN chmod +x /app/stage/bin/${SCALA_BIN}"
        SBT_CMD="CMD [\"/app/stage/bin/${SCALA_BIN}\"]"
    else
        SBT_MAIN=$(sed -nE 's/.*mainClass[[:space:]]*:=[[:space:]]*Some\("([^"]+)"\).*/\1/p' build.sbt 2>/dev/null | head -1)
        SBT_BUILD="RUN sbt package"
        SBT_ARTIFACT="COPY --from=builder /app/target/scala-*/*.jar /app/"
        if [ -n "$SBT_MAIN" ]; then
            SBT_CMD="CMD [\"java\", \"-cp\", \"/app/*\", \"${SBT_MAIN}\"]"
        else
            SBT_CMD="# TODO: set mainClass in build.sbt, then use: CMD [\"java\", \"-cp\", \"/app/*\", \"com.example.Main\"]"
            echo "[WARN] No mainClass in build.sbt - CMD left as TODO"
        fi
        echo "[PASS] Scala packaging: package (plain)"
    fi

    # Generate Dockerfile
    # bug-051: hseeberger/scala-sbt ships NO alpine tags (Debian base) - the old
    # `apk add unzip` failed every builder. apt is the correct tool here; the
    # runtime stage below stays eclipse-temurin alpine + apk.
    cat > Dockerfile-1 << EOF
FROM ${SBT_BUILDER_IMAGE} AS builder
${SBT_BOOTSTRAP}
WORKDIR /app
COPY build.sbt ./
${SBT_PROJECT_COPY}
RUN sbt update
COPY . .
${SBT_BUILD}

FROM eclipse-temurin:11-jre-alpine
RUN apk add --no-cache bash tini wget unzip
WORKDIR /app
${SBT_ARTIFACT}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
${SBT_CMD}
EOF

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
target/
project/target/
.bsp/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
DOCKERIGNORE_EOF
}

# ==========================================
# ELIXIR
# ==========================================

detect_elixir() {
    echo "=== Detective Results ==="

    # Framework
    if grep -q "phoenix" mix.exs 2>/dev/null; then
        FRAMEWORK="phoenix"
    else
        FRAMEWORK="elixir"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "PORT\|http:" --include="*.exs" --include="*.ex" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="4000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Release name
    RELEASE_NAME=$(sed -nE 's/.*app:[[:space:]]*:([A-Za-z0-9_]+).*/\1/p' mix.exs 2>/dev/null | head -1)
    if [ -z "$RELEASE_NAME" ]; then
        RELEASE_NAME=$(basename "$(pwd)")
    fi
    echo "[PASS] Release: $RELEASE_NAME"

    # Data dirs
    detect_data_dirs

    # mix.lock may not exist (fresh project) - COPY would fail
    if [ -f "mix.lock" ]; then
        MIX_DEPS_COPY="COPY mix.exs mix.lock ./"
    else
        MIX_DEPS_COPY="COPY mix.exs ./"
    fi

    # Generate Dockerfile
    cat > Dockerfile-1 << EOF
FROM ${ELIXIR_IMAGE} AS builder
RUN apk add --no-cache build-base
WORKDIR /app
${MIX_DEPS_COPY}
RUN mix deps.get --only prod && mix deps.compile
COPY . .
RUN MIX_ENV=prod mix release

FROM alpine:3.24.1
RUN apk add --no-cache tini wget libstdc++ openssl ncurses-libs
COPY --from=builder /app/_build/prod/rel/${RELEASE_NAME} /app
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
# O1: Phoenix releases start NO web server without PHX_SERVER=true.
# SECRET_KEY_BASE has no safe default - pass it at runtime (see NEXT STEPS).
ENV PHX_SERVER=true
# ENV SECRET_KEY_BASE=change-me-at-runtime
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/bin/${RELEASE_NAME}", "start"]
EOF
    if [ "$FRAMEWORK" = "phoenix" ]; then
        echo "[WARN] Phoenix needs SECRET_KEY_BASE at runtime or it crashes on boot"
    fi

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
_build/
deps/
*.ez
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
DOCKERIGNORE_EOF
}

# ==========================================
# CLOJURE
# ==========================================

detect_clojure() {
    echo "=== Detective Results ==="

    # Build tool
    if [ -f "project.clj" ]; then
        BUILD_TOOL="lein"
    else
        BUILD_TOOL="deps"
    fi
    echo "[PASS] Build tool: $BUILD_TOOL"

    # Framework
    if [ -f "project.clj" ]; then
        if grep -q "ring\|compojure" project.clj 2>/dev/null; then
            FRAMEWORK="ring"
        elif grep -q "luminus" project.clj 2>/dev/null; then
            FRAMEWORK="luminus"
        else
            FRAMEWORK="clojure"
        fi
    else
        FRAMEWORK="clojure"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "PORT\|port" --include="*.clj" --include="*.edn" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="3000"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Data dirs
    detect_data_dirs

    # Builder follows the pinned JDK (temurin tags are current; the old
    # openjdk-11-* tags are legacy). Default stays 11: frozen on purpose,
    # declare .java-version to move (matches the repo version-file policy).
    CLJ_JAVA="11"
    if [ -n "$JAVA_PINNED" ]; then CLJ_JAVA="$JAVA_MAJOR"; fi
    CLJ_LEIN_IMAGE="${CLJ_LEIN_IMAGE:-clojure:temurin-${CLJ_JAVA}-lein}"
    CLJ_DEPS_IMAGE="${CLJ_DEPS_IMAGE:-clojure:temurin-${CLJ_JAVA}-tools-deps}"
    if [ "$CLJ_JAVA" != "11" ]; then echo "[PASS] Clojure JDK: $CLJ_JAVA (from version file)"; fi

    # Generate Dockerfile
    if [ "$BUILD_TOOL" = "lein" ]; then
        cat > Dockerfile-1 << EOF
FROM ${CLJ_LEIN_IMAGE} AS builder
WORKDIR /app
COPY project.clj .
RUN lein deps
COPY . .
RUN lein uberjar && \\
    JAR="\$(find /app/target -type f -name '*.jar' -not -name '*-sources.jar' -not -name '*-javadoc.jar' -printf '%s %p\\n' | sort -nr | head -1 | cut -d' ' -f2-)" && \\
    test -n "\$JAR" && cp "\$JAR" /app/app.jar

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
COPY --from=builder /app/app.jar /app/app.jar
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-jar", "/app/app.jar"]
EOF
    else
        cat > Dockerfile-1 << EOF
FROM ${CLJ_DEPS_IMAGE} AS builder
WORKDIR /app
COPY deps.edn .
RUN clojure -P
COPY . .
RUN clojure -T:build uberjar 2>/dev/null || clojure -X:build uberjar 2>/dev/null || \\
    (echo 'ERROR: no :build uberjar alias in deps.edn - add tools.build with an uberjar alias' >&2; exit 1) && ${JAR_SELECT_MVN}

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
COPY --from=builder /app/app.jar /app/app.jar
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-jar", "/app/app.jar"]
EOF
    fi

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
target/
.lein-*
.nrepl-port
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
DOCKERIGNORE_EOF
}

# ==========================================
# HASKELL
# ==========================================

detect_haskell() {
    echo "=== Detective Results ==="

    # Build tool
    if [ -f "stack.yaml" ]; then
        BUILD_TOOL="stack"
    else
        BUILD_TOOL="cabal"
    fi
    echo "[PASS] Build tool: $BUILD_TOOL"

    # Framework
    if grep -q "yesod" ./*.cabal stack.yaml 2>/dev/null; then
        FRAMEWORK="yesod"
    elif grep -q "servant" ./*.cabal stack.yaml 2>/dev/null; then
        FRAMEWORK="servant"
    elif grep -q "scotty" ./*.cabal stack.yaml 2>/dev/null; then
        FRAMEWORK="scotty"
    else
        FRAMEWORK="haskell"
    fi
    echo "[PASS] Framework: $FRAMEWORK"

    # Port
    PORT_LINE=$(grep -rn "PORT\|port" --include="*.hs" --include="*.yaml" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=_build --exclude-dir=.venv --exclude-dir=dist --exclude-dir=.stack-work --exclude-dir=deps --exclude-dir=.uv-cache --exclude-dir=.bun --exclude-dir=__pypackages__ . 2>/dev/null | head -1)
    PORT=$(port_from "$PORT_LINE")
    if [ -z "$PORT" ]; then
        PORT="8080"; GUESSED="${GUESSED} port"
    fi
    echo "[PASS] Port: $PORT"

    # Health
    detect_health_endpoint
    echo "[PASS] Health: $HEALTH_PATH"

    # Binary name: parse .cabal executable stanza, fallback to folder name
    BINARY=""
    for _cabal in *.cabal; do
        [ -f "$_cabal" ] || continue
        BINARY=$(sed -nE 's/^executable[[:space:]]+([A-Za-z0-9_-]+).*/\1/p' "$_cabal" | head -1)
        [ -n "$BINARY" ] && break
    done
    if [ -z "$BINARY" ]; then BINARY=$(basename "$(pwd)"); fi

    # Data dirs
    detect_data_dirs

    # GHC follows the stack resolver (lts-22 needs 9.6; building with the
    # wrong --system-ghc fails). Cabal builds float on the frozen default.
    HS_IMAGE="haskell:9.4"
    if [ -n "${HASKELL_IMAGE:-}" ]; then
        HS_IMAGE="$HASKELL_IMAGE"
        echo "[PASS] GHC image: $HS_IMAGE (from HASKELL_IMAGE env)"
    elif [ "$BUILD_TOOL" = "stack" ] && [ -f "stack.yaml" ]; then
        _lts=$(sed -nE 's/^resolver:[[:space:]]*lts-([0-9]+).*/\1/p' stack.yaml | head -1)
        case "$_lts" in
            22) HS_IMAGE="haskell:9.6" ;;
            21) HS_IMAGE="haskell:9.4" ;;
            20) HS_IMAGE="haskell:9.2" ;;
        esac
        if [ "$HS_IMAGE" != "haskell:9.4" ]; then echo "[PASS] GHC image: $HS_IMAGE (from stack.yaml resolver)"; fi
    fi

    # Generate Dockerfile (branch on stack vs cabal - COPY must match existing files)
    if [ "$BUILD_TOOL" = "stack" ]; then
        cat > Dockerfile-1 << EOF
FROM ${HS_IMAGE} AS builder
WORKDIR /app
COPY *.cabal stack.yaml ./
RUN stack build --system-ghc --dependencies-only || echo "WARNING: dependency prime failed - full build will retry" >&2
COPY . .
RUN stack build --system-ghc --copy-bins

FROM ${HS_IMAGE}
RUN useradd -m app
WORKDIR /app
COPY --from=builder /root/.local/bin/${BINARY} /usr/local/bin/${BINARY}
EXPOSE ${PORT}
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/bin/sh", "-c", "exec \"\$@\"", "--"]
CMD ["${BINARY}"]
EOF
    else
        cat > Dockerfile-1 << EOF
FROM ${HS_IMAGE} AS builder
WORKDIR /app
COPY *.cabal ./
RUN cabal update
COPY . .
RUN cabal build all --enable-optimization && \\
    BIN=\$(find dist-newstyle -type f -name "${BINARY}" -print -quit) && \\
    cp "\$BIN" /tmp/${BINARY}

FROM ${HS_IMAGE}
RUN useradd -m app
WORKDIR /app
COPY --from=builder /tmp/${BINARY} /usr/local/bin/${BINARY}
EXPOSE ${PORT}
USER app
${HEALTHCHECK_BLOCK}
${VOLUME_LINE}
ENTRYPOINT ["/bin/sh", "-c", "exec \"\$@\"", "--"]
CMD ["${BINARY}"]
EOF
    fi

    # Generate .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
.stack-work/
dist-newstyle/
*.hi
*.o
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
DOCKERIGNORE_EOF
}

# ==========================================
# GENERIC FALLBACK (unknown language - always produce something)
# ==========================================

detect_generic() {
    echo "=== Detective Results ==="

    FRAMEWORK="generic"
    PORT="${PORT:-8080}"
    VOLUME_LINE=""
    GUESSED="port health entrypoint"
    # bug-051: grep for a real route like every other language; a bare
    # guessed /health would ship a permanently-unhealthy container.
    detect_health_endpoint

    # 1. Project already has a Dockerfile? Keep it.
    if [ -f "Dockerfile" ]; then
        cp -f Dockerfile Dockerfile-1
        echo "[PASS] Kept your existing Dockerfile as Dockerfile-1"
        GUESSED="port health entrypoint"
    else
        # 2. A run script? Use it as entrypoint.
        RUN_SH=""
        for _s in entrypoint.sh run.sh start.sh server.sh app.sh main.sh; do
            if [ -f "$_s" ]; then RUN_SH="$_s"; break; fi
        done
        if [ -z "$RUN_SH" ]; then
            RUN_SH=$(find . -maxdepth 2 -name "*.sh" -type f 2>/dev/null | head -1 | sed 's|^\./||')
        fi
        GEN_CHMOD=""
        if [ -n "$RUN_SH" ]; then
            case "$RUN_SH" in
                *[!A-Za-z0-9._/-]*)
                    echo "ERROR: generic entrypoint script path contains unsupported characters: $RUN_SH" >&2
                    exit 1
                    ;;
            esac
            echo "[PASS] Entrypoint script: $RUN_SH"
            GEN_CHMOD="RUN chmod +x \"./${RUN_SH}\""
            GEN_CMD="CMD [\"./${RUN_SH}\"]"
        else
            echo "[WARN] No entrypoint found - edit the TODO CMD in Dockerfile-1"
            GEN_CMD="# TODO: set your start command, e.g. CMD [\"./myapp\"]"
        fi
        cat > Dockerfile-1 << EOF
FROM alpine:${ALPINE_VER}
RUN apk add --no-cache tini wget ca-certificates
WORKDIR /app
COPY . .
${GEN_CHMOD}
EXPOSE ${PORT}
RUN addgroup -S app && adduser -S app -G app
USER app
${HEALTHCHECK_BLOCK}
ENTRYPOINT ["/sbin/tini", "--"]
${GEN_CMD}
EOF
    fi

    # Generic .dockerignore
    cat > .dockerignore-1 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
tests/
test/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
*.log
DOCKERIGNORE_EOF
}

# ==========================================
# MAIN
# ==========================================

echo "=========================================="
echo "GENERATING DOCKERFILE"
echo "=========================================="
echo ""

# D2a: project version files override image defaults (before any detect_*)
detect_tool_versions
if [ "${NODE_IMAGE}" != "node:20-alpine" ]; then echo "[PASS] Node image: $NODE_IMAGE (from version file)"; fi
if [ "${PY_IMAGE}" != "python:3.12.4-alpine" ]; then echo "[PASS] Python image: $PY_IMAGE (from version file)"; fi
if [ "${RUST_VER}" != "1.89-alpine" ]; then echo "[PASS] Rust image: $RUST_VER (from rust-toolchain.toml)"; fi
if [ "${JAVA_MAJOR}" != "21" ]; then echo "[PASS] Java major: $JAVA_MAJOR (from .java-version)"; fi
if [ "${DOTNET_MAJOR}" != "8" ]; then echo "[PASS] .NET major: $DOTNET_MAJOR (from global.json)"; fi
if [ "${GRADLE_VER}" != "8.5" ]; then echo "[PASS] Gradle: $GRADLE_VER (from wrapper properties)"; fi
if [ "${SWIFT_IMAGE}" != "swift:5.10-amazonlinux2" ]; then echo "[PASS] Swift image: $SWIFT_IMAGE (from swift-tools-version)"; fi
if [ "${RUBY_IMAGE}" != "ruby:3.2-alpine" ]; then echo "[PASS] Ruby image: $RUBY_IMAGE (from version file)"; fi
if [ "${ELIXIR_IMAGE}" != "elixir:1.15-alpine" ]; then echo "[PASS] Elixir image: $ELIXIR_IMAGE (from .tool-versions)"; fi
if [ "${PHP_IMAGE}" != "php:8.2-fpm-alpine" ]; then echo "[PASS] PHP image: $PHP_IMAGE (from composer.json)"; fi

# I3: JVM runtimes start slowly - longer healthcheck grace period
case "$LANGUAGE" in
    java|kotlin|scala|clojure) HEALTH_START="60s"; echo "[PASS] Health grace: 60s (JVM)" ;;
esac

case "$LANGUAGE" in
    python)
        detect_python
        ;;
    go)
        detect_go
        ;;
    node)
        detect_node
        ;;
    rust)
        detect_rust
        ;;
    java)
        detect_java
        ;;
    ruby)
        detect_ruby
        ;;
    csharp)
        detect_csharp
        ;;
    php)
        detect_php
        ;;
    kotlin)
        detect_kotlin
        ;;
    swift)
        detect_swift
        ;;
    scala)
        detect_scala
        ;;
    elixir)
        detect_elixir
        ;;
    clojure)
        detect_clojure
        ;;
    haskell)
        detect_haskell
        ;;
    generic)
        detect_generic
        ;;
esac

# ==========================================
# D1b: RE-APPLY USER OVERRIDES (all templates share EXPOSE + localhost URL shape)
# ==========================================

if [ -n "$SAVED_PORT" ]; then
    PORT="$SAVED_PORT"
    # Replace the first port only (bug-050 audit): multi-port lines like
    # Rust's EXPOSE 9000 9001 keep the rest instead of collapsing to one.
    sed -i -E "s/^(EXPOSE )[0-9]+(.*)/\1${PORT}\2/" Dockerfile-1
    sed -i -E "s/(\"--port\", \")[0-9]+/\1${PORT}/" Dockerfile-1
    sed -i -E "s/listen [0-9]+;/listen ${PORT};/g" Dockerfile-1
    if [ "${FRAMEWORK:-}" = "aspnet" ]; then
        sed -i -E "s#(ASPNETCORE_URLS=http://\\+:)[0-9]+#\1${PORT}#" Dockerfile-1
    fi
    if [ "$LANGUAGE" = "php" ]; then
        PHP_RUNTIME="$(printf '%s\n' "$PHP_RUNTIME" | sed "s/listen [0-9]+;/listen ${PORT};/g")"
    fi
    GUESSED=$(echo "$GUESSED" | sed 's/port//g')
fi
if [ -n "$SAVED_HEALTH" ]; then
    HEALTH_PATH="$SAVED_HEALTH"
    GUESSED=$(echo "$GUESSED" | sed 's/health//g')
fi
if [ -n "$SAVED_PORT$SAVED_HEALTH" ]; then
    sed -i -E "s|http://localhost:[0-9]+[^ \"']*|http://localhost:${PORT}${HEALTH_PATH}|" Dockerfile-1
    echo "[PASS] Overrides applied: PORT=$PORT HEALTH=$HEALTH_PATH"
fi
# bug-051: refresh the health block with post-override values - Dockerfile-2
# (generated below) interpolates the block, Dockerfile-1 was fixed by the sed.
build_healthcheck_block

# ==========================================
# D1c: PRIVATE REGISTRIES - secrets stay out of layers (BuildKit mounts)
# ==========================================

REGISTRY_NOTICE=""
SECRET_FLAGS=""
for _sec in .npmrc pip.conf .pypirc .netrc auth.json settings.xml .bundle/config; do
    if [ -f "$_sec" ]; then
        grep -qxF "$_sec" .dockerignore-1 2>/dev/null || printf '%s\n' "$_sec" >> .dockerignore-1
        REGISTRY_NOTICE="${REGISTRY_NOTICE}${_sec} "
        # ids must match the --mount=type=secret,id=X targets in Dockerfile-1
        case "$_sec" in
            .npmrc) SECRET_FLAGS="$SECRET_FLAGS --secret id=npmrc,src=.npmrc" ;;
            pip.conf) SECRET_FLAGS="$SECRET_FLAGS --secret id=pipconf,src=pip.conf" ;;
            .pypirc) SECRET_FLAGS="$SECRET_FLAGS --secret id=pipconf,src=.pypirc" ;;
            .netrc) SECRET_FLAGS="$SECRET_FLAGS --secret id=netrc,src=.netrc" ;;
            auth.json) SECRET_FLAGS="$SECRET_FLAGS --secret id=composer,src=auth.json" ;;
            settings.xml) SECRET_FLAGS="$SECRET_FLAGS --secret id=maven,src=settings.xml" ;;
            .bundle/config) SECRET_FLAGS="$SECRET_FLAGS --secret id=bundle,src=.bundle/config" ;;
        esac
    fi
done
if [ -f ".npmrc" ]; then
    # npm-family installs all read .npmrc (npm/pnpm/yarn-classic); bun does
    # not (bunfig.toml) - covered by the WARN below, not a silent miss.
    sed -i 's|^RUN npm ci|RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci|' Dockerfile-1
    sed -i 's|^RUN npm install|RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install|' Dockerfile-1
    sed -i '/^RUN .*pnpm i/ s|^RUN |RUN --mount=type=secret,id=npmrc,target=/root/.npmrc |' Dockerfile-1
    sed -i '/^RUN .*yarn install/ s|^RUN |RUN --mount=type=secret,id=npmrc,target=/root/.npmrc |' Dockerfile-1
    if grep -q 'id=npmrc' Dockerfile-1 2>/dev/null; then
        echo "[PASS] Private registry: .npmrc via BuildKit secret (not in image)"
    fi
    if grep -qE '^RUN (.* )?bun install' Dockerfile-1 2>/dev/null; then
        echo "[WARN] .npmrc present but bun reads bunfig.toml - wire the private registry manually"
    fi
fi
if [ -f "pip.conf" ] || [ -f ".pypirc" ]; then
    _pipsec="pip.conf"; [ -f ".pypirc" ] && _pipsec=".pypirc"
    sed -i "s|^RUN pip install \(.*\)|RUN --mount=type=secret,id=pipconf,target=/etc/pip.conf pip install \1|" Dockerfile-1
    if grep -q 'id=pipconf' Dockerfile-1 2>/dev/null; then
        echo "[PASS] Private registry: ${_pipsec} via BuildKit secret (not in image)"
    fi
    # uv (sync/pip), poetry, pipenv and pdm ignore pip.conf - say so instead
    # of printing a PASS the mount never earned (bug-049 audit).
    if grep -qE '^RUN (uv pip|uv sync|poetry|pipenv|pdm) ' Dockerfile-1 2>/dev/null; then
        echo "[WARN] ${_pipsec} present but this installer ignores pip.conf - configure its private index manually"
    fi
fi

# ==========================================
# E6: ESCAPE HATCHES - user lines before final USER (all templates: exactly one)
# Usage: EXTRA_COPY="COPY ca.crt /usr/local/share/ca-certificates/"
#        EXTRA_RUN="RUN apk add --no-cache ffmpeg"
# ==========================================

if [ -n "${EXTRA_COPY:-}" ] || [ -n "${EXTRA_RUN:-}" ]; then
    _extra_tmp=$(mktemp)
    [ -n "${EXTRA_COPY:-}" ] && printf '%s\n' "$EXTRA_COPY" >> "$_extra_tmp"
    [ -n "${EXTRA_RUN:-}" ] && printf '%s\n' "$EXTRA_RUN" >> "$_extra_tmp"
    if grep -q "^USER " Dockerfile-1; then
        awk 'v==0 && /^USER /{while((getline l < ef)>0)print l; v=1} {print}' ef="$_extra_tmp" Dockerfile-1 > Dockerfile-1.extra && mv -f Dockerfile-1.extra Dockerfile-1
        echo "[PASS] Extra lines inserted before USER"
    else
        echo "[WARN] EXTRA_* set but no USER line found - ignored"
    fi
    rm -f "$_extra_tmp"
fi

# ==========================================
# ENV NAMES - ARG/ENV passthrough after builder WORKDIR (first one wins,
# so values are visible to every install/build RUN below). Same awk trick.
# ==========================================

detect_env_names
if { [ "${FRAMEWORK:-}" = "vue-spa" ] || [ "${FRAMEWORK:-}" = "vite-spa" ]; } && [ -n "$ENV_ARG_BLOCK" ]; then
    # Static bake: ARG alone is already visible to RUN steps as env, so the
    # ENV re-export would only duplicate it in the builder and lie in a
    # runtime that never reads env. Strip it, keep ARG + secret comments.
    ENV_ARG_BLOCK=$(printf '%s\n' "$ENV_ARG_BLOCK" | grep -v '^ENV ' || true)
fi
if [ -n "$ENV_ARG_BLOCK" ]; then
    if grep -q "^WORKDIR " Dockerfile-1; then
        # Every WORKDIR (builder + runtime stages): ARG re-declared per stage
        # so --build-arg reaches both, ENV persists into the container.
        # Static sites (nginx runner) are the exception: the runtime serves
        # already-baked files, so runtime ENVs would be dead weight - later
        # stages get ARG lines (and secret comments) only, no ENV.
        ENV_ARG_RT_BLOCK="$ENV_ARG_BLOCK"
        if [ "${FRAMEWORK:-}" = "vue-spa" ] || [ "${FRAMEWORK:-}" = "vite-spa" ]; then
            ENV_ARG_RT_BLOCK=$(printf '%s\n' "$ENV_ARG_BLOCK" | grep -v '^ENV ' || true)
        fi
        # Variable splice (not getline): a file can only be spliced once.
        awk -v blk="$ENV_ARG_BLOCK" -v rt="$ENV_ARG_RT_BLOCK" '/^WORKDIR /{print; n++; if (n==1) print blk; else if (rt != "") print rt; next} {print}' Dockerfile-1 > Dockerfile-1.envenv && mv -f Dockerfile-1.envenv Dockerfile-1
        echo "[PASS] Env passthrough inserted after WORKDIR (all stages)"
    else
        echo "[WARN] No WORKDIR line found - env names printed only, not inserted"
    fi
fi

# ==========================================
# OCI LABELS - supply-chain facts on every D1 image (before ENTRYPOINT,
# same E6 trick: all templates carry exactly one ENTRYPOINT line)
# ==========================================

_oid_tmp=$(mktemp)
printf 'LABEL org.opencontainers.image.title="%s" \\\n      org.opencontainers.image.source="%s" \\\n      org.opencontainers.image.revision="%s"\n' "$APP_TITLE" "$IMAGE_SOURCE" "$VCS_REF" > "$_oid_tmp"
if grep -q "^ENTRYPOINT " Dockerfile-1; then
    awk 'v==0 && /^ENTRYPOINT /{while((getline l < ef)>0)print l; v=1} {print}' ef="$_oid_tmp" Dockerfile-1 > Dockerfile-1.oci && mv -f Dockerfile-1.oci Dockerfile-1
    echo "[PASS] OCI labels: $APP_TITLE / $VCS_REF"
else
    echo "[WARN] No ENTRYPOINT line found - OCI labels skipped"
fi
rm -f "$_oid_tmp"

# ==========================================
# STOPSIGNAL + EXTRA_DIRECTIVES - final lines before ENTRYPOINT.
# STOPSIGNAL is user-pinned only (validated at load). EXTRA_DIRECTIVES is a
# raw snippet for the instructions no template emits (ADD/ONBUILD/SHELL and
# friends): allowlisted, anything else is a hard error (no silent smuggling
# of FROM/RUN/COPY/CMD/ENTRYPOINT past their dedicated paths).
# MAINTAINER is deliberately NOT supported: deprecated since Docker 1.13,
# LABEL maintainer (see OCI block above) is the replacement.
# ==========================================

if [ -n "${STOPSIGNAL:-}" ]; then
    _sig_tmp=$(mktemp)
    printf 'STOPSIGNAL %s\n' "$STOPSIGNAL" > "$_sig_tmp"
    if grep -q "^ENTRYPOINT " Dockerfile-1; then
        awk 'v==0 && /^ENTRYPOINT /{while((getline l < ef)>0)print l; v=1} {print}' ef="$_sig_tmp" Dockerfile-1 > Dockerfile-1.sig && mv -f Dockerfile-1.sig Dockerfile-1
        echo "[PASS] Stopsignal inserted before ENTRYPOINT"
    else
        printf 'STOPSIGNAL %s\n' "$STOPSIGNAL" >> Dockerfile-1
        echo "[PASS] Stopsignal appended (no ENTRYPOINT line to precede)"
    fi
    rm -f "$_sig_tmp"
fi
if [ -n "${EXTRA_DIRECTIVES:-}" ]; then
    _dir_tmp=$(mktemp)
    printf '%s\n' "$EXTRA_DIRECTIVES" > "$_dir_tmp"
    if grep -q "^ENTRYPOINT " Dockerfile-1; then
        awk 'v==0 && /^ENTRYPOINT /{while((getline l < ef)>0)print l; v=1} {print}' ef="$_dir_tmp" Dockerfile-1 > Dockerfile-1.dir && mv -f Dockerfile-1.dir Dockerfile-1
        echo "[PASS] Extra directives inserted before ENTRYPOINT"
    else
        cat "$_dir_tmp" >> Dockerfile-1
        echo "[PASS] Extra directives appended (no ENTRYPOINT line to precede)"
    fi
    rm -f "$_dir_tmp"
fi

# ==========================================
# BUILD CHEAT-SHEET - copy-paste commands as end-of-file comments.
# Values are never filled in (that would bake secrets/addresses into the
# file): --build-arg NAME=... shows WHAT to pass, the user supplies values.
# Secrets ride --secret flags (same ids as the NEXT STEPS hint). Comments
# only: invisible to builds, linters, --check groups and static_ok.
# ==========================================

# CLIENT SHAPE (computed once for cheat-sheet + CLIENT RULE below):
# port+health both defaulted = worker/client with no door. No -p mapping,
# no HEALTHCHECK (knocks air), no default VOLUME (anonymous-volume garbage),
# no /data /logs drawer setup (nothing writes files).
CLIENT_SHAPE=0
if [[ "$GUESSED" == *port* ]] && [[ "$GUESSED" == *health* ]]; then CLIENT_SHAPE=1; fi

{
_img=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_.-')
[ -z "$_img" ] && _img="my-app"
_line="# docker build -t ${_img}:1 -f Dockerfile-1"
# Names are single words by construction.
# shellcheck disable=SC2086
for _n in $ENV_ARG_NAMES; do
    _line="${_line} --build-arg ${_n}=..."
done
if [ -n "${SECRET_FLAGS:-}" ]; then
    _line="${_line}${SECRET_FLAGS}"
fi
_line="${_line} ."
echo "# --- build & run (generated cheat-sheet, safe to delete) ---"
echo "$_line"
# Run line lists every detected env for remembering (-e is also the correct
# channel for secret-like names: runtime-passed, never baked). Port mapping
# mirrors NEXT STEPS.
_run_envs=""
# shellcheck disable=SC2086
for _n in $ENV_ARG_NAMES $ENV_ARG_SECRETS; do
    _run_envs="${_run_envs} -e ${_n}=..."
done
if [ -n "$_run_envs" ]; then
    echo "# docker run --rm ${_img}:1 \\"
    if [ "$CLIENT_SHAPE" = "1" ]; then
        echo "#  ${_run_envs# }"
    else
        echo "#  ${_run_envs# } \\"
        echo "#   -p ${PORT}:${PORT}"
    fi
else
    if [ "$CLIENT_SHAPE" = "1" ]; then
        echo "# docker run --rm ${_img}:1"
    else
        echo "# docker run --rm ${_img}:1 -p ${PORT}:${PORT}"
    fi
fi
} >> Dockerfile-1
echo "[PASS] Build cheat-sheet appended to Dockerfile-1"

# ==========================================
# CLIENT RULE - don't assert what wasn't detected (all languages).
# Port+health both defaulted means worker/client shape: a HEALTHCHECK would
# knock air (orchestrators then kill HEALTHY loop clients!), a default
# VOLUME pair only makes anonymous-volume garbage, the /data /logs drawer
# setup is dead weight when no VOLUME remains, and a -p mapping publishes
# a door that doesn't exist. EXPOSE stays: it is documentation-only
# (harmless) and static_ok + readers rely on it.
# Stripped lines leave a marker comment so the absence is declared, not
# accidental. Forced server shape: PORT=/HEALTH= env (D1b already clears
# those words from GUESSED, so explicit pins skip this block by construction).
# ==========================================

if [ "$CLIENT_SHAPE" = "1" ]; then
    # bug-051: guessed routes no longer emit a ^HEALTHCHECK line (they carry
    # the "# HEALTHCHECK omitted" comment instead) - the client-shape rewrite
    # must swallow THAT comment (2 lines) too, or the marker never lands.
    awk '/^HEALTHCHECK / || /^# HEALTHCHECK omitted:/{print "# no HEALTHCHECK: client shape (no port/health detected) - force server shape with PORT=/HEALTH="; skip=1; next} skip{skip=0; next} {print}' Dockerfile-1 > Dockerfile-1.lean && mv -f Dockerfile-1.lean Dockerfile-1
    grep -vF 'VOLUME ["/data", "/logs"]' Dockerfile-1 > Dockerfile-1.lean && mv -f Dockerfile-1.lean Dockerfile-1
    # No VOLUME left = nothing needs drawers: collapse the Rust user-setup
    # RUN back to bare user creation (other languages detect real data dirs,
    # and then a VOLUME remains, so their setup is kept by construction).
    if ! grep -q '^VOLUME ' Dockerfile-1 2>/dev/null \
        && grep -q 'mkdir -p /data /logs' Dockerfile-1 2>/dev/null; then
        awk '/^RUN addgroup -S app && adduser -S app -G app && \\$/{print "RUN addgroup -S app && adduser -S app -G app"; skip=3; next} skip>0{skip--; next} {print}' Dockerfile-1 > Dockerfile-1.lean && mv -f Dockerfile-1.lean Dockerfile-1
    fi
    echo "[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)"
fi

# ==========================================
# --CHECK: compare fresh Dockerfile-1 against the pre-run baseline,
# restore every file, exit 0 (in sync) / 1 (drift) / 2 (no baseline)
# ==========================================

if [ "$CHECK_MODE" = "1" ]; then
    if [ ! -f "${_base1}.precheck" ]; then
        echo "CHECK: no ${_base1} baseline here - run once without --check first"
        check_restore
        exit 2
    fi
    _drift=0
    # LABEL continuations (^ org.opencontainers...) compared too, else a
    # revision change hides. `# ARG` secret comments stay OUT on purpose:
    # advisory only, and their code change always moves a real line as well.
    # ^RUN is compared too (bug-049 audit): installer switches (ts-node dev
    # deps, vendored download removal) move no other line. Generation is
    # deterministic - same repo always yields the same RUN lines, so a diff
    # here is real drift, never float noise.
    for _key in '^FROM ' '^EXPOSE ' '^HEALTHCHECK ' '^ENTRYPOINT ' '^CMD ' '^USER ' '^STOPSIGNAL ' '^LABEL ' '^ +org\.opencontainers' '^VOLUME ' '^ARG ' '^ENV ' '^RUN '; do
        _old=$(grep -E "$_key" "${_base1}.precheck" 2>/dev/null || true)
        _new=$(grep -E "$_key" Dockerfile-1 2>/dev/null || true)
        if [ "$_old" != "$_new" ]; then
            echo "DRIFT ${_key}: '${_old}' -> '${_new}'"
            _drift=$((_drift+1))
        fi
    done
    # .dockerignore-1 is regenerated too (bug-049 audit): an ignore-only fix
    # never moves a Dockerfile-1 line, so compare the file itself.
    if [ -f ".dockerignore-1.precheck" ] && ! cmp -s .dockerignore-1 .dockerignore-1.precheck; then
        echo "DRIFT .dockerignore-1: content changed - run without --check to regenerate"
        _drift=$((_drift+1))
    fi
    # bug-051: do NOT restore/exit yet - fall through so Dockerfile-2 and
    # .dockerignore-2 regenerate and get compared; finalize happens after
    # the D2 section (see the CHECK FINALIZE block).
fi

# ==========================================
# DOCKERFILE-2: DOWNLOAD PREBUILT BINARY
# ==========================================

echo ""
echo "=== Checking for GitHub repository ==="
if [ "$SKIP_D2" = "1" ]; then
    GITHUB_REPO=""
    echo "(--no-dockerfile-2: skipping)"
else
    detect_github_repo
fi

if [ -n "$GITHUB_REPO" ]; then
    echo ""
    echo "=== Generating Dockerfile-2 (download prebuilt binary) ==="

    # No registry/binary-release D2 exists for static sites or Deno runtimes:
    # an npm `install -g` would be nonsense there. Skip loudly, not wrongly.
    if [ "${FRAMEWORK:-}" = "vue-spa" ] || [ "${FRAMEWORK:-}" = "vite-spa" ] || [ "${PKG_MGR:-}" = "deno" ]; then
        echo "[WARN] No Dockerfile-2 for $FRAMEWORK/$PKG_MGR runtimes - D1 (source build) is the way"
        GITHUB_REPO=""
    fi
fi

if [ -n "$GITHUB_REPO" ]; then
    case "$LANGUAGE" in
        rust)
            # Rust: Download prebuilt binary from GitHub Releases
            # G1: second port 9001 is rustfs-specific - only expose it for 9000
            if [ "${PORT}" = "9000" ]; then RUST_D2_EXPOSE="EXPOSE 9000 9001"; else RUST_D2_EXPOSE="EXPOSE ${PORT}"; fi
            cat > Dockerfile-2 << EOF
# Stage 1: Download prebuilt binary
FROM alpine:3.24.1 AS build

ARG TARGETARCH
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2

RUN apk add --no-cache ca-certificates curl jq unzip
WORKDIR /build

RUN set -eux; \\
    case "\$TARGETARCH" in \\
       amd64)  ARCH_SUBSTR="x86_64-musl"  ;; \\
       arm64)  ARCH_SUBSTR="aarch64-musl" ;; \\
       *) echo "WARNING: unsupported TARGETARCH=\$TARGETARCH; using amd64 fallback" >&2; ARCH_SUBSTR="x86_64-musl" ;; \\
    esac; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
      TAG="\$(printf '%s' "\$RELEASE_JSON" | jq -r '.tag_name // empty')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$TAG" ] || [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_SUBSTR" '.assets[] | select((.name | contains(\$arch)) and (.name | endswith(".zip"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    ASSET_EXT="zip"; \\
    if [ -z "\$ASSET_JSON" ]; then \\
      ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_SUBSTR" '.assets[] | select((.name | contains(\$arch)) and (.name | endswith(".tar.gz"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
      ASSET_EXT="tar.gz"; \\
    fi; \\
    if [ -z "\$ASSET_JSON" ]; then echo "Failed to locate release asset (.zip or .tar.gz)" >&2; exit 1; fi; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate URL" >&2; exit 1; fi; \\
    echo "Downloading: \$URL"; \\
    curl -fL "\$URL" -o ${BINARY_NAME}.\$ASSET_EXT; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  ${BINARY_NAME}.'\$ASSET_EXT'\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi; \\
    if [ "\$ASSET_EXT" = "zip" ]; then \\
      unzip -q ${BINARY_NAME}.\$ASSET_EXT -d /build; \\
      if [ ! -x /build/${BINARY_NAME} ]; then \\
        BIN_PATH="\$(unzip -Z -1 ${BINARY_NAME}.\$ASSET_EXT | grep -E '(^|/)${BINARY_NAME}\$' | head -n 1 || true)"; \\
        if [ -n "\$BIN_PATH" ]; then \\
          mkdir -p /build/.tmp && unzip -q ${BINARY_NAME}.\$ASSET_EXT "\$BIN_PATH" -d /build/.tmp && \\
          mv "/build/.tmp/\$BIN_PATH" /build/${BINARY_NAME}; \\
        fi; \\
      fi; \\
    else \\
      tar -xzf ${BINARY_NAME}.\$ASSET_EXT -C /build; \\
      if [ ! -x /build/${BINARY_NAME} ]; then \\
        BIN_PATH="\$(tar -tzf ${BINARY_NAME}.\$ASSET_EXT | grep -E '${BINARY_NAME}\$' | head -n 1 || true)"; \\
        if [ -n "\$BIN_PATH" ]; then \\
          mv "/build/\$BIN_PATH" /build/${BINARY_NAME}; \\
        fi; \\
      fi; \\
    fi; \\
    [ -x /build/${BINARY_NAME} ] || { echo "Binary not found" >&2; exit 1; }; \\
    chmod +x /build/${BINARY_NAME}; \\
    rm -rf ${BINARY_NAME}.\$ASSET_EXT /build/.tmp || true

# Stage 2: Runtime
FROM alpine:3.24.1

ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
ARG BUILD_DATE
ARG VCS_REF

LABEL name="${BINARY_NAME}" \\
      vendor="${GITHUB_REPO%%/*}" \\
      version="\${RELEASE}" \\
      build-date="\${BUILD_DATE}" \\
      vcs-ref="\${VCS_REF}"

RUN apk add --no-cache ca-certificates coreutils curl tzdata wget

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /build/${BINARY_NAME} /usr/bin/${BINARY_NAME}

RUN addgroup -g 10001 -S app && \\
    adduser -u 10001 -G app -S app -D && \\
    mkdir -p /data /logs && \\
    chown -R app:app /data /logs && \\
    chmod 0750 /data /logs

${RUST_D2_EXPOSE}
VOLUME ["/data", "/logs"]
USER app

${HEALTHCHECK_BLOCK}

CMD ["/usr/bin/${BINARY_NAME}"]
EOF
            echo "Created: Dockerfile-2 (Rust - GitHub Releases)"
            ;;
        
        go)
            # Go: Download prebuilt binary from GitHub Releases
            # detect_go names it BINARY; D2 templates use BINARY_NAME (rust-style)
            # GoReleaser asset names use amd64/arm64 (NOT x86_64 - that mapping
            # belongs to the Rust musl template)
            BINARY_NAME="$BINARY"
            if [ -n "${D2_ASSET_URL:-}" ]; then
                # Custom release channel (bug-047): static hosts like get.helm.sh
                # publish no GitHub Assets, so the API lookup below can never
                # match. $TAG/$ARCH_SUBSTR in the URL expand at image build time
                # (values pass through verbatim - never expanded here).
                _d2url="$D2_ASSET_URL"
                _d2sha="${D2_ASSET_SHA_URL:-}"
                _d2ext="tar.gz"; _d2apk="ca-certificates curl"
                _d2unpack="tar -xzf ${BINARY_NAME}.tar.gz -C /build;"
                case "$D2_ASSET_URL" in
                    *.zip) _d2ext="zip"; _d2apk="ca-certificates curl unzip"
                        _d2unpack="unzip -q ${BINARY_NAME}.zip -d /build;" ;;
                esac
                if [ -n "$_d2sha" ]; then
                    _d2verify="    SHA_EXPECTED=\"\$(curl -fsSL \"$_d2sha\" | cut -d' ' -f1)\"; \\
    echo \"\$SHA_EXPECTED  ${BINARY_NAME}.${_d2ext}\" | sha256sum -c -; \\"
                else
                    _d2verify="    echo \"WARNING: no checksum URL configured (D2_ASSET_SHA_URL) - skipping verification\" >&2; \\"
                fi
                cat > Dockerfile-2 << EOF
# Stage 1: Download prebuilt binary (custom channel: D2_ASSET_URL)
FROM alpine:3.24.1 AS build

ARG TARGETARCH
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
ARG BUILD_DATE
ARG VCS_REF

RUN apk add --no-cache ${_d2apk}
WORKDIR /build

RUN set -eux; \\
    case "\$TARGETARCH" in \\
       amd64)  ARCH_SUBSTR="amd64"  ;; \\
       arm64)  ARCH_SUBSTR="arm64" ;; \\
       *) echo "WARNING: unsupported TARGETARCH=\$TARGETARCH; using amd64 fallback" >&2; ARCH_SUBSTR="amd64" ;; \\
    esac; \\
    TAG="\$RELEASE"; \\
    URL="${_d2url}"; \\
    echo "Downloading: \$URL"; \\
    curl -fL "\$URL" -o ${BINARY_NAME}.${_d2ext}; \\
${_d2verify}
    ${_d2unpack} \\
    chmod +x /build/${BINARY_NAME}; \\
    rm -rf ${BINARY_NAME}.${_d2ext}

# Stage 2: Runtime
FROM alpine:3.24.1

ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
ARG BUILD_DATE
ARG VCS_REF

LABEL name="${BINARY_NAME}" \\
      vendor="${GITHUB_REPO%%/*}" \\
      version="\${RELEASE}" \\
      build-date="\${BUILD_DATE}" \\
      vcs-ref="\${VCS_REF}"

RUN apk add --no-cache ca-certificates wget

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /build/${BINARY_NAME} /usr/local/bin/${BINARY_NAME}

RUN addgroup -S app && adduser -S app -G app

EXPOSE ${PORT}
USER app

${HEALTHCHECK_BLOCK}

CMD ["${BINARY_NAME}"]
EOF
                echo "Created: Dockerfile-2 (Go - custom channel)"
                echo "  D2 channel: pass --build-arg RELEASE=<tag> (static channels have no 'latest')"
            else
            cat > Dockerfile-2 << EOF
# Stage 1: Download prebuilt binary
FROM alpine:3.24.1 AS build

ARG TARGETARCH
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2

RUN apk add --no-cache ca-certificates curl jq unzip
WORKDIR /build

RUN set -eux; \\
    case "\$TARGETARCH" in \\
       amd64)  ARCH_SUBSTR="amd64"  ;; \\
       arm64)  ARCH_SUBSTR="arm64" ;; \\
       *) echo "WARNING: unsupported TARGETARCH=\$TARGETARCH; using amd64 fallback" >&2; ARCH_SUBSTR="amd64" ;; \\
    esac; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
      TAG="\$(printf '%s' "\$RELEASE_JSON" | jq -r '.tag_name // empty')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$TAG" ] || [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_SUBSTR" '.assets[] | select((.name | contains(\$arch)) and (.name | endswith(".zip"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    ASSET_EXT="zip"; \\
    if [ -z "\$ASSET_JSON" ]; then \\
      ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_SUBSTR" '.assets[] | select((.name | contains(\$arch)) and (.name | endswith(".tar.gz"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
      ASSET_EXT="tar.gz"; \\
    fi; \\
    if [ -z "\$ASSET_JSON" ]; then echo "Failed to locate release asset (.zip or .tar.gz)" >&2; exit 1; fi; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate URL" >&2; exit 1; fi; \\
    echo "Downloading: \$URL"; \\
    curl -fL "\$URL" -o ${BINARY_NAME}.\$ASSET_EXT; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  ${BINARY_NAME}.'\$ASSET_EXT'\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi; \\
    if [ "\$ASSET_EXT" = "zip" ]; then \\
      unzip -q ${BINARY_NAME}.\$ASSET_EXT -d /build; \\
    else \\
      tar -xzf ${BINARY_NAME}.\$ASSET_EXT -C /build; \\
    fi; \\
    chmod +x /build/${BINARY_NAME}; \\
    rm -rf ${BINARY_NAME}.\$ASSET_EXT /build/.tmp || true

# Stage 2: Runtime
FROM alpine:3.24.1

ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
ARG BUILD_DATE
ARG VCS_REF

LABEL name="${BINARY_NAME}" \\
      vendor="${GITHUB_REPO%%/*}" \\
      version="\${RELEASE}" \\
      build-date="\${BUILD_DATE}" \\
      vcs-ref="\${VCS_REF}"

RUN apk add --no-cache ca-certificates wget

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /build/${BINARY_NAME} /usr/local/bin/${BINARY_NAME}

RUN addgroup -S app && adduser -S app -G app

EXPOSE ${PORT}
USER app

${HEALTHCHECK_BLOCK}

CMD ["${BINARY_NAME}"]
EOF
            echo "Created: Dockerfile-2 (Go - GitHub Releases)"
            fi
            ;;
        
        node)
            # Node.js: Download from npm registry
            PKG_NAME=$(sed -nE 's/.*"name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | head -1)
            # E2: 3-tier CMD - package bin > npm start > require (require-only exits instantly for apps)
            PKG_BIN=$(sed -nE 's/.*"[.]bin"[[:space:]]*:[[:space:]]*\{[^}]*"[^"]+"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | head -1)
            if [ -z "$PKG_BIN" ]; then
                PKG_BIN=$(python3 -c "import json;print(list(json.load(open('package.json')).get('bin',{}).values())[0])" 2>/dev/null || true)
            fi
            HAS_START=$(sed -nE 's/.*"start"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json 2>/dev/null | head -1)
            if [ -n "$PKG_BIN" ]; then
                NODE_D2_CMD="CMD [\"node\", \"/usr/local/lib/node_modules/${PKG_NAME}/${PKG_BIN}\"]"
            elif [ -n "$HAS_START" ]; then
                NODE_D2_CMD="CMD [\"npm\", \"start\", \"--prefix\", \"/usr/local/lib/node_modules/${PKG_NAME}\"]"
            else
                NODE_D2_CMD="CMD [\"node\", \"-e\", \"require('${PKG_NAME}')\"]"
            fi
            echo "[PASS] Dockerfile-2 start: $(echo "$NODE_D2_CMD" | head -c 60)"
            # Registry install is manager-agnostic (same public tarball for
            # npm/pnpm/yarn/bun), so D2 keeps npm even when D1 used $PKG_MGR.
            echo "[PASS] Dockerfile-2 installer: npm (D1 manager $PKG_MGR applies to project installs only)"
            cat > Dockerfile-2 << EOF
FROM ${NODE_IMAGE} AS build
ARG APP_VERSION=latest
RUN npm install -g ${PKG_NAME}@\${APP_VERSION} 2>/dev/null || { echo "WARNING: registry has no version \${APP_VERSION} for ${PKG_NAME} - installing latest" >&2; npm install -g ${PKG_NAME}; }
WORKDIR /usr/local/lib/node_modules/${PKG_NAME}
RUN npm prune --production 2>/dev/null || true

FROM ${NODE_IMAGE}
RUN apk add --no-cache tini wget
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=build /usr/local/bin /usr/local/bin
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
${NODE_D2_CMD}
EOF
            echo "Created: Dockerfile-2 (Node.js - npm)"
            ;;
        
        python)
            # Python: Install from PyPI (first real package line - skip comments/flags/URLs).
            # Uses the D1-detected requirements variant (requirements/prod.txt etc),
            # not hardcoded requirements.txt. Installer follows D1 too (uv pip vs pip).
            PY_D2_REQ="${PY_REQ_FILE:-requirements.txt}"
            PKG_NAME=$(grep -vE '^[[:space:]]*(#|$|-r|--)' "$PY_D2_REQ" 2>/dev/null | grep -vE '^(git\+|https?://|\.)' | head -1 | sed 's/[>=<;].*$//' | sed 's/\[.*$//' | tr -d '[:space:]')
            if [ -z "$PKG_NAME" ]; then PKG_NAME=$(basename "$(pwd)"); fi
            # E7: PyPI name vs local module often differ - warn, don't silently break
            _norm_pkg=$(echo "$PKG_NAME" | tr '[:upper:]-' '[:lower:]_')
            _norm_mod=$(echo "$MODULE" | tr '[:upper:]-' '[:lower:]_')
            if [ "$_norm_pkg" != "$_norm_mod" ]; then
                echo "[WARN] Dockerfile-2 installs PyPI package '${PKG_NAME}' but runs module '${MODULE}:${APP_VAR}' - check the CMD if the container exits"
            fi
            PY_D2_HEAD=""
            PY_D2_PIP="pip install --no-cache-dir --break-system-packages"
            if [ "$PY_MGR" = "uv" ] || [ "$PY_MGR" = "uv-nolock" ]; then
                PY_D2_HEAD="COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/"
                PY_D2_PIP="uv pip install --system --no-cache"
                echo "[PASS] Dockerfile-2 installer: uv pip (mirrors D1 manager $PY_MGR)"
            fi
            # requirements variant may not exist (pyproject-only) - COPY would fail
            if [ -f "$PY_D2_REQ" ]; then
                PY_D2_DEPS="COPY ${PY_D2_REQ} .
RUN ${PY_D2_PIP} -r ${PY_D2_REQ}"
            else
                PY_D2_DEPS=""
            fi
            cat > Dockerfile-2 << EOF
FROM ${PY_IMAGE}
${PY_D2_HEAD}
ARG APP_VERSION=latest
RUN apk add --no-cache tini wget
WORKDIR /app
RUN ${PY_D2_PIP} ${PKG_NAME}==\${APP_VERSION} 2>/dev/null || { echo "WARNING: registry has no version \${APP_VERSION} for ${PKG_NAME} - installing latest" >&2; ${PY_D2_PIP} ${PKG_NAME}; }
${PY_D2_DEPS}
COPY . .
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
# Same start command as Dockerfile-1 (framework-aware). A hardcoded server
# name here used to crash non-fastapi D2 containers, so the D1 value is reused.
${CMD}
EOF
            echo "Created: Dockerfile-2 (Python - PyPI)"
            ;;
        
        java)
            # Java: Download JAR from GitHub Releases
            cat > Dockerfile-2 << EOF
FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine AS build
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apk add --no-cache curl jq
WORKDIR /app
RUN set -eux; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".jar")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate jar asset" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.jar; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  app.jar\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
COPY --from=build /app/app.jar /app/app.jar
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-jar", "/app/app.jar"]
EOF
            echo "Created: Dockerfile-2 (Java - GitHub Releases)"
            ;;
        
        ruby)
            # Ruby: Install from RubyGems (single- AND double-quoted gem names)
            PKG_NAME=$(sed -nE "s/.*gem[[:space:]]+'([^']+)'.*/\1/p" Gemfile 2>/dev/null | head -1)
            if [ -z "$PKG_NAME" ]; then
                PKG_NAME=$(sed -nE 's/.*gem[[:space:]]+"([^"]+)".*/\1/p' Gemfile 2>/dev/null | head -1)
            fi
            if [ -z "$PKG_NAME" ]; then
                echo "ERROR: no gem name found in Gemfile - cannot build Dockerfile-2" >&2
                exit 1
            fi
            cat > Dockerfile-2 << EOF
FROM ${RUBY_IMAGE}
RUN apk add --no-cache tini wget
WORKDIR /app
RUN gem install ${PKG_NAME} --no-document
${RUBY_DEPS_COPY}
${BUNDLER_PIN}
${RUBY_RUN} bundle config set --local without 'test development' && bundle install${BUNDLE_LOCAL} || (echo 'ERROR: bundle install failed - check Gemfile' >&2; exit 1)
COPY . .
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bundle", "exec", "rackup", "-p", "${PORT}"]
EOF
            echo "Created: Dockerfile-2 (Ruby - RubyGems)"
            ;;
        
        csharp)
            # C#: Download self-contained publish zip from GitHub Releases
            cat > Dockerfile-2 << EOF
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_MAJOR}.0 AS build
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apt-get update && apt-get install -y --no-install-recommends curl jq unzip tar && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN set -eux; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG")"; \\
    fi; \\
    URL="\$(printf '%s' "\$RELEASE_JSON" | jq -r '.assets[] | select(.name | endswith(".zip")) | .browser_download_url' | head -n 1)"; \\
    ASSET_EXT="zip"; \\
    if [ -z "\$URL" ]; then \\
      URL="\$(printf '%s' "\$RELEASE_JSON" | jq -r '.assets[] | select(.name | endswith(".tar.gz")) | .browser_download_url' | head -n 1)"; \\
      ASSET_EXT="tar.gz"; \\
    fi; \\
    if [ -z "\$URL" ]; then echo "No .zip or .tar.gz asset found" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.\$ASSET_EXT; \\
    if [ "\$ASSET_EXT" = "zip" ]; then \\
      unzip -q app.\$ASSET_EXT -d /app/out; \\
    else \\
      mkdir -p /app/out && tar -xzf app.\$ASSET_EXT -C /app/out; \\
    fi

FROM mcr.microsoft.com/dotnet/aspnet:${DOTNET_MAJOR}.0
RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/out .
${CS_URL_ENV}
RUN if ! getent group app >/dev/null; then addgroup --system app; fi && \\
    if ! id -u app >/dev/null 2>&1; then adduser --system --ingroup app app; fi
USER app

${HEALTHCHECK_BLOCK_CURL}

ENTRYPOINT ["/usr/bin/tini", "--", "dotnet", "${PKG_NAME}.dll"]
EOF
            echo "Created: Dockerfile-2 (C# - GitHub Releases)"
            ;;
        
        php)
            # PHP: deps from Packagist (cached layer) then local source - the
            # CMD runs artisan/public from the context (bug-051: deps-only
            # images exited instantly).
            # Reuses PHP_DEPS_COPY from detect_php (lock-aware)
            cat > Dockerfile-2 << EOF
FROM ${PHP_IMAGE}
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
${PHP_DEPS_COPY}
RUN apk add --no-cache libpng-dev libzip-dev icu-dev oniguruma-dev && \\
    docker-php-ext-install ${PHP_EXTS}
${PHP_PECL_RUN}
${PHP_RUN} composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
COPY . .
${PHP_RUNTIME}
EOF
            echo "Created: Dockerfile-2 (PHP - Packagist)"
            ;;
        
        kotlin)
            # Kotlin: Download from GitHub Releases
            cat > Dockerfile-2 << EOF
FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine AS build
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apk add --no-cache curl jq
WORKDIR /app
RUN set -eux; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".jar")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate jar asset" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.jar; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  app.jar\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi

FROM eclipse-temurin:${JAVA_MAJOR}-jre-alpine
RUN apk add --no-cache tini wget
COPY --from=build /app/app.jar /app/app.jar
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-jar", "/app/app.jar"]
EOF
            echo "Created: Dockerfile-2 (Kotlin - GitHub Releases)"
            ;;
        
        swift)
            # Swift: Download from GitHub Releases (binary name from Package.swift)
            BINARY_NAME=$(sed -nE 's/.*executableTarget[[:space:]]*\([[:space:]]*name[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' Package.swift 2>/dev/null | head -1)
            if [ -z "$BINARY_NAME" ]; then BINARY_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]'); fi
            cat > Dockerfile-2 << EOF
FROM amazonlinux:2023 AS build
ARG TARGETARCH
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN yum install -y --skip-broken curl jq unzip tar
WORKDIR /app
RUN set -eux; \\
    case "\$TARGETARCH" in \\
      amd64)  ARCH_RE="amd64|x86_64"  ;; \\
      arm64)  ARCH_RE="arm64|aarch64" ;; \\
      *)      ARCH_RE="amd64|x86_64"  ;; \\
    esac; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_RE" '.assets[] | select((.name | test(\$arch)) and (.name | endswith(".zip"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    ASSET_EXT="zip"; \\
    if [ -z "\$ASSET_JSON" ]; then \\
      ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_RE" '.assets[] | select((.name | test(\$arch)) and (.name | endswith(".tar.gz"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
      ASSET_EXT="tar.gz"; \\
    fi; \\
    if [ -z "\$ASSET_JSON" ]; then \\
      echo "WARNING: no arch-matching asset - trying any published asset" >&2; \\
      ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".zip")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
      ASSET_EXT="zip"; \\
      if [ -z "\$ASSET_JSON" ]; then \\
        ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".tar.gz")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
        ASSET_EXT="tar.gz"; \\
      fi; \\
    fi; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate release asset" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.\$ASSET_EXT; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  app.\$ASSET_EXT\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi; \\
    if [ "\$ASSET_EXT" = "zip" ]; then \\
      unzip -q app.\$ASSET_EXT; \\
    else \\
      tar -xzf app.\$ASSET_EXT; \\
    fi

FROM ${SWIFT_IMAGE}
RUN yum install -y --skip-broken wget shadow-utils && yum clean all
COPY --from=build /app/${BINARY_NAME} /usr/local/bin/${BINARY_NAME}
RUN useradd -m app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/bin/sh", "-c", "exec \"\$@\"", "--"]
CMD ["${BINARY_NAME}"]
EOF
            echo "Created: Dockerfile-2 (Swift - GitHub Releases)"
            ;;
        
        scala)
            # Scala: Download from GitHub Releases
            cat > Dockerfile-2 << EOF
FROM eclipse-temurin:11-jre-alpine AS build
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apk add --no-cache curl jq
WORKDIR /app
RUN set -eux; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".jar")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate jar asset" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.jar; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  app.jar\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi

FROM eclipse-temurin:11-jre-alpine
RUN apk add --no-cache tini wget
COPY --from=build /app/app.jar /app/app.jar
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-jar", "/app/app.jar"]
EOF
            echo "Created: Dockerfile-2 (Scala - GitHub Releases)"
            ;;
        
        elixir)
            # Elixir: Download mix-release tarball from GitHub Releases.
            # (Hex archive.install + phx.server can't boot without app source;
            # the tarball runs the same /app/bin/<release> start as Dockerfile-1.)
            cat > Dockerfile-2 << EOF
FROM alpine:${ALPINE_VER} AS build
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apk add --no-cache curl jq tar
WORKDIR /build
RUN set -eux; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases" | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG")"; \\
    fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".tar.gz")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed -nE 's/^sha256:([0-9a-fA-F]+)\$/\\1/p')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate URL" >&2; exit 1; fi; \\
    echo "Downloading: \$URL"; \\
    curl -fL "\$URL" -o ${RELEASE_NAME}.tar.gz; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  ${RELEASE_NAME}.tar.gz\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi; \\
    mkdir -p /app && tar -xzf ${RELEASE_NAME}.tar.gz -C /app

FROM alpine:${ALPINE_VER}
RUN apk add --no-cache tini wget libstdc++ openssl ncurses-libs
COPY --from=build /app /app
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/bin/${RELEASE_NAME}", "start"]
EOF
            echo "Created: Dockerfile-2 (Elixir - GitHub Releases)"
            ;;
        
        clojure)
            # Clojure: Download from GitHub Releases
            cat > Dockerfile-2 << EOF
FROM eclipse-temurin:11-jre-alpine AS build
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apk add --no-cache curl jq
WORKDIR /app
RUN set -eux; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".jar")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate jar asset" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.jar; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  app.jar\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi

FROM eclipse-temurin:11-jre-alpine
RUN apk add --no-cache tini wget
COPY --from=build /app/app.jar /app/app.jar
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "-jar", "/app/app.jar"]
EOF
            echo "Created: Dockerfile-2 (Clojure - GitHub Releases)"
            ;;
        
        haskell)
            # Haskell: Download from GitHub Releases (binary from .cabal executable stanza)
            BINARY_NAME=""
            for _cabal in *.cabal; do
                [ -f "$_cabal" ] || continue
                BINARY_NAME=$(sed -nE 's/^executable[[:space:]]+([A-Za-z0-9_-]+).*/\1/p' "$_cabal" | head -1)
                [ -n "$BINARY_NAME" ] && break
            done
            if [ -z "$BINARY_NAME" ]; then BINARY_NAME=$(basename "$(pwd)"); fi
            cat > Dockerfile-2 << EOF
FROM alpine:3.24.1 AS build
ARG TARGETARCH
ARG RELEASE=latest
RUN echo "WARNING: RELEASE=latest is not reproducible; pass a pinned release tag" >&2
RUN apk add --no-cache curl jq unzip
WORKDIR /app
RUN set -eux; \\
    case "\$TARGETARCH" in \\
      amd64)  ARCH_RE="amd64|x86_64"  ;; \\
      arm64)  ARCH_RE="arm64|aarch64" ;; \\
      *)      ARCH_RE="amd64|x86_64"  ;; \\
    esac; \\
    if [ "\$RELEASE" = "latest" ]; then \\
      RELEASE_JSON="\$(curl -fsSL https://api.github.com/repos/${GITHUB_REPO}/releases | jq -c '.[0]')"; \\
    else \\
      TAG="\$RELEASE"; \\
      RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$TAG" 2>/dev/null || true)"; \\
      if [ -z "\$RELEASE_JSON" ]; then \\
        if [ "\${TAG#v}" = "\$TAG" ]; then ALT_TAG="v\$TAG"; else ALT_TAG="\${TAG#v}"; fi; \\
        RELEASE_JSON="\$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/tags/\$ALT_TAG")"; \\
        TAG="\$ALT_TAG"; \\
      fi; \\
    fi; \\
    if [ -z "\$RELEASE_JSON" ]; then echo "Failed to resolve release" >&2; exit 1; fi; \\
    ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_RE" '.assets[] | select((.name | test(\$arch)) and (.name | endswith(".zip"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
    ASSET_EXT="zip"; \\
    if [ -z "\$ASSET_JSON" ]; then \\
      ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c --arg arch "\$ARCH_RE" '.assets[] | select((.name | test(\$arch)) and (.name | endswith(".tar.gz"))) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
      ASSET_EXT="tar.gz"; \\
    fi; \\
    if [ -z "\$ASSET_JSON" ]; then \\
      echo "WARNING: no arch-matching asset - trying any published asset" >&2; \\
      ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".zip")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
      ASSET_EXT="zip"; \\
      if [ -z "\$ASSET_JSON" ]; then \\
        ASSET_JSON="\$(printf '%s' "\$RELEASE_JSON" | jq -c '.assets[] | select(.name | endswith(".tar.gz")) | {name: .name, url: .browser_download_url, digest: .digest}' | head -n 1)"; \\
        ASSET_EXT="tar.gz"; \\
      fi; \\
    fi; \\
    URL="\$(printf '%s' "\$ASSET_JSON" | jq -r '.url // empty')"; \\
    DIGEST="\$(printf '%s' "\$ASSET_JSON" | jq -r '.digest // empty')"; \\
    SHA256="\$(printf '%s' "\$DIGEST" | sed 's/^sha256://')"; \\
    if [ -z "\$URL" ]; then echo "Failed to locate release asset" >&2; exit 1; fi; \\
    curl -fL "\$URL" -o app.\$ASSET_EXT; \\
    if [ -n "\$SHA256" ] && [ "\$SHA256" != "\$DIGEST" ]; then \\
      printf '%s  app.\$ASSET_EXT\n' "\$SHA256" | sha256sum -c -; \\
    else \\
      echo "WARNING: no sha256 digest published - skipping verification" >&2; \\
    fi; \\
    if [ "\$ASSET_EXT" = "zip" ]; then \\
      unzip -q app.\$ASSET_EXT; \\
    else \\
      tar -xzf app.\$ASSET_EXT; \\
    fi

FROM alpine:3.24.1
RUN apk add --no-cache tini wget gmp libffi
COPY --from=build /app/${BINARY_NAME} /usr/local/bin/${BINARY_NAME}
RUN addgroup -S app && adduser -S app -G app
USER app

${HEALTHCHECK_BLOCK}

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["${BINARY_NAME}"]
EOF
            echo "Created: Dockerfile-2 (Haskell - GitHub Releases)"
            ;;
    esac
fi

# ==========================================
if [ -f Dockerfile-2 ]; then
    sed -i -E "s/(\"--port\", \")[0-9]+/\1${PORT}/" Dockerfile-2
    sed -i -E "s/listen [0-9]+;/listen ${PORT};/g" Dockerfile-2
    if [ "${FRAMEWORK:-}" = "aspnet" ]; then
        sed -i -E "s#(ASPNETCORE_URLS=http://\\+:)[0-9]+#\1${PORT}#" Dockerfile-2
    fi
fi

# GENERATE .dockerignore-2 (for Dockerfile-2)
# ==========================================

if [ -f "Dockerfile-2" ]; then
    cat > .dockerignore-2 << 'DOCKERIGNORE_EOF'
.git
.gitignore
README.md
*.md
docs/
tests/
test/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
.dockerignore-2
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
*.log
.vs/
__pycache__
*.pyc
*.pyo
.pytest_cache
.ruff_cache
.mypy_cache
.coverage
htmlcov/
coverage.xml
node_modules/
.npm
target/
bin/
obj/
*.user
*.suo
build/
dist/
*.gemspec
deps/
_build/
.lock-watcher
# bug-051: language build dirs + OS junk D1 ignores but D2 still COPYs into
# the context (python/php/ruby D2 now ship source - stale build output must
# not ride along, and vendor/ is already installed before the source COPY).
.DS_Store
Thumbs.db
.venv/
venv/
env/
*.egg-info/
*.egg
.tox/
__pypackages__/
.uv-cache/
.pdm.toml
.bun/
.nyc_output/
project/project/
.bsp/
.gradle/
.m2/
.stack-work/
vendor/*
!vendor/cache/
!vendor/cache/**
vendor/bundle/
DATABASES.md
SONAR.md
.env.example
DOCKERIGNORE_EOF
    # D2 builds (npm/composer/bundle install) COPY context too: secrets must
    # stay out here exactly as in -1 (same guard, no duplicates).
    for _sec in .npmrc pip.conf .pypirc .netrc auth.json settings.xml .bundle/config; do
        if [ -f "$_sec" ]; then
            grep -qxF "$_sec" .dockerignore-2 2>/dev/null || printf '%s\n' "$_sec" >> .dockerignore-2
        fi
    done
    echo "Created: .dockerignore-2"
fi

echo ""
echo "Created: Dockerfile-1"
if [ -f "Dockerfile-2" ]; then
    echo "Created: Dockerfile-2 (download prebuilt binary)"
fi
echo "Created: .dockerignore-1"

# CHECK FINALIZE (bug-051): D1 groups were compared above; D2 + ignore-2 were
# just regenerated (when a repo source exists) - diff them against the
# precheck baselines, restore every original, then report once.
if [ "$CHECK_MODE" = "1" ]; then
    for _cf in Dockerfile-2 .dockerignore-2; do
        if [ -f "${_cf}.precheck" ]; then
            if [ ! -f "$_cf" ]; then
                echo "DRIFT ${_cf}: baseline existed but was not regenerated this run"
                _drift=$((_drift+1))
            elif ! cmp -s "$_cf" "${_cf}.precheck"; then
                echo "DRIFT ${_cf}: content changed - run without --check to regenerate"
                _drift=$((_drift+1))
            fi
        fi
    done
    check_restore
    if [ "$_drift" = "0" ]; then
        echo "CHECK OK: Dockerfile-1 + Dockerfile-2 match current detection"
        exit 0
    else
        echo "CHECK FAILED: ${_drift} drifted group(s) - run without --check to regenerate"
        exit 1
    fi
fi

# Docker only reads .dockerignore (not -1/-2). Activate the right one.
# Default: Dockerfile-1 build uses .dockerignore-1. NEXT STEPS shows the cp for Dockerfile-2.
# Never destroy the user's own .dockerignore without backup.
if [ "$CHECK_MODE" != "1" ]; then
if [ -f ".dockerignore" ] && ! cmp -s .dockerignore-1 .dockerignore; then
    # Keep the FIRST backup: re-backing-up every run would silently replace
    # the user's true original with our own generated file on the 2nd run.
    if [ ! -f ".dockerignore.bak" ]; then
        cp -f .dockerignore .dockerignore.bak
        echo "Backed up your .dockerignore to .dockerignore.bak"
    else
        echo "[WARN] .dockerignore.bak already exists - your original stays there, not overwritten"
    fi
fi
cp -f .dockerignore-1 .dockerignore
echo "Activated: .dockerignore (from .dockerignore-1)"
fi
echo ""

# F4: optional compose.yaml from detected values. Backing services (detected by
# detect_backing_services) become health-gated dependencies via depends_on; the
# app service also gets build args, environment and data-dir volumes. Values are
# never baked: every env rides "NAME: ${NAME:-...}" so compose reads your
# shell/.env at deploy time. Localhost defaults are rewritten to the matching
# service's container hostname (that is exactly the dead-localhost warn case).
if [ "$WANT_COMPOSE" = "1" ]; then
    detect_backing_services
    # G2: csharp images have curl but no wget - healthcheck must match
    if [ "$LANGUAGE" = "csharp" ]; then
        COMPOSE_HTEST="\"curl\", \"-sf\", \"http://localhost:${PORT}${HEALTH_PATH}\""
    else
        COMPOSE_HTEST="\"wget\", \"-qO-\", \"http://localhost:${PORT}${HEALTH_PATH}\""
    fi
    COMPOSE_APP_PORTS=""
    if [ "${CLIENT_SHAPE:-0}" != "1" ]; then
        _compose_expose="$(awk '$1 == "EXPOSE" { for (i = 2; i <= NF; i++) print $i }' Dockerfile-1 2>/dev/null || true)"
        [ -n "$_compose_expose" ] || _compose_expose="${PORT}"
        _compose_ports_list=""
        for _compose_port in $_compose_expose; do
            case "$_compose_port" in
                ''|*[!0-9]*) continue ;;
            esac
            _compose_ports_list="${_compose_ports_list}      - target: ${_compose_port}
        published: ${_compose_port}
        host_ip: \${COMPOSE_BIND:-127.0.0.1}
"
        done
        if [ -n "$_compose_ports_list" ]; then
            COMPOSE_APP_PORTS="    ports:
${_compose_ports_list}"
        fi
    fi
    # Private registries need secrets at compose build time too (else the
    # BuildKit mounts in Dockerfile-1 fail). Same id table as NEXT STEPS.
    COMPOSE_BUILD_SECRETS=""
    COMPOSE_TOP_SECRETS=""
    for _s in $REGISTRY_NOTICE; do
        case "$_s" in
            .npmrc) _id="npmrc"; _src=".npmrc" ;;
            pip.conf) _id="pipconf"; _src="pip.conf" ;;
            .pypirc) _id="pipconf"; _src=".pypirc" ;;
            .netrc) _id="netrc"; _src=".netrc" ;;
            auth.json) _id="composer"; _src="auth.json" ;;
            settings.xml) _id="maven"; _src="settings.xml" ;;
            .bundle/config) _id="bundle"; _src=".bundle/config" ;;
            *) continue ;;
        esac
        COMPOSE_BUILD_SECRETS="${COMPOSE_BUILD_SECRETS}        - ${_id}
"
        COMPOSE_TOP_SECRETS="${COMPOSE_TOP_SECRETS}  ${_id}:
    file: ${_src}
"
    done
    if [ -n "$COMPOSE_BUILD_SECRETS" ]; then
        COMPOSE_SECRETS_BLOCK="      secrets:
$COMPOSE_BUILD_SECRETS"
        echo "[PASS] Compose secrets: registry files wired for build"
    else
        COMPOSE_SECRETS_BLOCK=""
    fi
    # Build args: every public env name, value injected by compose from the
    # shell/.env at build time (nothing baked into the file).
    COMPOSE_APP_ARGS=""
    # shellcheck disable=SC2086
    for _n in $ENV_ARG_NAMES; do
        COMPOSE_APP_ARGS="${COMPOSE_APP_ARGS}        ${_n}: \${${_n}:-}
"
    done
    [ -n "$COMPOSE_APP_ARGS" ] && COMPOSE_APP_ARGS="      args:
$COMPOSE_APP_ARGS"
    # Environment: every detected env name (secret-like too - runtime channel
    # for those). A localhost-default URL matching a confirmed service gets
    # its host rewritten to the service name (the compose container hostname).
    COMPOSE_APP_ENV=""
    # shellcheck disable=SC2086
    for _n in $ENV_ARG_NAMES $ENV_ARG_SECRETS; do
        _u=""
        [ -n "${ENV_URLS:-}" ] && _u="$(printf '%s\n' "${ENV_URLS:-}" | grep -m1 -F "${_n}|" | sed 's/^[^|]*|//' || true)"
        case " ${ENV_CREDENTIAL_NAMES:-} " in
            *" ${_n} "*)
                COMPOSE_APP_ENV="${COMPOSE_APP_ENV}      ${_n}: \${${_n}:?set ${_n} at runtime}
"
                continue
                ;;
        esac
        _svc=""
        if [ -n "$_u" ]; then
            # Runtime parse required: scheme (URL) first, then bare port form.
            case "$_u" in
                postgres:*|postgresql:*) _svc=db ;;
                mysql:*) _svc=mysql ;;
                mariadb:*) _svc=mariadb ;;
                redis:*|rediss:*) _svc=cache ;;
                mongodb:*) _svc=mongo ;;
                amqp:*|amqps:*) _svc=queue ;;
                kafka:*) _svc=kafka ;;
                nats:*) _svc=nats ;;
                minio:*) _svc=minio ;;
                s3:*) _svc=minio ;;
                mssql:*|sqlserver:*) _svc=mssql ;;
                memcached:*) _svc=memcached ;;
                neo4j:*|bolt:*) _svc=neo4j ;;
                elasticsearch:*) _svc=elastic ;;
                *) case "$_u" in
                    *:5432*) _svc=db ;;
                    *:3306*) _svc=mysql ;;
                    *:6379*) _svc=cache ;;
                    *:27017*) _svc=mongo ;;
                    *:5672*|*:15672*) _svc=queue ;;
                    *:9092*) _svc=kafka ;;
                    *:9200*|*:9300*) _svc=elastic ;;
                    *:9042*) _svc=cassandra ;;
                    *:7687*|*:7474*) _svc=neo4j ;;
                    *:4222*|*:6222*) _svc=nats ;;
                    *:9000*) _svc=minio ;;
                    *:11211*) _svc=memcached ;;
                    *:1433*) _svc=mssql ;;
                    *) _svc="" ;;
                esac ;;
            esac
            if [ -n "$_svc" ] && [ -n "$DBC_SERVICES" ] && [[ " $DBC_SERVICES " == *" $_svc "* ]]; then
                _u="${_u//localhost/$_svc}"
                _u="${_u//127.0.0.1/$_svc}"
                COMPOSE_APP_ENV="${COMPOSE_APP_ENV}      ${_n}: \${${_n}:-${_u}}
"
            else
                COMPOSE_APP_ENV="${COMPOSE_APP_ENV}      ${_n}: \${${_n}:-}
"
            fi
        else
            COMPOSE_APP_ENV="${COMPOSE_APP_ENV}      ${_n}: \${${_n}:-}
"
        fi
    done
    [ -n "$COMPOSE_APP_ENV" ] && COMPOSE_APP_ENV="    environment:
$COMPOSE_APP_ENV"
    # App data dirs -> named volumes (same sources as the VOLUME line).
    COMPOSE_APP_VOLS=""
    COMPOSE_TOP_VOLS=""
    # shellcheck disable=SC2086
    for _t in $DATA_DIRS; do
        _dn=${_t#\"}
        _dn=${_dn%\"}
        _dn=${_dn#/app/}
        COMPOSE_APP_VOLS="${COMPOSE_APP_VOLS}      - app_${_dn}:/app/${_dn}
"
        COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  app_${_dn}:
"
    done
    [ -n "$COMPOSE_APP_VOLS" ] && COMPOSE_APP_VOLS="    volumes:
$COMPOSE_APP_VOLS"
    # depends_on: health-gated long syntax per confirmed service. Memcached has
    # no safe healthcheck -> service_started (started, not healthy).
    COMPOSE_DEPENDS=""
    # shellcheck disable=SC2086
    for _s in $DBC_SERVICES; do
        _cond="service_healthy"
        [ "$_s" = "memcached" ] && _cond="service_started"
        COMPOSE_DEPENDS="${COMPOSE_DEPENDS}      ${_s}:
        condition: ${_cond}
"
    done
    [ -n "$COMPOSE_DEPENDS" ] && COMPOSE_DEPENDS="    depends_on:
$COMPOSE_DEPENDS"
    # Default-credential services: honest warning, random values land in .env.
    _creds=""
    # shellcheck disable=SC2086
    for _s in $DBC_SERVICES; do
        case "$_s" in
            db|mysql|mariadb|mongo|queue|neo4j|minio|mssql) _creds="$_creds $_s" ;;
        esac
    done
    [ -n "$_creds" ] && echo "[WARN] Credentials for:${_creds} - random values written to .env (edit after deploy if needed)"
    # DB service volumes on the top-level volumes section (collected first so
    # the app heredoc below has the full list; the blocks themselves append).
    for _s in $DBC_SERVICES; do
        case "$_s" in
            db) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  pgdata:
" ;;
            mysql) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  mysqldata:
" ;;
            mariadb) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  mariadbdata:
" ;;
            mongo) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  mongodata:
" ;;
            queue) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  rabbitmqdata:
" ;;
            kafka) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  kafkadata:
" ;;
            elastic) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  esdata:
" ;;
            cassandra) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  cassdata:
" ;;
            neo4j) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  neodata:
" ;;
            minio) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  mindata:
" ;;
            mssql) COMPOSE_TOP_VOLS="${COMPOSE_TOP_VOLS}  mssqldata:
" ;;
        esac
    done
    # Top-level volumes need their header (entries alone would sit under services).
    if [ -n "$COMPOSE_TOP_VOLS" ]; then
        COMPOSE_TOP_VOLS="volumes:
$COMPOSE_TOP_VOLS"
    fi
    # bug-052: guessed /health would 404 forever inside the container too -
    # omit the compose healthcheck exactly like Dockerfile-1 omits HEALTHCHECK
    # (same HEALTH_GUESSED_FLAG honesty rule; depends_on still uses
    # service_started for the app's own dependents via DBC_SERVICES).
    if [ "${HEALTH_GUESSED_FLAG:-0}" = "1" ]; then
        COMPOSE_APP_HEALTH="    # healthcheck omitted: no health route found in source (see Dockerfile-1 comment)
"
    else
        COMPOSE_APP_HEALTH="    healthcheck:
      test: [\"CMD\", ${COMPOSE_HTEST}]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: ${HEALTH_START}
"
    fi
    _required_env_keys=""
    for _s in $DBC_SERVICES; do
        case "$_s" in
            db) _required_env_keys="${_required_env_keys} POSTGRES_PASSWORD" ;;
            mysql) _required_env_keys="${_required_env_keys} MYSQL_ROOT_PASSWORD" ;;
            mariadb) _required_env_keys="${_required_env_keys} MARIADB_ROOT_PASSWORD" ;;
            mongo) _required_env_keys="${_required_env_keys} MONGO_INITDB_ROOT_PASSWORD" ;;
            queue) _required_env_keys="${_required_env_keys} RABBITMQ_DEFAULT_PASS" ;;
            neo4j) _required_env_keys="${_required_env_keys} NEO4J_PASSWORD" ;;
            minio) _required_env_keys="${_required_env_keys} MINIO_ROOT_PASSWORD" ;;
            mssql) _required_env_keys="${_required_env_keys} MSSQL_SA_PASSWORD" ;;
        esac
    done
    if [ -f .env ]; then
        _missing_env_keys=""
        for _key in $_required_env_keys; do
            grep -qE "^${_key}=.+" .env 2>/dev/null || _missing_env_keys="${_missing_env_keys} ${_key}"
        done
        if [ -n "$_missing_env_keys" ]; then
            echo "ERROR: existing .env is missing required keys:${_missing_env_keys}" >&2
            exit 1
        fi
    fi
    _img="$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_.-')"
    [ -z "$_img" ] && _img="my-app"
    cat > compose.yaml << EOF
services:
  app:
    image: ${_img}
    container_name: ${_img}
    build:
      context: .
      dockerfile: Dockerfile-1
${COMPOSE_SECRETS_BLOCK}${COMPOSE_APP_ARGS}${COMPOSE_APP_ENV}${COMPOSE_APP_PORTS}${COMPOSE_APP_VOLS}    restart: unless-stopped
${COMPOSE_APP_HEALTH}${COMPOSE_DEPENDS}
EOF
    # Service blocks after the app (compose top-level section comes last).
    for _s in $DBC_SERVICES; do
        emit_backing_service "$_s"
    done
    if [ -n "${COMPOSE_TOP_SECRETS}${COMPOSE_TOP_VOLS}" ]; then
        printf '%s\n' "${COMPOSE_TOP_SECRETS}${COMPOSE_TOP_VOLS}" >> compose.yaml
    fi
    if [ -n "$DBC_SERVICES" ]; then
        echo "[PASS] Compose: app +${DBC_SERVICES} via depends_on (health-gated)"
    fi
    echo "Created: compose.yaml (docker compose up to run)"
    # bug-052: write .env only when absent (never clobber user secrets).
    # Random values so default-credential services never ship known passwords;
    # MSSQL needs upper+lower+digit+symbol -> prefix Aa1! + hex from urandom.
    # Values stay out of compose.yaml (interpolated at deploy); .env is already
    # in every .dockerignore block, so it never enters the build context.
    _env_rand() {
        od -An -N16 -tx1 /dev/urandom 2>/dev/null | tr -d ' \n'
    }
    _env_lines=""
    for _s in $DBC_SERVICES; do
        case "$_s" in
            db)      _env_lines="${_env_lines}POSTGRES_PASSWORD=$(_env_rand)
" ;;
            mysql)   _env_lines="${_env_lines}MYSQL_ROOT_PASSWORD=$(_env_rand)
" ;;
            mariadb) _env_lines="${_env_lines}MARIADB_ROOT_PASSWORD=$(_env_rand)
" ;;
            mongo)   _env_lines="${_env_lines}MONGO_INITDB_ROOT_PASSWORD=$(_env_rand)
" ;;
            queue)   _env_lines="${_env_lines}RABBITMQ_DEFAULT_PASS=$(_env_rand)
" ;;
            neo4j)   _env_lines="${_env_lines}NEO4J_PASSWORD=$(_env_rand)
" ;;
            minio)   _env_lines="${_env_lines}MINIO_ROOT_PASSWORD=$(_env_rand)
" ;;
            mssql)   _env_lines="${_env_lines}MSSQL_SA_PASSWORD=Aa1!$(_env_rand)
" ;;
        esac
    done
    if [ ! -f .env ]; then
        _env_tmp="$(mktemp .env.tmp.XXXXXX)"
        (
            umask 077
            cat > "$_env_tmp" << EOF
# .env - compose backing-service credentials (create-dockerfile.sh)
# Generated once with random passwords; this file is never overwritten.
# Keep it out of git. docker compose reads it next to compose.yaml.
# Only services detected under --compose get a line below.
${_env_lines}
EOF
        )
        mv -f "$_env_tmp" .env
        chmod 600 .env
        ENV_CREATED=1
        echo "Created: .env (random passwords for detected backing services)"
    else
        echo "[INFO] .env already exists - left untouched (your values win)"
    fi
fi
echo ""

# ==========================================
# SHOW DOCKERFILE
# ==========================================

echo "=========================================="
echo "DOCKERFILE CONTENT (Dockerfile-1)"
echo "=========================================="
echo ""
cat Dockerfile-1
echo ""

if [ -f "Dockerfile-2" ]; then
    echo "=========================================="
    echo "DOCKERFILE CONTENT (Dockerfile-2)"
    echo "=========================================="
    echo ""
    cat Dockerfile-2
    echo ""
    echo "=========================================="
    echo ".dockerignore-2 CONTENT"
    echo "=========================================="
    echo ""
    cat .dockerignore-2
    echo ""
fi

# ==========================================
# SUMMARY
# ==========================================

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "  Language:     $LANGUAGE"
echo "  Framework:    ${FRAMEWORK:-N/A}"
echo "  Port:         $PORT"
echo "  Health:       $HEALTH_PATH"
if [ -n "$GITHUB_REPO" ]; then
    echo "  GitHub:       $GITHUB_REPO"
fi
# Dedupe guessed words and show one-line repair hint
GUESSED=$(echo "$GUESSED" | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ')
if [ -n "$GUESSED" ]; then
    echo "  Guessed:     $GUESSED(fix: PORT=8080 HEALTH=/ping ./create-dockerfile.sh)"
fi
echo ""

# D3a: --init writes dockerfile.conf from detection, then stops
if [ "$INIT_MODE" = "1" ]; then
    if [ "$DRY_RUN" != "1" ]; then
        cat > dockerfile.conf << EOF
# dockerfile.conf - overrides for create-dockerfile.sh (edit + re-run to apply)
# Detected: language=$LANGUAGE${PY_MGR:+ manager=$PY_MGR}${PKG_MGR:+ manager=$PKG_MGR} (info only - only PORT/HEALTH/STOPSIGNAL below are applied)
PORT=$PORT
HEALTH=$HEALTH_PATH
# STOPSIGNAL=SIGTERM (uncomment to pin; empty = Docker default SIGTERM)
# D2_ASSET_URL=https://get.example.com/app-v\$TAG-linux-\$ARCH_SUBSTR.tar.gz (uncomment when
#   releases live outside GitHub Assets; \$TAG/\$ARCH_SUBSTR expand at image build time)
# D2_ASSET_SHA_URL=https://get.example.com/app-v\$TAG-linux-\$ARCH_SUBSTR.tar.gz.sha256sum
EOF
    fi
    echo "Wrote dockerfile.conf - edit values and re-run to apply."
    exit 0
fi
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "  Dockerfile-1 (build from source):"
if [ -n "$REGISTRY_NOTICE" ]; then
    # SECRET_FLAGS computed once in D1c (same ids as the mounts above).
    echo "    docker build$SECRET_FLAGS -t my-app:1 -f Dockerfile-1 ."
    echo "    (private registry files used: $REGISTRY_NOTICE- never baked into the image)"
else
    echo "    docker build -t my-app:1 -f Dockerfile-1 ."
fi
echo "    docker run -d -p ${PORT}:${PORT} --name my-app my-app:1"
if [ -n "${ENV_ARG_NAMES:-}" ]; then
    echo "    (detected env names:${ENV_ARG_NAMES} - pass values with --build-arg NAME=value or -e NAME=value)"
fi
echo ""
if [ -f "Dockerfile-2" ]; then
    echo "  Dockerfile-2 (download prebuilt binary):"
    echo "    cp .dockerignore-2 .dockerignore && docker build -t my-app:2 -f Dockerfile-2 ."
    echo "    docker run -d -p ${PORT}:${PORT} --name my-app my-app:2"
    echo ""
fi
echo "  Verify:  curl -s localhost:${PORT}${HEALTH_PATH}"
echo "  Logs:    docker logs my-app"
echo "  Stop:    docker stop my-app"
if [ "$WANT_COMPOSE" = "1" ]; then
    echo "  Compose: docker compose up -d   (reads compose.yaml${ENV_CREATED:+ + .env - random passwords, never overwritten})"
fi
# O2/O3: framework first-boot secrets (no safe defaults exist - user must pass).
# Some detectors (go, generic) never set FRAMEWORK - default it first (set -u).
FRAMEWORK="${FRAMEWORK:-generic}"
if [ "$FRAMEWORK" = "phoenix" ]; then
    echo "  Secret:  docker run -e SECRET_KEY_BASE=\$(mix phx.gen.secret) ..."
fi
if [ "$FRAMEWORK" = "laravel" ]; then
    echo "  Secret:  docker run -e APP_KEY=\$(php artisan key:generate --show) ..."
fi
if [ "$FRAMEWORK" = "rails" ]; then
    echo "  Migrate: docker exec my-app bundle exec rails db:migrate (before traffic)"
fi
if [ "$FRAMEWORK" = "django" ]; then
    echo "  Migrate: docker exec my-app python manage.py migrate (before traffic)"
fi
echo ""

# ==========================================
# D2c: STATIC BUILD CHECK (lint only - builds nothing, never fatal)
# ==========================================

if [ "${SKIP_CHECKS:-0}" = "1" ]; then
    echo "(--fast: skipping docker build check)"
elif command -v docker >/dev/null 2>&1; then
    # --check needs a modern client (bug-048 audit): probe once, else an old
    # Docker errors on the flag and every file gets flagged. Prefer buildx
    # when the classic flag is absent.
    _check_cmd=""
    if docker build --check --help >/dev/null 2>&1; then _check_cmd="docker build --check";
    elif docker buildx build --check --help >/dev/null 2>&1; then _check_cmd="docker buildx build --check"; fi
    if [ -n "$_check_cmd" ]; then
        # word splitting intended: _check_cmd holds the command + flag
        # shellcheck disable=SC2086
        if $_check_cmd -f Dockerfile-1 . >/dev/null 2>&1; then
            echo "[PASS] docker build --check: Dockerfile-1 OK"
        else
            echo "[WARN] docker build --check flagged Dockerfile-1 (run it yourself to see why)"
        fi
        if [ -f "Dockerfile-2" ]; then
            # shellcheck disable=SC2086
            if $_check_cmd -f Dockerfile-2 . >/dev/null 2>&1; then
                echo "[PASS] docker build --check: Dockerfile-2 OK"
            else
                echo "[WARN] docker build --check flagged Dockerfile-2 (run it yourself to see why)"
            fi
        fi
    else
        echo "(docker too old for 'build --check' - skipping static check)"
    fi
else
    echo "(docker not found - skipping build check)"
fi
# hadolint on the output (report only). Accepted on purpose:
# - pin rules DL3018/DL3008/DL3033: pinned apk/apt versions rot when repos
#   update and break builds worse than floating ones; bases stay pinned instead
# - DL4006 in Dockerfile-2 download plumbing: busybox ash has NO pipefail, and
#   every piped stage is null-checked on the next line (silent failure impossible)
if [ "${SKIP_CHECKS:-0}" = "1" ]; then
    echo "(--fast: skipping hadolint)"
elif command -v hadolint >/dev/null 2>&1; then
    _hl_filter() { grep -v "DL3018\|DL3008\|DL3033" | grep -v "DL4006" || true; }
    _hl_out=$(hadolint --no-fail -f gnu Dockerfile-1 2>/dev/null | _hl_filter)
    if [ -z "$_hl_out" ]; then
        echo "[PASS] hadolint: Dockerfile-1 clean (besides accepted rules)"
    else
        echo "[WARN] hadolint found issues in Dockerfile-1:"
        echo "$_hl_out" | head -5
    fi
    if [ -f "Dockerfile-2" ]; then
        _hl_out2=$(hadolint --no-fail -f gnu Dockerfile-2 2>/dev/null | _hl_filter)
        if [ -z "$_hl_out2" ]; then
            echo "[PASS] hadolint: Dockerfile-2 clean (besides accepted rules)"
        else
            echo "[WARN] hadolint found issues in Dockerfile-2:"
            echo "$_hl_out2" | head -5
        fi
    fi
else
    echo "(hadolint not found - skipping Dockerfile lint; install: see Host tools above)"
fi
echo ""
