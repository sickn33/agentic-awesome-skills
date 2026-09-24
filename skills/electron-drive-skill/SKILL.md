---
name: electron-drive-skill
description: "Launch the project's Electron app on a scratch profile and drive it: click, type, screenshot, run renderer or main-process code, read logs. Use to verify UI changes end to end."
category: testing
risk: critical
source: community
source_repo: Search-3D/electron-drive-skill
source_type: community
date_added: "2026-09-23"
author: Search-3D
tags: [electron, playwright, desktop, e2e, testing, automation]
tools: [claude]
license: "MIT"
license_source: "https://github.com/Search-3D/electron-drive-skill/blob/main/LICENSE"
---

# Driving the Electron app

## Overview

`scripts/drive.mjs` launches the project's Electron app under Playwright in a
background daemon and keeps it running between commands, so each action
(click, type, snapshot, screenshot, eval) is one fast shell call. Every launch
uses a scratch profile, so the agent can check a UI change or reproduce a bug
in the real app, not only in unit tests, without touching the user's data.

## When to Use This Skill

- Use when you need to verify a UI change in the running Electron app.
- Use when reproducing a renderer or startup bug, or a failure that only
  shows up in the production build (for example a stricter CSP).
- Use when checking first-run, onboarding or settings screens.
- Use when exercising a feature end to end, including IPC through the preload
  bridge or code in the main process.
- Do not use it for web apps without Electron, or for multi-window flows (see
  Limitations).

## How It Works

### Step 1: Check prerequisites

`scripts/drive.mjs`, in this skill's directory, finds the project by the
nearest `package.json`, so run it from anywhere inside the project. Set `DR`
to its absolute path.

It needs `electron` and `playwright-core` (1.49 or later) installed in the
project. If `start` says either is missing, tell the user rather than
installing it yourself. Launch settings come from `drive.config.json` at the
project root (see Step 4); with no file, it runs `electron .`.

### Step 2: Start, look, act, stop

```bash
DR=<this skill's directory>/scripts/drive.mjs

$DR start                  # last build, profile 'default'; prints status
$DR snapshot               # accessibility tree: find what to click, by role and name
$DR click 'role=button[name="Get started"]'
$DR fill 'role=textbox[name="Email"]' 'test@example.com'
$DR wait 'text=Welcome'
$DR screenshot             # prints a PNG path; Read it to see the window
$DR logs --lines 80        # main and renderer console, plus the config's logFile
$DR stop                   # ALWAYS, before finishing
```

- **Start options:**
  - `--build`: run the config's `build` command first. **Needed after any
    source change** if the app runs from a build, because the build is
    otherwise stale; `start` prints its age.
  - `--fresh`: wipe the scratch profile, which gives you the app's first-run
    state.
  - `--profile <name>`: a separate scratch profile.
  - `--dev`: see Step 5.
- **Targets** are Playwright selectors. Prefer `role=button[name="…"]` from
  `snapshot` output, then `text=…`, then CSS.
- **`--`** ends the flags. Put it before text that starts with dashes:
  `$DR fill 'role=textbox[name="Args"]' -- --verbose`.
- Other commands: `select <target> <value|label>`, `press <key>`,
  `status`, `screenshot --selector <css>`. `$DR help` lists everything.

### Step 3: Run code in the app

**`eval <js>`** runs in the renderer, **`main <js>`** in the main process
(`electron` and `process` are in scope, `require` is not). Use a bare
expression, or a body with `return`. `-` reads the code from stdin, which
avoids quoting entirely. The result comes back as JSON, so return plain data:
a DOM node or a function comes back as `undefined` or `{}`.

To exercise IPC, call whatever the app's preload exposes through `eval`. That
goes through the real preload bridge, as the app's own renderer code does.

### Step 4: Configure the launch (optional)

`drive.config.json` at the project root; every field is optional:

```json
{
  "build": "npm run build",
  "args": ["."],
  "env": { "APP_DATA_DIR": "{profile}/data" },
  "logFile": "logs/main.log",
  "dev": {
    "args": ["."],
    "env": { "ELECTRON_RENDERER_URL": "http://localhost:5173" },
    "url": "http://localhost:5173"
  }
}
```

- `args`: what Electron is launched with: an app directory whose
  `package.json` `main` is the built entry point, or the entry file itself.
- `env`: added to the app's environment. `{profile}` becomes the scratch
  profile directory (in `env` values only, not in `args`). This is how data
  kept outside `userData` is redirected: `APP_DATA_DIR` is only an example
  name, and it has an effect only if the app reads it. Check the app's source
  for the variable it actually uses.
- `logFile`: a log file relative to the profile directory, shown by `logs`.

If a project has no config and `start` fails or launches the wrong thing,
work out these values from the project's `package.json` and build setup,
then suggest a `drive.config.json` to the user.

### Step 5: Dev mode (optional)

For a fast loop on renderer code, with hot reload and source maps:

1. The user (or a background Bash call) starts the renderer dev server
   **without** its own Electron. Many templates' `start`/`dev` scripts launch
   Electron too, and two instances would share state. The config's
   `dev.url` is checked before launch.
2. `$DR start --dev` launches Electron with `dev.args` and `dev.env`, and
   `NODE_ENV=development`.

## Examples

### Example 1: Verify a change to the first-run screen

```bash
$DR start --build --fresh
$DR snapshot
$DR click 'role=button[name=/Next/]'
$DR screenshot
$DR logs --lines 40
$DR stop
```

### Example 2: Inspect renderer state and call IPC

```bash
echo "return document.querySelectorAll('button').length" | $DR eval -
$DR eval "window.api.getSettings()"
```

### Example 3: Query the main process

```bash
$DR main "electron.app.getVersion()"
$DR main "electron.BrowserWindow.getAllWindows().length"
```

## Best Practices

- ✅ **Look before acting.** Take a `snapshot` or `screenshot` first. The same
  profile can open differently on a second launch (past the first-run
  screens), and a click that times out usually means the screen is not what
  you assumed.
- ✅ **Check `logs`** for `[renderer:error]` and `[renderer:pageerror]` after
  each step.
- ✅ **Prefer the production build.** It catches failures that only show up
  there, such as a stricter Content-Security-Policy, which the dev server
  would miss.
- ✅ **Always `stop`**, including after a failure. `stop` reports how the app
  went down; anything but "quit via app.quit()" (a hung quit, a SIGKILL) is
  worth a line in your report.
- ❌ **Don't use the npm/yarn script wrappers** (e.g. `yarn drive`). Run the
  script directly. yarn 1 re-splits arguments and drops inner quotes, which
  silently breaks most JavaScript passed to `eval` and `main`.
- ❌ **Don't install `electron` or `playwright-core`** yourself; ask the user.

## Limitations

- **One window.** Commands act on the first window that is not DevTools, and
  there is no way to pick another. `status` shows which window that is; a
  splash screen is current until it closes.
- **One app at a time** per project. `start` refuses while one is running.
- **Windows:** run it as `node scripts/drive.mjs`. The process-tree kill that
  `stop` falls back to is POSIX only.
- Requires `electron` and `playwright-core` 1.49+ in the project, and Node.js
  18+.
- It does not replace the project's own test suite or a human check of
  visual design. Stop and ask if the launch settings or data locations are
  unclear.

## Security & Safety Notes

- **Local-only.** The daemon listens on `127.0.0.1` with a random per-session
  token. Nothing is sent to third-party services.
- **Never point it at the user's real data.** Every launch gets
  `--user-data-dir` set to a scratch profile under
  `$TMPDIR/electron-drive/<project>/profiles/<name>`, which moves
  `app.getPath('userData')`. Data the app keeps elsewhere (a documents
  folder, a path from an env var) is only redirected if `drive.config.json`
  sets it through `env`. Check that before doing anything that writes data.
  If the app would touch real user files, stop and tell the user.
- **`eval` and `main` run arbitrary code** with the app's privileges; the
  main process has full Node.js access. Only run code needed for the task,
  and never code that deletes files or makes network calls outside the app's
  normal behavior without the user's confirmation.
- **`start --build` runs the `build` command from `drive.config.json` in a
  shell.** Read the config before the first `--build` in a project you did
  not set up.
- **`--fresh` deletes the scratch profile directory** only, never the app's
  real `userData`.

## Common Pitfalls

- **Problem:** `start` fails.
  **Solution:** Read the daemon log it prints. Common causes are a missing
  build (`--build`), `electron` or `playwright-core` not installed, or wrong
  `args`.
- **Problem:** "The app is not running".
  **Solution:** It crashed or quit. Run `logs`, then `stop`, then `start`.
- **Problem:** The app shows old behavior after a source change.
  **Solution:** The build is stale. Restart with `start --build`.
- **Problem:** A click can't find a button whose name includes icon-font text
  (such as `arrow_forward`).
  **Solution:** Use a regex name: `role=button[name=/Next/]`.
- **Problem:** A stuck state after an interrupted session.
  **Solution:** `$DR stop` cleans up the daemon, the app and the state file,
  even when the daemon is already gone.

## Related Skills

- `@electron-development` - For building and packaging the Electron app
  itself; use this skill to verify the result in the running app.
- `@systematic-debugging` - Pair with this skill to reproduce and narrow down
  a bug in the real app.
