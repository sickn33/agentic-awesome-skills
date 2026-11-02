# Framing

How the screen sits in its space decides whether it reads as a product shot or a screenshot in a box. Decide the framing before building the screen: a crop needs nothing past the crop, and it sets how big the type must be. SKILL.md has the summary; the numbers are here.

## The rules

1. **One hero object, at most one or two satellites** (a receipt, a phone, a detail card) that carry the point (`examples/static-card`).
2. **Keep what identifies the product:** a title, the real chrome, the rows that give the action a reason. Logo and nav are not required; crop around the story.
3. **The medium picks the first layout:** corner bleed for a hero beside copy, pinned bottom bleed for a card or tile, a phone pinned from the top. If it doesn't hold, try a second from the table below.
4. **Crop only filler.** The payoff, the action, what the cursor touches and every real word stay whole; a list, diff or terminal may run one line off a bled bottom edge. A placeholder action the crop would slice is removed, not sliced; if the story does not fit, change the stage size or the layout. A button, chip or shadow sliced by the stage edge is the usual fault.
5. **Crop 10 to 40% of the hero off stage.** The window or phone fills at least two thirds of the stage's width and runs off an edge. Labeled controls stay whole. Shapes that read when cut (a card, a slider track, a row of avatars) run off by a third or more.
6. **The stage masks everything** (`overflow: hidden`); one rounded corner per edge. Fades are for sliding tracks, stacks and charts, and for one crop: a window fading out at its foot.
7. **Satellites straddle the hero's edge, about half outside,** never fully inside or floating apart; fully outside, tie it back with a 1px leader ending in a dot.
8. **Distinct depth:** `--ss-shadow-satellite` on a satellite sitting on the hero, `--ss-shadow-ground` for a lone surface; a hairline on light edges; the shadow on the outlined shape, never a wrapper (`examples/story`).
9. **Start flat and frontal; earn a tilt** by comparing with the straight version at final size. Depth from shadow, z-order, scale and opacity; perspective only when asked.
10. **One gutter, measured in the final crop after any wrapper.** The gutter is the hero's inset from the stage edge (the layout table gives it per layout); every other edge distance in the frame matches it. The exception is a satellite straddling in the wider column; a phone counts as a satellite.
11. **A full gutter or well past, on every edge.** Crossing by under 24px or stopping a few pixels short is a mistake. Content near a container's bottom follows the same rule.
12. **A window keeps its device's shape:** whole, 1.25:1 or wider; bled, what shows is at least square. Fix by crop or layout, never by squashing.
13. **What the story opens stays in frame,** a gutter from every edge on every frame; place the trigger so the overlay has room.
14. **On a colored stage the hero is inset 8 to 20% from the sides** and runs off the bottom, so the ground frames it on three sides.
15. **No dead corners at rest or anywhere in the loop.** Fix crop or layout first; a satellite only with a role; a reserved column is filled from frame one.
16. **Anchored UI (popover, menu, toast) is not a satellite;** it sits where the product would put it.
17. **Two satellites are two kinds, not a stack.** A second satellite differs from the first in size and kind: a card and a small system object (a notification at its true size, a chip, a receipt), never two cards of one width on one edge, which read as a pile. A system banner sits where the system puts it, small, with the system's shadow, not a card's. Where the second object only points at something, use an annotation with a connector instead (`references/annotations.md`), as Stripe does; film flags `framing: twin satellites`.
18. **A satellite covers chrome, not content:** straddle where the window has a sidebar, header or margin (`examples/static-card`).
19. **Related surfaces get different jobs and weights;** the result sits in the hero's quiet margin, never hiding settings, trigger or payoff.
20. **A small illustration may need more air than the app itself.**

The layouts are recipes, not a requirement to crop every product; a whole window with even gutters is valid when its contents read and the brief asks.

## The layouts

| Layout | Hero | Satellite | Use for |
|---|---|---|---|
| **Pinned, bottom bleed** | Inset 8 to 12% left, right and top; 15 to 35% past the bottom; centered | Optional, straddling a side | Feature cards and bento tiles, their first composition (`examples/static-card`) |
| **Corner bleed** | Inset 10% top and left; 15 to 35% past right and bottom | Straddling the left or bottom edge | Heroes beside copy, their first composition (`examples/hero-demo`) |
| **Stage with gutters** | Inset 8 to 20% each side on a colored stage; off the bottom | Straddling one side, hero stays centered | Brand moments (`examples/raycast`) |
| **Satellite focus** | Cropped hard, mostly context | Large, 30 to 40% of hero width, straddling, carries the story | One small thing: a notification, a receipt, a diff (`examples/share`) |
| **Wide hero** | A 900 to 1100px window at 1:1, inset top, off the bottom and often both sides; realistic fidelity | A card or thread on its lower edge | Homepage heroes at full width (`examples/linear`) |
| **Row of windows** | Three or four at the same height, the outer ones off both sides | None | Agents, tabs or sessions side by side (`examples/window-row`) |
| **Device pair** | Desktop inset top and left, about 75 to 80% wide, off the bottom | Phone straddling the right edge, about a third outside, top in the upper half, present from frame one; `LockScreen stack="top"` if its bottom is cropped (`examples/device-pair`) | Cross-device stories |
| **Many of one** | A grid of one small thing at one size, off every edge | None; one tile in focus by depth (hero shadow, accent ring), the only one with words | Previews, deploys, templates, sessions: scale shown as repetition (`examples/many-of-one`) |
| **Fade crop** | A window inset top and sides, fading out over its last third | Optional | When a stage edge would cut the window at an arbitrary line (`examples/fade-crop`) |
| **Close-up** | The whole window scaled 1.3 to 1.6x, chrome and all, inset top and sides, off the bottom; the subject row whole across | None | A feature card about one control: a setting, a field, a button (`examples/close-up`) |
| **Panel over product** | The product inset top and left, off the bottom; its focal control whole | A settings panel straddling the product's right edge over its margin, never over the form; one leader, in neutral ink, from the panel's edge to the thing it changed, through empty ground | A setting and its effect: branding, theme, a toggle that changes the page (`examples/panel-annotation`) |
| **Overlapping windows** | A window inset top, off the bottom, its words clear of the stage edges | A smaller chromeless card in front whose edge lands on a structural line of the window (its sidebar edge), covering only filler | Two views of one event: the buyer's card over the merchant's dashboard (`examples/overlap`) |
| **Stacked cards** | Two components at one width and left edge, 12px apart, centered; the lower one off the bottom | None | A setting over the detail it drives: a plan over its usage (`examples/stacked-cards`) |
| **Opposite corners** | Copy bottom-left at the tile's inset; the product in a panel hung off the top-right corner, its words clear of the cut | None | Bento tiles with a line of copy (`examples/opposite-corners`) |
| **Tilted stack** | Three same-size cards in one cell, -6, 4 and -2 degrees, offset 12 to 20px; the straightest on top, the only one with words | None | Paper: receipts, tickets, cards gathered. The one place tilt earns its keep (`examples/tilted-stack`) |
| **Corner chip** | A window inset top-left, off the bottom | A small pill centered on the window's corner, half outside, over chrome only | One live fact about the whole product: people online, a status (`examples/corner-chip`) |
| **Monochrome row** | Three windows at one height, whole across, grayscale, faded at the foot by a mask | None | Customers or integrations, where their brand colors would fight (`examples/monochrome`) |

## Recipes

Position the hero with plain CSS inside the `Stage` render. Reserve a wider column so the satellite straddles the hero edge evenly: gutter plus half its width (`examples/static-card`).

```tsx
<Stage width={656} height={340} initial={{}} className="my-well">
  {() => (<>
    <Window url="dashboard.northwind.co" className="hero" style={{ position: 'absolute', left: 129, top: 24, width: 720, height: 420 }} />
    <div className="satellite" style={{ position: 'absolute', left: 24, top: 150, width: 210 }} />
  </>)}
</Stage>
```

```css
.my-well .ss-stage { overflow: hidden; background: var(--ss-well); border-radius: 12px; }
.my-well .hero { box-shadow: var(--ss-shadow-hero); }
.my-well .satellite { box-shadow: var(--ss-shadow-satellite); border-radius: 10px; background: var(--ss-surface); }
```

The shadow tokens in `kit/stage.css` (loaded by `kit/stageshow.css`), set by every theme:

- `--ss-shadow-hero`: the one shadow for a page's hero windows (`examples/gmail`).
- `--ss-shadow-window`: what `Window` draws by default; quieter, for a window that is not the hero.
- `--ss-shadow-satellite`: tighter on purpose, because it falls on a white window where a wide blur smears (`examples/payout-flow`).
- `--ss-shadow-ground`: a hairline and a long faint fall, for a small window or card on the ground (`examples/looks`).
- `--ss-shadow-float` for popovers, `-card` for small raised cards, `-lift` for a carried thing.

Fades are for moving or stacked content: a 32px edge mask on a track, or the last 25 to 30% of a stack or chart. Use `.ss-fade-b` and `.ss-fade-r`; their length is `--ss-fade` (64px by default, so set `--ss-fade: 32px` for a track).

A window can fade out instead of running off, at its foot only: the top and sides stay whole and hard-edged, the fade covers the last third and only filler is under it. Fade with a mask, never a color overlay, so the window dissolves into whatever it sits on. Never fade a side, never fade the focal content, never fade more than one window in a scene (`examples/fade-crop`).

## Small formats and the page

- **The page is the ground.** "White page" means a transparent stage: no plate (a backdrop or tinted field the window floats on) and no panel behind the device on a white or dark page. A hero's window bleeds or fills; whole and centered with air on four sides, it floats.
- **Unframed is the developer's call.** Asked for no framing, set `unframed` on the Stage and drop the ground: the window, card or phone sits whole, centered, with an even margin at least as deep as its shadow, so the shadow is never cut. Nothing bleeds, so nothing needs a crop rule; everything else in this file still holds, and so do restraint, story and motion. Never choose it on your own: a floating window is the fault this file exists to fix.
- **`compact` is a second design, not a squeeze.** Every demo that can sit in a phone column ships one at the column's width: 358 in a 390 viewport, switched on below the host width where the wide design stops fitting (`compact={{ below: 560, width: 358, height: 320 }}` for a wide scene; the height follows the design). Switch composition on `layout`: crop closer, drop or stack a satellite, keep action and payoff whole. A card that already fits at 358 needs none.
- **Small formats crop harder:** a 400px card holds a third of a dashboard at full size, not all of it at a third.
- **The stage is the shot.** The tile is cut to the stage's shape and the stage fills it edge to edge; never a stage boxed in another ground.
- **Size the design for the slot.** A lone card in a 680px column wants 500 to 560 wide, so its text reads at 15 to 20px.
- **A lone phone in a column of figures keeps the column's width,** centered at design size on the stage's own ground.
- **Moving a window keeps the bleed.** After any move or resize, recheck what the crop cuts and what overlaps, remove sliced placeholder actions, re-shoot the whole loop.

## Phones

- **A satellite phone starts at 40% of the window's visible width** and at least 220px wide; let it run off the bottom rather than shrink.
- **Notifications stay at true iOS proportion** (Live Activities excepted); a phone so small its notification needs enlarging is too small (`examples/phones`).
- **A phone cropped at the top loses its status bar and nav bar together.** The crop falls inside the content below the nav, never between the island and the nav.
- **In a 400px host a phone is cropped:** pinned a gutter from one edge, off the other, screen 1:1, stage a little taller than wide; never whole (`examples/phone-touch`).
- **A banner is native width and never cut.** A notification spans the screen minus 18pt each side, at the phone's own scale; nothing narrows it. A phone cropped at a side is composed so the banner shows whole (crop where no banner sits, or show the phone's full width) and film flags a cut banner as `cut by the crop`.

## Checks

`film.mjs` prints `framing:` and `cut by the crop:` on every shot; clear them on the still before motion work (`rehearse.md`, What to watch), or say why a line is deliberate. Boxes in flight are judged where they settle. Under a `Camera` the wide shot is judged as usual, moving frames skipped, and a settled zoom judged against the camera's own crop with its focus clear of the feather.

Is the hero's top-left visible? Is a bleed a deliberate crop, not a sliver? Does each satellite connect to its hero with clear depth? Is a faded window faded only at its foot, over filler, with a mask? Is the phone readable at the host's real width, and does a wide scene have its `compact` design (Small formats and the page, above)?
