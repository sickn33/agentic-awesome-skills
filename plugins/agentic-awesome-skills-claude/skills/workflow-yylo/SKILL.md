---
name: workflow-yylo
description: Create and maintain validated YYLO Ledger workflow Records while keeping
  storage, execution, and run evidence as separate explicit boundaries.
category: project-management
risk: safe
source: https://github.com/yylo-dev/yylo-skills
source_repo: yylo-dev/yylo-skills
source_type: community
date_added: '2026-09-19'
license: MIT
license_source: https://github.com/yylo-dev/yylo-skills/blob/main/LICENSE
compatibility: Requires the `yy` CLI with the `workflow` record group installed. Ledger
  stores and validates workflow data; execution needs a separately selected runner
  plus explicit authority.
argument-hint: '[workflow to find/create/update or execution question]'
enable-shell-directives: true
---

# Use YYLO workflow Records

Treat Ledger as the source of truth for workflow identity, validated definition,
and revision history. Use `yy ledger` in a YYLO controller or `yylo-ledger`
standalone. Inspect `COMMAND workflow --help`; if the namespace is absent, do not
invent it or edit Ledger storage directly.

## Keep three boundaries distinct

1. **Ledger stores and validates workflow data.** It does not execute workflows.
2. **A separately selected YYLO runner executes reviewed workflow data.** Storage
   does not grant execution, network, mutation, release, or deployment authority.
3. **Artifact Records retain run evidence.** Do not overwrite the workflow
   definition with stdout, logs, model output, reports, or receipts.

The read-only Ledger host also has no workflow execution endpoint.

## Discover and inspect

```bash
yy ledger workflow search --text "release verification" --projection summary --limit 20 -f json
yy ledger workflow get RECORD_ID -f json
yy ledger workflow get RECORD_ID --raw
yy ledger workflow get RECORD_ID --validated
```

Prefer immutable IDs after discovery. Use bounded projections and explicit archive
scope. `--validated` emits normalized YAML only after schema validation.

## Author safe workflow data

A workflow v1 document requires a mapping with `schema_version: v1`, a non-empty
`workflow_id`, and a `steps` list whose step IDs are non-empty and unique.

```yaml
schema_version: v1
workflow_id: focused-validation
steps:
  - id: test
    command: ["npm", "test"]
```

Create through file/stdin transport:

```bash
yy ledger workflow create --title "Focused validation" --file workflow.yaml
```

Ledger rejects unsafe or non-portable YAML, including duplicate keys, aliases,
anchors, explicit tags, recursive structures, non-string mapping keys, implicit
date/time values, non-finite numbers, CRLF input, and unsupported values. Never
weaken validation by storing executable shell as an unvalidated substitute.

## Revise safely

Read the current revision and history, then follow the installed
`workflow update --help` compare-and-replace contract. Bind updates to the
expected revision and preimage/digests, validate the result, and read it back.
On drift, stop and reconcile instead of forcing. Archive is non-destructive.

Before execution, freeze the exact workflow Record ID, revision, payload digest,
runner identity, inputs, and granted authorities. After execution, store bounded
outputs under `artifact-yylo` with workflow/run provenance. An execution request
never implies merge, release, publication, deployment, or production authority.

## Complete request

$ARGUMENTS

## When to Use

- You need to find, create, or revision-safe update validated YYLO Ledger workflow Records.
- You must keep storage, execution, and run-evidence boundaries explicit.

## Limitations

- Ledger stores and validates workflow data; it never executes workflows and grants no execution, network, mutation, release, or deployment authority.
- Run evidence belongs in `artifact-yylo` records with workflow/run provenance - never overwrite the workflow definition with outputs.
- An execution request never implies merge, release, publication, deployment, or production authority. On revision drift, stop and reconcile instead of forcing.

### Example

```bash
yy ledger workflow search --text "release verification" --projection summary --limit 20 -f json
yy ledger workflow get RECORD_ID --validated
```

> Adapted from [yylo-dev/yylo-skills](https://github.com/yylo-dev/yylo-skills) (MIT) - v2.0.1; frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance.
