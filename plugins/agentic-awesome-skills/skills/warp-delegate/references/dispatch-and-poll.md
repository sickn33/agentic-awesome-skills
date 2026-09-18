# Dispatch and poll

The relay is the only Warp-specific machinery in this skill. It launches `oz agent run`, captures
the event stream, and writes one result file the orchestrator can read.

## What the relay runs

```text
oz agent run --output-format ndjson --cwd <cd> [--model …] [--profile …] [--name …]
             [--conversation …] [--skill …] [--mcp … …] [--no-snapshot] --prompt <brief>
```

`--output-format ndjson` makes Warp emit one JSON object per line, so a long run reports progress
instead of buffering to the end. The workspace is pinned twice: the child process's cwd and Warp's
own `--cwd`.

## Flags

| Flag | Effect |
| --- | --- |
| `--brief <file>` | Path to the brief. Omit to read it from stdin. |
| `--cd <dir>` | Working root (default: current directory). Also passed as Warp's `--cwd`. |
| `--lane <name>` | Resolve dials from a `delegate-setup` fleet lane. Explicit flags win. |
| `--model <id>` | Warp model id from `oz model list`. Letters, digits, and `. _ : / -` only. |
| `--profile <id>` | Warp agent profile. |
| `--name <label>` | Labels the run in Warp's own run list. |
| `--conversation <id>` | Continue an existing Warp conversation. Send a delta brief only. |
| `--skill <spec>` | Warp skill as the base prompt: `name`, `repo:name`, or `org/repo:name`. |
| `--mcp <spec>` | MCP config path or inline JSON. Repeatable. |
| `--no-snapshot` | Forward Warp's `--no-snapshot` so no end-of-run workspace snapshot is uploaded. |
| `--timeout <dur>` | Relay watchdog, h/m/s (default `30m`). Warp has no timeout flag of its own. |
| `--out-dir <dir>` | Artifact directory (default: a fresh dir under the system temp dir). |

Values for `--model`, `--profile`, and `--conversation` are token-validated. `--skill`, `--mcp`, and
`--name` accept freer text but must not start with `-`, which `oz` would read as another flag.

## Artifacts

Written to `--out-dir`:

- `brief.txt` — exactly what was sent.
- `events.jsonl` — the raw ndjson stream, byte for byte. The fallback whenever a parsed field looks
  wrong.
- `final.txt` — the assembled report, when one was captured.
- `stderr.txt` — everything Warp wrote to stderr.
- `result.json` — the structured result, written atomically via a temp file and rename, so a polling
  reader never sees a half-written file.

## `result.json`

Schema id `delegate-relay.result.v1`. Synthetic example:

```json
{
  "schema": "delegate-relay.result.v1",
  "tool": "oz",
  "status": "completed",
  "exitCode": 0,
  "signal": null,
  "ozVersion": "Oz v0.0000.00.00.00.00.stable_01",
  "workdir": "/path/to/repo",
  "model": null,
  "profile": null,
  "snapshotDisabled": false,
  "resumed": false,
  "runId": "00000000-0000-0000-0000-000000000000",
  "runUrl": "https://oz.warp.dev/runs/00000000-0000-0000-0000-000000000000",
  "conversationId": null,
  "finalMessage": "Changed src/export/csv.ts …",
  "touchedFiles": [" M src/export/csv.ts", "?? src/export/csv.test.ts"],
  "startedAt": "2026-01-01T00:00:00.000Z",
  "finishedAt": "2026-01-01T00:04:12.000Z"
}
```

Field notes:

- **`status`** — `completed`, `failed`, `timeout`, `aborted`, or `warp_unavailable`.
- **`touchedFiles`** — `git status --porcelain` lines. `null` when git cannot report (not a
  repository, git missing); `[]` when the tree is genuinely clean. `[]` and `null` mean different
  things — do not collapse them.
- **`runId` / `runUrl`** — from Warp's `run_started` system event. `runUrl` opens the run in Warp.
- **`conversationId`** — the handle to pass back as `--conversation` for rework. Present only when
  Warp emitted it on the stream.
- **`finalMessage`** — Warp's own report. Assembled from the text-bearing events in the stream; see
  the caveat below.
- **`stderrTail`** — last 20 stderr lines, included on every non-clean outcome.

### What `finalMessage` actually contains

Confirmed against a live edit run on oz 0.2026.05.27. The stream carries:

| Event | Meaning |
| --- | --- |
| `{"type":"system","event_type":"run_started","run_id":…,"run_url":…}` | Run registered. |
| `{"type":"system","event_type":"conversation_started","conversation_id":…}` | The `--conversation` handle. Re-emitted on a resumed run carrying the *same* id, so `conversationId` stays stable across a rework chain. |
| `{"type":"agent","text":…}` | Agent output. **This is what `finalMessage` is built from.** |
| `{"type":"agent_reasoning","text":…}` | Private reasoning. Same shape, deliberately **excluded**. |
| `{"type":"tool_call"\|"tool_result"\|"tool_error",…}` | Tool traffic. No `text` field. |

Two consequences:

- **`finalMessage` is the whole narration, not just the closing report.** Warp emits no distinct
  final-message event, so every `agent` chunk is concatenated — including running commentary like
  "Now let me run both gates." This is why the brief must specify a report contract: `FILES:` /
  `GATES:` / `NOTES:` at the end gives you a stable anchor to read instead of parsing prose.
- **`agent_reasoning` must stay excluded.** It carries a `text` field of exactly the same shape, so
  matching on `text` alone splices the model's reasoning into the report.

Past those two rules the extraction stays tolerant — it also accepts `agent_output`, `content`, and
a nested `message.content` — so a renamed output event still reports rather than yielding an empty
`finalMessage`. If one ever does come back empty on a successful run, `events.jsonl` holds the raw
stream and `collectText` is the one place to correct.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Warp exited 0 and reported no stream error. |
| `1` | Generic failure, or a stream-reported agent error even when `oz` exited 0. |
| `2` | Usage error — bad flag, bad `--timeout`, missing or empty brief. **No result file is written.** |
| `124` | The bounded `oz --version` preflight timed out; Warp was never dispatched. |
| `127` | `oz` is not on PATH. A result file **is** written, with `status: "warp_unavailable"`. |
| `128 + n` | The child died on signal *n*; `signal` records which. |

## Polling

The relay blocks until the run ends. Background it and poll for `result.json`:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo \
  --out-dir /tmp/warp-run-1 &
until [ -f /tmp/warp-run-1/result.json ]; do sleep 5; done
```

Completion means the process exited **and** `result.json` exists. Do not infer completion from
stdout going quiet — a long tool call looks identical to a finished run.

## Timeouts and aborts

`oz` has no timeout flag, so the watchdog is the relay's. When `--timeout` expires the relay kills
the whole process group (SIGTERM, then SIGKILL after 10s) and writes `status: "timeout"`.

If the relay itself is killed, it still writes `status: "aborted"`, forwards the kill to `oz`, and
re-snapshots `touchedFiles` after a 2-second grace window so files flushed during shutdown are
recorded. On Windows the process tree is felled with `taskkill /t /f`; Windows delivers no catchable
SIGTERM, so the aborted path cannot be driven there.

**A timed-out or aborted run leaves a partially edited tree.** Inspect `git status` and `git diff`
before re-dispatching. If the state is incoherent, discard it against the recorded baseline rather
than stashing — a bare `git stash` leaves behind every file the run created. See
[review-and-land.md](review-and-land.md#rework-through-a-conversation).

## Failure recovery

| Symptom | What it means | Do |
| --- | --- | --- |
| `warp_unavailable`, exit 127 | `oz` is not on PATH | Install the Warp Agent CLI; check `oz --version`. |
| stderr `subscribe to a Warp plan, or bring your own inference` | Authenticated, but the account has no AI quota. Warp logs it as `QuotaLimit` / "lack of AI quota". `oz` shares the Warp app's account, plan, and credits, so this is a credit condition, not a CLI-only gate | Check `oz whoami` names the account holding the plan - if not, `oz logout && oz login`. Otherwise confirm its AI credits are not spent, or store your own provider key: `warp --set-provider-api-key <openai\|anthropic\|google\|grok>` (or `/api-keys` in the TUI). Bring-your-own-key needs no paid plan. Warp's log is at `~/Library/Logs/oz/warp.log` on macOS. |
| `Device not configured` | The `warp` TUI was launched, not `oz` | Use `oz`; the TUI cannot be relayed. |
| exit 2, no result file | Usage error | Read the relay's stderr line; fix the flag. |
| `status: "timeout"` | The watchdog fired | Raise `--timeout`, or split the brief. |
| Empty `finalMessage`, exit 0 | Text extraction missed the event shape | Read `events.jsonl`; see the caveat above. |
