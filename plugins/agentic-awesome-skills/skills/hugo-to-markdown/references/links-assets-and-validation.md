# Links, Assets, And Validation

## Link Resolution

Treat link resolution as repository-specific behavior.

For a typical Hugo docs site:

- internal links may be plain Markdown destinations
- `ref` and `relref` appear in docs examples and sometimes in live content
- the custom link render hook resolves pages, page resources, section resources, and global resources
- broken-link behavior is controlled by config and local render-hook logic
- glossary shorthand may appear as a Markdown destination exactly equal to `(g)`
- fragments may be validated against target headings rather than passed through blindly

### Resolution Order

For a custom `render-link.html`, the typical resolution order is:

1. content page
2. page resource from the current page bundle
3. section resource from the current section when the page is not a leaf bundle
4. global resource from `assets`

Implications for conversion:

- do not assume every relative link targets a page
- do not treat page bundle files and section bundle files as interchangeable
- do not preserve `/en/` filesystem paths when the site mounts `content/en` to logical `content`
- preserve query strings and fragments when they still resolve after flattening
- if fragment validity cannot be confirmed from the local snapshot, keep the fragment but add a note only when there is real ambiguity

When converting:

- resolve internal destinations to ordinary Markdown links
- keep remote links as normal external links
- preserve fragments when they still point to stable headings
- avoid copying unresolved Hugo link functions into the output
- if a generated table or list uses front matter fields for labels, resolve those fields case-insensitively before emitting the final Markdown

## Assets

Check all of these before rewriting image or file references:

- page bundle resources
- section resources
- mounted assets
- static files

For Hugo repositories, also distinguish:

- leaf bundles versus branch bundles
- page resources of type `page` versus image, data, document, or video resources
- resource metadata defined in front matter under `resources`

For sites with custom link render hooks, the hook may explicitly rely on assets and mounted resources. Read `hugo.toml` and `layouts/_markup/render-link.html` before changing asset paths.

### Bundle-Aware Rules

Use the official page bundle and page resource docs as conversion constraints:

- files next to `index.md` in a leaf bundle can be page resources and may not be rendered as standalone pages
- files under a branch bundle can be descendant content pages or non-page resources depending on placement
- section resource lookup is invalid for leaf bundles in the local render-link logic
- resource `Name`, `Title`, and `params` can come from front matter metadata rather than filename alone

If a shortcode or render hook references a resource, check whether the destination depends on bundle type before flattening the path.

## Validation Checklist

Run:

```bash
python3 skills/hugo-to-markdown/scripts/check_standard_markdown.py \
  --root /path/to/output
```

Review hits for:

- active `{{< ... >}}` or `{{% ... %}}`
- active Go template expressions such as `{{ if ... }}` or `{{ .Page ... }}`
- Hugo-specific link helpers left in prose
- leaked local absolute paths
- executable HTML or script residue that should have been downgraded
- empty Markdown links or table cells caused by front matter key mismatches
- missing downgrade notes where content was stripped but not materialized

## Residue Triage

If the validator reports a construct:

1. Check whether it is inside a fenced code block.
2. Check whether it is an escaped literal example such as `{{</* foo */>}}` or `{{%/* foo */%}}` in prose or a notation table.
3. If it is a literal example, keep it.
4. If it is active Hugo syntax, resolve or rewrite it.
5. If it cannot be resolved safely, replace it with explicit Markdown text explaining the original behavior.

## Downgrade Review

After conversion, manually inspect each explanatory note you introduced:

- verify that the original shortcode syntax is gone
- verify that the note still tells the reader what was omitted
- verify that any safe subset, such as inline code, resolved links, or image URLs, was preserved

The goal is standard Markdown with explicit loss reporting, not silent truncation.
