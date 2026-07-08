# Installing Debug Adapters

`dap` relies on language-specific debug adapters (backends). Many IDEs already ship them — **check before installing**.

---

## Python — debugpy

**Check:** `python3 -m debugpy --version`

**Install:** `pip install debugpy`

**Virtualenv:** `dap` picks up the active venv automatically via `$VIRTUAL_ENV`.
Activate the venv (`source .venv/bin/activate`) before running `dap debug`, or pass
`--python /path/to/venv/bin/python` to override. Without either, `dap` falls back
to `python3` on PATH — which may not have `debugpy` installed or may be the wrong
interpreter version.

---

## Go — Delve

**Check:** `dlv version`

**Install:**
- macOS: `brew install delve` (or `go install github.com/go-delve/delve/cmd/dlv@latest`)
- Linux: `go install github.com/go-delve/delve/cmd/dlv@latest`

macOS note: you may need `sudo DevToolsSecurity -enable` for debugging permissions.

---

## Node.js/TypeScript — js-debug

`dap` auto-discovers js-debug from common locations:
- VS Code extensions (`~/.vscode/extensions/`)
- Cursor extensions (`~/.cursor/extensions/`)
- Standalone install (`~/.dap-cli/js-debug/`)

**Check:** Look for js-debug in the paths above, or run `dap debug --backend js-debug script.js` — if it fails, install below.

**Standalone install** (only if not found above):
```bash
DAP_VER=$(curl -fsSL https://api.github.com/repos/microsoft/vscode-js-debug/releases/latest | grep -o '"tag_name":"[^"]*"' | cut -d'"' -f4) && \
mkdir -p ~/.dap-cli/js-debug && \
curl -fsSL "https://github.com/microsoft/vscode-js-debug/releases/download/${DAP_VER}/js-debug-dap-${DAP_VER}.tar.gz" | tar -xz -C ~/.dap-cli/js-debug
```

Also supports **Chrome DevTools debugging** for browser-side JavaScript.

---

## Rust/C/C++ — lldb-dap

**Check:** `lldb-dap --version`

**Install:**
- macOS: `brew install llvm` (v18+ required)
- Linux: `apt install lldb` (or equivalent for your distro)

After Homebrew install, ensure the Homebrew `llvm` bin is on your PATH (e.g. `export PATH="$(brew --prefix llvm)/bin:$PATH"`).

---

## Known Gotchas

- **lldb-dap on macOS**: The version bundled with Xcode Command Line Tools (v17) lacks the `--connection` flag that `dap` requires. Use the Homebrew `llvm` package (v18+) instead.
