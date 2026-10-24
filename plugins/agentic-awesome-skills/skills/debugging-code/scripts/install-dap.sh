#!/usr/bin/env bash
# Local hardening: require a reviewed release and independently verified digest.
set -euo pipefail
umask 077
REPO="AlmogBaku/debug-skill"
: "${DAP_VERSION:?Set a reviewed release tag}"
: "${DAP_SHA256:?Set the trusted platform asset SHA-256}"
[[ "$DAP_VERSION" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || exit 1
[[ "$DAP_SHA256" =~ ^[A-Fa-f0-9]{64}$ ]] || exit 1
case "$(uname -s)" in Darwin) task_os=darwin ;; Linux) task_os=linux ;; *) echo 'Unsupported OS' >&2; exit 1 ;; esac
case "$(uname -m)" in x86_64|amd64) task_arch=amd64 ;; arm64|aarch64) task_arch=arm64 ;; *) echo 'Unsupported architecture' >&2; exit 1 ;; esac
task_tmpdir=$(mktemp -d) || exit 1
trap 'rm -rf -- "$task_tmpdir"' EXIT
asset="dap-${task_os}-${task_arch}"
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
  --connect-timeout 10 --max-time 120 --max-filesize 104857600 \
  "https://github.com/$REPO/releases/download/$DAP_VERSION/$asset" -o "$task_tmpdir/dap"
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$task_tmpdir/dap"); actual=${actual%% *}
else
  actual=$(shasum -a 256 "$task_tmpdir/dap"); actual=${actual%% *}
fi
[[ "$(printf %s "$actual" | tr ABCDEF abcdef)" == "$(printf %s "$DAP_SHA256" | tr ABCDEF abcdef)" ]] || { echo 'Digest mismatch' >&2; exit 1; }
# No implicit sudo, PATH edits, fallback builds, or replacement of an existing binary.
install_dir="$HOME/.local/bin"
[[ ! -L "$install_dir" ]] || { echo 'Refusing symlink install directory' >&2; exit 1; }
mkdir -p "$install_dir"
if [[ -e "$install_dir/dap" || -L "$install_dir/dap" ]]; then
  echo 'Existing dap installation requires an explicit upgrade plan' >&2; exit 1
fi
# Reserve destination without clobbering it, then copy verified bytes.
(set -o noclobber; cat "$task_tmpdir/dap" > "$install_dir/dap")
chmod 700 "$install_dir/dap"
printf 'Installed reviewed dap release %s in %s\n' "$DAP_VERSION" "$install_dir"
