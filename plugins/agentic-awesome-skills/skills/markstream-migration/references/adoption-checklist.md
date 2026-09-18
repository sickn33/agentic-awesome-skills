# Adoption Checklist

Search for `react-markdown`, `remarkPlugins`, `rehypePlugins`, `markdown-it`, `marked`, `rehypeRaw`, `skipHtml`, allow/deny lists, `urlTransform`, custom renderers, CSS, and tests.

- `direct`: plain renderer swap
- `renderer-custom`: custom components can become overrides
- `plugin-heavy`: transform chains need manual mapping
- `security-heavy`: HTML and URL policy need explicit review

Swap the package first, preserve CSS order, prefer scoped mappings, and adopt `nodes` only when another layer owns parsing or structural updates.
