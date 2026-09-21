---
description: Curated upstream guidance for Eas Simulator; use when the workflow matches the user goal.
name: eas-simulator
version: 1.0.0
license: MIT
allowed-tools: "Bash(npx *eas-cli@*), Bash(npx *agent-device@*), Bash(npx expo *),  Bash(eas *), Bash(expo *), Bash(xcodebuild*), Bash(pod*), Bash(argent *), Bash(ffmpeg*)"

source_repo: expo/skills
source_type: official
source: expo
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# EAS Simulator

> **EAS service - costs apply.** EAS Simulator is a hosted EAS service. Session usage is subject to your account's pricing and limits. See https://expo.dev/pricing for current terms.

EAS Simulator runs a remote iOS simulator or Android emulator on EAS infrastructure that you drive from your machine — from the CLI, from an AI agent (via `agent-device`), and from a browser preview. It's the unlock for **environments that can't run a simulator locally** (Linux boxes, cloud/background agents like Cursor Cloud), and for letting an agent *verify* a change on a real device instead of only reasoning about code.

The `simulator:*` commands are **experimental and hidden**, and need a recent eas-cli (≥ 20.3.0 as of writing) — which is why this skill runs everything via `npx --yes eas-cli@latest`. Flags and verbs may change; **the relevant subcommand's `--help` output is authoritative.**

## When to Use
The frontmatter `description` carries the trigger phrases. In short: use this to get a user's app onto a **cloud** simulator and interact with it — especially from a Mac-less or cloud/sandbox agent. **Not** for local sims (`expo run:ios`, Xcode, Android Studio), store builds/signing (that's EAS Build), or physical devices. For the macOS case, see *Cloud vs local* next.

## Cloud vs local: decide this first

- **Explicit cloud/remote/shareable request:** use EAS Simulator after checking access, on any host.
- **Generic simulator request:** use a suitable local simulator when available. If the host cannot run the requested simulator (for example, iOS on Linux or a cloud sandbox), use EAS Simulator after checking access. A non-macOS host may still support a local Android emulator.
- Honor an explicit local choice; hand off to `expo run:ios` / Xcode / Android Studio as appropriate. Clarify only when the requested environment remains ambiguous and affects the task.

When the user requests EAS Simulator or a cloud simulator, proceed within that request and
any stated budget. Explain applicable usage once and carry existing authorization through
the session. Ask before exceeding a stated budget or expanding beyond the requested work.

## Prerequisites

- **Run every `eas` command via `npx --yes eas-cli@latest …`** — guarantees a CLI new enough to have `simulator:*` (a global `eas` is often too old), and `--yes` skips npx's prompt. (Bare `eas` is fine if `eas --version` is current.)
- **Authenticated.** Interactive machine → `npx --yes eas-cli@latest login`. **Cloud sandbox / CI / headless agent has no browser login — set `EXPO_TOKEN`** (expo.dev → Account → Access Tokens) in the env instead. Verify either way with `npx --yes eas-cli@latest whoami`.
- Run from an Expo **project directory.** A fresh app needs one-time setup: `npx --yes eas-cli@latest init` to create/link the project (when there's no `projectId`), and **set `ios.bundleIdentifier`** in app config if it's missing — a fresh `create-expo-app` often has none, and `prebuild`/`eas build` need it (they prompt or fail without it; e.g. `dev.<owner>.<slug>`). Read current config with `npx expo config --json` (it may live in `app.config.js`). The first Mode-C run is slow (native build); later runs reuse it.
- A controller to drive the device. This skill uses **agent-device** (open source, MIT), run on demand via `npx agent-device@latest` — nothing globally installed. **Appium** and **argent** are alternative automation interfaces; `web-preview-only` has no automation interface. See [references/controllers.md].
- **`.env.eas-simulator`** is written/managed by eas-cli (not this skill): it holds the session id (`EAS_SIMULATOR_SESSION_ID`) + the daemon URL/**token**, so `get`/`stop`/`exec` default to that session (usually **omit `--id`**; pass `--id <id>` to target another). It carries a **token → keep it gitignored** (eas-cli marks it "do not commit" but may not add the ignore rule, and a fresh app's `.gitignore` won't cover it — add `.env.eas-simulator` if missing).
- **The command blocks assume a POSIX shell** (bash/zsh) — `printf`, `lsof`, `$(seq …)` loops won't run in cmd/PowerShell. On Windows, run them in WSL or Git Bash, or translate as you go (the `eas-cli`/`agent-device` invocations themselves are cross-platform).

## Session lifetime

- `--max-duration-minutes N` is the hard automatic-stop deadline. Customize it when supported by the account; otherwise use the service's default session limit.
- `--max-idle-time-minutes N` stops a session after that many inactive minutes. Omitted means **no idle timeout**: the session runs until its maximum duration or an explicit stop.
- **Only activity reported through `agent-device` and `argent` resets the idle timer.** Appium commands and browser-preview activity do not reset it. For Appium or a user-driven browser preview, rely on the maximum duration—not idle time—to bound the session; customize it with `--max-duration-minutes` when supported by the account.

## Check availability first

EAS Simulator is a **limited-access** EAS feature that is still rolling out, so it isn't enabled on every account. Check access **before** starting a session; this read-only command does not create a session.

```bash
npx --yes eas-cli@latest simulator:availability --json
# → {"available": true, ...}  enabled → continue to the core loop
# → {"available": false, ...} not enabled → do NOT start a session
```

If it's **not** available, don't call `simulator:start` (it will fail). Instead, hand off gracefully so you keep making progress without this skill:
- Tell the user EAS Simulator isn't available on their account yet — it's coming soon.
- Fall back to their normal local path for the actual goal — `expo run:ios` / Xcode / Android Studio for a local sim/emulator, an EAS Build, or whatever else fits. Don't dead-end on the cloud sim; the request was almost never "use EAS Simulator specifically."

(If `simulator:availability` isn't recognized, the CLI is too old — upgrade, or treat a `not enabled for this account` error from `simulator:start` the same way: stop and fall back.)

## The core loop (always the same)

A session is: **start → (install your app) → drive → stop.** `eas-cli` owns the *session*; the device *verbs* (open/tap/screenshot) come from the controller, which `npx --yes eas-cli@latest simulator:exec` runs for you with the session's connection env loaded.

```bash
# 1. Start a session (boots the remote sim + agent-device daemon; writes .env.eas-simulator).
# If the dotenv names a session, inspect it with simulator:get --json first. Reuse it when it
# belongs to this run; stop it only when it is in scope and no longer needed. An IN_PROGRESS
# session may be intentionally concurrent, so preserve its id/config before resetting the dotenv.
# Continue below only after choosing how to handle that existing session.
printf '# managed by eas-cli\n' > .env.eas-simulator   # clear only after resolving any live session
npx --yes eas-cli@latest simulator:start --platform ios --type agent-device --non-interactive \
  --name "Checkout flow screenshots"   # always name it — see 'Always name the session'
#    Then confirm it's live: simulator:get --json → status IN_PROGRESS (bounded poll in run-your-app.md).

# 2. Drive it through `exec` (loads the session env, then runs the command you give it).
#    agent-device runs on demand via npx — nothing installed globally.
npx --yes eas-cli@latest simulator:exec npx agent-device@latest open <app-or-url> --platform ios
npx --yes eas-cli@latest simulator:exec npx agent-device@latest snapshot -i          # interactive UI tree → @e1, @e2 refs
npx --yes eas-cli@latest simulator:exec npx agent-device@latest press @e2            # tap a ref (NOTE: 'press', not 'tap')
npx --yes eas-cli@latest simulator:exec npx agent-device@latest screenshot ./shot.png

# 3. Stop the session and reset the dotenv. Omit --id to target the dotenv session.
npx --yes eas-cli@latest simulator:stop
printf '# managed by eas-cli\n' > .env.eas-simulator
```

To **watch** it live, hand the user the `webPreviewUrl` that `start` prints. All current session types include a browser preview; `agent-device`, `appium`, and `argent` also provide automation, while `web-preview-only` provides no automation interface. **This URL is for the *user's* browser — you cannot open it for them, and it must never touch the sim:**
- **"Open it here" (Cursor/VS Code)** → print the URL on its own line and tell the user to open Simple Browser (`Cmd/Ctrl+Shift+P` → "Simple Browser: Show") and paste it. Then **stop**: do not shell out to a system browser or a Cursor/VS Code URL handler, and do not ask "did a tab appear?" — you can't confirm it, the handoff is done.
- **Never `open` the `webPreviewUrl` on the sim.** It's a browser preview, not a deep link and not an `agent-device open` argument; routing it to the device renders a browser-in-a-browser (a real past failure).
- **Headless agent** (no display) → just return the URL as the deliverable.
- **Keeping it alive for the user to drive** → use `--max-duration-minutes N` when supported, otherwise use the service's default limit. Browser-preview activity does not reset `--max-idle-time-minutes`, so idle timeout is not a reliable lifetime bound for this case. Tell the user when the session expires, using the CLI's reported duration or expiry. Keep it running for the requested preview; stop sessions created for one-shot tasks when the task finishes.

`start` also prints a job-run URL.

## Always name the session

Pass `--name "<description>"` on every `simulator:start`. The name appears in `simulator:list`, `simulator:get`, and on the **Simulator sessions** page on expo.dev, where it replaces the generic title on each row. Unnamed, every row reads "Simulator session" over a random id — a wall of identical entries nobody can navigate. Write the name for a **human scanning that list days later**, not for yourself during this run.

Write what the session is *for*, in a few plain words:

```bash
--name "Checkout flow screenshots"     # what you did
--name "Dev build — dark mode fix"     # what you were testing
--name "Login repro for issue 412"     # why it exists
```

Rules:
- Derive it from the user's request, not from the mode or the tooling. `Mode C session`, `agent-device ios`, and `test` say nothing.
- **Length: aim for 3–6 words, ~40 characters, and treat 50 as the practical limit.** It renders as a single-line title in a narrow table column, so a long name clips. The API accepts up to **255 characters** and rejects an empty/whitespace-only name, but 255 is a ceiling you never approach, not a target. One noun phrase, no sentences.
- Be specific within that budget. Include a ticket or PR number when there is one.
- **Sentence case:** capitalize the first word only, and leave identifiers in their real casing (`Dev build for expo-router v4`, `Repro for EXPO-1234`). It's a row title, so no Title Case, no all-lowercase, and no trailing period.
- **Don't repeat what the table already shows.** Every row already displays the session id, platform, start time, duration, and who created it — so no ids, no `iOS`, no dates, no your-own-name. Spend the whole budget on what those columns can't say: the purpose.
- If the user names it, use their name as-is.
- Sessions are per-run, so name each new one for that run. Don't reuse an old name for different work.

`--name` is newer than `simulator:start` itself, so an older installed `eas-cli` can reject it. If that happens, run via `npx --yes eas-cli@latest` or upgrade; as a last resort, retry once without `--name` (the session starts unnamed). See [references/troubleshooting.md].

## Commands at a glance

Query the installed CLI for the complete current flag set before using non-default start
flags, machine-readable/config output, list filters, or session events:

```bash
# Replace `start` with the simulator subcommand you are about to run.
npx --yes eas-cli@latest simulator:start --help
```

The examples below cover the common workflow; they are intentionally not an exhaustive
copy of the CLI surface. Keep non-obvious behavioral guidance from this skill—especially
[Session lifetime](#session-lifetime)—even when constructing the command from `--help`.

| Command | Purpose |
|---|---|
| `npx --yes eas-cli@latest simulator:availability [--json] [--non-interactive]` | Check access without creating a session. |
| `npx --yes eas-cli@latest simulator:start --platform ios\|android --name "<description>" [flags]` | Create a session; boot the sim + selected interface; write `.env.eas-simulator` by default; print the preview + job-run URLs. **Always pass `--name`**. `--json` does not suppress the dotenv; use `--out-config-type env` when no file should be written. |
| `npx --yes eas-cli@latest simulator:exec <cmd> [args…]` | Load `.env.eas-simulator`, then run `<cmd>` with that env. The bridge to the controller. |
| `npx --yes eas-cli@latest simulator:get [--id <id>] [--json] [--non-interactive]` | Session status + connection details, including the session name. **Use this to confirm readiness** (see *Operating principles*). |
| `npx --yes eas-cli@latest simulator:list [filters] [--limit N] [--after <cursor>] [--json]` | List and paginate project sessions; filter by status, type, platform, name prefix, and tags. |
| `npx --yes eas-cli@latest simulator:events [--id <id>] [--follow\|--json]` | Show recorded activity events; `--follow` watches until the session ends. |
| `npx --yes eas-cli@latest simulator:stop [--id <id>] [--json] [--non-interactive]` | Stop a session (idempotent). |

## Running the user's app — pick a mode

The remote sim boots **blank — no Expo Go, no apps.** Install a build, then drive it — but **match the build *type* to the goal first** (the box below); that's where live-session runs derail. Full sequences: [references/run-your-app.md] — read before running a mode.

> **Match the build to the goal before installing anything — this is where live-session runs derail.** Two traps, same root (grabbing a build that doesn't fit the request):
> 1. **Wrong type.** Live edits (Mode C) **require a dev build.** A *static* build — a local Release (A), the default EAS sim build (B), or **any build left on the sim from an earlier screenshot run** — freezes its JS at build time and **can never hot-reload.** For a live request, **ignore existing builds entirely** and install a **dev** build (local Debug, or an EAS build with `developmentClient: true`). Never reconnect Metro to a static build hoping it'll reload — it won't.
> 2. **Stale.** A static look must match current source — reuse only a fingerprint-matched build, else build fresh; reuse is explicit-only.
>
> So a leftover EAS/release build is **not** a shortcut for "iterate live" — it's the wrong binary. The fact that a build *exists* never makes it the right one.

| Mode | What it is | Choose when | Live edits? |
|---|---|---|---|
| **A — Local release build** | Build a Release `.app` locally, `agent-device install` it (uploads) | User has a Mac toolchain and wants a quick "run my current code on a cloud device" | No (rebuild to see changes) |
| **B — EAS build** (rare, explicit-only) | `eas build` a simulator build, `agent-device install-from-source <url>` (the VM downloads it) | **Only when explicitly asked** — the user names an existing/EAS build, or wants a static EAS artifact for CI/sharing. Not for "show me"/"iterate" (use C). Sim builds need no credentials. | No |
| **C — Local dev build + tunnel** | Dev (Debug) build + `EXPO_UNSTABLE_TUNNEL_V2=1 expo start --tunnel` + connect the dev client to Metro | **The agentic edit-and-see loop** — change code and see it live (Fast Refresh) | **Yes** |

Quick decision — **default to C; A and B are explicit-only:**
- **C (almost everything):** iterate, interact, poke the app, live edits — *and* most "show me my app" (current code needs a build anyway, so live+current wins). Mac → dev client builds locally; no Mac → build it on EAS (`developmentClient: true`). **Unsure → C.**
- **A:** only an explicit one-shot **static** screenshot on a Mac.
- **B:** only when the user names an existing/EAS build or wants a static EAS artifact (CI/sharing) — see the box above for why a static build is the wrong tool for "iterate."

Before starting a Mode C tunnel, read [Tunnel scope and approvals] for its data flow, authorization context, and handling approval rejections.

## Driving the device (agent-device)

If a controller fails to download a recording, retrieve it from [EAS session artifacts].

`agent-device` is the controller. Common verbs (run each as `npx --yes eas-cli@latest simulator:exec npx agent-device@latest <verb>`):

| Verb | Does |
|---|---|
| `apps --platform ios` | List user-installed apps (the blank sim shows none); add `--all` to include system apps |
| `install <appId> <path> --platform ios` | Install a local `.app` (uploads it) |
| `install-from-source <url> --platform ios` | Install from a URL — the VM downloads it (use for EAS artifacts) |
| `open <appId\|deep-link> --platform ios` | Launch an app (bundle id) or follow an app **deep link** (`exp+slug://…`). A first-time deep link raises a system **"Open in '<app>'?"** dialog — expect it (don't burn a snapshot discovering it) and `press 'label="Open"'` to hand off; it can be slow, so bound it with agent-device's own `--timeout` (e.g. `press 'label="Open"' --timeout 120000`) — **not** a shell `timeout` wrapper (macOS has no `timeout` binary). (Mode C sidesteps this dialog for the Metro-connect link via "Enter URL manually" — see run-your-app.md.) **Not** for the `webPreviewUrl` — that's a browser preview for the user, never the device. |
| `snapshot -i` | Interactive accessibility tree → `@e1`-style refs |
| `press <ref\|selector>` | Tap (e.g. `press @e2` or `press 'label="Open"'`) — **the tap verb is `press`, not `tap`** |
| `fill <ref> "text"` | Type into a field |
| `screenshot <path>` | Capture the screen to a local PNG (downloaded from the daemon) — requires an app to be open (`open` first) |
| `record start` / `record stop <path>` | Record the screen to a video — use this for **motion** (animations, gestures, transitions, timing), which a single screenshot can't capture |
| `metro prepare` / `metro reload` | Point a dev client at Metro / reload (Mode C) |

**Screenshots vs. video.** Default to `screenshot` for static state, but for anything that *moves* — an animation, a transition, a gesture, a timing/jank question — **record a video and inspect the frames** instead; a still can't prove motion. Both controllers record (agent-device `record start`/`stop`, argent `screen-recording-start`/`stop`). Recordings sample at ~30fps — enough to see visible jank, not to prove sub-frame 60/120Hz hitches. For **timing** specifically, argent drops static frames by default (turn `trimStatic` off) — that plus other per-controller gotchas are in [references/controllers.md].

For the full verb set and the `argent` controller alternative, see [references/controllers.md].

## Operating principles

The non-obvious mental model worth internalizing. Specific error→fix lookups (hung verbs, `tap`→`press`, `--platform`, `--json`, `pod install` locale, orphaned sessions, boot variability) live in [references/troubleshooting.md].

1. **Establish ground truth, then reset — don't patch-loop.** Never assume an existing session or Metro is yours or healthy. Before driving, confirm:
   - **cwd** — you're in the intended Expo project dir (a misdirected `start`/`exec` sessions the *wrong app* + drops a stray `.env.eas-simulator`; `pwd` / check `app.json`).
   - **session live** — `IN_PROGRESS` via `simulator:get --json` (a stopped session keeps its id + `remoteConfig`, so the dotenv alone isn't proof).
   - **Metro on its own port** — reuse only if you started it this session; else start one on a free port (`--port <N>`, e.g. 8082), don't kill another server to reclaim `:8081` (run-your-app.md).
   - **build fits intent** — a **release build can't live-reload**; if live edits are wanted and a release build is installed, **install the dev build, don't reconnect**.

   If current code isn't rendering after your **first** connect, stop poking live state: **reset to baseline** (stop session → clear dotenv → kill your Metro) and redo the mode **once**; a second failure → stop and report. Never restart Metro in place, reconnect more than once, rebuild the native client to fix a JS/connection problem, or surface a preview URL while state is unknown. (A daemon drop — `ERR_NGROK_3200` / `Remote daemon is unavailable` — is the same: reset, don't retry.)
2. **`exec` is a wrapper, not a driver.** `simulator:exec` loads `.env.eas-simulator` and spawns the command you pass; the device verbs come from the controller (`npx agent-device@latest`). There is no `simulator:tap`.
3. **Act immediately; don't park an idle session.** Sessions are short-lived — install and drive right after `start`. Leaving one idle drops the tunnel/daemon (→ reset, per #1).
4. **Stop sessions you created on completion or failure and reset the dotenv.** `--non-interactive` does not stop a session when your task ends. For a requested live preview, follow the duration guidance above. Poll the existing session during a slow boot; starting another creates an extra session and overwrites the dotenv's session id.
5. **Screenshot only the correct, fresh build.** Mode C only after the dev client connects to Metro; A/B only from a build matching current source — reusing a pre-existing build is the #1 "my edits don't show" cause (see the build caveat above). (`9:41` in the status bar is the sim default, not staleness.)

## Stop and clean up

After the task, stop the session you created **and reset the dotenv** so a later run doesn't try to reuse the dead session. For a requested live preview, keep it available for the agreed duration instead:

```bash
npx --yes eas-cli@latest simulator:stop          # omit --id → stops the dotenv session (or pass --id <id>)
printf '# managed by eas-cli\n' > .env.eas-simulator   # clear the stale session id so it isn't reused
# if you started Metro for Mode C, stop it too (Ctrl+C in its terminal, or kill the expo process)
```

## References

- [references/run-your-app.md] — full command sequences for modes A, B, and C (read before running a mode).
- [references/controllers.md] — agent-device verb reference and the `argent` alternative.
- [references/troubleshooting.md] — concrete errors and fixes.

Source of truth: Expo docs and the `eas` / `agent-device` CLIs (`npx --yes eas-cli@latest simulator:* --help`, `agent-device --help`). This skill teaches how to apply them; it doesn't replace them.

## Submitting Feedback
If you encounter errors, misleading or outdated information in this skill, report it so Expo can improve:
```bash
npx --yes submit-expo-feedback@latest --category skills --subject "eas-simulator" "<actionable feedback>"
```
Only submit when you have something specific and actionable to report. Include as much relevant context as possible.
If an AI agent repeatedly failed or the user had to take over an Expo task, load the expo-skill-feedback skill and follow its eval-candidate flow instead of reusing the command above.


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
