# Registration And Validation

Use this path after skill edits.

## Repository checks

Read the target checkout’s current instructions and package scripts before selecting checks. Do not recover missing scripts from another branch or installed skill. For this repository’s current base, canonical skill edits require:

```bash
npm run validate
npm run validate:references
npm run security:docs
npm run test
```

Keep source PRs free of generated registry or plugin mirror output; follow the maintainer’s protected canonical-sync flow for generated state. Other repositories may have a different contract.

Use stricter or specialized checks when the changed skill includes risky commands, external references, generated artifacts, or package/runtime behavior.

## Artifact checks

Confirm:

- `SKILL.md` frontmatter parses.
- Referenced files exist.
- Generated registry files are synced when the repository owns them on `main`.
- Credits and provenance are present when external sources are used.
- The final response reports validation honestly.

## Reject conditions

Do not mark the work complete if:

- Required references are missing.
- The skill cannot be followed without hidden context.
- A risky instruction lacks prerequisites.
- Validation failed and the failure is not explicitly accepted by the user.
