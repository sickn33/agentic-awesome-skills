#!/usr/bin/env bash
# Setup stable development code signing to reduce keychain prompts.
set -euo pipefail

APP_NAME=${APP_NAME:-MyApp}
CERT_NAME="${APP_NAME} Development"

if security find-certificate -c "$CERT_NAME" >/dev/null 2>&1; then
  echo "Certificate '$CERT_NAME' already exists."
  echo "Export this in your shell profile:"
  echo "  export APP_IDENTITY='$CERT_NAME'"
  exit 0
fi

echo "Creating self-signed certificate '$CERT_NAME'..."

TEMP_DIR=$(mktemp -d)
chmod 700 "$TEMP_DIR"
TEMP_CONFIG="$TEMP_DIR/dev.cnf"
KEY_PATH="$TEMP_DIR/dev.key"
CRT_PATH="$TEMP_DIR/dev.crt"
P12_PATH="$TEMP_DIR/dev.p12"
trap 'rm -rf "$TEMP_DIR"' EXIT

cat > "$TEMP_CONFIG" <<EOFCONF
[ req ]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[ req_distinguished_name ]
CN = $CERT_NAME
O = ${APP_NAME} Development
C = US

[ v3_req ]
keyUsage = critical,digitalSignature
extendedKeyUsage = codeSigning
EOFCONF

openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
    -nodes -keyout "$KEY_PATH" -out "$CRT_PATH" \
    -config "$TEMP_CONFIG" 2>/dev/null

openssl pkcs12 -export -out "$P12_PATH" \
    -inkey "$KEY_PATH" -in "$CRT_PATH" \
    -passout pass: 2>/dev/null

security import "$P12_PATH" -k ~/Library/Keychains/login.keychain-db \
  -T /usr/bin/codesign -T /usr/bin/security

echo ""
echo "Trust this certificate for code signing in Keychain Access."
echo "Then export in your shell profile:"
echo "  export APP_IDENTITY='$CERT_NAME'"
