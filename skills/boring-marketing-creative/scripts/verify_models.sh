#!/usr/bin/env bash
# verify_models.sh: re-verify every model ID in MODEL_REGISTRY.md against the
# Replicate API and rewrite ./brand/creative-stack.md with the results. It never touches
# ./brand/stack.md, which start-here owns.
#
# Usage:   bash scripts/verify_models.sh            (run from anywhere; needs REPLICATE_API_TOKEN)
# Exit:    0 = all models found, 1 = one or more failed, 2 = setup problem
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/../references/MODEL_REGISTRY.md"
STACK_FILE="${STACK_FILE:-./brand/creative-stack.md}"
API="https://api.replicate.com/v1/models"

if [ ! -f "$REGISTRY" ]; then
  echo "ERROR: registry not found at $REGISTRY" >&2
  exit 2
fi

if [ -z "${REPLICATE_API_TOKEN:-}" ]; then
  # Try to pick it up from a local .env without exporting anything else.
  if [ -f ./.env ]; then
    REPLICATE_API_TOKEN="$(grep -E '^REPLICATE_API_TOKEN=' ./.env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi
fi
if [ -z "${REPLICATE_API_TOKEN:-}" ]; then
  echo "ERROR: REPLICATE_API_TOKEN is not set (env or ./.env)." >&2
  exit 2
fi

# Extract the machine-readable roster: lines between ```models and the next ```.
MODELS="$(awk '/^```models$/{f=1;next} /^```$/{f=0} f && NF' "$REGISTRY")"
if [ -z "$MODELS" ]; then
  echo "ERROR: no \`\`\`models block found in $REGISTRY" >&2
  exit 2
fi

REG_VERSION="$(grep -E '^registry_version:' "$REGISTRY" | head -1 | awk '{print $2}')"
TODAY="$(date +%Y-%m-%d)"
PASS=0
FAIL=0
ROWS=""

printf '%-45s %s\n' "MODEL" "STATUS"
printf '%-45s %s\n' "-----" "------"

while IFS= read -r model; do
  [ -z "$model" ] && continue
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
    "$API/$model")"
  if [ "$code" = "200" ]; then
    status="PASS"
    PASS=$((PASS+1))
  else
    status="FAIL (HTTP $code)"
    FAIL=$((FAIL+1))
  fi
  printf '%-45s %s\n' "$model" "$status"
  ROWS="$ROWS| \`$model\` | $status |
"
done <<EOF
$MODELS
EOF

echo
echo "Result: $PASS pass / $FAIL fail"

mkdir -p "$(dirname "$STACK_FILE")"
{
  echo "# Creative Stack Status"
  echo
  echo "Last verified: $TODAY (registry_version ${REG_VERSION:-unknown}, scripts/verify_models.sh)"
  echo
  echo "| Model | Status |"
  echo "|-------|--------|"
  printf '%s' "$ROWS"
  echo
  if [ "$FAIL" -gt 0 ]; then
    echo "**$FAIL model(s) FAILED.** Check replicate.com for renames, update"
    echo "references/MODEL_REGISTRY.md (roster block + section), and re-run this script."
  else
    echo "All registry models verified. Safe to generate."
  fi
} > "$STACK_FILE"

echo "Wrote $STACK_FILE"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
