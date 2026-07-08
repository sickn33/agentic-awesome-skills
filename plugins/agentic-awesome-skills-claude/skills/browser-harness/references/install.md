---
name: browser-install
description: Install browser-harness into the current agent and connect it to a browser with minimal prompting.
---

# `browser-harness` installation

Use this file only for browser-harness install, browser connection setup, and connection troubleshooting. For day-to-day browser work, read `SKILL.md`. Task-specific edits belong in `agent-workspace/agent_helpers.py` and `agent-workspace/domain-skills/`.

## Recommended `browser-harness` setup

Clone the repo once into a durable location, then install it as an editable tool so `browser-harness` works from any directory:

```bash
git clone https://github.com/browser-use/browser-harness
cd browser-harness
uv tool install -e .
command -v browser-harness
```

That keeps the command global while still pointing at the real repo checkout, so when the agent edits `agent-workspace/agent_helpers.py` the next `browser-harness` uses the new code immediately. Prefer a stable path like `~/Developer/browser-harness`, not `/tmp`.

## Make browser-harness global for the current agent

After the repo is installed, register this repo's `SKILL.md` with the agent you are using:

- **Codex**: add this file as a global skill at `$CODEX_HOME/skills/browser-harness/SKILL.md` (often `~/.codex/skills/browser-harness/SKILL.md`). A symlink to this repo's `SKILL.md` is fine.

  ```bash
  mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills/browser-harness" && ln -sf "$PWD/SKILL.md" "${CODEX_HOME:-$HOME/.codex}/skills/browser-harness/SKILL.md"
  ```

- **Claude Code**: add an import to `~/.claude/CLAUDE.md` that points at this repo's `SKILL.md`, for example `@~/Developer/browser-harness/SKILL.md`.

This makes new Codex or Claude Code sessions in other folders load the runtime browser harness instructions automatically.

## Keeping the harness current

- On each run, `browser-harness` prints `[browser-harness] update available: X -> Y` (once per day) when a newer GitHub release exists.
- When you see that banner, run `browser-harness --update -y` yourself — don't ask the user. It pulls the new code (`git pull --ff-only` for editable clones, `uv tool upgrade browser-harness` for PyPI installs) and stops the running daemon so the next call picks up the new code. With `-y` it won't prompt.
- `--update` refuses to run on an editable clone with uncommitted changes. If that happens, tell the user and let them resolve the dirty worktree.

## Maintenance commands

- browser-harness --doctor — show version, install mode, daemon and Chrome state, and whether an update is pending.

## Architecture

```text
Chrome / Browser Use cloud -> CDP WS -> browser_harness.daemon -> IPC -> browser_harness.run
```

- Protocol is one JSON line each way.
- Requests are {method, params, session_id} for CDP or {meta: ...} for daemon control.
- Responses are {result} / {error} / {events} / {session_id}.
- IPC: Unix socket at `/tmp/bu-<NAME>.sock` on POSIX, TCP loopback + port file on Windows.
- BU_NAME namespaces the daemon's IPC, pid, and log files.
- BU_CDP_WS overrides local Chrome discovery for remote browsers.
- BU_CDP_URL overrides local Chrome discovery with a specific DevTools HTTP endpoint (used for Way 2).
- BU_BROWSER_ID + BROWSER_USE_API_KEY lets the daemon stop a Browser Use cloud browser on shutdown.

# Browser connection setup and troubleshooting

## Browser connection reference

This section is the source of truth for how browser-harness connects to a browser. It is the canonical reference for every agent and user of this repo. Every statement here is intended to be verifiable against either an official Chrome source or this repo's own code, and is held to that standard deliberately. If anything below is incorrect, incomplete, or misleading, open an issue on the browser-harness repository immediately with clear evidence and explanation so it can be corrected. Do not silently work around an error in this document; the cost of one user being misled is much higher than the cost of one issue.

Browser-harness can connect to any Chrome or Chromium-based browser on your computer, or to a Browser Use cloud browser.

**Cloud browsers** are managed by the Browser Use cloud API. Start one in Python with `start_remote_daemon("work", ...)`. Authentication is via the `BROWSER_USE_API_KEY` environment variable; the harness handles the WebSocket URL itself. To carry your local Chrome cookies into a cloud browser, install the Browser Use `profile-use` helper only after reviewing the upstream installer instructions, then call `uuid = sync_local_profile("MyChromeProfile")` followed by `start_remote_daemon("work", profileId=uuid)`. Cookies are the only thing synced — not localStorage, not extensions, not history.

**Local browsers** require remote debugging to be enabled. There are two ways, and they suit different use cases.

*Way 1: chrome://inspect/#remote-debugging checkbox — uses your real profile.* In your running Chrome, navigate to `chrome://inspect/#remote-debugging` and tick the "Allow remote debugging for this browser instance" checkbox. This setting is per-profile and sticky: tick it once and it persists across every future Chrome launch of that profile. Then run any `browser-harness` command. On Chrome 144 and later, the first attach by the harness triggers an in-browser "Allow remote debugging?" popup that you must click Allow on. The popup may reappear on later attaches under conditions that are not fully characterized.[^1] This path inherits your everyday Chrome's logins, extensions, history, and bookmarks, which makes it the right choice for an agent helping you with tasks in your real browser.

*Way 2: command-line flag — uses an isolated profile, no popups ever.* Launch Chrome with `--remote-debugging-port=9222 --user-data-dir=<path>`. Two precisions:

- The path must be a directory that is **not** Chrome's platform default (`%LOCALAPPDATA%\Google\Chrome\User Data` on Windows, `~/Library/Application Support/Google/Chrome` on macOS, `~/.config/google-chrome` on Linux). On Chrome 136 and later, the port flag is silently no-opped when the user-data-dir is the platform default, even if you pass it explicitly. An empty or new path gives a fresh clean profile that Chrome will persist there across future runs.
- This path does **not** let you reuse your everyday Chrome profile. Copying the default profile's files into a custom directory makes Chrome accept the flag, but cookies are encrypted under a key bound to the original directory and will not survive the copy — so you carry over bookmarks and extensions but lose every logged-in session. If you want your real logins, use Way 1.

Tell the harness which port you launched on by setting `BU_CDP_URL=http://127.0.0.1:9222` before running `browser-harness`.

For most tasks where the agent acts on your behalf in your normal browser, use Way 1. For automation that runs without you watching, or any case where popup interruptions are unacceptable, use Way 2 or a cloud browser.

[^1]: The conditions that cause Chrome to re-show the "Allow remote debugging?" popup on a subsequent attach (time elapsed since previous Allow, daemon restart, browser restart, new CDP session, version-dependent options like "Allow for N hours") are not fully characterized. Way 2 sidesteps this entirely.

## First time setup

Try yourself before asking the user to do anything. Retry transient errors briefly. Only ask the user when a step genuinely needs them — ticking a checkbox, clicking Allow.

If the user hasn't said which connection method to use, default to Way 1 if Chrome is already running, Way 2 if not. Cloud is only used when the user opts in.

1. Try the harness:

   ```bash
   browser-harness -c 'print(page_info())'
   ```

   If it prints page info, you're done.

2. Otherwise run `browser-harness --doctor`. The two lines that matter for connection are `chrome running` and `daemon alive`.

3. Match the output to a case:

   - **chrome FAIL** → no Chrome process detected.
     - **Way 1**: ask the user to open their target Chrome themselves.
     - **Way 2**: launch Chrome yourself with `--remote-debugging-port=9222 --user-data-dir=<non-default path>`, then set `BU_CDP_URL=http://127.0.0.1:9222` for the harness (see the Browser connection reference).

   - **chrome ok, daemon FAIL** → Way 1 setup is incomplete. Tell the user to:
     - navigate to `chrome://inspect/#remote-debugging` in their Chrome and tick "Allow remote debugging for this browser instance" if not yet ticked (one-time per profile)
     - click Allow on the in-browser popup if it appears (every attach on Chrome 144+)

     On macOS, you can open the inspect page in their running Chrome yourself instead of asking them to navigate:

     ```bash
     osascript -e 'tell application "Google Chrome" to activate' \
               -e 'tell application "Google Chrome" to open location "chrome://inspect/#remote-debugging"'
     ```

   - **chrome ok, daemon ok, but step 1 still failed** → stale daemon. Restart it:

     ```bash
     browser-harness -c 'restart_daemon()'
     ```

     If that hangs, escalate: kill all Chrome and daemon processes, then reopen Chrome and retry. On macOS/Linux, also remove `/tmp/bu-default.sock` and `/tmp/bu-default.pid` if they linger.

4. After any fix, retry step 1.

If Way 1 fails repeatedly or the user's task is unattended, move to Way 2 or a cloud browser per the Browser connection reference (these have no popups).

If you are testing browser connection for the first time, run this demo: open `https://github.com/browser-use/browser-harness` in a new tab and activate it (`switch_tab`) so the user sees the harness has attached. Then ask what they want to do next.
