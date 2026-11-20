# Taste

The author's defaults for what the UI looks and reads like. It is a starting point, not a rule of the skills. Replace it with one that has the same headings, or edit it. The run saves the accepted copy to `.design-system/taste.md`, and every skill reads that copy. A skill reads the accepted file and never assumes a line it leaves out.

## Bans

Offered once at the start with none selected. Each one the person picks becomes a check rule and holds in code, copy, docs, examples and showcases, except on a `Don't:` line that shows the thing to avoid.

- Uppercase labels
- Middle-dot or bullet separators between items
- Em dashes, in product copy and in docs
- Exclamation marks
- Emoji
- Gradients

## Voice

Applies to copy a run writes: empty states, toasts, docs.

- Derive the voice from the app's own strings. This file adds nothing to that unless the person fills it in.
- Sentence case for headings, labels and menu items.
- Plain verbs and the product's own nouns. Straight quotes.

## Widths and themes

- Capture at 390 and 1280 px when the app's narrowest and widest supported widths cannot be found. The app's own widths win.
- Themes are the ones the app ships, and no new ones.

## Reference systems

- Geist is the reference shape for a docs site: an introduction, foundation pages and a page per component. Take the structure, never its values, names or brand.
- A component page runs description, examples, variants, states, props, usage, accessibility, tokens, related.
- Compare the app's colour roles with Geist's (surface levels, text emphasis steps, control heights) to find roles the app has not named. Never copy a Geist value.

## Rule pack

The checks load a rule pack from the project. None ships here. `check-system.mjs` carries the generic rules (raw values, palette use, arbitrary values, native controls, div buttons). A project adds its own as lint rules or config, and each rule is seen failing on a planted violation before it counts.
