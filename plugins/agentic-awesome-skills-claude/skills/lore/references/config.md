# Configuration reference

`.lore/.config.json` holds user-tunable settings. The file is optional; without it, the skill uses sensible defaults.

## Schema

```json
{
  "schema_version": 1,
  "auto_mirror": true | false,
  "sync_updates_mirror": true | false,
  "sync_trust": "high" | "medium" | "low",
  "mirror_targets": ["CLAUDE.md"], // optional — auto-detected if absent
  "mirror_mode": "index",
  "compress_thresholds": {
    "max_entries": 500,
    "max_days_since_compress": 30
  },
  "sync_thresholds": {
    "min_lines_changed": 50,
    "min_directories_changed": 2
  },
  "last_sync_sha": "f9ca271..."  // set automatically by sync; null on first run
}
```

## Schema version (`schema_version`)

**Required for new configs** (set automatically by `lore init`). Tracks the schema version of `.lore/.config.json` so future releases can detect old configs before writing.

- **Missing** → treated as `schema_version: 1`. A `[WARN]` notice is printed to stderr by `list_entries.py`; add the field manually to silence it.
- **Equal to skill's expected version** → use as-is.
- **Higher than expected** → warn and continue: `list_entries.py` prints a `[WARN]` to stderr and proceeds with best-effort reads (readers are forward-compatible — see `references/compatibility.md`). The user's skill is older than their `.lore/`; recommend pulling the latest lore from upstream.

For the full compatibility policy, see `references/compatibility.md`.

## Field semantics

### `auto_mirror`

Default: `false`.

Controls whether `compress` regenerates platform mirrors automatically after it writes `SUMMARY.md`. It does **not** gate the explicit `lore mirror` command — `lore mirror` always regenerates (with content-based dedup) once `mirror_targets` is resolved.

- `true` — `compress` regenerates mirrors automatically
- `false` — `compress` asks per target before writing

Note: this flag does **not** affect `sync`. By default `sync` does not touch mirrors at all (see `sync_updates_mirror`).

### `sync_updates_mirror`

Default: `false`.

Controls whether `sync` regenerates platform mirrors as a side effect.

- `false` — `sync` only writes `.lore/*.md`. Mirrors are updated by `compress` or explicit `lore mirror`. This is the recommended setting to avoid cluttering `git log` of mirror files.
- `true` — `sync` regenerates mirrors (with content-based dedup) after the canonical change is accepted. Restore this setting if the old "update everything on every sync" behavior is preferred.

### `sync_trust`

Default: `"medium"`.

Controls how much confirmation `sync` requires for individual change types.

- `"high"` — auto-apply everything, including `NEW` and `STALE`. Only `ALERT` blocks interrupt.
- `"medium"` — auto-apply low-risk changes (de-duplicate hits, tags-only REFINEDs). Body-changing REFINEDs, `NEW`, `STALE`, and `ALERT` require confirmation.
- `"low"` — every change requires confirmation, including de-duplicate hits and tags-only REFINEDs.

### `mirror_targets`

Default: auto-detected at runtime (see "If absent" below).

Array of file paths (relative to project root) that should be kept in sync with `.lore/*`.
Every entry must pass the fail-closed allowlist and containment validation in
`references/platform-mirrors.md` before any target is read or written. Absolute paths,
`..` components, unsupported paths, and paths that escape the project root through symlinks
are errors, not warnings; abort the mirror operation without touching any target.

If absent: mirror targets are auto-detected at runtime by scanning the project root for existing platform files. If no platform files exist, the user is asked via a multi-select question during `init`, the first `mirror` call, or `compress` (when `auto_mirror: true`). See `references/platform-mirrors.md` for the resolution algorithm.

If present: validate the complete array, then use the validated targets. Empty array `[]` is
valid and disables mirror generation. Never partially process an array containing an invalid
target.

When auto-detection is in effect, `lore init` populates this field with the user's selections so subsequent runs are silent.

### `mirror_mode`

Default: `"index"`.

Only `"index"` is accepted. The mirror renders a small index structure pointing into `.lore/` (see `references/platform-mirrors.md` for the template and adaptive rendering rules). Per-session token cost stays flat (~600 B worst case, including a one-line operational opening and per-scope descriptions) regardless of entry count.

Any other value (e.g., the historical `"summary"` or `"full"`) is rejected at config-load time with an error. Remove the field, or set it to `"index"`.

### `compress_thresholds`

Defaults: `{"max_entries": 500, "max_days_since_compress": 30}`.

`sync` checks these silently and emits a `[COMPRESS NOTICE]` when tripped. See `SKILL.md` sync procedure.

### `sync_thresholds`

Defaults: `{"min_lines_changed": 50, "min_directories_changed": 2}`.

`sync` only proposes an update when at least one trigger threshold is met (see `SKILL.md` sync trigger threshold). Lowering these values means `sync` proposes updates more often.

### `last_sync_sha`

Default: absent (treated as `null`).

The git commit SHA from which the next `sync` will compute its delta. Written automatically by `sync` after every successful `.lore/*` update. Optional and additive — old configs without it keep working.

- **Absent or `null`** — `sync` falls back to working-tree diff alone (`git diff`, working tree vs. `HEAD`). Already-committed changes between two syncs are invisible.
- **Set to a reachable SHA** — `sync` uses `git diff <last_sync_sha>..HEAD` for committed changes plus working-tree diff for uncommitted changes. This is the recommended state and lets batched commits be captured by a single later sync.
- **Set to an unreachable SHA** (e.g., after `git rebase` or a force-push that orphaned the SHA) — `sync` prints a `[WARN]` to stderr and falls back to the working-tree diff alone. The next successful sync resets the baseline.
- **Empty repo** (no commits yet) — the field is `null`; only the working-tree diff applies.

## Editing the config

Edit `.lore/.config.json` directly. After editing:

- `sync` and `compress` re-read the config on every run; no restart needed.
- Invalid JSON → fall back to defaults + warn the user.
- For breaking-config changes, see `references/compatibility.md` and look for the `BREAKING:` commit in the project's git history.
