---
name: maintain-codex-wiki
description: "Maintain a review-first engineering wiki with provenance, citation-aware queries, explicit capture and promotion, and deterministic checks."
category: knowledge-management
risk: safe
source: https://github.com/Phelan164/codex-howto/tree/fc8a41757714cc2846c79bdabf2dbeb4d5c7fae0/skills/maintain-codex-wiki
source_repo: Phelan164/codex-howto
source_type: community
date_added: "2026-07-31"
author: Phelan164
tags: [codex, wiki, knowledge-management, provenance, engineering]
tools: [codex]
license: MIT
license_source: https://github.com/Phelan164/codex-howto/blob/fc8a41757714cc2846c79bdabf2dbeb4d5c7fae0/LICENSE
---

# Maintain Codex Wiki

## Overview

Maintain a repository-local Markdown wiki as compiled engineering knowledge,
not as an automatic source of truth. Preserve provenance, separate evidence
classes, and require review before wiki conclusions become repository rules,
skills, or learning material.

## When to Use

- Query what a repository already knows about a technical decision or practice.
- Capture a durable lesson from a merged change, incident, review, or experiment.
- Ingest external research without silently treating it as authoritative.
- Reconcile conflicting or superseded guidance.
- Check wiki structure, citations, freshness, and index coverage.
- Promote verified knowledge into a rule, skill, module, or automated check.

Do not invoke this workflow merely because a task produced code or chat output.
No material wiki change is a valid result.

## Knowledge Contract

Use a `knowledge/` directory with these minimum surfaces:

```text
knowledge/
├── index.md
├── log.md
├── sources.json
├── decisions/
├── experiments/
└── topics/
```

Each wiki page starts with one allowed status: `verified`, `community`,
`experimental`, or `decision`.

```markdown
# Article title

> Status: <verified|community|experimental|decision>
> Last verified: YYYY-MM-DD
> Sources: `source-id`, `another-source-id`
```

Choose the status from the evidence and operation. Capture and Archive pages
default to `experimental`; never label them `verified` automatically.
Use `Last verified` only for `verified` pages. For `community`, `experimental`,
and `decision` pages, replace it with `Last updated: YYYY-MM-DD`.

Use four source classes:

- `official`: current first-party documentation.
- `repository`: versioned evidence already present in the repository.
- `community`: an external implementation, article, or discussion.
- `experiment`: reproducible evaluation with setup and limitations.

Official sources establish current product behavior. Community sources are
patterns to test, not product specifications.

## Choose One Operation

### Query

1. Read `knowledge/index.md`.
2. Search `knowledge/` for the subject and its common synonyms.
3. Before reading any wiki page, index, registry, log, or registered repository
   `path`, require a normalized repository-relative path, reject absolute paths
   and `..` components, resolve symlinks, require a regular file, and verify
   the target remains inside the repository root.
4. Read only the relevant pages and registered sources.
5. Distinguish verified guidance, community practice, experimental results,
   and unresolved claims.
6. Answer with links to wiki pages and state when the wiki has no evidence.

Query is read-only by default. Do not use model memory to silently fill gaps.

### Capture

1. Require an explicit request to preserve the lesson.
2. Identify durable repository or experiment evidence.
3. Reject chat prose, unmerged proposals, and model output as standalone proof.
4. Search the full wiki before creating another page.
5. Register or reuse the evidence source, pinning a revision when available.
6. Update the smallest existing page, or create an `experimental` page.
7. Update the index and log, then run structural checks.

Leave promotion for a separate decision.

### Ingest

1. Require an explicit request to ingest before changing the registry, pages,
   index, or log. A general research request remains read-only.
2. Reuse a source ID when it identifies the same material.
3. Record external metadata rather than committing full external content.
4. Classify the source and pin a release, commit, or document revision when
   evidence supports it.
5. Update every materially affected page.
6. Preserve disagreements instead of rewriting disputed claims as consensus.
7. Update the index and append a concise event to the log.
8. Run deterministic checks and review the diff.
9. Report unverified claims and prepare a pull request; never push directly to
   a protected branch.

Compile sources sequentially because the registry, index, and log are shared
state. Parallel research is safe only when workers do not edit shared files.

### Archive

Archive a query synthesis only when explicitly requested:

1. Preserve every source ID used by the answer.
2. Create a compact `experimental` page.
3. Link related pages instead of copying their prose.
4. Update the index and log, then run checks.

Archive is not promotion.

### Lint

Check mechanically:

- source registry schema, IDs, dates, HTTPS URLs, and local paths;
- source revisions, supersession references, and supersession cycles;
- affected-page declarations and reciprocal source citations;
- page status, status-appropriate verification or update date, and registered
  source references;
- duplicate page titles;
- index coverage; and
- local links inside `knowledge/`.

Then review what automation cannot prove:

- whether claims are supported by their cited sources;
- whether newer official guidance supersedes a page;
- whether sources materially disagree;
- whether a conclusion deserves promotion; and
- whether a page duplicates published guidance.

Treat lint as read-only unless the user explicitly authorizes fixes. With that
authorization, auto-fix only mechanical errors. Otherwise report the proposed
edits. Always propose factual changes for review.

### Promote

Promote only when explicitly requested and the evidence fits the destination:

| Evidence outcome | Destination |
|---|---|
| Durable repository requirement | `AGENTS.md` |
| Reusable procedure with a measured gap | focused skill |
| Stable learning content | module or resource |
| Mechanically enforceable invariant | script, CI check, or hook |
| Early or unresolved evidence | remain in `knowledge/` |

Keep the wiki page as a compact evidence map rather than duplicating the
published prose.

## Source Registry Example

```json
{
  "schema_version": 1,
  "sources": [
    {
      "id": "stable-source-id",
      "title": "Human-readable title",
      "kind": "official",
      "url": "https://example.com/source",
      "last_verified": "YYYY-MM-DD",
      "revision": "release, commit, or document revision",
      "affected_pages": ["knowledge/topics/example.md"]
    }
  ]
}
```

Use `path` instead of `url` for repository evidence and define exactly one.
Accept only normalized repository-relative paths: reject absolute paths and
`..` components, resolve symlinks, and verify the resolved target stays inside
the repository root before reading. Source IDs are permanent. Optional
`supersedes` values point to older registered source IDs.

## Safety and Provenance

- Never archive credentials, private conversations, or personal data.
- Do not redistribute full external sources without license permission.
- Cite every load-bearing product, measurement, or historical claim.
- Mark inference as inference and keep conflicting evidence visible.
- Require human review for generated factual changes.
- Scheduled maintenance may report drift or prepare a draft pull request, but
  must not merge or push to protected branches.

## Completion

Report:

- operation performed;
- pages and source records changed;
- checks run and their results;
- conflicts or freshness uncertainty;
- promotion performed or deferred; and
- review or approval still required.

## Limitations

- Structural lint cannot prove that a citation supports a claim.
- Source freshness requires periodic human verification.
- This skill does not replace repository-specific security, privacy, or review
  requirements.
- A repository must create its own deterministic checker if it needs automated
  enforcement beyond the contract above.
