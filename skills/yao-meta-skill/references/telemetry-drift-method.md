# Telemetry And Drift Method

Telemetry turns real use into the next iteration queue. It must stay local-first and metadata-only by default.

## When To Use

Use the telemetry drift loop when a skill is production, library, governed, team-distributed, or repeatedly invoked by more than one workflow.

Do not collect raw prompts, model outputs, transcripts, notes, messages, or private files. If a reviewer needs examples, store anonymized fixtures separately and cite them as eval evidence, not telemetry.

## Event Contract

The local event stream is `reports/telemetry_events.jsonl`. It is intentionally narrow:

```json
{
  "event": "skill_activation",
  "skill": "example-skill",
  "version": "2.0.0",
  "source": "yao_cli",
  "command": "quickstart",
  "activation_type": "implicit",
  "outcome": "accepted",
  "failure_type": "none",
  "timestamp": "2026-06-13T10:00:00Z"
}
```

Allowed events: `skill_activation`, `skill_output`, `script_run`, `review_event`.

Allowed sources: `manual`, `yao_cli`, `external`, `unknown`.

Allowed outcomes: `accepted`, `edited`, `rejected`, `missed`, `failed`, `reviewed`, `unknown`.

Allowed failure types: `wrong_trigger`, `under_trigger`, `bad_output`, `missing_resource`, `script_error`, `review_overdue`, `none`.

`source` and `command` are metadata fields. They may identify that `yao.py` ran `quickstart`, `validate`, `output-exec`, or another subcommand, but they must not include arguments, prompt text, file content, model output, transcripts, or reviewer notes.

## CLI Capture

`scripts/yao.py` can record metadata-only `script_run` events automatically. It is opt-in to keep release evidence reproducible and avoid surprising local writes:

```bash
YAO_CLI_TELEMETRY=1 python3 scripts/yao.py validate .
```

Optional destination override:

```bash
YAO_CLI_TELEMETRY=1 \
YAO_CLI_TELEMETRY_EVENTS=/tmp/yao-telemetry.jsonl \
python3 scripts/yao.py output-exec
```

Equivalent global flags are available before the subcommand:

```bash
python3 scripts/yao.py --record-cli-telemetry validate .
python3 scripts/yao.py --no-cli-telemetry validate .
```

Successful CLI runs record `event=script_run`, `source=yao_cli`, `outcome=accepted`, and `failure_type=none`. Failed CLI runs record `outcome=failed` and `failure_type=script_error`. The command name is normalized to the subcommand only; command arguments are never recorded.

## External Client Emit

External clients, browser extensions, editor adapters, or wrapper scripts can emit one sanitized event at a time into a local spool before importing it into the aggregate drift report:

```bash
python3 scripts/yao.py telemetry-emit . \
  --event skill_activation \
  --activation-type explicit \
  --outcome accepted \
  --command browser-extension
```

By default this writes to `.yao/telemetry_spool/external_events.jsonl`. Use `--output-jsonl` when a client needs a different local handoff path:

```bash
python3 scripts/yao.py telemetry-emit . \
  --output-jsonl /tmp/external-client-events.jsonl \
  --event skill_output \
  --activation-type manual \
  --outcome edited \
  --command browser-plugin
```

Use `--dry-run` to validate a proposed event without writing to the spool. The emitter uses the same metadata-only contract as import: no prompt, input, output, transcript, message, note, raw text, arguments, or unknown fields are accepted.

After a client finishes a batch, import the spool:

```bash
python3 scripts/yao.py telemetry-import . --input-jsonl .yao/telemetry_spool/external_events.jsonl
```

## Client Hook Recipes

Use `telemetry-hooks` to generate auditable Browser, Chrome, VS Code, CLI wrapper, and provider-adapter hook recipes:

```bash
python3 scripts/yao.py telemetry-hooks .
```

The report is written to:

- `reports/telemetry_hook_recipes.json`
- `reports/telemetry_hook_recipes.md`

Each recipe includes a dry-run command, an emit command, the target local spool, trigger points, and the privacy contract. The report intentionally sets `native_auto_capture=false`; it proves the local hook contract and metadata-only command shape, not that a host client is already natively integrated.

## Browser Native Host

`scripts/telemetry_native_host.py` implements the local side of Browser/Chrome Native Messaging. It accepts length-prefixed JSON messages on stdio, validates them with the same metadata-only telemetry contract, appends accepted events to the local spool, and rejects raw prompt/output/transcript/message/note fields.

Smoke-test one message without Browser installation:

```bash
python3 scripts/telemetry_native_host.py . \
  --message-json '{"event":"skill_activation","activation_type":"explicit","outcome":"accepted","failure_type":"none","command":"chrome-native-host"}'
```

Generate a local launcher and Chrome native messaging manifest for an operator-installed extension:

```bash
python3 scripts/telemetry_native_host.py . \
  --write-launcher /tmp/yao-telemetry-host.sh \
  --write-manifest /tmp/yao-telemetry-host.json \
  --allowed-origin chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/
```

This is an executable native host bridge and manifest generator. It still does not prove that a specific Browser/Chrome extension is installed or sending events in the user's environment.

## External Client Import

External clients, browser extensions, editor adapters, or wrapper scripts may hand off already-sanitized JSONL through `telemetry-import`:

```bash
python3 scripts/yao.py telemetry-import . \
  --input-jsonl /tmp/external-client-events.jsonl \
  --command browser-extension
```

The importer defaults missing `source` to `external` and missing `command` to `external-client`. It validates the entire JSONL file before writing anything. If any line includes a raw content field, unsupported source, unsupported outcome, unsupported failure type, unknown field, malformed JSON, or an unsafe command name, the whole import is rejected and the existing local event stream is left untouched.

Use `--dry-run` to validate an external batch without writing `reports/telemetry_events.jsonl` or refreshing aggregate reports:

```bash
python3 scripts/yao.py telemetry-import . --input-jsonl /tmp/external-client-events.jsonl --dry-run
```

## Privacy Rule

The raw JSONL event log is local evidence and should not be distributed in skill packages. The distributable artifact is the aggregate report:

- `reports/adoption_drift_report.json`
- `reports/adoption_drift_report.md`

Package builders should exclude `reports/telemetry_events.jsonl`. The root repository also ignores this raw event stream so local usage evidence does not become ordinary source history by accident.

## Release Interpretation

- `no-data`: acceptable for a first scaffold, but a warning for governed release review.
- `low`: events exist and no drift failure signal is present.
- `medium`: at least one missed trigger, wrong trigger, bad output, script error, or overdue review signal exists.
- `high`: several drift signals are present; convert them into eval cases or governance actions before calling the skill release-ready.

## Iteration Loop

1. Capture metadata-only events locally, either manually with `adoption-drift --record-event`, automatically with opt-in `yao.py` CLI capture, through `telemetry-emit` client hooks, through generated `telemetry-hooks` client recipes, or through validated external JSONL import.
2. Render `reports/adoption_drift_report.md`.
3. Convert missed triggers into trigger eval cases.
4. Convert bad outputs into Output Eval assertions and failure taxonomy entries.
5. Convert script errors into non-interactive smoke tests.
6. Feed review-overdue signals back into Skill Atlas and owner review.
7. Let Skill Atlas read only `reports/adoption_drift_report.json` and publish portfolio-level `skill_atlas/drift_signals.json`.

## Review Studio Role

Review Studio should show the aggregate telemetry gate as an operating loop, not as raw logs. A blocker means the telemetry contract was violated. A warning means the evidence is absent or the drift signal needs a follow-up case.

## Skill Atlas Role

Skill Atlas uses aggregate adoption drift reports to rank portfolio work. It should surface no-data warnings for actionable production/library/governed skills, and drift warnings for missed triggers, wrong triggers, bad outputs, missing resources, script errors, and review-overdue counts. It must not inspect raw JSONL telemetry or use non-actionable example/fixture signals as release blockers.
