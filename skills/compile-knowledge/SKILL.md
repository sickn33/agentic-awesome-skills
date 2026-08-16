---
name: compile-knowledge
description: "Compile durable, non-obvious findings into an interlinked markdown knowledge store — atomic files, [[wiki-links]], a maintained index — so an agent gets smarter across sessions instead of relearning the same facts."
category: productivity
risk: safe
source: https://github.com/5dive-ai/skills/tree/main/compile-knowledge
source_repo: 5dive-ai/skills
source_type: community
date_added: "2026-08-16"
author: 5dive-ai
tags: [knowledge-management, memory, documentation, wiki, notes]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/5dive-ai/skills/blob/main/LICENSE"
---

# Compile Knowledge

## Overview

Durable knowledge is worth keeping as many small, interlinked markdown files compiled over
time and surfaced through an index — not as one giant doc, a chat log, or a one-off
`notes.md` that rots. This skill makes compiling consistent, so what an agent learns in one
session is retrievable in the next one instead of being re-derived from scratch.

The shape is deliberately boring: one fact per file, a one-line `description` that recall
matches against, `[[slug]]` links between related files, and a single index line per entry.
The hard part is not the format — it is the discipline of writing only what is durable, and
of updating an existing file instead of creating a near-duplicate.

## When to Use This Skill

- Use when you have just produced research, competitive intel, a digest, or an
  investigation result, and are about to close the task — compile before you close.
- Use when you learn a non-obvious fact the hard way (a tool that fails silently, a
  measurement that contradicts the docs, a constraint nobody wrote down).
- Use when the user says "save this", "write this to the wiki", "update the memory",
  "log this finding", "structure this knowledge", or "follow the karpathy method".
- Do **not** use it for routine work. A deploy, a restart, or a one-line fix usually
  produces nothing durable, and filler pollutes recall.

## How It Works

### Step 1: Pick the store

- **Agent memory** — the per-agent folder your harness already loads (`memory/` with an
  index file such as `MEMORY.md`). This is the default and, for a solo agent, usually the
  only store you need.
- **Shared wiki** — a `wiki/` folder with `wiki/index.md`, for knowledge the whole team
  would otherwise re-derive. Skip it entirely if you work alone; do not manufacture team
  ceremony.

Rule of thumb: "only I act on this" goes to memory, "anyone on my team might need this"
goes to the wiki. Cross-link the two with `[[slug]]` rather than copying the fact into both.

### Step 2: Pass the hygiene gate

Compile only a fact that is **durable** and **non-obvious**. Skip it if it is derivable from
the repository, the git history, or the existing docs; if it is true only for this one
conversation; or if an existing file already covers it — in that last case update that file.

### Step 3: Search before you write

Grep the store and skim the index for the topic. A near-duplicate is worse than no entry,
because recall then has two answers and no way to choose between them.

### Step 4: Write one atomic file

One fact per file. Two unrelated facts are two files. Name it as a kebab-case slug — the
slug is the link target, so it has to be guessable by the next reader. Frontmatter carries
`name` (equal to the slug), a one-line `description` specific enough to be matched during
recall, and a type or category. In the body, state the fact plainly and link related
entries with `[[slug]]` liberally; a link to a file that does not exist yet is a fine TODO
marker, not an error.

### Step 5: Add exactly one index line

Use one line in the form `- Title → slug.md — hook`, under ~200 characters. Detail lives in
the file; an index line that restates the file defeats the point of having an index. Create
the index if it is missing, or the store is undiscoverable.

### Step 6: Age the fact instead of letting it rot

Facts expire. When one is time-sensitive or replaces an older one, say so in the
frontmatter so recall can demote it rather than serving stale truth:

- `valid_to: YYYY-MM-DD` — the date the fact needs a recheck.
- `supersedes: <slug>` — the older fact this replaces. Prefer this over editing in place
  when the old value is still worth seeing; edit in place when it is not.
- `confidence: high|medium|low` — so a hunch never outranks a measurement.
- `provenance: "<source>"` — where the fact came from, distinct from who wrote the note.

All four are optional and portable; omitting them changes nothing.

## Examples

### Example 1: A measured, non-obvious fact goes to memory

```markdown
---
name: reference_search_api_counts_prs_as_issues
description: "GitHub's /search/issues endpoint counts pull requests in total_count, so a zero there proves neither issues nor PRs exist — but a non-zero one does not tell you which."
confidence: high
provenance: "measured 2026-08-16 while dupe-checking four upstream repos"
---

`total_count` from `/search/issues?q=<term>+repo:<owner>/<name>` is the sum of issues and
pull requests. For a "has anyone submitted this yet?" check that is exactly what you want,
and the zero is a real absence. To separate the two, add `type:pr` or `type:issue`.

Related: [[reference_gh_api_ref_serves_default_branch]].
```

Then one line in the index:

```markdown
- Search API counts PRs as issues → reference_search_api_counts_prs_as_issues.md — a zero is a real absence, a non-zero is ambiguous
```

### Example 2: Nothing durable came out of the task

```
Task: bump the service's log level to debug and restart it.

Compile? No. It is derivable from the config file and the deploy history, and it is true
only for today. Close the task without writing anything.
```

## Best Practices

- ✅ Search the store before writing; update the existing file when one exists.
- ✅ Keep one fact per file and one line per file in the index.
- ✅ Write the `description` for the person searching later, in their vocabulary, not yours.
- ✅ Convert relative dates ("yesterday", "last release") to absolute ones at write time.
- ✅ Delete entries that turn out to be wrong — a wrong memory is worse than a missing one.
- ❌ Don't compile something the repository, its history, or its docs already say.
- ❌ Don't leave research as a standalone `notes.md` and call it compiled.
- ❌ Don't duplicate the same fact into both memory and the wiki; pick one home, cross-link.
- ❌ Don't write filler to satisfy a checklist.

## Limitations

- This skill organizes knowledge; it does not verify it. A confidently written wrong fact
  becomes a confidently retrieved wrong fact, so record how you measured something, not
  only what you concluded.
- Retrieval quality is bounded by the `description` line. A vague description makes a good
  entry unfindable.
- It does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if the store's location or its index file is ambiguous.

## Security & Safety Notes

- This skill writes, edits, and occasionally deletes markdown files. Confine every one of
  those operations to the knowledge store directory (the agent's `memory/` folder or the
  project's `wiki/`), and never to source files, configuration, or anything outside it.
- Deleting a superseded entry is destructive and unreviewable after the fact. Prefer
  `supersedes:` when the old value still has audit value, and confirm before removing a
  file you did not write.
- Never compile a secret, credential, token, or personal identifier into a knowledge store.
  These files are long-lived, frequently synced, and often shared across a team — treat
  them as if they were public. Record the shape of a credential, never its value.
- The skill runs no shell commands and makes no network fetches of its own.

## Common Pitfalls

- **Problem:** The index grows into a second copy of the store.
  **Solution:** Cap each entry at one line and let the file carry the detail; when the
  index gets long, tighten the hooks rather than adding more of them.
- **Problem:** Two files describe the same fact slightly differently, so recall returns
  both and the reader trusts neither.
  **Solution:** Merge them into the older slug and leave the newer one deleted; the search
  in Step 3 exists to prevent this.
- **Problem:** A fact was true when written and is quietly false now.
  **Solution:** Stamp `valid_to:` on anything time-sensitive at write time, and verify a
  recalled fact that names a file, flag, or endpoint before acting on it.
- **Problem:** Nothing ever gets compiled because it always feels like the wrong moment.
  **Solution:** Bind it to a boundary you already hit — compile before closing a task, not
  as a separate chore you schedule later.

## Related Skills

- `@writing-skills` - When you want to package a repeatable procedure as a skill rather
  than record a fact.
- `@deep-research` - Produces the findings; this skill is what keeps them after the
  session ends.
