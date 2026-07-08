#!/usr/bin/env bash
# Resolve a YouTube id from a URL/id, print the scratch dir, and report embeddability.
# Usage: setup.sh "<youtube_url_or_id>"
#
# Library location is configurable via the VIDEO_LIBRARY_DIR env var
# (default: ~/video-deepdives). One markdown file per video lives there.
set -euo pipefail
IN="${1:?usage: setup.sh <youtube_url_or_id>}"
LIB="${VIDEO_LIBRARY_DIR:-$HOME/video-deepdives}"

# Extract 11-char id from common URL shapes, or accept a bare id.
YTID="$(printf '%s' "$IN" | sed -nE 's#.*(youtu\.be/|v=|/embed/|/shorts/)([A-Za-z0-9_-]{11}).*#\2#p')"
[ -z "$YTID" ] && [ "${#IN}" -eq 11 ] && YTID="$IN"
[ -z "$YTID" ] && { echo "Could not parse a YouTube id from: $IN" >&2; exit 1; }

SCRATCH="/tmp/ytnote-$YTID"
mkdir -p "$SCRATCH"

# Embeddability: oembed returns 200 if embedding allowed, 401 if the owner disabled it.
CODE="$(curl -s -o /dev/null -w '%{http_code}' \
  "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$YTID&format=json" || echo "000")"
if [ "$CODE" = "200" ]; then EMBED="allowed"; else EMBED="BLOCKED (oembed $CODE) — inline player disabled, artifact falls back to YouTube link"; fi

echo "YTID:    $YTID"
echo "SCRATCH: $SCRATCH"
echo "EMBED:   $EMBED"
echo "LIBRARY: $LIB/$YTID.md"
