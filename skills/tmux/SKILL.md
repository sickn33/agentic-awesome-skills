---
name: tmux
description: "Expert tmux session, window, and pane management for terminal multiplexing, persistent remote workflows, and shell scripting automation."
category: development
risk: safe
source: community
date_added: "2026-03-28"
author: kostakost2
tags: [tmux, terminal, multiplexer, sessions, shell, remote, automation]
tools: [claude, cursor, gemini]
---

# tmux — Terminal Multiplexer

## Overview

`tmux` keeps terminal sessions alive across SSH disconnects, splits work across multiple panes, and enables fully scriptable terminal automation. This skill covers session management, window/pane layout, keybinding patterns, and using `tmux` non-interactively from shell scripts — essential for remote servers, long-running jobs, and automated workflows.

## When to Use This Skill

- Use when setting up or managing persistent terminal sessions on remote servers
- Use when the user needs to run long-running processes that survive SSH disconnects
- Use when scripting multi-pane terminal layouts (e.g., logs + shell + editor)
- Use when automating `tmux` commands from bash scripts without user interaction

## How It Works

`tmux` has three hierarchy levels: **sessions** (top level, survives disconnects), **windows** (tabs within a session), and **panes** (splits within a window). Everything is controllable from outside via `tmux <command>` or from inside via the prefix key (`Ctrl-b` by default).

### Session Management

```bash
# Create a new named session
tmux new-session -s work

# Create detached (background) session
tmux new-session -d -s work

# Create detached session and start a command
tmux new-session -d -s build -x 220 -y 50 "make all"

# Attach to a session
tmux attach -t work
tmux attach          # attaches to most recent session

# List all sessions
tmux list-sessions
tmux ls

# Detach from inside tmux
# Prefix + d   (Ctrl-b d)

# Kill a session
tmux kill-session -t work

# Kill all sessions except the current one
tmux kill-session -a

# Rename a session from outside
tmux rename-session -t old-name new-name

# Switch to another session from outside
tmux switch-client -t other-session

# Check if a session exists (useful in scripts)
tmux has-session -t work 2>/dev/null && echo "exists"
```

### Window Management

```bash
# Create a new window in the current session
tmux new-window -t work -n "logs"

# Create a window running a specific command
tmux new-window -t work:3 -n "server" "python -m http.server 8080"

# List windows
tmux list-windows -t work

# Select (switch to) a window
tmux select-window -t work:logs
tmux select-window -t work:2       # by index

# Rename a window
tmux rename-window -t work:2 "editor"

# Kill a window
tmux kill-window -t work:logs

# Move window to a new index
tmux move-window -s work:3 -t work:1

# From inside tmux:
# Prefix + c     — new window
# Prefix + ,     — rename window
# Prefix + &     — kill window
# Prefix + n/p   — next/previous window
# Prefix + 0-9   — switch to window by number
```

### Pane Management

```bash
# Split pane vertically (left/right)
tmux split-window -h -t work:1

# Split pane horizontally (top/bottom)
tmux split-window -v -t work:1

# Split and run a command
tmux split-window -h -t work:1 "tail -f /var/log/syslog"

# Select a pane by index
tmux select-pane -t work:1.0

# Resize panes
tmux resize-pane -t work:1.0 -R 20   # expand right by 20 cols
tmux resize-pane -t work:1.0 -D 10   # shrink down by 10 rows
tmux resize-pane -Z                   # toggle zoom (fullscreen)

# Swap panes
tmux swap-pane -s work:1.0 -t work:1.1

# Kill a pane
tmux kill-pane -t work:1.1

# From inside tmux:
# Prefix + %     — split vertical
# Prefix + "     — split horizontal
# Prefix + arrow — navigate panes
# Prefix + z     — zoom/unzoom current pane
# Prefix + x     — kill pane
# Prefix + {/}   — swap pane with previous/next
```

### Sending Commands to Panes Without Being Attached

```bash
# Send a command to a specific pane and press Enter
tmux send-keys -t work:1.0 "ls -la" Enter

# Run a command in a background pane without attaching
tmux send-keys -t work:editor "vim src/main.py" Enter

# Send Ctrl+C to stop a running process
tmux send-keys -t work:1.0 C-c

# Send text without pressing Enter (useful for pre-filling prompts)
tmux send-keys -t work:1.0 "git commit -m '"

# Clear a pane
tmux send-keys -t work:1.0 "clear" Enter

# Check what's in a pane (capture its output)
tmux capture-pane -t work:1.0 -p
tmux capture-pane -t work:1.0 -p | grep "ERROR"
```

### Scripting a Full Workspace Layout

This is the most powerful pattern: create a fully configured multi-pane workspace from a single script.

```bash
#!/usr/bin/env bash
set -euo pipefail

SESSION="dev"

# Bail if session already exists
tmux has-session -t "$SESSION" 2>/dev/null && {
  echo "Session $SESSION already exists. Attaching..."
  tmux attach -t "$SESSION"
  exit 0
}

# Create session with first window
tmux new-session -d -s "$SESSION" -n "editor" -x 220 -y 50

# Window 1: editor + test runner side by side
tmux send-keys -t "$SESSION:editor" "vim ." Enter
tmux split-window -h -t "$SESSION:editor"
tmux send-keys -t "$SESSION:editor.1" "npm test -- --watch" Enter
tmux select-pane -t "$SESSION:editor.0"

# Window 2: server logs
tmux new-window -t "$SESSION" -n "server"
tmux send-keys -t "$SESSION:server" "docker compose up" Enter
tmux split-window -v -t "$SESSION:server"
tmux send-keys -t "$SESSION:server.1" "tail -f logs/app.log" Enter

# Window 3: general shell
tmux new-window -t "$SESSION" -n "shell"

# Focus first window
tmux select-window -t "$SESSION:editor"

# Attach
tmux attach -t "$SESSION"
```

### Configuration (`~/.tmux.conf`)

```bash
# Change prefix to Ctrl-a (screen-style)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Enable mouse support
set -g mouse on

# Start window/pane numbering at 1
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows when one is closed
set -g renumber-windows on

# Increase scrollback buffer
set -g history-limit 50000

# Use vi keys in copy mode
setw -g mode-keys vi

# Faster key repetition
set -s escape-time 0

# Reload config without restarting
bind r source-file ~/.tmux.conf \; display "Config reloaded"

# Intuitive splits: | and -
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# New windows open in current directory
bind c new-window -c "#{pane_current_path}"

# Status bar
set -g status-right "#{session_name} | %H:%M %d-%b"
set -g status-interval 5
```

### Copy Mode and Scrollback

```bash
# Enter copy mode (scroll up through output)
# Prefix + [

# In vi mode:
# / to search forward, ? to search backward
# Space to start selection, Enter to copy
# q to exit copy mode

# Paste the most recent buffer
# Prefix + ]

# List paste buffers
tmux list-buffers

# Show the most recent buffer
tmux show-buffer

# Save buffer to a file
tmux save-buffer /tmp/tmux-output.txt

# Load a file into a buffer
tmux load-buffer /tmp/data.txt

# Pipe pane output to a command
tmux pipe-pane -t work:1.0 "cat >> ~/session.log"
```

### Practical Automation Patterns

```bash
# Idempotent session: create or attach
ensure_session() {
  local name="$1"
  tmux has-session -t "$name" 2>/dev/null \
    || tmux new-session -d -s "$name"
  tmux attach -t "$name"
}

# Run a command in a new background window and tail its output
run_bg() {
  local session="${1:-main}" cmd="${*:2}"
  tmux new-window -t "$session" -n "bg-$$"
  tmux send-keys -t "$session:bg-$$" "$cmd" Enter
}

# Wait for a pane to produce specific output (polling)
wait_for_output() {
  local target="$1" pattern="$2" timeout="${3:-30}"
  local elapsed=0
  while (( elapsed < timeout )); do
    tmux capture-pane -t "$target" -p | grep -q "$pattern" && return 0
    sleep 1
    (( elapsed++ ))
  done
  return 1
}

# Kill all background windows matching a name prefix
kill_bg_windows() {
  local session="$1" prefix="${2:-bg-}"
  tmux list-windows -t "$session" -F "#W" \
    | grep "^${prefix}" \
    | while read -r win; do
        tmux kill-window -t "${session}:${win}"
      done
}
```

### Remote and SSH Workflows

```bash
# SSH and immediately attach to an existing session
ssh user@host -t "tmux attach -t work || tmux new-session -s work"

# Run a command on remote host inside a tmux session (fire and forget)
ssh user@host "tmux new-session -d -s deploy 'bash /opt/deploy.sh'"

# Watch the remote session output from another terminal
ssh user@host -t "tmux attach -t deploy -r"  # read-only attach

# Pair programming: share a session (both users attach to the same session)
# User 1:
tmux new-session -s shared
# User 2 (same server):
tmux attach -t shared
```

## Best Practices

- Always name sessions (`-s name`) in scripts — unnamed sessions are hard to target reliably
- Use `tmux has-session -t name 2>/dev/null` before creating to make scripts idempotent
- Set `-x` and `-y` when creating detached sessions to give panes a proper size for commands that check terminal dimensions
- Use `send-keys ... Enter` for automation rather than piping stdin — it works even when the target pane is running an interactive program
- Keep `~/.tmux.conf` in version control for reproducibility across machines
- Prefer `bind -n` for bindings that don't need the prefix, but only for keys that don't conflict with application shortcuts

## Security & Safety Notes

- `send-keys` executes commands in a pane without confirmation — verify the target (`-t session:window.pane`) before use in scripts to avoid sending keystrokes to the wrong pane
- Read-only attach (`-r`) is appropriate when sharing sessions with others to prevent accidental input
- Avoid storing secrets in tmux window/pane titles or environment variables exported into sessions on shared machines

## Common Pitfalls

- **Problem:** `tmux` commands from a script fail with "no server running"
  **Solution:** Start the server first with `tmux start-server`, or create a detached session before running other commands.

- **Problem:** Pane size is 0x0 when creating a detached session
  **Solution:** Pass explicit dimensions: `tmux new-session -d -s name -x 200 -y 50`.

- **Problem:** `send-keys` types the text but doesn't run the command
  **Solution:** Ensure you pass `Enter` (capital E) as a second argument: `tmux send-keys -t target "cmd" Enter`.

- **Problem:** Script creates a duplicate session each run
  **Solution:** Guard with `tmux has-session -t name 2>/dev/null || tmux new-session -d -s name`.

- **Problem:** Copy-mode selection doesn't work as expected
  **Solution:** Confirm `mode-keys vi` or `mode-keys emacs` is set to match your preference in `~/.tmux.conf`.

## Related Skills

- `@bash-pro` — Writing the shell scripts that orchestrate tmux sessions
- `@bash-linux` — General Linux terminal patterns used inside tmux panes
- `@ssh` — Combining tmux with SSH for persistent remote workflows

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
