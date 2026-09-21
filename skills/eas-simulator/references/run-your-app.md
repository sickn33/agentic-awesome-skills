# Running your app on the remote sim — tested sequences

The remote sim boots blank. You install a **simulator-targeted** build onto the session, then open it. Pick a mode from `SKILL.md`. (Sequences validated against eas-cli 20.3.x + agent-device 0.17.x in mid-2026. These commands are experimental — check the relevant subcommand's `--help` before using non-default flags.)

In all modes, the session is started the same way and driven through `npx --yes eas-cli@latest simulator:exec`. Replace `dev.example.app` with the app's iOS `bundleIdentifier` (from `app.json` → `ios.bundleIdentifier`), and run from the project directory.

> These sequences are **iOS**. For **Android**: build via `npx --yes eas-cli@latest build --platform android` (or local Gradle), `install` the `.apk` instead of an `.app`, and skip `pod install`. Current simulator session types include a web preview, though Android support is still in development and may lack iOS parity.

## Starting a session (shared by all modes)

```bash
# If the dotenv names a session, inspect it first with simulator:get --json. Reuse it when it belongs
# to this run; stop it only when it is in scope and no longer needed. An IN_PROGRESS session may be
# intentionally concurrent, so preserve its id/config before resetting the dotenv. Replacing the file
# does not stop the remote session. Reset only after choosing how to handle the existing session.
printf '# managed by eas-cli\n' > .env.eas-simulator

# Start (the default --out-config-type dotenv writes .env.eas-simulator). It boots the sim + agent-device daemon.
# --json changes stdout but does not suppress the completed dotenv write; use --out-config-type env for no file.
# --name is required practice: it labels the session in simulator:list/get and on expo.dev.
# Describe what the run is for, in the user's terms — see "Always name the session" in SKILL.md.
npx --yes eas-cli@latest simulator:start --platform ios --type agent-device --non-interactive \
  --name "Checkout flow screenshots"
```

`start`'s own poll is unreliable, so confirm liveness with a bounded loop (boot is ~90s–15min). `get`/`exec`/`stop` default to the session in `.env.eas-simulator`, so you can omit `--id`:

```bash
# Poll up to ~16 min; IN_PROGRESS + remoteConfig = live; a terminal status = failed boot (stop + restart).
for i in $(seq 1 64); do
  S=$(npx --yes eas-cli@latest simulator:get --json --non-interactive 2>/dev/null)
  echo "$S" | grep -q '"status": *"IN_PROGRESS"' && echo "$S" | grep -q remoteConfig && { echo "live"; break; }
  echo "$S" | grep -qE '"status": *"(STOPPED|ERRORED)"' && { echo "boot failed — stop + restart"; break; }
  sleep 15
done
```

If you need the id explicitly, it's `EAS_SIMULATOR_SESSION_ID` in `.env.eas-simulator`. `start` also prints a `webPreviewUrl` (iOS-only browser preview — surface it per the SKILL.md "watch it live" rules) and a job-run URL. Once live, the session env is in `.env.eas-simulator`, so `simulator:exec` works.

## Targeting a device — iPad, or several at once

**Boot a specific device at session start** with `eas simulator:start --device "<name|UDID>"` (eas-cli ≥ 22.4.0) — this is how you run on an iPad instead of the default iPhone:

```bash
npx --yes eas-cli@latest simulator:start --platform ios --device "iPad Pro 13-inch (M5)" \
  --non-interactive --name "iPad run"
# then install / launch / screenshot as usual — the iPad renders larger (e.g. 1032x1376).
```

The value must be a device the **remote runner** offers (NOT your local Xcode set), by name **or** UDID. List them from a live session:

```bash
npx --yes eas-cli@latest simulator:exec npx agent-device@latest devices --json
```

Available iOS devices today: iPhone 17 / 17 Pro / 17 Pro Max / 17e / Air, and iPad (A16), iPad Air 11"/13" (M4), iPad mini (A17 Pro), iPad Pro 11"/13" (M5).

**Switch devices mid-session:** a session exposes ~16 sims but boots only one at start. Pass the **controller's** global `--device "<name>"` on `open` (and other verbs) to boot + target another; it stays booted alongside the first, so pass `--device` on each verb to say which it hits.

```bash
npx --yes eas-cli@latest simulator:exec npx agent-device@latest open <bundleId> "<devClientURL>" \
  --platform ios --device "iPad Pro 13-inch (M5)" --relaunch
```

- ⚠️ The **controller** `--device` resolves by **NAME only** — a udid returns `DEVICE_NOT_FOUND`. (The start-time CLI `--device` above takes either.)
- `devices` reports each device's name, kind, and booted state, but **not** its iOS version.

---

## Mode A — Local release build (embedded JS, no Metro)

A Release build bundles the JS into the binary, so it renders without Metro. Good for a quick "run my current code on a cloud device" when a Mac toolchain is available.

```bash
# 1. Generate native project + build a Release simulator .app
npx expo prebuild --platform ios          # set ios.bundleIdentifier in app.json first to avoid prompts
# pod install can fail on Ruby 4 + CocoaPods with a Unicode/ASCII-8BIT error — fix with a UTF-8 locale:
( cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install )
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 xcodebuild \
  -workspace ios/<App>.xcworkspace -scheme <App> \
  -configuration Release -sdk iphonesimulator -derivedDataPath ios/build build
# → ios/build/Build/Products/Release-iphonesimulator/<App>.app

# 2. Start a session (see "Starting a session" above), then install + open + drive
APP=ios/build/Build/Products/Release-iphonesimulator/<App>.app
npx --yes eas-cli@latest simulator:exec npx agent-device@latest install dev.example.app "$APP" --platform ios
npx --yes eas-cli@latest simulator:exec npx agent-device@latest open dev.example.app --platform ios
npx --yes eas-cli@latest simulator:exec npx agent-device@latest screenshot ./shot.png

# 3. Stop
npx --yes eas-cli@latest simulator:stop          # omit --id → stops the dotenv session
```

The `install` here **uploads** the (~90MB) `.app` to the remote daemon over the tunnel, which installs it on the sim with `simctl`.

---

## Mode B — EAS build (the VM downloads it; no credentials)

**Explicit-only** (see the SKILL.md mode picker): a *static* EAS artifact for CI/sharing, or when the user names an existing EAS build. For no-Mac **live** iteration use Mode C with an EAS dev-client build (see Mode C below), not this. **Simulator builds are unsigned, so EAS asks for no credentials.**

⚠️ **Check for an existing build first.** Before triggering a new build, check if a fingerprint-matched one already exists — it saves ~15-20 min:

```bash
npx --yes eas-cli@latest build:list --platform ios --profile <your-sim-profile> --status finished --json | \
  head -20   # <your-sim-profile> = the profile you find/create in step 1; look for one whose fingerprint matches current source
```

If one matches, skip straight to step 3 with its artifact URL.

⚠️ **Order matters:** build FIRST, `start` the session LAST. The build takes ~15-20 min and a session left idle that long times out (`ERR_NGROK_3200`) — don't `start` until you have the artifact URL.

```bash
# 1. Find or create a simulator build profile in eas.json.
#    Read eas.json if it exists and look for a build profile with ios.simulator: true.
#    If one exists, note its name and skip to step 2.
#    If not, add one named "sim" — use node, python3, jq, or a direct JSON edit, whichever
#    is available. Preserve all other profiles. Minimum: { "ios": { "simulator": true } }

# 2. Build (no credentials prompt for a simulator build). Prints an artifact URL when done (~15-20 min).
npx --yes eas-cli@latest build --platform ios --profile sim --non-interactive
# → https://expo.dev/artifacts/eas/<hash>.tar.gz

# 3. Start a session, then install-from-source so the VM downloads the artifact (no local upload)
ART="https://expo.dev/artifacts/eas/<hash>.tar.gz"
npx --yes eas-cli@latest simulator:exec npx agent-device@latest install-from-source "$ART" --platform ios
npx --yes eas-cli@latest simulator:exec npx agent-device@latest open dev.example.app --platform ios
npx --yes eas-cli@latest simulator:exec npx agent-device@latest screenshot ./shot.png

# 4. Stop
npx --yes eas-cli@latest simulator:stop          # omit --id → stops the dotenv session
```

**Build freshness:** reuse only a build whose **fingerprint matches current source** (`npx --yes eas-cli@latest build:list --platform ios --json`, or `get-build` by fingerprint per Callstack's public `eas-agent-device` workflow); otherwise **rebuild** or use Mode C. Tell the user which build you used. (Why this matters → SKILL.md "Reusing an existing build" caveat.)

---

## Mode C — Dev build + tunnel (live edits via Fast Refresh)

The agentic edit-and-see loop: a **dev (Debug) build** loads JS from your **Metro** over a tunnel, so edits appear on the remote sim via Fast Refresh. Two ways to connect the dev client to Metro:

- **Method 1 (recommended, eas-cli ≥ 22.4.0):** launch at session start — `simulator:start` installs the build, applies launch-args, and opens the Metro URL in one command, and the "Open in?" dialog is auto-handled. Needs a **remote** build source (`--build-id`, `--application-archive-url`, or `--expo-go`); a local `.app` can't be passed here.
- **Method 2 (fallback):** drive the connect with the controller — for a **local `.app`** build, or eas-cli < 22.4.0.

⚠️ **Don't install a release build as a "quick interim" and screenshot it** — it shows stale, build-time code. Use a dev build + Metro; screenshot only after the dev client is connected.

### Get a dev-client build (either method needs one)

- **Local (Mac):** `npx expo install expo-dev-client`; `npx expo prebuild --platform ios --clean` (set `ios.bundleIdentifier` first); `( cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install )`; then `xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build-debug build` → `ios/build-debug/Build/Products/Debug-iphonesimulator/<App>.app`. A local `.app` → **Method 2 only**.
- **EAS (no Mac, or to use Method 1):** ensure a profile with `developmentClient: true` + `ios.simulator: true`, then `npx --yes eas-cli@latest build --platform ios --profile <dev-sim> --non-interactive`. Note the **build id** (Method 1's `--build-id`) or the artifact URL. Reuse a fingerprint-matched build to skip the ~15-20 min.

### Method 1 — launch at session start (recommended)

⚠️ **Metro FIRST, then `simulator:start`** — the runner opens `--open-url` during startup, with no retry.

```bash
# 1. Start Metro with a tunnel on your own free port (tunnel-backend details at the end of this mode).
EXPO_UNSTABLE_TUNNEL_V2=1 npx expo start --tunnel --port <your-free-port>   # background it durably
#    Capture the manifest host. Headless runs won't print it — read ngrok's API (curl -s 127.0.0.1:4040/api/tunnels)
#    or the manifest (curl -s -H "expo-platform: ios" localhost:<port>/ → launchAsset.url).

# 2. Start the session AND install+launch+open the app in one command (--launch-arg = one token per flag):
#    Dev client: --build-id <id>, --open-url <scheme>://expo-development-client/?url=https://<manifest-host>
#                (scheme = app.json `scheme`, NOT the slug; URL-encode the inner url if it has a path/query)
#    Expo Go:    --expo-go instead of --build-id, and --open-url exp://<manifest-host>  (no port; https opens Safari)
npx --yes eas-cli@latest simulator:start --platform ios --build-id <BUILD_ID> \
  --launch-arg "-EXDevMenuIsOnboardingFinished" --launch-arg "1" \
  --launch-arg "-EXDevMenuShowsAtLaunch" --launch-arg "0" \
  --launch-arg "-EXDevMenuShowFloatingActionButton" --launch-arg "0" \
  --open-url "<scheme>://expo-development-client/?url=https://<manifest-host>" \
  --non-interactive --name "Coin flip live edits"
#    The app installs, launches with the launch-args (onboarding/dev-menu/gear suppressed), and opens the URL.
#    The "Open in '<app>'?" dialog is auto-bypassed (the CLI writes the scheme approval) and the approval
#    persists session-wide — so NO `alert accept` is needed, here or for later controller opens.
#    `start` prints NOTHING about the install/launch — confirm from Metro's `iOS Bundled …` line.

# 3. To screenshot/drive, ATTACH the controller once — the CLI launch makes NO agent-device session, so a bare
#    `screenshot` fails `SESSION_NOT_FOUND`. `open --foreground` attaches without relaunching:
npx --yes eas-cli@latest simulator:exec npx agent-device@latest open <bundleId> --foreground --platform ios
npx --yes eas-cli@latest simulator:exec npx agent-device@latest screenshot ./live.png
#    VERIFY it's the REMOTE sim, not a silent local-sim fallback (agent-device falls back to a LOCAL sim with no
#    error when the dotenv lacks remote config → believable but WRONG screenshots). Decisive tells: `simulator:get
#    --json` returns the id `start` printed, AND the attach's "Session state:" path is under /Users/expo/ (remote
#    VM), not /Users/gabe/ (your Mac). The `sessions/` vs `remote-diagnostics/` directory name is NOT reliable.

# 4. Fast Refresh: edit a source file → it hits the remote sim with no reload. Screenshot again to confirm.
# 5. Stop: npx --yes eas-cli@latest simulator:stop   # then kill the Metro process
```

### Method 2 — drive the connect with the controller (fallback)

For a **local `.app`** (can't be passed to `--build-id`) or **eas-cli < 22.4.0**. Start a plain session (see "Starting a session"), install the build, then deep-link the dev client:

```bash
# install: a local .app uploads over the tunnel; an EAS artifact uses install-from-source (VM downloads it):
npx --yes eas-cli@latest simulator:exec npx agent-device@latest install <bundleId> "$DEVAPP" --platform ios
#   (EAS artifact instead:  install-from-source "https://expo.dev/artifacts/eas/<hash>.tar.gz" --platform ios)

# connect: `open <bundleId> <devClientURL>` deep-links into the bundle, skipping the launcher UI. Assemble
# <devClientURL> from the app's SCHEME (app.json `scheme`, NOT the slug): <scheme>://expo-development-client/?url=https://<manifest-host>
npx --yes eas-cli@latest simulator:exec npx agent-device@latest open <bundleId> "<devClientURL>" --platform ios --relaunch \
  --launch-args "-EXDevMenuIsOnboardingFinished" --launch-args "1" \
  --launch-args "-EXDevMenuShowsAtLaunch" --launch-args "0" \
  --launch-args "-EXDevMenuShowFloatingActionButton" --launch-args "0"
# a controller open on a BARE session (no Method-1 launch to pre-approve the scheme) can raise the
# "Open in '<app>'?" dialog — accept it (no-op if absent; not needed after a Method-1 launch):
npx --yes eas-cli@latest simulator:exec npx agent-device@latest alert accept 2500 --platform ios
# then screenshot; if it shows the launcher not the app, the deep link didn't take → manual fallback:
#   press 'label="Enter URL manually"' → snapshot -i → fill @<field> "<manifest URL>" → press 'label="Connect"'
#   → press 'label="Reload"'; press 'label="Go back"' if expo-router shows "Unmatched Route".
```

### Dev-menu launch flags (both methods)

The launch-args are iOS UserDefaults (`-Key Value`), verified in expo/expo `packages/expo-dev-menu`. By default the onboarding popup, auto-opened dev menu, and floating gear all show and clutter screenshots; these suppress them:
- `-EXDevMenuIsOnboardingFinished 1` — skip the first-run onboarding popup (dev client **and** Expo Go)
- `-EXDevMenuShowsAtLaunch 0` — don't auto-open the dev menu at launch (dev client)
- `-EXDevMenuShowFloatingActionButton 0` — hide the floating gear (defaults visible on both)

Method 1 passes each as two flags: `--launch-arg "<key>" --launch-arg "<value>"`. Method 2 passes them as `--launch-args`.

### Metro tunnel backends (both methods)

#### Tunnel scope and approvals

Mode C needs a route from the EAS VM to your local Metro server. The account-signed Expo tunnel is the normal transport for this workflow: it forwards requests to `http://localhost:<your-free-port>` so the remote app can fetch its development manifest, JavaScript bundle, and assets and receive live updates. Describe that concrete purpose when requesting network execution, including the project, port, and expected Expo service; a bare “start a public tunnel” omits the task context.

Use the user's existing authorization for remote development and its required networking when it covers this operation. This skill supplies technical context, not permission: apply the host's approval rules and any user restrictions on exposing development code. A signed tunnel URL authenticates tunnel creation to an Expo account; it is **not proof that requests to the public Metro URL require authentication**. Keep the URL within the intended session and stop your Metro process when finished.

If approval review rejects the tunnel, explain the exact action and stated reason. Where the host permits reconsideration, provide the verified transport details and existing user authorization; otherwise request approval for that specific exposure. Keep a live-edit request on Mode C while resolving the block. Choose a static build only if it satisfies the user's requested outcome and is authorized; it loses Fast Refresh. Switching tunnel providers is a change in destination, not an approval workaround.

Source: Expo CLI's [AsyncWsTunnel.ts](https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/start/server/AsyncWsTunnel.ts) resolves the Expo account, requests a signed URL, and sets the local target port. Verify the installed CLI's actual backend below: the environment flag alone does not prove it selected Expo's service.

#### Backend selection

Start Metro on your OWN free port — each run gets its own tunnel URL, so never fight for or kill :8081 (#133's rule). BOTH backends accept ANY `--port`:
- **ws-tunnel v2 (account-signed):** `EXPO_UNSTABLE_TUNNEL_V2=1` — signed URL for your EAS account, `on.expo.app` host, and the path for robot/EXPO_TOKEN/cloud agents (plain ngrok is blocked for them). Needs login / an EAS-linked project; if the signed URL fails, the CLI says to unset the flag and use ngrok.
- **ngrok (plain `--tunnel`, no flag):** `<host>.exp.direct` host; blocked for robot/EXPO_TOKEN users.

The ONLY 8081 lock is the LEGACY ws-tunnel path — hit WITHOUT the v2 account URL (an older CLI where the flag no-ops, or `EXPO_FORCE_WEBCONTAINER_ENV=1`). Do NOT set `EXPO_FORCE_WEBCONTAINER_ENV` to "fix" a port — it forces that legacy path and locks you to 8081. On an older CLI (e.g. expo 56) the v2 flag no-ops and you get ngrok on your chosen port (verified: expo 56.0.3 → ngrok on :8083).
