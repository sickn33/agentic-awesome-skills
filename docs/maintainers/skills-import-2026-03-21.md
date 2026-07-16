# Skills Import - 2026-03-21

This note records the skill import and normalization work completed on 2026-03-21.

## Summary

- Imported new skill directories from external repositories.
- Normalized frontmatter for imported skills where needed.
- Repaired imported dangling links that did not map cleanly into this repository.
- Regenerated derived artifacts after import.

## Imported Skills by Source

### `anthropics/skills`

- `claude-api`
- `internal-comms`

Note:
- `docx`, `pdf`, `pptx`, and `xlsx` were not re-imported as separate directories because this repository already exposes those aliases as symlinks to `*-official` skill directories.

### `coreyhaines31/marketingskills`

- `ad-creative`
- `ai-seo`
- `churn-prevention`
- `cold-email`
- `content-strategy`
- `lead-magnets`
- `product-marketing-context`
- `revops`
- `sales-enablement`
- `site-architecture`

### `AgriciDaniel/claude-seo`

- `seo`
- `seo-competitor-pages`
- `seo-content`
- `seo-dataforseo`
- `seo-geo`
- `seo-hreflang`
- `seo-image-gen`
- `seo-images`
- `seo-page`
- `seo-plan`
- `seo-programmatic`
- `seo-schema`
- `seo-sitemap`
- `seo-technical`

### `kepano/obsidian-skills`

- `defuddle`
- `json-canvas`
- `obsidian-bases`
- `obsidian-cli`
- `obsidian-markdown`

## Not Imported

These repositories were analyzed earlier in the comparison work, but no new primary skills were imported from them in this batch:

- `obra/superpowers`
- `muratcankoylan/agent-skills-for-context-engineering`
- `PleasePrompto/notebooklm-skill`

## Validation

Commands run during the import:

```bash
npm run validate
npm run index
npm run catalog
```

Result:

- Validation passed after normalization.
- Generated index count after import: `1304` skills.
