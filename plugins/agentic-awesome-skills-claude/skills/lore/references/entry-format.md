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

### Updating an entry (REFINED)

Because the ID hashes the body, **any body change produces a new ID**. `sync`'s `[REFINED]` proposal follows this rule: tags-only updates (body unchanged) keep the ID; body rewrites create a new entry with a freshly hashed ID and link the old one via `#superseded-by:<new-id>` (see `references/stale-new-markers.md`).

## Tag specification

| Tag | Meaning |
|---|---|
| `#added:YYYY-MM-DD` | When the entry was created |
| `#verified:YYYY-MM-DD` | Last time a human or audit confirmed the entry is still true |
| `#stale:YYYY-MM-DD` | Flagged by `sync` as no longer accurate. Two cases: (a) the entry was superseded — pair with `#superseded-by:<new-id>`; (b) deprecated with no successor — alone. |
| `#superseded-by:LAYER-YYYY-MM-DD-xxxx` | Points to the entry that replaces this one. When present, it implies staleness; the `#stale:<date>` tag is optional but encouraged for clarity. The `xxxx` is the 4-hex content hash of the replacement. |

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

## Superseded-by chain

When an entry is replaced by another (e.g. a tech-stack swap, a convention reversal), the old entry carries `#superseded-by:<new-id>` alongside `#stale:<date>`. This turns the replacement relationship from prose into data that scripts can walk.

Syntax: `#superseded-by:LAYER-YYYY-MM-DD-xxxx` — the replacement entry's full ID. The replacement entry itself carries no back-reference; its `#verified:DATE` and `#added:DATE` are sufficient.

Worked example — bcrypt replaces SHA-256 in `scopes/backend/DECISIONS.md`:

```markdown
- [DEC-2026-07-10-ee31] SHA-256 + salt for password hashing; reason: no native dep, deterministic. #added:2026-07-10 #stale:2026-07-10 #superseded-by:DEC-2026-07-10-e45d
- [DEC-2026-07-10-e45d] Use bcrypt (rounds=12) for password hashing; reason: industry standard, built-in salt. #added:2026-07-10
```

Consumers:

- `find_stale.py --json` — groups stale entries by their `replaced_by` target; flags chains where the target ID does not exist (broken chain).
- `history.py --follow-superseded <id>` — prints the entry plus every successor along the chain (newest first).
- `compress` — skips entries with `replaced_by` set when selecting the 3–5 entries per (scope, layer).
- `audit` — when reporting CONFLICT between two entries, surfaces the chain if both belong to one.

Constraints:

- The tag is **optional**. Old entries without it continue to work; old skills ignore it.
- **At most one `#superseded-by` tag per entry.** Successive replacements form a chain (A → B → C), never a fork: an entry is replaced by one successor at a time. If an entry carries more than one tag, `list_entries.py` warns and keeps the first.
- Cross-file references: the ID is sufficient because the LAYER prefix plus hash makes collisions across files vanishingly rare. If two files contain the same ID, prefer the one in the same scope as the entry being read.

## What counts as "atomic"

A fact is atomic if it answers exactly one question:

- "What is the frontend framework?" → `ARCH` entry about Next.js
- "Why Next.js not Remix?" → `DEC` entry referencing the `ARCH` entry

If your entry answers two questions, split it.
