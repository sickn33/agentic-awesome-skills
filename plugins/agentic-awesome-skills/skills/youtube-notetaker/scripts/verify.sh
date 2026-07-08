#!/usr/bin/env bash
# Verify a video is correctly served by the standalone server + appears in the index.
# Usage: verify.sh <YTID> [base_url]
# Start the server first:  python3 scripts/serve.py --dir <LIBRARY> --port 8000
set -uo pipefail
YTID="${1:?usage: verify.sh <YTID> [base_url]}"
BASE="${2:-http://127.0.0.1:8000}"  # standalone serve.py default port
COLL="$BASE/api/video-deepdives"
fail=0

code(){ curl -s -o /dev/null -w '%{http_code}' "$1"; }

echo "1) collection list:"
C=$(code "$COLL"); echo "   GET $COLL -> $C"; [ "$C" = 200 ] || fail=1
if curl -s "$COLL" | grep -q "\"$YTID\""; then echo "   ✓ $YTID present in index"; else echo "   ✗ $YTID NOT in index"; fail=1; fi

echo "2) item:"
C=$(code "$COLL/$YTID"); echo "   GET $COLL/$YTID -> $C"; [ "$C" = 200 ] || fail=1

echo "3) first slide image:"
C=$(code "$COLL/_media/$YTID-slide-01.jpg"); echo "   GET .../_media/$YTID-slide-01.jpg -> $C"; [ "$C" = 200 ] || fail=1

echo "4) artifact shell:"
C=$(code "$BASE/"); echo "   GET / -> $C"; [ "$C" = 200 ] || fail=1

if [ "$fail" = 0 ]; then
  echo "ALL GOOD. Open: $BASE/#/$YTID"
else
  echo "SOME CHECKS FAILED — is serve.py running and pointed at the library that contains $YTID?"
fi
exit $fail
