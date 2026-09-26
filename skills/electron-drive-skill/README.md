# electron-drive-skill

An agentic skill that lets an agent drive
your Electron app the way a person would: start and stop it, read the screen,
click, type, take screenshots, run code in the renderer or main process, and
read logs. The agent can then check a UI change or reproduce a bug in the
real app, not just in unit tests.

|Tested On|Status|
|--|--|
|Claude Code|y|
|Muse Code|y|

```text
$ drive start --build
Using the build from 0 minute(s) ago. Pass --build to rebuild.
{ "mode": "built", "profile": "default", "running": true, "window": { "title": "My App", ... } }
$ drive snapshot
- button "Get started"
$ drive click 'role=button[name="Get started"]'
clicked role=button[name="Get started"]
$ drive stop
quit via app.quit()
```

The app runs under Playwright in a background daemon, so each command is a
separate, fast shell call. Every launch uses a scratch profile
(`--user-data-dir` under your temp directory), so the agent never touches your
real app data.

## Requirements

- Node.js 18 or later
- `electron` and `playwright-core` 1.49 or later, installed in your project:
  ```bash
  npm i -D playwright-core
  ```
  No browsers need to be downloaded; the driver uses your project's Electron.
- macOS or Linux. On Windows, run it as `node scripts/drive.mjs`. The
  process-tree kill that `stop` falls back to is not implemented there.

## Install

Clone it into your project's skills directory:

```bash
git clone https://github.com/Search-3D/electron-drive-skill .claude/skills/electron-drive-skill
```

Or clone it into `~/.claude/skills/electron-drive-skill` to use it in every
project. The driver always uses the Electron and Playwright of the project you
run it in. Keep the folder name: it must match the `name` in `SKILL.md`.

The examples here call it `drive`. Nothing installs that command; to run it by
hand, add an alias:

```bash
alias drive="node .claude/skills/electron-drive-skill/scripts/drive.mjs"
```

> [!IMPORTANT]
> Make sure you have installed playwright in your project's developer dependencies, as outlined in the steps above.

## Configure

With no configuration, `start` runs `electron .` on whatever is already built.
For anything else, add `drive.config.json` at your project root (copy
[`drive.config.json.example`](drive.config.json.example) as a starting point).
Every field is optional:

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

| Field | Meaning |
|---|---|
| `build` | Shell command that `start --build` runs first. |
| `args` | Arguments to Electron: the app directory (its `package.json` `main` must be the built entry point) or the entry file. For example, electron-react-boilerplate uses `["release/app"]`. |
| `env` | Added to the app's environment. `{profile}` becomes the scratch profile directory; it is replaced only in `env` values, not in `args`. Use it to redirect any data the app keeps outside `userData` (see below). |
| `logFile` | A log file, relative to the profile directory, that `logs` shows along with the console output. |
| `dev.args`, `dev.env` | Used by `start --dev` instead of `args` (plus `env`). |
| `dev.url` | The renderer dev server. `start --dev` refuses to launch if it is not up. |

### Redirecting app data with `env`

Every launch gets `--user-data-dir` pointed at a scratch profile, which moves
`app.getPath('userData')` and everything Electron stores there. Data your app
keeps somewhere else, such as a database, a library folder or a cache path, is
**not** moved, so the agent would work on your real files.

If your app keeps data elsewhere, give it an environment variable that
overrides the location, and set that variable in `env`:

```ts
// main process
const dataDir = process.env.APP_DATA_DIR ?? defaultDataDir()
```

```json
{ "env": { "APP_DATA_DIR": "{profile}/data" } }
```

`APP_DATA_DIR` is only an example name. The driver just sets the variable, so
it has an effect only if your app reads it. Use whatever name your app
already checks.

For `--dev`, start your renderer dev server yourself, and make sure it does not
also launch Electron.

## Commands

```text
start [--dev] [--build] [--profile <name>] [--fresh]
status                           whether the app is up, its profile and window
snapshot                         accessibility tree of the window
screenshot [--out <png>] [--selector <css>]
click <target>                   Playwright selector: 'text=Settings', 'role=button[name="Save"]', css
fill <target> <text>
select <target> <value|label>
press <key>                      e.g. Enter, Escape, Control+K
wait <target> [--timeout <ms>]
eval <js | ->                    in the renderer; '-' reads stdin
main <js | ->                    in the main process; 'electron' and 'process' are in scope
logs [--lines <n>]
stop
```

Put `--` before text that starts with dashes, so it is not read as a flag:
`drive fill 'role=textbox[name="Args"]' -- --verbose`.

`eval` and `main` return their result as JSON. A DOM node, a function or
anything else that does not serialize comes back as `undefined` or `{}`;
return plain data instead (`el.textContent`, not `el`).

Run the script directly instead of through a `yarn`/`npm` script alias. yarn 1
re-splits arguments and drops inner quotes, which silently breaks most
JavaScript passed to `eval` and `main`.

## Limitations

- **One window.** Commands act on the first window that is not DevTools.
  There is no way to pick another one, so a settings window or a second
  document window cannot be driven. An app with a splash screen is driven
  once the splash closes and the main window is the only one left; check
  `status` to see which window is current.
- **One app at a time** per project: `start` refuses while one is running.
- **Windows:** run it as `node scripts/drive.mjs`; the process-tree kill that
  `stop` falls back to is POSIX only.

## How it works

- `scripts/drive.mjs`: the CLI. `start` spawns the daemon and waits for it.
  Every other command is one HTTP request to it.
- `scripts/daemon.mjs`: launches Electron through Playwright's `_electron`
  API and serves commands on `127.0.0.1` with a random token. Its state file
  and log are in `$TMPDIR/electron-drive/<project>-<hash>/`.
- `scripts/lib.mjs`: config, argument parsing and paths, with no side
  effects. Tests: `node --test scripts/`.

## License

[MIT](LICENSE)
