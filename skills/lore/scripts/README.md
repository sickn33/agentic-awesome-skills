# lore scripts

Cross-platform Python 3.6+ helpers that reduce repetitive mechanical work. No third-party dependencies. Called by `init` / `sync` / `audit` / `compress` / `lore mirror`; can also be run standalone for ad-hoc inspection.

The script list and quick-reference command examples live in the project root `README.md` "Scripts" section. This file covers the things that don't fit there: design intent, integration points, and limits.

## Design notes

**Cross-platform first.** Python standard library only. No `bash`, no `jq`, no platform-specific tools. The same invocation works on Windows, Linux, macOS.

**JSON-friendly output.** Every script supports `--json` for machine consumption. Agent callers parse the output; humans pipe to `less` or `jq` (if available).

**Composition.** `find_duplicates.py` and `find_stale.py` shell out to `list_entries.py --json` rather than re-implementing the parser. One source of truth for entry format — if the format ever changes, only `list_entries.py` needs updating.

**Read-only by default.** None of these scripts write to `.lore/`. They observe; the agent decides what to do with findings.

**Run from project root.** `list_entries.py` walks up the directory tree looking for `.lore/`. The other scripts depend on it via subprocess, so the same constraint applies transitively.

## When each script is called

| Script | Call site | Purpose |
|---|---|---|
| `history.py` | lore history | List git commits related to a memory entry / file / scope |
| `id_hash.py` | Any time a new entry is written (init / sync) | Compute the 4-char content hash for the entry ID |
| `list_entries.py` | Pre-step of query / audit / compress | Enumerate all entries as JSON for downstream processing |
| `find_duplicates.py` | sync step 5 (de-duplication) | Identify candidate duplicate entries before writing |
| `find_stale.py` | audit step 2; compress step 2; lore mirror (optional) | Identify entries past the verified-date threshold or already marked `#stale` |

## Output channels

**stdout is the data channel; stderr is the warning channel.** All scripts follow this split so `--json` consumers never have to filter noise out of their parsers. Currently `list_entries.py` is the only script that emits a warning:

- `[WARN] .lore/.config.json has no schema_version field.` — fires once per invocation when the config file exists but lacks the version field. Add `"schema_version": 1` to silence it.
- `[WARN] .lore/.config.json#schema_version=N is newer than this lore skill expects (max: 1).` — fires when the config version exceeds what this skill understands. Pull the latest lore from upstream.

Both warnings are informational; `list_entries.py` always produces the same stdout regardless of config state. See `references/compatibility.md` for the full schema versioning policy.

## Testing

Without a real `.lore/`, you can sanity-check that imports and argument parsing work:

```bash
python scripts/id_hash.py "test entry"
python scripts/list_entries.py   # should print "(no entries)" or exit with a clear error
```

`list_entries.py`, `find_duplicates.py`, and `find_stale.py` require a populated `.lore/` to produce meaningful output. Set one up via `lore init` first.

## Limitations

- **Token-overlap dedup, not semantic.** Jaccard similarity catches rewrites with similar words but misses semantic equivalence (e.g. "use TypeScript" vs "TypeScript-only codebase"). Deeper checks still need an LLM pass.
- **Naive date math.** `find_stale.py` uses wall-clock dates from `#verified` / `#added` tags. If the system's clock is wrong, results will be off.
- **No automatic archive promotion.** The script reports pending-archive entries but does not move them. Use `lore sync` to actually relocate to `.lore/archive/`.
- **Hash collisions on identical text are theoretically possible** (4 hex chars = 16 bits = 1 in 65536). In practice a lore project will not hit this. If it does, slightly edit the entry text to bump the hash.