# Date Tracking Implementation Summary

This note explains how `date_added` support fits into the current repository structure after the `apps/` and `tools/` refactor.

## What Exists Today

### Frontmatter support

New skills can include a `date_added` field in `SKILL.md` frontmatter:

```yaml
---
name: skill-name
description: "Description"
date_added: "2026-03-06"
---
```

### Validator support

The active validators understand `date_added`:

- `tools/scripts/validate_skills.py` checks the `YYYY-MM-DD` format.
- Supporting JS validation/test helpers are aware of the field where relevant.

### Index and web app support

- `tools/scripts/generate_index.py` exports `date_added` into `skills_index.json`.
- `npm run app:setup` copies the generated index to `apps/web-app/public/skills.json`.
- The web app can render the field anywhere the UI surfaces it.

### Maintenance scripts

- `tools/scripts/manage_skill_dates.py` manages skill dates.
- `tools/scripts/generate_skills_report.py` produces JSON reports from current skill metadata.

## Canonical Documentation

The canonical docs for date tracking now live here:

- [`skills-date-tracking.md`](skills-date-tracking.md)
- [`../contributors/skill-template.md`](../contributors/skill-template.md)
- [`../contributors/skill-anatomy.md`](../contributors/skill-anatomy.md)

Use those files as the source of truth instead of older root-level doc names.

## Common Commands

```bash
# View current date coverage
python tools/scripts/manage_skill_dates.py list

# Add missing dates
python tools/scripts/manage_skill_dates.py add-missing

# Update one skill
python tools/scripts/manage_skill_dates.py update skill-name 2026-03-06

# Generate a report
python tools/scripts/generate_skills_report.py --output reports/skills_report.json
```

## Notes

- Repository-wide coverage can change over time as new community skills are added, so this document avoids hardcoding counts.
- `date_added` is useful metadata, but the operational contributor gate remains `npm run validate`; strict validation is a separate hardening target for legacy cleanup.
