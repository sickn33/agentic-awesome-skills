# Dispatch and poll

The relay wraps the ZCode CLI so your job is "run a command, read a file."

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
cat brief.txt | node "<skill-dir>/scripts/relay.mjs" --cd /path/to/repo
```

## How the relay finds ZCode

ZCode does not install a `zcode` binary on PATH and does not publish one to npm — the CLI ships
inside the desktop app. The relay resolves it in this order, first hit wins:

1. `zcode` on **PATH** — if you made a shim or alias, this is used.
2. **`--zcode-path <file>`**, else the **`ZCODE_CLI`** environment variable.
3. The installed **app bundle**: `%LOCALAPPDATA%\Programs\ZCode\resources\glm\zcode.cjs` on Windows,
   `/Applications/ZCode.app/…` (and `~/Applications/…`) on macOS. Linux ships an AppImage with no
   fixed install path, so there is nothing to auto-discover there — use option 1 or 2.

A resolved `.cjs` bundle is launched under `node`. `result.json` records which route was used in
`zcodeSource` (`path` / `flag` / `env` / `bundle`), so a surprising install is visible after the run.

If no CLI is found — including when you name one explicitly that does not exist — the relay exits
**127** and still writes a `result.json` with `status: "zcode_unavailable"`.

## Options

| Flag | Effect |
| --- | --- |
| `--brief <file>` | Path to the brief. Omitted → read from stdin. |
| `--cd <dir>` | Working root for ZCode (default: current directory). |
| `--lane <name>` | Fleet lane from `delegate-setup` config. Explicit flags win over lane dials. |
| `--mode <mode>` | ZCode's `--mode`. **Only `plan` and `yolo` are accepted** (see below). Default `yolo`. |
| `--read-only` | Shortcut for `--mode plan` (review/diagnosis, no edits). |
| `--disallowed-tools <list>` | Comma/space-separated denylist, e.g. `"Write,Edit,Bash"`. Enforced by ZCode. |
| `--session <id>` | Continue a specific session by `sess_…` id from a prior `result.json`. |
| `--resume-last` | Continue the latest session **for `--cd`**. Mutually exclusive with `--session`. |
| `--zcode-path <file>` | Point at the CLI explicitly. |
| `--timeout <dur>` | Relay-side watchdog (default: off). `30m`, `2h`. ZCode has no timeout flag of its own. |
| `--out-dir <dir>` | Where to write run artifacts (default: a fresh dir under the system temp dir). |
| `-h, --help` | Show help. |

### Why `build` and `edit` are rejected

ZCode documents four modes. Headless runs have no permission client, so under `build` or `edit` the
Write and Bash tools are blocked and the run **exits 0 having changed nothing**, with a report
explaining that tool permissions were denied. That is a success status for a run that did no work,
so the relay refuses those modes up front with a usage error (exit 2) rather than letting them look
like a completed task. Use `--mode yolo` to write, or `--read-only` for plan mode.

## The `result.json` contract

Speaks `delegate-relay.result.v1`.

| Field | Meaning |
| --- | --- |
| `status` | `completed` \| `failed` \| `timeout` \| `aborted` \| `zcode_unavailable` |
| `exitCode` | ZCode's own exit code, or the relay's mapping for a killed run |
| `signal` | The signal that killed the child, or `null` |
| `finalMessage` | ZCode's final report (its `response` field) |
| `sessionId` | The `sess_…` id — pass to `--session` to continue this exact session |
| `touchedFiles` | Git porcelain paths. `[]` when the tree is clean, `null` when git cannot report. |
| `mode` | The ZCode mode the run actually used |
| `readOnlyViolation` | Tri-state. `false` = the tripwire saw no change on a plan run, `true` = it did, `null` = unknown or not applicable |
| `usage` | ZCode's token accounting (input, output, total, cache reads) |
| `contextWindow` | From ZCode's `projection` |
| `zcodeVersion`, `zcodeSource` | Which CLI ran, and how it was found |
| `briefPath`, `outputPath`, `finalPath` | Run artifacts on disk |

Exit codes: a pre-run usage error (bad args, empty brief, a rejected `--mode`) exits **2** and writes
**no** result file. A CLI that cannot be found exits **127** and *does* write one. Otherwise the exit
code mirrors ZCode's, and a run killed by the watchdog reports `timeout`.

An orchestrator that polls for the file must therefore also check the exit code — a non-zero exit
with no file is a usage error, not a crashed run.

## Backgrounding

- **Claude Code:** run the Bash call with `run_in_background: true`.
- **bash/zsh (incl. Git Bash/WSL):** `… &`, then poll for `result.json`.
- **PowerShell:** `Start-Job`. **cmd:** `start /b`.

The run is finished when `result.json` exists with a `status` *and* the process has exited.

## Reading the output

ZCode's `--json` prints a single JSON document at the end rather than a stream of events, and the
relay parses it tolerantly: the bundled AI SDK sometimes prints a warning banner on stdout ahead of
the JSON, so leading non-JSON lines are skipped. The raw stdout is preserved at `outputPath` and the
final report at `finalPath`, so nothing is lost if parsing degrades.

If the document cannot be parsed at all:

- with exit 0, the run is still `completed`, `finalMessage` falls back to the raw stdout, and a
  `parseWarning` field is set — read `outputPath` yourself.
- with a non-zero exit, the run is `failed` and `stderrTail` carries the last lines of stderr.

## When a run misbehaves

- **`status: "timeout"`** — the watchdog fired. The whole ZCode process tree was killed. Inspect the
  working tree before re-dispatching; a killed run can leave partial edits.
- **`status: "aborted"`** — the relay itself was killed and forwarded the kill. Same advice.
- **`status: "zcode_unavailable"`** — no CLI found. Check the three resolution routes above.
- **Exit 1 with `Session not found`** — the `--session` id does not exist. Session ids are
  `sess_`-prefixed; copy them from a prior `result.json`, not from memory.
- **`completed` but `touchedFiles` is empty on a write run** — read `finalMessage`. ZCode may have
  reported that it could not proceed. That is a real outcome, not a relay bug.
- **`(no final message captured)` on a resumed plan-mode run** — ZCode has been observed returning
  `"response": ""` while doing substantial work (658 output tokens across 602 events in one measured
  run). The relay reports what ZCode sent, so an empty report here is the CLI's, not a parse failure:
  `parseWarning` will be absent and `usage` non-zero. Read `outputPath` and the working tree rather
  than concluding nothing happened.
