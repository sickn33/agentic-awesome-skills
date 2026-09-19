---
name: wiki-yylo
description: Use YYLO Ledger wiki Records as durable project knowledge. Search before
  creating, classify information correctly, and make revision-safe Markdown updates
  without editing Ledger storage directly.
category: project-management
risk: safe
source: https://github.com/yylo-dev/yylo-skills
source_repo: yylo-dev/yylo-skills
source_type: community
date_added: '2026-09-19'
license: MIT
license_source: https://github.com/yylo-dev/yylo-skills/blob/main/LICENSE
compatibility: Requires the `yy` CLI with the `wiki` record group installed (controller
  or standalone). Revision-safe Markdown updates only; never edit Ledger storage directly.
argument-hint: '[wiki question or knowledge to find/create/update]'
enable-shell-directives: true
---

# Use YYLO wiki Records

Treat Ledger as the source of truth. Use `yy ledger` in a YYLO controller and
`yylo-ledger` in a standalone Ledger project. Inspect `COMMAND wiki --help` before
acting; if `wiki` is absent, the installed Ledger version does not expose native
Record commands and must not be bypassed with direct file edits.

## Choose the right record

Before writing, decide where the information belongs:

- **Wiki**: durable explanatory project or domain knowledge that future work must discover.
- **Task**: scoped requested work, status, dependencies, acceptance criteria, and completion evidence.
- **Workflow**: validated structured steps, not prose guidance.
- **Artifact**: generated evidence, reports, receipts, logs, model output, or binary payloads.
- **Source documentation**: documentation released and versioned with product code.

Do not put secrets, caches, session transcripts, temporary status, bulky generated
evidence, or owner-only operational receipts in a wiki.

## Discover before creating

Use bounded summary searches first. Resolve records by immutable ID whenever one
is known; slugs and aliases are discovery conveniences, not replacement identity.

```bash
yy ledger wiki search --text "deployment policy" --projection summary --limit 20 -f json
yy ledger wiki get RECORD_ID -f json
yy ledger wiki get RECORD_ID --raw
```

Use `--scope archive|all` only when the request requires cold records. Request
`full` projection only when payload bytes are necessary.

## Create durable Markdown

Use a file or stdin for substantial or shell-sensitive content:

```bash
yy ledger wiki create --title "Service ownership" --file ownership.md
yy ledger wiki create --title "Incident notes" --file - < incident-notes.md
```

Choose a stable title, namespace, slug, aliases, and relations deliberately. Keep
one topic per Record and link related immutable Record IDs rather than duplicating
truth.

## Update safely

1. Read the current Record and revision.
2. Preserve its immutable ID and inspect history when intent is unclear.
3. Follow `wiki update --help` for the installed compare-and-replace controls.
4. Supply the expected revision and required preimage/digest evidence.
5. Use file transport; do not rewrite Ledger files yourself.
6. Read back the resulting revision and receipt.

A revision or preimage mismatch means the source changed: reread and reconcile.
Never force past concurrent edits. Archive is a lifecycle transition, not delete.

Use `--front-matter` only for canonical front-matter interchange and `--rendered`
for inert, HTML-escaped rendering. Use `history RECORD_ID` to understand revisions;
do not infer history from the latest payload alone.

## Project wiki boundary

Portable controller guidance may live under the controller wiki, while project
and domain pages retain project-owned paths. Package-managed and project-owned
pages can coexist. Migration, runtime replacement, exceptional merge recovery,
release, deployment, and cold-archive maintenance remain authoritative runbooks,
not content to summarize into an everyday global skill.

## Complete request

$ARGUMENTS

## When to Use

- You need durable project or domain knowledge as YYLO Ledger wiki Records (search, create, revision-safe update).
- You must first decide the record belongs in the wiki rather than a task, workflow, artifact, or product docs.

## Limitations

- Search before creating; one topic per Record, linked by immutable Record IDs.
- Never store secrets, caches, session transcripts, temporary status, bulky generated evidence, or owner-only receipts in a wiki.
- Updates bind to the expected revision/preimage; on mismatch reread and reconcile - never force past concurrent edits. Archive is a lifecycle transition, not deletion.
- If the `wiki` group is absent, fail closed and request a Ledger upgrade.

### Example

```bash
yy ledger wiki search --text "deployment policy" --projection summary --limit 20 -f json
yy ledger wiki get RECORD_ID -f json
```

> Adapted from [yylo-dev/yylo-skills](https://github.com/yylo-dev/yylo-skills) (MIT) - v2.0.1; frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance.
