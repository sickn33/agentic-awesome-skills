---
name: cmux
description: "Control cmux workspaces, panes, surfaces, and agent sessions safely from macOS terminal workflows."
category: development
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [cmux, terminal, agents, macos]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# cmux Control

## When to Use

- Use when you need to inspect, create, close, or rearrange cmux panes, surfaces, or workspaces.
- Use when you need to send input to or monitor agents running inside cmux.

cmux is a native macOS terminal app for running multiple AI coding agents in parallel. It exposes a CLI (`cmux`) and a Unix-socket JSON-RPC API (`/tmp/cmux.sock`) for full topology and browser control.

## Core Concepts

- **Window** — top-level macOS cmux window
- **Workspace** — sidebar tab within a window (one git branch / project context)
- **Pane** — split region inside a workspace
- **Surface** — tab inside a pane (terminal or browser)

Handles default to short refs (`workspace:2`, `pane:1`, `surface:7`); UUIDs accepted as input. Add `--id-format uuids|both` for UUID output.

### Ref syntax — get this right or fail silently

- **Always use PREFIXED refs** (`pane:38`, `surface:46`). A **bare number is treated as an INDEX, not an ID** — `--surface 46` means "the surface at index 46" (usually nonexistent → silent failure), NOT `surface:46`.
- **`read-screen` and `capture-pane` have NO `--pane` flag** — they target `--workspace` or `--surface` only. Passing `--pane` errors, and a bare/missing target falls back to your OWN surface (you'll read your own footer and draw wrong conclusions). To read a pane: resolve it to a surface FIRST with `cmux list-pane-surfaces --pane pane:N`, then `cmux read-screen --surface surface:N`.
- **Never append `2>/dev/null` to cmux commands.** Errors go to stderr with exit code 1; suppressing them blinds you to your own ref/flag mistakes (the #1 cause of "(no output)").

## Detect cmux in a Shell

```bash
[ -S "${CMUX_SOCKET_PATH:-/tmp/cmux.sock}" ] || exit 0   # bail if not in cmux
[ -n "${CMUX_WORKSPACE_ID:-}" ] && echo "inside cmux surface"
```

Injected env vars in every cmux-spawned terminal: `CMUX_WORKSPACE_ID`, `CMUX_SURFACE_ID`, `CMUX_SOCKET_PATH`, `CMUX_PORT`. **Always anchor automation to `CMUX_WORKSPACE_ID`** — the visually focused workspace may not be the agent's caller workspace.

## Fast Start — Topology

```bash
cmux identify --json                              # who am I (window/workspace/pane/surface)
cmux tree                                         # full hierarchy
cmux list-workspaces --json
cmux list-panes --workspace "$CMUX_WORKSPACE_ID"
cmux list-surfaces --workspace "$CMUX_WORKSPACE_ID"

cmux new-workspace --name "feature-x" --cwd /path/to/repo
cmux new-pane --workspace "$CMUX_WORKSPACE_ID" --type terminal --direction right --focus false
cmux new-pane --workspace "$CMUX_WORKSPACE_ID" --type browser  --direction right --url http://localhost:3000
cmux move-surface --surface surface:7 --pane pane:2 --focus false
cmux split-off --surface surface:7 right
cmux reorder-surface --surface surface:7 --before surface:3
cmux close-surface --surface surface:7
```

## Polling Pi Agents in Panes — Keep Sleeps Short

When launching a Pi Agent inside a cmux pane and polling for output, use **short `sleep` intervals (2–5s)**. Pi is fast and minimal, and the user runs it on Opus 4.8 Fast via OpenRouter, which streams tokens extremely quickly. Do NOT use `sleep 15` unless genuinely needed (a big build/refactor) — most of the time `sleep 2`–`sleep 5` is more than enough.

After every agent check, send the user a one-line status update: what the agent is doing and whether it is on track. Keep it extremely concise.

Claude Code cmux note: after Claude finishes, it may prefill a predicted next user message; that draft is Claude, not the user speaking.

## Send Input

**Command names:** there is NO `send-surface` / `send-key-surface`. Target a specific surface with the `--surface` flag on `send` / `send-key` (same commands as the focused terminal). `send-panel` / `send-key-panel` exist ONLY for panels (`--panel`), not surfaces.

```bash
cmux send "echo hi\n"                                       # focused terminal
cmux send-key "ctrl+c"                                       # enter|tab|esc|backspace|arrows|ctrl+x|shift+tab
cmux send --surface surface:7 "npm run build"               # specific surface (NOT send-surface)
cmux send-key --surface surface:7 enter                     # specific surface (NOT send-key-surface)
```

## Notifications & Sidebar Metadata

```bash
cmux notify --title "Done" --body "tests passed"
cmux set-status build "compiling" --icon hammer --color "#ff9500"
cmux set-progress 0.5 --label "Building..."
cmux log --level success "All 42 tests passed"               # info|progress|success|warning|error
cmux trigger-flash --workspace "$CMUX_WORKSPACE_ID"          # blue-ring attention cue
cmux sidebar-state --json                                    # dump all sidebar metadata
```

## Browser Automation (WKWebView)

Workflow: open → wait → snapshot → act → re-snapshot.

```bash
S=$(cmux --json browser open https://example.com | jq -r .result.surface_ref)
cmux browser "$S" wait --load-state complete --timeout-ms 15000
cmux browser "$S" snapshot --interactive                     # returns elements as e1, e2, ...
cmux browser "$S" fill e1 "<email-address>"
cmux browser "$S" click e2 --snapshot-after

# Navigation / inspection
cmux browser "$S" goto URL | back | forward | reload
cmux browser "$S" get url | get title | get text body | get value "#email" | get count ".row"
cmux browser "$S" eval 'return document.title'

# Waits
cmux browser "$S" wait --selector "#ready" --timeout-ms 10000
cmux browser "$S" wait --url-contains "/dashboard" --timeout-ms 10000

# Session
cmux browser "$S" cookies get | cookies set --name foo --value bar
cmux browser "$S" state save /tmp/auth.json | state load /tmp/auth.json

# Diagnostics
cmux browser "$S" console list | errors list | screenshot
```

**Not supported by WKWebView** (return `not_supported`): viewport emulation, geolocation/offline emulation, trace recording, network route interception, raw input injection.

## Markdown Viewer

```bash
cmux markdown open plan.md --direction right                 # live-watching renderer
cmux open file.pdf                                           # auto-routes to right viewer
```

`cmux markdown open` flags: `--workspace`, `--surface`, `--window`, `--direction <right|down|left|up>`, `--focus <true|false>`. There is **NO `--pane` flag** — passing it errors. To target a pane, pass `--surface <existing-md-surface-in-that-pane>`.

### Reuse the existing right markdown pane (don't spawn strays)

Default behavior of `markdown open` is to **create a new pane** every time, even with `--direction right`. To keep all docs as tabs in ONE right pane, follow this exactly:

```bash
# 1. Find the right pane and its surfaces (anchor to THIS workspace)
cmux list-panes --workspace "$CMUX_WORKSPACE_ID"
cmux list-pane-surfaces --pane pane:10        # the right/helper pane

# 2. Open targeting an existing markdown surface IN that pane (reuses pane, adds tab)
cmux markdown open /abs/path/file.md --surface surface:12 --focus false

# 3. If it STILL spawned a new pane (it can), move the new surface in + verify
cmux move-surface --surface surface:NEW --pane pane:10 --focus false
cmux list-panes --workspace "$CMUX_WORKSPACE_ID"   # confirm stray pane is gone
```

### Swapping the file in the single right pane (close-FIRST, then open)

To replace the doc shown in your one right markdown pane, the ONLY reliable order is **close the previous surface FIRST, then `markdown open` the new file fresh** — never move an existing viewer, never open-then-close.

```bash
# 1. close the previous right markdown surface (right side goes empty)
cmux list-panes --workspace "$CMUX_WORKSPACE_ID"
cmux close-surface --surface surface:PREV
# 2. THEN open the new file fresh
cmux markdown open /abs/path/new.md --direction right --focus false
```

ORDER MATTERS: close-previous BEFORE open-new. Opening first then closing the old one, or `move-surface`-ing an existing viewer, leaves the right pane BLANK.

### Hard-won lessons (avoid the trial-and-error)

- **Surface refs are global, not per-workspace.** A ref like `surface:126` from an earlier `markdown open` may live in a different window/workspace. Always re-list (`list-panes` / `list-pane-surfaces`) before reusing a ref — never assume a ref from a previous turn is still in the right pane.
- **`move-surface`-ing a markdown viewer often leaves it BLANK.** The moved surface keeps `type=markdown` and `surface-health` looks fine, but renders nothing. Fix: `close-surface` it and `cmux markdown open <path>` fresh, then move the *fresh* surface if needed. Don't waste time on `refresh-surfaces` — it usually won't fix a moved-then-blank viewer.
- **You cannot screenshot or `read-screen` a markdown surface** (`Surface is not a terminal` / browser screenshot is WKWebView-only). To verify a markdown viewer rendered, ask the user or open the file in a browser surface instead. Don't burn turns trying to capture it.
- **`cmux list-surfaces` does not exist.** Use `cmux list-pane-surfaces [--pane ...]`.

## Settings & Config

```bash
cmux docs settings        # prints paths, schema URL, reload cmd — read BEFORE editing
cmux settings path        # path to cmux.json
cmux settings cmux-json   # open in editor
cmux reload-config        # hot-reload cmux.json + ~/.config/ghostty/config (Cmd+Shift+,)
```

Locations:
- cmux settings: `~/.config/cmux/cmux.json` (canonical). Project-local override: `.cmux/cmux.json` or `./cmux.json`.
- Terminal rendering (font, cursor, theme, scrollback, opacity, blur): `~/.config/ghostty/config` — NOT cmux.json.

Before editing `cmux.json`, copy it to a timestamped `.bak` next to it so the user can revert. Schema: `https://raw.githubusercontent.com/manaflow-ai/cmux/main/web/data/cmux.schema.json`.

## Agent Hooks & Install

```bash
brew tap manaflow-ai/cmux && brew install --cask cmux
sudo ln -sf /Applications/cmux.app/Contents/Resources/bin/cmux /usr/local/bin/cmux
cmux hooks setup                                             # all detected agents
cmux hooks setup codex|grok|antigravity|opencode             # specific agent
npx skills add manaflow-ai/cmux -g -y                        # install cmux skills for agents
```

Native session-resume supported for: Claude Code, Codex, Grok, OpenCode, Pi, Amp, Cursor CLI, Gemini, Antigravity, Rovo Dev, Hermes, Copilot, CodeBuddy, Factory, Qoder.

## Socket API (advanced)

`/tmp/cmux.sock` — Unix socket, JSON-RPC v2. Use for tight loops where subprocess spawn cost matters; otherwise prefer the CLI.

```bash
echo '{"id":"1","method":"workspace.list","params":{}}' | nc -U /tmp/cmux.sock
```

Method prefixes: `system.*`, `window.*`, `workspace.*`, `pane.*`, `surface.*`, `notification.*`, `browser.*`. Full list and Python client example in `references/socket-api.md`.

Access modes: `cmuxOnly` (default — only cmux-spawned processes), `automation` (any local process), `password`, `allowAll` (unsafe). If you hit `Failed to connect to socket`, you're likely an external process under `cmuxOnly` — switch mode in Settings > Automation or run from inside a cmux terminal.

## Critical Rules — Non-Disruptive Automation

These rules come from the `cmux-workspace` skill and prevent agents from yanking the user's focus:

1. **Anchor to `CMUX_WORKSPACE_ID`.** Never assume the visually focused workspace is the target.
2. **Never call focus-changing verbs speculatively.** `select-workspace`, `focus-pane`, `focus-panel`, `focus-surface` only on explicit user request. Pass `--focus false` whenever available.
3. **Build layout additively in one call.** `cmux new-pane --type … --focus false` beats create-then-move-then-focus chains.
4. **Right-side helper pane pattern.** Reuse an existing non-caller helper pane if present; otherwise create exactly one right-side pane.
5. **Never send input to surfaces you don't own.** Only target surfaces in the caller's workspace unless the user explicitly asks for cross-workspace routing.
6. **Check surface health before routing input** when UI state may be stale: `cmux surface-health`.

## Common Pitfalls

- **Pi/Pi-like socket connection failures from external processes** → default `cmuxOnly` mode; either run inside a cmux terminal or change socket mode.
- **macOS only.** No Linux/Windows port.
- **WKWebView ≠ CDP.** Don't expect Playwright-equivalent network mocking or viewport emulation.
- **Resume strips sensitive env vars.** Re-inject tokens at resume time if the agent needs them.
- **Skills snapshot at app start.** Edits to skill files require a restart of the consuming agent.
- **Legacy v1 socket payloads (`{"command":...}`) rejected.** Use v2 JSON-RPC only.
- **Don't `cat ~/.cmuxterm/*-hook-sessions.json`** expecting secrets — they're scrubbed. Look there for session/surface mappings only.

## Reference: Full CLI Help

For any command, `cmux <cmd> --help` is authoritative. Use `cmux capabilities --json` to enumerate available socket methods in the current build.

## Keyboard Shortcuts (most-used)

Workspaces: ⌘N new, ⌘1–8 jump, ⌃⌘[ / ⌃⌘] prev/next, ⌘⇧W close, ⌘B sidebar.
Surfaces: ⌘T new, ⌘⇧[ / ⌘⇧] prev/next, ⌘W close, ⌃1–8 jump.
Splits: ⌘D right, ⌘⇧D down, ⌥⌘D browser right, ⌥⌘←→↑↓ focus directional, ⌘⇧↵ zoom.
Browser: ⌘⇧L open, ⌘L address bar, ⌘[/⌘] back/forward, ⌥⌘I devtools.
App: ⌘, settings, ⌘⇧, reload-config, ⌘⇧P palette, ⌘⇧O restore session, ⌃⌥⌘. system-wide show/hide.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
