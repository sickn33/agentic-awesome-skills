---
name: hugo-to-markdown
description: Convert Hugo documentation sites and Hugo-managed content into standard Markdown. Use when Agent needs to inspect a local Hugo repository, read hugo.toml or config files, content/, archetypes/, layouts/_shortcodes/, layouts/_markup/, and related docs content, then produce Markdown...
risk: unknown
source: https://github.com/chaunsin/agent-skills/tree/master/skills/hugo-to-markdown
source_repo: chaunsin/agent-skills
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/chaunsin/agent-skills/blob/master/LICENSE
---

# Hugo To Markdown
## When to Use

Use this skill when you need convert Hugo documentation sites and Hugo-managed content into standard Markdown. Use when Agent needs to inspect a local Hugo repository, read hugo.toml or config files, content/, archetypes/, layouts/_shortcodes/, layouts/_markup/, and related docs content, then produce Markdown...


## Overview

Use this skill when Markdown output must be derived from the local Hugo site, not guessed from generic Hugo knowledge. The conversion rules are the combination of Hugo's official behavior and the repository's own configuration, shortcode templates, render hooks, archetypes, and content conventions.

The target output is standard Markdown:

- Keep plain Markdown and YAML front matter.
- Replace or materialize Hugo-only constructs.
- Preserve meaning when exact rendering is not safely reproducible.
- Prefer explicit Markdown text over live Hugo template syntax.
- Distinguish literal Hugo syntax examples from active Hugo features before rewriting anything.

## Official Basis

Treat the repository's own Hugo configuration and templates as the primary ruleset. For any site under conversion, inspect these rule sources in the user's provided site root:

- `hugo.toml` (or `hugo.yaml`, `hugo.yml`, `hugo.json`, or `config/*`)
- `archetypes/*`
- `data/*`
- `layouts/_shortcodes/*` or `layouts/shortcodes/*`
- `layouts/_markup/*`
- `content/**`

Also read any local docs that define shortcode, front matter, bundle, resource, and render-hook behavior.

Do not assume built-in Hugo defaults if the repository overrides them locally.

## Workflow

### 1. Inventory the site before converting files

Always inspect the site-level rules first.

```bash
python3 scripts/inventory_hugo_rules.py --site-root /path/to/hugo-site
```

Example invocation for the user's site:

```bash
python3 skills/hugo-to-markdown/scripts/inventory_hugo_rules.py \
  --site-root /path/to/your-hugo-site
```

This inventory step is mandatory for batch work. It identifies:

- active config files
- module mounts and content roots
- custom shortcodes
- custom render hooks
- front matter keys seen in content
- shortcode usage across content files

### 2. Convert with repository rules, not generic heuristics

Read `references/conversion-workflow.md` before changing files. Then:

1. Resolve the real content root from `hugo.toml`, `config.*`, and module mounts.
2. Read archetypes to understand expected front matter shape.
3. Read the front matter configuration to understand date aliases, fallback order, filename-derived dates, and other inferred metadata.
4. Read site data sources in `data/` when shortcodes or partials pull structured content from them.
5. Read custom shortcode templates in `layouts/_shortcodes/` or `layouts/shortcodes/`.
6. Classify each encountered shortcode as embedded, custom, or inline, then check whether it uses named or positional arguments, block syntax, or self-closing syntax.
7. Read render hooks in `layouts/_markup/`.
8. Check whether the repo already defines Markdown- or JSON-facing export templates and partials; if it does, use those as evidence for how the site itself downgrades Hugo constructs.
9. Follow `include`-style shortcodes into referenced content files when the docs site composes content from shared fragments.
10. Convert one file or one coherent section at a time.

### 3. Preserve semantics during conversion

Use these rules by default:

- Keep YAML front matter unless the user explicitly asks for front-matter-free Markdown.
- Preserve core fields such as `title`, `description`, `date`, `draft`, `aliases`, `slug`, `url`, `weight`, and nested `params` when they still carry meaning.
- Preserve `publishDate`, `lastmod`, `expiryDate`, and page resource metadata when they still affect meaning or downstream routing.
- Normalize reserved Hugo front matter keys to their canonical names when the repo mixes casing, for example `Title` to `title`, `Description` to `description`, and `LinkTitle` to `linkTitle`.
- Account for Hugo front matter aliases and tokens before deciding a field is unused. The official Hugo docs recognize aliases such as `pubdate`, `published`, `modified`, and `unpublishdate`, plus tokens such as `:default`, `:filename`, `:fileModTime`, and `:git`.
- Convert Hugo internal links to normal Markdown links with resolved destinations.
- Replace Hugo shortcodes with plain Markdown, HTML, or explicit notes only after reading the local shortcode implementation.
- Preserve or materialize shortcode arguments according to the shortcode's real calling convention. Do not assume every shortcode is named-argument, self-closing, or block-capable.
- Materialize dynamically generated lists and tables when the shortcode renders content from sections or data files.
- Leave literal Hugo examples unchanged when the document is documenting Hugo syntax rather than invoking it. This applies both inside fenced code blocks and to escaped forms such as `{{</* foo */>}}` or `{{%/* foo */%}}` that appear in prose, tables, or notation examples.
- Preserve block attribute semantics such as `{.class #id}` and code-fence attributes when the destination Markdown flavor supports them. If not, downgrade explicitly instead of silently dropping them.

### 4. Apply Hugo-specific body rules carefully

Many Hugo documentation sites use complex local behaviors. Be alert for these common patterns:

- `hugo.toml` mounts `content/en` to the logical `content` root, so link and include resolution must use Hugo logical paths instead of preserving `/en/` blindly.
- The docs basis depends on Hugo front matter configuration for date resolution, aliases, and filename-derived metadata; read `configuration/front-matter.md` and `[frontmatter]` in `hugo.toml` before normalizing dates or slugs.
- `include` renders another page through `RenderShortcodes`; follow the referenced content file and inline the resulting Markdown.
- `quick-reference`, `render-list-of-pages-in-section`, and `render-table-of-pages-in-section` generate navigation content from sections; replace them with materialized Markdown lists or tables.
- `glossary-term`, `glossary`, `get-page-desc`, `module-mounts-note`, `new-in`, and `deprecated-in` expand to prose or badges; convert them into explicit Markdown text or callouts.
- `code-toggle` may read config snippets and data-backed examples; preserve the underlying code sample, not the UI toggle.
- `datatable`, `per-lang-config-keys`, `root-configuration-keys`, `syntax-highlighting-styles`, `chroma-lexers`, `newtemplatesystem`, and `hl` are also local shortcodes; inspect their implementations before deciding whether to materialize, flatten, or downgrade.
- if the repo has data-backed or example-extraction shortcodes such as `features-table`, `optional-features-table`, `clients-example`, or `jupyter-example`, inspect the referenced `data/` files, local example sources, and Markdown-export partials before deciding whether to materialize or downgrade.
- glossary links can use the special Markdown destination `(g)`; resolve these to stable glossary links instead of leaving the placeholder.
- `img` and `imgproc` are presentation helpers around page, global, or remote resources; preserve the underlying image reference and caption semantics.
- `eturl` emits links to embedded template sources; convert to a normal Markdown link if the destination is known, otherwise preserve as a textual note.
- the local link render hook resolves destinations in this order: content page, page resource, section resource when the page is not a leaf bundle, then global resource. It also validates fragments and glossary shorthand.
- blockquote and code-block render hooks add alert, file-label, summary, and detail semantics; preserve these semantics in Markdown or explicit notes.
- embedded `ref` and `relref` are obsolete for Markdown in modern Hugo docs and can interact poorly with the custom link render hook; resolve the final destination instead of preserving the shortcode.
- the local docs use Markdown attributes and code-fence options that can change rendered output. Keep these semantics when the destination flavor supports them.

Read `references/shortcodes-and-render-hooks.md` before converting any file that contains Hugo syntax.

### 5. Validate the output

After conversion, scan the generated Markdown for leftover Hugo-only syntax.

```bash
python3 skills/hugo-to-markdown/scripts/check_standard_markdown.py \
  --root /path/to/output
```

If the validator reports active Hugo syntax outside code fences, either:

- resolve it fully, or
- replace it with a safe textual explanation

Do not silently ship unresolved `{{< ... >}}`, `{{% ... %}}`, or Go template expressions.

### 6. Downgrade explicitly when full materialization is not safe

If a shortcode depends on build-time data, generated examples, or external source files that you cannot resolve deterministically from the local repo snapshot, replace it with an explicit Markdown note.

Use a short, boring format such as:

- `> Conversion note: <what the shortcode normally renders>.`
- followed by any safe subset you were able to preserve, such as inline Redis CLI text, a resolved image URL, or a known section list

Do not leave empty links, broken table cells, or stripped content with no explanation.

## Common Hugo Docs Site Patterns

Use these facts when converting a Hugo documentation site that exhibits similar patterns:

- `hugo.toml` mounts `content/en` to `content`, so English docs are the active content tree.
- Goldmark passthrough delimiters are configured for math, so `$$...$$`, `\\(...\\)`, and `\\[...\\]` can be meaningful content, not junk.
- `markup.goldmark.parser.attribute.block = true`, so block attribute syntax may appear after fenced blocks and other block elements.
- `markup.goldmark.parser.wrapStandAloneImageWithinParagraph = false`, so standalone image attributes can target the image itself rather than a wrapping paragraph.
- The repo defines custom render hooks for blockquotes, code blocks, links, passthrough, and tables. It documents heading and image render hooks, but the site does not override them locally.
- The repo uses many shared `_common` fragments referenced through `% include %`, so reading a page file alone is not enough to understand the rendered content.
- The repo documents embedded, custom, and inline shortcodes, and the conversion logic must distinguish them before flattening syntax.
- The repo uses page bundles and page resources heavily in examples and render-hook resolution, including section resources and mounted global resources.
- The repo contains many escaped shortcode examples such as `{{</* foo */>}}` and `{{%/* foo */%}}`; these are documentation samples and must remain literal when they appear inside code examples, notation tables, or tutorial prose.

## Safety Rules

- Never execute Hugo templates, shortcodes, or Go template expressions.
- Never treat content files as trusted executable input.
- Never run `hugo`, `npm install`, `go install`, downloaded shell installers, or any network install step unless the user explicitly asks for it.
- Keep all conversion scripts offline and deterministic.
- Restrict reads to the declared site root and writes to the declared output root.
- Reject path traversal, symlink escape, or attempts to write outside the requested output directory.
- Do not leak local absolute paths, secrets, environment variables, or git credentials into generated Markdown.
- When exact rendering cannot be reproduced safely, degrade to explicit Markdown text instead of live Hugo syntax.

## Resources

Read these files as needed:

- `references/conversion-workflow.md`
  End-to-end process for repo-aware conversion.
- `references/front-matter-and-content.md`
  Front matter mapping, common content conventions, and literal-example handling.
- `references/shortcodes-and-render-hooks.md`
  Hugo shortcode notation, docs-site custom shortcodes, and render-hook implications.
- `references/links-assets-and-validation.md`
  Link resolution, assets, validation, and residue triage.

Use these scripts when helpful:

- `scripts/inventory_hugo_rules.py`
  Scan a Hugo site and emit a rule inventory.
- `scripts/check_standard_markdown.py`
  Detect leftover Hugo syntax and common unsafe residue in Markdown output.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
