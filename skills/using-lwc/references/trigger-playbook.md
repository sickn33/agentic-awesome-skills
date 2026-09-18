# LWC Trigger Playbook

## Use when

Use this document when deciding whether LWC should activate, at session start or
after compaction, and at milestones where verified knowledge may deserve durable
write-back.

## Skip when

Skip LWC for spelling/formatting, a one-line literal edit, a self-contained
translation, or a fact with no project context or future reuse.

## Minimum workflow

Classify before calling tools:

| Trigger | LWC action |
| --- | --- |
| New substantive session | bootstrap once, bounded context, one search |
| Context compaction/resume | restore strong tags and only task-relevant memory |
| Research/debug/design | recall prior evidence/decisions before re-deriving |
| Structural code question | check CodeGraph once; use it if ready |
| Document relationship question | check physical graph once; use it if ready |
| Non-Markdown source | configure one converter only when needed |
| Verified milestone | update an existing page or create one distinct page |
| Contradiction/staleness | inspect cited sources, revise or retract the claim |
| Task end | lint changed scope and run fixed retrieval acceptance |

The Automatic self-use loop is: classify, recall once, inspect current evidence,
solve, capture at milestones, validate, finish. Widen retrieval by one query,
kind, scope, or granularity at a time after a miss.

Hooks are signals, not commands to mutate. At a lifecycle boundary, use the
provided readiness facts to decide whether the current task is substantive enough
to ask for graph authorization. Do not repeat the question in the same project
conversation.

## Consent boundaries

Automatic activation may read bounded authorized memory. It may not initialize a
missing Wiki, enable a graph, build a CodeGraph index, install a converter, or
write memory without the corresponding explicit or durable project authority.
It also may not install the LWC CLI or initialize global memory without explicit
current authorization.

## Completion evidence

- The task was correctly classified as use or skip.
- Bootstrap/recall/readiness checks ran at most once per working root unless state
  materially changed.
- Optional maintenance did not delay the deliverable.
- Any write-back is verified, durable, non-secret, and retrievable.
