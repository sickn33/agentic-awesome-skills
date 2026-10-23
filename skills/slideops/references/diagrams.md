# Diagrams: built-in flow boxes vs pre-rendered Mermaid

Two ways to draw architecture on a slide. Both must depict the **real, verified** call
path (SKILL.md Step 1); the choice is only about rendering.

| Situation | Use |
|---|---|
| Linear pipeline, ≤6 boxes, one or two rows | Template's `.flow`/`.flow-box` pattern (no tooling, styles itself with the theme) |
| Sequence diagram (request/response between components) | Mermaid `sequenceDiagram` |
| Branching graph, fan-in/fan-out, back-edges | Mermaid `flowchart` |
| ER / schema relationships | Mermaid `erDiagram` |
| Git branching story | Mermaid `gitGraph` |

Never load mermaid.js at runtime: the deck must stay a single self-contained file with no
network access. Instead **pre-render to SVG at build time and inline the SVG** into the
slide.

This is the one step that downloads code. It fetches a pinned `@mermaid-js/mermaid-cli`
unless the binary is already installed, so treat it as an opt-in the user agreed to in the
intake: if the environment has no network, or the user did not opt in, use the flow-box
pattern instead and say why. Diagram sources you write are your own text, but the labels
in them land in a shipped artifact, so the confidentiality rule applies to them too.

## Render recipe

1. Write the diagram source to `$STAGE/<name>.mmd`.
2. Write a theme config deriving from the deck's current `:root` tokens (open the deck and
   copy the literal values; mermaid can't read CSS variables):

```json
// $STAGE/mermaid-config.json: values from the DECK'S CURRENT THEME, not hardcoded olive
{
  "theme": "base",
  "themeVariables": {
    "background": "transparent",
    "primaryColor": "<--card>",
    "primaryTextColor": "<--fg>",
    "primaryBorderColor": "<--accent>",
    "lineColor": "<--muted>",
    "secondaryColor": "<--bg2>",
    "tertiaryColor": "<--bg>",
    "fontFamily": "-apple-system, Segoe UI, Roboto, sans-serif",
    "fontSize": "16px"
  }
}
```

3. Point puppeteer at the same Chrome that verification.md's `find_chrome` found (no
   second browser download):

```bash
printf '{ "executablePath": "%s" }\n' "$CHROME" > "$STAGE/puppeteer-config.json"
# Pinned: an unpinned `npx --yes` runs whatever the registry serves today, unreviewed.
# If mmdc is already installed, use it and skip the download entirely.
MMDC=$(command -v mmdc) || { echo "Reviewed mmdc installation required" >&2; exit 1; }
$MMDC \
  -i "$STAGE/<name>.mmd" -o "$STAGE/<name>.svg" \
  -c "$STAGE/mermaid-config.json" -p "$STAGE/puppeteer-config.json" \
  -b transparent -I "mmd-<name>"
```

4. Inline the SVG into the slide inside `.img-wrap` (the template constrains inline SVG to
   the slide body):

```html
<section class="slide">
  <div class="kicker">[Section name]</div>
  <h2>[Slide title]</h2>
  <div class="img-wrap"><!-- paste the full <svg …>…</svg> here --></div>
  <p class="caption">[What the diagram shows; verified against the real call path.]</p>
</section>
```

## Rules that matter

- **`-I "mmd-<name>"` (unique per diagram) is mandatory.** The SVG's internal `<style>` is
  scoped to its root id; two inlined diagrams with the default `my-svg` id restyle each
  other.
- **Theme by config, verify by screenshot.** Some mermaid internals (e.g. sequence-diagram
  activation bars) ignore `themeVariables` and keep light-grey fills; that's usually fine
  on dark themes, but check the slide screenshot for unreadable text or glaring fills and
  simplify the diagram (or switch diagram type) if theming fights you.
- **A rethemed deck does not retheme inlined SVGs.** Their colors are baked at render
  time; re-run this recipe for every Mermaid slide after a theme swap.
- **Size**: mermaid emits `width="100%"` with a `viewBox`; the slide's `.img-wrap` caps it
  to the available body. If a diagram renders too small to read at 1280×720, it has too
  many nodes for one slide: split it, don't shrink the font.
- **Keep the `.mmd` sources** in `$STAGE` until the deck ships, then delete with the rest
  of staging; the inlined SVG is the artifact. If the user wants editable sources kept,
  put them next to the deck as `<deck>-diagrams/<name>.mmd`.
- Escape rules still apply to `.mmd` content on slides only if you *show* the source in a
  `<pre>`; inline only reviewed/sanitized SVG: remove script, event handlers, external URLs and foreignObject content that is not explicitly needed. Valid SVG markup alone is not proof of safe content.
