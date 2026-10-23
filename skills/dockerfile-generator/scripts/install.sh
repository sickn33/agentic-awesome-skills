#!/usr/bin/env bash
# Install the dockerfile-generator skill into an agent's native skills path.
set -euo pipefail

SKILL_NAME="dockerfile-generator"
SKILL_VERSION="1.0.0"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

PLATFORM=""
SCOPE="project"
PROJECT_ROOT="$PWD"
TARGET=""
LINK=0
FORCE=0
DRY_RUN=0
LIST=0

usage() {
    cat <<'EOF'
dockerfile-generator installer

Usage:
  bash scripts/install.sh --platform <name> [options]
  bash scripts/install.sh --list

Platforms:
  claude        Claude Code
  codex         OpenAI Codex
  cursor        Cursor
  copilot       GitHub Copilot (project scope only)
  antigravity   Google Antigravity
  devin         Devin Desktop (formerly Windsurf)
  opencode      OpenCode
  cline         Cline
  kiro          Kiro
  generic       Generic .agents/skills layout
  all           Every unique destination for the selected scope

Options:
  --scope project|global   Install scope (default: project)
  --project-root DIR       Repository root for project scope (default: PWD)
  --target DIR             Exact skill folder to install into
  --link                   Create a symlink instead of copying
  --force                  Replace an existing destination
  --dry-run                Print actions without writing
  --list                   Show every platform and destination
  -V, --version            Show installer version
  -h, --help               Show this help

Examples:
  bash scripts/install.sh --platform claude --scope project
  bash scripts/install.sh --platform opencode --scope global
  bash scripts/install.sh --platform all --scope project
  bash scripts/install.sh --platform codex \
    --target /repo/.agents/skills/dockerfile-generator
  bash scripts/install.sh --platform kiro --scope project --dry-run
EOF
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

normalize_platform() {
    case "$1" in
        claude|claude-code) echo "claude" ;;
        codex|openai-codex) echo "codex" ;;
        cursor) echo "cursor" ;;
        copilot|github-copilot) echo "copilot" ;;
        antigravity|google-antigravity) echo "antigravity" ;;
        devin|devin-desktop|windsurf) echo "devin" ;;
        opencode|open-code) echo "opencode" ;;
        cline) echo "cline" ;;
        kiro) echo "kiro" ;;
        generic|agents|agents-md) echo "generic" ;;
        all) echo "all" ;;
        *) return 1 ;;
    esac
}

# Prints the parent skills directory for a platform/scope pair. Returns 1 when
# the platform has no documented destination for that scope.
platform_path() {
    local platform="$1"
    local scope="$2"

    case "$platform:$scope" in
        claude:project) echo ".claude/skills" ;;
        claude:global) echo "$HOME/.claude/skills" ;;

        codex:project) echo ".agents/skills" ;;
        codex:global) echo "$HOME/.agents/skills" ;;

        cursor:project) echo ".cursor/skills" ;;
        cursor:global) echo "$HOME/.cursor/skills" ;;

        copilot:project) echo ".github/skills" ;;
        copilot:global) return 1 ;;

        antigravity:project) echo ".agents/skills" ;;
        antigravity:global) echo "$HOME/.gemini/config/skills" ;;

        devin:project) echo ".devin/skills" ;;
        devin:global) echo "$HOME/.codeium/windsurf/skills" ;;

        opencode:project) echo ".opencode/skills" ;;
        opencode:global) echo "${XDG_CONFIG_HOME:-$HOME/.config}/opencode/skills" ;;

        cline:project) echo ".cline/skills" ;;
        cline:global) echo "$HOME/.cline/skills" ;;

        kiro:project) echo ".kiro/skills" ;;
        kiro:global) echo "$HOME/.kiro/skills" ;;

        generic:project) echo ".agents/skills" ;;
        generic:global) echo "$HOME/.agents/skills" ;;

        *) return 1 ;;
    esac
}

platforms() {
    printf '%s\n' claude codex cursor copilot antigravity devin opencode cline kiro generic
}

list_destinations() {
    local platform scope path
    printf '%-14s %-8s %s\n' "PLATFORM" "SCOPE" "DESTINATION"
    printf '%-14s %-8s %s\n' "--------" "-----" "-----------"
    while IFS= read -r platform; do
        for scope in project global; do
            if path="$(platform_path "$platform" "$scope" 2>/dev/null)"; then
                if [ "$scope" = "project" ]; then
                    printf '%-14s %-8s %s/%s\n' "$platform" "$scope" "$path" "$SKILL_NAME"
                else
                    printf '%-14s %-8s %s/%s\n' "$platform" "$scope" "$path" "$SKILL_NAME"
                fi
            else
                printf '%-14s %-8s %s\n' "$platform" "$scope" "(not officially supported)"
            fi
        done
    done < <(platforms)
}

install_copy() {
    local src="$1"
    local dest="$2"
    local exists=0

    if [ -e "$dest" ] || [ -L "$dest" ]; then
        exists=1
        if [ "$FORCE" -ne 1 ]; then
            die "destination exists: $dest (use --force to replace)"
        fi
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        if [ "$exists" -eq 1 ]; then
            printf 'would replace: %s\n' "$dest"
        fi
        if [ "$LINK" -eq 1 ]; then
            printf 'would link: %s -> %s\n' "$dest" "$src"
        else
            printf 'would copy: %s -> %s\n' "$src" "$dest"
        fi
        return 0
    fi

    if [ "$exists" -eq 1 ]; then
        rm -rf -- "$dest"
    fi
    mkdir -p -- "$(dirname -- "$dest")"

    if [ "$LINK" -eq 1 ]; then
        ln -s -- "$src" "$dest"
        return 0
    fi

    mkdir -p -- "$dest"
    tar -C "$src" \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='*.py[cod]' \
        --exclude='tests/tmp' \
        --exclude='*.log' \
        -cf - . | tar -C "$dest" -xf -
}

install_one() {
    local platform="$1"
    local dest="$2"

    printf 'Installing %s %s for %s (%s) -> %s\n' \
        "$SKILL_NAME" "$SKILL_VERSION" "$platform" "$SCOPE" "$dest"

    if [ "$LINK" -eq 1 ]; then
        echo "Mode: symlink"
    else
        echo "Mode: copy"
    fi

    install_copy "$SKILL_DIR" "$dest"

    if [ "$DRY_RUN" -eq 0 ]; then
        printf 'Installed: %s\n' "$dest"
    else
        printf 'Dry run complete: %s\n' "$dest"
    fi
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        -V|--version)
            printf '%s installer %s\n' "$SKILL_NAME" "$SKILL_VERSION"
            exit 0
            ;;
        --list)
            LIST=1
            shift
            ;;
        --platform)
            [ "$#" -ge 2 ] || die "--platform requires a value"
            PLATFORM="$2"
            shift 2
            ;;
        --platform=*)
            PLATFORM="${1#*=}"
            shift
            ;;
        --scope)
            [ "$#" -ge 2 ] || die "--scope requires project or global"
            SCOPE="$2"
            shift 2
            ;;
        --scope=*)
            SCOPE="${1#*=}"
            shift
            ;;
        --project-root)
            [ "$#" -ge 2 ] || die "--project-root requires a directory"
            PROJECT_ROOT="$2"
            shift 2
            ;;
        --project-root=*)
            PROJECT_ROOT="${1#*=}"
            shift
            ;;
        --target)
            [ "$#" -ge 2 ] || die "--target requires a directory"
            TARGET="$2"
            shift 2
            ;;
        --target=*)
            TARGET="${1#*=}"
            [ -n "$TARGET" ] || die "--target requires a directory"
            shift
            ;;
        --link)
            LINK=1
            shift
            ;;
        --force)
            FORCE=1
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -*)
            die "unknown option: $1 (try --help)"
            ;;
        *)
            die "unexpected argument: $1 (try --help)"
            ;;
    esac
done

if [ "$LIST" -eq 1 ]; then
    list_destinations
    exit 0
fi

[ -n "$PLATFORM" ] || die "--platform is required (try --help)"
[ "$SCOPE" = "project" ] || [ "$SCOPE" = "global" ] || die "--scope must be project or global"

NORMALIZED="$(normalize_platform "$PLATFORM")" || die "unknown platform: $PLATFORM (try --help)"
[ -d "$SKILL_DIR/vendor" ] || die "vendor runtime missing: $SKILL_DIR/vendor"
[ -f "$SKILL_DIR/SKILL.md" ] || die "SKILL.md missing: $SKILL_DIR/SKILL.md"

if [ -n "$TARGET" ] && [ "$NORMALIZED" = "all" ]; then
    die "--target cannot be combined with --platform all"
fi
if [ -n "$TARGET" ] && [ "$SCOPE" = "global" ]; then
    die "--target is an exact path; do not combine it with --scope global"
fi

if [ "$SCOPE" = "project" ] && [ -z "$TARGET" ]; then
    [ -d "$PROJECT_ROOT" ] || die "project root is not a directory: $PROJECT_ROOT"
    PROJECT_ROOT="$(cd -- "$PROJECT_ROOT" && pwd)"
fi
if [ "$SCOPE" = "global" ] && [ "$PROJECT_ROOT" != "$PWD" ]; then
    die "--project-root only applies to --scope project"
fi

if [ -n "$TARGET" ]; then
    # Resolve a relative target against the invocation directory, not against a
    # project root that may not exist yet.
    case "$TARGET" in
        /*) DEST="$TARGET" ;;
        *) DEST="$PWD/$TARGET" ;;
    esac
    install_one "$NORMALIZED" "$DEST"
    exit 0
fi

if [ "$NORMALIZED" = "all" ]; then
    seen=""
    while IFS= read -r platform; do
        if ! path="$(platform_path "$platform" "$SCOPE" 2>/dev/null)"; then
            if [ "$platform" = "copilot" ] && [ "$SCOPE" = "global" ]; then
                printf 'Skipping copilot: no official global skills path; use --scope project.\n' >&2
            else
                printf 'Skipping %s: no destination for %s scope.\n' "$platform" "$SCOPE" >&2
            fi
            continue
        fi

        if [ "$SCOPE" = "project" ]; then
            dest="$PROJECT_ROOT/$path/$SKILL_NAME"
        else
            dest="$path/$SKILL_NAME"
        fi

        case "|$seen|" in
            *"|$dest|"*) continue ;;
        esac
        seen="$seen|$dest"
        install_one "$platform" "$dest"
    done < <(platforms)
    exit 0
fi

if ! path="$(platform_path "$NORMALIZED" "$SCOPE" 2>/dev/null)"; then
    if [ "$NORMALIZED" = "copilot" ] && [ "$SCOPE" = "global" ]; then
        die "GitHub Copilot has no official global skills path; use --scope project or --target"
    fi
    die "no $SCOPE destination for platform: $NORMALIZED"
fi

if [ "$SCOPE" = "project" ]; then
    DEST="$PROJECT_ROOT/$path/$SKILL_NAME"
else
    DEST="$path/$SKILL_NAME"
fi

install_one "$NORMALIZED" "$DEST"
