---
name: browser-install
description: Install browser-harness into the current agent and connect it to a browser with minimal prompting.
---

# `browser-harness` installation

Use this file only for browser-harness install, browser connection setup, and connection troubleshooting. For day-to-day browser work, read `SKILL.md`. After installation, task-specific edits belong in the upstream runtime's configured `agent-workspace/agent_helpers.py` and `agent-workspace/domain-skills/`; those paths are not bundled with this AAS skill.

## Recommended `browser-harness` setup

Clone a verified upstream revision into a durable location, then install it as an editable tool so `browser-harness` works from any directory. The revision below is the signed GitHub release `v0.1.6` (`6d0ac1634325b8b042a1431ba0bf3b75b4fbb460`); review and deliberately update the pin when adopting a newer release.

```bash
git clone --branch v0.1.6 --single-branch https://github.com/browser-use/browser-harness
cd browser-harness
git checkout --detach 6d0ac1634325b8b042a1431ba0bf3b75b4fbb460
test "$(git rev-parse HEAD)" = "6d0ac1634325b8b042a1431ba0bf3b75b4fbb460"
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
- When you see that banner, report the available version and ask the user whether to update.
  Do not run `browser-harness --update -y`, `git pull`, or `uv tool upgrade` automatically:
  each changes locally installed code and may stop the running daemon.
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

**Cloud browsers** are managed by the Browser Use cloud API and may incur charges. Before calling `start_remote_daemon("work", ...)`, state the provider, timeout, profile, and expected billing boundary and obtain explicit cost approval. Authentication is via the `BROWSER_USE_API_KEY` environment variable; the harness handles the WebSocket URL itself.

Cookie sync is a separate, sensitive transfer and is never the default. Before installing or using the upstream `profile-use` helper, obtain informed explicit consent that names the local profile/account, exact allowed domains, destination cloud profile, and the fact that cookies will leave the device. Explain the provider's current retention controls and the concrete revocation/deletion procedure, verify them against current provider documentation, and give the user a chance to decline. Sync only the minimum approved scope; if domain-scoped export cannot be enforced, do not sync unless the user knowingly approves the broader exposure. Cookies are the only documented data synced—not localStorage, extensions, or history—but cookies can grant account access.

**Local browsers** require remote debugging to be enabled. There are two ways, and they suit different use cases.

*Way 1: chrome://inspect/#remote-debugging checkbox — uses your real profile and is opt-in.* Use this only after informed explicit consent naming the browser profile/account and allowed domains. Explain that CDP can expose open tabs, screenshots, DOM content, cookies, history, and authenticated sessions beyond the immediate page. In the approved Chrome profile, navigate to `chrome://inspect/#remote-debugging` and tick the "Allow remote debugging for this browser instance" checkbox. This setting is per-profile and sticky: tick it once and it persists across future Chrome launches of that profile. Then run a scoped `browser-harness` command. On Chrome 144 and later, the first attach triggers an in-browser "Allow remote debugging?" popup that the user must approve. The popup may reappear later.[^1]

*Way 2: command-line flag — uses an isolated profile, no popups ever.* Launch Chrome with `--remote-debugging-port=9222 --user-data-dir=<path>`. Two precisions:

- The path must be a directory that is **not** Chrome's platform default (`%LOCALAPPDATA%\Google\Chrome\User Data` on Windows, `~/Library/Application Support/Google/Chrome` on macOS, `~/.config/google-chrome` on Linux). On Chrome 136 and later, the port flag is silently no-opped when the user-data-dir is the platform default, even if you pass it explicitly. An empty or new path gives a fresh clean profile that Chrome will persist there across future runs.
- This path does **not** let you reuse your everyday Chrome profile. Copying the default profile's files into a custom directory makes Chrome accept the flag, but cookies are encrypted under a key bound to the original directory and will not survive the copy — so you carry over bookmarks and extensions but lose every logged-in session. If you want your real logins, use Way 1.

Tell the harness which port you launched on by setting `BU_CDP_URL=http://127.0.0.1:9222` before running `browser-harness`.

Default to Way 2 with a dedicated profile. Use Way 1 only when the task genuinely requires an existing authenticated session and the user has given the profile/account/domain consent above. Use cloud only after the separate cost and data-transfer approvals.

[^1]: The conditions that cause Chrome to re-show the "Allow remote debugging?" popup on a subsequent attach (time elapsed since previous Allow, daemon restart, browser restart, new CDP session, version-dependent options like "Allow for N hours") are not fully characterized. Way 2 sidesteps this entirely.

## First time setup

Retry non-destructive diagnostics briefly. Ask the user whenever a step requires consent or can affect their browser state, including enabling real-profile debugging, clicking Allow, starting a billable cloud browser, syncing cookies, terminating processes, or deleting IPC files.

If the user has not selected a connection method, default to Way 2 with a dedicated isolated profile. Do not infer consent to attach to an already-running everyday profile. Cloud is only used after explicit approval.

Before the first probe below, establish the approved connection method. For the default Way 2, obtain approval to launch a local browser and start the dedicated non-default profile described above. Do not run the probe against an unspecified already-running browser.

1. Try the harness:

   ```bash
   browser-harness -c 'print(page_info())'
   ```

   If it prints page info, you're done.

2. Otherwise run `browser-harness --doctor`. The two lines that matter for connection are `chrome running` and `daemon alive`.

3. Match the output to a case:

   - **chrome FAIL** → no Chrome process detected.
     - **Way 1**: after the required real-profile consent, ask the user to open the approved profile themselves.
     - **Way 2**: with approval to launch a local browser, use `--remote-debugging-port=9222 --user-data-dir=<dedicated non-default path>`, then set `BU_CDP_URL=http://127.0.0.1:9222` for the harness (see the Browser connection reference).

   - **chrome ok, daemon FAIL** → if Way 1 was explicitly approved, its setup may be incomplete. Tell the user to:
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

     If that hangs, stop and show the exact processes and IPC paths implicated. Obtain explicit approval before terminating any Chrome or daemon process or removing `/tmp/bu-default.sock` or `/tmp/bu-default.pid`; never kill all Chrome processes by default because that can destroy unrelated user work. After approval, affect only the identified harness-owned processes and stale files, then reopen the approved browser profile and retry.

4. After any fix, retry step 1.

If Way 1 fails repeatedly or the user's task is unattended, move to Way 2 or a cloud browser per the Browser connection reference (these have no popups).

If you are testing browser connection for the first time, run this demo: open `https://github.com/browser-use/browser-harness` in a new tab and activate it (`switch_tab`) so the user sees the harness has attached. Then ask what they want to do next.
