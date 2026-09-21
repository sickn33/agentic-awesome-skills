# Controllers: agent-device, Appium, and argent

`eas-cli` has no device verbs — it manages the *session*. Automation commands come from the interface selected by `simulator:start --type`:

- `agent-device` (Callstack, MIT) — used throughout this skill; runs on demand via `npx agent-device@latest`, nothing installed globally.
- `appium` — exposes `APPIUM_URL` and `APPIUM_CAPS` for an Appium client.
- `argent` (Software Mansion) — a capable alternative controller; check its license for your use.
- `web-preview-only` — browser preview with no programmatic control.

All four types include a web preview. Before setting `--max-idle-time-minutes`, follow [Session lifetime](../SKILL.md#session-lifetime); activity does not reset the timer for every interface.

## Appium

Start with `--type appium`, then run the user's Appium client through `simulator:exec`; the wrapper loads `APPIUM_URL` and JSON-encoded `APPIUM_CAPS` from `.env.eas-simulator`:

```bash
npx --yes eas-cli@latest simulator:start --platform ios --type appium --non-interactive \
  --name "Appium checkout run"
npx --yes eas-cli@latest simulator:exec <appium-client> [args...]
```

Use the maximum duration as the lifetime bound; Appium commands do not reset the idle timer.

## agent-device verbs (run via `npx --yes eas-cli@latest simulator:exec npx agent-device@latest <verb>`)

agent-device is a thin **client** talking to a **daemon** (the daemon runs on the VM in a session). `npx --yes eas-cli@latest simulator:exec` sets `AGENT_DEVICE_DAEMON_BASE_URL` + `AGENT_DEVICE_DAEMON_AUTH_TOKEN` from `.env.eas-simulator`, which switches the client into remote mode. Selectors and `@e`-refs come from the latest `snapshot`.

The CLI help is written for agents and is the source of truth — run these for the full verb set and agentic loop guidance:

```bash
npx --yes eas-cli@latest simulator:exec npx agent-device@latest --help
npx --yes eas-cli@latest simulator:exec npx agent-device@latest help workflow
```

EAS-specific notes:

- **`press`, not `tap`.** The tap verb is `press` — `tap` is not a verb.
- **`snapshot -i` is slow on iOS** — tens of seconds is normal; wait for it.
- **`install` uploads** a local binary to the daemon; **`install-from-source`** has the VM download from a URL (use for EAS artifacts — avoids a large upload).
- **Exercised against a live session:** `apps`, `install`, `install-from-source`, `open`, `snapshot -i`, `press`, `fill`, `screenshot`, `scroll`, `gesture` (needs a preset, e.g. `gesture swipe left`), `logs`, `record` (`start`/`stop <path>`), `network`, `perf`. `metro` (`prepare`/`reload`) is the Mode C dev-client bridge. Pass `--platform ios`; run `<verb>` with no args to see its required subcommand/args.

## Recording download recovery

If downloading a recording through agent-device or argent fails, fetch the recording from **EAS session artifacts**. A controller download failure does not mean the recording was lost. Keep the original EAS session id and query its artifacts:

```bash
npx --yes eas-cli@latest simulator:get --id <session-id> --json
# Select the recording in artifacts[] by filename/name and metadata; use its downloadUrl:
curl --fail --location --max-time 600 --output ./capture.mp4 '<downloadUrl>'
```

Use the URL returned by EAS, not a path on the simulator or a controller artifact id. If the recording has not appeared yet, poll the same session with a bounded wait for upload completion. Already-uploaded artifacts can be retrieved after the session stops using its explicit id. If a download URL expires, query the session again for a fresh one. Give the download command more than 10 minutes in the outer runner, increase `--max-time` for larger files, and verify the downloaded video before reporting success.

Source: EAS CLI [simulator:get](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/commands/simulator/get.ts) exposes `artifacts[].{id,name,filename,metadata,downloadUrl}`.

## argent (alternative)

`npx --yes eas-cli@latest simulator:start --type argent` provisions an argent remote session. The connection config it returns is different (`ARGENT_TOOLS_URL` / `ARGENT_AUTH_TOKEN`).

**Invoking argent — run its tools directly.** Drive argent with `npx --yes eas-cli@latest simulator:exec argent run <tool> --udid <udid> …`. `simulator:exec` is `strict = false` and hands the command its args verbatim (it `spawnAsync(command, args)` with the session env loaded), so argent's `--flags` pass straight through — no `sh -c` wrapper and no `--args` JSON blob needed. (You can also drive argent via its MCP server, which passes structured params.) argent's gesture tools take **normalized 0.0–1.0** coordinates, not pixels — check its help for the exact input shape.

**Installing apps in an argent session.** `--type argent` provisions only an argent daemon on the VM — there is no agent-device daemon, so agent-device install verbs don't apply. Install a local build with argent's own `reinstall-app` (tar-upload):

```bash
argent run reinstall-app --udid <udid> --bundleId <bundle-id> --appPath ./MyApp.app
```

Whenever the tools client is routed to a remote tool-server, it tars the local bundle and streams it up automatically — no extra flag. "Remote" covers both `argent link` and the env-var MCP config (`ARGENT_TOOLS_URL`), so this works in sandboxed shells too. It's a registry tool, so the MCP server exposes it identically — same call by CLI or MCP. Works for iOS `.app` (a directory), Android `.apk`, and Vega `.vpkg`; the client prints an upload line on stderr.

Needs argent ≥ 0.16.0 (the release that adds tar-upload) — verify with `argent --version`. On older versions `reinstall-app` resolves `--appPath` on the VM only, so a local path fails; drive an app already on the sim instead.

**Mode C (dev client) on argent.** Easiest is the native launch (eas-cli ≥ 22.4.0): `simulator:start --type argent --build-id <id> --launch-arg … --open-url "<scheme>://expo-development-client/?url=<metro-url>"` installs, launches, and connects the dev client with the launch-args applied and the "Open in?" dialog auto-handled — same as agent-device Method 1 (see run-your-app.md). No manual `open-url` or coordinate tap. argent needs no `open --foreground` attach either; `argent run screenshot` works against the running app, but pass an explicit `--udid` from `list-devices` (the `Booted` one — there's no default), and it saves to a LOCAL temp path.

To drive the connect yourself on a bare argent session (no launch flags), argent has `open-url`, which opens a scheme / deep link directly, so you can point a dev client at Metro without tapping through the launcher. Use the dev-client **custom scheme** (not `https://`, which can fall through to Safari):

```bash
# load the dev client from Metro via its deep link
npx --yes eas-cli@latest simulator:exec argent run open-url --udid <udid> --url "<scheme>://expo-development-client/?url=<metro-url>"
# open-url raises the "Open in '<app>'?" system dialog — argent has NO alert-accept, so screenshot to
# locate "Open", then coordinate-tap it (its describe may not see the dialog — see "System dialogs" below)
npx --yes eas-cli@latest simulator:exec argent run screenshot --udid <udid>
npx --yes eas-cli@latest simulator:exec argent run gesture-tap --udid <udid> --x <0..1> --y <0..1>
# then attach to Metro's debugger / reload the bundle
npx --yes eas-cli@latest simulator:exec argent run debugger-connect --udid <udid>
```

Where argent is weaker than agent-device Mode C — so it's **capable, not as fast**:
- **No launch-args.** `launch-app` takes only `--bundleId`; argent can't pre-seed `-EXDevMenuIsOnboardingFinished` / `-EXDevMenuShowsAtLaunch` the way agent-device's `open --launch-args` does. If the onboarding popup or dev menu blocks the screen, tap through it by **normalized 0.0–1.0 coordinates** (`gesture-tap`, positions from `describe` / `native-describe-screen`) — there's no element/ref tap.
- **No Metro bind on launch.** No `--metro-host` / `--bundle-url` seed; point the client at Metro with the `open-url` deep link above, then `debugger-connect` / `debugger-reload-metro`.
- **Whole-string text entry:** use `keyboard --text "<string>"` — it types the entire string in one call. Never type character by character.

**System dialogs on argent (e.g. the first-time deep-link "Open in '<app>'?").** argent's UI queries (`describe` / `await-ui-element`) may not see system dialogs / native modals — a screenshot shows the dialog, but element lookups time out. When that happens, argent surfaces a hint with the fix (today that's a `boot-device --force` to switch its AX backend); follow the hint, then locate and tap "Open". There's no single press-with-timeout — you wait for the element, then tap it. Use argent's own command help for the exact tools and flags.

**Recording video on argent (`screen-recording-start`/`stop`).** The gotcha to know: argent **trims static stretches by default**, which drops the very frames you're measuring — turn that off when you care about cadence or timing (see argent's help for the flag). Recordings also carry a burned-in "Argent" watermark that can't be disabled on a hosted session — fine for diagnosis, mind it before sharing publicly. The stop call returns a video already downloaded locally; extract frames with `ffmpeg` (may need installing) to inspect motion frame by frame. The capture samples at ~30fps, so it shows visible jank but can't prove or disprove sub-frame hitches on 60/120Hz content.

**Screenshot resolution and token cost.** Screenshots cost context tokens once the agent reads them, so resolution is a real tradeoff. **argent's `screenshot` has two independent levers.** `scale` sets the image resolution and defaults **low** (too coarse to judge layout), so pass a larger scale when you need to **read** the UI. `includeImageInContext:false` keeps an image **out of the agent's context entirely** (zero token cost) — use that for a baseline you'll only **diff** later, and keep *that* one at full resolution so the pixel diff stays accurate. So: scale down images you actually read; drop unread ones with `includeImageInContext`, don't just shrink them. Exact flags and the current default: argent's help.

**agent-device** screenshots default to full resolution — a crisp PNG you read from disk, token-heavier for its size, so match the capture to the question. From **v0.20.6** it gains the same lever argent has and drops the old one: `screenshot --scale <0.01–1>` proportionally resizes both dimensions (`1` = full resolution), with a token-conscious default via `AGENT_DEVICE_SCREENSHOT_SCALE` (or `screenshotScale` in config) that an explicit `--scale` overrides — keep it unset or `1` for pixel-diff baselines; the former `--max-size` is removed (older calls refused with migration guidance). Verify the version with `agent-device --version`. One caveat for remote sessions: the resize runs on the daemon, so a newer client against an older EAS session daemon can have `--scale` silently ignored and get full-res back.

**Connecting via MCP (Cursor, Claude Code, Codex, and others).** Install the CLI globally first — the package is `@swmansion/argent`, not `argent`:

```bash
npm install -g @swmansion/argent
```

Then run `argent init --yes` to register the Argent MCP server. Link the session credentials with `argent link` — the recommended path:

```bash
argent link '<ARGENT_TOOLS_URL>' --token '<ARGENT_AUTH_TOKEN>' --yes
```

Reload the agent after linking so its `argent mcp` process picks up the remote session.

**Sandboxed shells** (Claude Code, some CI environments) can't write to `~/.argent/` so `argent link` won't work there. Use env vars in the MCP config file instead — this is argent's highest-precedence resolution and overrides any link:

```json
{
  "mcpServers": {
    "argent": {
      "command": "argent",
      "args": ["mcp"],
      "env": {
        "ARGENT_TOOLS_URL": "<ARGENT_TOOLS_URL from simulator:start>",
        "ARGENT_AUTH_TOKEN": "<ARGENT_AUTH_TOKEN from simulator:start>"
      }
    }
  }
}
```

MCP config file location: `.cursor/mcp.json` (Cursor), `.claude/mcp.json` (Claude Code), `mcp.json` in the Codex project root. It carries a session token — **add it to `.gitignore`**.

**Known issues:**
- `argent init --help` launches an interactive wizard regardless of the flag — use `--yes` to skip it, or read the package source for non-interactive flags.
- Re-running `argent link` against an already-linked URL **without `--yes`** reports "Already linked. No changes." and keeps the old token — every call then fails with `401 Unauthorized`. Always pass `--yes` (as above) so a rotated token is actually written.
