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
  }
}
```

## Schema version (`schema_version`)

**Required for new configs** (set automatically by `lore init`). Tracks the schema version of `.lore/.config.json` so future releases can detect old configs before writing.

- **Missing** → treated as `schema_version: 1`. A `[WARN]` notice is printed to stderr by `list_entries.py`; add the field manually to silence it.
- **Equal to skill's expected version** → use as-is.
- **Lower than expected** → refuse to write; ask the user to run the migration script shipped with that future release.
- **Higher than expected** → refuse to read with an error; the user's skill is older than their `.lore/`. They need to upgrade lore (pull latest from upstream) before continuing.

For the full compatibility policy (migration tools, deprecation cycle, reader/writer contracts), see `references/compatibility.md`.

## Field semantics

### `auto_mirror`

Default: `false`.

Controls whether `compress` and `lore mirror` regenerate platform mirrors automatically after the canonical change is accepted.

- `true` — regenerate mirrors automatically
- `false` — ask per target before writing

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
- `"medium"` — auto-apply low-risk changes (de-duplicate hits, equivalent REFINEDs). `NEW`, `STALE`, and `ALERT` require confirmation.
- `"low"` — every change requires confirmation, including de-duplicate hits and equivalent REFINEDs.

### `mirror_targets`

Default: auto-detected at runtime (see "If absent" below).

Array of file paths (relative to project root) that should be kept in sync with `.lore/*`. Path must match one of the platform entries in `references/platform-mirrors.md`. Unsupported paths trigger a warning at config-load time.

If absent: mirror targets are auto-detected at runtime by scanning the project root for existing platform files. If no platform files exist, the user is asked via a multi-select question during `init`, the first `mirror` call, or `compress` (when `auto_mirror: true`). See `references/platform-mirrors.md` for the resolution algorithm.

If present: used verbatim. Empty array `[]` is valid and disables mirror generation.

When auto-detection is in effect, `lore init` populates this field with the user's selections so subsequent runs are silent.

### `mirror_mode`

Default: `"index"`.

Only `"index"` is accepted. The mirror renders a small index structure pointing into `.lore/` (see `references/platform-mirrors.md` for the template and adaptive rendering rules). Per-session token cost stays flat (~500 B) regardless of project size.

Any other value (e.g., the historical `"summary"` or `"full"`) is rejected at config-load time with an error. Remove the field, or set it to `"index"`.

### `compress_thresholds`

Defaults: `{"max_entries": 500, "max_days_since_compress": 30}`.

`sync` checks these silently and emits a `[COMPRESS NOTICE]` when tripped. See `SKILL.md` sync procedure.

### `sync_thresholds`

Defaults: `{"min_lines_changed": 50, "min_directories_changed": 2}`.

`sync` only proposes an update when at least one trigger threshold is met (see `SKILL.md` sync trigger threshold). Lowering these values means `sync` proposes updates more often.

## Editing the config

Edit `.lore/.config.json` directly. After editing:

- `sync` and `compress` re-read the config on every run; no restart needed.
- Invalid JSON → fall back to defaults + warn the user.
- After editing, verify with `python scripts/list_entries.py --config-check` (added in a future migration).
- For schema version changes, see `references/compatibility.md`.

## Upgrade path

When a future lore release introduces the first `schema_version` bump:

1. That release ships `scripts/migrate.py` for the specific version bump.
2. The skill prompts: "Your `.lore/.config.json` is v1; lore now expects v2. Run `python scripts/migrate.py` to upgrade."
3. `migrate.py` is idempotent — running it twice is a no-op.
4. After migration, the file is updated in place; no manual editing needed.

In v1, no migration has shipped and `scripts/migrate.py` does not exist. Add `"schema_version": 1` manually to old configs to silence the warning.
