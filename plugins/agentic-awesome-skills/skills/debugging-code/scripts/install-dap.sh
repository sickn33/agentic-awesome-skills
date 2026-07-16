#!/usr/bin/env bash
set -euo pipefail

REPO="AlmogBaku/debug-skill"
BINARY="dap"

go_install_fallback() {
  if ! command -v go >/dev/null 2>&1; then
    echo "Error: go is not installed. Install Go from https://go.dev/dl/ and re-run, or download a binary from:"
    echo "  https://github.com/$REPO/releases/latest"
    exit 1
  fi
  echo "Falling back to go install..."
  go install "github.com/$REPO/cmd/dap@latest"
  exit 0
}

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
  linux)  OS="linux" ;;
  darwin) OS="darwin" ;;
  *)
    echo "Unsupported OS: $OS."
    go_install_fallback
    ;;
esac

# Detect arch
ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64)  ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH."
    go_install_fallback
    ;;
esac

ASSET_NAME="dap-${OS}-${ARCH}"

# Get latest release tag
LATEST=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep '"tag_name"' \
  | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [ -z "$LATEST" ]; then
  echo "Could not determine latest release."
  go_install_fallback
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST/$ASSET_NAME"

# Determine install location
if mkdir -p "$HOME/.local/bin" 2>/dev/null && [ -w "$HOME/.local/bin" ]; then
  INSTALL_DIR="$HOME/.local/bin"
elif [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
else
  echo "Error: no writable install directory found. Try running with sudo or ensure ~/.local/bin is accessible."
  exit 1
fi

INSTALL_PATH="$INSTALL_DIR/$BINARY"

echo "Downloading $ASSET_NAME ($LATEST)..."
if ! curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_PATH"; then
  rm -f "$INSTALL_PATH"
  echo "Download failed."
  go_install_fallback
fi

chmod +x "$INSTALL_PATH"
echo "Installed $BINARY to $INSTALL_PATH"

# Suggest PATH update if needed
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "NOTE: Add $INSTALL_DIR to your PATH."
  # Suggest the right shell config file
  case "${SHELL:-}" in
    */zsh)  RC_FILE="~/.zshrc" ;;
    */fish) RC_FILE="~/.config/fish/config.fish" ;;
    *)      RC_FILE="~/.bashrc" ;;
  esac
  echo "  echo 'export PATH=\"\$PATH:$INSTALL_DIR\"' >> $RC_FILE"
fi
