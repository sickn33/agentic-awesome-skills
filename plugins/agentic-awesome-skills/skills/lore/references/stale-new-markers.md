# Stale / New marking convention

When `sync` proposes a change, it never silently mutates files. Instead it emits one or more of these markers. The user reads the proposal and accepts/rejects per marker type.

## Marker types

| Marker | Purpose |
|---|---|
| `[NEW]` | Propose adding a new entry |
| `[STALE]` | Propose marking an existing entry as superseded/contradicted |
| `[REFINED]` | Propose updating an existing entry: a tags-only refresh (body unchanged), or a wording/scope refinement that rewrites the body |
| `[ALERT]` | Conflicting signal detected during sync that needs human resolution |
| `[COMPRESS NOTICE]` | Threshold tripped; suggest running `compress` after this sync |

## Full example

```markdown
## [NEW] Proposed additions
- [scopes/frontend/ARCHITECTURE.md] [ARCH-2026-07-09-b4d2] Use `react-hook-form` for all forms. #added:2026-07-09
- [scopes/frontend/CONVENTIONS.md] [CONV-2026-07-09-c5e1] Never use `any` in TypeScript; prefer `unknown` + narrowing. #added:2026-07-09

## [STALE] Candidates for review
- [scopes/frontend/ARCHITECTURE.md] [ARCH-2026-01-15-d7a3] Use Pages Router (Next.js). #stale:2026-07-09 #superseded-by:ARCH-2026-07-09-b4d2
  Evidence: `frontend/package.json` shows `"next": "^14.0.0"` with `app/` directory present.
  Replaced by: `[ARCH-2026-07-09-b4d2] Use App Router (Next.js 14)` (new entry in this proposal).

## [REFINED] Existing entries updated
- [scopes/frontend/DECISIONS.md] [DEC-2026-02-03-7c19] (was: "use Zustand") → body rewritten; old entry gets `#stale:2026-07-09 #superseded-by:DEC-2026-07-09-e3f7` in this same proposal.
- [scopes/frontend/DECISIONS.md] [DEC-2026-07-09-e3f7] "use Zustand v4+ with slices pattern" #added:2026-07-09

## [ALERT] Conflicting signals detected during sync
- Sync proposes `[CONV-2026-07-09-c5e1]` (no `any`), but `[CONV-2026-06-01-f0a1]` already says "use `any` sparingly in test mocks". Resolution: refined entry above clarifies the exception.

## [COMPRESS NOTICE]
- Memory bank has 612 entries; last compression 47 days ago. Consider running `lore compress` after this sync.
```

## User reply semantics

The user can reply with:

- `"accept all"` — apply every `[NEW]`, `[STALE]`, and `[REFINED]` in the proposal
- `"accept only NEW"` — add new entries, leave existing untouched
- `"accept NEW + REFINE"` — add new and refine, do not mark anything stale
- `"drop STALE #d7a3"` — skip one specific stale entry
- `"reject all"` — discard the entire proposal

For partial acceptance, the user should explicitly list which items to apply.

## Marker → file operation mapping

| Marker | File action |
|---|---|
| `[NEW]` | Append a new bullet to the named file, with `#added:<today>` |
| `[STALE]` | Append `#stale:<today>` and (if a replacement exists) `#superseded-by:<replacement-id>` to the existing entry; entry stays in the file. Two cases: (a) the entry was superseded by a `[NEW]` entry in the same proposal — set both tags and carry the new ID forward; (b) the entry is deprecated with no successor — set `#stale:<today>` only; the user can backfill the chain later if a replacement appears. |
| `[REFINED]` | Body unchanged → update tags only (e.g. bump `#verified:<today>`), keep the ID. Body changed → write a new entry with a freshly hashed ID and mark the old entry `#stale:<today>` + `#superseded-by:<new-id>` (the ID is the content hash, so a rewritten body can never keep its old ID) |
| `[ALERT]` | No direct file change; only marks the conflict for user resolution |
| `[COMPRESS NOTICE]` | No file change; advisory only |

Note: `[STALE]` does not delete or move anything. The entry remains in its file with `#stale` (and optionally `#superseded-by`) tags. There is no `archive/` step — git history is the archive, and `#superseded-by` (when present) tells `compress`/`audit`/`history` how to walk the replacement chain.

## When audit uses these markers

`audit` does **not** use these markers. It writes its own severity tags (`[CONFLICT]`, `[STALE]`, `[UNVERIFIED]`) into the audit report file under `.lore/audit/`. The naming overlap (`[STALE]` in sync vs `[STALE]` severity in audit) is intentional — both refer to the same concept (entry no longer accurate) but operate in different files with different downstream actions.
