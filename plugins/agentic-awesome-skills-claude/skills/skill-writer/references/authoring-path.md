# Authoring Path

Use this path to create or update `SKILL.md` and supporting files.

## SKILL.md checklist

- Valid YAML frontmatter with `name` and trigger-rich `description`.
- Clear title.
- Short purpose statement.
- Task routing or ordered steps.
- Output contract.
- `## When to Use`.
- `## Limitations`.

## Supporting files

Add `references/` when optional detail would make SKILL.md too long or distract from routing.
Add `scripts/` only when deterministic execution is useful and safer than rewriting code each time.
Add `assets/` only for files used directly in produced outputs.

## Editing rules

- Prefer small, scoped updates over rewrites.
- Preserve existing naming conventions.
- Keep examples copy-pasteable when commands are included.
- Avoid unsafe install, credential, or destructive command guidance unless prerequisites and warnings are explicit.
