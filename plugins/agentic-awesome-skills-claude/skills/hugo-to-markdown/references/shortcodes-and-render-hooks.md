# Shortcodes And Render Hooks

## Shortcode Notation

Hugo has two shortcode notations:

- `{{< ... >}}`
- `{{% ... %}}`

Use Hugo's rule, documented in the official shortcode pages:

- `%` notation is rendered before Markdown
- `<` notation is rendered after Markdown

For conversion, do not preserve this live syntax in the final standard Markdown unless the document is explicitly teaching Hugo syntax.

## Shortcode Calling Rules

Before rewriting a shortcode, determine all of these:

1. embedded, custom, or inline
2. opening/closing block form, self-closing form, or both
3. named arguments, positional arguments, or both
4. whether mixed named and positional arguments are forbidden
5. whether the shortcode must be called with `%` notation or `<` notation

These are not cosmetic details. They can change visible output, table-of-contents behavior, and whether inner Markdown is rendered at all.

Important Hugo rules from the official shortcode docs:

- inline shortcodes are a separate feature and are disabled unless explicitly enabled
- some shortcodes require body content, some forbid it, and some support both forms
- named arguments are case-sensitive
- named and positional arguments cannot be mixed within one shortcode call
- multiline arguments and raw string literals are valid shortcode syntax
- nested shortcodes are allowed except for inline shortcodes

## First Classify The Shortcode

Before rewriting any shortcode, classify it into one of these groups:

1. Literal documentation example
2. Static wrapper around local content or assets
3. Content-graph expander
4. Data-backed renderer
5. External example extractor

This classification should drive the conversion strategy:

- Literal documentation example: preserve literally
- Static wrapper: replace with normal Markdown or HTML
- Content-graph expander: recursively resolve local pages or sections
- Data-backed renderer: read the referenced `data/*` or local metadata source
- External example extractor: inspect the referenced local example files, or downgrade with an explicit note if deterministic reconstruction is not possible

## Docs-Site Custom Shortcodes

A typical Hugo docs site may define custom shortcodes such as these in `layouts/_shortcodes/`:

- `code-toggle`
- `datatable`
- `deprecated-in`
- `eturl`
- `get-page-desc`
- `glossary`
- `glossary-term`
- `hl`
- `img`
- `imgproc`
- `include`
- `module-mounts-note`
- `new-in`
- `newtemplatesystem`
- `per-lang-config-keys`
- `quick-reference`
- `render-list-of-pages-in-section`
- `render-table-of-pages-in-section`
- `root-configuration-keys`
- `syntax-highlighting-styles`

Read the local template file before deciding the replacement.

If the repository already contains Markdown-export partials or AI-facing templates, use them as evidence for how the site itself flattens these constructs. Do not copy them blindly without understanding which shortcodes they intentionally expand and which they intentionally leave alone.

## High-Impact Local Rules

### Logical content paths

Some Hugo docs sites mount a language subdirectory such as `content/en` to the logical `content` root. Resolve links and `include` targets against logical paths rather than filesystem paths that retain the language prefix.

### `include`

`include` renders another content page through `RenderShortcodes`. This means:

- the included file may contain more shortcodes
- the included file is part of the final visible content
- conversion must recursively resolve the referenced file
- the included file should contribute body content, not duplicate front matter

### `quick-reference`

This shortcode renders sections and child pages dynamically. Replace it with a materialized Markdown structure.

### `render-list-of-pages-in-section`

This shortcode builds lists from a section path. Replace it with normal Markdown lists and descriptions.

### `render-table-of-pages-in-section`

This shortcode builds tables from a section path and filters. Replace it with a standard Markdown table if practical, otherwise a clear list.

### `glossary-term` and `glossary`

These inject glossary links or glossary content. Preserve the resulting prose or links, not the shortcode syntax.

### `new-in` and `deprecated-in`

Convert these into plain Markdown callouts or inline labels such as:

- `New in Hugo 0.144.0.`
- `Deprecated in Hugo 0.144.0.`

### `code-toggle`

Preserve the underlying example content as fenced code, not the UI toggle mechanism.

Common parameter patterns to watch for:

- `file=hugo` or similar parameters indicate repository-style config examples
- `fm=true` means the emitted example includes front matter semantics
- `config=` and `dataKey=` style usage can pull data-backed snippets, so read local data files before flattening the shortcode

If the required data source is not locally obvious or requires remarshal logic that you cannot reproduce safely, replace the shortcode with:

- the visible inline sample when one exists, or
- a short note explaining that the repository builds multiple code variants from data at render time

### `datatable`

This shortcode renders a table from `hugo.Data.docs`. Materialize the table from local data when the selected package, list, and field set are clear.

### `per-lang-config-keys` and `root-configuration-keys`

These shortcodes summarize configuration metadata. Treat them as data-backed expanders rather than simple badges or links.

### `syntax-highlighting-styles` and `chroma-lexers`

These shortcodes materialize large generated lists from local data or template logic. Prefer explicit Markdown tables or lists when practical, otherwise downgrade with a clear note describing the omitted generated gallery.

### `newtemplatesystem` and `hl`

These are local presentation helpers. Inspect whether they emit prose, badges, or inline highlighted code before deciding the downgrade format.

## Embedded Shortcodes

The official Hugo docs also document embedded shortcodes. Even when the source site mostly uses custom shortcodes, treat embedded shortcodes as first-class conversion cases because other Hugo repositories often rely on them directly.

High-value embedded shortcode guidance:

- `details`: convert to a Markdown callout or HTML `<details>` block while preserving the summary text and body content
- `figure`: preserve the image destination, alt text, caption, title, and attribution semantics; plain Markdown image plus surrounding caption text is usually safer than keeping shortcode syntax
- `highlight`: convert to fenced code when the rendered result is a code sample; preserve inline highlighting as inline code or HTML only when necessary
- `param`: resolve to the referenced site parameter if it is locally knowable, otherwise replace with a conversion note
- `qr`: preserve the encoded text and add a note or image link only if the generated asset is locally resolvable
- `ref` and `relref`: replace with the final resolved Markdown destination, not the shortcode itself
- `youtube`, `vimeo`, `instagram`, and `x`: convert to stable normal links or embeds only if the destination is explicit and safe

If a repository overrides an embedded shortcode in `layouts/_shortcodes`, treat the local override as authoritative.

## Inline Shortcodes

Inline shortcodes are rare but important because they can define executable template logic inside content.

Conversion rules:

- If the page is documenting inline shortcode syntax, preserve the example literally.
- If the page is actually using an inline shortcode and the rendered text is locally obvious, preserve the rendered text rather than the template body.
- If the rendered value depends on runtime state such as `now`, environment variables, or build context, replace it with an explicit note instead of guessing.

### `glossary-term` and glossary links

Some Hugo docs sites use glossary shortcuts in two forms:

- `glossary-term` shortcode usage
- Markdown links whose destination is exactly `(g)`

Both should become explicit Markdown links or explicit glossary labels in the output.

### `ref` and `relref`

When these appear as live shortcode calls rather than literal documentation examples:

- resolve them to the final destination
- preserve query strings and fragments when they are valid
- do not emit `ref` or `relref` literally in the final Markdown

In many modern Hugo docs sites, Markdown pages generally prefer render-hook-based destination resolution instead of these shortcodes.

### Content-graph expanders in other Hugo sites

Other Hugo repos may use shortcodes with similar graph-expansion behavior under different names, for example:

- `embed-md`
- `table-children`
- `command-group`

Treat these as repository-specific features. Read the local shortcode or partial implementation before deciding whether it expands sibling pages, child sections, or data files.

### Data-backed and example-extraction shortcodes in other Hugo sites

In docs repos such as Redis or Rclone sites, expect shortcodes like:

- `features-table`
- `optional-features-table`
- `clients-example`
- `jupyter-example`

These often depend on:

- `data/*`
- generated metadata files
- local example source trees
- Markdown-export partials

Materialize them only when the local dependency chain is clear and deterministic. Otherwise, downgrade to a `Conversion note:` block and keep any safe inline content.

## Literal Example Guardrails

Preserve escaped shortcode examples even outside fenced code blocks when they are part of:

- notation comparison tables
- syntax tutorials
- inline prose demonstrating how to call a shortcode

Examples:

```text
{{%/* foo */%}}
{{</* foo */>}}
```

Do not strip these with a generic shortcode remover.

## Render Hooks

The site under conversion may define render hooks for:

- blockquotes
- code blocks
- links
- passthrough
- tables

Important implications:

- a Markdown link may resolve against pages, page resources, section resources, or global resources
- content may depend on local validation logic for broken links
- rendered HTML may differ from generic CommonMark defaults
- blockquotes can carry alert semantics such as note, tip, important, warning, and caution
- code blocks can carry file labels, copy flags, details wrappers, summaries, trim behavior, and language remapping
- passthrough hooks can make math delimiters meaningful content rather than raw noise
- Markdown attributes can surface in render hook context and therefore must not be stripped blindly

For sites with similar render-hook patterns:

- the local repository overrides render hooks for blockquotes, code blocks, links, passthrough, and tables
- it documents heading and image render hooks, but does not override them locally in `layouts/_markup/`
- the local link hook handles glossary shorthand `(g)`, validates fragments, and checks section resources only when the current page is not a leaf bundle
- the local code block hook can add file labels, copy buttons, details wrappers, summaries, trim behavior, and language remapping based on code fence attributes

For link-heavy pages, read the local `render-link.html` and the official render-hook docs before rewriting links.

## Safe Fallback Format

If a shortcode remains unresolved after inspection, replace it with a short explicit note in the final Markdown, for example:

```text
> Conversion note: `clients-example` normally renders multi-language tabs. This sample keeps only the inline Redis CLI content.
```

This is preferable to shipping live Hugo syntax or silently dropping meaning.
