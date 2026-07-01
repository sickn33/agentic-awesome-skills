# Conversion Workflow

## Purpose

Use this workflow when converting a Hugo documentation site into standard Markdown that no longer depends on Hugo runtime features.

## Step 1: Locate the real rule sources

Read these in order:

1. `hugo.toml`, `hugo.yaml`, `hugo.yml`, `hugo.json`, or `config/*`
2. `archetypes/*`
3. `data/*`
4. official or local docs that define shortcode, front matter, bundle, resource, and render-hook behavior
5. `layouts/_shortcodes/*` or `layouts/shortcodes/*`
6. `layouts/_markup/*`
7. Markdown- or JSON-facing export templates and partials such as `layouts/_default/*.md`, `layouts/_default/*.json`, or `layouts/partials/markdown-*.html`
8. `content/*`

## Step 2: Build a site inventory

Run:

```bash
python3 skills/hugo-to-markdown/scripts/inventory_hugo_rules.py \
  --site-root /path/to/your-hugo-site
```

Inspect the output for:

- content root and module mounts
- active shortcode names
- render hook names
- frequently used shortcodes
- front matter keys
- front matter alias or token usage that changes visible dates or slugs
- whether shortcode usage clusters around content graph expansion, section listings, data-backed tables, or external example extraction

Use the inventory to batch files by complexity:

- plain Markdown only
- front matter only
- literal Hugo documentation examples
- pages with Markdown attributes or code-fence options that must be preserved
- built-in shortcode usage
- content-graph shortcodes such as `include`, `embed-md`, `glossary-term`, and `table-children`
- custom shortcode usage
- data-backed shortcode usage
- render-hook-sensitive links and assets

## Step 3: Convert one slice at a time

Preferred order:

1. plain pages
2. pages with only front matter normalization
3. pages that mostly document Hugo syntax and contain literal shortcode examples
4. pages using shared includes
5. pages using custom shortcodes
6. pages whose content is partially generated from sections or data files
7. pages whose content depends on generated code examples or external local sources

This keeps regressions local and makes validation easier.

## Step 4: Materialize dynamic content

If a shortcode generates prose, lists, tables, or badges, replace it with the resulting Markdown.

Examples from the Hugo docs site:

- `include` pulls another content file and renders its shortcodes
- `quick-reference` expands section content
- `render-list-of-pages-in-section` builds a list from a section
- `render-table-of-pages-in-section` builds a table from section pages
- `glossary` materializes glossary content

Do not keep these as live Hugo shortcodes in the final standard Markdown.

When evaluating a shortcode, classify it first:

1. Static wrapper around inner Markdown or a simple asset
2. Content graph expansion into other pages or sections
3. Data-backed expansion using `data/*`
4. Generated example extraction from files outside the current page

This classification determines whether you can materialize the output directly, need recursive page resolution, need data-file reads, or must degrade to an explicit note.

Also determine whether the shortcode is:

- embedded, custom, or inline
- block, self-closing, or dual-form
- named-argument, positional-argument, or dual-mode

These choices affect how you parse the call and how much of the surrounding Markdown Hugo would have rendered.

## Step 5: Keep literal Hugo examples literal

The docs site frequently documents Hugo syntax itself. Distinguish:

- live shortcode calls that affect rendering
- escaped shortcode examples intended for readers

Common literal-example pattern:

```text
{{</* shortcode arg=value */>}}
```

When the construct is inside a fenced code block or otherwise clearly documentation, preserve it literally.

Also preserve escaped forms such as these when they appear in prose or tables:

```text
{{%/* foo */%}}
{{</* foo */>}}
```

Do not strip them just because they match a loose shortcode regex.

## Step 6: Normalize front matter before building derived content

Before using front matter to populate generated tables or lists:

- map reserved keys case-insensitively, for example `Title` to `title`
- treat `linkTitle` and `LinkTitle` as the same logical field
- account for aliases such as `publishdate` or `modified`
- account for front matter tokens such as `:filename` and `:fileModTime` when deciding whether metadata is derived
- preserve unknown custom keys as-is

This prevents empty links and missing descriptions when a repo mixes Hugo key casing conventions.

## Step 7: Validate aggressively

After each batch:

```bash
python3 skills/hugo-to-markdown/scripts/check_standard_markdown.py \
  --root /path/to/output
```

Treat validator hits as unresolved work unless they are deliberate examples inside code fences.

If you intentionally downgraded a shortcode to an explanatory note, that note should remain in the output and the original shortcode should not.
