#!/bin/sh
set -eu

repository="JanYork/llm-wiki-cli"
version="0.14.7"
tag="v${version}"

die() {
  printf 'lwc installer: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

need curl
need uname
need awk
need grep
need mktemp

case "$(uname -s)" in
  Darwin)
    platform="apple-darwin"
    archive_extension="tar.gz"
    binary_name="lwc"
    ;;
  Linux)
    platform="unknown-linux-gnu"
    archive_extension="tar.gz"
    binary_name="lwc"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    platform="pc-windows-msvc"
    archive_extension="zip"
    binary_name="lwc.exe"
    ;;
  *)
    die "Unsupported operating system: $(uname -s)"
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64|AMD64)
    architecture="x86_64"
    ;;
  arm64|aarch64|ARM64)
    architecture="aarch64"
    ;;
  *)
    die "Unsupported architecture: $(uname -m)"
    ;;
esac

target="${architecture}-${platform}"
archive="lwc-${version}-${target}.${archive_extension}"
release_url="https://github.com/${repository}/releases/download/${tag}"

case "$archive" in
  lwc-0.14.7-aarch64-apple-darwin.tar.gz)
    expected_checksum="2bd22aed6246bfc7f25e73532928b0da40c08b827ba975afe05bd767053ad6fa"
    ;;
  lwc-0.14.7-x86_64-apple-darwin.tar.gz)
    expected_checksum="50d9ebf3c4f4d895043b0db4fbcee6d8d62f40d67a00e288515d5b42044df21b"
    ;;
  lwc-0.14.7-aarch64-unknown-linux-gnu.tar.gz)
    expected_checksum="6bed79a54293c8aa33006cfb2cc3ac233b82522c082d72d504a4daf37eeac18f"
    ;;
  lwc-0.14.7-x86_64-unknown-linux-gnu.tar.gz)
    expected_checksum="ef66a515fa62958e53fb87b8a79bea59912c987fbadb732d028be29252822568"
    ;;
  lwc-0.14.7-aarch64-pc-windows-msvc.zip)
    expected_checksum="cb69ca0752daeacaef52ae544f2b11425392b00002d6975db7f6804b1915707c"
    ;;
  lwc-0.14.7-x86_64-pc-windows-msvc.zip)
    expected_checksum="d973eeb84e018b19e0d41379f3afb60132b39a36fb29f0691ed99d9fd737fdfb"
    ;;
  *)
    die "No reviewed checksum is pinned for $archive"
    ;;
esac

if [ -n "${LWC_INSTALL_DIR:-}" ]; then
  install_dir="$LWC_INSTALL_DIR"
else
  existing="$(command -v lwc 2>/dev/null || true)"
  case "$existing" in
    "$HOME/.local/bin/lwc"|"$HOME/.local/bin/lwc.exe"|\
    "$HOME/.cargo/bin/lwc"|"$HOME/.cargo/bin/lwc.exe")
      install_dir="$(dirname "$existing")"
      ;;
    *)
      install_dir="$HOME/.local/bin"
      ;;
  esac
fi

destination="${install_dir}/${binary_name}"
if [ -x "$destination" ]; then
  current_version="$("$destination" --version 2>/dev/null || true)"
  if [ "$current_version" = "lwc ${version}" ]; then
    printf 'lwc %s is already installed at %s\n' "$version" "$destination"
    exit 0
  fi
  action="Updated"
else
  action="Installed"
fi

case "$archive_extension" in
  tar.gz) need tar ;;
  zip) need unzip ;;
esac

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/lwc-install.XXXXXX")" ||
  die "Could not create a temporary directory"
staged_binary=""
cleanup() {
  [ -z "$staged_binary" ] || rm -f "$staged_binary"
  rm -rf "$work_dir"
}
trap cleanup 0
trap 'exit 1' HUP INT TERM

curl -fsSL "$release_url/$archive" -o "$work_dir/$archive" ||
  die "Could not download $archive"

if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum="$(sha256sum "$work_dir/$archive" | awk '{ print $1 }')"
elif command -v shasum >/dev/null 2>&1; then
  actual_checksum="$(shasum -a 256 "$work_dir/$archive" | awk '{ print $1 }')"
elif command -v openssl >/dev/null 2>&1; then
  actual_checksum="$(openssl dgst -sha256 "$work_dir/$archive" | awk '{ print $NF }')"
else
  die "No SHA-256 tool found (sha256sum, shasum, or openssl)"
fi

expected_checksum="$(printf '%s' "$expected_checksum" | tr '[:upper:]' '[:lower:]')"
actual_checksum="$(printf '%s' "$actual_checksum" | tr '[:upper:]' '[:lower:]')"
[ "$actual_checksum" = "$expected_checksum" ] ||
  die "Checksum verification failed for $archive"

case "$archive_extension" in
  tar.gz)
    tar -xzf "$work_dir/$archive" -C "$work_dir"
    ;;
  zip)
    unzip -q "$work_dir/$archive" -d "$work_dir"
    ;;
esac

downloaded_binary="$work_dir/lwc-${version}-${target}/${binary_name}"
[ -f "$downloaded_binary" ] || die "Release archive does not contain $binary_name"
chmod +x "$downloaded_binary"
[ "$("$downloaded_binary" --version 2>/dev/null || true)" = "lwc ${version}" ] ||
  die "Downloaded binary failed its version check"

mkdir -p "$install_dir"
[ -w "$install_dir" ] || die "Install directory is not writable: $install_dir"

staged_binary="$install_dir/.lwc.install.$$"
cp "$downloaded_binary" "$staged_binary"
chmod +x "$staged_binary"
mv -f "$staged_binary" "$destination"
staged_binary=""

printf '%s lwc %s at %s\n' "$action" "$version" "$destination"
case ":${PATH}:" in
  *":${install_dir}:"*) ;;
  *) printf 'Add %s to PATH to run lwc directly.\n' "$install_dir" ;;
esac
