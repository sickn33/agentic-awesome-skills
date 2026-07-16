---
name: anti-sleep
description: "Keep a Mac awake with caffeinate during long builds, downloads, or supervised automation runs."
category: operations
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [macos, caffeinate, operations]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Anti-Sleep (macOS caffeinate)

## When to Use

- Use when the user wants the Mac to stay awake during a long supervised task.
- Use when a build, download, or automation run should not be interrupted by sleep.

Keep the Mac awake using the built-in `caffeinate` command. No install needed.

## Quick start — the standard command

```bash
caffeinate -d -i -t 7200    # full power: screen stays on + no idle sleep, for 2 hours
```

Duration is `-t <seconds>`: 2h = 7200, 7h = 25200, overnight (9h) = 32400.

## Aggressiveness levels

| Flags | Effect |
|---|---|
| `-i` | prevents idle **system** sleep only (screen may still dim/lock) |
| `-d` | prevents **display** sleep (screen stays on) |
| `-d -i` | **default choice** — screen on + system awake |
| `-d -i -s` | adds `-s`: prevents sleep even on AC power semantics; `-s` only works when plugged in |
| `-u -t 1` | simulates user activity — wakes the display right now |

Default to `-d -i -t <seconds>` unless the user says otherwise.

## Tie to a process instead of a timer

```bash
caffeinate -d -i -w <PID>          # stays awake until that process exits (great for builds)
caffeinate -i npm run build       # wraps a command; exits when the command finishes
```

## Run it in a visible terminal (cmux pane)

Prefer running it in the user's own terminal pane so it's visible and easy to Ctrl+C. In cmux (read the `cmux` skill first if interacting with panes):

```bash
cmux send --surface surface:<N> "caffeinate -d -i -t 25200\n"
```

Otherwise run it as a background Bash task. Never block your own foreground shell with it.

## Verify and monitor

```bash
pgrep -fl caffeinate                       # is it running? shows exact flags
ps -o etime= -p <PID>                      # how long it's been running
pmset -g assertions | grep -i deny        # confirm sleep assertions are active
```

**Gotcha:** `caffeinate` prints nothing and holds the prompt — it looks "stuck" or like Enter wasn't pressed. It isn't stuck. Verify with `pgrep`, not by looking at the terminal.

**Expiry:** with `-t` it exits silently when time runs out — no notification. If the user asks "is it still on?" after hours, check `pgrep` first; it may simply have expired.

## Keyboard backlight

`caffeinate` cannot keep the keyboard backlight on — it has its own inactivity timer with no CLI/API on Apple Silicon (researched 2026-07). Fix is manual, one-time: System Settings > Keyboard > "Turn keyboard backlight off after inactivity" > Never.

## Stop early

```bash
pkill -f "caffeinate -d -i"    # or Ctrl+C in the pane running it
```

After starting: confirm to the user the PID, the flags, and the wall-clock time it will expire.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
