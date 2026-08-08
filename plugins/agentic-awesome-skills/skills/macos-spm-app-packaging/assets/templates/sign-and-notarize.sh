#!/usr/bin/env bash
set -euo pipefail

APP_NAME=${APP_NAME:-MyApp}
APP_IDENTITY=${APP_IDENTITY:-"Developer ID Application: Example (TEAMID)"}
APP_BUNDLE="${APP_NAME}.app"
ROOT=$(cd "$(dirname "$0")/.." && pwd)

read_version_env() {
  local file=$1 line key value
  local saw_marketing=0 saw_build=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line=${line%$'\r'}
    [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *=* ]] || { echo "Invalid version.env line" >&2; return 1; }
    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      MARKETING_VERSION)
        [[ "$value" =~ ^[0-9]+(\.[0-9]+){1,3}([+-][0-9A-Za-z.-]+)?$ ]] || {
          echo "Invalid MARKETING_VERSION in version.env" >&2; return 1;
        }
        MARKETING_VERSION=$value
        saw_marketing=1
        ;;
      BUILD_NUMBER)
        [[ "$value" =~ ^[0-9]+$ ]] || {
          echo "Invalid BUILD_NUMBER in version.env" >&2; return 1;
        }
        BUILD_NUMBER=$value
        saw_build=1
        ;;
      *) echo "Unknown key in version.env: $key" >&2; return 1 ;;
    esac
  done < "$file"
  (( saw_marketing == 1 && saw_build == 1 )) || {
    echo "version.env must define MARKETING_VERSION and BUILD_NUMBER" >&2
    return 1
  }
}

[[ -f "$ROOT/version.env" ]] || { echo "Missing version.env" >&2; exit 1; }
read_version_env "$ROOT/version.env"
ZIP_NAME="${APP_NAME}-${MARKETING_VERSION}.zip"

if [[ -z "${APP_STORE_CONNECT_API_KEY_P8:-}" || -z "${APP_STORE_CONNECT_KEY_ID:-}" || -z "${APP_STORE_CONNECT_ISSUER_ID:-}" ]]; then
  echo "Missing APP_STORE_CONNECT_* env vars (API key, key id, issuer id)." >&2
  exit 1
fi

TEMP_DIR=$(mktemp -d)
chmod 700 "$TEMP_DIR"
KEY_PATH="$TEMP_DIR/app-store-connect-key.p8"
NOTARY_ZIP="$TEMP_DIR/${APP_NAME}Notarize.zip"
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > "$KEY_PATH"

ARCHES_VALUE=${ARCHES:-"arm64 x86_64"}
ARCH_LIST=( ${ARCHES_VALUE} )
for ARCH in "${ARCH_LIST[@]}"; do
  swift build -c release --arch "$ARCH"
done
ARCHES="${ARCHES_VALUE}" "$ROOT/Scripts/package_app.sh" release

ENTITLEMENTS_DIR="$ROOT/.build/entitlements"
APP_ENTITLEMENTS="${APP_ENTITLEMENTS:-${ENTITLEMENTS_DIR}/${APP_NAME}.entitlements}"

codesign --force --timestamp --options runtime --sign "$APP_IDENTITY" \
  --entitlements "$APP_ENTITLEMENTS" \
  "$APP_BUNDLE"

DITTO_BIN=${DITTO_BIN:-/usr/bin/ditto}
"$DITTO_BIN" --norsrc -c -k --keepParent "$APP_BUNDLE" "$NOTARY_ZIP"

xcrun notarytool submit "$NOTARY_ZIP" \
  --key "$KEY_PATH" \
  --key-id "$APP_STORE_CONNECT_KEY_ID" \
  --issuer "$APP_STORE_CONNECT_ISSUER_ID" \
  --wait

xcrun stapler staple "$APP_BUNDLE"

xattr -cr "$APP_BUNDLE"
find "$APP_BUNDLE" -name '._*' -delete

"$DITTO_BIN" --norsrc -c -k --keepParent "$APP_BUNDLE" "$ZIP_NAME"

spctl -a -t exec -vv "$APP_BUNDLE"
stapler validate "$APP_BUNDLE"

echo "Done: $ZIP_NAME"
