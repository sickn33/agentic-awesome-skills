---
name: bumblebee
description: "Run Bumblebee supply-chain inventory and exposure scans on macOS/Linux to detect compromised packages, extensions, and MCP host configs."
category: security
risk: safe
source: community
source_repo: mycelos-ai/bumblebee-skill
source_type: community
date_added: "2026-05-27"
author: stefan-kp
tags: [security, supply-chain, incident-response, npm, pypi, tooling]
tools: [claude]
license: "MIT"
license_source: "https://github.com/mycelos-ai/bumblebee-skill/blob/main/LICENSE"
---

# Bumblebee Security Scan

Bumblebee (https://github.com/perplexityai/bumblebee) is a read-only inventory collector that surfaces package, extension, and developer-tool metadata on developer endpoints. It answers a focused supply-chain question: when an advisory names a package or version, do any matches exist on this machine right now?

This skill drives a single Bumblebee scan from start to finish:

1. Verify Go is on the PATH (provide install guidance if not).
2. Verify or install the `bumblebee` binary.
3. Run the requested scan profile (`baseline`, `project`, or `deep`).
4. Save raw NDJSON output plus a Markdown report into the user's workspace.
5. Summarize findings — especially exposure-catalog matches — in the chat reply.

Communicate with the user in the language they used (German for Stefan). Code, commit messages, and on-disk file contents stay in English to match existing project conventions.

## Step 1 — Clarify the scan request

Before running anything, confirm two things with the user via `AskUserQuestion`, unless the message already pins them down:

- **Profile**: `baseline` (global package roots), `project` (specific dev folders like `~/code`), or `deep` (explicit `--root` paths, including `$HOME` for incident response).
- **Roots**: For `project` and `deep` profiles, ask which directories to scan. `deep` is the only profile that accepts a bare-home root.

If the user has an advisory or exposure-catalog file ready, also ask whether they want to pass it via `--exposure-catalog`. The skill does not ship its own catalogs — point them at `threat_intel/` in the Bumblebee repo if they ask where to find ready-made ones.

Skip the questions for one-liner asks like "lauf mal ne Baseline-Scan" — just run a baseline.

## Step 2 — Check Go

Run `command -v go && go version` in bash. Three outcomes:

- **Go ≥ 1.25 present** → continue.
- **Go present but < 1.25** → tell the user the version, explain Bumblebee needs Go 1.25+, and stop until they upgrade.
- **Go missing** → do not install Go automatically. Show platform-appropriate instructions and stop:
  - macOS: `brew install go` (or download from https://go.dev/dl/).
  - Debian/Ubuntu: prefer the official tarball from https://go.dev/dl/ because distro repos lag; `sudo apt install golang-go` only as fallback.
  - Fedora/RHEL: `sudo dnf install golang` or the official tarball.

After installation, the user must ensure `$GOBIN` (or `$HOME/go/bin`) is on `$PATH` so `bumblebee` is found later.

## Step 3 — Check or install Bumblebee

Run `command -v bumblebee && bumblebee version`. If missing:

```bash
go install github.com/perplexityai/bumblebee/cmd/bumblebee@latest
```

Then re-check `bumblebee version`. If the binary still cannot be located, the user's `GOBIN`/`PATH` is likely misconfigured — surface the resolved `go env GOPATH` and `go env GOBIN` so they can fix it. Do not fall back to running the binary by absolute path silently; explain what is happening.

Once installed, also run `bumblebee selftest` as a sanity check. A non-zero exit means the local install is broken and the scan should not proceed.

## Step 4 — Run the scan

All scans write NDJSON to a file. Use the workspace folder for output so the user can open the results afterwards.

Output filenames (use the user's workspace path; the example below assumes `$OUT` is set):

- `bumblebee-<profile>-<UTC-timestamp>.ndjson` — raw records.
- `bumblebee-<profile>-<UTC-timestamp>.report.md` — Markdown report (generated in Step 5).

Pick a sensible `--max-duration` so a runaway scan does not hang the session. Reasonable defaults:

- `baseline`: 5m
- `project`: 10m
- `deep`: 15m (warn the user that scanning `$HOME` can still take longer; offer to raise the limit)

Always stream stderr to a sibling `.log` file — Bumblebee emits diagnostic NDJSON there that helps explain partial scans.

### Baseline

```bash
bumblebee scan --profile baseline \
  --max-duration 5m \
  > "$OUT/bumblebee-baseline-$TS.ndjson" \
  2> "$OUT/bumblebee-baseline-$TS.log"
```

Optional: scope to specific ecosystems if the user only cares about, say, npm and PyPI:

```bash
bumblebee scan --profile baseline --ecosystem npm,pypi ...
```

### Project

Each `--root` must be an existing absolute path. Reject bare `$HOME` for this profile (Bumblebee will reject it too — surface the message clearly).

```bash
bumblebee scan --profile project \
  --root "$HOME/code" \
  --root "$HOME/Developer" \
  --max-duration 10m \
  > "$OUT/bumblebee-project-$TS.ndjson" \
  2> "$OUT/bumblebee-project-$TS.log"
```

### Deep

Used for incident response — broad roots are allowed but should be paired with an exposure catalog and `--findings-only` whenever possible, so the output stays focused.

```bash
bumblebee scan --profile deep \
  --root "$HOME" \
  --exposure-catalog "$CATALOG" \
  --findings-only \
  --max-duration 15m \
  > "$OUT/bumblebee-deep-$TS.ndjson" \
  2> "$OUT/bumblebee-deep-$TS.log"
```

If the user has no catalog, run deep without `--findings-only` but warn them that the NDJSON file can grow large (hundreds of MB on dense developer machines).

## Step 5 — Generate the Markdown report

Run the bundled helper to turn the NDJSON into a human-readable report:

```bash
python3 scripts/render_report.py \
  "$OUT/bumblebee-<profile>-$TS.ndjson" \
  "$OUT/bumblebee-<profile>-$TS.report.md"
```

The helper groups records by type and ecosystem, lists every `finding` record with its catalog entry and severity, and embeds the `scan_summary` for traceability. It is dependency-free Python 3 — no `pip install` needed.

If `render_report.py` exits non-zero (malformed NDJSON, missing summary), surface stderr to the user instead of silently producing an empty report.

## Step 6 — Present results

End the turn with:

- A short summary in chat: profile, root(s), record counts, and — most importantly — any findings with their severity. If there are zero findings, say so explicitly; silence on findings is the kind of thing that gets misread.
- `computer://` links to both the NDJSON and the Markdown report so the user can open them directly.
- If diagnostics in the `.log` file indicate skipped roots or read errors, mention it and link the log too.

Do not paste large chunks of NDJSON into the chat — it is noisy and not where the user will read it.

## Safety and privacy notes

- Bumblebee is read-only by design. Do not propose patches, deletions, or `npm uninstall` actions from inside this skill; the user runs remediation themselves once they know what is affected.
- MCP host configs can carry secrets in their `env` blocks. Bumblebee does not emit those values, but the `.log` file may still contain paths to sensitive config files. Treat the output files as containing inventory data and do not upload them to third-party services without the user's explicit consent (DSGVO-relevant).
- Never run `bumblebee` with elevated privileges (`sudo`). It is meant to inspect the current user's developer environment, not the whole system.

## Failure modes to watch for

- `bumblebee: command not found` after `go install` → almost always a `PATH`/`GOBIN` problem. Show `go env GOPATH GOBIN PATH` to debug.
- `refusing to scan bare home with profile baseline` → use `deep` for `$HOME`, or pick a subdirectory for `project`.
- Scan times out → either narrow the `--root` set, scope with `--ecosystem`, or raise `--max-duration`. Do not loop and retry blindly.
- Exposure catalog rejected → check that the JSON has both `schema_version` and `entries` keys (bare top-level arrays are rejected) and that `schema_version` is one Bumblebee understands.

## Reference

See `scripts/render_report.py` for the report layout. Bumblebee's own documentation lives at https://github.com/perplexityai/bumblebee — consult `docs/inventory-sources.md`, `docs/transport.md`, and `docs/state-model.md` when a question goes beyond what this skill covers.

## Credit

Bumblebee is developed by Perplexity (https://github.com/perplexityai/bumblebee, Apache-2.0). All scan logic, output formats, and exposure-catalog semantics belong to that project. This repository is just a thin Claude-skill wrapper around the official `bumblebee` CLI; the wrapper itself is MIT-licensed (see `LICENSE`).
