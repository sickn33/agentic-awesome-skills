# Compatibility policy

This document defines how `lore` evolves without breaking existing user projects. It is the contract between current users and future maintainers. Any change to `.lore/` structure, file formats, Python scripts, mirror templates, or this skill's reference docs must conform to these rules.

## Three principles

1. **Add, never subtract.** New fields, scripts, sections, and reference docs always use new names. Removal is a breaking change: the commit message must be prefixed `BREAKING:` and explain what users need to change.
2. **Readers are forward-compatible.** An older skill reading a newer `.lore/` ignores unknown fields, unknown files, and unknown tags. It never errors on unfamiliar content.
3. **Writers are backward-compatible (during transition).** A newer skill detecting an older `.lore/` reads the older shape, fills missing fields with defaults, and writes only what it intended to change. It never overwrites old data with new defaults.

## Layer-specific rules

### Layer 1: `.lore/.config.json` schema

- `schema_version` is **required** (integer). See `references/config.md` for handling missing/newer/older values.
- Adding a new optional field does not require a schema bump: old readers ignore unknown fields, new readers fill missing fields with defaults. See "Rule of thumb" under Examples below.
- Removing a field is a breaking change. The commit must be prefixed `BREAKING:` and name the field and the migration step the user must take.
- Renaming a field: keep both fields for one release, mark the old field as deprecated in the commit message, and remove in the next breaking release. The user edits their config by hand.

### Layer 2: Entry format

```
- [ARCH-2026-07-10-a3f2] Entry text; reason. #added:2026-07-10 #verified:2026-07-15
```

- IDs (`LAYER-DATE-HASH`) are stable as long as the entry text is unchanged. Editing an entry produces a new ID; old ID stays in history (via git) for `history` queries. `sync`'s `[REFINED]` respects this: tags-only updates keep the ID, body rewrites create a new ID and link the old entry via `#superseded-by`.
- Tag set is a closed set today: `#added`, `#verified`, `#stale`, `#superseded-by`. Adding a new tag is allowed; old skills' tag parsers (which match `(added|verified|stale|superseded-by)`) silently ignore unknown tags. The previous `#archived` tag is no longer part of the vocabulary; old entries carrying it are treated as unknown tags (still parse, semantic meaning is lost — use `#superseded-by` going forward).
- **Never make a tag required.** Required tags break every old entry in every old `.lore/`.

### Layer 3: `.lore/` directory structure

Current canonical layout:

```
.lore/
├── SUMMARY.md
├── .config.json
├── _global/
├── scopes/
├── .archive/      (My notes backups before a user-requested wipe)
├── draft/        (init only — temporary)
└── audit/        (audit only)
```

Rules:
- Adding a new top-level directory (e.g., `rejected/` for rejected entries) is non-breaking.
- Renaming an existing directory is breaking — every reference in `references/*.md`, every script, and every user's project breaks.
- Removing a directory is non-breaking if it was never actually written. The previous `archive/` directory fell into this category and has been removed from the layout. Note: when the user asks to wipe a mirror's My notes, lore archives the old content to `.lore/.archive/` first (see `references/platform-mirrors.md`); that directory is part of the layout above and is **not** an entries archive — it is a user-confirmed backup location only.

### Layer 4: Python scripts

Current scripts: `id_hash.py`, `list_entries.py`, `find_stale.py`, `find_duplicates.py`, `history.py`.

Rules:

- **Renaming is breaking.** All names are part of the public surface; they're referenced from `SKILL.md`, `references/*.md`, and downstream tooling. Don't rename; add a new one with a different name if needed.
- **Removing is breaking.** When a script is removed, the commit is prefixed `BREAKING:` and names the replacement. The removed file is deleted in the same commit.
- **Adding a new script is non-breaking.** Reference it from `SKILL.md` reference index on introduction.
- **Changing output format is breaking for `--json` consumers.** Add a new flag (e.g. `--v2-output`) rather than changing existing output; the old flag keeps old behavior forever.

### Layer 5: Platform mirror files

Mirror files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, etc.) follow this contract:

```markdown
<!-- LORE:START -->
## Lore (auto-managed)

... lore content ...
<!-- LORE:END -->

---
## My notes (free edit)

... user content (preserved verbatim) ...
```

Rules:

- `<!-- LORE:START -->` and `<!-- LORE:END -->` are **contract strings** for new mirrors (post-v1). Never rename; never remove. They are the authoritative boundary the skill uses for detection.
- `## Lore (auto-managed)` is a **contract string**. Never rename; never remove. Mirror detection regexes depend on it as a secondary signal.
- `## My notes (free edit)` is a **contract string**. Never rename; never remove. User-written content depends on it.
- The content between `<!-- LORE:START -->` and `<!-- LORE:END -->` is lore's domain; content after `<!-- LORE:END -->` and `---` is the user's. Respect the boundary on every regeneration.
- Pre-v1 mirrors without HTML comments are still detected and preserved via the `---` separator and `## My notes` header. The first `lore mirror` run on such a file offers the user an upgrade prompt (see `references/platform-mirrors.md` rule 5b).
- Adding a new auto-managed section (e.g., `## Sync history (auto-managed)`) is allowed; insert before `<!-- LORE:END -->`. Old skills ignore it.
- Changing the index template body (e.g., adding a "Last mirror:" line) is non-breaking: content-based dedup means unchanged mirrors are not rewritten, so old mirrors stay valid.
- **Backward-write safety**: if the existing mirror has no `## My notes (free edit)` section (e.g., a legacy single-section mirror from a pre-v1 project), the first `lore mirror` run must **append** an empty My notes section rather than overwriting the file.

### Layer 6: reference docs

Current docs: `workflows.md`, `entry-format.md`, `summary-template.md`, `audit-template.md`, `monorepo-detection.md`, `stale-new-markers.md`, `platform-mirrors.md`, `config.md`, `history-command.md`, `compatibility.md` (this file).

Rules:

- **Renaming a reference doc is breaking.** Every external link (issue trackers, blog posts, README badges) breaks. Add a redirect stub instead.
- **Splitting a doc** (e.g., `platform-mirrors.md` → `mirror-index.md` + `mirror-takeover.md`) requires a stub at the old path that points to the new location. Update `SKILL.md` reference index on the same commit.
- **Removing a doc** is breaking. Mark it `<!-- DEPRECATED: see new-location.md -->` for one schema version, then move to `archive/` (in `references/`, not in `.lore/`).
- **Adding a doc** is non-breaking. Add to `SKILL.md` reference index on introduction.

## Migration

There is no automatic migration tool in v1. Upgrades are `git pull` + read the commit history for any `BREAKING:` commits. The user edits their config by hand if a field was renamed or removed.

`list_entries.py` emits a one-time `[WARN]` to stderr if `.lore/.config.json` is missing the `schema_version` field. Add `"schema_version": 1` manually to silence it.

## Deprecation

There is no deprecation registry in v1. A capability slated for removal ships in a commit prefixed `BREAKING:` that names the capability and the migration step. The previous release may emit a one-line `[WARN]` notice when the deprecated capability is used, but there is no automated reminder system.

## CI enforcement

There is no compatibility CI in v1. Verification is the author's responsibility before each release: run `list_entries.py`, `history.py`, `find_stale.py` against a `.lore/` populated by the author's own work, and confirm the output is sensible.

## Examples

### Compatible change (additive)

Adding a new optional field, for example `compress_thresholds.max_entries_per_scope` with default `100`:

- Old configs continue to operate; the new field reads as the default.
- Old skill reading a new config: sees only the fields it knows; ignores the new field.
- New skill reading an old config: detects the missing field and uses the default.
- No upgrade notes needed; the change is invisible to existing users.

**Rule of thumb.** An additive optional change is non-breaking: ship it without bumping anything, no migration steps, no warnings.

### Incompatible change (avoid)

Renaming `mirror_mode` to `render_mode` in a single release:

- Every existing `.lore/.config.json` would silently lose its `mirror_mode: "index"` setting (old field dropped, new field absent → defaults kick in).
- Bad. Instead: keep both fields for one release, mark `mirror_mode` as deprecated in the commit message, then remove `mirror_mode` in the next breaking release.

### Breaking change (commit message)

Removing support for a config value such as `mirror_mode: "full"`:

- The release prints a warning when the value is set; suggests `"index"`.
- A future release hard-rejects `"full"`. Users edit their config by hand.
- The breaking commit message names the change and the manual edit.

## Decision checklist

Before merging any change to lore, answer these questions:

1. Does this change add, modify, or remove anything in `.lore/`?
2. Does this change add, modify, or remove any script in `scripts/`?
3. Does this change add, modify, or remove any contract string (`## Lore (auto-managed)`, `## My notes (free edit)`, `<!-- LORE:START -->`, `<!-- LORE:END -->`, etc.)?
4. Does this change add, modify, or remove any reference doc filename?
5. Does this change add, modify, or remove any entry tag?

If any answer is "add" and the change is non-breaking (new optional field, new optional tag, new doc, new script), ship as-is with a regular commit prefix (`feat:`, `docs:`, `refactor:`).

If any answer is "modify" or "remove", the change is breaking and the commit must:
- Be prefixed `BREAKING:` instead of `feat:` / `refactor:`.
- Name what changed and what the user must do in the commit body.

If all answers are "add" or "no", the change is non-breaking and ships as a regular commit.
