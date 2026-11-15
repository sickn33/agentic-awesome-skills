# Backgrounds and the whole picture

The supplied looks are examples, not a menu of allowed styles. Start with the product and the feeling you want. A neutral interface, a saturated poster, a dark technical surface, a tactile control and an image-led composition can all work. Typography, content, layout, imagery, material and motion should all support the same idea; changing the accent color alone does not make a new identity.

## Choose the ground for what it does

- **Quiet solid or tint:** gives dense UI room to read. Separate the foreground with a clear step in value before adding a shadow.
- **Color field or graphic pattern:** makes a sparse picture distinctive. Keep a calm area behind useful text, and let the pattern give direction or scale. Crisp bands show what a glass surface blurs; a glow everywhere cannot.
- **Colorful gradient:** choose its direction and color relationships on purpose. A diagonal transition, a broad radial light, blended fields and a multicolor sweep are different compositions. Keep strong color behind an opaque surface, or give glass enough density to keep its text readable. A vivid ground does not also need vivid controls, a colored shadow and a glow.
- **Material:** paper, glass, metal and sculpted plastic need different edges, highlights and shadows. Use those cues consistently. Texture supports a material; it does not sit over text or stand in for hierarchy.
- **Photography or artwork:** use a suitable licensed local asset, keep its subject and credit it where required. A graphic illustration may be abstract, but never present a CSS landscape as a photograph. The graphic album sleeve in `examples/hero-grid/` is artwork on purpose.
- **Dark:** choose text, borders and raised surfaces together. Black behind a white mockup and a coherent dark product are different compositions; both can be intentional.

`examples/backgrounds/` holds the same small interface across twenty grounds, so you can compare tint, fields, light, linework, material, six vivid gradients and six textures (dot grid, halftone, blueprint, grain, conic sweep, fine stripes). The gradients vary their direction, value and material rather than repeating one glow in different colors. They are examples of relationships, not a preset selector.

Give banded grounds a hierarchy: a dominant field, a supporting color and an optional narrow highlight. Let glass show their tint while its text and controls stay readable. Band width and color area deserve the same composition judgment as the foreground.

## Compose the set before the tiles

The rules of the set (one hero, contrasting neighbors, grounds composed together, copy outside the picture) are `bento.md` rules 2, 4, 6 and 10. `examples/hero-grid/` shows them with several grounds: a drafting sheet, orange keycaps, violet-to-peach bands under glass, a neutral icon collection and a dark music player, held by shared 8px gaps and 12px corners. Orange returns in the artwork and violet links the glass to the dark sleeve: borrow the relationships, not the colors. Judge adjacent colors as a pair and the grid as a silhouette. An image-led hero can skip tile headlines when the pictures carry the idea.

## Objects and drawings as tiles

The tiles that stop a grid being five windows are rarely UI: a payment card lit from one side, a folded corner of paper, a chip, a keycap, a line drawing of a stack or a graph. Give an object one light source, a real material (a matte card has a soft falloff, a glass pane has a rim) and a shadow that agrees with the tiles around it. A line drawing uses one stroke weight and the grid's own ink, and holds still. Neither needs a label inside the picture; the tile copy does that.

A stack of objects is one object. Center the whole silhouette (every card in the fan, not the front one) with the same air on each side of the tile, and keep the back ones clear of the copy; a stack drifting up under the words reads as spilt. A payment card keeps its real anatomy at any size: the chip about an eighth of the card's width, a third of the way down, with the contactless arcs beside it at about half the chip's height; the name and number along the bottom edge, the network mark in the bottom-right corner. A chip the size of an icon on a card the size of a tile is the first thing that gives a drawn card away.

## Recompose for the host

Recomposition and motion follow `bento.md` rules 11, 12 and 13. In `examples/hero-grid/` the controls get a native compact layout, the glass and player go full width, the two small object collections share a row, and only the drafting tile has a story. A crop can take a blank keycap edge, album artwork or window margin, never the label or result the viewer needs.
