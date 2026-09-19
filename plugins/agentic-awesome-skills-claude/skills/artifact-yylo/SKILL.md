---
name: artifact-yylo
description: Capture and retrieve durable YYLO Ledger artifact Records with intentional
  profiles, payload modes, provenance, retention, and secret-safe immutable evidence.
category: project-management
risk: safe
source: https://github.com/yylo-dev/yylo-skills
source_repo: yylo-dev/yylo-skills
source_type: community
date_added: '2026-09-19'
license: MIT
license_source: https://github.com/yylo-dev/yylo-skills/blob/main/LICENSE
compatibility: Requires the `yy` CLI with the `artifact` record group installed. Captures
  immutable, secret-safe evidence with provenance and retention; never publishes or
  deploys.
argument-hint: '[artifact or evidence to capture/find/inspect]'
enable-shell-directives: true
---

# Use YYLO artifact Records

Treat Ledger as the source of truth for artifact identity and metadata. Use
`yy ledger` in a YYLO controller or `yylo-ledger` standalone. Inspect
`COMMAND artifact --help`; if unavailable, do not create store files manually.
A Ledger Artifact Record is durable evidence, not an npm/Python release artifact
and not an implicit request to publish or deploy.

## Classify before capture

Choose the profile matching the evidence:

- `stdout`: bounded process output;
- `model-output`: an agent/model response;
- `report`: a generated human- or machine-readable result;
- `receipt`: evidence binding an operation and its inputs/outcome.

Choose payload mode deliberately:

- `inline`: small immutable bytes embedded in the Record;
- `local`: immutable content-addressed bytes in Ledger storage;
- `external`: immutable external bytes with URI, digest, and size;
- `link`: URI reference without an immutable-byte guarantee.

Prefer immutable evidence when later verification depends on exact bytes. A link
must never be presented as content-addressed proof.

## Create explicitly

Use file/stdin transport and provide the media type:

```bash
yy ledger artifact create --title "Focused test report" --profile report \
  --mode local --media-type application/json --file report.json
```

For external immutable content, provide the supported URI, SHA-256 digest, and
size shown by installed help. Never embed URI credentials. Ledger rejects unsafe
schemes, traversal, size/digest mismatches, oversized capture, and known secret
patterns.

Attach only supported, non-secret provenance such as actor, agent, model,
session, run, invocation, task, or workflow identity. Task/workflow provenance
uses immutable Record IDs. Select `temporary`, `standard`, or `permanent`
retention deliberately; retention metadata does not itself authorize deletion.

## Operational-document boundary

Store new PDRs, architecture and migration contracts, plans, reports, receipts,
and execution evidence as Artifact Records. Draft through a fresh external file,
capture it with an intentional profile and immutable payload mode, read it back,
and verify its ID, digest, size, provenance, retention, and history before
removing the draft. Use the `report` profile for human-readable PDRs/contracts
unless installed help provides a more specific approved profile.

Product `docs/` is only for documentation shipped as part of the product. Never
put operational evidence there to manufacture a task product diff. Preserve
legacy `.juno_task/specs` files, but do not create new ones as a fallback. If the
installed artifact API is unavailable, stop with the external draft intact and
request a Ledger upgrade; do not put it in task bodies, responses, product docs,
or manually managed controller paths.

## Find and verify

```bash
yy ledger artifact search --profile report --projection summary --limit 20 -f json
yy ledger artifact get RECORD_ID -f json
yy ledger artifact history RECORD_ID -f ndjson
```

Use bounded metadata/summary projections before requesting payload details.
Verify profile, mode, media type, digest, size, provenance, retention, revision,
and immutable ID before relying on evidence.

Artifact payloads are immutable evidence. Represent replacement with explicit
predecessor/successor relationships and the installed revision-safe update
contract; do not overwrite bytes or edit content objects. Archive is a lifecycle
transition, not deletion. Release, publication, external upload, retention
execution, and production mutation always require separate authority.

## Complete request

$ARGUMENTS

## When to Use

- You need to capture or retrieve durable YYLO Ledger artifact Records (stdout, model-output, report, receipt) with provenance, retention, and immutable payloads.
- New operational PDRs, contracts, plans, reports, and receipts belong here - not in product docs, task bodies, or new `.juno_task/specs` files.

## Limitations

- Payloads are immutable: represent replacement with predecessor/successor relations, never by overwriting bytes. Archive is a lifecycle transition, not deletion.
- Secret-safe only: never embed URI credentials; Ledger rejects unsafe schemes, traversal, size/digest mismatches, and known secret patterns.
- Retention metadata never authorizes deletion; release, publication, upload, and production mutation always need separate authority.

### Example

```bash
yy ledger artifact search --profile report --projection summary --limit 20 -f json
yy ledger artifact get RECORD_ID -f json
```

> Adapted from [yylo-dev/yylo-skills](https://github.com/yylo-dev/yylo-skills) (MIT) - v2.0.1; frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance.
