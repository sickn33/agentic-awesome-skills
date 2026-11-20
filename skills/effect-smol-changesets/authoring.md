# Authoring Changesets

Create one `.changeset/<descriptive-name>.md` per coherent change:

```md
---
"effect": patch
"@effect/affected-package": patch
---

Describe the consumer-visible change and why it matters.
```

List every directly affected published package. Do not list packages merely
because they share the fixed release group in `.changeset/config.json`.

Choose the bump from current release policy:

- On a stable line, use `patch` for compatible fixes, `minor` for compatible
  additions, and `major` for breaks.
- In `.changeset/pre.json` `rc` mode, follow the current convention of recording
  v4 release-candidate changes, including breaking cleanups, as `patch` unless a
  maintainer requests another level.
- Ask when release mode or intent is ambiguous.

Write for consumers. State the changed behavior or API and give concrete
migration guidance for every break. Use a `### Breaking changes` section when
several breaks need separate scanning. Include before/after examples only when
they materially clarify migration. Omit implementation and test details.

Validate frontmatter against published package names and inspect nearby current
changesets for wording and release convention. Never run `changeset-version` or
`changeset-publish` as contributor validation.
