# Entry format reference

Detailed specification for `.lore/` entries. The main `SKILL.md` covers entry structure briefly; this file is the full spec.

## Bullet structure

Each entry is a Markdown bullet (≤ 2 lines), containing:

- **Layer prefix**: `ARCH`, `DEC`, or `CONV`
- **ID**: `LAYER-YYYY-MM-DD-xxxx` where `xxxx` is a 4-char content hash
- **Inline status tags** (at the end of the entry)

```markdown
- [ARCH-2026-07-09-a3f2] Use Next.js App Router; reason: streaming + RSC. #added:2026-07-09
- [DEC-2026-02-03-7c19] Chose Zustand over Redux; reason: 60% less boilerplate. Alternatives: Redux Toolkit, Jotai. #added:2026-02-03
- [CONV-2026-01-20-b1e8] Never commit secrets; use `dotenv` + `.env.local` (gitignored). #added:2026-01-20
- [ARCH-2026-03-10-a1b2] Use TanStack Query for all server state. #added:2026-03-10 #verified:2026-06-15
```

## ID generation

The 4-char `xxxx` is the first 4 hex chars of `sha256(entry text)`. This makes IDs:

- **Deterministic**: rewriting the same fact produces the same ID
- **Conflict-free** under concurrent writes by multiple agents
- **Reverse-lookup-able** by audit tools

If two entries have identical content (hash collision, statistically rare), add a distinguishing word to one and recompute.

## Tag specification

| Tag | Meaning |
|---|---|
| `#added:YYYY-MM-DD` | When the entry was created |
| `#verified:YYYY-MM-DD` | Last time a human or audit confirmed the entry is still true |
| `#stale:YYYY-MM-DD` | Flagged by `sync` as superseded or contradicted; user decides keep/archive |
| `#archived:YYYY-MM-DD` | Moved to `archive/` |

Multiple tags can co-exist on one entry (e.g. `#added:2026-01-15 #verified:2026-06-01`).

## Cross-file references

When `SUMMARY.md` or another file references an entry, qualify it with the file path to avoid ID collisions across scopes:

```
[scopes/frontend/DECISIONS.md#DEC-2026-02-03-7c19]
[_global/CONVENTIONS.md#CONV-2026-01-20-b1e8]
```

The path is relative to `.lore/`.

## Splitting vs. single entries

If a fact can't fit in ≤ 2 lines, split into multiple entries and cross-reference them by ID:

```markdown
- [ARCH-2026-07-09-a3f2] Use Next.js App Router. #added:2026-07-09
- [DEC-2026-07-09-b1e8] Reason: streaming + RSC, see [ARCH-2026-07-09-a3f2]. #added:2026-07-09
```

Instead of stuffing them into a single overly long bullet.

## What counts as "atomic"

A fact is atomic if it answers exactly one question:

- "What is the frontend framework?" → `ARCH` entry about Next.js
- "Why Next.js not Remix?" → `DEC` entry referencing the `ARCH` entry

If your entry answers two questions, split it.