#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://www.html-docs.com"
CREDENTIALS_FILE="$HOME/.htmldocs/credentials"
API_KEY=""
API_KEY_SOURCE="none"
SLUG=""
TITLE=""
CLIENT=""
TARGET=""
DOC_ID=""
DOC_TOKEN=""

if [[ -n "${HTMLDOCS_API_KEY:-}" ]]; then
  API_KEY="$HTMLDOCS_API_KEY"
  API_KEY_SOURCE="env"
fi

usage() {
  cat <<'USAGE'
Usage: publish.sh <file-or-dir> [options]

Publish HTML files and directories to html-docs.com.

Options:
  --api-key <key>         API key (or set $HTMLDOCS_API_KEY)
  --slug <slug>           Custom slug for the hosted URL
  --title <text>          Document title
  --client <name>         Agent name for attribution (e.g. cursor, claude-code)
  --doc-id <id>           Update an existing document (requires --doc-token or --api-key)
  --doc-token <token>     Token for updating an existing anonymous document
  --base-url <url>        API base (default: https://www.html-docs.com)

Examples:
  publish.sh page.html                          # anonymous publish
  publish.sh dashboard.html --slug my-dash      # custom slug
  publish.sh ./site/ --api-key hdk_xxx          # authenticated, directory
  publish.sh page.html --doc-id <id> --doc-token <tok>  # update existing
USAGE
  exit 1
}

die() { echo "error: $1" >&2; exit 1; }

for cmd in curl; do
  command -v "$cmd" >/dev/null 2>&1 || die "requires $cmd"
done

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-key)      API_KEY="$2"; API_KEY_SOURCE="flag"; shift 2 ;;
    --slug)         SLUG="$2"; shift 2 ;;
    --title)        TITLE="$2"; shift 2 ;;
    --client)       CLIENT="$2"; shift 2 ;;
    --doc-id)       DOC_ID="$2"; shift 2 ;;
    --doc-token)    DOC_TOKEN="$2"; shift 2 ;;
    --base-url)     BASE_URL="$2"; shift 2 ;;
    --help|-h)      usage ;;
    -*)             die "unknown option: $1" ;;
    *)              [[ -z "$TARGET" ]] && TARGET="$1" || die "unexpected argument: $1"; shift ;;
  esac
done

[[ -n "$TARGET" ]] || usage
[[ -e "$TARGET" ]] || die "path does not exist: $TARGET"

# Load API key from credentials file if not provided
if [[ -z "$API_KEY" && -f "$CREDENTIALS_FILE" ]]; then
  API_KEY=$(cat "$CREDENTIALS_FILE" | tr -d '[:space:]')
  [[ -n "$API_KEY" ]] && API_KEY_SOURCE="credentials"
fi

BASE_URL="${BASE_URL%/}"

# ── Determine content to send ──────────────────────────────────────

CONTENT=""
CONTENT_TYPE="text/html"

if [[ -f "$TARGET" ]]; then
  CONTENT=$(cat "$TARGET")
  # Detect markdown
  case "${TARGET##*.}" in
    md|markdown)
      CONTENT_TYPE="text/markdown"
      ;;
  esac
elif [[ -d "$TARGET" ]]; then
  # For directories, look for index.html
  if [[ -f "$TARGET/index.html" ]]; then
    CONTENT=$(cat "$TARGET/index.html")
  elif [[ -f "$TARGET/index.htm" ]]; then
    CONTENT=$(cat "$TARGET/index.htm")
  elif [[ -f "$TARGET/index.md" ]]; then
    CONTENT=$(cat "$TARGET/index.md")
    CONTENT_TYPE="text/markdown"
  else
    die "no index.html, index.htm, or index.md found in $TARGET"
  fi
else
  die "not a file or directory: $TARGET"
fi

[[ -n "$CONTENT" ]] || die "empty file"

# ── Build request ──────────────────────────────────────────────────

AUTH_ARGS=()
if [[ -n "$API_KEY" ]]; then
  AUTH_ARGS=(-H "authorization: Bearer $API_KEY")
fi

EXTRA_HEADERS=()
if [[ -n "$SLUG" ]]; then
  EXTRA_HEADERS+=(-H "x-slug: $SLUG")
fi
if [[ -n "$CLIENT" ]]; then
  EXTRA_HEADERS+=(-H "x-agent-name: $CLIENT")
fi
if [[ -n "$TITLE" ]]; then
  EXTRA_HEADERS+=(-H "x-doc-title: $TITLE")
fi

# ── Send request ───────────────────────────────────────────────────

if [[ -n "$DOC_ID" ]]; then
  # Update existing document
  URL="$BASE_URL/api/v1/docs/$DOC_ID"
  METHOD="PUT"
  TOKEN_ARGS=()
  if [[ -n "$DOC_TOKEN" && -z "$API_KEY" ]]; then
    TOKEN_ARGS=(-H "x-doc-token: $DOC_TOKEN")
  fi

  RESPONSE=$(curl -sS -X "$METHOD" "$URL" \
    -H "content-type: $CONTENT_TYPE" \
    "${AUTH_ARGS[@]}" \
    "${TOKEN_ARGS[@]}" \
    "${EXTRA_HEADERS[@]}" \
    --data-binary "$CONTENT" 2>&1) || true
else
  # Create new document
  URL="$BASE_URL/api/v1/docs"

  RESPONSE=$(curl -sS -X POST "$URL" \
    -H "content-type: $CONTENT_TYPE" \
    "${AUTH_ARGS[@]}" \
    "${EXTRA_HEADERS[@]}" \
    --data-binary "$CONTENT" 2>&1) || true
fi

# ── Parse response ─────────────────────────────────────────────────

# Check for error
if echo "$RESPONSE" | grep -q '"error"'; then
  err=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | head -1 | sed 's/"error":"//;s/"$//')
  die "$err"
fi

# Extract fields
SITE_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//;s/"$//')
OUT_SLUG=$(echo "$RESPONSE" | grep -o '"slug":"[^"]*"' | head -1 | sed 's/"slug":"//;s/"$//')
EDIT_URL=$(echo "$RESPONSE" | grep -o '"editUrl":"[^"]*"' | head -1 | sed 's/"editUrl":"//;s/"$//')
OUT_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | sed 's/"token":"//;s/"$//')
OUT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"$//')

# Output the hosted URL (primary output on stdout)
echo "$SITE_URL"

# Structured metadata on stderr
echo "" >&2
echo "publish_result.url=$SITE_URL" >&2
echo "publish_result.slug=$OUT_SLUG" >&2
echo "publish_result.edit_url=$EDIT_URL" >&2
echo "publish_result.token=$OUT_TOKEN" >&2
echo "publish_result.id=$OUT_ID" >&2
echo "publish_result.api_key_source=$API_KEY_SOURCE" >&2

if [[ -n "$API_KEY" ]]; then
  echo "publish_result.auth_mode=authenticated" >&2
  echo "publish_result.persistence=permanent" >&2
else
  echo "publish_result.auth_mode=anonymous" >&2
fi
