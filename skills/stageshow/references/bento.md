# Bento

A bento grid is one picture made of tiles, not five demos side by side. Most of its quality is decided before any tile is built: which tiles show UI at all, which one is the hero, and what sits next to what. A grid where every tile is a cropped window reads as generated however well each window is made.

These are starting recipes for mixed feature grids; the product, brief and content decide the final composition. Single-tile framing (crops, satellites, gutters) is in `framing.md`; this file is about the set.

## The rules

1. **Not every tile is UI.** About a third to a half of the tiles show product UI; the rest are other kinds (the table below). UI is the thing a bento is good at breaking up, not the thing it repeats.
2. **One hero.** One tile is bigger (two columns, or two rows) and carries the richest picture or the main idea. The rest support it at a smaller size: a wide UI tile spanning two thirds of a row, or an object or photograph leading a taller composition. Equal tiles need a clear difference in content and weight.
3. **A UI tile shows one thing, not a window.** Crop to the single component the tile is about (the button, the status stepper, the fee picker, the command row) and show it at real size or larger, so a third of the tile can be one control. Window chrome appears at most once in a grid, on the hero; four sets of traffic lights in one grid is four times the same signal.
4. **Neighbors contrast.** Alternate kinds like a checkerboard, across and down: a picture next to a number, dense next to calm, a photo next to an icon and a sentence. Two window crops never sit side by side. Vary density and silhouette across rows and columns so the eye has a clear path.
5. **Big type is a tile.** A stat tile is one real number at display size (48 to 72px as shown), a short lead ("Up to"), a one-line label, and at most one colored glyph such as a bolt or battery. A short statement in large type ("99.99% uptime", "More ports and faster charging.") is a tile too. These are the calm tiles that let the UI tiles breathe. Real figures, never "10x" filler. The number sits close under its copy or fills the tile; a stat pinned to the bottom of a tall tile with a void above it reads as missing content, not calm.
6. **Copy is short and outside the picture.** A title of one to four words, or one sentence; at most one supporting sentence; never a paragraph or a bullet list. Two patterns work: the run-in, a bold lead and a gray continuation at the same size ("**Stay in sync.** Your files stay up to date."), or a large title alone. Tile copy is page type: 17 to 24px, set by the page, never the 12px of the UI inside the tile. A 15px title scaled to 10px is a caption, not a headline.
7. **One frame, varied contents.** Tiles share radius, gap, padding and where the copy sits (all top or all bottom); the variety lives inside them, and grounds and materials may differ when the composition calls for it. Pick one family: rounded tiles on a gap, or a ruled grid with no gap and fine lines between cells. The gap equals the tiles' inner padding or a clear fraction of it. Judge the outside too: a grid on its own ground usually wants an even outer gutter, and a page that already gives that space shouldn't double it. A crop inside one tile is no reason to press the whole grid against its frame. Align left-led UI and diagrams to the copy gutter with one gap below the copy; don't center each by habit. A centered object is its own deliberate composition.
8. **Use the tile edge deliberately.** The outer tile owns the bleed. An inner fixed-width Stage must not slice a window halfway across a wider tile and leave a blank strip beside it: measure the picture slot and match its width at every breakpoint, compact included, and inspect the right and bottom edges at the host's width. `scripts/layout.mjs` reports this as `nested-composition-crop`; look at the image and fix any unintended inner cut. A window or phone can enter from an edge and crop supporting content, as in `framing.md`, with its action and payoff whole. A UI fragment without chrome can dissolve into the tile ground; a solid window crops at a clear boundary. A centered object, lone control or statistic can be shown complete when its scale and the space around it are intentional. The boxed failure is shrinking a whole screen until its contents are unreadable, not leaving a margin.
9. **Say each thing once across the set.** No real string, avatar, color mark or chrome repeats from tile to tile. One conversation threaded through five tiles ("Refund for order #4821" three times) is the same signal repeated, not a story.
10. **Compose the grounds together.** A quiet feature grid can share one surface, with one photo, accent or inverted tile as punctuation. That is a starting recipe, not a limit: an expressive hero grid can use several grounds when their lightness, temperature and saturation make a rhythm. Keep neighbors distinct, give one tile the lead, and don't repeat the same gradient or spend every accent everywhere. See `backgrounds.md` and `examples/hero-grid/` for a multicolor composition.
11. **Give motion one place to lead.** In a supporting feature grid a tile does one small thing: a number ticks, a dot grid changes, a bar fills, a button settles into its pressed state. It plays once as the grid scrolls in, staggered 80 to 120ms across tiles in reading order, or on hover for that tile alone. A hero grid can give its lead tile a short cursor story while the others hold still, as in `examples/hero-grid/`. Several competing loops leave the eye nowhere to land.
12. **Shown at 1:1, one Stage per tile.** Each picture is its own `Stage`; the copy is page HTML beside it, never inside the stage. Never wrap the whole grid in one Stage: it scales every tile's type down with the grid (a 1000px grid in a 630px column draws 15px titles at 9.5px). Tiles change width as the grid reflows, so measure the picture slot, use that native width for a bleeding Stage, and recompose its contents for compact slots. Text stays at native size; changing a Stage's width is not a scale transform, and a host wrapper marked `data-ss-wide` scales the wide design only for a slot sized by height. Pin a deliberate crop to the tile edge. A centered object can keep a fixed design canvas when its inner boundary cuts only empty ground. `examples/bento/` uses both patterns.
13. **Narrow, it recomposes.** Keep two columns only while each tile stays readable and deliberately framed: an article column around 550px may hold two, a phone column usually stacks, hero first. Pick the breakpoint from the content, not a universal screen width. Each UI picture gets a compact composition when it no longer fits; type tiles reflow by themselves. Important text stays at least 10px at a 320px host, gutters included.
14. **A stat is one line.** The number and its unit sit together and never wrap: size the number to the tile with the unit on (`white-space: nowrap`), or move the unit into the lead line ("Works at 30,000 ft" becomes a lead of "Works at" and a number of "30,000 ft" that fits). The film names it `unit wrapped:`.

## Kinds of tile

| Kind | What it holds | Example |
|---|---|---|
| **One component** | A single control or panel at real size or larger, cropped by the tile | A backup control, keycaps or locale list |
| **Hero UI** | The one tile with a real screen: window or phone, cropped per `framing.md` | Checkout or a conversation |
| **Stat** | One big number, a lead, a label, maybe one colored glyph | Battery life, charging progress or measured uptime |
| **Statement** | One sentence in large type, an icon in color beside or above | A short claim about connectivity or speed |
| **Object** | A product, a card, a chip, an isometric drawing | A payment card, processor or physical control |
| **Diagram** | An abstract picture of what the feature does: a grid, a heatmap, nodes and lines | A heatmap, sync relationship or shared canvas |
| **Collection** | Logos, app icons, file tiles, emoji: many small marks, bleeding off | Integration marks, file thumbnails or emoji |
| **Photo** | A real photo, with type over its quiet part. Never a scene drawn in SVG or CSS to stand in for one: however much grain and haze it gets, a drawn "photo" reads as generated. With no licensed photo to hand, pick another kind. A landscape photo rarely fits a tall tile with copy on top: it ends up a sliver, or the horizon crowds the headline. An illustration in its place is either purely graphic (a pattern, a motif from the place, like azulejo tiles for Portugal) or drawn in smooth, continuous curves, never lumpy or faceted, and it holds still | A licensed product or lifestyle photograph |

A grid of five usually wants one hero UI, one or two components, one stat or statement, and one object, diagram or collection.

## Layouts

| Layout | Shape | Use for |
|---|---|---|
| **Hero and strip** | A row of 2/3 + 1/3, then three equal tiles | The default for five or six features |
| **Staggered pair** | Two columns, tall and short tiles alternating, offset between columns | Four to six claims with photos |
| **Even grid** | 3 × 2 equal tiles | Only when every neighbor is a different kind |
| **Big square** | Four columns, a 2 × 2 hero, small tiles round it | Many products, one flagship |
| **Ruled** | One rounded container, 1px rules, no gaps, mixed spans | Technical or developer pages |

**Every width is its own design.** Check the grid at each width it will meet, down to an article column (about 550, so half tiles near 270). Two columns work there when each picture has been composed for its narrower tile; stack when the content needs more width. At each width every picture lines up with its tile's copy: left edge on the copy's gutter, and a matching gutter on the right or a clear crop off the right or bottom. Never center a picture about as wide as the tile, so it touches both edges or loses a few pixels to each; resize it, re-lay it out or swap the card for that width.

## Planning a grid

Write the tile list before building anything:

| Tile | Span | Kind | The one thing | Words |
|---|---|---|---|---|
| Inbox | 2 × 1 | Hero UI | One conversation arriving, selected | "Shared inbox" + one sentence |
| SLAs | 1 × 1 | Stat | "14m" left, in the warning color | "Never miss a reply." |
| Assign | 1 × 1 | Component | The assignee menu, Maya checked | "Assignments" |
| AI drafts | 1 × 2 | Component | The draft reply and its Send button | "Drafts that sound like you." |
| Integrations | 1 × 1 | Collection | App marks bleeding off the right | "Works with your tools." |

Then check the plan against rules 1, 2, 3, 4 and 9: how many tiles are UI, which is the hero, does any tile sit next to the same kind, does any real string appear twice. Inspect the built grid and each crop at the widest and narrowest host; a good tile can still be the wrong neighbor. The still questions are in `verify.md`.
