# Override Patterns

| Key | Typical use |
|---|---|
| `image` | Lightboxes, captions, lazy loading |
| `link` | Routing, analytics, tooltips |
| `code_block` | Fenced code blocks |
| `mermaid`, `d2`, `infographic` | One diagram renderer |
| `inline_code` | Inline typography |
| `heading`, `paragraph`, `list_item` | Containers preserving children |

For Vue, Vue 2, Svelte, or Angular shared registration, allowlist the tag, register it under a scoped `customId`, and pass that scope to the renderer. Prefer renderer-local maps when sharing is unnecessary.

For React, use `streamingComponents` for parser-backed tags and `htmlComponents` for sanitized HTML-style props. When a tag body contains Markdown, use a nested renderer with the same allowlist and no independent pacing.
