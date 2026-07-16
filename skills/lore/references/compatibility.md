# Compatibility policy

This document defines how `lore` evolves without breaking existing user projects. It is the contract between current users and future maintainers. Any change to `.lore/` structure, file formats, Python scripts, mirror templates, or this skill's reference docs must conform to these rules.

## Three principles

1. **Add, never subtract.** New fields, scripts, sections, and reference docs always use new names. Removal happens only after the deprecation cycle (below).
2. **Readers are forward-compatible.** An older skill reading a newer `.lore/` ignores unknown fields, unknown files, and unknown tags. It never errors on unfamiliar content.
3. **Writers are backward-compatible (during transition).** A newer skill detecting an older `.lore/` runs a migration step before writing. It never overwrites old data with new defaults.

## Layer-specific rules

### Layer 1: `.lore/.config.json` schema

- `schema_version` is **required** (integer). See `references/config.md` for handling missing/newer/older values.
- Adding a new field = bump `schema_version` to N+1; old fields stay; the field is added with its default value at first read.
- Removing a field requires the deprecation cycle (one schema version's worth of warnings before hard removal).
- Renaming a field: write the new field, copy the value, mark the old one with `_deprecated: "reason"`. The migration tool handles this in `migrate.py`.

### Layer 2: Entry format

```
- [ARCH-2026-07-10-a3f2] Entry text; reason. #added:2026-07-10 #verified:2026-07-15
```

- IDs (`LAYER-DATE-HASH`) are stable as long as the entry text is unchanged. Editing an entry produces a new ID; old ID stays in history (via git) for `history` queries.
- Tag set is a closed set today: `#added`, `#verified`, `#stale`, `#archived`. Adding a new tag is allowed; old skills' tag parsers (which match `(added|verified|stale|archived)`) silently ignore unknown tags.
- **Never make a tag required.** Required tags break every old entry in every old `.lore/`.

### Layer 3: `.lore/` directory structure

Current canonical layout:

```
.lore/
├── SUMMARY.md
├── _global/
├── scopes/
├── draft/        (init only — temporary)
├── audit/        (audit only)
└── archive/      (referenced in spec; reserved for future)
```

Rules:

- Adding a new top-level directory (e.g., `rejected/` for rejected entries) is non-breaking.
- Renaming an existing directory is breaking — every reference in `references/*.md`, every script, and every user's project breaks.
- Removing a directory is breaking unless that directory was never actually written (e.g., removing `archive/` today is non-breaking because nothing writes there yet).

### Layer 4: Python scripts

Current scripts: `id_hash.py`, `list_entries.py`, `find_stale.py`, `find_duplicates.py`, `history.py`, plus planned `migrate.py`.

Rules:

- **Renaming is breaking.** All names are part of the public surface; they're referenced from `SKILL.md`, `references/*.md`, and downstream tooling. Don't rename; deprecate and add a new one if needed.
- **Removing is breaking.** A deprecated script stays on disk with a clear "Deprecated: use `migrate.py` instead" header for one schema version.
- **Adding a new script is non-breaking.** Reference it from `SKILL.md` reference index on introduction.
- **Changing output format is breaking for `--json` consumers.** Add `--v2-output` or a new flag; old flag keeps old behavior forever.

### Layer 5: Platform mirror files

Mirror files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, etc.) follow this contract:

```markdown
## Lore (auto-managed)

... lore content ...

---
## My notes (free edit)

... user content (preserved verbatim) ...
```

Rules:

- `## Lore (auto-managed)` is a **contract string**. Never rename; never remove. Mirror detection regexes depend on it.
- `## My notes (free edit)` is a **contract string**. Never rename; never remove. User-written content depends on it.
- The content between `## Lore` and `---` is lore's domain; content after `---` is the user's. Respect the boundary on every regeneration.
- Adding a new auto-managed section (e.g., `## Sync history (auto-managed)`) is allowed; insert before `---`. Old skills ignore it.
- Changing the index template body (e.g., adding a "Last mirror:" line) is non-breaking: content-based dedup means unchanged mirrors are not rewritten, so old mirrors stay valid.
- **Backward-write safety**: if the existing mirror has no `## My notes (free edit)` section (e.g., a legacy single-section mirror from a pre-v1 project), the first `lore mirror` run must **append** an empty My notes section rather than overwriting the file.

### Layer 6: reference docs

Current docs: `entry-format.md`, `summary-template.md`, `audit-template.md`, `monorepo-detection.md`, `stale-new-markers.md`, `platform-mirrors.md`, `config.md`, `history-command.md`, `compatibility.md` (this file).

Rules:

- **Renaming a reference doc is breaking.** Every external link (issue trackers, blog posts, README badges) breaks. Add a redirect stub instead.
- **Splitting a doc** (e.g., `platform-mirrors.md` → `mirror-index.md` + `mirror-takeover.md`) requires a stub at the old path that points to the new location. Update `SKILL.md` reference index on the same commit.
- **Removing a doc** is breaking. Mark it `<!-- DEPRECATED: see new-location.md -->` for one schema version, then move to `archive/` (in `references/`, not in `.lore/`).
- **Adding a doc** is non-breaking. Add to `SKILL.md` reference index on introduction.

## Migration tool

`scripts/migrate.py` does not exist in v1. It will be added on the first `schema_version` bump.

**Triggers that will ship the first migration:**

- A new required field is added to `.lore/.config.json`.
- A field is renamed or its accepted values are tightened.
- The entry ID algorithm changes.

Until any of these happen, `schema_version: 1` is the only version and no migration is possible or needed.

Until the script ships, `list_entries.py` emits a one-time warning to stderr if `.lore/.config.json` is missing the `schema_version` field. This nudges users to add the field manually before the first breaking change ships, so future upgrades can detect the version mismatch correctly.

**Template — to be implemented when the first migration is needed:**

```python
#!/usr/bin/env python3
"""Migrate .lore/.config.json from version N to N+1.

Idempotent: running twice produces no further changes.
Refuses to run if schema_version > EXPECTED_FROM.
"""
import json, sys
from pathlib import Path

EXPECTED_FROM = 1   # versions this script can read
TARGET = 2          # current schema version after migration


def migrate(config: dict) -> tuple[dict, list[str]]:
    msgs = []
    # v1 → v2 transformations go here. Example:
    # if config.get("mirror_mode") == "summary":
    #     config.pop("mirror_mode", None)
    #     msgs.append('removed deprecated "mirror_mode": "summary"')
    config["schema_version"] = TARGET
    return config, msgs


def main() -> int:
    cfg_path = Path(".lore/.config.json")
    if not cfg_path.exists():
        print(f"error: {cfg_path} not found", file=sys.stderr)
        return 1
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    current = cfg.get("schema_version", 1)
    if current > EXPECTED_FROM:
        print(
            f"error: schema_version={current} is newer than this skill "
            f"can read (max: {EXPECTED_FROM}). Pull latest lore.",
            file=sys.stderr,
        )
        return 2
    if current < TARGET:
        print(f"migrating v{current} → v{TARGET}...")
    cfg, msgs = migrate(cfg)
    for m in msgs:
        print(f"  - {m}")
    cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

## Deprecation workflow

Any capability slated for removal follows a three-stage cycle. The minimum cycle is **two schema versions** (typically 6–12 months).

| Stage | Schema version | Behavior |
|---|---|---|
| **Announce** | N | Add an entry to `references/deprecations.md` with the feature name, replacement, and removal target version. The skill prints a one-line notice when the feature is used. |
| **Warn** | N+1 | The skill prints a louder warning (with remediation steps) and writes a `_deprecation_warnings_shown` array to `.lore/.config.json` so the warning doesn't repeat. |
| **Remove** | N+2 | Hard delete. Old `.lore/` data is migrated by `migrate.py` to the new format. Users who skipped migrations will see explicit errors pointing at `migrate.py`. |

Skipping a stage is allowed only for security fixes or unreleased features that were never shipped.

## CI enforcement

A compatibility CI job (planned for `.github/workflows/compat.yml`) verifies:

1. **New skill reads old `.lore/`**: checkout a fixture project from `fixtures/v0-project/`, run `list_entries.py`, `history.py`, `find_stale.py` on it. Pass = no exceptions, correct counts.
2. **Old skill reads new `.lore/`**: build a fixture with the latest schema, check out the previous release's scripts, run them. Pass = no exceptions on known fields; unknown fields silently ignored.
3. **No rename or delete in `scripts/` or `references/`**: PR diff against `scripts/` and `references/` filenames; any removed file = failure.

At least one fixture project must be checked in at `fixtures/v0-project/` and re-pinned to a known old schema version after each major release.

## Examples

### Compatible change (additive)

Adding a new `compress_thresholds.max_entries_per_scope` field:

- Bump `schema_version` to 2.
- `migrate.py` v1 → v2: add the new field with default `100` if absent.
- Old skill reads v2 config: sees only the fields it knows; ignores `max_entries_per_scope`.
- New skill reads v1 config: detects `schema_version` mismatch, refuses to write until migration runs.

### Incompatible change (avoid)

Renaming `mirror_mode` to `render_mode`:

- Every existing `.lore/.config.json` would silently lose its `mirror_mode: "index"` setting on next migration (old field dropped, new field absent → defaults kick in).
- Bad. Instead: add `render_mode` as the new canonical field; mark `mirror_mode` as `_deprecated`; keep both for one schema version; eventually remove `mirror_mode` via the deprecation cycle.

### Breaking change (deprecation cycle required)

Removing support for `mirror_mode: "full"`:

- v1: ship `mirror_mode: "full"` as deprecated; full mode still works.
- v2: print warning when `"full"` is set; suggest migrating to `"index"`.
- v3: hard reject `"full"`; `migrate.py` auto-converts to `"index"`.
- Each version's release notes link to the deprecation entry in `references/deprecations.md`.

## Decision checklist

Before merging any change to lore, answer these questions:

1. Does this change add, modify, or remove anything in `.lore/`?
2. Does this change add, modify, or remove any script in `scripts/`?
3. Does this change add, modify, or remove any contract string (`## Lore (auto-managed)`, `## My notes (free edit)`, etc.)?
4. Does this change add, modify, or remove any reference doc filename?
5. Does this change add, modify, or remove any entry tag?

If any answer is "modify" or "remove", the change requires either:
- A migration step in `migrate.py` (for schema changes)
- A deprecation cycle (for removals)
- An entry in `references/deprecations.md`

If all answers are "add" or "no", the change is non-breaking and can ship as a minor or patch release.