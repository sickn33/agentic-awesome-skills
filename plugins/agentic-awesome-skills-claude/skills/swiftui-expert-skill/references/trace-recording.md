# Recording an Instruments Trace

Use this reference when the user asks to record a new trace — either to
attach to a running app, launch one fresh, or capture a specific session
of actions they'll perform interactively.

The bundled `scripts/record_trace.py` wraps `xctrace record` with:

- The **SwiftUI** template by default (override with `--template`).
- **Manual stop** via Ctrl+C, a stop-file, or `--time-limit`.
- JSON discovery for devices and templates.
- Normal Python exit codes so an agent can orchestrate.

## Typical flows

### A) Attach to a running app on a connected device

```bash
python3 "${SKILL_DIR}/scripts/record_trace.py" \
  --device "Pol's iPhone" \
  --attach "Helm" \
  --output ~/Desktop/helm-session.trace
```

Leave it running while the user exercises the app. Stop with **Ctrl+C**.

### B) Launch an app and record from the first frame

```bash
python3 "${SKILL_DIR}/scripts/record_trace.py" \
  --device "<UDID>" \
  --launch "/path/to/App.app" \
  --output ~/Desktop/launch.trace
```

Useful for diagnosing cold-start hitches and view-creation cost.

### C) Agent-driven: start in background, stop via stop-file

When you (the agent) are running non-interactively — e.g. via
`Bash run_in_background` — use a stop-file so you can signal the
recording to end cleanly:

```bash
# Create a fresh private directory; keep this variable for the stop call.
TRACE_RUN_DIR=$(mktemp -d)
# Start recording through the host tool's supported background facility:
python3 "${SKILL_DIR}/scripts/record_trace.py" \
  --attach Helm --stop-file "$TRACE_RUN_DIR/stop" \
  --output ~/Desktop/session.trace

# ...user does their thing...

# Stop cleanly (from another shell or tool call)
touch "$TRACE_RUN_DIR/stop"
```

The script polls every 0.5s for the stop-file, sends SIGINT to xctrace
when it appears, and waits up to 60s for the trace to finalise.

### D) Time-boxed recording

```bash
python3 "${SKILL_DIR}/scripts/record_trace.py" \
  --attach Helm --time-limit 30s --output ~/Desktop/30s.trace
```

xctrace stops itself at the limit.

## Discovery helpers

```bash
# List every connected device, simulator, and the host — JSON.
python3 "${SKILL_DIR}/scripts/record_trace.py" --list-devices

# List all Instruments templates — JSON with a flat list + by-section map.
python3 "${SKILL_DIR}/scripts/record_trace.py" --list-templates
```

Device entries have `kind` (`devices`, `devices offline`, `simulators`),
`name`, `os`, `udid`. Offline devices are known but unplugged / unpaired —
plug them in before recording.

## Picking a template

Template lanes depend on the Xcode version, target and recording configuration. Some SwiftUI Instruments configurations do not support Simulator lanes. Confirm templates and the actual exported schemas; do not assume every physical device or Time Profiler recording contains SwiftUI, Hangs and Animation Hitches data. Missing lanes are unavailable, not a passed measurement.

Decision flow:

| Target                                       | Template to pass     |
|----------------------------------------------|----------------------|
| Physical iOS/iPadOS device (connected)       | `SwiftUI` (default)  |
| Host Mac (macOS app, `--all-processes`, etc.)| `SwiftUI` (default)  |
| iOS / iPadOS / watchOS / tvOS Simulator      | `Time Profiler`      |

Always confirm the target kind with `--list-devices` before starting a
recording: entries under `simulators` often need a supported Time Profiler configuration; entries under `devices` (both connected devices and the host
Mac) may support SwiftUI profiling when the installed toolchain and app configuration do. Entries under `devices offline` need
the user to connect/unlock/trust the device before recording.

For ad-hoc hang hunting on any target, `Time Profiler` or
`Animation Hitches` alone may be enough.

## Chaining into analysis

The recording script prints `trace written: <path>` on exit. Feed that
path straight into `analyze_trace.py`:

```bash
# Use the known output path, not awk over a log (paths can contain spaces).
TRACE_RUN_DIR=$(mktemp -d)
python3 "${SKILL_DIR}/scripts/record_trace.py" --attach Helm \
  --time-limit 30s --output "$TRACE_RUN_DIR/session.trace"
# Continue only if recording exited successfully and the bundle was finalized.
python3 "${SKILL_DIR}/scripts/analyze_trace.py" --trace "$TRACE_RUN_DIR/session.trace" --json-only
```

If the user wanted a specific scope, combine with `--list-logs` /
`--list-signposts` / `--window` from `references/trace-analysis.md`.

## Failure modes to handle

- **Device offline** — `--list-devices` shows it in `devices offline`.
  Ask the user to connect/unlock the device and retry.
- **Output path exists** — the script refuses to overwrite. Either pick
  a new `--output` preserve the existing bundle; do not delete it merely to make a retry succeed.
- **App not running (for `--attach`)** — xctrace exits with an error;
  fall back to `--launch` or tell the user to open the app first.
- **Signing / trust on device** — iOS requires a development build
  signed with the user's team. If xctrace returns a signing error, point
  the user to trust the developer profile on the device.

Before recording, confirm the authorized device, exact app/process and duration; all-process capture requires an explicit broader scope. Launch mode executes the selected app. Do not pass secrets with --env unless that exposure is accepted: the wrapper hides them from its command log, but they remain process arguments to xctrace. Use fresh private output/stop paths, retain raw traces as sensitive data and do not upload them. A stop-file must not already exist. Test that the selected app/build and Instruments permissions support profiling; host device enumeration is not proof that recording will work.
