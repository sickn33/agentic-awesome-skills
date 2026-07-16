# Front Matter And Content Rules

## Front Matter Policy

Default to YAML front matter in the output unless the user explicitly asks to strip metadata.

Preserve fields when they still carry meaning in the destination:

- `title`
- `linkTitle`
- `description`
- `date`
- `publishDate`
- `lastmod`
- `expiryDate`
- `draft`
- `aliases`
- `slug`
- `url`
- `weight`
- `categories`
- `keywords`
- `params`
- `menus` or menu-like data

Do not invent fields that were not present.

If the repository mixes casing for reserved Hugo fields, normalize to the documented canonical form in the output:

- `Title` -> `title`
- `Description` -> `description`
- `LinkTitle` -> `linkTitle`

Apply this normalization before using front matter to build lists, tables, or link labels. Preserve unknown custom keys with their original spelling unless the user asks for a schema rewrite.

## Effective Value Rules

Do not treat front matter as a flat key-value copy problem. In Hugo, some visible values are inferred from configuration, aliases, filenames, or Git metadata.

For the source site, check any site-specific front matter documentation and the local `[frontmatter]` config before deciding which value is authoritative.

Important alias rules:

- `publishDate` can come from `publishdate`, `pubdate`, or `published`
- `lastmod` can come from `lastmod` or `modified`
- `expiryDate` can come from `expirydate` or `unpublishdate`

Important token rules:

- `:default` means Hugo falls back through the documented default date sequence
- `:filename` can derive `date` and sometimes `slug` from a date-prefixed filename
- `:fileModTime` can supply a date from the file modification time
- `:git` can supply a date from Git history when enabled

Conversion guidance:

- Preserve explicit source fields when they are already concrete and meaningful.
- If the repository relies on alias or token resolution, do not mistakenly drop related metadata just because the canonical key is absent.
- If you can deterministically resolve a derived date or slug from the local snapshot and the user wants flattened output, materialize it explicitly.
- If deterministic resolution would require Git state, build execution, or missing metadata, keep the source field plus a short conversion note instead of guessing.

## Resources Metadata

Front matter may also describe page resources, not just page metadata.

Preserve `resources` metadata when it affects:

- image or file labels
- resource lookup by `Name`
- titles used in generated link text
- custom `params`
- wildcard-driven assignments

In Hugo's page resource rules, matching order matters and `name` and `title` can use the `:counter` placeholder. Do not simplify these structures away unless the destination explicitly does not need them.

## Archetype Signal

Read archetypes before normalizing front matter. In a typical Hugo docs site:

- `archetypes/default.md` establishes the common fields
- `archetypes/functions.md` adds nested `params.functions_and_methods`
- `archetypes/methods.md` follows the same method metadata pattern
- `archetypes/glossary.md` and `archetypes/news.md` introduce content-type-specific fields

When an archetype or local content convention introduces nested fields, preserve the shape unless the user asks for a simplified schema.

## Content Composition Rules

The page file is not always the full source of truth. Also check:

- shared `_common` content fragments
- shortcode-generated prose
- data-backed shortcode inputs from `data/*`
- generated example source files referenced by local shortcodes
- render-hook-driven link behavior
- page bundle resources and section resources
- page resource metadata from the page's own front matter
- front matter configuration that changes how dates, slugs, and publish status are derived

## Literal Examples Versus Live Syntax

Preserve literal Hugo examples when they are:

- inside fenced code blocks
- clearly escaped with comment markers such as `/* ... */`
- part of tutorial prose explaining Hugo syntax

Important escaped forms to preserve:

- `{{</* foo */>}}`
- `{{%/* foo */%}}`
- notation examples that compare `%` and `<` shortcode forms in tables or inline code

Do not treat those as active shortcode invocations merely because they are outside fenced code blocks.

Convert live syntax when it changes the rendered page.

## Explicit Downgrade Policy

When a local shortcode cannot be materialized safely:

- remove the live Hugo syntax
- replace it with a short Markdown explanation
- keep any safe subset of content that is already visible in the page source

Examples:

- preserve inline Redis CLI text even if a multi-language tabset cannot be rebuilt
- preserve a resolved image URL even if the surrounding presentation wrapper is custom
- preserve section purpose and emit a note if a build-time data table cannot be reconstructed

## Markdown Features To Preserve

Keep these when possible:

- fenced code blocks
- tables
- blockquotes
- definition lists if the destination Markdown flavor supports them
- math passthrough delimiters when the destination supports math
- block attributes only when the destination flavor supports them
- heading attributes such as `## Heading {#id .class}`
- code fence attributes and highlighting options when the destination flavor supports them

If the destination does not support a feature, downgrade explicitly instead of dropping content.
